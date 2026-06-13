"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  LiveKitRoom,
  PreJoin,
} from "@livekit/components-react"
import type { LocalUserChoices } from "@livekit/components-core"
import "@livekit/components-styles"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, LogOut } from "lucide-react"
import { getJitsiDomain, COLLEGE_MEETING_MAX_PARTICIPANTS } from "@/lib/college-meeting-shared"
import { authFetch } from "@/lib/client-auth"
import { getMeetingSocket } from "@/lib/meeting-socket-client"
import { HireAiMeetingSuite } from "@/components/meeting/hireai-meeting-suite"

interface CollegeMeetingRoomProps {
  roomId: string
  meetingId: string
  isHost: boolean
  participantName: string
}

function JitsiMeetingRoom({
  roomId,
  participantName,
  isHost,
  onLeave,
}: {
  roomId: string
  participantName: string
  isHost: boolean
  onLeave: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ dispose: () => void } | null>(null)
  const domain = getJitsiDomain()
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return

    let cancelled = false
    setStatus("loading")

    const mount = () => {
      if (cancelled || !parent) return
      const JitsiMeetExternalAPI = (window as Window & {
        JitsiMeetExternalAPI?: new (
          domain: string,
          options: Record<string, unknown>,
        ) => { dispose: () => void; addListener: (event: string, fn: () => void) => void }
      }).JitsiMeetExternalAPI

      if (!JitsiMeetExternalAPI) {
        setStatus("error")
        setErrorMsg("Jitsi failed to load. Check network or CSP settings.")
        return
      }

      try {
        parent.innerHTML = ""
        const api = new JitsiMeetExternalAPI(domain, {
          roomName: `HireAI_${roomId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
          parentNode: parent,
          width: "100%",
          height: "100%",
          userInfo: { displayName: participantName },
          configOverwrite: {
            startWithAudioMuted: !isHost,
            startWithVideoMuted: !isHost,
            prejoinPageEnabled: true,
            disableDeepLinking: true,
            maxParticipants: COLLEGE_MEETING_MAX_PARTICIPANTS,
            enableLobby: isHost,
            toolbarButtons: [
              "microphone",
              "camera",
              "desktop",
              "chat",
              "raisehand",
              "participants-pane",
              "tileview",
              "fullscreen",
              "hangup",
              "noisesuppression",
              "settings",
              "videoquality",
              "filmstrip",
              "whiteboard",
              "select-background",
              "mute-everyone",
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
          },
        })

        api.addListener("readyToClose", onLeave)
        apiRef.current = api
        setStatus("ready")
      } catch (err) {
        setStatus("error")
        setErrorMsg(err instanceof Error ? err.message : "Could not start Jitsi room")
      }
    }

    const loadScript = () => {
      const script = document.createElement("script")
      script.src = `https://${domain}/external_api.js`
      script.async = true
      script.dataset.jitsi = domain
      script.onload = mount
      script.onerror = () => {
        if (!cancelled) {
          setStatus("error")
          setErrorMsg(`Could not load Jitsi from ${domain}. Check internet connection.`)
        }
      }
      document.body.appendChild(script)
    }

    const existing = document.querySelector(`script[data-jitsi="${domain}"]`)
    if (existing && (window as Window & { JitsiMeetExternalAPI?: unknown }).JitsiMeetExternalAPI) {
      mount()
    } else if (existing) {
      existing.addEventListener("load", mount)
    } else {
      loadScript()
    }

    return () => {
      cancelled = true
      apiRef.current?.dispose()
      apiRef.current = null
    }
  }, [domain, roomId, participantName, isHost, onLeave])

  return (
    <div className="h-full w-full flex flex-col bg-[#1b1b1b] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[#3d3d3d] shrink-0">
        <div>
          <span className="text-white text-sm font-medium">HireAI Teams Meeting</span>
          <p className="text-xs text-gray-400">Powered by Jitsi (fallback)</p>
        </div>
        <Button size="sm" variant="outline" className="border-gray-600 text-gray-200" onClick={onLeave}>
          <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
        </Button>
      </div>
      {status === "loading" && (
        <div className="flex-1 flex items-center justify-center gap-3 text-white">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span>Loading video room…</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
          <p className="text-red-400">{errorMsg}</p>
          <p className="text-sm text-gray-400 max-w-md">
            Add LiveKit keys to <code className="text-purple-300">.env.local</code> for the built-in Teams UI,
            or allow <code className="text-purple-300">meet.jit.si</code> in your network.
          </p>
          <Button variant="outline" onClick={onLeave}>Back to calendar</Button>
        </div>
      )}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full"
        style={{ minHeight: status === "ready" ? "calc(100vh - 56px)" : 0 }}
      />
    </div>
  )
}

function LiveKitMeetingRoom({
  token,
  serverUrl,
  isPresenter,
  roomId,
  meetingId,
  participantName,
  onLeave,
}: {
  token: string
  serverUrl: string
  isPresenter: boolean
  roomId: string
  meetingId: string
  participantName: string
  onLeave: () => void
}) {
  const [userChoices, setUserChoices] = useState<LocalUserChoices | null>(null)

  if (!userChoices) {
    return (
      <div className="h-full w-full bg-[#1b1b1b] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <h2 className="text-white text-xl font-semibold mb-2 text-center">Join Teams Meeting</h2>
          <p className="text-gray-400 text-sm text-center mb-6">
            Test your devices before joining · up to {COLLEGE_MEETING_MAX_PARTICIPANTS} participants
          </p>
          <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={false}
            data-lk-theme="default"
            className="hireai-meeting-root"
          >
            <PreJoin
              defaults={{
                username: participantName,
                videoEnabled: isPresenter,
                audioEnabled: isPresenter,
              }}
              joinLabel="Join now"
              onSubmit={setUserChoices}
            />
          </LiveKitRoom>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      video={false}
      audio={false}
      onDisconnected={onLeave}
      onError={(error) => {
        console.warn("[LiveKit]", error)
      }}
      data-lk-theme="default"
      className="hireai-meeting-root h-full w-full flex flex-col overflow-hidden min-h-0"
    >
      <HireAiMeetingSuite
        roomId={roomId}
        meetingId={meetingId}
        isPresenter={isPresenter}
        participantName={userChoices.username || participantName}
        initialMicEnabled={Boolean(userChoices.audioEnabled)}
        initialCameraEnabled={Boolean(userChoices.videoEnabled)}
        onLeave={onLeave}
      />
    </LiveKitRoom>
  )
}

export function CollegeMeetingRoom({
  roomId,
  meetingId,
  isHost,
  participantName,
}: CollegeMeetingRoomProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"loading" | "livekit" | "jitsi">("loading")
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [isPresenter, setIsPresenter] = useState(isHost)
  const [error, setError] = useState<string | null>(null)
  const userIdRef = useRef(`user-${Math.random().toString(36).slice(2)}`)

  const leaveMeeting = useCallback(async () => {
    if (!isHost) {
      try {
        await authFetch(`/api/job-seeker/meetings/${meetingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "leave" }),
        })
      } catch {
        // ignore
      }
    }
    const socket = getMeetingSocket()
    socket.emit("meeting:leave", { roomId })
    router.push("/dashboard/calendar")
  }, [isHost, meetingId, roomId, router])

  useEffect(() => {
    if (!isHost && meetingId) {
      authFetch(`/api/job-seeker/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join" }),
      }).catch(() => {})

      const hb = setInterval(() => {
        authFetch(`/api/job-seeker/meetings/${meetingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "heartbeat" }),
        }).catch(() => {})
      }, 30000)

      return () => clearInterval(hb)
    }
  }, [isHost, meetingId])

  useEffect(() => {
    const socket = getMeetingSocket()
    const joinMeeting = () => {
      socket.emit("meeting:join", {
        roomId,
        name: participantName,
        userId: userIdRef.current,
      })
    }

    if (socket.connected) joinMeeting()
    else socket.on("connect", joinMeeting)

    return () => {
      socket.off("connect", joinMeeting)
      socket.emit("meeting:leave", { roomId })
    }
  }, [roomId, participantName])

  useEffect(() => {
    let cancelled = false

    authFetch("/api/college/meetings/livekit-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        meetingId,
        isHost,
        participantName,
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.token && data.serverUrl) {
          setToken(data.token)
          setServerUrl(data.serverUrl)
          setIsPresenter(Boolean(data.isPresenter))
          setMode("livekit")
        } else if (data.useJitsi || res.status === 503) {
          setMode("jitsi")
        } else {
          setError(data.error || "Could not connect to meeting")
        }
      })
      .catch(() => {
        if (!cancelled) setMode("jitsi")
      })

    return () => {
      cancelled = true
    }
  }, [roomId, meetingId, isHost, participantName])

  if (mode === "loading") {
    return (
      <div className="h-full bg-gray-900 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        <p>Loading Teams-style meeting room…</p>
        <Badge variant="outline" className="text-gray-400 border-gray-600">
          Screen share · Chat · Q&A · Whiteboard · Reactions
        </Badge>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full bg-gray-900 flex flex-col items-center justify-center text-white gap-4 p-6">
        <p className="text-red-400">{error}</p>
        <Button onClick={() => router.push("/dashboard/calendar")}>Back to calendar</Button>
      </div>
    )
  }

  if (mode === "jitsi") {
    return (
      <JitsiMeetingRoom
        roomId={roomId}
        participantName={participantName}
        isHost={isHost}
        onLeave={leaveMeeting}
      />
    )
  }

  return (
    <LiveKitMeetingRoom
      token={token!}
      serverUrl={serverUrl!}
      isPresenter={isPresenter}
      roomId={roomId}
      meetingId={meetingId}
      participantName={participantName}
      onLeave={leaveMeeting}
    />
  )
}
