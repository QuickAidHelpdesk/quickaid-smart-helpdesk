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

  const wsRef = useRef<WebSocket | null>(null);
  const retryDelay = useRef(5000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await getNotifications(false);
      setNotifications(data.notifications);
    } catch {
      // silently fail — context will retry via WebSocket push
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const mergeIncoming = useCallback((incoming: Notification[]) => {
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.notification_id));
      const newOnes = incoming.filter((n) => !existingIds.has(n.notification_id));
      if (newOnes.length === 0) return prev;
      return [...newOnes, ...prev];
    });
  }, []);

  const connect = useCallback(() => {
    if (!user || typeof window === "undefined") return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${wsProtocol}//${window.location.host}/ws/notifications`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", email: user.email }));
      setIsConnected(true);
      retryDelay.current = 5000;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "notifications" && Array.isArray(msg.data)) {
          mergeIncoming(msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (user) {
        retryTimer.current = setTimeout(() => connect(), retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
      }
    };

    ws.onerror = () => ws.close();
  }, [user, mergeIncoming]);

  useEffect(() => {
    if (!user) {
      // Clean up on logout
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (retryTimer.current) clearTimeout(retryTimer.current);
      setNotifications([]);
      setIsConnected(false);
      return;
    }

    fetchAll();
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [user, fetchAll, connect]);

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
