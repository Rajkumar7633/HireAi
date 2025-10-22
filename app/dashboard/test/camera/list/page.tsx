"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CameraListPage() {
  const [sessionId, setSessionId] = useState("");
  const [days, setDays] = useState(1);
  const { data, isLoading, mutate } = useSWR(
    `/api/camera/list?sessionId=${encodeURIComponent(sessionId)}&days=${days}`,
    fetcher
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Captured Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Session</span>
              <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="optional session id" className="w-56"/>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Last N days</span>
              <Input type="number" className="w-24" value={days} onChange={(e) => setDays(parseInt(e.target.value || "1"))} />
            </div>
            <Button onClick={() => mutate()}>Refresh</Button>
          </div>

          {isLoading ? (
            <div>Loading…</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(data?.items || []).map((it: any) => (
                <div key={it._id} className="border rounded p-2">
                  <img src={it.dataUrl} className="w-full h-auto rounded" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(it.createdAt).toLocaleString()} • {Math.round(it.sizeBytes/1024)} KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
