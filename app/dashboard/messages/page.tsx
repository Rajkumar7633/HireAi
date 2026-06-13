"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Send, Search, Pencil, ChevronDown, MessageSquare, X, Link2, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Conversation {
  _id: string;
  jobSeekerId: { _id: string; name?: string; email: string };
  recruiterId:  { _id: string; name?: string; email: string };
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-sky-100",    text: "text-sky-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-amber-100",  text: "text-amber-700" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
];
function avatarColor(seed: string) {
  const n = (seed || "?").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = (name || "?").trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0][0] ?? "?").toUpperCase();
}
function relTime(d: string | Date) {
  const date = new Date(d);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  if (hrs < 48)  return "Yesterday";
  return format(date, "MMM d");
}
function dayLabel(d: string | Date) {
  const date = new Date(d);
  if (isToday(date))     return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}
function autoLink(text: string, isOwn: boolean) {
  return text.split(/\s+/).map((w, i) => {
    if (/^https?:\/\/\S+/i.test(w))
      return (
        <a key={i} href={w} target="_blank" rel="noreferrer"
           className={isOwn ? "underline text-white/90" : "underline text-violet-700"}>
          {w}{" "}
        </a>
      );
    return <span key={i}>{w} </span>;
  });
}

const PIPELINE_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  new:          { label: "New",          bg: "bg-slate-100",   text: "text-slate-600",   dot: "bg-slate-400" },
  contacted:    { label: "Contacted",    bg: "bg-blue-100",    text: "text-blue-700",    dot: "bg-blue-500" },
  interviewing: { label: "Interviewing", bg: "bg-amber-100",   text: "text-amber-700",   dot: "bg-amber-500" },
  offer:        { label: "Offer",        bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected:     { label: "Rejected",     bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-500" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialRecipientId = searchParams?.get("userId") || "";
  const { session, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  const [conversations, setConversations]       = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages]                 = useState<Message[]>([]);
  const [newMessage, setNewMessage]             = useState("");
  const [attachmentLink, setAttachmentLink]     = useState("");
  const [showLink, setShowLink]                 = useState(false);
  const [search, setSearch]                     = useState("");
  const [showCompose, setShowCompose]           = useState(false);
  const [newEmail, setNewEmail]                 = useState("");
  const [creatingConv, setCreatingConv]         = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages]   = useState(false);
  const [sendingMessage, setSendingMessage]     = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef    = useRef<HTMLTextAreaElement>(null);
  const sseRef         = useRef<EventSource | null>(null);

  // ── helpers ────────────────────────────────────────────────────────────────
  const getParticipantName = useCallback((conv: Conversation) => {
    if (!session) return "Unknown";
    if (session.role === "job_seeker")
      return conv.recruiterId?.name || conv.recruiterId?.email || "Recruiter";
    if (session.role === "recruiter")
      return conv.jobSeekerId?.name || conv.jobSeekerId?.email || "Job Seeker";
    return "Participant";
  }, [session]);

  const isOwn = (msg: Message) =>
    msg.senderId === session?.id || msg.senderId === (session as any)?.userId;

  const filteredConversations = conversations.filter((c) =>
    getParticipantName(c).toLowerCase().includes(search.toLowerCase())
  );

  // ── data fetching ──────────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/conversations").catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !initialRecipientId)
          setSelectedConversation(data[0]);
      } else {
        const mock: Conversation[] = [
          { _id: "1", jobSeekerId: { _id: "js1", name: "John Doe", email: "john@example.com" },
            recruiterId: { _id: "r1", name: "Sarah Smith", email: "sarah@company.com" },
            type: "direct", pipelineStatus: "interviewing", lastMessageAt: new Date().toISOString() },
          { _id: "2", jobSeekerId: { _id: "js2", name: "Jane Wilson", email: "jane@example.com" },
            recruiterId: { _id: "r1", name: "Sarah Smith", email: "sarah@company.com" },
            type: "direct", pipelineStatus: "new", lastMessageAt: new Date(Date.now() - 3600000).toISOString() },
        ];
        setConversations(mock);
        if (!initialRecipientId) setSelectedConversation(mock[0]);
      }
    } catch { /* silent */ }
    finally { setLoadingConversations(false); }
  }, [initialRecipientId]);

  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}/messages`).catch(() => null);
      if (res?.ok) {
        setMessages(await res.json());
      } else {
        setMessages([
          { _id: "m1", conversationId: convId, senderId: "other", senderRole: "recruiter",
            content: "Hello! I saw your profile and I'm interested in discussing a position.",
            timestamp: new Date(Date.now() - 7200000).toISOString(), readBy: [] },
          { _id: "m2", conversationId: convId, senderId: session?.id || "me", senderRole: session?.role || "job_seeker",
            content: "Thank you for reaching out! I'd love to learn more.",
            timestamp: new Date(Date.now() - 3600000).toISOString(), readBy: [] },
        ]);
      }
    } catch { /* silent */ }
    finally { setLoadingMessages(false); }
  }, [session]);

  const createConversation = useCallback(async (recipientId: string, recipientEmail?: string) => {
    setCreatingConv(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId, recipientEmail }),
      }).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        setSelectedConversation(data.conversation);
        fetchConversations();
        setTimeout(() => {
          setNewMessage(`Hi ${getParticipantName(data.conversation)}, `);
          composerRef.current?.focus();
        }, 0);
      } else {
        const mock: Conversation = {
          _id: `new-${Date.now()}`,
          jobSeekerId: session?.role === "job_seeker"
            ? { _id: session.id, name: session.name, email: session.email }
            : { _id: recipientId, name: "New Contact", email: recipientEmail || "contact@example.com" },
          recruiterId: session?.role === "recruiter"
            ? { _id: session.id, name: session.name, email: session.email }
            : { _id: recipientId, name: "New Recruiter", email: recipientEmail || "recruiter@company.com" },
          type: "direct", lastMessageAt: new Date().toISOString(),
        };
        setSelectedConversation(mock);
        setConversations((p) => [mock, ...p]);
        setTimeout(() => {
          setNewMessage(`Hi ${getParticipantName(mock)}, `);
          composerRef.current?.focus();
        }, 0);
      }
    } catch { /* silent */ }
    finally { setCreatingConv(false); }
  }, [session, fetchConversations, getParticipantName]);

  const handleSendMessage = async () => {
    const content = attachmentLink
      ? `${newMessage.trim()}\n${attachmentLink.trim()}`
      : newMessage.trim();
    if (!content || !selectedConversation || sendingMessage) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConversation._id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }).catch(() => null);
      if (res?.ok) {
        setNewMessage(""); setAttachmentLink(""); setShowLink(false);
        fetchMessages(selectedConversation._id);
        fetchConversations();
      } else {
        setMessages((p) => [...p, {
          _id: `m-${Date.now()}`, conversationId: selectedConversation._id,
          senderId: session?.id || "me", senderRole: session?.role || "job_seeker",
          content, timestamp: new Date().toISOString(), readBy: [],
        }]);
        setNewMessage(""); setAttachmentLink(""); setShowLink(false);
      }
    } catch { /* silent */ }
    finally { setSendingMessage(false); }
  };

  const updatePipeline = async (convId: string, status: Conversation["pipelineStatus"]) => {
    try {
      await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStatus: status }),
      });
      setConversations((p) => p.map((c) => c._id === convId ? { ...c, pipelineStatus: status } : c));
      if (selectedConversation?._id === convId)
        setSelectedConversation((p) => p ? { ...p, pipelineStatus: status } : p);
    } catch {
      toast({ title: "Update failed", description: "Could not update pipeline status.", variant: "destructive" });
    }
  };

  // ── effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && session) fetchConversations();
    else if (!sessionLoading && !session) setLoadingConversations(false);
  }, [sessionLoading, session, fetchConversations]);

  useEffect(() => {
    if (!selectedConversation) return;
    fetchMessages(selectedConversation._id);
    try { sseRef.current?.close(); } catch {}
    const es = new EventSource(`/api/conversations/${selectedConversation._id}/events`);
    sseRef.current = es;
    es.addEventListener("message", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);
        if (data?.conversationId === selectedConversation._id)
          setMessages((p) => [...p, data]);
      } catch {}
    });
    return () => { try { es.close(); } catch {} };
  }, [selectedConversation?._id]);

  // Handle ?userId= param
  useEffect(() => {
    if (!initialRecipientId || !conversations.length || selectedConversation) return;
    const existing = conversations.find((c) =>
      (session?.role === "job_seeker" && c.recruiterId?._id === initialRecipientId) ||
      (session?.role === "recruiter"  && c.jobSeekerId?._id === initialRecipientId)
    );
    if (existing) {
      setSelectedConversation(existing);
      setTimeout(() => {
        setNewMessage(`Hi ${getParticipantName(existing)}, `);
        composerRef.current?.focus();
      }, 0);
    } else {
      createConversation(initialRecipientId);
    }
  }, [initialRecipientId, conversations, session, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => () => { try { sseRef.current?.close(); } catch {} }, []);

  // ── loading ────────────────────────────────────────────────────────────────
  if (sessionLoading || loadingConversations) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <span className="ml-2 text-sm text-slate-500">Loading messages…</span>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        Please sign in to view your messages.
      </div>
    );
  }

  const pipelineCfg = PIPELINE_CFG[selectedConversation?.pipelineStatus || "new"];
  const participantName = selectedConversation ? getParticipantName(selectedConversation) : "";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-100 bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-base font-semibold text-slate-900">Messages</h2>
          <button
            onClick={() => setShowCompose((v) => !v)}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            title="New conversation"
          >
            {showCompose ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
        </div>

        {/* Compose form */}
        {showCompose && (
          <div className="mx-3 mb-2 p-3 rounded-xl border border-slate-200 bg-slate-50">
            <p className="text-xs font-medium text-slate-500 mb-2">Start conversation by email</p>
            <div className="flex gap-1.5">
              <Input
                placeholder="email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newEmail.trim()) {
                      createConversation("", newEmail.trim());
                      setNewEmail("");
                      setShowCompose(false);
                    }
                  }
                }}
                className="h-8 text-xs"
                autoFocus
              />
              <Button
                size="sm"
                className="h-8 px-2 bg-violet-600 hover:bg-violet-700 text-white"
                disabled={creatingConv || !newEmail.trim()}
                onClick={() => {
                  if (newEmail.trim()) {
                    createConversation("", newEmail.trim());
                    setNewEmail(""); setShowCompose(false);
                  }
                }}
              >
                {creatingConv ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* List */}
        <ScrollArea className="flex-1 min-h-0">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-xs">
                {search ? "No conversations match." : "No conversations yet."}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => {
                const name = getParticipantName(conv);
                const av = avatarColor(name);
                const init = initials(name);
                const isSelected = selectedConversation?._id === conv._id;
                const ps = PIPELINE_CFG[conv.pipelineStatus || "new"];
                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversation(conv)}
                    className={[
                      "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-violet-50 border-r-2 border-violet-600"
                        : "hover:bg-slate-50 border-r-2 border-transparent",
                    ].join(" ")}
                  >
                    {/* Avatar */}
                    <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${av.bg} ${av.text}`}>
                      {init}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-sm font-medium truncate ${isSelected ? "text-violet-800" : "text-slate-800"}`}>
                          {name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{relTime(conv.lastMessageAt)}</span>
                      </div>
                      {conv.pipelineStatus && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 ${ps.bg} ${ps.text}`}>
                          <span className={`h-1 w-1 rounded-full ${ps.dot}`} />
                          {ps.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-white shrink-0">
            {/* Avatar */}
            {(() => {
              const av = avatarColor(participantName);
              return (
                <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${av.bg} ${av.text}`}>
                  {initials(participantName)}
                </div>
              );
            })()}
            {/* Name + role */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{participantName}</p>
              <p className="text-[11px] text-slate-400 capitalize">
                {session.role === "job_seeker" ? "Recruiter" : "Job Seeker"}
              </p>
            </div>
            {/* Pipeline status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${pipelineCfg.bg} ${pipelineCfg.text} hover:opacity-80`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${pipelineCfg.dot}`} />
                  {pipelineCfg.label}
                  <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {Object.entries(PIPELINE_CFG).map(([key, cfg]) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => updatePipeline(selectedConversation._id, key as any)}
                    className="gap-2"
                  >
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 px-5 py-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <span className="text-sm">Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <MessageSquare className="h-10 w-10 opacity-25" />
                <p className="text-sm">No messages yet. Say hello!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, i) => {
                  const prev      = i > 0 ? messages[i - 1] : null;
                  const next      = i < messages.length - 1 ? messages[i + 1] : null;
                  const own       = isOwn(msg);
                  const isFirst   = !prev || prev.senderId !== msg.senderId;
                  const isLast    = !next || next.senderId !== msg.senderId;
                  const showDay   = !prev || dayLabel(msg.timestamp) !== dayLabel(prev.timestamp);
                  const av        = avatarColor(own ? (session.name || session.email || "Me") : participantName);

                  return (
                    <div key={msg._id}>
                      {/* Date divider */}
                      {showDay && (
                        <div className="flex items-center gap-3 my-5">
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-[11px] text-slate-400 font-medium px-2">
                            {dayLabel(msg.timestamp)}
                          </span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                      )}

                      {/* Message row */}
                      <div className={`flex items-end gap-2 ${own ? "flex-row-reverse" : "flex-row"} ${isFirst ? "mt-3" : "mt-0.5"}`}>
                        {/* Avatar spacer / avatar */}
                        <div className="w-7 shrink-0">
                          {isLast && !own && (
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${av.bg} ${av.text}`}>
                              {initials(participantName)}
                            </div>
                          )}
                        </div>

                        {/* Bubble */}
                        <div className={`max-w-[65%] flex flex-col ${own ? "items-end" : "items-start"}`}>
                          <div className={[
                            "px-3.5 py-2.5 text-sm leading-relaxed break-words",
                            own
                              ? "bg-violet-600 text-white rounded-2xl rounded-br-sm"
                              : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm shadow-sm",
                            isFirst && !own ? "rounded-tl-md" : "",
                            isFirst && own  ? "rounded-tr-md" : "",
                          ].join(" ")}>
                            <div className="whitespace-pre-wrap">
                              {autoLink(msg.content, own)}
                            </div>
                          </div>
                          {/* Timestamp — shown on last bubble of a group */}
                          {isLast && (
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                              {format(new Date(msg.timestamp), "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
            {/* Link attachment row */}
            {showLink && (
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <Input
                  placeholder="Paste a link (resume, job, portfolio…)"
                  value={attachmentLink}
                  onChange={(e) => setAttachmentLink(e.target.value)}
                  className="h-8 text-xs border-slate-200 bg-slate-50"
                  autoFocus
                />
                <button onClick={() => { setAttachmentLink(""); setShowLink(false); }}
                        className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Link toggle */}
              <button
                onClick={() => setShowLink((v) => !v)}
                className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-lg border transition-colors ${showLink ? "border-violet-400 text-violet-600 bg-violet-50" : "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                title="Attach link"
              >
                <Link2 className="h-4 w-4" />
              </button>

              {/* Textarea */}
              <textarea
                ref={composerRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={sendingMessage}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 transition-all overflow-hidden"
                style={{ minHeight: "36px", maxHeight: "120px" }}
              />

              {/* Send */}
              <Button
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="h-9 w-9 shrink-0 p-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40"
              >
                {sendingMessage
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-400">
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <MessageSquare className="h-8 w-8 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">No conversation selected</p>
            <p className="text-xs text-slate-400 mt-1">
              Pick one from the left, or start a new one with the{" "}
              <span className="text-violet-600 font-medium">✏ compose</span> button.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
