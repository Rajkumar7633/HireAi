"use client";

import React, { useState, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, CheckCircle, XCircle, Terminal, Code, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  description?: string;
  isHidden?: boolean;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
  testCases?: TestCase[];
  onRunCode?: (code: string, input: string) => Promise<{ output: string; error?: string; executionTime?: number }>;
  readOnly?: boolean;
  showTestCases?: boolean;
  theme?: "vs-dark" | "vs-light";
}

const SUPPORTED_LANGUAGES = [
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "python", label: "Python", monaco: "python" },
  { value: "java", label: "Java", monaco: "java" },
  { value: "cpp", label: "C++", monaco: "cpp" },
  { value: "typescript", label: "TypeScript", monaco: "typescript" },
];

const DEFAULT_TEMPLATES = {
  javascript: `// Write your solution here
function solution(input) {
    // Your code here
    return input;
}

// Example usage:
// const result = solution("test input");
// console.log(result);`,
  
  python: `# Write your solution here
def solution(input_data):
    # Your code here
    return input_data

# Example usage:
# result = solution("test input")
# print(result)`,
  
  java: `// Write your solution here
public class Solution {
    public static String solution(String input) {
        // Your code here
        return input;
    }
    
    public static void main(String[] args) {
        // Example usage:
        String result = solution("test input");
        System.out.println(result);
    }
}`,
  
  cpp: `// Write your solution here
#include <iostream>
#include <string>
using namespace std;

string solution(string input) {
    // Your code here
    return input;
}

int main() {
    // Example usage:
    string result = solution("test input");
    cout << result << endl;
    return 0;
}`,
  
  typescript: `// Write your solution here
function solution(input: string): string {
    // Your code here
    return input;
}

// Example usage:
// const result = solution("test input");
// console.log(result);`
};

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "400px",
  testCases = [],
  onRunCode,
  readOnly = false,
  showTestCases = true,
  theme = "vs-dark"
}: CodeEditorProps) {
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<Array<{
    testCaseId: string;
    passed: boolean;
    output: string;
    expectedOutput: string;
    error?: string;
    executionTime?: number;
  }>>([]);
  const [customInput, setCustomInput] = useState("");
  const [customOutput, setCustomOutput] = useState("");
  const [customError, setCustomError] = useState("");
  const [activeTab, setActiveTab] = useState("code");
  const editorRef = useRef<any>(null);

  const { toast } = useToast();

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineNumbers: "on",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
      suggestSelection: "first",
      quickSuggestions: true,
      parameterHints: { enabled: true },
      folding: true,
      lineNumbersMinChars: 3,
      showFoldingControls: "always",
    });
  }, []);

  const handleLanguageChange = (newLanguage: string) => {
    setCurrentLanguage(newLanguage);
    
    // Apply template if editor is empty
    if (!value.trim() || value === DEFAULT_TEMPLATES[language as keyof typeof DEFAULT_TEMPLATES]) {
      const template = DEFAULT_TEMPLATES[newLanguage as keyof typeof DEFAULT_TEMPLATES];
      if (template) {
        onChange(template);
      }
    }
  };

  const runCode = useCallback(async (input: string) => {
    if (!onRunCode) {
      toast({
        title: "Code execution not available",
        description: "Please implement the onRunCode function to enable code execution.",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const result = await onRunCode(value, input);
      return result;
    } catch (error) {
      return {
        output: "",
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    } finally {
      setIsRunning(false);
    }
  }, [value, onRunCode, toast]);

  const runTestCases = useCallback(async () => {
    if (!onRunCode) return;

    setIsRunning(true);
    const results = [];

    for (const testCase of testCases) {
      try {
        const result = await onRunCode(value, testCase.input);
        results.push({
          testCaseId: testCase.id,
          passed: !result.error && result.output.trim() === testCase.expectedOutput.trim(),
          output: result.output || "",
          expectedOutput: testCase.expectedOutput,
          error: result.error,
          executionTime: result.executionTime,
        });
      } catch (error) {
        results.push({
          testCaseId: testCase.id,
          passed: false,
          output: "",
          expectedOutput: testCase.expectedOutput,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setTestResults(results);
    setIsRunning(false);

    const passedCount = results.filter(r => r.passed).length;
    toast({
      title: "Test Results",
      description: `${passedCount}/${results.length} test cases passed`,
      variant: passedCount === results.length ? "default" : "destructive",
    });
  }, [value, testCases, onRunCode, toast]);

  const runCustomInput = useCallback(async () => {
    const result = await runCode(customInput);
    if (result) {
      setCustomOutput(result.output);
      setCustomError(result.error || "");
    }
  }, [customInput, runCode]);

  const formatCode = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  }, []);

  const getMonacoLanguage = () => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.value === currentLanguage);
    return lang?.monaco || "javascript";
  };

  return (
    <div className="space-y-4">
      {/* Header with language selector and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4" />
          <Select value={currentLanguage} onValueChange={handleLanguageChange} disabled={readOnly}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={formatCode}
            disabled={readOnly}
          >
            <Settings className="h-4 w-4 mr-1" />
            Format
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="code">Code</TabsTrigger>
          {showTestCases && <TabsTrigger value="testcases">Test Cases</TabsTrigger>}
          <TabsTrigger value="run">Run & Test</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Editor
                height={height}
                language={getMonacoLanguage()}
                value={value}
                onChange={(val) => onChange(val || "")}
                theme={theme}
                onMount={handleEditorDidMount}
                options={{
                  readOnly,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                  automaticLayout: true,
                  suggestSelection: "first",
                  quickSuggestions: !readOnly,
                  parameterHints: { enabled: !readOnly },
                  folding: true,
                  lineNumbersMinChars: 3,
                  showFoldingControls: "always",
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {showTestCases && (
          <TabsContent value="testcases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Cases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {testCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No test cases provided
                  </div>
                ) : (
                  testCases.map((testCase, index) => {
                    const result = testResults.find(r => r.testCaseId === testCase.id);
                    return (
                      <div key={testCase.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            Test Case {index + 1}
                            {testCase.isHidden && (
                              <Badge variant="secondary" className="ml-2">Hidden</Badge>
                            )}
                          </h4>
                          {result && (
                            <Badge variant={result.passed ? "default" : "destructive"}>
                              {result.passed ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {result.passed ? "Passed" : "Failed"}
                            </Badge>
                          )}
                        </div>
                        
                        {testCase.description && (
                          <p className="text-sm text-muted-foreground">{testCase.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Input:</label>
                            <pre className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                              {testCase.input}
                            </pre>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Expected Output:</label>
                            <pre className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                              {testCase.expectedOutput}
                            </pre>
                          </div>
                        </div>
                        
                        {result && (
                          <div className="border-t pt-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Your Output:</label>
                                <pre className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                                  {result.output}
                                </pre>
                              </div>
                              {result.error && (
                                <div>
                                  <label className="text-sm font-medium text-red-600">Error:</label>
                                  <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm font-mono text-red-600">
                                    {result.error}
                                  </pre>
                                </div>
                              )}
                            </div>
                            {result.executionTime && (
                              <div className="text-sm text-muted-foreground">
                                Execution time: {result.executionTime}ms
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="run" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Custom Input */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Custom Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter custom input here..."
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  rows={6}
                  className="font-mono"
                />
                <Button onClick={runCustomInput} disabled={isRunning || !onRunCode}>
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Code
                </Button>
                
                {(customOutput || customError) && (
                  <div className="space-y-2">
                    {customOutput && (
                      <div>
                        <label className="text-sm font-medium">Output:</label>
                        <pre className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                          {customOutput}
                        </pre>
                      </div>
                    )}
                    {customError && (
                      <div>
                        <label className="text-sm font-medium text-red-600">Error:</label>
                        <pre className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm font-mono text-red-600">
                          {customError}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Cases Runner */}
            {showTestCases && testCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Run All Tests
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={runTestCases} disabled={isRunning || !onRunCode} className="w-full">
                    {isRunning ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Run All Test Cases
                  </Button>
                  
                  {testResults.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Results: {testResults.filter(r => r.passed).length}/{testResults.length} passed
                      </div>
                      {testResults.map((result) => (
                        <div key={result.testCaseId} className="flex items-center gap-2 p-2 border rounded">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            Test {testCases.findIndex(tc => tc.id === result.testCaseId) + 1}
                          </span>
                          {result.executionTime && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {result.executionTime}ms
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
