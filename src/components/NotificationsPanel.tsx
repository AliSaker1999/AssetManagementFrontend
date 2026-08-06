import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useNotifications } from '../contexts/NotificationContext';
import type { AppNotification } from '../types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotifIcon({ type }: { type: AppNotification['type'] }) {
  return type === 'Warranty' ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

interface Props { onClose: () => void }

export default function NotificationsPanel({ onClose }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  async function handleClick(n: AppNotification) {
    if (!n.isRead) await markRead(n.notifID);
    navigate(`/assets/${n.assetID}`);
    onClose();
  }

  return (
    <div className="absolute right-0 top-9 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.18)] border border-[#e5e7eb] z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e7eb]">
        <span className="text-[13px] font-semibold text-[#111827]">
          Notifications {unreadCount > 0 && <span className="ml-1 text-[11px] text-[#9ca3af]">({unreadCount} unread)</span>}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="text-[11px] text-[#9a7c4b] hover:text-[#7d6339] font-medium cursor-pointer border-none bg-transparent"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[70vh] overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-[#9ca3af] text-center">No notifications</p>
        ) : (
          notifications.map(n => (
            <button
              key={n.notifID}
              onClick={() => handleClick(n)}
              className={clsx(
                'w-full text-left flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] cursor-pointer hover:bg-[#f9fafb] transition-colors border-none',
                !n.isRead && 'bg-[#fffbeb]'
              )}
            >
              <div className="mt-0.5 shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx('text-[12px] leading-snug text-[#374151] whitespace-pre-line break-words', !n.isRead && 'font-semibold')}>
                  {n.message}
                </p>
                <p className="mt-0.5 text-[11px] text-[#9ca3af]">{n.type} · {timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <div className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
