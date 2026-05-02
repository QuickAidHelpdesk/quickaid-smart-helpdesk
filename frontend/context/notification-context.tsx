"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/auth-context";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api";
import type { Notification } from "@/types/notification";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  isConnected: false,
  isLoading: false,
  markAsRead: async () => {},
  markAllRead: async () => {},
  refetch: async () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const mergeIncoming = useCallback((incoming: Notification[]) => {
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.notification_id));
      const newOnes = incoming.filter((n) => !existingIds.has(n.notification_id));
      if (newOnes.length === 0) return prev;
      return [...newOnes, ...prev];
    });
  }, []);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getNotifications(false);
      setNotifications(data.notifications);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const pollUnread = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications(true);
      mergeIncoming(data.notifications);
    } catch {
      // silently fail — network errors are expected when backend is down
    }
  }, [user, mergeIncoming]);

  useEffect(() => {
    if (!user) {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      setNotifications([]);
      setIsConnected(false);
      return;
    }

    fetchAll();
    setIsConnected(true);
    pollInterval.current = setInterval(pollUnread, 15_000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      setIsConnected(false);
    };
  }, [user, fetchAll, pollUnread]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId ? { ...n, is_read: true } : n
          )
        );
      } catch {
        // ignore
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        isLoading,
        markAsRead,
        markAllRead,
        refetch: fetchAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
