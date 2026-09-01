import { useEffect, useRef, useState } from 'react';

function IconChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function IconSheet() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

/** Export dropdown — downloads whatever the page's table is currently showing (its own filters/scope). */
export default function ExportMenu({ busy, onExport }: { busy: boolean; onExport: (format: 'excel' | 'pdf') => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <IconDownload />
        {busy ? 'Exporting…' : 'Export'}
        <IconChevronDown />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[190px] bg-white border border-pearl-200 rounded-xl shadow-xl p-1">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">
            Current view
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); onExport('excel'); }}
            className="w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-ink-700 hover:bg-pearl-50 transition-colors cursor-pointer bg-transparent border-none"
          >
            <IconSheet />
            Excel (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); onExport('pdf'); }}
            className="w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-ink-700 hover:bg-pearl-50 transition-colors cursor-pointer bg-transparent border-none"
          >
            <IconFileText />
            PDF (.pdf)
          </button>
        </div>
      )}
    </div>
  );
}
