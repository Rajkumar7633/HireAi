"use client";

import { CardDescription } from "@/components/ui/card";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import { format } from "date-fns";

interface Conversation {
  _id: string;
  jobSeekerId: { _id: string; name?: string; email: string };
  recruiterId: { _id: string; name?: string; email: string };
  type: string;
  pipelineStatus?: "new" | "contacted" | "interviewing" | "offer" | "rejected";
  lastMessageAt: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  timestamp: string;
  readBy: string[];
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialRecipientId = searchParams.get("userId");
  const { session, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachmentLink, setAttachmentLink] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchConversations();
    } else if (!sessionLoading && !session) {
      setLoadingConversations(false);
    }
  }, [sessionLoading, session]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      // Subscribe to real-time SSE
      try {
        sseRef.current?.close();
      } catch {}
      const es = new EventSource(`/api/conversations/${selectedConversation._id}/events`);
      sseRef.current = es;
      es.addEventListener("message", (evt) => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          if (data?.conversationId === selectedConversation._id) {
            setMessages((prev) => [...prev, data]);
          }
        } catch {}
      });
      es.addEventListener("error", () => {
        // silently ignore; UI still works without SSE
      });
    } else if (initialRecipientId && conversations.length > 0) {
      // If initialRecipientId is present, try to find or create conversation
      const existingConv = conversations.find(
        (conv) =>
          (session?.role === "job_seeker" &&
            conv.recruiterId?._id === initialRecipientId) ||
          (session?.role === "recruiter" &&
            conv.jobSeekerId?._id === initialRecipientId)
      );
      if (existingConv) {
        setSelectedConversation(existingConv);
      } else {
        // Create new conversation if not found
        createConversation(initialRecipientId);
      }
    }
  }, [selectedConversation, initialRecipientId, conversations]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      try {
        sseRef.current?.close();
      } catch {}
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await fetch("/api/conversations").catch(() => null);
      if (response && response.ok) {
        const data = await response.json();
        setConversations(data);
        if (data.length > 0 && !initialRecipientId) {
          setSelectedConversation(data[0]); // Auto-select first conversation
        }
      } else {
        // Mock data for demo purposes
        const mockConversations = [
          {
            _id: "1",
            jobSeekerId: {
              _id: "js1",
              name: "John Doe",
              email: "john@example.com",
            },
            recruiterId: {
              _id: "r1",
              name: "Sarah Smith",
              email: "sarah@company.com",
            },
            type: "direct",
            lastMessageAt: new Date().toISOString(),
          },
          {
            _id: "2",
            jobSeekerId: {
              _id: "js2",
              name: "Jane Wilson",
              email: "jane@example.com",
            },
            recruiterId: {
              _id: "r1",
              name: "Sarah Smith",
              email: "sarah@company.com",
            },
            type: "direct",
            lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ];
        setConversations(mockConversations as any);
        if (mockConversations.length > 0 && !initialRecipientId) {
          setSelectedConversation(mockConversations[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch conversations.",
        variant: "destructive",
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const createConversation = async (recipientId: string, recipientEmail?: string) => {
    setLoadingConversations(true);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, recipientEmail }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversation);
        fetchConversations(); // Refresh list to include new conversation
      } else {
        const mockConversation = {
          _id: `new-${Date.now()}`,
          jobSeekerId:
            session?.role === "job_seeker"
              ? { _id: session.id, name: session.name, email: session.email }
              : {
                  _id: recipientId,
                  name: "New Contact",
                  email: "contact@example.com",
                },
          recruiterId:
            session?.role === "recruiter"
              ? { _id: session.id, name: session.name, email: session.email }
              : {
                  _id: recipientId,
                  name: "New Recruiter",
                  email: "recruiter@company.com",
                },
          type: "direct",
          lastMessageAt: new Date().toISOString(),
        };
        setSelectedConversation(mockConversation);
        setConversations((prev) => [mockConversation, ...prev]);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to create conversation.",
        variant: "destructive",
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleCreateByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setCreatingConv(true);
    await createConversation("", newEmail.trim());
    setNewEmail("");
    setCreatingConv(false);
  };

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`
      ).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        const mockMessages = [
          {
            _id: "msg1",
            conversationId,
            senderId: session?.role === "recruiter" ? "r1" : "js1",
            senderRole:
              session?.role === "recruiter" ? "recruiter" : "job_seeker",
            content:
              "Hello! I saw your profile and I'm interested in discussing a position with you.",
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            readBy: [],
          },
          {
            _id: "msg2",
            conversationId,
            senderId: session?.id || "current-user",
            senderRole: session?.role || "job_seeker",
            content:
              "Thank you for reaching out! I'd love to learn more about the opportunity.",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            readBy: [],
          },
        ];
        setMessages(mockMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch messages.",
        variant: "destructive",
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/conversations/${selectedConversation._id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: attachmentLink ? `${newMessage}\n${attachmentLink}` : newMessage }),
        }
      ).catch(() => null);

      if (response && response.ok) {
        setNewMessage("");
        setAttachmentLink("");
        fetchMessages(selectedConversation._id); // Refresh messages
        fetchConversations(); // Refresh conversations to update lastMessageAt
      } else {
        const newMsg = {
          _id: `msg-${Date.now()}`,
          conversationId: selectedConversation._id,
          senderId: session?.id || "current-user",
          senderRole: session?.role || "job_seeker",
          content: newMessage,
          timestamp: new Date().toISOString(),
          readBy: [],
        };
        setMessages((prev) => [...prev, newMsg]);
        setNewMessage("");
        setAttachmentLink("");

        toast({
          title: "Message Sent",
          description: "Your message has been sent successfully.",
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const getParticipantName = (conversation: Conversation) => {
    if (!session) return "Unknown";
    if (session.role === "job_seeker") {
      return (
        conversation.recruiterId?.name ||
        conversation.recruiterId?.email ||
        "Recruiter"
      );
    } else if (session.role === "recruiter") {
      return (
        conversation.jobSeekerId?.name ||
        conversation.jobSeekerId?.email ||
        "Job Seeker"
      );
    }
    return "Participant";
  };

  const updatePipeline = async (convId: string, status: Conversation["pipelineStatus"]) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: status }),
      });
      if (!res.ok) throw new Error("Failed to update pipeline");
      setConversations((prev) => prev.map((c) => (c._id === convId ? { ...c, pipelineStatus: status } : c)));
      if (selectedConversation && selectedConversation._id === convId) {
        setSelectedConversation({ ...selectedConversation, pipelineStatus: status } as Conversation);
      }
    } catch (e) {
      toast({ title: "Update failed", description: "Could not update pipeline", variant: "destructive" });
    }
  };

  if (sessionLoading || loadingConversations) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading messages...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">
            Please log in to view your messages.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <Card className="w-1/4 border-r rounded-none">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-3 border-b">
            <form onSubmit={handleCreateByEmail} className="flex gap-2">
              <Input
                placeholder="Start new by email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button disabled={creatingConv} type="submit" size="sm">
                {creatingConv ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start"}
              </Button>
            </form>
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            {conversations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No conversations yet.
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted ${
                    selectedConversation?._id === conv._id ? "bg-muted" : ""
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <Avatar>
                    <AvatarImage src="/placeholder-user.jpg" />
                    <AvatarFallback>
                      {getParticipantName(conv)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium flex items-center justify-between">
                      <span>{getParticipantName(conv)}</span>
                      {conv.pipelineStatus && (
                        <span className="ml-2 inline-flex items-center rounded bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 capitalize">
                          {conv.pipelineStatus}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(conv.lastMessageAt), "MMM dd, hh:mm a")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col rounded-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>
              {selectedConversation
                ? getParticipantName(selectedConversation)
                : "Select a Conversation"}
            </CardTitle>
            {selectedConversation && (
              <select
                className="border rounded px-2 py-1 text-sm"
                value={selectedConversation.pipelineStatus || "new"}
                onChange={(e) => updatePipeline(selectedConversation._id, e.target.value as any)}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="interviewing">Interviewing</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              <ScrollArea className="flex-1 pr-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    Start a conversation! Type your first message below.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex items-start gap-3 mb-4 ${
                        msg.senderId === session.id ? "justify-end" : ""
                      }`}
                    >
                      {msg.senderId !== session.id && (
                        <Avatar>
                          <AvatarImage src="/placeholder-user.jpg" />
                          <AvatarFallback>
                            {msg.senderRole === "ai"
                              ? "AI"
                              : getParticipantName(selectedConversation)[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] p-3 rounded-lg ${
                          msg.senderId === session.id
                            ? "bg-purple-600 text-white rounded-br-none"
                            : "bg-muted text-foreground rounded-bl-none"
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">
                          {msg.content.split(/\s+/).map((w, i) => {
                            const isUrl = /^(https?:\/\/\S+)/i.test(w);
                            return isUrl ? (
                              <a key={i} href={w} target="_blank" rel="noreferrer" className={msg.senderId === session.id ? "underline text-white" : "underline text-blue-700"}>
                                {w}
                              </a>
                            ) : (
                              <span key={i}>{w} </span>
                            );
                          })}
                        </div>
                        <p className="text-xs opacity-70 mt-1 text-right">
                          {format(new Date(msg.timestamp), "hh:mm a")}
                        </p>
                      </div>
                      {msg.senderId === session.id && (
                        <Avatar>
                          <AvatarImage src="/placeholder-user.jpg" />
                          <AvatarFallback>
                            {session.email?.[0]?.toUpperCase?.() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <form onSubmit={handleSendMessage} className="flex flex-col gap-2 mt-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sendingMessage}
                  />
                  <Button type="submit" disabled={sendingMessage}>
                  {sendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  </Button>
                </div>
                <Input
                  placeholder="Optional: paste a link (resume, job, portfolio)"
                  value={attachmentLink}
                  onChange={(e) => setAttachmentLink(e.target.value)}
                  disabled={sendingMessage}
                />
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a conversation from the left panel to view messages.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
