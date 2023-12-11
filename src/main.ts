import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Editor,
  sanitizeHTMLToDom,
  MarkdownView
} from 'obsidian';
import { ElementsManager } from './elements.js';
import { ClojureEvaluator } from './evaluator.js'

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
  public settings: ObsidianClojureSettings;

  eventsToListenTo: string[];

  // TODO need to get rid of this hack
  defaultTimeout: number;

  public elements: ElementsManager

  public evaluator: ClojureEvaluator

  async onload() {
    await this.loadSettings();

    this.elements = new ElementsManager(this)
    this.evaluator = new ClojureEvaluator(this)

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

    this.registerMarkdownPostProcessor((el, context) => {
      // `el` here is usually a section of a file. ``` blocks appear to always be one section. Inline code, however, can 
      // be surrounded by text, which may be on multiple lines.

      if (!this.elements.hasCodeDescendants(el)) {
        return
      }

      // TODO Look into context.addChild and whether we could get a callback when the file is closed, for example
      //   It might be a good spot to kill intervals

      const path = context.sourcePath
      const sectionInfo = context.getSectionInfo(el)
      const markdown = sectionInfo.text

      const documentEvaluation = this.evaluator.evaluate(path, markdown)
      documentEvaluation.attach(el, sectionInfo)
    });
  }

  async onunload() {
    this.elements = null
    this.evaluator.clear()
    this.evaluator = null
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.evaluator.clear()
  }
}

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
          .setValue(this.plugin.settings.blockLanguage.toString())
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
