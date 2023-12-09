While the approach is very powerful and allows you to be very dynamic, directly in your Obsidian documents, it also comes with some pitfalls that you have to be careful to avoid.



##### JavaScript `setInterval`

Every time you create a JavaScript interval with `(.setInterval js/window …)`, you create something that will exists until the end of time (or you call `clearInterval`). Since we cannot automagically keep track of all the intervals created in your documents VS the ones created natively by Obsidian, you need to use `setInterval` instead of `.setInterval js/window`, which allows us to clear all intervals when you change the document, or navigate to a different page in Obsidian.

It'll look something like this:

```clojure
(setInterval
 #(*renderCode (.toISOString (js/Date.)))
 1000)
```

##### Clojure `repeat` and other infinitive sequences

Clojure's repeat, if you only give it one argument, will return a infinitive, lazy sequence. This can hang Obsidian as it'll try to `realize` all the elements in the sequence, but will never reach the end.

No workaround currently available for this, so be careful with infinitive sequences.