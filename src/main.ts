import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

import {initialize, evaluate} from './evaluator.ts'

interface ObsidianClojureSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianClojureSettings = {
  mySetting: 'default',
  fullErrors: false,
  blockLanguage: 'clojure',
}

export default class ObsidianClojure extends Plugin {
  settings: ObsidianClojureSettings;

  async evalAll(sciCtx) {

    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.getViewState().type === "markdown" && leaf.getViewState().state.mode === "preview") {
        const containerEl = leaf.containerEl;
        evaluate(sciCtx, containerEl, this.settings);
      }
    });
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

  async onload() {
    await this.loadSettings();

    const originalSetInterval = window.setInterval;
    this.activeIntervals = [];

    const customSetInterval = (func, interval_ms) => {
      const intervalID = originalSetInterval(func, interval_ms)
      this.activeIntervals.push(intervalID)
    }


    window.setIntervalTracked = customSetInterval;

    this.sciCtx = initialize(window)

    // TODO Figure out how to wait for document to finalize initalization
    setTimeout(() => {
      const eventsToListenTo = [
        'editor-change',
        'file-open',
        'layout-change',
        'active-leaf-change',
      ]

      eventsToListenTo.forEach((eventName) => {
        this.app.workspace.on(eventName, () => {
          window.setTimeout(() => {
            this.killIntervalsAndEval();
          }, 100)
        })
      })

      this.killIntervalsAndEval();
    }, 100)

    this.addCommand({
      id: 'insert-clojure-code-block',
      name: 'Insert Clojure Code Block',
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf
        if (leaf) {
          if (!checking) {
            const doc = app.workspace.activeLeaf.view.editor.getDoc()
            doc.replaceSelection(clojureTemplate)
            const currentLine = doc.getCursor().line
            const newLine = currentLine - 2
            doc.setCursor({line: newLine, ch: 0})
          }
          return true;
        }
        return false;
      }
    });


    this.addSettingTab(new ObsidianClojureSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

const clojureTemplate =
`\`\`\`clojure

\`\`\`
`


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
