"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Loader2, Send, Bot, User, FileText, MessageCircle,
  Plus, Sparkles, ChevronDown, Copy, Check,
  Zap, Brain, Target, TrendingUp,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface Conversation {
  _id: string
  jobSeekerId: string
  type: string
  createdAt: string
  lastMessageAt: string
}

interface Message {
  _id: string
  conversationId: string
  senderId: string
  senderRole: string
  content: string
  timestamp: string
  streaming?: boolean
}

interface Resume {
  _id: string
  filename: string
  parsedText: string
}

const QUICK_PROMPTS = [
  { icon: Target, label: "Overall review", prompt: "Review my resume overall and give me actionable feedback." },
  { icon: Zap, label: "ATS tips", prompt: "How can I make my resume more ATS-friendly?" },
  { icon: Brain, label: "Skills to add", prompt: "What skills should I highlight or add for tech roles?" },
  { icon: TrendingUp, label: "Quantify impact", prompt: "Help me quantify my achievements with better metrics." },
]

// Render AI message with basic markdown-like formatting
function AiMessageContent({ content }: { content: string }) {
  if (!content) {
    return (
      <span className="flex gap-1 items-center h-4">
        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
    )
  }

  const lines = content.split("\n")
  return (
    <div className="text-sm leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        // bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
                : <span key={j}>{part}</span>
            )}
          </p>
        )
      })}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }
  return (
    <button
      onClick={copy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

export default function ResumeChatbotPage() {
  const { session, isLoading: sessionLoading } = useSession()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [loadingResumes, setLoadingResumes] = useState(true)
  const [resumeOpen, setResumeOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const currentUserId =
    (session as any)?.userId || (session as any)?.user?.id || (session as any)?.email || ""

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchResumes()
      fetchConversations()
    }
  }, [sessionLoading, session])

  useEffect(() => {
    if (selectedConversation) fetchMessages(selectedConversation._id)
  }, [selectedConversation])

  const fetchResumes = async () => {
    setLoadingResumes(true)
    try {
      const res = await fetch("/api/resume/my-resumes")
      if (res.ok) {
        const data = await res.json()
        setResumes(data)
        if (data.length > 0) setSelectedResume(data[0])
      }
    } catch {}
    finally { setLoadingResumes(false) }
  }

  const fetchConversations = async () => {
    setLoadingConversations(true)
    try {
      const res = await fetch("/api/chat")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {}
    finally { setLoadingConversations(false) }
  }

  const fetchMessages = async (id: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/chat?conversationId=${id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }
    } catch {}
    finally { setLoadingMessages(false) }
  }

  const send = async (text: string = newMessage) => {
    const msg = text.trim()
    if (!msg || !selectedResume || sending) return
    setSending(true)
    setNewMessage("")
    if (textareaRef.current) textareaRef.current.style.height = "44px"

    const now = new Date().toISOString()
    const convoId = selectedConversation?._id || `conv_${currentUserId}_${Date.now()}`
    const userMsgId = `m_user_${Date.now()}`
    const aiMsgId = `m_ai_${Date.now()}`

    setMessages((prev) => [
      ...prev,
      { _id: userMsgId, conversationId: convoId, senderId: currentUserId, senderRole: "user", content: msg, timestamp: now },
      { _id: aiMsgId, conversationId: convoId, senderId: "ai", senderRole: "assistant", content: "", timestamp: now, streaming: true },
    ])

    try {
      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageContent: msg,
          resumeText: selectedResume.parsedText || "",
          conversationId: convoId,
        }),
      })

      if (!resp.body) throw new Error("no body")
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        decoder.decode(value).split("\n\n").forEach((line) => {
          if (line.startsWith("data: ")) {
            aiContent += line.slice(6)
            setMessages((prev) =>
              prev.map((m) => m._id === aiMsgId ? { ...m, content: aiContent } : m)
            )
          }
        })
      }

      setMessages((prev) =>
        prev.map((m) => m._id === aiMsgId ? { ...m, streaming: false } : m)
      )

      if (!selectedConversation) {
        const newConv: Conversation = {
          _id: convoId,
          jobSeekerId: currentUserId,
          type: "resume_chatbot",
          createdAt: now,
          lastMessageAt: now,
        }
        setSelectedConversation(newConv)
        setConversations((prev) => [newConv, ...prev])
      } else {
        setConversations((prev) =>
          prev.map((c) => c._id === selectedConversation._id ? { ...c, lastMessageAt: now } : c)
        )
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => m._id === aiMsgId ? { ...m, content: "Sorry, I couldn't process that. Please try again.", streaming: false } : m)
      )
    } finally {
      setSending(false)
    }
  }

  const startNew = () => {
    setSelectedConversation(null)
    setMessages([])
    setNewMessage("")
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    e.target.style.height = "44px"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  if (sessionLoading || loadingResumes || loadingConversations) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
              <Bot className="h-6 w-6 text-violet-600" />
            </div>
            <Loader2 className="h-4 w-4 animate-spin text-violet-600 absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm text-gray-500">Loading Resume AI...</p>
        </div>
      </div>
    )
  }

  if (!session || session.role !== "job_seeker") {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">Access Denied</p>
          <p className="text-sm text-gray-400 mt-1">Only job seekers can use the resume chatbot.</p>
        </div>
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-violet-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Resume Found</h2>
          <p className="text-gray-500 mb-6">Upload a resume first to start chatting with your AI coach.</p>
          <Link href="/dashboard/job-seeker/upload">
            <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
              Upload Resume
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-0 h-[calc(100vh-80px)] flex flex-col">
      {/* ── Gradient header ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-5 mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Resume AI Coach</h1>
            <p className="text-white/70 text-xs">Powered by AI · Personalized to your resume</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white/80 text-xs font-medium">Online</span>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          {/* Resume picker */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Resume</span>
            </div>
            <div className="relative p-2">
              <button
                onClick={() => setResumeOpen(!resumeOpen)}
                className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-3.5 w-3.5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{selectedResume?.filename || "Select resume"}</p>
                    <p className="text-[10px] text-gray-400">{((selectedResume?.parsedText?.length || 0) / 1000).toFixed(1)}k chars</p>
                  </div>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 flex-shrink-0 transition-transform ${resumeOpen ? "rotate-180" : ""}`} />
              </button>

              {resumeOpen && (
                <div className="absolute left-2 right-2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
                  {resumes.map((r) => (
                    <button
                      key={r._id}
                      onClick={() => { setSelectedResume(r); setResumeOpen(false) }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-violet-50 transition-colors flex items-center gap-2 ${selectedResume?._id === r._id ? "text-violet-700 font-semibold" : "text-gray-700"}`}
                    >
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{r.filename}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat history */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chat History</span>
              </div>
              <button
                onClick={startNew}
                className="w-6 h-6 rounded-md bg-violet-50 hover:bg-violet-100 flex items-center justify-center transition-colors"
                title="New chat"
              >
                <Plus className="h-3.5 w-3.5 text-violet-600" />
              </button>
            </div>

            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs text-gray-400">No conversations yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Ask your first question below</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {conversations.map((conv, i) => (
                    <button
                      key={conv._id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors ${
                        selectedConversation?._id === conv._id
                          ? "bg-violet-50 border border-violet-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          selectedConversation?._id === conv._id ? "bg-violet-200" : "bg-gray-100"
                        }`}>
                          <Bot className={`h-2.5 w-2.5 ${selectedConversation?._id === conv._id ? "text-violet-700" : "text-gray-500"}`} />
                        </div>
                        <span className={`text-xs font-medium truncate ${
                          selectedConversation?._id === conv._id ? "text-violet-800" : "text-gray-700"
                        }`}>Chat #{conversations.length - i}</span>
                      </div>
                      {(conv as any).preview && (
                        <p className="text-[10px] text-gray-500 pl-7 truncate mb-0.5">{(conv as any).preview}</p>
                      )}
                      <p className="text-[10px] text-gray-400 pl-7">
                        {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Chat panel */}
        <div className="flex-1 rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-0 overflow-hidden">
          {/* Chat panel header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Resume AI Coach</p>
                <p className="text-[10px] text-gray-400">
                  Analyzing: <span className="text-violet-600 font-medium">{selectedResume?.filename}</span>
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1" />
              Ready
            </Badge>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="p-5">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                </div>
              ) : messages.length === 0 ? (
                /* Welcome state */
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-200">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-1">Hi, I'm your Resume Coach!</h2>
                  <p className="text-sm text-gray-400 mb-6 max-w-xs">
                    I've read your resume. Ask me anything — or try one of these:
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {QUICK_PROMPTS.map(({ icon: Icon, label, prompt }) => (
                      <button
                        key={label}
                        onClick={() => send(prompt)}
                        disabled={sending}
                        className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center flex-shrink-0 transition-colors">
                          <Icon className="h-3.5 w-3.5 text-violet-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-700 group-hover:text-violet-700">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((msg) => {
                    const isUser = msg.senderId === currentUserId
                    return (
                      <div key={msg._id} className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}

                        <div className={`group max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
                          {isUser ? (
                            <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 relative">
                              <AiMessageContent content={msg.content} />
                              {!msg.streaming && msg.content && (
                                <div className="absolute -bottom-2 right-2">
                                  <CopyButton text={msg.content} />
                                </div>
                              )}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-400 px-1">
                            {format(new Date(msg.timestamp), "h:mm a")}
                          </span>
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <User className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <div className={`flex items-end gap-2 rounded-xl border bg-gray-50 px-3 py-2 transition-colors ${
              sending ? "border-gray-200" : "border-gray-200 focus-within:border-violet-400 focus-within:bg-white"
            }`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={newMessage}
                onChange={autoResize}
                onKeyDown={handleKey}
                disabled={sending || !selectedResume}
                placeholder={selectedResume ? "Ask about your resume... (Enter to send, Shift+Enter for newline)" : "Select a resume first"}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none py-1 min-h-[44px] max-h-[120px]"
                style={{ height: "44px" }}
              />
              <button
                onClick={() => send()}
                disabled={!newMessage.trim() || sending || !selectedResume}
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-colors shadow-sm mb-0.5"
              >
                {sending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                  : <Send className="h-3.5 w-3.5 text-white" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              AI responses are for guidance only · Resume content stays private
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
