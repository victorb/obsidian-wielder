This setting is useful if you already have a bunch of Clojure code in blocks set to `clojure` that you don't want to normally evaluate.

You can set this value to `clojure-eval` for example, and only if you mark a code-block with `clojure-eval` instead of `clojure`, will it be evaluated by Wielder.

First block here is defined to be `clojure`

```clojure
(+ 1 1)
```

Next block is `clojure-eval`

```clojure-eval
(+ 1 1)
```

If you load this document in your own Vault, and change the "Code-block Language" to `clojure-eval` instead of `clojure`, the second block should be evaluated, instead of the first one. Changing it back to `clojure` should do the opposite.
