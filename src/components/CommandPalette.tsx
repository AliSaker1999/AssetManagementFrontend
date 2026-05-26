import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { assetsApi } from '../api/assets';
import type { AssetListItem } from '../types';

interface NavShortcut {
  label: string;
  to: string;
  icon: string;
}

const NAV_SHORTCUTS: NavShortcut[] = [
  { label: 'Assets', to: '/assets', icon: '⬡' },
  { label: 'Inventory', to: '/inventories', icon: '✓' },
  { label: 'Depreciation', to: '/depreciations', icon: '↘' },
  { label: 'Contacts', to: '/contacts', icon: '⊙' },
  { label: 'Settings', to: '/settings', icon: '⚙' },
  { label: 'Add New Asset', to: '/assets/new', icon: '+' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [allAssets, setAllAssets] = useState<AssetListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Refs so the window keydown listener always reads the latest values
  const cursorRef = useRef(0);
  const allResultsRef = useRef<{ type: 'nav' | 'asset'; label: string; sub: string; icon: string; id: string }[]>([]);
  const onCloseRef = useRef(onClose);
  const navigateRef = useRef(navigate);
  onCloseRef.current = onClose;
  navigateRef.current = navigate;

  // Load all assets once when palette opens
  useEffect(() => {
    if (!open) { setQuery(''); setCursor(0); return; }
    inputRef.current?.focus();
    if (allAssets !== null) return;
    setLoading(true);
    assetsApi.getList()
      .then((r) => setAllAssets(r.data as AssetListItem[]))
      .catch(() => setAllAssets([]))
      .finally(() => setLoading(false));
  }, [open]);

  // Filter results
  useEffect(() => {
    if (!query.trim() || !allAssets) { setAssets([]); return; }
    const q = query.toLowerCase();
    setAssets(
      allAssets
        .filter(
          (a) =>
            a.assetCode.toLowerCase().includes(q) ||
            a.assetDesc.toLowerCase().includes(q) ||
            (a.barcodeNumber ?? '').toLowerCase().includes(q) ||
            (a.category ?? '').toLowerCase().includes(q)
        )
        .slice(0, 8)
    );
    setCursor(0);
  }, [query, allAssets]);

  const filteredNav = query
    ? NAV_SHORTCUTS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : NAV_SHORTCUTS;

  const allResults = [
    ...filteredNav.map((n) => ({ type: 'nav' as const, label: n.label, sub: n.to, icon: n.icon, id: n.to })),
    ...assets.map((a) => ({ type: 'asset' as const, label: a.assetDesc, sub: a.assetCode, icon: '⬡', id: String(a.assetID) })),
  ];

  // Keep refs in sync with latest render values
  cursorRef.current = cursor;
  allResultsRef.current = allResults;

  // Global keyboard handler — works regardless of which element has focus
  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, allResultsRef.current.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = allResultsRef.current[cursorRef.current];
        if (!item) return;
        if (item.type === 'nav') navigateRef.current(item.id);
        else navigateRef.current(`/assets/${item.id}`);
        onCloseRef.current();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  function go(index: number) {
    const item = allResults[index];
    if (!item) return;
    if (item.type === 'nav') navigate(item.id);
    else navigate(`/assets/${item.id}`);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-card-lg border border-pearl-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-pearl-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9a9585" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search assets, navigate…"
            className="flex-1 text-[14px] text-ink-800 placeholder:text-ink-300 outline-none bg-transparent"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          )}
          <kbd className="text-[10px] text-ink-300 bg-pearl-100 border border-pearl-200 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1.5">
          {allResults.length === 0 && query && (
            <div className="px-4 py-8 text-center text-[13px] text-ink-300">No results for "{query}"</div>
          )}

          {!query && (
            <div className="px-4 pt-1.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Navigate</span>
            </div>
          )}

          {query && assets.length > 0 && filteredNav.length > 0 && (
            <div className="px-4 pt-1.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Pages</span>
            </div>
          )}

          {filteredNav.map((item, i) => (
            <button
              key={item.to}
              onMouseEnter={() => setCursor(i)}
              onClick={() => go(i)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                cursor === i ? 'bg-navy-100' : 'hover:bg-pearl-100'
              )}
            >
              <span className="w-7 h-7 rounded-lg bg-pearl-100 flex items-center justify-center text-[14px] shrink-0 text-ink-400">{item.icon}</span>
              <div>
                <div className="text-[13px] font-medium text-ink-800">{item.label}</div>
                <div className="text-[11px] text-ink-300">{item.to}</div>
              </div>
              <div className="ml-auto">
                <kbd className="text-[10px] text-ink-300 bg-pearl-100 border border-pearl-200 px-1.5 py-0.5 rounded font-mono">↵</kbd>
              </div>
            </button>
          ))}

          {assets.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Assets</span>
              </div>
              {assets.map((a, i) => {
                const idx = filteredNav.length + i;
                return (
                  <button
                    key={a.assetID}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(idx)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                      cursor === idx ? 'bg-navy-100' : 'hover:bg-pearl-100'
                    )}
                  >
                    <span className="w-7 h-7 rounded-lg bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink-800 truncate">{a.assetDesc}</div>
                      <div className="text-[11px] text-ink-300 font-code">{a.assetCode} · {a.category ?? ''}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-pearl-200 px-4 py-2 flex gap-4 text-[11px] text-ink-300">
          <span><kbd className="font-mono bg-pearl-100 border border-pearl-200 px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-pearl-100 border border-pearl-200 px-1 rounded">↵</kbd> open</span>
          <span><kbd className="font-mono bg-pearl-100 border border-pearl-200 px-1 rounded">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
