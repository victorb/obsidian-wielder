Let's test by evaluating something fun like MATH!

```clojure
(+ 2 1)
```

Woah, seems that worked fine. Let's try to define something:

```clojure
(def my-name "Victor")
```

Worked fine too. Let's see if we can use it too?

```clojure
(str "It seems your name is " my-name)
```

Can we use stuff like slurp as well? Unlikely, but let's give it a go!

```clojure
(slurp "https://example.com")
```

That didn't work. What if we can use JS's `fetch` instead?

```clojure
(js/fetch "https://example.com")
```

Let's check if window/document is available

```clojure
js/window
```

```clojure
js/document
```

We can render stuff the web by using our `renderView` function

```clojure
(->	(js/fetch "https://jsonplaceholder.typicode.com/photos/23")
	(.then #(.json %))
	(.then #(.stringify js/JSON % nil 2))
	(.then #(*renderText %)))
```

What's really cool is that we can write Reagent components too!

```clojure
(*renderReagent [:div "Hello Dynamic!"])
```

