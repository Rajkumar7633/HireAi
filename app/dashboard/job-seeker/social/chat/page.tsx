"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Search, Users, MessageSquare, X } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParticipantDetail {
  _id: string;
  name: string;
  email: string;
  profileImage: string;
}

interface Convo {
  _id: string;
  participants: string[];
  participantDetails: ParticipantDetail[];
  lastMessageAt?: string;
  updatedAt: string;
}

interface Msg {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
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
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0][0] ?? "?").toUpperCase();
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
  return text.split(/\s+/).map((w, i) =>
    /^https?:\/\/\S+/i.test(w) ? (
      <a key={i} href={w} target="_blank" rel="noreferrer"
         className={isOwn ? "underline text-white/90" : "underline text-violet-700"}>
        {w}{" "}
      </a>
    ) : (
      <span key={i}>{w} </span>
    )
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SocialChatPage() {
  const searchParams = useSearchParams();
  const { session, isLoading: sessionLoading } = useSession();

  const [convos, setConvos]         = useState<Convo[]>([]);
  const [activeConvo, setActiveConvo] = useState<Convo | null>(null);
  const [messages, setMessages]     = useState<Msg[]>([]);
  const [text, setText]             = useState("");
  const [search, setSearch]         = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [sending, setSending]       = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef    = useRef<HTMLTextAreaElement>(null);

  // current user id
  const myId = (session as any)?.userId || session?.id || "";

  // other participant in a conversation
  const getOther = useCallback((conv: Convo): ParticipantDetail => {
    if (conv.participantDetails?.length) {
      const other = conv.participantDetails.find((p) => p._id !== myId);
      if (other) return other;
      return conv.participantDetails[0];
    }
    return { _id: "", name: "Unknown", email: "", profileImage: "" };
  }, [myId]);

  const filtered = convos.filter((c) => {
    const other = getOther(c);
    const name = other.name || other.email;
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // ── data fetching ──────────────────────────────────────────────────────────
  const loadConvos = useCallback(async () => {
    setLoadingConvos(true);
    try {
      const res = await fetch("/api/social/conversations").catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        const items: Convo[] = json?.items || [];
        setConvos(items);
        // Auto-select from ?userId= param or first conversation
        const targetUserId = searchParams?.get("userId");
        if (targetUserId) {
          const found = items.find((c) =>
            c.participantDetails?.some((p) => p._id === targetUserId)
          );
          if (found) { setActiveConvo(found); return; }
          // Create conversation with that user
          const cRes = await fetch("/api/social/conversations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ otherUserId: targetUserId }),
          }).catch(() => null);
          if (cRes?.ok) {
            const cd = await cRes.json();
            const newConvo = cd.conversation as Convo;
            setConvos((p) => [newConvo, ...p.filter((c) => c._id !== newConvo._id)]);
            setActiveConvo(newConvo);
          }
        } else if (items.length && !activeConvo) {
          setActiveConvo(items[0]);
        }
      }
    } catch { /* silent */ }
    finally { setLoadingConvos(false); }
  }, [searchParams]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/social/messages?conversationId=${convId}`).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        setMessages(json?.items || []);
      }
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
  }, []);

  const sendMessage = async () => {
    if (!activeConvo || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/social/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvo._id, text: text.trim() }),
      }).catch(() => null);
      if (res?.ok) {
        setText("");
        // optimistic: also refetch for accuracy
        loadMessages(activeConvo._id);
        loadConvos();
      } else {
        // Optimistic fallback
        setMessages((p) => [
          ...p,
          { _id: `tmp-${Date.now()}`, conversationId: activeConvo._id,
            senderId: myId, text: text.trim(), createdAt: new Date().toISOString() },
        ]);
        setText("");
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  // ── effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading && session) loadConvos();
    else if (!sessionLoading && !session) setLoadingConvos(false);
  }, [sessionLoading, session, loadConvos]);

  useEffect(() => {
    if (activeConvo) loadMessages(activeConvo._id);
  }, [activeConvo?._id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── loading ────────────────────────────────────────────────────────────────
  if (sessionLoading || loadingConvos) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        <span className="ml-2 text-sm text-slate-500">Loading chats…</span>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Please sign in to view your chats.
      </div>
    );
  }

  const other = activeConvo ? getOther(activeConvo) : null;
  const otherName = other ? (other.name || other.email || "Unknown") : "";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 flex flex-col border-r border-slate-100 bg-white">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-base font-semibold text-slate-900">Chats</h2>
          <span className="text-[11px] text-slate-400 font-medium">{convos.length} conversation{convos.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search chats…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-xs text-center px-4">
                {search ? "No chats match your search." : "No chats yet. Connect with people to start chatting."}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv) => {
                const o = getOther(conv);
                const name = o.name || o.email || "Unknown";
                const av = avatarColor(name);
                const isActive = activeConvo?._id === conv._id;
                const ts = conv.lastMessageAt || conv.updatedAt;
                return (
                  <button
                    key={conv._id}
                    onClick={() => setActiveConvo(conv)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors border-r-2",
                      isActive
                        ? "bg-violet-50 border-violet-600"
                        : "hover:bg-slate-50 border-transparent",
                    ].join(" ")}
                  >
                    {o.profileImage ? (
                      <img src={o.profileImage} alt={name}
                           className="h-9 w-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${av.bg} ${av.text}`}>
                        {initials(name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-medium truncate ${isActive ? "text-violet-800" : "text-slate-800"}`}>
                          {name}
                        </span>
                        {ts && <span className="text-[10px] text-slate-400 shrink-0">{relTime(ts)}</span>}
                      </div>
                      {o.email && o.name && (
                        <span className="text-[11px] text-slate-400 truncate block">{o.email}</span>
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
      {activeConvo && other ? (
        <div className="flex-1 flex flex-col min-w-0 bg-white">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 shrink-0">
            {other.profileImage ? (
              <img src={other.profileImage} alt={otherName}
                   className="h-9 w-9 rounded-full object-cover shrink-0" />
            ) : (
              (() => {
                const av = avatarColor(otherName);
                return (
                  <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${av.bg} ${av.text}`}>
                    {initials(otherName)}
                  </div>
                );
              })()
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{otherName}</p>
              {other.email && other.name && (
                <p className="text-[11px] text-slate-400 truncate">{other.email}</p>
              )}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 px-5 py-4">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <span className="text-sm">Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <MessageSquare className="h-10 w-10 opacity-25" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((msg, i) => {
                  const prev    = i > 0 ? messages[i - 1] : null;
                  const next    = i < messages.length - 1 ? messages[i + 1] : null;
                  const own     = msg.senderId === myId;
                  const isFirst = !prev || prev.senderId !== msg.senderId;
                  const isLast  = !next || next.senderId !== msg.senderId;
                  const showDay = !prev || dayLabel(msg.createdAt) !== dayLabel(prev.createdAt);
                  const av      = avatarColor(own ? (session.name || session.email || "Me") : otherName);

                  return (
                    <div key={msg._id}>
                      {showDay && (
                        <div className="flex items-center gap-3 my-5">
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-[11px] text-slate-400 font-medium px-2">
                            {dayLabel(msg.createdAt)}
                          </span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${own ? "flex-row-reverse" : "flex-row"} ${isFirst ? "mt-3" : "mt-0.5"}`}>
                        {/* Avatar */}
                        <div className="w-7 shrink-0">
                          {isLast && !own && (
                            other.profileImage ? (
                              <img src={other.profileImage} alt={otherName}
                                   className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold ${av.bg} ${av.text}`}>
                                {initials(otherName)}
                              </div>
                            )
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
                            isFirst &&  own ? "rounded-tr-md" : "",
                          ].join(" ")}>
                            <div className="whitespace-pre-wrap">{autoLink(msg.text, own)}</div>
                          </div>
                          {isLast && (
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                              {format(new Date(msg.createdAt), "h:mm a")}
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
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={sending}
                placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 transition-all overflow-hidden"
                style={{ minHeight: "36px", maxHeight: "120px" }}
              />
              <Button
                onClick={sendMessage}
                disabled={sending || !text.trim()}
                className="h-9 w-9 shrink-0 p-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40"
              >
                {sending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-400">
          <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <MessageSquare className="h-8 w-8 text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">No chat selected</p>
            <p className="text-xs text-slate-400 mt-1">
              Pick a conversation from the left to start chatting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
