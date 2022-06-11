Hello There

```clojure
(*renderText (+ 1 2))
```

```clojure
(js/setTimeout
	#(*renderText "Done"), 2000)
```

```clojure
(js/setTimeout
	#(*renderText "Done"), 2000)
```

Hello World

```clojure
(*renderText (.toISOString (js/Date.)))
```

```clojure
(.setInterval
 js/window
 #(*renderText (.toISOString (js/Date.)))
 1000)
```