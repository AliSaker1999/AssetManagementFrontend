import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { AppNotification } from '../types';
import { notificationsApi } from '../api/notifications';
import { getAccessToken } from '../api/authToken';

/**
 * The bell's store, and it holds UNREAD ONLY.
 *
 * The dropdown is the queue of things still to act on; the full history lives on the
 * /notifications page, which does its own paged fetching and does not read this list.
 *
 * unreadCount comes from the server, not from `unread.length`. The list is capped
 * (UNREAD_PAGE_SIZE) so a user who has let hundreds pile up still gets a truthful badge,
 * and marking one read does not have to guess whether a hidden row took its place.
 */
const UNREAD_PAGE_SIZE = 200;

interface NotificationContextValue {
  unread: AppNotification[];
  unreadCount: number;
  markRead: (id: number) => Promise<void>;
  markUnread: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  refreshUnread: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unread, setUnread] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const r = await notificationsApi.getList({ status: 'unread', pageSize: UNREAD_PAGE_SIZE });
      setUnread(r.data.items);
      setUnreadCount(r.data.totalCount);
    } catch {
      /* leave the last known list in place */
    }
  }, []);

  // Load initial notifications
  useEffect(() => {
    if (!getAccessToken()) return;

    refreshUnread();

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
      setUnread(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Browser push toast (if permission granted)
      if (Notification.permission === 'granted') {
        new Notification(notif.type === 'Warranty' ? 'Warranty Alert' : 'Maintenance Alert', {
          body: notif.message,
          icon: '/favicon.ico',
        });
      }
    });

    // Anything raised while the socket was down was never pushed and is not coming — the
    // hub replays nothing. Without this catch-up the badge stays stale until a full reload.
    connection.onreconnected(() => { refreshUnread(); });

    connection.start().catch(() => {});
    connectionRef.current = connection;

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    return () => { connection.stop().catch(() => {}); };
  }, [refreshUnread]);

  // Only ever called for a row that is currently unread (both surfaces offer "mark read"
  // on unread rows only), so the count always moves — even when the row itself is past
  // UNREAD_PAGE_SIZE and so was never in the local list to filter out.
  const markRead = useCallback(async (id: number) => {
    await notificationsApi.markRead(id);
    setUnread(prev => prev.filter(n => n.notifID !== id));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  // The row is not in `unread` (it was read), and where it belongs in CreatedAt order is
  // the server's call — so refetch rather than splice a guess into the list.
  const markUnread = useCallback(async (id: number) => {
    await notificationsApi.markUnread(id);
    await refreshUnread();
  }, [refreshUnread]);

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setUnread([]);
    setUnreadCount(0);
  }, []);

  // This provider wraps the whole authenticated shell and re-renders on every notification
  // that arrives over SignalR, so an unmemoised value object would push a re-render through
  // every consumer each time — including ones that only read markRead.
  const value = useMemo(
    () => ({ unread, unreadCount, markRead, markUnread, markAllRead, refreshUnread }),
    [unread, unreadCount, markRead, markUnread, markAllRead, refreshUnread],
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
