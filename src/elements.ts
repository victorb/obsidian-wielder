import * as sci from "lib/sci"
import { CodeBlockEvaluation } from "./evaluator"
import ObsidianClojure from "./main"

const RESULTS_WRAPPER_CLASS = 'eval-results'
const INLINE_CODE_ELEMENT_SOURCE_ATTRIBUTE_NAME = 'data-clojure-source'

export class ElementsManager {

  private plugin: ObsidianClojure

  constructor(plugin: ObsidianClojure) {
    this.plugin = plugin
  }

  public renderCode(sectionElement: HTMLElement, evaluation: CodeBlockEvaluation) {
    // Expects only one code block at a time.
    const codeElement = sectionElement.querySelector('code')
    const parentElement = codeElement.parentElement.parentElement;

    // Might have existing wrapper we need to remove first
    const possibleResults = parentElement.querySelector(`.${RESULTS_WRAPPER_CLASS}`)
    if (possibleResults) {
      parentElement.removeChild(possibleResults)
    }

    const isSpecialRender = evaluation.renderFunction != null
    const $resultsWrapper = isSpecialRender ? document.createElement('div') : document.createElement('pre')
    const $results = isSpecialRender ? document.createElement('div') : document.createElement('code')
    $resultsWrapper.addClass(RESULTS_WRAPPER_CLASS)

    if (evaluation.isError) {
      $resultsWrapper.style.backgroundColor = 'red'
      $resultsWrapper.style.color = 'white'
      $results.style.backgroundColor = 'red'
      $results.style.color = 'white'
      $results.innerText = "ERROR: " + evaluation.output
    } else {
      if (isSpecialRender) {
        evaluation.renderFunction($results)
      } else {
        // TODO This could be a render function
        $results.innerText = "=> " + sci.ppStr(evaluation.output)
      }
    }

    $resultsWrapper.appendChild($results)
    parentElement.appendChild($resultsWrapper)
  }

  public renderInlineCode(sectionElement: HTMLElement, evaluation: CodeBlockEvaluation) {
    const codeElements = this.getCodeElements(sectionElement)
    const codeElement = codeElements[evaluation.sectionIndex]

    codeElement.setAttribute(INLINE_CODE_ELEMENT_SOURCE_ATTRIBUTE_NAME, evaluation.codeBlock.source)
    codeElement.innerText = evaluation.output
    codeElement.style.color = 'inherit'
    codeElement.style.backgroundColor = 'inherit'
    codeElement.style.fontSize = 'inherit'
  }

  public hasCodeDescendants(container: HTMLElement): boolean {
    for (const codeElement of container.querySelectorAll('code')) {
      if (this.isCode(codeElement)) return true
    }
    return false
  }

  private getCodeElements(containerEl: HTMLElement): HTMLElement[] {
    const codeElements = containerEl.querySelectorAll('code')
    const clojureCodeElements: HTMLElement[] = []
    codeElements.forEach((el) => {
      if (this.isCode(el)) {
        clojureCodeElements.push(el)
      }
    })
    return clojureCodeElements
  }

  private isCode(codeElement: HTMLElement): boolean {
    // Unrendered inline code--rendering replaces the inner text with the code output.
    if (codeElement.innerText[0] == '|' && codeElement.innerText.length > 1) return true

    // Rendered inline code. Doesn't contain the '|' anymore but has a special attribute set.
    if (codeElement.hasAttribute(INLINE_CODE_ELEMENT_SOURCE_ATTRIBUTE_NAME)) return true

    // Code blocks.
    const classList = codeElement.classList
    const languageClass = 'language-' + this.plugin.settings.blockLanguage
    return classList.contains(languageClass)
  }
}
