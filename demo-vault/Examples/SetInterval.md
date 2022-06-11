We can use `setInterval` but since we need to be able to keep track of which intervals to kill afterwards, we need to use `setIntervalTracked` instead.

```clojure
(.setIntervalTracked
 js/window
 #(*renderCode (.toISOString (js/Date.)))
 1000)
```