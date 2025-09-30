"use client";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  Bot,
  User,
  FileText,
  MessageCircle,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: string;
}

const quickPrompts = [
  "Review my resume overall and provide feedback",
  "How can I make my resume more ATS-friendly?",
  "What skills should I highlight for tech roles?",
  "How can I better quantify my achievements?",
  "Is my resume format professional enough?",
  "What keywords should I include for my industry?",
];

const mockResumeText = `John Doe
Software Engineer
Email: john.doe@email.com
Phone: (555) 123-4567

EXPERIENCE:
Software Engineer at Tech Company (2020-2023)
- Developed web applications using React and Node.js
- Worked with databases and APIs
- Collaborated with team members

EDUCATION:
Bachelor of Science in Computer Science
University of Technology (2016-2020)

SKILLS:
JavaScript, React, Node.js, Python, SQL, Git`;

export default function ResumeSimpleChatbotPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resumeText, setResumeText] = useState(mockResumeText);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (messageText: string = newMessage) => {
    if (!messageText.trim() || isLoading) return;

    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      content: messageText,
      role: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage("");

    try {
      // Call the API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageContent: messageText,
          resumeText: resumeText,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Add AI message
        const aiMessage: Message = {
          id: `msg_${Date.now()}_ai`,
          content: data.aiMessage.content,
          role: "assistant",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMessage]);

        toast({
          title: "Message sent",
          description: "AI has analyzed your resume and provided feedback.",
        });
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      console.error("Error:", error);

      // Add fallback AI message
      const fallbackMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        content:
          "I'm having trouble connecting right now, but here's some general advice: Focus on quantifying your achievements with specific numbers and metrics. Use strong action verbs to start your bullet points, and make sure your resume is tailored to the specific job you're applying for.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, fallbackMessage]);

      toast({
        title: "Connection issue",
        description: "Using offline mode. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setNewMessage(prompt);
    handleSendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Bot className="h-8 w-8 text-purple-600" />
            Resume AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Get personalized feedback and optimization tips for your resume
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Resume Input */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Resume
                </CardTitle>
                <CardDescription>
                  Paste your resume text here for analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <Textarea
                  placeholder="Paste your resume text here..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="flex-1 min-h-[400px] font-mono text-sm"
                />
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant="secondary">
                    {resumeText.length} characters
                  </Badge>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/job-seeker/upload">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload File
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                  AI Resume Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about your resume or get optimization tips
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 mb-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">
                        Ready to help with your resume!
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Ask me anything about your resume or try one of these
                        suggestions:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {quickPrompts.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrompt(prompt)}
                            className="text-left h-auto p-3 whitespace-normal"
                            disabled={isLoading}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${
                            msg.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-purple-100">
                                <Bot className="h-4 w-4 text-purple-600" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === "user"
                                ? "bg-purple-600 text-white"
                                : "bg-gray-100 text-gray-900 border"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(msg.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {msg.role === "user" && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-purple-600">
                                <User className="h-4 w-4 text-white" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-purple-100">
                              <Bot className="h-4 w-4 text-purple-600" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="bg-gray-100 border rounded-lg p-3">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Textarea
                    placeholder="Ask me about your resume..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 min-h-[60px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !newMessage.trim()}
                    className="self-end"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
