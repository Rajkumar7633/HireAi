"use client";

import { acquireCollab, releaseCollab } from "@/lib/collab-store";

import {useEffect, useMemo, useRef, useState} from "react";
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

const LANGUAGE_PRESETS: Record<string, { id: number; sample: string; monaco: string }> = {
  javascript: {
    id: 63,
    monaco: "javascript",
    sample: `// Write JavaScript here\nfunction add(a,b){return a+b}\nconsole.log(add(2,3));`,
  },
  python: { id: 71, monaco: "python", sample: `# Write Python here\nprint(2+3)` },
  cpp: {
    id: 54,
    monaco: "cpp",
    sample: `#include <bits/stdc++.h>\nusing namespace std;\nint main(){cout<<2+3<<"\n";}`,
  },
  c: { id: 50, monaco: "c", sample: `#include <stdio.h>\nint main(){printf("%d\n",2+3);}` },
  java: {
    id: 62,
    monaco: "java",
    sample: `import java.util.*;\nclass Main{public static void main(String[] args){System.out.println(2+3);}}`,
  },
};

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
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [locked, setLocked] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [missingKeyHint, setMissingKeyHint] = useState<string | null>(null);
  const promptLocalRef = useRef<string>("");
  const promptDebounceRef = useRef<number | null>(null);

  // Yjs doc+provider via shared store (prevents duplicate room error)
  const { doc, provider, yText, yPrompt, yMeta } = useMemo(() => {
    const roomKey = `code-${roomId}-${interviewId}`;
    return acquireCollab(roomKey);
  }, [roomId, interviewId]);

  useEffect(() => {
    const metaObserver = () => {
      const mLocked = !!yMeta.get("locked");
      setLocked(mLocked);
    };
    metaObserver();
    yMeta.observe(metaObserver);

    return () => {
      try { yMeta.unobserve(metaObserver) } catch {}
      try { releaseCollab(`code-${roomId}-${interviewId}`) } catch {}
    };
  }, [doc, provider, yMeta, roomId, interviewId]);

  const handleMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    // Initialize with sample if empty
    if (yText.length === 0) {
      yText.insert(0, LANGUAGE_PRESETS[language].sample);
    }
    // Initialize prompt default
    if (yPrompt.length === 0) {
      yPrompt.insert(0, "Describe the problem here (Markdown supported).\n\nExample: Implement a function add(a, b) that returns the sum.");
    }
    // Bind Yjs to Monaco
    const model = editor.getModel();
    if (model) {
      const binding = new MonacoBinding(yText, model, new Set([editor]), provider.awareness);
      // Keep binding referenced to avoid GC
      (editor as any)._yBinding = binding;
    }
    // Apply initial readOnly if locked and not host
    if (!isHost && locked && editor.updateOptions) {
      editor.updateOptions({ readOnly: true });
    }
  };

  const beforeMount = (monaco: any) => {
    // Reduce diagnostics overhead where possible
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
      // Lighter worker config
      monaco.editor.EditorOptions.stickyScroll = { default: false } as any;
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
      // If code is empty, inject preset
      if (yText.length === 0) {
        yText.insert(0, LANGUAGE_PRESETS[langKey].sample);
      }
    }
  };

  const runCode = async () => {
    try {
      setRunning(true);
      setOutput("");
      const code = yText.toString();
      const lang = LANGUAGE_PRESETS[language];
      const res = await fetch("/api/code/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageId: lang.id, language, code, stdin }),
      });
      const text = await res.text();
      if (!res.ok) {
        setOutput(`Error: ${text}`);
        if (text.includes("JUDGE0_KEY missing")) {
          setMissingKeyHint("Set JUDGE0_URL and JUDGE0_KEY in .env.local, then restart the app.");
        }
        return;
      }
      setOutput(text);
      setMissingKeyHint(null);
    } catch (e: any) {
      setOutput(`Run failed: ${e?.message || e}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select value={language} onValueChange={onChangeLanguage}>
          <SelectTrigger className="w-48 bg-gray-800 border-gray-600 text-white"><SelectValue placeholder="Language" /></SelectTrigger>
          <SelectContent>
            {Object.keys(LANGUAGE_PRESETS).map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runCode} disabled={running} className="bg-green-600 hover:bg-green-700">
          {running ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Running...</>) : (<><Play className="h-4 w-4 mr-2"/>Run</>)}
        </Button>
        <Button variant="outline" className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700" onClick={() => setShowPrompt((s)=>!s)}>
          {showPrompt ? "Hide Prompt" : "Show Prompt"}
        </Button>
        {isHost && (
          <Button
            variant={locked ? "destructive" : "outline"}
            className={locked ? "" : "bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"}
            onClick={() => {
              const next = !locked;
              setLocked(next);
              yMeta.set("locked", next);
              if (editorRef.current?.updateOptions) editorRef.current.updateOptions({ readOnly: next });
            }}
            title="Lock editing for candidates"
          >
            {locked ? "Unlock Edit" : "Lock Edit"}
          </Button>
        )}
      </div>

      {showPrompt && (
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-2 space-y-2">
            <div className="text-xs text-gray-400">Problem (host edits, all see)</div>
            <Textarea
              rows={4}
              value={(promptLocalRef.current = yPrompt.toString())}
              onChange={(e)=>{
                const val = e.target.value;
                // Debounced Yjs update to avoid heavy ops per keystroke
                if (promptDebounceRef.current) cancelAnimationFrame(promptDebounceRef.current);
                promptDebounceRef.current = requestAnimationFrame(() => {
                  yPrompt.delete(0, yPrompt.length);
                  yPrompt.insert(0, val);
                });
                promptLocalRef.current = val;
              }}
              disabled={!isHost}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Write the coding question here (Markdown supported)"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex-1 min-h-0 border border-gray-700 rounded overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={LANGUAGE_PRESETS[language].monaco}
          theme="vs-dark"
          onMount={handleMount}
          beforeMount={beforeMount}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            readOnly: !isHost && locked,
            smoothScrolling: true,
            cursorBlinking: "phase",
            renderWhitespace: "none",
            renderLineHighlight: "gutter",
            wordWrap: "on",
            dragAndDrop: false,
            occurrencesHighlight: false,
            emptySelectionClipboard: false,
            folding: false,
            codeLens: false,
            lightbulb: { enabled: false },
            quickSuggestions: { other: true, comments: false, strings: false },
            suggestOnTriggerCharacters: true,
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-2">
            <div className="text-xs text-gray-400 mb-1">stdin</div>
            <Textarea rows={5} value={stdin} onChange={(e)=>setStdin(e.target.value)} className="bg-gray-800 border-gray-700 text-white"/>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-2">
            <div className="text-xs text-gray-400 mb-1">Output</div>
            <pre className="text-sm whitespace-pre-wrap text-green-300">{output || ""}</pre>
            {missingKeyHint && (
              <div className="mt-2 text-xs text-yellow-300">{missingKeyHint}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
