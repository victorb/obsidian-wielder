import {initialize, evaluate} from './evaluator.ts'
import '../node_modules/sanitizer-polyfill/src/polyfill.js'

const defaultSettings = {
  'blockLanguage': 'clojure',
  'fullErrors': false
}

const main = () => {

  window.setIntervalTracked = window.setInterval

  const sciCtx = initialize(window)

  window.history.pushState = new Proxy(window.history.pushState, {
    apply: (target, thisArg, argArray) => {
      window.setTimeout(() => {
        const containerEl = document.querySelector('.publish-renderer')
        evaluate(sciCtx, containerEl, defaultSettings)
      }, 100)
      return target.apply(thisArg, argArray);
    },
  })

  const containerEl = document.querySelector('.publish-renderer')
  evaluate(sciCtx, containerEl, defaultSettings)
}

if (document.readyState !== 'loading') {
  main()
} else {
  document.addEventListener('DOMContentLoaded', main)
}
