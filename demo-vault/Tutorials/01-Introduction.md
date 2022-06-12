Welcome to Wielder, the plugin that enables Obsidian to seamlessly embed Clojure code via SCI, enabling you to do all kinds of fun stuff, as long as you can program it!

As soon as you installed the plugin, you'll be able to execute any Clojure blocks in your documents.

For an example, you can do stuff like this:

```clojure
(apply str
	   (interpose " | " (repeat 10 "I Love Clojure")))
```

That small snippet of code takes 10 elements of `"I Love Clojure"` and adds them together to one big string with `" | "` added between every element.

We can also define variables to be later used in the same document. Like this:

```clojure
(def statement "I love Clojure")
```

```clojure
(def separator " | ")
```

```clojure
(def repeat-count 20)
```

```clojure
(def list-of-statements
	(interpose separator (repeat repeat-count statement)))
```

```clojure
(def our-final-string
	(apply str list-of-statements))
```

```clojure
our-final-string
```

Sometimes you just want to output from text that looks like regular text though, which you can also do!

```clojure
(*renderText "I do love my some Clojure in the morning.")
```

The text under the above code-block is visible in the Obsidian "Read" view, but not in the "Edit" view, because it's added by Wielder.

Sometimes you want to output raw HTML which is also possible.

```clojure
(*renderHTML "<button>I'm a button</button")
```

Just like any other Obsidian button, but you can generate it dynamically. Note: It won't do anything when you click on it, unless we program it to.

If we want to add interactivity to our Obsidian documents, we can use Reagent, which we can also render with Wielder. Reagent is a React-wrapper written in Clojure, so if you know how to use React, it should be easy to grok.

```clojure
(def my-name "Victor")
```

```clojure
(*renderReagent
 [:div
   [:h6 "My name is " my-name]])
```

With Reagent, we can also have application state that we can change inside the Reagent context.

```clojure
(def name-state (ratom "Victor"))
```

```clojure
(defn handle-change [ev]
	(let [new-value (-> ev .-target .-value)]
		(reset! name-state new-value)))
```

```clojure
(defn $input [name-state]
  [:div
	[:input {:type "text"
	         :onChange handle-change
			 :value @name-state}]])
```

```clojure
(defn $my-app []
 [:div
   [$input name-state]
   [:div
	   "Seems your name is "
	   @name-state
	   ", is that correct?"]])
```

```clojure
(*renderReagent [$my-app])
```


---

This was just a short introduction to the functionality of what you can achieve with Wielder. Continue with the rest of the tutorial files to see what else you can do!

Next Page: [[02-Installation]]
