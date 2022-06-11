# Clojure
This is a quick rundown of the Clojure syntax, what literals you can expect and so on.

Adopted from https://clojure.org/guides/learn/syntax

## Literals

### Numeric types
```clojure
42
```

```clojure
-1.5
```

```clojure
22/7
```

```clojure
3.2M
```

### Character types

```clojure
"hello world!"
```

```clojure
\e
```

```clojure
#"[0-9]+"
```

### Symbols and idents

```clojure
map
```

```clojure
+
```

```clojure
clojure.core/+
```

```clojure
nil
```

```clojure
false true
```

```clojure
:alpha
```

```clojure
:release/alpha
```

### Literal collections

```clojure
'(1 2 3)
```

```clojure
[1 2 3]
```

```clojure
#{1 2 3}
```

```clojure
{:a 1, :b 2}
```

## Structure vs Semantics

Delaying evaluation with quoting

```clojure
'my-symbol
```

Sometimes a list of numbers should just be numbers.

```clojure
'(1 2 3)
```

If you miss the first `'`, you'll get a error

```clojure
(1 2 3)
```

```clojure
(doc map)
```

Next Page: [[04-Inline Renderer]]
Previous Page: [[02-Installation]]
