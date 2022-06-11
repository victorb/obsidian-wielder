What is 1 + 1? We think it's `| (+ 1 2)`, but what do we know?

Let's think about some harder stuff!

```clojure
(def pages-count
	(->> js/window.app.vault.fileMap
		 (.keys js/Object)
		 (count)))
```

How many pages do we currently have in the current vault? Seems it's about `| pages-count` pages in total, that's super neat.