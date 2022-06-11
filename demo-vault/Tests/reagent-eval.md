```clojure
(*renderHTML "<div>Hi!</div>")
```

```clojure
(*renderHTML "<bold>Lol</bold>")
```

```clojure
(*renderText "hi")
```

#### App Example

```clojure
(def click-count (ratom 1))
```

```clojure
(defn $increment []
	[:button
	 {:onClick #(swap! click-count inc)}
	 "Inc"])
```

```clojure
(defn app []
	[:div
		@click-count
		[$increment]])
```

```clojure
(*renderReagent [app])
```