import { MarkdownSectionInformation, Plugin } from 'obsidian';
import sci from '../lib/sci.js'
import { IntervalsManager } from 'intervals.js';

export function initialize(global_object) {
  return sci.init(global_object)
}

// Receives a string with HTML, and returns a sanitized HTMLElement
function defaultSanitize(str) {
  const sanitizer = new Sanitizer();
  return sanitizer.sanitizeFor('div', str);
}

interface CodeBlock {
  source: string
  lineStart: number
  lineEnd: number
  isInline: boolean
  inlineIndex?: number
}

export class CodeBlockEvaluation {
  public codeBlock: CodeBlock

  private plugin: Plugin
  private output?: string
  private isError?: boolean
  private renderFunction?: (resultsCodeEl: HTMLElement) => void
  private el?: HTMLElement
  private _intervalsManager?: IntervalsManager

  constructor(plugin: Plugin, codeBlock: CodeBlock, sciCtx: any, settings: any, opts: any) {
    this.plugin = plugin
    this.codeBlock = codeBlock
    this.eval(sciCtx, settings, opts)
  }

  public attach(el: HTMLElement) {
    this.el = el
    this.render()
  }

  public detach() {
    this.el = null
    this._intervalsManager?.killAll()
  }

  private intervalsManager(): IntervalsManager {
    if (this._intervalsManager == null) {
      this._intervalsManager = new IntervalsManager(this.plugin)
    }
    return this._intervalsManager
  }

  private eval(sciCtx: any, settings: any, opts: any) {
    let sanitizer: any = null;
    if (opts && opts.sanitizer) {
      sanitizer = opts.sanitizer
    } else {
      sanitizer = defaultSanitize;
    }

    // TODO The render functions can get called asynchronously in which case this doesn't work because we've already saved the output
    const sciArgs = {
      onRenderText: (info: any) => {
        this.setRenderFunction((r) => r.innerText = info)
      },
      onRenderHTML: (info: any) => {
        this.setRenderFunction((r) => r.appendChild(sanitizer(info)))
      },
      // TODO not implemented on the SCI side yet, not sure we need or not
      onRenderUnsafeHTML: (info: any) => {
        this.setRenderFunction((r) => r.innerHTML = info)
      },
      onRenderCode: (info: any) => {
        this.setRenderFunction((r) => r.innerText = "=> " + sci.ppStr(info))
      },
      onRenderReagent: (reagentComponent: any) => {
        this.setRenderFunction((r) => {
          setTimeout(() => {
            sci.renderReagent(reagentComponent, r)
          }, 10)
        })
      },
      onSetInterval: (func: any, intervalMs: number) => {
        this.intervalsManager().setInterval(func, intervalMs)
      }
    }

    let output: string = ''
    let isError: boolean = false

    try {
      output = sci.eval(sciCtx, this.codeBlock.source, sciArgs);
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

    this.output = output
    this.isError = isError
  }

  private setRenderFunction(func: (resultsCodeEl: HTMLElement) => void) {
    this.renderFunction = func
    this.render()
  }

  private render() {
    const el = this.el
    if (el == null) return

    if (this.codeBlock.isInline) {
      this.renderInline()
      return
    }

    const renderFunction = this.renderFunction

    // Expects only one code block at a time.
    const codeElement = el.querySelector('code')
    const parentElement = codeElement.parentElement.parentElement;

    // Might have existing wrapper we need to remove first
    const possibleResults = parentElement.querySelector('.eval-results')
    if (possibleResults) {
      parentElement.removeChild(possibleResults)
    }

    const isSpecialRender = renderFunction != null
    const $resultsWrapper = isSpecialRender ? document.createElement('div') : document.createElement('pre')
    const $results = isSpecialRender ? document.createElement('div') : document.createElement('code')
    $resultsWrapper.setAttribute('class', 'eval-results')

    if (this.isError) {
      $resultsWrapper.style.backgroundColor = 'red';
      $resultsWrapper.style.color = 'white';
      $results.style.backgroundColor = 'red';
      $results.style.color = 'white';
      $results.innerText = "ERROR: " + this.output
    } else {
      if (isSpecialRender) {
        renderFunction($results)
      } else {
        // TODO This could be a render function
        $results.innerText = "=> " + sci.ppStr(this.output)
      }
    }

    $resultsWrapper.appendChild($results)
    parentElement.appendChild($resultsWrapper)
  }

  /**
   * Does not support special render functions.
   */
  private renderInline() {
    const codeElement = this.el.querySelectorAll('code')[this.codeBlock.inlineIndex]
    codeElement.innerText = this.output
    codeElement.style.color = 'inherit'
    codeElement.style.backgroundColor = 'inherit'
    codeElement.style.fontSize = 'inherit'
  }
}

export class DocumentEvaluation {
  /** From the last time the document was evaluated. */
  public hash: string
  public codeBlockEvaluations: CodeBlockEvaluation[]

  constructor(hash: string, codeBlockEvaluations: CodeBlockEvaluation[]) {
    this.hash = hash
    this.codeBlockEvaluations = codeBlockEvaluations
  }

  public attach(el: HTMLElement, sectionInfo: MarkdownSectionInformation) {
    for (const codeBlockEvaluation of this.codeBlockEvaluations) {
      const codeBlock = codeBlockEvaluation.codeBlock
      if (!codeBlock.isInline) {
        if (codeBlock.lineStart == sectionInfo.lineStart && codeBlock.lineEnd == sectionInfo.lineEnd) {
          codeBlockEvaluation.attach(el)
          return
        }
      } else if (codeBlock.lineStart >= sectionInfo.lineStart && codeBlock.lineStart <= sectionInfo.lineEnd) {
        codeBlockEvaluation.attach(el)
      }
    }
  }

  public detach() {
    for (const evaluation of this.codeBlockEvaluations) {
      evaluation.detach()
    }
  }
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

export function evaluate(plugin: Plugin, sciCtx: any, settings: any, markdown: string, opts: any): CodeBlockEvaluation[] {
  const lang = settings.blockLanguage.toString()
  const codeBlocks = extractCodeBlocks(lang, markdown)
  const evaluations: CodeBlockEvaluation[] = [];
  for (const codeBlock of codeBlocks) {
    const evaluation = new CodeBlockEvaluation(plugin, codeBlock, sciCtx, settings, opts)
    evaluations.push(evaluation)
  }
  return evaluations
}
