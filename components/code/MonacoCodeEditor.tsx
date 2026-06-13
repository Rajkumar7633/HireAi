"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Editor, { loader, type OnMount } from "@monaco-editor/react"
import type { editor } from "monaco-editor"

let monacoSetup: Promise<void> | null = null

function ensureMonacoLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (!monacoSetup) {
    monacoSetup = import("monaco-editor").then((monaco) => {
      loader.config({ monaco })
    })
  }
  return monacoSetup
}

export type MonacoCodeEditorProps = {
  value: string
  onChange: (value: string) => void
  language: string
  theme?: "vs-dark" | "vs-light"
  fontSize?: number
  readOnly?: boolean
  onMount?: OnMount
  className?: string
}

export function MonacoCodeEditor({
  value,
  onChange,
  language,
  theme = "vs-dark",
  fontSize = 14,
  readOnly = false,
  onMount,
  className = "",
}: MonacoCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [height, setHeight] = useState(420)
  const [ready, setReady] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled && !ready) setUseFallback(true)
    }, 12_000)

    ensureMonacoLoaded()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true)
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [ready])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setHeight(Math.max(280, Math.floor(el.getBoundingClientRect().height)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener("resize", update)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [ready, useFallback])

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize })
  }, [fontSize])

  useEffect(() => {
    const model = editorRef.current?.getModel()
    if (model && model.getLanguageId() !== language) {
      import("monaco-editor").then((monaco) => {
        monaco.editor.setModelLanguage(model, language)
      })
    }
  }, [language])

  const handleMount: OnMount = useCallback((ed, monaco) => {
    editorRef.current = ed
    ed.updateOptions({
      fontSize,
      minimap: { enabled: false },
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 2,
      insertSpaces: true,
      automaticLayout: true,
      folding: true,
      bracketPairColorization: { enabled: true },
      quickSuggestions: { other: true, comments: false, strings: false },
      parameterHints: { enabled: true },
      renderWhitespace: "selection",
      padding: { top: 12, bottom: 12 },
      fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
      fontLigatures: true,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      renderLineHighlight: "all",
      suggest: { preview: true, showKeywords: true },
    })
    onMount?.(ed, monaco)
  }, [fontSize, onMount])

  if (useFallback) {
    return (
      <div ref={containerRef} className={`h-full w-full min-h-[280px] ${className}`}>
        <textarea
          className="w-full h-full min-h-[280px] bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm leading-relaxed p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 border-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          readOnly={readOnly}
          placeholder="// Write your solution here…"
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className={`h-full w-full min-h-[280px] ${className}`}>
      {ready ? (
        <Editor
          height={height}
          language={language}
          value={value}
          theme={theme}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
          loading={
            <div className="h-full min-h-[280px] bg-[#1e1e1e] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-[#8b949e] text-sm">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                Loading editor…
              </div>
            </div>
          }
          options={{ readOnly, automaticLayout: true }}
        />
      ) : (
        <div className="h-full min-h-[280px] bg-[#1e1e1e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-[#8b949e] text-sm">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Preparing code editor…
          </div>
        </div>
      )}
    </div>
  )
}
