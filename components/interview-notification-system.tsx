"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Video, Calendar, Clock, X, Check } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

interface InterviewNotification {
  id: string;
  type:
    | "interview_scheduled"
    | "interview_reminder"
    | "interview_starting"
    | "interview_cancelled";
  title: string;
  message: string;
  interviewId: string;
  scheduledDate: string;
  candidateName?: string;
  position?: string;
  isRead: boolean;
  createdAt: string;
  actionRequired?: boolean;
}

export function InterviewNotificationSystem() {
  const [notifications, setNotifications] = useState<InterviewNotification[]>(
    []
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();

    // Set up polling for new notifications
    const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds

    // Set up interview reminders
    const reminderInterval = setInterval(checkUpcomingInterviews, 60000); // Check every minute

    return () => {
      clearInterval(interval);
      clearInterval(reminderInterval);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      // Mock notifications - replace with actual API call
      const mockNotifications: InterviewNotification[] = [
        {
          id: "1",
          type: "interview_scheduled",
          title: "New Interview Scheduled",
          message:
            "Interview with Sarah Johnson for Senior Frontend Developer position",
          interviewId: "interview-1",
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          candidateName: "Sarah Johnson",
          position: "Senior Frontend Developer",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRequired: false,
        },
        {
          id: "2",
          type: "interview_reminder",
          title: "Interview Starting Soon",
          message: "Your interview with Michael Chen starts in 15 minutes",
          interviewId: "interview-2",
          scheduledDate: new Date(Date.now() + 900000).toISOString(),
          candidateName: "Michael Chen",
          position: "Full Stack Engineer",
          isRead: false,
          createdAt: new Date().toISOString(),
          actionRequired: true,
        },
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const checkUpcomingInterviews = async () => {
    try {
      const response = await fetch("/api/video-interviews");
      if (response.ok) {
        const data = await response.json();
        const interviews = data.interviews || [];

        const now = new Date();
        const upcomingInterviews = interviews.filter((interview: any) => {
          const interviewTime = new Date(interview.scheduledDate);
          const timeDiff = interviewTime.getTime() - now.getTime();
          const minutesUntil = timeDiff / (1000 * 60);

          // Notify 15 minutes before
          return (
            minutesUntil > 0 &&
            minutesUntil <= 15 &&
            interview.status === "scheduled"
          );
        });

        // Create reminder notifications for upcoming interviews
        upcomingInterviews.forEach((interview: any) => {
          const existingReminder = notifications.find(
            (n) =>
              n.interviewId === interview.id && n.type === "interview_reminder"
          );

          if (!existingReminder) {
            const reminderNotification: InterviewNotification = {
              id: `reminder-${interview.id}`,
              type: "interview_reminder",
              title: "Interview Starting Soon",
              message: `Your interview starts in ${Math.ceil(
                (new Date(interview.scheduledDate).getTime() - now.getTime()) /
                  (1000 * 60)
              )} minutes`,
              interviewId: interview.id,
              scheduledDate: interview.scheduledDate,
              candidateName: interview.candidateName,
              position: interview.position,
              isRead: false,
              createdAt: new Date().toISOString(),
              actionRequired: true,
            };

            setNotifications((prev) => [reminderNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        });
      }
    } catch (error) {
      console.error("Error checking upcoming interviews:", error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    if (notification && !notification.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleJoinInterview = async (interviewId: string) => {
    try {
      const response = await fetch(`/api/video-interviews/${interviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "join" }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(
          `/video-call/${data.roomId}?interviewId=${interviewId}&isHost=${
            data.isHost
          }&name=${data.participantName || "User"}`
        );
      } else {
        console.error("Failed to join interview:", response.status);
      }
    } catch (error) {
      console.error("Error joining interview:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "interview_scheduled":
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case "interview_reminder":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "interview_starting":
        return <Video className="w-5 h-5 text-green-600" />;
      case "interview_cancelled":
        return <X className="w-5 h-5 text-red-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "interview_scheduled":
        return "border-l-blue-500";
      case "interview_reminder":
        return "border-l-orange-500";
      case "interview_starting":
        return "border-l-green-500";
      case "interview_cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-500";
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-600">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  <Check className="w-4 h-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-l-4 ${getNotificationColor(
                    notification.type
                  )} ${
                    !notification.isRead ? "bg-blue-50" : "bg-white"
                  } hover:bg-gray-50 transition-colors`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.scheduledDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            {format(
                              new Date(notification.scheduledDate),
                              "MMM dd, yyyy 'at' hh:mm a"
                            )}
                          </p>
                        )}

                        {notification.actionRequired && (
                          <div className="flex space-x-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleJoinInterview(notification.interviewId)
                              }
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Video className="w-3 h-3 mr-1" />
                              Join Now
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsRead(notification.id)}
                            >
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNotification(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
