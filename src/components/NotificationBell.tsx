import { useRef, useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationsPanel from './NotificationsPanel';
import { useOnClickOutside } from '../hooks/useOnClickOutside';

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Notifications"
        className="relative flex items-center justify-center w-7 h-7 rounded-full text-navy-300 hover:text-white hover:bg-navy-700 transition-colors cursor-pointer border-none bg-transparent"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationsPanel onClose={() => setOpen(false)} />}
    </div>
  );
}
