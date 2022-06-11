```clojure
(.setTimeout js/window
	(fn []
		(def my-name "Victor")
		(*renderText #'my-name))
	2000)
```

```clojure
(*renderText (str "Hello theres " my-name))
(.setTimeout js/window
	(fn []
		(*renderText (str "Hello there " my-name))
	1000))
```

```clojure
my-name
```