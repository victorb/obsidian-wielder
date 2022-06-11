```clojure
(def age 103)
(.setTimeout
	js/window
	#(*renderText "Loaded 1")
	2400)
```

```clojure
(.setTimeout
	js/window
	#(*renderText age)
	1000)
```

