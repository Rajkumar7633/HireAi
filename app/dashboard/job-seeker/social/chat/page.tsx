"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SocialChatPage() {
  const [convos, setConvos] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadConvos = async () => {
    setLoadingConvos(true);
    try {
      const res = await fetch("/api/social/conversations");
      const json = await res.json();
      setConvos(json?.items || []);
      if (!activeId && json?.items?.length) setActiveId(json.items[0]._id);
    } finally {
      setLoadingConvos(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/social/messages?conversationId=${conversationId}`);
      const json = await res.json();
      setMessages(json?.items || []);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const sendMessage = async () => {
    if (!activeId || !text.trim()) return;
    const res = await fetch("/api/social/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, text }),
    });
    if (res.ok) {
      setText("");
      loadMessages(activeId);
      loadConvos();
    }
  };

  useEffect(() => {
    loadConvos();
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId]);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConvos ? (
            <div>Loading…</div>
          ) : (
            <div className="space-y-2">
              {convos.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setActiveId(c._id)}
                  className={`w-full text-left border rounded p-3 ${activeId === c._id ? "bg-blue-50 border-blue-300" : "bg-white"}`}
                >
                  <div className="text-sm">{c.participants.join(", ")}</div>
                  <div className="text-xs text-muted-foreground">{c.updatedAt ? new Date(c.updatedAt).toLocaleString() : ""}</div>
                </button>
              ))}
              {convos.length === 0 && <div className="text-sm text-muted-foreground">No conversations.</div>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col h-[70vh]">
          <div className="flex-1 overflow-auto border rounded p-3 bg-white">
            {loadingMsgs ? (
              <div>Loading…</div>
            ) : (
              <div className="space-y-2">
                {messages.map((m) => (
                  <div key={m._id} className="text-sm">
                    <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
                {messages.length === 0 && <div className="text-sm text-muted-foreground">No messages.</div>}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
            <Button onClick={sendMessage} disabled={!activeId || !text.trim()}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
