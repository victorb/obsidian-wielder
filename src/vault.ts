import { TFile } from "obsidian"
import ObsidianClojure from "./main"

export class VaultWrapper {
  private plugin: ObsidianClojure

  constructor(plugin: ObsidianClojure) {
    this.plugin = plugin
  }

  /**
   * @param path can be a short path.
   */
  public getFile(path: string): TFile | null {
    return this.plugin.app.metadataCache.getFirstLinkpathDest(path, '')
  }
}
