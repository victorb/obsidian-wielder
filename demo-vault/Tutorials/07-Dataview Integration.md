![[Requires Obsidian Dataview]]

Since Obsidian Dataview is just JavaScript, and Wielder can call JavaScript code, you can also call Dataview from Wielder!

This can be useful if you want to render other things than just tables, but still use the power of queries from Dataview.

First, here's a table directly from Dataview:

```dataview
table time-played, length, rating
from #games
sort rating desc
```

Now, data from Dataview taken via Wielder

```clojure
(map
  #(.-name %)
  (.-values
   (.pages js/DataviewAPI "#games")))
```