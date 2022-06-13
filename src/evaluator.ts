import sci from '../lib/sci.js'

export function initialize(global_object) {
  return sci.init(global_object)
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
