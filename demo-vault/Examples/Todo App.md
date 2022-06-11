This is a mini-application made with obsidian-clojure.

It uses files stored in the sub-directory `Todos` as a database.

First we create a var that holds a list of all the files inside `Examples/Todos`

```clojure
(def todo-files
	(.-children
		(aget
			(.. js/window -app -fileManager -vault -fileMap)
			"Examples/Todos")))
```

Quick inspect that everything looks like it should:

```clojure
(first todo-files)
```

Then we create a small component that displays an Obsidian link to a specific file:

```clojure
(defn $link [child]
	[:a.internal-link
		{:href (.-path (first todo-files))}
		(.-basename (first todo-files))])
```

Testing that it's working fine for us:

```clojure
(*renderReagent
 (map $link todo-files))
```

You should be able to click on the file above and it takes you to the right file.

We can read a file with `this.app.vault.read`

```clojure
(.then
	(.read js/window.app.vault
		   (first todo-files))
	(fn [res]
		(*renderCode res)))
```