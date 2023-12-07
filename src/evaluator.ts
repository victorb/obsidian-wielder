import sci from '../lib/sci.js'

export function initialize(global_object) {
  return sci.init(global_object)
}

interface CodeBlock {
  source: string
  lineStart: number
  lineEnd: number
  isInline: boolean
  inlineIndex?: number
}

export interface CodeBlockEvaluation {
  codeBlock: CodeBlock
  output: string
  isError: boolean
  render?: (resultsCodeEl: HTMLElement) => void
}

export function hasCode(lang: string, container: HTMLElement): boolean {
  const codeElements = container.querySelectorAll('code')
  for (const codeElement of codeElements) {
    // Inline code
    if (codeElement.innerText[0] === '|') {
      return true
    }

    const codeBlockLanguage = 'language-' + lang
    if (codeElement.classList.contains(codeBlockLanguage)) {
      return true
    }
  }
  return false
}

function extractCodeBlocks(lang: string, markdown: string): CodeBlock[] {
  const lines = markdown.split('\n');
  const codeBlocks: CodeBlock[] = [];
  let isInCodeBlock = false;
  let currentBlock = '';
  let blockStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(`^\`\`\`${lang}(\s|$)`)) {
          isInCodeBlock = true;
          blockStartLine = i;
          currentBlock = '';
      } else if (line.match(`^\`\`\`(\s|$)`) && isInCodeBlock) {
          isInCodeBlock = false;
          codeBlocks.push({ 
            source: currentBlock.trim(),
            lineStart: blockStartLine,
            lineEnd: i,
            isInline: false
          });
      } else if (isInCodeBlock) {
          currentBlock += line + '\n';
      } else {
        // Handling inline code
        const inlineRegex = /`\|([^`]+)`/g
        let inlineMatch
        let inlineIndex = 0
        while ((inlineMatch = inlineRegex.exec(line)) !== null) {
            codeBlocks.push({ 
                source: inlineMatch[1].trim(), 
                lineStart: i, 
                lineEnd: i,
                isInline: true,
                inlineIndex
            })
            inlineIndex++
        }
    }
  }

  return codeBlocks;
}

export function evaluate_v2(sciCtx: any, settings: any, markdown: string, opts: any): CodeBlockEvaluation[] {
  const lang = settings.blockLanguage.toString()
  const codeBlocks = extractCodeBlocks(lang, markdown)
  const evaluations: CodeBlockEvaluation[] = [];

  let sanitizer: any = null;
  if (opts && opts.sanitizer) {
    sanitizer = opts.sanitizer
  } else {
    sanitizer = defaultSanitize;
  }

  let renderFunction: (resultsCodeEl: HTMLElement) => void | null = null

  const sciArgs = {
    onRenderText: (info: any) => {
      renderFunction = (r) => r.innerText = info
    },
    onRenderHTML: (info: any) => {
      renderFunction = (r) => r.appendChild(sanitizer(info))
    },
    // TODO not implemented on the SCI side yet, not sure we need or not
    onRenderUnsafeHTML: (info: any) => {
      renderFunction = (r) => r.innerHTML = info
    },
    onRenderCode: (info: any) => {
      renderFunction = (r) => r.innerText = "=> " + sci.ppStr(info)
    },
    onRenderReagent: (reagentComponent: any) => {
      renderFunction = (r) => {
        setTimeout(() => {
          sci.renderReagent(reagentComponent, r)
        }, 10)
      }
    }
  }

  for (const codeBlock of codeBlocks) {
    let output: string = ''
    let isError: boolean = false
    renderFunction = null

    try {
      output = sci.eval(sciCtx, codeBlock.source, sciArgs);
    } catch (err) {
      console.error(err)
      console.trace()
      if (settings.fullErrors) {
        output = sci.ppStr(err)
      } else {
        output = err.message
      }
      isError = true
    }

    evaluations.push({ codeBlock: codeBlock, output: output, isError: isError, render: renderFunction })
  }

  return evaluations
}

// Receives a string with HTML, and returns a sanitized HTMLElement
function defaultSanitize(str) {
  const sanitizer = new Sanitizer();
  return sanitizer.sanitizeFor('div', str);
}

export function renderEvaluation(el: HTMLElement, evaluation: CodeBlockEvaluation) {
  // Expects only one code block at a time.
  const codeElement = el.querySelector('code')
  const parentElement = codeElement.parentElement.parentElement;

  // Might have existing wrapper we need to remove first
  const possibleResults = parentElement.querySelector('.eval-results')
  if (possibleResults) {
    parentElement.removeChild(possibleResults)
  }

  const isSpecialRender = evaluation.render != null
  const $resultsWrapper = isSpecialRender ? document.createElement('div') : document.createElement('pre')
  const $results = isSpecialRender ? document.createElement('div') : document.createElement('code')
  $resultsWrapper.setAttribute('class', 'eval-results')

  if (evaluation.isError) {
    $resultsWrapper.style.backgroundColor = 'red';
    $resultsWrapper.style.color = 'white';
    $results.style.backgroundColor = 'red';
    $results.style.color = 'white';
    $results.innerText = "ERROR: " + evaluation.output
  } else {
    if (isSpecialRender) {
      evaluation.render($results)
    } else {
      $results.innerText = "=> " + sci.ppStr(evaluation.output)
    }
  }

  $resultsWrapper.appendChild($results)
  parentElement.appendChild($resultsWrapper)
}

/**
 * Does not support special render functions.
 */
export function renderInlineEvaluation(el: HTMLElement, evaluation: CodeBlockEvaluation) {
  const codeElement = el.querySelectorAll('code')[evaluation.codeBlock.inlineIndex]
  codeElement.innerText = evaluation.output
  codeElement.style.color = 'inherit'
  codeElement.style.backgroundColor = 'inherit'
  codeElement.style.fontSize = 'inherit'
}

export function evaluate(sciCtx, container, settings, opts) {
  const codeElements = container.querySelectorAll('code')

  let sanitizer = null;
  if (opts && opts.sanitizer) {
    sanitizer = opts.sanitizer
  } else {
    sanitizer = defaultSanitize;
  }

  for (const codeElement of codeElements) {

    let isInline = false
    let isError = false
    let isSpecialRender = false

    if (codeElement.innerText[0] === '|') {
      isInline = true;
    }

    const codeBlockLanguage = 'language-' + settings.blockLanguage
    if (!codeElement.classList.contains(codeBlockLanguage) && !isInline) {
      continue
    }

    let codeToEval = codeElement.innerText;
    if (isInline) {
      codeToEval = codeToEval.slice(2)
    }

    const hasRenderText = codeToEval.includes("*renderText")
    const hasRenderHTML = codeToEval.includes("*renderHTML")
    const hasRenderReagent = codeToEval.includes("*renderReagent")
    const hasRenderCode = codeToEval.includes("*renderCode")
    isSpecialRender = hasRenderText || hasRenderHTML || hasRenderReagent || isInline

    let output = "Loading..."

    const parentElement = codeElement.parentElement.parentElement;
    // Might have existing wrapper we need to remove first
    const possibleResults = parentElement.querySelector('.eval-results')

    if (possibleResults) {
      parentElement.removeChild(possibleResults)
    }

    const wrapElement = isInline ? 'span' : 'div'

    const $resultsWrapper = isSpecialRender ? document.createElement(wrapElement) : document.createElement('pre')
    const $results = isSpecialRender ? document.createElement(wrapElement) : document.createElement('code')

    $resultsWrapper.setAttribute('class', 'eval-results')

    const sciArgs = {
      onRenderText: (info) => {
        isSpecialRender = true;
        $results.innerText = info;
      },
      onRenderHTML: (info) => {
        isSpecialRender = true;
        $results.appendChild(sanitizer(info));
      },
      // TODO not implemented on the SCI side yet, not sure we need or not
      onRenderUnsafeHTML: (info) => {
        isSpecialRender = true;
        $results.innerHTML = info;
      },
      onRenderCode: (info) => {
        isSpecialRender = true;
        $results.innerText = "=> " + sci.ppStr(info)
      },
      onRenderReagent: (reagentComponent) => {
        isSpecialRender = true;
        setTimeout(() => {
          sci.renderReagent(reagentComponent, $results)
        }, 10)
      }
    };

    try {
      output = sci.eval(sciCtx, codeToEval, sciArgs);
    } catch (err) {
      console.error(err);
      console.trace();
      if (settings.fullErrors) {
        output = sci.ppStr(err);
      } else {
        output = err.message;
      }
      isError = true;
    }

    if (isInline) {
      codeElement.innerText = output;
      codeElement.style.color = 'inherit';
      codeElement.style.backgroundColor = 'inherit';
      codeElement.style.fontSize = 'inherit';
    } else {
      if (isError) {
        $resultsWrapper.style.backgroundColor = 'red';
        $resultsWrapper.style.color = 'white';
      }

      if (isError) {
        $results.style.backgroundColor = 'red';
        $results.style.color = 'white';
      }

      if (isError) {
        $results.innerText = "ERROR: " + output
      } else {
        if (!isSpecialRender) {
          $results.innerText = "=> " + sci.ppStr(output)
        }
      }

      $resultsWrapper.appendChild($results)
      parentElement.appendChild($resultsWrapper)
    }
  }
}
