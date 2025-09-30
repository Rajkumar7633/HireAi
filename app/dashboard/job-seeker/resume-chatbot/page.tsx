"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Send, Bot, User, FileText, MessageCircle, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import { format } from "date-fns"
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
}

interface Resume {
  _id: string
  filename: string
  parsedText: string
}

const quickPrompts = [
  "Review my resume overall and provide feedback",
  "How can I make my resume more ATS-friendly?",
  "What skills should I highlight for tech roles?",
  "How can I better quantify my achievements?",
  "Is my resume format professional enough?",
  "What keywords should I include for my industry?",
]

export default function ResumeChatbotPage() {
  const { session, isLoading: sessionLoading } = useSession()
  const { toast } = useToast()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [loadingResumes, setLoadingResumes] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const currentUserId =
    (session as any)?.userId ||
    (session as any)?.user?.id ||
    (session as any)?.email ||
    ""

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchResumes()
      fetchConversations()
    }
  }, [sessionLoading, session])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchResumes = async () => {
    setLoadingResumes(true)
    try {
      const response = await fetch("/api/resume/my-resumes")
      if (response.ok) {
        const data = await response.json()
        setResumes(data)
        if (data.length > 0) {
          setSelectedResume(data[0])
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch your resumes.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching resumes:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch resumes.",
        variant: "destructive",
      })
    } finally {
      setLoadingResumes(false)
    }
  }

  const fetchConversations = async () => {
    setLoadingConversations(true)
    try {
      const response = await fetch("/api/chat")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch conversations.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch conversations.",
        variant: "destructive",
      })
    } finally {
      setLoadingConversations(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch messages.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch messages.",
        variant: "destructive",
      })
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async (messageText: string = newMessage) => {
    if (!messageText.trim() || !selectedResume || sendingMessage) return

    setSendingMessage(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation?._id,
          messageContent: messageText,
          resumeText: selectedResume.parsedText,
        }),
      })

      if (response.ok) {
        setNewMessage("")
        const data = await response.json()

        // Add new messages to state
        setMessages((prev) => [...prev, data.userMessage, data.aiMessage])

        // Update selected conversation if a new one was created
        if (!selectedConversation) {
          const newConversation = {
            _id: data.conversationId,
            jobSeekerId: currentUserId,
            type: "resume_chatbot",
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
          }
          setSelectedConversation(newConversation)
          setConversations((prev) => [newConversation, ...prev])
        } else {
          // Update last message time for existing conversation
          setConversations((prev) =>
            prev.map((conv) =>
              conv._id === selectedConversation._id ? { ...conv, lastMessageAt: new Date().toISOString() } : conv,
            ),
          )
        }

        toast({
          title: "Message sent",
          description: "AI has analyzed your resume and provided feedback.",
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to send message.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to send message.",
        variant: "destructive",
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const startNewConversation = () => {
    setSelectedConversation(null)
    setMessages([])
    setNewMessage("")
  }

  const handleQuickPrompt = (prompt: string) => {
    setNewMessage(prompt)
    handleSendMessage(prompt)
  }

  // Streaming send using /api/chat/stream
  async function sendStreaming(messageText: string = newMessage) {
    if (!messageText.trim() || !selectedResume || sendingMessage) return
    setSendingMessage(true)

    // Add user message immediately
    const now = new Date().toISOString()
    const convoId = selectedConversation?._id || `conv_${Date.now()}`
    const userMsg = {
      _id: `m_user_${Date.now()}`,
      conversationId: convoId,
      senderId: currentUserId,
      senderRole: "user",
      content: messageText,
      timestamp: now,
    }
    setMessages((prev) => [...prev, userMsg])

    // Pending AI message
    const aiMsgId = `m_ai_${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        _id: aiMsgId,
        conversationId: convoId,
        senderId: "ai",
        senderRole: "assistant",
        content: "",
        timestamp: now,
      },
    ])

    try {
      const resp = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageContent: messageText,
          resumeText: selectedResume.parsedText || "",
        }),
      })
      if (!resp.body) throw new Error("No stream body")
      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let aiContent = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        chunk.split("\n\n").forEach((line) => {
          if (line.startsWith("data: ")) {
            const text = line.slice(6)
            aiContent += text
            setMessages((prev) => prev.map((m) => (m._id === aiMsgId ? { ...m, content: aiContent } : m)))
          }
        })
      }
      setNewMessage("")
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) => (m._id === aiMsgId ? { ...m, content: "Sorry, streaming failed. Please try again." } : m)),
      )
    } finally {
      setSendingMessage(false)
    }
  }

  if (sessionLoading || loadingResumes || loadingConversations) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading resume chatbot...</p>
      </div>
    )
  }

  if (!session || session.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">Only job seekers can use the resume chatbot.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (resumes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <CardTitle>No Resumes Found</CardTitle>
          <CardDescription className="mt-2">Please upload a resume first to use the resume chatbot.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/dashboard/job-seeker/upload">Upload Resume</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Bot className="h-8 w-8 text-purple-600" />
            Resume AI Assistant
          </h1>
          <p className="text-muted-foreground">Get personalized feedback and optimization tips for your resume</p>
        </div>

        {/* Resume Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Selected Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <select
                value={selectedResume?._id || ""}
                onChange={(e) => {
                  const resume = resumes.find((r) => r._id === e.target.value)
                  setSelectedResume(resume || null)
                }}
                className="flex-1 p-2 border rounded-md"
              >
                {resumes.map((resume) => (
                  <option key={resume._id} value={resume._id}>
                    {resume.filename}
                  </option>
                ))}
              </select>
              <Badge variant="secondary">{selectedResume?.parsedText?.length || 0} characters</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Conversations */}
          <div className="lg:col-span-1">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Chat History
                </CardTitle>
                <Button size="sm" onClick={startNewConversation}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-muted-foreground text-sm">No chat history yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 p-4">
                      {conversations.map((conv) => (
                        <div
                          key={conv._id}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedConversation?._id === conv._id
                              ? "bg-purple-100 border-purple-200"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => setSelectedConversation(conv)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Bot className="h-4 w-4 text-purple-600" />
                            <span className="font-medium text-sm">Resume Chat</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(conv.lastMessageAt), "MMM dd, hh:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-purple-600" />
                  Resume AI Assistant
                </CardTitle>
                <CardDescription>
                  Analyzing: <span className="font-semibold">{selectedResume?.filename}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 mb-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Bot className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-semibold mb-2">Ready to help with your resume!</h3>
                      <p className="text-muted-foreground mb-6">
                        Ask me anything about your resume or try one of these suggestions:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                        {quickPrompts.map((prompt, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPrompt(prompt)}
                            className="text-left h-auto p-3 whitespace-normal"
                            disabled={sendingMessage}
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
                          key={msg._id}
                          className={`flex gap-3 ${msg.senderId === currentUserId ? "justify-end" : "justify-start"}`}
                        >
                          {msg.senderId !== currentUserId && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-purple-100">
                                <Bot className="h-4 w-4 text-purple-600" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.senderId === currentUserId
                                ? "bg-purple-600 text-white"
                                : "bg-gray-100 text-gray-900 border"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs opacity-70 mt-1">{format(new Date(msg.timestamp), "hh:mm a")}</p>
                          </div>
                          {msg.senderId === currentUserId && (
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-purple-600">
                                <User className="h-4 w-4 text-white" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      ))}

                      {sendingMessage && (
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
                    e.preventDefault()
                    handleSendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Textarea
                    placeholder="Ask me about your resume..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage || !selectedResume}
                    className="flex-1 min-h-[60px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={sendingMessage || !selectedResume}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={sendingMessage || !selectedResume}
                    onClick={() => sendStreaming(newMessage)}
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send (stream)"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
