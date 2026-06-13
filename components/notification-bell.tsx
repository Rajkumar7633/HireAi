"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useNotifications } from "@/hooks/use-notifications"
import { useSession } from "@/hooks/use-session"
import { formatDistanceToNow } from "date-fns"
import { getNotificationLink, getNotificationMeta } from "@/lib/notification-utils"

export function NotificationBell() {
  const router = useRouter()
  const { session } = useSession()
  const role = session?.role || session?.user?.role
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const recentNotifications = notifications.slice(0, 8)

  const handleOpen = async (notification: (typeof notifications)[0]) => {
    if (!notification.read) await markAsRead(notification._id)
    const href = getNotificationLink(notification, role)
    setIsOpen(false)
    if (href) router.push(href)
    else router.push("/dashboard/notifications")
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
          <div>
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <p className="text-xs font-normal text-muted-foreground mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1.5 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {recentNotifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No new notifications
          </div>
        ) : (
          <ScrollArea className="h-80">
            {recentNotifications.map(notification => {
              const meta = getNotificationMeta(notification.type)
              const Icon = meta.icon
              return (
                <DropdownMenuItem
                  key={notification._id}
                  className={`flex items-start gap-3 p-3 cursor-pointer rounded-none border-b last:border-0 ${
                    !notification.read ? "bg-purple-50/60" : ""
                  }`}
                  onClick={() => handleOpen(notification)}
                >
                  <div className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-medium truncate ${!notification.read ? "text-purple-900" : ""}`}>
                        {meta.label}
                      </p>
                      {!notification.read && <span className="h-2 w-2 bg-purple-600 rounded-full shrink-0" />}
                    </div>
                    <p className={`text-sm mt-0.5 line-clamp-2 ${!notification.read ? "font-medium" : "text-muted-foreground"}`}>
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </DropdownMenuItem>
              )
            })}
          </ScrollArea>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="p-0">
          <Link
            href="/dashboard/notifications"
            className="w-full text-center py-3 text-sm font-medium text-purple-700 hover:text-purple-900"
            onClick={() => setIsOpen(false)}
          >
            Open notification center
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
