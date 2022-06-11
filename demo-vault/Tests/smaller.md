```clojure-eval
(+ 1 1)
```

```clojure-eval
*renderHTML
```

```clojure-eval
(->	(js/fetch "https://jsonplaceholder.typicode.com/photos/23")
	(.then #(.json %))
	(.then #(.stringify js/JSON % nil, 2))
	(.then #(*renderHTML %)))
```

```clojure-eval
(->	(js/fetch "https://jsonplaceholder.typicode.com/photos/2535")
	(.then #(.json %))
	(.then #(*renderReagent
		[:img
			{:src (.-url %)}])))
```

```clojure-eval
(*renderHTML "<div>hello</div>")
```

```clojure-eval
*renderReagent
```