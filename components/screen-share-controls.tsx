"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Monitor,
  MonitorOff,
  Square,
  Maximize2,
  Minimize2,
  MousePointer,
  Pencil,
  Eraser,
  Circle,
  Type,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScreenShareControlsProps {
  isScreenSharing: boolean;
  onToggleScreenShare: () => void;
  onScreenShareEnd?: () => void;
  isHost: boolean;
}

interface AnnotationTool {
  type: "pointer" | "pen" | "eraser" | "circle" | "text";
  color: string;
  size: number;
}

export function ScreenShareControls({
  isScreenSharing,
  onToggleScreenShare,
  onScreenShareEnd,
  isHost,
}: ScreenShareControlsProps) {
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentTool, setCurrentTool] = useState<AnnotationTool>({
    type: "pointer",
    color: "#ff0000",
    size: 3,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenSources, setScreenSources] = useState<MediaDeviceInfo[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getScreenSources = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setScreenSources(videoDevices);
      } catch (error) {
        console.error("Error getting screen sources:", error);
      }
    };

    getScreenSources();
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Handle screen share end event
      stream.getVideoTracks()[0].onended = () => {
        setIsAnnotating(false);
        onScreenShareEnd?.();
        toast({
          title: "Screen Share Ended",
          description: "Screen sharing has been stopped.",
        });
      };

      onToggleScreenShare();
      toast({
        title: "Screen Share Started",
        description: "Your screen is now being shared with participants.",
      });
    } catch (error) {
      console.error("Error starting screen share:", error);
      toast({
        title: "Screen Share Error",
        description: "Failed to start screen sharing. Please try again.",
        variant: "destructive",
      });
    }
  }, [onToggleScreenShare, onScreenShareEnd, toast]);

  const stopScreenShare = useCallback(() => {
    setIsAnnotating(false);
    setIsRecordingScreen(false);
    if (
      screenRecorderRef.current &&
      screenRecorderRef.current.state !== "inactive"
    ) {
      screenRecorderRef.current.stop();
    }
    onToggleScreenShare();
    toast({
      title: "Screen Share Stopped",
      description: "Screen sharing has been ended.",
    });
  }, [onToggleScreenShare, toast]);

  const toggleAnnotation = useCallback(() => {
    if (!isScreenSharing) {
      toast({
        title: "Screen Share Required",
        description: "Please start screen sharing to use annotation tools.",
        variant: "destructive",
      });
      return;
    }

    setIsAnnotating(!isAnnotating);
    toast({
      title: isAnnotating ? "Annotations Disabled" : "Annotations Enabled",
      description: isAnnotating
        ? "Annotation tools have been disabled."
        : "You can now annotate on the shared screen.",
    });
  }, [isScreenSharing, isAnnotating, toast]);

  const startScreenRecording = useCallback(async () => {
    if (!isScreenSharing) {
      toast({
        title: "Screen Share Required",
        description: "Please start screen sharing to record.",
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `screen-recording-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Recording Saved",
          description: "Screen recording has been downloaded.",
        });
      };

      recorder.start(1000);
      screenRecorderRef.current = recorder;
      setIsRecordingScreen(true);

      toast({
        title: "Recording Started",
        description: "Screen recording has begun.",
      });
    } catch (error) {
      console.error("Error starting screen recording:", error);
      toast({
        title: "Recording Error",
        description: "Failed to start screen recording.",
        variant: "destructive",
      });
    }
  }, [isScreenSharing, toast]);

  const stopScreenRecording = useCallback(() => {
    if (
      screenRecorderRef.current &&
      screenRecorderRef.current.state !== "inactive"
    ) {
      screenRecorderRef.current.stop();
    }
    setIsRecordingScreen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const saveAnnotations = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `annotations-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();

    toast({
      title: "Annotations Saved",
      description: "Annotation overlay has been downloaded.",
    });
  }, [toast]);

  return (
    <div className="space-y-4">
      {/* Main Screen Share Controls */}
      <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between text-white">
            <div className="flex items-center">
              <Monitor className="w-4 h-4 mr-2" />
              Screen Share
            </div>
            {isScreenSharing && <Badge className="bg-green-600">Active</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Button
              variant={isScreenSharing ? "destructive" : "default"}
              size="sm"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className="flex-1"
            >
              {isScreenSharing ? (
                <>
                  <MonitorOff className="w-4 h-4 mr-2" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <Monitor className="w-4 h-4 mr-2" />
                  Share Screen
                </>
              )}
            </Button>

            {isScreenSharing && (
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>

          {/* Screen Recording Controls */}
          {isScreenSharing && isHost && (
            <div className="flex items-center space-x-2">
              <Button
                variant={isRecordingScreen ? "destructive" : "outline"}
                size="sm"
                onClick={
                  isRecordingScreen ? stopScreenRecording : startScreenRecording
                }
                className="flex-1"
              >
                {isRecordingScreen ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Monitor className="w-4 h-4 mr-2" />
                    Record Screen
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annotation Tools */}
      {isScreenSharing && (
        <Card className="bg-gray-800/90 border-gray-600 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between text-white">
              <div className="flex items-center">
                <Pencil className="w-4 h-4 mr-2" />
                Annotation Tools
              </div>
              {isAnnotating && <Badge className="bg-blue-600">Active</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={isAnnotating ? "destructive" : "outline"}
              size="sm"
              onClick={toggleAnnotation}
              className="w-full"
            >
              {isAnnotating ? "Disable Annotations" : "Enable Annotations"}
            </Button>

            {isAnnotating && (
              <>
                {/* Tool Selection */}
                <div className="grid grid-cols-5 gap-1">
                  <Button
                    variant={
                      currentTool.type === "pointer" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCurrentTool({ ...currentTool, type: "pointer" })
                    }
                    className="p-2"
                  >
                    <MousePointer className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={currentTool.type === "pen" ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setCurrentTool({ ...currentTool, type: "pen" })
                    }
                    className="p-2"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={
                      currentTool.type === "eraser" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCurrentTool({ ...currentTool, type: "eraser" })
                    }
                    className="p-2"
                  >
                    <Eraser className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={
                      currentTool.type === "circle" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCurrentTool({ ...currentTool, type: "circle" })
                    }
                    className="p-2"
                  >
                    <Circle className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={
                      currentTool.type === "text" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCurrentTool({ ...currentTool, type: "text" })
                    }
                    className="p-2"
                  >
                    <Type className="w-4 h-4" />
                  </Button>
                </div>

                {/* Color and Size Controls */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={currentTool.color}
                    onChange={(e) =>
                      setCurrentTool({ ...currentTool, color: e.target.value })
                    }
                    className="w-8 h-8 rounded border border-gray-600"
                  />
                  <Select
                    value={currentTool.size.toString()}
                    onValueChange={(value) =>
                      setCurrentTool({
                        ...currentTool,
                        size: Number.parseInt(value),
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Small (1px)</SelectItem>
                      <SelectItem value="3">Medium (3px)</SelectItem>
                      <SelectItem value="5">Large (5px)</SelectItem>
                      <SelectItem value="8">Extra Large (8px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Save Annotations */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveAnnotations}
                    className="flex-1 bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext("2d");
                        ctx?.clearRect(
                          0,
                          0,
                          canvasRef.current.width,
                          canvasRef.current.height
                        );
                      }
                    }}
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Annotation Canvas Overlay */}
      {isAnnotating && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-auto z-50"
          style={{
            cursor: currentTool.type === "eraser" ? "crosshair" : "default",
          }}
        />
      )}
    </div>
  );
}
