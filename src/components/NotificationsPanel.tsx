import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { NotifIcon, timeAgo } from './ui/NotificationDisplay';
import { handleApiError } from '../utils/errors';
import type { AppNotification } from '../types';

interface Props { onClose: () => void }

/**
 * Unread only — the queue of what still needs acting on. Read history lives behind
 * "View all" on /notifications, which is also where a row can be put back to unread.
 * Every row here is unread by construction, hence no per-row read/unread styling switch.
 */
export default function NotificationsPanel({ onClose }: Props) {
  const { unread, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleClick(n: AppNotification) {
    try {
      await markRead(n.notifID);
    } catch {
      /* navigate anyway — read state is not worth blocking the click over */
    }
    navigate(`/assets/${n.assetID}`);
    onClose();
  }

  /** Mark read in place — the row leaves the list and the panel stays open. */
  async function handleMarkRead(id: number) {
    setBusyId(id);
    try {
      await markRead(id);
    } catch (err) {
      handleApiError(err, 'Failed to mark the notification as read');
    } finally {
      setBusyId(null);
    }
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
        {unread.length === 0 ? (
          <p className="px-4 py-8 text-[13px] text-[#9ca3af] text-center">You are all caught up</p>
        ) : (
          unread.map(n => (
            /* A div, not a button: the row carries its own "mark as read" button, and a
               button inside a button is invalid markup that browsers resolve by dropping
               the inner one. role/tabIndex/onKeyDown restore what the <button> gave us. */
            <div
              key={n.notifID}
              role="button"
              tabIndex={0}
              onClick={() => handleClick(n)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void handleClick(n); }
              }}
              className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-[#f3f4f6] cursor-pointer hover:bg-[#f9fafb] transition-colors bg-[#fffbeb]"
            >
              <div className="mt-0.5 shrink-0">
                <NotifIcon type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] leading-snug text-[#374151] whitespace-pre-line break-words font-semibold">
                  {n.message}
                </p>
                <p className="mt-0.5 text-[11px] text-[#9ca3af]">{n.type} · {timeAgo(n.createdAt)}</p>
              </div>
              {/* Clears the row without leaving the panel. stopPropagation so the row's own
                  click does not fire and navigate to the asset underneath it. */}
              <button
                type="button"
                title="Mark as read"
                aria-label="Mark as read"
                disabled={busyId === n.notifID}
                onClick={e => { e.stopPropagation(); void handleMarkRead(n.notifID); }}
                className="mt-0.5 shrink-0 flex items-center justify-center w-5 h-5 rounded-full text-[#d1d5db] hover:text-[#15803d] hover:bg-[#dcfce7] disabled:opacity-40 transition-colors cursor-pointer border-none bg-transparent"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer — outside the scroll area so it stays put however long the list gets */}
      <div className="border-t border-[#e5e7eb] px-4 py-2.5 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-[12px] font-medium text-[#9a7c4b] hover:text-[#7d6339] no-underline"
        >
          View all
        </Link>
      </div>
    </div>
  );
}
