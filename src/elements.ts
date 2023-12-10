
export function isCodeElement(lang: string, codeElement: HTMLElement): boolean {
    // Inline code
    if (codeElement.innerText[0] === '|') {
      return true
    }
    const codeBlockLanguage = 'language-' + lang
    const classList = codeElement.classList
    if (classList.contains(codeBlockLanguage) || classList.contains('clojure-inline')) {
      return true
    }
    return false
}

export function hasCode(lang: string, container: HTMLElement): boolean {
  for (const codeElement of container.querySelectorAll('code')) {
    if (isCodeElement(lang, codeElement)) return true
  }
  return false
}

export function getCodeElements(lang: string, containerEl: HTMLElement): HTMLElement[] {
  const codeElements = containerEl.querySelectorAll('code')
  const clojureCodeElements: HTMLElement[] = []
  codeElements.forEach((el) => {
    if (isCodeElement(lang, el)) {
      clojureCodeElements.push(el)
    }
  })
  return clojureCodeElements
}
