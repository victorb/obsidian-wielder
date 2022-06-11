Sometimes you want the result of code evaluation to be in the middle of some text. We can do that by using the prefix "| " and placing it in a inline code block. 

It looks something like this:

> What is 1 + 1? We think it's `| (+ 1 2)`, but what do we know?

We can also define a var with our value and then later use it. In this example, we count the number of pages in our vault.

```clojure
(def pages-count
	(->> js/window.app.vault.fileMap
		 (.keys js/Object)
		 (count)))
```

So, how many pages do we currently have in the current vault? Seems it's about `| pages-count` pages in total, that's super neat. If we wrote 10 more pages, we'd have `| (+ pages-count 10)`.

Next Page: [[05-Obsidian Integration]]
Previous Page : [[03-Clojure]]