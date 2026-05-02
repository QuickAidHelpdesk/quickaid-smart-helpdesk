"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { BellIcon, CheckCheckIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

import { useNotifications } from "@/context/notification-context";
import { NOTIFICATION_LABELS } from "@/types/notification";
import type { Notification } from "@/types/notification";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();

  function handleRowClick() {
    if (!notification.is_read) {
      onMarkRead(notification.notification_id);
    }
    if (notification.ticket_id) {
      router.push(`/tickets/${notification.ticket_id}`);
    }
  }

  return (
    <TableRow
      className={`transition-colors ${
        !notification.is_read
          ? "bg-muted/40 border-l-2 border-l-primary hover:bg-muted/60"
          : "hover:bg-muted/20"
      } ${notification.ticket_id ? "cursor-pointer" : ""}`}
      onClick={handleRowClick}
    >
      {/* Status dot */}
      <TableCell className="w-4 pl-4">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            !notification.is_read ? "bg-destructive" : "bg-muted-foreground/30"
          }`}
        />
      </TableCell>

      {/* Type */}
      <TableCell className="w-40">
        <span className="text-sm font-medium text-foreground">
          {NOTIFICATION_LABELS[notification.type] ?? notification.type}
        </span>
      </TableCell>

      {/* Message */}
      <TableCell className="max-w-xs">
        <span
          className="block truncate text-sm text-muted-foreground"
          title={notification.message}
        >
          {notification.message}
        </span>
      </TableCell>

      {/* Ticket link */}
      <TableCell className="w-32">
        {notification.ticket_id ? (
          <Link
            href={`/tickets/${notification.ticket_id}`}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {notification.ticket_id}
            <ExternalLinkIcon className="h-3 w-3" />
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      {/* Date */}
      <TableCell className="w-36 text-xs text-muted-foreground whitespace-nowrap">
        {format(new Date(notification.created_at), "MMM d, yyyy HH:mm")}
      </TableCell>

      {/* Action */}
      <TableCell className="w-24 text-right pr-4">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.notification_id);
            }}
          >
            Mark read
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

function NotificationsTable({
  notifications,
  isLoading,
  onMarkRead,
}: {
  notifications: Notification[];
  isLoading: boolean;
  onMarkRead: (id: string) => void;
}) {
  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-4" />
            <TableHead className="w-40">Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-32">Ticket</TableHead>
            <TableHead className="w-36">Date</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3].map((i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-2 w-2 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell><Skeleton className="h-4 w-64" /></TableCell>
              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (notifications.length === 0) {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-4" />
            <TableHead className="w-40">Type</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-32">Ticket</TableHead>
            <TableHead className="w-36">Date</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <BellIcon className="h-8 w-8 text-muted-foreground/40" />
                <span>No notifications yet.</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-4" />
          <TableHead className="w-40">Type</TableHead>
          <TableHead>Message</TableHead>
          <TableHead className="w-32">Ticket</TableHead>
          <TableHead className="w-36">Date</TableHead>
          <TableHead className="w-24" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {notifications.map((n) => (
          <NotificationRow
            key={n.notification_id}
            notification={n}
            onMarkRead={onMarkRead}
          />
        ))}
      </TableBody>
    </Table>
  );
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllRead } =
    useNotifications();
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");

  const displayed =
    activeTab === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 p-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay up to date with your tickets and activity.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={unreadCount === 0}
            onClick={markAllRead}
            className="gap-2"
          >
            <CheckCheckIcon className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        {/* Main card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">All Notifications</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs px-2 py-0.5">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <CardDescription>
              Click a row to navigate to the related ticket.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "all" | "unread")}
              className="w-full"
            >
              <div className="px-6 pb-2">
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs">
                    All ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs">
                    Unread ({unreadCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0">
                <NotificationsTable
                  notifications={displayed}
                  isLoading={isLoading}
                  onMarkRead={markAsRead}
                />
              </TabsContent>
              <TabsContent value="unread" className="mt-0">
                <NotificationsTable
                  notifications={displayed}
                  isLoading={isLoading}
                  onMarkRead={markAsRead}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
