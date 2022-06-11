# Reagent Counter Example

This example will show you how you can develop a simple counter application with Obsidian, Obsidian Clojure Plugin and Reagent.

First we setup our state with `ratom`. 

```clojure
(def count-state (ratom 0))
```

Then we create a function we can call from our component in order to update the current count by 1.

```clojure
(defn onClick []
	(swap! count-state inc))
```

Then we create a component that will represent our clickable button.

```clojure
(defn button []
	[:button {:onClick onClick}
	 "Click Me!"])
```

And then we also create a component that shows the current count.

```clojure
(defn current-count []
	[:div "Current count: " @count-state])
```

Now we just need to add them together in one component that we can render

```clojure
(defn app []
	[:div
		[button]
		[current-count]])
```

Final step is to call `*renderReagent` in order to render our app to the DOM inside our note.

```clojure
(*renderReagent [app])
```