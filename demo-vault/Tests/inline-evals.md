```clojure
(def name "Victor")
```

```clojure
(+ 1 2)
```

```clojure-eval
(str "Seems your name is "
	 name
	 " is that correct?")
```

We can also do inline Clojure, by prepending the `|` (pipe) character and then writing Clojure code after this. We still have access to all previously created vars too.

> It seems your name is `| name`, does that happen to be correct?

> Ever wondered what 1 + 1 is? I know for a fact it's `| (+ 1 1)`!