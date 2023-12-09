import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Editor,
  sanitizeHTMLToDom,
  MarkdownView
} from 'obsidian';

import {initialize, hasCode, CodeBlockEvaluation, evaluate, DocumentEvaluation} from './evaluator.ts'

import CryptoJS from 'crypto-js';

interface ObsidianClojureSettings {
  fullErrors: boolean
  blockLanguage: String
}

const DEFAULT_SETTINGS: ObsidianClojureSettings = {
  fullErrors: false,
  blockLanguage: 'clojure',
}

const clojureTemplate = (toBeWrapped) => {
  toBeWrapped = toBeWrapped || ''
return `\`\`\`clojure
${toBeWrapped}
\`\`\`
`
}

function sha256(message: string): string {
  return CryptoJS.SHA256(message).toString()
}

export default class ObsidianClojure extends Plugin {
  settings: ObsidianClojureSettings;

  eventsToListenTo: string[];

  // TODO need to get rid of this hack
  defaultTimeout: number;

  sciCtx: any;

  documentEvaluations: { [sourcePath: string]: DocumentEvaluation } = {};

  openMarkdownFilePaths: string[] = [];

  async onload() {
    await this.loadSettings();

    this.sciCtx = initialize(window)

    this.addCommand({
      id: 'insert-clojure-code-block',
      name: 'Insert Clojure Code Block',
      editorCallback: (editor: Editor) => {
        // If we have something selected, wrap it
        if (editor.somethingSelected()) {
          const selectedText = editor.getSelection()
          const textToInsert = clojureTemplate(selectedText)
          editor.replaceSelection(textToInsert)
        } else {
          editor.replaceSelection(clojureTemplate())
          const currentPos = editor.getCursor()
          const currentLine = currentPos.line
          const newLine = currentLine - 2
          editor.setCursor({line: newLine, ch: 0})
        }
      }
    });

    this.addSettingTab(new ObsidianClojureSettingTab(this.app, this));

    this.registerEvent(
      this.app.workspace.on('layout-change', () => {
        const markdownLeaves = this.app.workspace.getLeavesOfType('markdown')
        const openMarkdownFilePaths = markdownLeaves.map(leaf => (leaf.view as MarkdownView).file.path)
        const recentlyClosedMarkdownFilePaths = this.openMarkdownFilePaths.filter(path => !openMarkdownFilePaths.includes(path))
        for (const path of recentlyClosedMarkdownFilePaths) {
          // TODO This also gets triggered if a file is moved rather than closed which is not ideal
          this.onFileClose(path)
        }
        this.openMarkdownFilePaths = openMarkdownFilePaths
      })
    )

    this.registerMarkdownPostProcessor((el, context) => {
      // `el` here is usually a section of a file. ``` blocks appear to always be one section. Inline code, however, can 
      // be surrounded by text, which may be on multiple lines.

      if (!hasCode(this.settings.blockLanguage.toString(), el)) {
        return
      }

      const path = context.sourcePath
      const sectionInfo = context.getSectionInfo(el)
      const markdown = sectionInfo.text
      const hash = sha256(markdown)

      let documentEvaluation = this.documentEvaluations[path]
      if (documentEvaluation === undefined || documentEvaluation.hash !== hash) {
        // TODO If a code block is completely deleted the post-processing callback isn't triggered and we don't get an
        //   opportunity to detach.
        documentEvaluation?.detach()
        const evaluations = evaluate(this, this.sciCtx, this.settings, markdown, { sanitizer: sanitizeHTMLToDom })
        documentEvaluation = new DocumentEvaluation(hash, evaluations)
        this.documentEvaluations[path] = documentEvaluation
      }

      documentEvaluation.attach(el, sectionInfo)
    });
  }

  private onFileClose(path: string) {
    this.documentEvaluations[path]?.detach()
  }

  async onunload() {
    for (const documentEvaluation of Object.values(this.documentEvaluations)) {
      documentEvaluation.detach()
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// TODO If settings change then reset evaluation cache
class ObsidianClojureSettingTab extends PluginSettingTab {
  plugin: ObsidianClojure;

  constructor(app: App, plugin: ObsidianClojure) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    containerEl.createEl('h2', {text: 'Obsidian Clojure Settings'});

    new Setting(containerEl)
      .setName('Code-block language')
      .setDesc('What language should the code-block be set to for us to evaluate it?')
      .addText((text) => {
        text.setPlaceholder('clojure')
          .setValue(this.plugin.settings.blockLanguage)
          .onChange(async (value) => {
            this.plugin.settings.blockLanguage = value
            await this.plugin.saveSettings()
          })
      })

    new Setting(containerEl)
      .setName('Show full errors')
      .setDesc('If to display full errors when they happen, or just the title of the error')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.fullErrors)
          .onChange(async (value) => {
            this.plugin.settings.fullErrors = value
            await this.plugin.saveSettings()
          })
      })

    containerEl.createEl('h3', {text: 'Remember: Reload Obsidian for new settings to take effect'});
  }
}
