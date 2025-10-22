"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SocialSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [connections, setConnections] = useState<any>({ pending: [], outgoing: [], accepted: [] });
  const [loading, setLoading] = useState(false);

  const pendingMap = useMemo(() => {
    const list = Array.isArray(connections?.pending) ? connections.pending : [];
    return new Set(list.map((c: any) => String(c.requesterId)));
  }, [connections]);

  const outgoingMap = useMemo(() => {
    const list = Array.isArray(connections?.outgoing) ? connections.outgoing : [];
    return new Set(list.map((c: any) => String(c.addresseeId)));
  }, [connections]);

  const acceptedSet = useMemo(() => {
    const s = new Set<string>();
    const list = Array.isArray(connections?.accepted) ? connections.accepted : [];
    for (const c of list) {
      s.add(String(c.requesterId));
      s.add(String(c.addresseeId));
    }
    return s;
  }, [connections]);

  const search = async () => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [resResp, connResp] = await Promise.all([
        fetch(`/api/social/search?query=${encodeURIComponent(q)}`),
        fetch(`/api/social/connections`),
      ]);
      const res = resResp.ok ? await resResp.json() : { items: [] };
      const conn = connResp.ok ? await connResp.json() : { pending: [], outgoing: [], accepted: [] };
      setResults(Array.isArray(res.items) ? res.items : []);
      setConnections({
        pending: Array.isArray(conn.pending) ? conn.pending : [],
        outgoing: Array.isArray(conn.outgoing) ? conn.outgoing : [],
        accepted: Array.isArray(conn.accepted) ? conn.accepted : [],
      });
    } catch {
      setResults([]);
      setConnections({ pending: [], outgoing: [], accepted: [] });
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (toUserId: string) => {
    await fetch(`/api/social/connections/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId }),
    });
    search();
  };

  const acceptRequest = async (requesterId: string) => {
    await fetch(`/api/social/connections/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requesterId }),
    });
    search();
  };

  useEffect(() => {
    const t = setTimeout(() => {
      search();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Find job seekers and students</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, title, or email…" />
            <Button onClick={search} disabled={loading}>Search</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r, idx) => {
              const uid = r?.userId ? String(r.userId) : "";
              const isAccepted = acceptedSet.has(uid);
              const isOutgoing = outgoingMap.has(uid);
              const isIncoming = pendingMap.has(uid);
              return (
                <div key={uid || idx} className="border rounded p-4 bg-white flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.firstName} {r.lastName}</div>
                    <div className="text-sm text-muted-foreground">{r.currentTitle || r.email} {r.location ? `• ${r.location}` : ""}</div>
                  </div>
                  <div className="flex gap-2">
                    {!uid ? (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded" title="Missing user id on profile">Unavailable</span>
                    ) : isAccepted ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Connected</span>
                    ) : isOutgoing ? (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Request sent</span>
                    ) : isIncoming ? (
                      <Button size="sm" onClick={() => acceptRequest(uid)}>Accept</Button>
                    ) : (
                      <Button size="sm" onClick={() => sendRequest(uid)}>Connect</Button>
                    )}
                  </div>
                </div>
              );
            })}
            {results.length === 0 && !loading && <div className="text-sm text-muted-foreground">No results.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
