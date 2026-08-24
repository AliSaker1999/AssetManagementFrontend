import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { AppNotification } from '../types';
import { notificationsApi } from '../api/notifications';
import { getAccessToken } from '../api/authToken';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Load initial notifications
  useEffect(() => {
    if (!getAccessToken()) return;

    notificationsApi.getAll()
      .then(r => setNotifications(r.data as AppNotification[]))
      .catch(() => {});

    // Build SignalR connection with token in query string (required for hub auth).
    // accessTokenFactory is called again on every connect and reconnect, so reading the
    // in-memory token here — rather than capturing it once — means a reconnect after a
    // rotation presents the current token instead of the expired one it started with.
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ReceiveNotification', (notif: AppNotification) => {
      setNotifications(prev => [notif, ...prev]);

      // Browser push toast (if permission granted)
      if (Notification.permission === 'granted') {
        new Notification(notif.type === 'Warranty' ? 'Warranty Alert' : 'Maintenance Alert', {
          body: notif.message,
          icon: '/favicon.ico',
        });
      }
    });

    connection.start().catch(() => {});
    connectionRef.current = connection;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => { connection.stop().catch(() => {}); };
  }, []);

  const markRead = useCallback(async (id: number) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.notifID === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // This provider wraps the whole authenticated shell and re-renders on every notification
  // that arrives over SignalR, so an unmemoised value object would push a re-render through
  // every consumer each time — including ones that only read markRead.
  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead }),
    [notifications, unreadCount, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}
