"use client";

import { acquireCollab, releaseCollab } from "@/lib/collab-store";

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
// @ts-ignore - type defs for y-monaco are sparse
import { MonacoBinding } from "y-monaco";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Play } from "lucide-react";

const LANGUAGE_PRESETS: Record<string, { id: number; starter: string; monaco: string }> = {
  javascript: { id: 63, monaco: "javascript", starter: "" },
  python: { id: 71, monaco: "python", starter: "" },
  cpp: { id: 54, monaco: "cpp", starter: "" },
  c: { id: 50, monaco: "c", starter: "" },
  java: { id: 62, monaco: "java", starter: "" },
};

const darkBtn = "bg-gray-700 border-gray-500 text-white hover:bg-gray-600 hover:text-white";

function runJavaScriptLocally(code: string, stdin: string): string {
  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    error: (...args: unknown[]) => logs.push(`Error: ${args.map(String).join(" ")}`),
    warn: (...args: unknown[]) => logs.push(`Warn: ${args.map(String).join(" ")}`),
  };
  try {
    const stdinLines = stdin ? stdin.split("\n") : [];
    const fn = new Function("console", "stdin", code);
    fn(mockConsole, stdinLines);
    if (logs.length === 0) return "Ran successfully (no output)";
    return logs.join("\n");
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export type CollabCodePanelProps = {
  roomId: string;
  interviewId: string;
  isHost?: boolean;
};

export function CollabCodePanel({ roomId, interviewId, isHost = false }: CollabCodePanelProps) {
  const [language, setLanguage] = useState<keyof typeof LANGUAGE_PRESETS>("javascript");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [promptText, setPromptText] = useState("");
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const editorWrapRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(280);
  const [locked, setLocked] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [missingKeyHint, setMissingKeyHint] = useState<string | null>(null);
  const promptDebounceRef = useRef<number | null>(null);

  const { doc, provider, yText, yPrompt, yMeta } = useMemo(() => {
    const roomKey = `code-${roomId}-${interviewId}`;
    return acquireCollab(roomKey);
  }, [roomId, interviewId]);

  useEffect(() => {
    const syncPrompt = () => setPromptText(yPrompt.toString());
    syncPrompt();
    yPrompt.observe(syncPrompt);
    return () => {
      try {
        yPrompt.unobserve(syncPrompt);
      } catch {}
    };
  }, [yPrompt]);

  useEffect(() => {
    const metaObserver = () => {
      const mLocked = !!yMeta.get("locked");
      setLocked(mLocked);
      if (editorRef.current?.updateOptions) {
        editorRef.current.updateOptions({ readOnly: !isHost && mLocked });
      }
    };
    metaObserver();
    yMeta.observe(metaObserver);

    return () => {
      try {
        yMeta.unobserve(metaObserver);
      } catch {}
      try {
        releaseCollab(`code-${roomId}-${interviewId}`);
      } catch {}
    };
  }, [doc, provider, yMeta, roomId, interviewId, isHost]);

  useEffect(() => {
    const el = editorWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const h = el.clientHeight;
      if (h > 120) setEditorHeight(h);
    });
    ro.observe(el);
    setEditorHeight(el.clientHeight || 280);
    return () => ro.disconnect();
  }, [showPrompt]);

  const handleMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Leave editor and problem empty — host writes the question when ready
    const model = editor.getModel();
    if (model) {
      const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
      (editor as any)._yBinding = binding;
    }
    if (!isHost && locked && editor.updateOptions) {
      editor.updateOptions({ readOnly: true });
    }
  };

  const beforeMount = (monaco: any) => {
    try {
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        onlyVisible: true,
      });
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
        onlyVisible: true,
      });
    } catch {}
  };

  const onChangeLanguage = (value: string) => {
    const langKey = value as keyof typeof LANGUAGE_PRESETS;
    setLanguage(langKey);
    const monacoLang = LANGUAGE_PRESETS[langKey].monaco;
    if (editorRef.current) {
      const m = editorRef.current.getModel();
      if (m && monacoRef.current?.editor?.setModelLanguage) {
        monacoRef.current.editor.setModelLanguage(m, monacoLang);
      }
    }
  };

  const onPromptChange = (val: string) => {
    setPromptText(val);
    if (!isHost) return;
    if (promptDebounceRef.current) cancelAnimationFrame(promptDebounceRef.current);
    promptDebounceRef.current = requestAnimationFrame(() => {
      yPrompt.delete(0, yPrompt.length);
      yPrompt.insert(0, val);
    });
  };

  const runCode = async () => {
    try {
      setRunning(true);
      setOutput("");
      setMissingKeyHint(null);
      const code = yText.toString();
      const lang = LANGUAGE_PRESETS[language];

      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId: lang.id, language, code, stdin }),
      });
      const text = await res.text();

      if (!res.ok) {
        if (language === "javascript") {
          const local = runJavaScriptLocally(code, stdin);
          setOutput(`${local}\n\n(Used local JS runner — remote executor unavailable)`);
          return;
        }
        setOutput(`Error: ${text}`);
        if (text.includes("JUDGE0_KEY missing")) {
          setMissingKeyHint("Set JUDGE0_URL and JUDGE0_KEY in .env.local for Python/C++/Java, or use JavaScript for local run.");
        }
        return;
      }

      setOutput(text || "Ran successfully (no output)");
    } catch (e: unknown) {
      const code = yText.toString();
      if (language === "javascript") {
        setOutput(runJavaScriptLocally(code, stdin));
      } else {
        setOutput(`Run failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2 min-h-0">
      <div className="shrink-0 flex flex-wrap items-center gap-2">
        <Select value={language} onValueChange={onChangeLanguage}>
          <SelectTrigger className="w-36 bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-gray-900 border-gray-700 text-white">
            {Object.keys(LANGUAGE_PRESETS).map((k) => (
              <SelectItem key={k} value={k} className="focus:bg-gray-800 focus:text-white">
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={runCode}
          disabled={running}
          className="bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run
            </>
          )}
        </Button>
        <Button variant="outline" className={darkBtn} onClick={() => setShowPrompt((s) => !s)}>
          {showPrompt ? "Hide prompt" : "Show prompt"}
        </Button>
        {isHost && (
          <>
            <Button
              variant="outline"
              className={locked ? "bg-red-600 border-red-500 text-white hover:bg-red-500" : darkBtn}
              onClick={() => {
                const next = !locked;
                setLocked(next);
                yMeta.set("locked", next);
                if (editorRef.current?.updateOptions) {
                  editorRef.current.updateOptions({ readOnly: next });
                }
              }}
              title="Lock editing for candidates"
            >
              {locked ? "Unlock edit" : "Lock edit"}
            </Button>
            <Button
              variant="outline"
              className={darkBtn}
              onClick={() => {
                yPrompt.delete(0, yPrompt.length);
                setPromptText("");
              }}
              title="Remove the current question"
            >
              Clear question
            </Button>
            <Button
              variant="outline"
              className={darkBtn}
              onClick={() => {
                yText.delete(0, yText.length);
              }}
              title="Clear the code editor"
            >
              Clear code
            </Button>
          </>
        )}
      </div>

      {showPrompt && (
        <Card className="shrink-0 bg-gray-900/80 border-gray-700">
          <CardContent className="p-2 space-y-1">
            <div className="text-xs text-gray-400 font-medium">
              {isHost ? "Your question (visible to candidate)" : "Problem"}
            </div>
            <Textarea
              rows={4}
              value={promptText}
              onChange={(e) => onPromptChange(e.target.value)}
              disabled={!isHost}
              className="bg-gray-800 border-gray-600 text-white text-sm resize-y min-h-[80px] focus-visible:ring-violet-500"
              placeholder={
                isHost
                  ? "Type your coding question here… (Markdown supported). Nothing is pre-filled — write what you want the candidate to solve."
                  : "Waiting for the host to share the question…"
              }
            />
          </CardContent>
        </Card>
      )}

      <div
        ref={editorWrapRef}
        className="flex-1 min-h-[200px] border border-gray-700/80 rounded-lg overflow-hidden bg-[#1e1e1e]"
      >
        <Editor
          height={editorHeight}
          defaultLanguage={LANGUAGE_PRESETS[language].monaco}
          theme="vs-dark"
          onMount={handleMount}
          beforeMount={beforeMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            readOnly: !isHost && locked,
            smoothScrolling: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: "on",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      <div className="shrink-0 grid grid-cols-1 md:grid-cols-2 gap-2 min-h-[100px] max-h-[140px]">
        <Card className="bg-gray-900/80 border-gray-700 min-h-0">
          <CardContent className="p-2 h-full">
            <div className="text-xs text-gray-400 mb-1 font-medium">stdin</div>
            <Textarea
              rows={4}
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white text-sm h-[calc(100%-20px)] min-h-[72px] resize-none"
            />
          </CardContent>
        </Card>
        <Card className="bg-gray-900/80 border-gray-700 min-h-0">
          <CardContent className="p-2 h-full">
            <div className="text-xs text-gray-400 mb-1 font-medium">Output</div>
            <pre
              className="text-sm whitespace-pre-wrap text-emerald-300 font-mono h-[calc(100%-20px)] min-h-[72px] overflow-auto bg-gray-800/50 rounded p-2 border border-gray-700/50"
            >
              {output || "Run code to see output…"}
            </pre>
            {missingKeyHint && (
              <div className="mt-1 text-xs text-amber-300">{missingKeyHint}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
