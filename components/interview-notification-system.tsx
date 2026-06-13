"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Video, Calendar, Clock, X, Check } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/use-notifications";

interface UpcomingReminder {
  id: string;
  interviewId: string;
  title: string;
  message: string;
  scheduledDate: string;
  candidateName?: string;
  position?: string;
  dismissed: boolean;
}

export function InterviewNotificationSystem() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [reminders, setReminders] = useState<UpcomingReminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const seenRemindersRef = useRef<Set<string>>(new Set());

  // Poll for upcoming interviews every minute
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/video-interviews", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const interviews: any[] = data.interviews || [];
        const now = Date.now();

        interviews.forEach((iv) => {
          const minutesUntil = (new Date(iv.scheduledDate).getTime() - now) / 60000;
          if (minutesUntil > 0 && minutesUntil <= 15 && iv.status === "scheduled") {
            const key = `reminder-${iv._id || iv.id}`;
            if (!seenRemindersRef.current.has(key)) {
              seenRemindersRef.current.add(key);
              setReminders((prev) => [
                {
                  id: key,
                  interviewId: iv._id || iv.id,
                  title: "Interview Starting Soon",
                  message: `Your interview starts in ${Math.ceil(minutesUntil)} min`,
                  scheduledDate: iv.scheduledDate,
                  candidateName: iv.candidateName,
                  position: iv.position,
                  dismissed: false,
                },
                ...prev,
              ]);
            }
          }
        });
      } catch {
        // silent — non-critical feature
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismissReminder = (id: string) => {
    setReminders((prev) => prev.map((r) => r.id === id ? { ...r, dismissed: true } : r));
  };

  const handleJoinInterview = async (interviewId: string) => {
    try {
      const res = await fetch(`/api/video-interviews/${interviewId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "join" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/video-call/${data.roomId}?interviewId=${interviewId}&isHost=${data.isHost}&name=${encodeURIComponent(data.participantName || "User")}`);
      }
    } catch {
      // silent
    }
  };

  // Interview-specific notifications from the real DB
  const interviewNotifs = notifications.filter(
    (n) => n.type === "interview_scheduled" || n.type === "interview_feedback",
  );

  const activeReminders = reminders.filter((r) => !r.dismissed);
  const totalUnread = unreadCount + activeReminders.length;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "interview_scheduled": return "border-l-blue-500";
      case "interview_reminder": return "border-l-orange-500";
      default: return "border-l-gray-400";
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {totalUnread > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-600">
            {totalUnread > 9 ? "9+" : totalUnread}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[28rem] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
            <h3 className="font-semibold text-gray-900">Interview Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                  <Check className="w-3 h-3 mr-1" /> Mark all read
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setShowNotifications(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Upcoming reminders (local, generated from /api/video-interviews) */}
            {activeReminders.map((r) => (
              <div key={r.id} className="p-4 border-l-4 border-l-orange-500 bg-orange-50 hover:bg-orange-100 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Clock className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{r.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{r.message}</p>
                      {r.scheduledDate && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {format(new Date(r.scheduledDate), "MMM dd, yyyy 'at' hh:mm a")}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700"
                          onClick={() => handleJoinInterview(r.interviewId)}
                        >
                          <Video className="w-3 h-3 mr-1" /> Join Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => dismissReminder(r.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Real interview notifications from DB */}
            {interviewNotifs.map((n) => (
              <div
                key={n._id}
                className={`p-4 border-l-4 ${getTypeColor(n.type)} ${!n.read ? "bg-blue-50" : "bg-white"} hover:bg-gray-50 cursor-pointer transition-colors`}
                onClick={() => !n.read && markAsRead(n._id)}
              >
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(n.createdAt), "MMM dd, yyyy 'at' hh:mm a")}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />}
                </div>
              </div>
            ))}

            {activeReminders.length === 0 && interviewNotifs.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No interview notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
