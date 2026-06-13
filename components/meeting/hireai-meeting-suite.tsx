"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  LayoutContextProvider,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  CarouselLayout,
  ParticipantTile,
  RoomAudioRenderer,
  Chat,
  TrackToggle,
  MediaDeviceMenu,
  useTracks,
  useParticipants,
  useLocalParticipantPermissions,
  useLocalParticipant,
  useIsRecording,
  useDataChannel,
  useConnectionState,
  StartAudio,
  ConnectionStateToast,
} from "@livekit/components-react"
import { ConnectionState, Track } from "livekit-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import {
  Video, MessageSquare,
  Users, Hand, Smile, Link2, Maximize, Minimize, LayoutGrid, Sparkles,
  FileUp, StickyNote, HelpCircle, PenLine, Circle, LogOut, Volume2,
  Copy, Check, PictureInPicture, Loader2,
} from "lucide-react"
import {
  MEETING_SIGNAL_TOPIC,
  encodeMeetingSignal,
  decodeMeetingSignal,
  REACTION_EMOJIS,
  type RaisedHandState,
  type SharedFile,
  type QaItem,
  type WhiteboardStroke,
} from "@/lib/meeting-signals"
import { COLLEGE_MEETING_MAX_PARTICIPANTS } from "@/lib/college-meeting-shared"
import { getMeetingSocket } from "@/lib/meeting-socket-client"
import "@/styles/hireai-meeting.css"

type SidePanel = "none" | "chat" | "people" | "notes" | "qa" | "files" | "whiteboard"

interface HireAiMeetingSuiteProps {
  roomId: string
  meetingId: string
  isPresenter: boolean
  participantName: string
  initialMicEnabled?: boolean
  initialCameraEnabled?: boolean
  onLeave: () => void
}

function MeetingMediaBootstrap({
  enableVideo,
  enableAudio,
}: {
  enableVideo: boolean
  enableAudio: boolean
}) {
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()
  const { toast } = useToast()
  const bootstrapped = useRef(false)

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return
    if (bootstrapped.current) return
    bootstrapped.current = true

    const timer = setTimeout(async () => {
      try {
        if (enableAudio) await localParticipant.setMicrophoneEnabled(true)
        if (enableVideo) await localParticipant.setCameraEnabled(true)
      } catch (err) {
        toast({
          title: "Media could not auto-start",
          description: err instanceof Error ? err.message : "Use the mic/camera buttons below.",
          variant: "destructive",
        })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [connectionState, enableAudio, enableVideo, localParticipant, toast])

  return null
}

function FloatingReaction({ emoji, name }: { emoji: string; name: string }) {
  return (
    <div className="pointer-events-none animate-in fade-in zoom-in duration-300">
      <div className="bg-black/80 backdrop-blur-sm text-white px-5 py-3 rounded-2xl text-xl flex items-center gap-3 shadow-lg border border-white/10">
        <span className="text-3xl">{emoji}</span>
        <span className="text-sm font-medium">{name}</span>
      </div>
    </div>
  )
}

function ReactionOverlay({
  reactions,
}: {
  reactions: Array<{ id: number; emoji: string; name: string }>
}) {
  if (reactions.length === 0) return null
  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {reactions.map((r) => (
        <FloatingReaction key={r.id} emoji={r.emoji} name={r.name} />
      ))}
    </div>
  )
}

function WhiteboardPanel({
  isPresenter,
  onStroke,
}: {
  isPresenter: boolean
  onStroke: (stroke: WhiteboardStroke) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const points = useRef<number[]>([])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const drawStroke = (stroke: WhiteboardStroke, ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.size
    ctx.lineCap = "round"
    ctx.beginPath()
    for (let i = 0; i < stroke.points.length; i += 2) {
      const x = (stroke.points[i] / 100) * w
      const y = (stroke.points[i + 1] / 100) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
  }, [])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPresenter) return
    drawing.current = true
    const { x, y } = getPos(e)
    points.current = [(x / canvasRef.current!.width) * 100, (y / canvasRef.current!.height) * 100]
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !isPresenter) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    const { x, y } = getPos(e)
    const nx = (x / canvas.width) * 100
    const ny = (y / canvas.height) * 100
    points.current.push(nx, ny)
    drawStroke({ color: "#6264a7", size: 3, points: [...points.current] }, ctx, canvas.width, canvas.height)
  }

  const handleMouseUp = () => {
    if (!drawing.current || !isPresenter) return
    drawing.current = false
    if (points.current.length >= 4) {
      onStroke({ color: "#6264a7", size: 3, points: [...points.current] })
    }
    points.current = []
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <p className="text-xs text-gray-400">
        {isPresenter ? "Draw on the board — students see updates live." : "Host whiteboard (view only)"}
      </p>
      <canvas
        ref={canvasRef}
        className="flex-1 w-full rounded-lg bg-white border border-gray-600 cursor-crosshair min-h-[200px]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}

export function HireAiMeetingSuite({
  roomId,
  meetingId,
  isPresenter,
  participantName,
  initialMicEnabled = false,
  initialCameraEnabled = false,
  onLeave,
}: HireAiMeetingSuiteProps) {
  const { toast } = useToast()
  const connectionState = useConnectionState()
  const isConnected = connectionState === ConnectionState.Connected
  const permissions = useLocalParticipantPermissions()
  const { localParticipant } = useLocalParticipant()
  const participants = useParticipants()
  const isRecording = useIsRecording()
  const canPublish = permissions?.canPublish ?? isPresenter

  const [sidePanel, setSidePanel] = useState<SidePanel>("none")
  const [layoutMode, setLayoutMode] = useState<"grid" | "spotlight">("grid")
  const [handRaised, setHandRaised] = useState(false)
  const [raisedHands, setRaisedHands] = useState<RaisedHandState[]>([])
  const [reactionFeed, setReactionFeed] = useState<Array<{ id: number; emoji: string; name: string }>>([])
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState<SharedFile[]>([])
  const [qaItems, setQaItems] = useState<QaItem[]>([])
  const [newQuestion, setNewQuestion] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [blurBg, setBlurBg] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const whiteboardStrokes = useRef<WhiteboardStroke[]>([])

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const screenTrack = tracks.find(
    (t) =>
      t.source === Track.Source.ScreenShare &&
      t.publication &&
      (t.publication.track || t.publication.isSubscribed),
  )
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera)
  const focusTrack =
    screenTrack || (layoutMode === "spotlight" ? cameraTracks[0] : undefined)
  const carouselTracks = screenTrack ? cameraTracks : cameraTracks.slice(1)

  const meetingLink = useMemo(() => {
    if (typeof window === "undefined") return ""
    const params = new URLSearchParams({
      meetingId,
      kind: "college_meeting",
      name: participantName,
    })
    return `${window.location.origin}/video-call/${roomId}?${params.toString()}`
  }, [roomId, meetingId, participantName])

  const broadcast = useCallback(
    async (
      sendFn: (payload: Uint8Array, options: { topic: string; reliable?: boolean }) => Promise<void>,
      signal: Parameters<typeof encodeMeetingSignal>[0],
    ) => {
      await sendFn(encodeMeetingSignal(signal), { topic: MEETING_SIGNAL_TOPIC, reliable: true })
    },
    [],
  )

  const pushReaction = useCallback((emoji: string, name: string) => {
    const id = Date.now() + Math.random()
    setReactionFeed((prev) => [...prev, { id, emoji, name }])
    setTimeout(() => {
      setReactionFeed((prev) => prev.filter((r) => r.id !== id))
    }, 2800)
  }, [])

  const handleMeetingSignal = useCallback(
    (signal: ReturnType<typeof decodeMeetingSignal>) => {
      if (!signal) return

      switch (signal.type) {
        case "raise_hand":
          setRaisedHands((prev) => {
            const rest = prev.filter((h) => h.identity !== signal.identity)
            return signal.raised ? [...rest, { identity: signal.identity, name: signal.name }] : rest
          })
          break
        case "mute_all":
          if (!isPresenter) {
            toast({ title: "Host muted everyone", description: "Please mute your microphone." })
          }
          break
        case "file":
          setFiles((prev) => [
            ...prev,
            {
              id: `${signal.identity}-${Date.now()}`,
              fileName: signal.fileName,
              dataUrl: signal.dataUrl,
              mime: signal.mime,
              from: signal.name,
              at: Date.now(),
            },
          ])
          break
        case "qa":
          setQaItems((prev) => [...prev, {
            id: signal.id,
            question: signal.question,
            name: signal.name,
            identity: signal.identity,
          }])
          break
        case "qa_answer":
          setQaItems((prev) =>
            prev.map((q) => q.id === signal.id ? { ...q, answer: signal.answer } : q),
          )
          break
        case "whiteboard":
          whiteboardStrokes.current.push(signal.stroke)
          break
      }
    },
    [isPresenter, toast],
  )

  const { send } = useDataChannel(MEETING_SIGNAL_TOPIC, (msg) => {
    handleMeetingSignal(decodeMeetingSignal(msg.payload))
  })

  useEffect(() => {
    const socket = getMeetingSocket()
    const joinMeeting = () => {
      socket.emit("meeting:join", { roomId, name: participantName })
    }

    const onSignal = (payload: {
      roomId?: string
      signal?: { type?: string; emoji?: string; name?: string }
    }) => {
      if (payload.roomId !== roomId || payload.signal?.type !== "reaction") return
      if (payload.signal.emoji && payload.signal.name) {
        pushReaction(payload.signal.emoji, payload.signal.name)
      }
    }

    if (socket.connected) joinMeeting()
    else socket.on("connect", joinMeeting)
    socket.on("meeting:signal", onSignal)

    return () => {
      socket.off("connect", joinMeeting)
      socket.off("meeting:signal", onSignal)
      socket.emit("meeting:leave", { roomId })
    }
  }, [roomId, participantName, pushReaction])

  const toggleHand = async () => {
    const raised = !handRaised
    setHandRaised(raised)
    await broadcast(send, {
      type: "raise_hand",
      identity: localParticipant.identity,
      name: participantName,
      raised,
    })
    toast({
      title: raised ? "Hand raised" : "Hand lowered",
      description: raised ? "The host will see your request." : undefined,
    })
  }

  const sendReaction = (emoji: string) => {
    setShowReactions(false)
    if (!isConnected) {
      toast({ title: "Not connected yet", description: "Wait for the meeting to connect.", variant: "destructive" })
      return
    }
    pushReaction(emoji, participantName)
    getMeetingSocket().emit("meeting:signal", {
      roomId,
      signal: {
        type: "reaction",
        identity: localParticipant.identity,
        name: participantName,
        emoji,
      },
    })
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(meetingLink)
    setLinkCopied(true)
    toast({ title: "Link copied", description: "Share with participants." })
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const togglePiP = async () => {
    const video = rootRef.current?.querySelector("video")
    if (video && document.pictureInPictureEnabled) {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture()
        else await video.requestPictureInPicture()
      } catch {
        toast({ title: "Picture-in-picture not available", variant: "destructive" })
      }
    }
  }

  const handleFileShare = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500_000) {
      toast({ title: "File too large", description: "Max 500KB for in-meeting share.", variant: "destructive" })
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      await broadcast(send, {
        type: "file",
        identity: localParticipant.identity,
        name: participantName,
        fileName: file.name,
        dataUrl,
        mime: file.type,
      })
      toast({ title: "File shared", description: file.name })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return
    const id = `qa-${Date.now()}`
    await broadcast(send, {
      type: "qa",
      id,
      identity: localParticipant.identity,
      name: participantName,
      question: newQuestion.trim(),
    })
    setNewQuestion("")
    toast({ title: "Question sent" })
  }

  const answerQuestion = async (id: string, answer: string) => {
    await broadcast(send, { type: "qa_answer", id, answer })
  }

  const muteAll = async () => {
    await broadcast(send, { type: "mute_all" })
    toast({ title: "Mute all sent", description: "Participants notified to mute." })
  }

  const whiteboardStroke = async (stroke: WhiteboardStroke) => {
    await broadcast(send, { type: "whiteboard", stroke })
  }

  const panelOpen = sidePanel !== "none"

  return (
    <TooltipProvider>
      <div
        ref={rootRef}
        className="hireai-meeting-root h-full w-full flex flex-col overflow-hidden min-h-0 bg-[#1b1b1b] text-white"
      >
        <StartAudio label="Click to enable meeting audio" />
        <ConnectionStateToast />
        <MeetingMediaBootstrap
          enableAudio={initialMicEnabled}
          enableVideo={initialCameraEnabled}
        />

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[#3d3d3d] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#6264a7] flex items-center justify-center shrink-0">
              <Video className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">HireAI Teams Meeting</p>
              <p className="text-xs text-gray-400 truncate">
                {participants.length} / {COLLEGE_MEETING_MAX_PARTICIPANTS} · {roomId}
              </p>
            </div>
            {isRecording && (
              <Badge className="bg-red-600/90 gap-1">
                <Circle className="h-2 w-2 fill-white animate-pulse" /> REC
              </Badge>
            )}
            {!isConnected && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-300 bg-amber-950/40 gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPresenter && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="h-9 bg-[#3d3d3d] border border-[#5a5a5a] text-gray-100 hover:bg-[#6264a7] hover:text-white"
                    onClick={copyLink}
                  >
                    {linkCopied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                    {linkCopied ? "Copied" : "Copy link"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share meeting link</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-9 bg-[#3d3d3d] border border-[#5a5a5a] text-gray-100 hover:bg-[#6264a7] hover:text-white"
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? <Minimize className="h-3.5 w-3.5 mr-1.5" /> : <Maximize className="h-3.5 w-3.5 mr-1.5" />}
                  Fullscreen
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle fullscreen</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              className="h-9 bg-[#c4314b] hover:bg-[#a52840] text-white border-0"
              onClick={onLeave}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Leave
            </Button>
          </div>
        </header>

        {/* Main area */}
        <div className="flex flex-1 min-h-0">
          <div className={`flex-1 flex flex-col min-w-0 relative ${blurBg ? "[&_video]:backdrop-blur-md" : ""}`}>
            <LayoutContextProvider>
              <div className="flex-1 min-h-0 p-2">
                {screenTrack ? (
                  <div className="h-full flex flex-row gap-2 min-h-0 min-w-0">
                    {cameraTracks.length > 0 && (
                      <CarouselLayout
                        tracks={cameraTracks}
                        orientation="vertical"
                        className="hireai-meeting-carousel shrink-0 h-full w-36 max-w-[148px]"
                      >
                        <ParticipantTile />
                      </CarouselLayout>
                    )}
                    <div className="flex-1 min-w-0 min-h-0 rounded-lg overflow-hidden bg-black border border-[#3d3d3d] relative">
                      <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-[#6264a7]/90 text-xs font-medium">
                        {screenTrack.participant.isLocal ? "You are presenting" : `${screenTrack.participant.name || "Host"} is presenting`}
                      </div>
                      <FocusLayout
                        trackRef={screenTrack}
                        className="h-full w-full [&_video]:object-contain [&_video]:w-full [&_video]:h-full"
                      />
                    </div>
                  </div>
                ) : focusTrack ? (
                  <FocusLayoutContainer className="h-full flex flex-col gap-2 min-h-0">
                    <CarouselLayout tracks={carouselTracks} className="h-24 shrink-0">
                      <ParticipantTile />
                    </CarouselLayout>
                    <FocusLayout trackRef={focusTrack} className="flex-1 min-h-0 rounded-lg overflow-hidden" />
                  </FocusLayoutContainer>
                ) : (
                  <GridLayout tracks={cameraTracks} className="h-full">
                    <ParticipantTile />
                  </GridLayout>
                )}
              </div>
            </LayoutContextProvider>

            {reactionFeed.length > 0 && <ReactionOverlay reactions={reactionFeed} />}

            {/* Control bar — Teams style */}
            <div className="shrink-0 px-4 py-3 bg-[#252525] border-t border-[#3d3d3d]">
              <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
                {canPublish && isConnected ? (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TrackToggle
                          source={Track.Source.Microphone}
                          showIcon
                          onDeviceError={(e) =>
                            toast({ title: "Microphone error", description: e.message, variant: "destructive" })
                          }
                          className="lk-button rounded-full w-11 h-11 bg-[#3d3d3d] hover:bg-[#4d4d4d] border-0 text-white"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Mic</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TrackToggle
                          source={Track.Source.Camera}
                          showIcon
                          onDeviceError={(e) =>
                            toast({ title: "Camera error", description: e.message, variant: "destructive" })
                          }
                          className="lk-button rounded-full w-11 h-11 bg-[#3d3d3d] hover:bg-[#4d4d4d] border-0 text-white"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Camera</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TrackToggle
                          source={Track.Source.ScreenShare}
                          showIcon
                          onDeviceError={(e) =>
                            toast({ title: "Screen share error", description: e.message, variant: "destructive" })
                          }
                          className="lk-button rounded-full w-11 h-11 bg-[#3d3d3d] hover:bg-[#4d4d4d] border-0 text-white"
                        />
                      </TooltipTrigger>
                      <TooltipContent>Share screen</TooltipContent>
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`rounded-full w-11 h-11 ${handRaised ? "bg-amber-600" : "bg-[#3d3d3d]"}`}
                        onClick={toggleHand}
                      >
                        <Hand className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Raise hand</TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full w-11 h-11 bg-[#3d3d3d]"
                      onClick={() => setShowReactions((v) => !v)}
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reactions</TooltipContent>
                </Tooltip>

                {showReactions && (
                  <div className="flex gap-1 bg-[#252525] border border-[#5a5a5a] rounded-2xl px-3 py-2 shadow-lg">
                    {REACTION_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="text-2xl p-1.5 rounded-lg hover:bg-[#6264a7] hover:scale-110 transition-transform"
                        onClick={() => sendReaction(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}

                <BarButton
                  icon={<MessageSquare className="h-5 w-5" />}
                  label="Chat"
                  active={sidePanel === "chat"}
                  onClick={() => setSidePanel(sidePanel === "chat" ? "none" : "chat")}
                />
                <BarButton
                  icon={<Users className="h-5 w-5" />}
                  label="People"
                  badge={participants.length}
                  active={sidePanel === "people"}
                  onClick={() => setSidePanel(sidePanel === "people" ? "none" : "people")}
                />
                <BarButton
                  icon={<StickyNote className="h-5 w-5" />}
                  label="Notes"
                  active={sidePanel === "notes"}
                  onClick={() => setSidePanel(sidePanel === "notes" ? "none" : "notes")}
                />
                <BarButton
                  icon={<HelpCircle className="h-5 w-5" />}
                  label="Q&A"
                  badge={qaItems.length}
                  active={sidePanel === "qa"}
                  onClick={() => setSidePanel(sidePanel === "qa" ? "none" : "qa")}
                />
                <BarButton
                  icon={<FileUp className="h-5 w-5" />}
                  label="Files"
                  badge={files.length}
                  active={sidePanel === "files"}
                  onClick={() => setSidePanel(sidePanel === "files" ? "none" : "files")}
                />
                <BarButton
                  icon={<PenLine className="h-5 w-5" />}
                  label="Board"
                  active={sidePanel === "whiteboard"}
                  onClick={() => setSidePanel(sidePanel === "whiteboard" ? "none" : "whiteboard")}
                />

                {canPublish && (
                  <>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileShare} />
                    <BarButton
                      icon={<FileUp className="h-5 w-5" />}
                      label="Share file"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <BarButton
                      icon={<LayoutGrid className="h-5 w-5" />}
                      label="Layout"
                      onClick={() => setLayoutMode((m) => m === "grid" ? "spotlight" : "grid")}
                    />
                    <BarButton
                      icon={<Sparkles className="h-5 w-5" />}
                      label="Blur"
                      active={blurBg}
                      onClick={() => setBlurBg((v) => !v)}
                    />
                    <MediaDeviceMenu />
                    {isPresenter && (
                      <BarButton icon={<Volume2 className="h-5 w-5" />} label="Mute all" onClick={muteAll} />
                    )}
                  </>
                )}

                <BarButton icon={<PictureInPicture className="h-5 w-5" />} label="PiP" onClick={togglePiP} />
                <BarButton icon={<Link2 className="h-5 w-5" />} label="Copy link" onClick={copyLink} />

                <Button
                  size="icon"
                  className="rounded-full w-11 h-11 bg-[#c4314b] hover:bg-[#a52840] ml-2"
                  onClick={onLeave}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Side panel */}
          {panelOpen && (
            <aside className="w-full sm:w-80 lg:w-96 border-l border-[#3d3d3d] bg-[#252525] flex flex-col shrink-0 min-h-0 overflow-hidden">
              <Tabs value={sidePanel} onValueChange={(v) => setSidePanel(v as SidePanel)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <TabsList className="grid grid-cols-3 m-2 bg-[#1b1b1b] border border-[#3d3d3d] p-1 h-auto">
                  <TabsTrigger value="chat" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">Chat</TabsTrigger>
                  <TabsTrigger value="people" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">People</TabsTrigger>
                  <TabsTrigger value="notes" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">Notes</TabsTrigger>
                </TabsList>
                <TabsList className="grid grid-cols-3 m-2 mt-0 bg-[#1b1b1b] border border-[#3d3d3d] p-1 h-auto">
                  <TabsTrigger value="qa" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">Q&A</TabsTrigger>
                  <TabsTrigger value="files" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">Files</TabsTrigger>
                  <TabsTrigger value="whiteboard" className="text-gray-400 data-[state=active]:bg-[#6264a7] data-[state=active]:text-white text-xs">Board</TabsTrigger>
                </TabsList>

                <TabsContent value="chat" className="flex-1 m-0 min-h-0 data-[state=active]:flex flex-col">
                  <Chat className="flex-1 min-h-0" />
                </TabsContent>

                <TabsContent value="people" className="flex-1 m-2 min-h-0 overflow-hidden data-[state=active]:flex flex-col">
                  <ScrollArea className="h-full flex-1">
                    <div className="space-y-2">
                      {participants.map((p) => (
                        <div key={p.identity} className="flex items-center gap-2 p-2 rounded-lg bg-[#1b1b1b] text-sm">
                          <div className="w-8 h-8 rounded-full bg-[#6264a7] flex items-center justify-center text-xs">
                            {(p.name || p.identity).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{p.name || p.identity}</p>
                            {raisedHands.some((h) => h.identity === p.identity) && (
                              <span className="text-amber-400 text-xs flex items-center gap-1">
                                <Hand className="h-3 w-3" /> Raised hand
                              </span>
                            )}
                          </div>
                          {p.isLocal && <Badge variant="outline" className="text-xs">You</Badge>}
                        </div>
                      ))}
                    </div>
                    {raisedHands.length > 0 && isPresenter && (
                      <div className="mt-4 p-2 rounded-lg bg-amber-900/30 border border-amber-700/50">
                        <p className="text-xs font-semibold text-amber-300 mb-2">Raised hands</p>
                        {raisedHands.map((h) => (
                          <p key={h.identity} className="text-sm">{h.name}</p>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="notes" className="flex-1 m-2 flex flex-col gap-2">
                  <p className="text-xs text-gray-400">Private notes (saved on this device)</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Meeting notes…"
                    className="flex-1 min-h-[200px] bg-[#1b1b1b] border-gray-600"
                  />
                </TabsContent>

                <TabsContent value="qa" className="flex-1 m-2 flex flex-col gap-2 min-h-0 overflow-hidden data-[state=active]:flex flex-col">
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-3">
                      {qaItems.map((q) => (
                        <div key={q.id} className="p-3 rounded-lg bg-[#1b1b1b] text-sm">
                          <p className="font-medium">{q.name}</p>
                          <p className="text-gray-300 mt-1">{q.question}</p>
                          {q.answer && <p className="text-green-400 mt-2 text-xs">Answer: {q.answer}</p>}
                          {isPresenter && !q.answer && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 text-xs"
                              onClick={() => {
                                const answer = prompt("Your answer:")
                                if (answer) answerQuestion(q.id, answer)
                              }}
                            >
                              Answer
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {!isPresenter && (
                    <div className="flex gap-2">
                      <Input
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Ask a question…"
                        className="bg-[#1b1b1b] border-gray-600"
                        onKeyDown={(e) => e.key === "Enter" && submitQuestion()}
                      />
                      <Button size="sm" onClick={submitQuestion}>Send</Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="flex-1 m-2 min-h-0 overflow-hidden data-[state=active]:flex flex-col">
                  <ScrollArea className="h-full flex-1">
                    {files.length === 0 ? (
                      <p className="text-gray-400 text-sm">No files shared yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {files.map((f) => (
                          <div key={f.id} className="p-3 rounded-lg bg-[#1b1b1b] text-sm">
                            <p className="font-medium truncate">{f.fileName}</p>
                            <p className="text-xs text-gray-400">from {f.from}</p>
                            {f.dataUrl && (
                              <a href={f.dataUrl} download={f.fileName} className="text-[#7b7fc8] text-xs mt-1 block">
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="whiteboard" className="flex-1 m-2 min-h-0">
                  <WhiteboardPanel isPresenter={isPresenter} onStroke={whiteboardStroke} />
                </TabsContent>
              </Tabs>
            </aside>
          )}
        </div>

        <RoomAudioRenderer />
      </div>
    </TooltipProvider>
  )
}

function BarButton({
  icon,
  label,
  onClick,
  active,
  badge,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  active?: boolean
  badge?: number
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`rounded-full w-11 h-11 relative ${active ? "bg-[#6264a7]" : "bg-[#3d3d3d] hover:bg-[#4d4d4d]"}`}
          onClick={onClick}
        >
          {icon}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
