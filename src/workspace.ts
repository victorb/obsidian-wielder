import { MarkdownView } from "obsidian"
import ObsidianClojure from "./main"

export class WorkspaceWrapper {

  private plugin: ObsidianClojure
  private documentRerenderQueue: string[] = []

  constructor(plugin: ObsidianClojure) {
    this.plugin = plugin
  }

  public rerender(documentPath: string) {
    if (!this.documentRerenderQueue.contains(documentPath)) {
      this.documentRerenderQueue.push(documentPath)
      Promise.resolve().then(() => {
        this.documentRerenderQueue.remove(documentPath)
        this.rerenderSync(documentPath)
      })
    }
  }

  private rerenderSync(documentPath: string) {
    const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown')
    for (const leaf of markdownLeaves) {
      const view = leaf.view
      if (view instanceof MarkdownView) {
        if (view.file.path === documentPath) {
          if (view.getMode() === 'preview') {
            view.previewMode.rerender(true)
          }
          return
        }
      }
    }
  }
}
