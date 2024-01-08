import { MarkdownSectionInformation, MarkdownView, TFile, getLinkpath, parseFrontMatterStringArray, parseYaml, sanitizeHTMLToDom } from 'obsidian';
import sci from '../lib/sci.js'
import { IntervalsManager } from './intervals.js';
import ObsidianClojure from './main.js';
import CryptoJS from 'crypto-js';

interface EvalCallbacks {
  onRenderText: (info: any) => void
  onRenderHTML: (info: any) => void
  onRenderUnsafeHTML: (info: any) => void
  onRenderCode: (info: any) => void
  onRenderReagent: (reagentComponent: any) => void
  onSetInterval: (handler: TimerHandler, intervalMs: number) => void
}

function initialize(global_object: any) {
  return sci.init(global_object)
}

// Receives a string with HTML, and returns a sanitized HTMLElement
function defaultSanitize(str: string) {
  const sanitizer = new Sanitizer();
  return sanitizer.sanitizeFor('div', str);
}

function sha256(message: string): string {
  return CryptoJS.SHA256(message).toString()
}

function extractCodeBlocks(lang: string, markdown: string): CodeBlock[] {
  const lines = markdown.split('\n');
  const codeBlocks: CodeBlock[] = []
  let isInCodeBlock = false
  let currentBlock = ''
  let blockStartLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(`^\`\`\`${lang}(\\s|$)`)) {
      isInCodeBlock = true;
      blockStartLine = i;
      currentBlock = '';
    } else if (line.match(/^```(\s|$)/) && isInCodeBlock) {
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
      while ((inlineMatch = inlineRegex.exec(line)) !== null) {
        codeBlocks.push({
          source: inlineMatch[1].trim(),
          lineStart: i,
          lineEnd: i,
          isInline: true
        })
      }
    }
  }

  return codeBlocks;
}

export class ClojureEvaluator {

  private plugin: ObsidianClojure
  private sciContext: any
  private openMarkdownFilePaths: string[] = []
  private documentEvaluatedListener: (documentEvaluation: DocumentEvaluation) => void | null = null
  private documentEvaluations: { [sourcePath: string]: Promise<DocumentEvaluation> } = {}
  private dependencies: { [path: string]: string[] } = {}
  private opts = { sanitizer: sanitizeHTMLToDom }

  private evaluationQueue: { path: string, force: boolean, promise: Promise<[DocumentEvaluation, cached: boolean]> }[] = []

  constructor(plugin: ObsidianClojure) {
    this.plugin = plugin

    const bindings = {
      'get-file': (path: string) => plugin.vaultWrapper.getFile(path),
      'read-file': (file: TFile) => plugin.app.vault.read(file),
      'read': (path: string) => plugin.app.vault.read(plugin.vaultWrapper.getFile(path))
    }
    this.sciContext = sci.init(window, bindings)

    plugin.registerEvent(
      plugin.app.workspace.on('layout-change', () => {
        const markdownLeaves = plugin.app.workspace.getLeavesOfType('markdown')
        const openMarkdownFilePaths = markdownLeaves.map(leaf => (leaf.view as MarkdownView).file.path)
        const recentlyClosedMarkdownFilePaths = this.openMarkdownFilePaths.filter(path => !openMarkdownFilePaths.includes(path))
        for (const path of recentlyClosedMarkdownFilePaths) {
          // TODO This also gets triggered if a file is moved rather than closed which is not ideal
          this.onFileClose(path)
        }
        this.openMarkdownFilePaths = openMarkdownFilePaths
      })
    )
  }

  public setDocumentEvaluatedListener(listener: (documentEvaluation: DocumentEvaluation) => void) {
    this.documentEvaluatedListener = listener
  }

  public evaluate(path: string, force: boolean): Promise<[DocumentEvaluation, cached: boolean]> {
    const queuedEvaluation = this.evaluationQueue.find(e => e.path === path && e.force === force)
    if (queuedEvaluation != null) return queuedEvaluation.promise

    let promise: Promise<[DocumentEvaluation, cached: boolean]>
    promise = new Promise(async (resolve, _) => {
      const originFile = this.plugin.vaultWrapper.getFile(path)
      const executionList = await this.getOrderedExecutionList(originFile)
      this.dependencies[path] = executionList.map(file => file.path)
      this.dependencies[path].remove(originFile.path)

      for (const file of executionList) {
        if (originFile !== file) {
          await this.maybeEvaluateFile(file, false)
        }
      }

      resolve(await this.maybeEvaluateFile(originFile, force))
    })
    
    const queueObject = { path, force, promise }

    this.evaluationQueue.push(queueObject)
    promise.then((_) => this.evaluationQueue.remove(queueObject))

    return promise
  }

  public evaluateSource(source: string, callbacks: EvalCallbacks, current: Record<string, Literal>) {
    let output: string = ''
    let isError: boolean = false

    try {
      output = sci.eval(this.sciContext, source, callbacks, current)
    } catch (err) {
      console.error(err)
      console.trace()
      if (this.plugin.settings.fullErrors) {
        output = sci.ppStr(err)
      } else {
        output = err.message
      }
      isError = true
    }

    return {
      output: output,
      isError: isError
    }
  }

  public getDependents(path: string): string[] {
    const dependents = []
    for (const [dependent, dependencies] of Object.entries(this.dependencies)) {
      if (dependencies.contains(path)) {
        dependents.push(dependent)
      }
    }
    return dependents
  }

  public async clear() {
    for (const documentEvaluation of Object.values(this.documentEvaluations)) {
      (await documentEvaluation).detach()
    }
    this.documentEvaluations = {}

    for (const o of this.evaluationQueue) {
      (await o.promise)[0].detach()
    }
    this.evaluationQueue = []

    this.dependencies = {}
  }

  private async maybeEvaluateFile(file: TFile, force: boolean): Promise<[DocumentEvaluation, cached: boolean]> {
    const path = file.path
    console.log(`${path}: Evaluation request received.`)
    const markdown = await file.vault.cachedRead(file)
    const hash = sha256(markdown)

    let evaluate = false
    const promise = this.documentEvaluations[file.path]
    if (promise == null) {
      console.log(`${path}: No cached evaluation found.`)
      evaluate = true
    } else {
      const documentEvaluation = await promise
      if (documentEvaluation.hash === hash) {
        if (force) console.log(`${path}: Cache is up to date, but evaluation is forced.`)
        else console.log(`${path}: Cache is up to date.`)
      } else {
        console.log(`${path}: Cache is outdated.`)
      }

      evaluate = force || documentEvaluation.hash !== hash
        // TODO If a code block is completely deleted the post-processing callback isn't triggered and we don't get an
        //   opportunity to detach.
      if (evaluate) documentEvaluation?.detach()
    }

    if (evaluate) {
      console.log(`${path}: Queueing evaluation.`)
      this.documentEvaluations[path] = this.evaluateFile(path, hash, markdown)
    }

    return [await this.documentEvaluations[path], !evaluate]
  }

  private async evaluateFile(path: string, hash: string, markdown: string) {
    const label = `${path}: Evaluated in`
    console.time(label)

    const lang = this.plugin.settings.blockLanguage.toString()
    const codeBlocks = extractCodeBlocks(lang, markdown)
    const evaluations: CodeBlockEvaluation[] = []
    for (const codeBlock of codeBlocks) {
      const evaluation = new CodeBlockEvaluation(this.plugin, codeBlock, this.opts, path)
      evaluations.push(evaluation)
    }

    const documentEvaluation = new DocumentEvaluation(path, hash, evaluations)

    console.timeEnd(label)

    if (this.documentEvaluatedListener != null) {
      this.documentEvaluatedListener(documentEvaluation)
    }

    return documentEvaluation
  }

  private getDependenciesFromMarkdown(markdown: string): TFile[] {
    let dependencies: string[] = []
    const match = markdown.match(/^---\s*\n(.+?)\n---\s*\n/s)
    if (match != null) {
      const yamlStr = match[1]
      const yaml = parseYaml(yamlStr)
      if (yaml.require != null) {
        if (Array.isArray(yaml.require)) {
          dependencies = yaml.require
        } else if (typeof yaml.require === 'string') {
          dependencies.push(yaml.require)
        }
      }
    }
    return dependencies
      .map(dependency => dependency.match(/^\[\[.+\]\]$/) ? dependency.slice(2, -2) : dependency)
      .map(dependency => this.plugin.app.metadataCache.getFirstLinkpathDest(dependency, ''))
  }

  private async getDependenciesFromFile(file: TFile): Promise<TFile[]> {
    const markdown = await file.vault.cachedRead(file)
    return this.getDependenciesFromMarkdown(markdown)
  }

  /**
   * Will throw an error if there are circular dependencies.
   * @param file The file to recursively get dependent files for.
   * @returns An ordered list of files, including the file parameter and all its dependencies.
   */
  private async getOrderedExecutionList(file: TFile): Promise<TFile[]> {
    const visited: TFile[] = []
    const graph: TFile[][] = []
    const visitQueue = [file]
    while (visitQueue.length > 0) {
      const nextFile = visitQueue.pop()
      visited.push(nextFile)
      const nextDeps = await this.getDependenciesFromFile(nextFile)
      nextDeps.forEach((dep) => {
        graph.push([dep, nextFile])
        if (!visited.includes(dep)) {
          visitQueue.push(dep)
        }
      })
    }
    if (graph.length == 0) {
      return [file]
    } else {
      return toposort(graph)
    }
  }

  private async onFileClose(path: string) {
    (await this.documentEvaluations[path])?.detach()
  }
}

interface CodeBlock {
  source: string
  lineStart: number
  lineEnd: number
  isInline: boolean
}

export class CodeBlockEvaluation {
  public codeBlock: CodeBlock
  public output?: string
  public isError?: boolean
  public renderFunction?: (resultsCodeEl: HTMLElement) => void
  public sectionIndex: number = 0

  private el?: HTMLElement
  private plugin: ObsidianClojure
  private _intervalsManager?: IntervalsManager

  constructor(plugin: ObsidianClojure, codeBlock: CodeBlock, opts: any, path: string) {
    this.plugin = plugin
    this.codeBlock = codeBlock
    this.eval(opts, path)
  }

  public attach(el: HTMLElement) {
    // TODO What if this.el === el ? Can we optimize?
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

  private eval(opts: any, path: string) {
    const sanitizer = opts?.sanitizer || defaultSanitize

    const callbacks: EvalCallbacks = {
      onRenderText: (info: any) => {
        this.setRenderFunction((r) => r.innerText = info)
      },
      onRenderMarkdown: (info: any) => {
        this.setRenderFunction((r) => {
          // TODO Use the view component instead of the plugin?
          MarkdownRenderer.renderMarkdown(info, r, path, this.plugin)
        })
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
      onSetInterval: (handler: TimerHandler, intervalMs: number) => {
        this.intervalsManager().setInterval(handler, intervalMs)
      },
      onChart: (data: any) => {
        if ('renderChart' in window) {
          this.setRenderFunction(r => (window as any).renderChart(data, r))
        } else {
          this.output = 'The Obsidian Charts plugin must be installed to use the chart function.'
          this.isError = true
          this.render()
        }
      }
    }

    const result = this.plugin.evaluator.evaluateSource(this.codeBlock.source, callbacks, getAPI().page(path))

    this.output = result.output
    this.isError = result.isError
  }

  private setRenderFunction(func: (resultsCodeEl: HTMLElement) => void) {
    this.renderFunction = func
    this.render()
  }

  private render() {
    const el = this.el
    if (el == null) return

    if (this.codeBlock.isInline) {
      this.plugin.elements.renderInlineCode(this.el, this)
    } else {
      this.plugin.elements.renderCode(this.el, this)
    }
  }
}

export class DocumentEvaluation {
  public path: string
  /** From the last time the document was evaluated. */
  public hash: string
  public codeBlockEvaluations: CodeBlockEvaluation[]

  constructor(path: string, hash: string, codeBlockEvaluations: CodeBlockEvaluation[]) {
    this.path = path
    this.hash = hash
    this.codeBlockEvaluations = codeBlockEvaluations
  }

  public attach(el: HTMLElement, sectionInfo: MarkdownSectionInformation) {
    let sectionCodeIndex = 0
    let attached = false
    for (const codeBlockEvaluation of this.codeBlockEvaluations) {
      const codeBlock = codeBlockEvaluation.codeBlock
      if (!codeBlock.isInline) {
        if (codeBlock.lineStart == sectionInfo.lineStart && codeBlock.lineEnd == sectionInfo.lineEnd) {
          codeBlockEvaluation.attach(el)
          attached = true
          break
        }
      } else if (codeBlock.lineStart >= sectionInfo.lineStart && codeBlock.lineStart <= sectionInfo.lineEnd) {
        codeBlockEvaluation.sectionIndex = sectionCodeIndex
        sectionCodeIndex++
        codeBlockEvaluation.attach(el)
        attached = true
      }
    }

    if (!attached) {
      console.error(`${this.path}: Failed to find a code block to attach to element`, el, sectionInfo)
    }
  }

  public detach() {
    for (const evaluation of this.codeBlockEvaluations) {
      evaluation.detach()
    }
  }
}
