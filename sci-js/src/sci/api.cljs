(ns sci.api
  (:require
    [clojure.pprint :refer [pprint]]
    [sci.core :as sci]
    [sci.impl.vars]
    [reagent.core :as r]
    [reagent.dom :as rdom]
    [cljs.repl :as repl]
    [cljs.core :refer [clj->js]]
    [promesa.core]
    [cljc.java-time.local-date :as ld]
    [cljc.java-time.format.date-time-formatter :as dtf]))
    ;; [clojure.repl :as repl]))

;; TODO This is not working correctly...
(def doc ^:sci/macro
  (fn [_&form _&env x]
    (with-out-str
      (repl/doc x))))

(defn ^:export init [js-global o-bindings]
  (sci/init {:bindings {'hello "this is working"
                        'ratom r/atom
                        'doc doc}
              :classes {'js js-global
                        :allow :all}
              :namespaces {'dtf {'of-pattern dtf/of-pattern}
                           'ld {'format ld/format
                                'parse ld/parse
                                'plus-days ld/plus-days
                                'minus-days ld/minus-days}
                          'o (update-keys (js->clj o-bindings) symbol)
                          'p {'all promesa.core/all
                              'resolved promesa.core/resolved
                              'rejected promesa.core/rejected
                              'then (fn [p f] (promesa.core/then p (sci.impl.vars/binding-conveyor-fn f)))}
                          'vars {'binding-conveyor-fn sci.impl.vars/binding-conveyor-fn}}}))

(defn ^:export renderReagent [app container]
  (rdom/render app container))

(defn ^:export ppStr [t]
  (try
    (with-out-str (pprint t))
    (catch js/Error e t)))

(def *renderCode (sci/new-dynamic-var '*renderCode nil))
(def *renderText (sci/new-dynamic-var '*renderText nil))
(def *renderMarkdown (sci/new-dynamic-var '*renderMarkdown nil))
(def *renderHTML (sci/new-dynamic-var '*renderHTML nil))
(def *renderReagent (sci/new-dynamic-var '*renderReagent nil))
(def setInterval (sci/new-dynamic-var 'setInterval nil))
(def chart (sci/new-dynamic-var 'chart nil))
(def sci-current (sci/new-dynamic-var 'current nil))

(defn ^:export evalString 
  [ctx 
   source 
   {:keys [onRenderHTML onRenderText onRenderCode onRenderReagent onSetInterval onChart] :as opts}
   current-page]
  (sci/binding [*renderCode (.-onRenderCode ^js/Object opts)
                *renderText (.-onRenderText ^js/Object opts)
                *renderMarkdown (.-onRenderMarkdown ^js/Object opts)
                *renderHTML (.-onRenderHTML ^js/Object opts)
                *renderReagent (fn [app container-el] (.onRenderReagent opts app))
                setInterval (.-onSetInterval ^js/Object opts)
                chart #(.onChart ^js/Object opts (clj->js %))
                sci-current (fn [] current-page)]
    (sci/eval-string*
      (assoc
        ctx
        :bindings
        (assoc (:bindings ctx)
               '*renderHTML *renderHTML
               '*renderText *renderText
               '*renderMarkdown *renderMarkdown
               '*renderCode *renderCode
               '*renderReagent *renderReagent
               'setInterval setInterval
               'chart chart
               'current sci-current
               ))
      source)))

(comment
  (def ctx (init nil))
  (evalString
    ctx
    "(doc map)"
    {})
  (clojure.pprint/pprint ctx)
  (def ctx (assoc ctx :bindings {'hello "nah"}))
  (evalString
    ctx
    "*renderHTML"
    {:onRenderHTML (fn [] (println "rendering"))}))
