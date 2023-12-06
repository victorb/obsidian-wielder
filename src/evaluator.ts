import sci from '../lib/sci.js'

export function initialize(global_object) {
  return sci.init(global_object)
}

interface CodeBlock {
  source: string
  lineStart: number
  lineEnd: number
}

export interface CodeBlockEvaluation {
  codeBlock: CodeBlock
  output: string
}

export function hasCode(lang: string, container: HTMLElement): boolean {
  const codeElements = container.querySelectorAll('code')
  for (const codeElement of codeElements) {
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
          codeBlocks.push({ source: currentBlock.trim(), lineStart: blockStartLine, lineEnd: i });
      } else if (isInCodeBlock) {
          currentBlock += line + '\n';
      }
  }

  return codeBlocks;
}

export function evaluate_v2(sciCtx: any, settings: any, markdown: string): CodeBlockEvaluation[] {
  const lang = settings.blockLanguage.toString()
  const codeBlocks = extractCodeBlocks(lang, markdown)
  const evaluations: CodeBlockEvaluation[] = [];

  for (const codeBlock of codeBlocks) {
    let output: string = ''
    try {
      output = sci.eval(sciCtx, codeBlock.source, {});
    } catch (err) {
      console.error(err);
      console.trace();
      if (settings.fullErrors) {
        output = sci.ppStr(err);
      } else {
        output = err.message;
      }
    }

    evaluations.push({ codeBlock: codeBlock, output: output })
  }

  return evaluations
}

export function renderEvaluation(el: HTMLElement, output: string) {
  // Expects only one code block at a time.
  const codeElement = el.querySelector('code')
  const parentElement = codeElement.parentElement.parentElement;

  // Might have existing wrapper we need to remove first
  const possibleResults = parentElement.querySelector('.eval-results')
  if (possibleResults) {
    parentElement.removeChild(possibleResults)
  }

  const $resultsWrapper = document.createElement('pre')
  const $results = document.createElement('code')
  $resultsWrapper.setAttribute('class', 'eval-results')

  $results.innerText = "=> " + sci.ppStr(output)

  $resultsWrapper.appendChild($results)
  parentElement.appendChild($resultsWrapper)
}

// Receives a string with HTML, and returns a sanitized HTMLElement
function defaultSanitize(str) {
  const sanitizer = new Sanitizer();
  return sanitizer.sanitizeFor('div', str);
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
