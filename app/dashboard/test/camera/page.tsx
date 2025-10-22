"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [intervalSec, setIntervalSec] = useState(5);
  const [sessionId, setSessionId] = useState<string>(() => Math.random().toString(36).slice(2));
  const [lastUploadId, setLastUploadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (e: any) {
      setError(e?.message || "Camera error");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const captureAndUpload = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setBusy(true);
    try {
      const res = await fetch("/api/camera/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataUrl,
          mimeType: "image/jpeg",
          width: canvas.width,
          height: canvas.height,
          sessionId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      setLastUploadId(json.id);
    } catch (e: any) {
      setError(e?.message || "Upload error");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => {
      captureAndUpload();
    }, Math.max(2, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [streaming, intervalSec]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Camera Auto-Save Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={startCamera} disabled={streaming}>Start</Button>
            <Button onClick={stopCamera} variant="destructive" disabled={!streaming}>Stop</Button>
            <Button onClick={captureAndUpload} variant="outline" disabled={!streaming || busy}>
              Snapshot {busy ? "…" : ""}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Interval (sec)</span>
              <Input type="number" className="w-24" value={intervalSec} onChange={(e) => setIntervalSec(parseInt(e.target.value || "5"))} />
            </div>
            <div className="text-sm text-muted-foreground">Session: {sessionId}</div>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <video ref={videoRef} className="w-full rounded border" playsInline muted />
            </div>
            <div>
              <canvas ref={canvasRef} className="w-full rounded border" />
            </div>
          </div>
          {lastUploadId && <div className="text-sm text-green-700">Last upload id: {lastUploadId}</div>}
          <p className="text-xs text-muted-foreground">Note: Images are stored as base64 data URLs in MongoDB via the CameraCapture model. For production, consider uploading to object storage (e.g., S3/Cloudinary) and storing URLs only.</p>
        </CardContent>
      </Card>
    </div>
  );
}
