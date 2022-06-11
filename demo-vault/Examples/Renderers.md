### `*renderText` 
Accepts a string to render below the code block, sets it as innerText

```clojure
(*renderText "Hello World")
```

---

### `*renderHTML`
Accepts a string to render below the code block, sets it as innerHTML so any HTML elements will render as normal

```clojure
(*renderHTML
 "<h3>Hello <code>There</code></h3>")
```

---

### `*renderCode` 
Similar to `*renderText` and just returning values, but useful in async context. Will render the string as a code-block in Obsidian

```clojure
(*renderCode "like returning a value but not")
```

```clojure
(*renderCode (repeat 10 "Repeating lists"))
```

---


### `*renderReagent`
Takes Reagent/Hiccup data and renders it with reagent.dom/render
```clojure
(*renderReagent
 [:h6 "Hello from Reagent"])
```

### Return values from code sample
If instead of providing an explicit render function you just return data.

```clojure
(def my-name "Tommy")
```

```clojure
(str "Hello there " my-name)
```

One difference is that returning values will try to "pretty print" them, so returning a string with wrap the text with double-quotes while using `*renderText` will display the text without quotes.

Another one is that `*renderText`, `*renderHTML`,  `*renderReagent` won't wrap your results in any code/pre blocks, so it looks like normal text, instead of looking like the output of running code.