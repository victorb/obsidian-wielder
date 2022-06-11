![[Desktop Only]]


As you saw in the previous tutorial, we have access to everything Obsidian inside obsidian-clojure. So you can also call functions from Obsidian as you wish.

Lets take a look at what kind of commands we have available to us:

```clojure
(->> js/window.app.commands.commands
	 (.keys js/Object)
	 (js->clj)
	 (take 10))
```

Alright. Then we can see we have the usual `window.app` variable available to us as well.

```clojure
js/window.app
```

This means we can, for example, get the path of the current active file, like this:

```clojure
(-> js/window
	(.-app)
	(.-workspace)
	(.getActiveFile)
	(.-path))
```

Finally, we write a Reagent (Clojure wrapper around React) Component that triggers the command `switcher:open` when we press the button.

Looks something like this:

```clojure
(defn open-switcher! []
	(-> js/window
		(.-app)
		(.-commands)
		(.executeCommandById "switcher:open")))

(defn button []
	[:button
		{:onClick open-switcher!}
		"Open File Switcher"])
		
(*renderReagent [button])
```

Now when you press the "Open File Switcher" button above, Obsidian should show you the file switcher.

Next Page: [[06-Pitfalls]]
Previous Page: [[04-Inline Renderer]]