import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { assetsApi } from '../api/assets';
import { contactsApi } from '../api/contacts';
import { lookupsApi } from '../api/lookups';
import { getRecentAssets, type RecentAsset } from '../utils/recentAssets';
import type { AssetListItem, Employee, Contact, Company } from '../types';

interface NavShortcut {
  label: string;
  to: string;
  icon: string;
}

function IconPerson() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>
    </svg>
  );
}
function IconContact() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
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
  const [assetTotal, setAssetTotal] = useState(0);
  const [recentAssets, setRecentAssets] = useState<RecentAsset[]>([]);
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [contactResults, setContactResults] = useState<Contact[]>([]);
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Employees/Contacts/Companies have no server-side search endpoint (unlike Assets),
  // so — same as their own list pages already do — the full list is fetched once and
  // filtered in the browser from then on. Cached in refs, not state: nothing needs to
  // re-render when a cache is first populated, only when the filtered *results* change.
  const employeesCacheRef = useRef<Employee[] | null>(null);
  const contactsCacheRef = useRef<Contact[] | null>(null);
  const companiesCacheRef = useRef<Company[] | null>(null);

  // Refs so the window keydown listener always reads the latest values
  const cursorRef = useRef(0);
  const allResultsRef = useRef<{ type: 'nav' | 'asset' | 'view-all' | 'employee' | 'contact' | 'company'; label: string; sub: string; icon: string; id: string }[]>([]);
  const onCloseRef = useRef(onClose);
  const navigateRef = useRef(navigate);
  onCloseRef.current = onClose;
  navigateRef.current = navigate;

  useEffect(() => {
    if (!open) {
      setQuery(''); setCursor(0); setAssets([]); setAssetTotal(0);
      setEmployeeResults([]); setContactResults([]); setCompanyResults([]);
      return;
    }
    // Read fresh on every open rather than once on mount, so viewing an asset and
    // reopening the palette (Ctrl+K) shows it immediately.
    setRecentAssets(getRecentAssets());
    inputRef.current?.focus();
  }, [open]);

  // Asset search.
  //
  // This used to download every asset the user can see the first time the palette was
  // opened, then filter that array in the browser. AT.stpAssetsListPaged searches the same
  // columns in SQL, so asking for one page of 8 replaces the whole-table transfer — and the
  // results are no longer stale for assets added since the palette was first opened.
  //
  // Debounced because this fires per keystroke, and cancelled on each change so a slow
  // earlier response cannot overwrite the results for what is now in the box.
  useEffect(() => {
    if (!open || !query.trim()) {
      setAssets([]); setAssetTotal(0);
      setEmployeeResults([]); setContactResults([]); setCompanyResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      const q = query.trim().toLowerCase();
      try {
        const [assetRes, employeesList, contactsList, companiesList] = await Promise.all([
          assetsApi.getListPaginated(1, 10, undefined, query.trim(), undefined, controller.signal),
          employeesCacheRef.current
            ? Promise.resolve(employeesCacheRef.current)
            : lookupsApi.getEmployees().then((r) => (employeesCacheRef.current = r.data)),
          contactsCacheRef.current
            ? Promise.resolve(contactsCacheRef.current)
            : contactsApi.getList().then((r) => (contactsCacheRef.current = r.data as Contact[])),
          companiesCacheRef.current
            ? Promise.resolve(companiesCacheRef.current)
            : lookupsApi.getCompanies().then((r) => (companiesCacheRef.current = r.data as Company[])),
        ]);
        if (controller.signal.aborted) return;

        setAssets(assetRes.data.data.slice(0, 8));
        setAssetTotal(assetRes.data.totalCount);
        setEmployeeResults(employeesList.filter((e) => e.empFullName.toLowerCase().includes(q)).slice(0, 5));
        setContactResults(contactsList.filter((c) => c.contactName.toLowerCase().includes(q)).slice(0, 5));
        setCompanyResults(
          companiesList
            .filter((c) => c.companyName.toLowerCase().includes(q) || c.companyAbbreviation.toLowerCase().includes(q))
            .slice(0, 5)
        );
        setCursor(0);
      } catch (error) {
        const name = (error as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        setAssets([]); setAssetTotal(0);
        setEmployeeResults([]); setContactResults([]); setCompanyResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  // An empty box defaults to the 6 static nav links every time, which stops being useful
  // once someone has actually used the app — jumping back to an asset just looked at is a
  // far more common next step than jumping to Settings. Recents take over the empty state
  // once there are any; the nav links are still reachable by typing their name.
  const showRecents = !query && recentAssets.length > 0;

  const filteredNav = query
    ? NAV_SHORTCUTS.filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
    : showRecents ? [] : NAV_SHORTCUTS;

  const trimmedQuery = query.trim();
  const hasMoreAssets = assetTotal > assets.length;

  // Index offsets for the Employees/Contacts/Companies rows below — they render after
  // Nav, Assets/Recents and the optional "view all" row, in that order, matching allResults.
  const assetSectionCount = (showRecents ? recentAssets.length : assets.length) + (hasMoreAssets ? 1 : 0);
  const employeeStartIdx = filteredNav.length + assetSectionCount;
  const contactStartIdx = employeeStartIdx + employeeResults.length;
  const companyStartIdx = contactStartIdx + contactResults.length;

  const allResults = [
    ...filteredNav.map((n) => ({ type: 'nav' as const, label: n.label, sub: n.to, icon: n.icon, id: n.to })),
    ...(showRecents
      ? recentAssets.map((a) => ({ type: 'asset' as const, label: a.assetDesc, sub: a.assetCode, icon: '⬡', id: String(a.assetID) }))
      : assets.map((a) => ({ type: 'asset' as const, label: a.assetDesc, sub: a.assetCode, icon: '⬡', id: String(a.assetID) }))),
    ...(hasMoreAssets
      ? [{ type: 'view-all' as const, label: `View all ${assetTotal} results`, sub: `for "${trimmedQuery}"`, icon: '→', id: trimmedQuery }]
      : []),
    ...employeeResults.map((e) => ({ type: 'employee' as const, label: e.empFullName, sub: e.companyName ?? '', icon: '', id: String(e.empIDUsedBy) })),
    ...contactResults.map((c) => ({ type: 'contact' as const, label: c.contactName, sub: c.telephone1 || c.country || '', icon: '', id: String(c.contactID) })),
    ...companyResults.map((c) => ({ type: 'company' as const, label: c.companyName, sub: c.companyAbbreviation, icon: '', id: String(c.companyID) })),
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
        else if (item.type === 'asset') navigateRef.current(`/assets/${item.id}`);
        else if (item.type === 'view-all') navigateRef.current(`/assets?q=${encodeURIComponent(item.id)}`);
        else if (item.type === 'employee') navigateRef.current('/employees');
        else if (item.type === 'contact') navigateRef.current('/contacts');
        else navigateRef.current('/companies');
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
    else if (item.type === 'asset') navigate(`/assets/${item.id}`);
    else if (item.type === 'view-all') navigate(`/assets?q=${encodeURIComponent(item.id)}`);
    else if (item.type === 'employee') navigate('/employees');
    else if (item.type === 'contact') navigate('/contacts');
    else navigate('/companies');
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

          {!query && !showRecents && (
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

          {showRecents && (
            <>
              <div className="px-4 pt-1.5 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Recently Viewed</span>
              </div>
              {recentAssets.map((a, i) => (
                <button
                  key={a.assetID}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(i)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                    cursor === i ? 'bg-navy-100' : 'hover:bg-pearl-100'
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
              ))}
            </>
          )}

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

              {hasMoreAssets && (
                <button
                  onMouseEnter={() => setCursor(filteredNav.length + assets.length)}
                  onClick={() => go(filteredNav.length + assets.length)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                    cursor === filteredNav.length + assets.length ? 'bg-navy-100' : 'hover:bg-pearl-100'
                  )}
                >
                  <span className="w-7 h-7 rounded-lg bg-pearl-100 flex items-center justify-center text-[14px] shrink-0 text-ink-400">→</span>
                  <div>
                    <div className="text-[13px] font-medium text-navy-600">View all {assetTotal} results</div>
                    <div className="text-[11px] text-ink-300">for "{trimmedQuery}"</div>
                  </div>
                </button>
              )}
            </>
          )}

          {employeeResults.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Employees</span>
              </div>
              {employeeResults.map((e, i) => {
                const idx = employeeStartIdx + i;
                return (
                  <button
                    key={e.empIDUsedBy}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(idx)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                      cursor === idx ? 'bg-navy-100' : 'hover:bg-pearl-100'
                    )}
                  >
                    <span className="w-7 h-7 rounded-lg bg-pearl-100 flex items-center justify-center shrink-0"><IconPerson /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink-800 truncate">{e.empFullName}</div>
                      <div className="text-[11px] text-ink-300">{e.companyName ?? ''}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {contactResults.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Contacts</span>
              </div>
              {contactResults.map((c, i) => {
                const idx = contactStartIdx + i;
                return (
                  <button
                    key={c.contactID}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(idx)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                      cursor === idx ? 'bg-navy-100' : 'hover:bg-pearl-100'
                    )}
                  >
                    <span className="w-7 h-7 rounded-lg bg-pearl-100 flex items-center justify-center shrink-0"><IconContact /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink-800 truncate">{c.contactName}</div>
                      <div className="text-[11px] text-ink-300">{c.telephone1 || c.country || ''}</div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {companyResults.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Companies</span>
              </div>
              {companyResults.map((c, i) => {
                const idx = companyStartIdx + i;
                return (
                  <button
                    key={c.companyID}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(idx)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left cursor-pointer border-none bg-transparent transition-colors',
                      cursor === idx ? 'bg-navy-100' : 'hover:bg-pearl-100'
                    )}
                  >
                    <span className="w-7 h-7 rounded-lg bg-pearl-100 flex items-center justify-center shrink-0"><IconBuilding /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-ink-800 truncate">{c.companyName}</div>
                      <div className="text-[11px] text-ink-300">{c.companyAbbreviation}</div>
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
