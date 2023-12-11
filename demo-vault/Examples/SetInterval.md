We can use `setInterval` but since we need to be able to keep track of which intervals to kill afterwards, we need to use `(setInterval …)` rather than `(.setInterval js/window …)`.

```clojure
(setInterval
 #(*renderCode (.toISOString (js/Date.)))
 1000)
```