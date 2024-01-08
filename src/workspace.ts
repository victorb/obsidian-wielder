import { MarkdownView } from "obsidian"
import ObsidianClojure from "./main"

export class WorkspaceWrapper {

  private plugin: ObsidianClojure
  private documentRerenderQueue: string[] = []
  private markdownPreviewsRerenderQueued = false

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

  public rerenderMarkdownPreviews() {
    if (!this.markdownPreviewsRerenderQueued) {
      this.markdownPreviewsRerenderQueued = true
      Promise.resolve().then(() => {
        this.markdownPreviewsRerenderQueued = false
        this.rerenderMarkdownPreviewsSync()
      })
    }
  }

  private async rerenderSync(documentPath: string) {
    const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown')
    for (const leaf of markdownLeaves) {
      const view = leaf.view
      if (view instanceof MarkdownView) {
        if (view.file.path === documentPath) {
          if (view.getMode() === 'preview') {
            this.rerenderPreview(view)
          }
        }
      }
    }
  }

  private async rerenderMarkdownPreviewsSync() {
    const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown')
    for (const leaf of markdownLeaves) {
      const view = leaf.view
      if (view instanceof MarkdownView) {
        if (view.getMode() === 'preview') {
          this.rerenderPreview(view)
        }
      }
    }
  }

  private async rerenderPreview(view: MarkdownView) {
    view.previewMode.rerender(true)

    // TODO Remove once this issue is fixed:
    // https://forum.obsidian.md/t/markdownview-previewmode-rerender-true-hides-note-title-and-properties-from-reading-view/72974/5
    const state = view.getState()
    state.mode = 'source'
    await view.setState(state, { history: false })
    state.mode = 'preview'
    await view.setState(state, { history: false })
  }
}
