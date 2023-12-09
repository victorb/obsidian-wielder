(ns sci.api
  (:require
    [clojure.pprint :refer [pprint]]
    [sci.core :as sci]
    [reagent.core :as r]
    [reagent.dom :as rdom]
    [cljs.repl :as repl]))
    ;; [clojure.repl :as repl]))

;; TODO This is not working correctly...
(def doc ^:sci/macro
  (fn [_&form _&env x]
    (with-out-str
      (repl/doc x))))

(defn ^:export init [js-global]
  (sci/init {:bindings {'hello "this is working"
                        'ratom r/atom
                        'doc doc}
             :classes {'js js-global
                       :allow :all}}))

(defn ^:export renderReagent [app container]
  (rdom/render app container))

(defn ^:export ppStr [t]
  (with-out-str (pprint t)))

(defn ^:export evalString [ctx source {:keys [onRenderHTML
                                              onRenderText
                                              onRenderCode
                                              onRenderReagent
                                              onSetInterval]
                                       :as opts}]
  (sci/eval-string*
    (assoc
      ctx
      :bindings
      (assoc (:bindings ctx)
             '*renderHTML (.-onRenderHTML ^js/Object opts)
             '*renderText (.-onRenderText ^js/Object opts)
             '*renderCode (.-onRenderCode ^js/Object opts)
             '*renderReagent (fn [app container-el]
                               (.onRenderReagent
                                 opts
                                 app))
             'setInterval (.-onSetInterval ^js/Object opts)))
    source))

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
