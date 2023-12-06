import {
  App,
  Plugin,
  PluginSettingTab,
  Setting,
  Editor,
  sanitizeHTMLToDom
} from 'obsidian';

import {initialize, hasCode, evaluate, CodeBlockEvaluation, evaluate_v2, renderEvaluation} from './evaluator.ts'

import CryptoJS from 'crypto-js';

interface ObsidianClojureSettings {
  fullErrors: boolean
  blockLanguage: String
}

interface DocumentEvaluation {
  /** From the last time the document was evaluated. */
  hash: string
  codeBlockEvaluations: CodeBlockEvaluation[]
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

  documentEvaluations: { [docId: string]: DocumentEvaluation } = {};

  async evalAll(sciCtx) {
    /*
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.getViewState().type === "markdown" && leaf.getViewState().state.mode === "preview") {
        const containerEl = leaf.containerEl;
        evaluate(sciCtx,
                 containerEl,
                 this.settings,
                 {sanitizer: sanitizeHTMLToDom});
      }
    });
    */
  }

  killCustomIntervals () {
    for (const intervalID of this.activeIntervals) {
      clearInterval(intervalID)
    }
  }

  killIntervalsAndEval() {
    this.killCustomIntervals();
    this.evalAll(this.sciCtx)
  }

  handleRenderFromEvent() {
    window.setTimeout(() => {
      this.killIntervalsAndEval();
    }, this.defaultWaitTimeout)
  }

  customSetInterval(func, interval_ms) {
    const intervalID = window.setInterval(func, interval_ms)
    this.registerInterval(intervalID)
    this.activeIntervals.push(intervalID)
  }

  async onload() {
    await this.loadSettings();

    this.eventsToListenTo = [
      'editor-change',
      'file-open',
      'layout-change',
      'active-leaf-change',
    ];
    this.defaultWaitTimeout = 100;
    this.activeIntervals = [];

    window.setIntervalTracked = this.customSetInterval.bind(this);

    this.sciCtx = initialize(window)

    this.eventsToListenTo.forEach((eventName) => {
      const eventRef = this.app.workspace.on(eventName, this.handleRenderFromEvent.bind(this))
      this.registerEvent(eventRef);
    })

    // TODO Figure out how to wait for document to finalize initalization
    // Initial load of plugin should be considered an "event" in itself
    this.handleRenderFromEvent()

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
      if (!hasCode(this.settings.blockLanguage.toString(), el)) {
        return
      }

      const sourcePath = context.sourcePath
      const sectionInfo = context.getSectionInfo(el)
      const markdown = sectionInfo.text
      const hash = sha256(markdown)

      let documentEvaluation = this.documentEvaluations[sourcePath]
      if (documentEvaluation === undefined || documentEvaluation.hash !== hash) {
        console.log(`Evaluating doc ${sourcePath}`)
        const evaluations = evaluate_v2(this.sciCtx, this.settings, markdown)
        documentEvaluation = { hash: hash, codeBlockEvaluations: evaluations }
        this.documentEvaluations[sourcePath] = documentEvaluation
      } else {
        console.log(`Doc ${sourcePath} has already been evaluated`)
      }

      for (const codeBlockEvaluation of documentEvaluation.codeBlockEvaluations) {
        const codeBlock = codeBlockEvaluation.codeBlock
        if (codeBlock.lineStart == sectionInfo.lineStart && codeBlock.lineEnd == sectionInfo.lineEnd) {
          renderEvaluation(el, codeBlockEvaluation.output)
          return
        }
      }
    });
  }

  async onunload() {
    // Clean up our intervals + the function we expose
    this.killCustomIntervals();
    window.setIntervalTracked = undefined;
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
