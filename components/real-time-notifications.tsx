"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  _id: string;
  type:
    | "assessment_assigned"
    | "assessment_completed"
    | "assessment_reminder"
    | "system";
  message: string;
  relatedEntity?: {
    id: string;
    type: string;
  };
  read: boolean;
  createdAt: string;
}

export default function RealTimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    // Set up polling for real-time updates
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.notifications || [];

        // Check for new notifications
        const newCount = newNotifications.length;
        if (newCount > unreadCount && unreadCount > 0) {
          toast({
            title: "New Notification",
            description: `You have ${
              newCount - unreadCount
            } new notification(s)`,
          });
        }

        setNotifications(newNotifications);
        setUnreadCount(newCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (notificationIds: string[]) => {
    try {
      setLoading(true);
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ notificationIds }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((n) => !notificationIds.includes(n._id))
        );
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "assessment_assigned":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "assessment_completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "assessment_reminder":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-80 z-50">
          <Card className="shadow-lg border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Notifications</CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        markAsRead(notifications.map((n) => n._id))
                      }
                      disabled={loading}
                      className="text-xs"
                    >
                      Mark all read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotifications(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No new notifications</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => markAsRead([notification._id])}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
