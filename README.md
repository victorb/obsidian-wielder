## Obsidian Wielder
> Clojure inside your Obsidian documents!

<a href="https://github.com/victorb/obsidian-wielder/raw/master/demo-vault/Attachments/WielderDemo.mp4">
  <img alt="Demonstration Video" src="https://github.com/victorb/obsidian-wielder/raw/master/demo-vault/Attachments/WielderDemo.gif"/>
</a>

This Obsidian plugin allows you to use the full power of Clojure directly inside of your documents in Obsidian! If you view documents with code blocks marked as `clojure` in the view-mode of Obsidian, this plugin will automatically run the code you have specified inside the block.

The plugin goes block by block for your entire document, so you can build pipelines of data with descriptive text in-between, and slowly build up to the final data and then present it. All directly in your documents without doing anything outside of Obsidian.

Add in rendering React components with Reagent, and you can build fully interactive applications by just writing in markdown files, rendered in Obsidian!

Wielder also allows you to access the Obsidian API directly (via `window.app`), so anything you can do with a plugin, you could also do directly in just document.

### Installation Instructions

Take a look at the [Installation Tutorial](https://wielder.victor.earth/Tutorials/02-Installation) to learn how you can install Wielder in Obsidian

### Warning: Wielder can run any code defined as Clojure code-blocks in your Obsidian documents

Just like [Templater](https://github.com/SilentVoid13/Templater) or [Dataview](https://github.com/blacksmithgu/obsidian-dataview), Wielder executes code defined by your Obsidian documents. This means any sort of code.

Unless you know exactly what the code you're executing does, it can be harmful to your Vault, Obsidian installation or even complete system.

You should take care to only run Wielder with code you understand what it does, and also not copy-paste code from strangers into your Vault without fully understanding what it does.

Wielder will never run any code defined from outside your Obsidian Vault, so you are yourself responsible for the code that gets executed.

Again, take care of what code you run with Wielder, as it can be potentially destructive.

### Demonstration Vault

It's hard to describe exactly what you can do with Wielder with just text, so easiest is to just install the plugin and checkout the demo-vault provided in this repository. 

If you don't want to install the plugin before seeing it in action, you can checkout a web version of the vault (and Wielder) here: https://wielder.victor.earth (ah yeah I forgot to mention: of course it works with webpages as well as inside Obsidian!)


### Code Layout

The main pieces are the following files:

- `sci-js/src/sci/api.cljs` - ClojureScript file which provides a JS<>CLJS interface to be used by this plugin
- `src/elements.ts` - TypeScript source for managing DOM elements.
- `src/evaluator.ts` - TypeScript source for initializing the SCI environment and evaluating code snippets from DOM elements
- `src/main.ts` - Obsidian Plugin's main source file. Is what gets compiled into `main.js` and published as the plugin
- `src/publish.ts` - Source of the publisher part. Include the compiled version of this library and your published site will work (mostly) the same way as your vault when loaded via desktop Obsidian.
