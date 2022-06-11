First, define a Clojure Atom

```clojure
(def app-state (atom 0))
```

Second, lets look at it's value

```clojure
@app-state
```

Incrementing it with `inc`

```clojure
(swap! app-state inc)
```

Looking at it again.

```clojure
@app-state
```

Now, to have it inline:

Inline res: `| @app-state`

```clojure
(with-out-str (println @app-state))
```