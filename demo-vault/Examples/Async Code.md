```clojure
(->	(js/fetch "https://jsonplaceholder.typicode.com/photos/23")
	(.then #(.json %))
	(.then #(.stringify js/JSON % nil 2))
	(.then #(*renderText %)))
```

```clojure
(.setTimeout
	js/window
	#(*renderText "Loaded 1")
	2000)
```

```clojure
(.setTimeout
	js/window
	#(*renderText "Loaded 2")
	1000)
```

This should render last:

```clojure
(*renderText (+ 1 3))
```

```clojure
(*renderText (.toISOString (js/Date. )))
```