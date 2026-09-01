/** Canonical per-status icon + color grouping, shared by AssetsPage, AssetDetailPage, and the Dashboard donut. */
export type StatusGroup = 'active' | 'destroyed' | 'sold' | 'transferred' | 'stock' | 'default';

export function statusGroup(statusId?: number): StatusGroup {
  if (statusId === 0 || statusId === 13) return 'active';
  if (statusId === 3 || statusId === 11 || statusId === 6) return 'destroyed';
  if (statusId === 4 || statusId === 1 || statusId === 7) return 'sold';
  if (statusId === 2) return 'transferred';
  if (statusId === 8 || statusId === 12 || statusId === 14) return 'stock';
  return 'default';
}

const TONE_CLASS: Record<StatusGroup, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  destroyed: 'bg-rose-50 text-rose-700 border-rose-200',
  sold: 'bg-amber-50 text-amber-700 border-amber-200',
  transferred: 'bg-sky-50 text-sky-700 border-sky-200',
  stock: 'bg-blue-50 text-blue-700 border-blue-200',
  default: 'bg-pearl-50 text-ink-700 border-pearl-200',
};

const SELECTED_CLASS: Record<StatusGroup, string> = {
  active: 'bg-emerald-500 text-white border-emerald-500 shadow-sm',
  destroyed: 'bg-rose-500 text-white border-rose-500 shadow-sm',
  sold: 'bg-amber-500 text-white border-amber-500 shadow-sm',
  transferred: 'bg-sky-500 text-white border-sky-500 shadow-sm',
  stock: 'bg-blue-500 text-white border-blue-500 shadow-sm',
  default: 'bg-ink-600 text-white border-ink-600 shadow-sm',
};

/** Hex fills for raw SVG contexts (e.g. the dashboard donut) where Tailwind classes don't apply. */
const HEX: Record<StatusGroup, string> = {
  active: '#10b981',
  destroyed: '#f43f5e',
  sold: '#f59e0b',
  transferred: '#0ea5e9',
  stock: '#3b82f6',
  default: '#9ca3af',
};

export const statusToneClass = (statusId?: number) => TONE_CLASS[statusGroup(statusId)];
export const statusFilterSelectedClass = (statusId?: number) => SELECTED_CLASS[statusGroup(statusId)];
export const statusColorHex = (statusId?: number) => HEX[statusGroup(statusId)];

export function StatusIcon({ statusId }: { statusId?: number }) {
  if (statusId === 0) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  if (statusId === 1) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    );
  }
  if (statusId === 2) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h10"/>
        <path d="M13 3l4 4-4 4"/>
        <path d="M17 17H7"/>
        <path d="M11 21l-4-4 4-4"/>
      </svg>
    );
  }
  if (statusId === 3) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/>
        <path d="m6 6 12 12"/>
      </svg>
    );
  }
  if (statusId === 4) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8"/>
        <path d="M10 9h3a2 2 0 1 1 0 4h-2a2 2 0 1 0 0 4h3"/>
      </svg>
    );
  }
  if (statusId === 6) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M7 7l8 8"/>
      </svg>
    );
  }
  if (statusId === 7) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 4 4 10l6 6"/>
        <path d="M20 20V8a4 4 0 0 0-4-4H4"/>
      </svg>
    );
  }
  if (statusId === 8) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16"/>
        <path d="M12 4v16"/>
      </svg>
    );
  }
  if (statusId === 11) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 1-2 2H5a2 2 0 0 1 0-4h14a2 2 0 0 1 2 2Z"/>
        <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z"/>
      </svg>
    );
  }
  if (statusId === 12) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/>
        <polyline points="3.3 7 12 12 20.7 7"/>
        <line x1="12" y1="22" x2="12" y2="12"/>
      </svg>
    );
  }

  if (statusId === 14) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="7" width="16" height="10" rx="2" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="12" y1="7" x2="12" y2="17" />
      </svg>
    );
  }

  if (statusId === 13) {
    return (
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 10.5L12 3l9 7.5"/>
        <path d="M5 9v11h14V9"/>
        <path d="M9 20v-6h6v6"/>
      </svg>
    );
  }

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4"/>
    </svg>
  );
}
