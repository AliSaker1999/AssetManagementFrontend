import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams  } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import type { AssetListItem, AssetStatusCount, Employee, LeftEmployeeAsset, PaginatedResponse, StatusType } from '../types';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import TablePagination from '../components/ui/TablePagination';
import TransferAssetModal from '../components/TransferAssetModal';
import { useAuth } from '../contexts/AuthContext';
import { fmtDate } from '../utils/date';


const COLUMNS: { key: string; label: string }[] = [
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'employee', label: 'Employee' },
  { key: 'status', label: 'Status' },
  { key: 'barcode', label: 'Barcode' },
];

const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  code: 230,
  description: 230,
  category: 230,
  location: 230,
  employee: 230,
  status: 150,
  barcode: 230,
};

const COLUMN_MIN_WIDTHS: Record<string, number> = {
  code: 80,
  description: 100,
  category: 70,
  location: 90,
  employee: 100,
  status: 180, // fits the read-only status pill
  barcode: 50,
};

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

/**
 * The order of the status filter chips. The lookup returns statuses by StatusID, which is
 * the order they happened to be created in — Donated and Destroyed landed ahead of the
 * ones people filter by every day.
 *
 * Mirrors the grouping in the status-change dropdown on the asset detail page
 * (STATUS_MENU_GROUPS in AssetDetailPage.tsx): what's in use, what's sitting in stock,
 * then how it left — write-offs (destroyed, decommissioned, lost) before deliberate
 * hand-offs (sold, returned, donated) before transferred. Under Maintenance (8) is not
 * listed here — it's rendered separately, after a "|" divider, since it's a transient
 * state rather than something people filter by day to day.
 *
 * Ids missing from this list sort to the end by StatusID, so a status added to the
 * database later still appears in the filter instead of silently vanishing.
 */
const STATUS_FILTER_ORDER: number[] = [
  0,  // Active
  13, // Active/Remote Work
  12, // In Stock
  14, // Unreceived Stock
  3,  // Destroyed
  11, // Decommission
  6,  // Lost
  4,  // Sold
  7,  // Return To Supplier
  1,  // Donated
  2,  // Transferred
];

function byStatusFilterOrder(a: StatusType, b: StatusType): number {
  const ia = STATUS_FILTER_ORDER.indexOf(a.statusID);
  const ib = STATUS_FILTER_ORDER.indexOf(b.statusID);
  if (ia === -1 && ib === -1) return a.statusID - b.statusID;
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
const metricShapeCls = 'rounded-[14px] border-[#d5ddef] border-t-0 shadow-[inset_0_3px_0_0_#1f2b7b,0_1px_2px_rgba(15,23,42,0.06)]';

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconBarcode() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M13 5v14M17 5v14M21 5v14"/>
      <rect x="1" y="3" width="22" height="18" rx="2"/>
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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

// Export menu — downloads whatever the table is currently showing.
function ExportMenu({ busy, onExport }: { busy: boolean; onExport: (format: 'excel' | 'pdf') => void }) {
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


function StatusIcon({ statusId }: { statusId?: number }) {
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

function statusTone(statusId?: number) {
  if (statusId === 0 || statusId === 13) 
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (statusId === 3 || statusId === 11 || statusId === 6)
    return 'bg-rose-50 text-rose-700 border-rose-200';

  if (statusId === 4 || statusId === 1 || statusId === 7)
    return 'bg-amber-50 text-amber-700 border-amber-200';

  if (statusId === 2)
    return 'bg-sky-50 text-sky-700 border-sky-200';

  if (statusId === 12)
    return 'bg-blue-50 text-blue-700 border-blue-200';

  return 'bg-pearl-50 text-ink-700 border-pearl-200';
}

function statusFilterSelectedClass(statusId?: number) {
  if (statusId === 0 || statusId === 13) return 'bg-emerald-500 text-white border-emerald-500 shadow-sm';
  if (statusId === 3 || statusId === 11 || statusId === 6) return 'bg-rose-500 text-white border-rose-500 shadow-sm';
  if (statusId === 1 || statusId === 4 || statusId === 7) return 'bg-amber-500 text-white border-amber-500 shadow-sm';
  if (statusId === 2) return 'bg-sky-500 text-white border-sky-500 shadow-sm';
  if (statusId === 8 || statusId === 12 || statusId === 14) return 'bg-blue-500 text-white border-blue-500 shadow-sm';
  return 'bg-ink-600 text-white border-ink-600 shadow-sm';
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-pearl-200">
          <div className="h-3.5 bg-pearl-200 rounded w-24" />
          <div className="h-3.5 bg-pearl-200 rounded flex-1" />
          <div className="h-3.5 bg-pearl-200 rounded w-28" />
          <div className="h-3.5 bg-pearl-200 rounded w-28" />
          <div className="h-5 bg-pearl-200 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}


// ─── Leave Process ──────────────────────────────────────────────────────────

type LeaveEmployeeOption = {
  name: string;
  empId: string | null;
  assetCount: number;
  source: 'internal' | 'hr' | null;
  leaveDate?: string | null;
};

const LEAVE_ELIGIBLE_STATUS_IDS = new Set([0, 13, 10, 14]);
const LEAVE_STOCK_STATUS_ID = 12;
const LEAVE_PENDING_STATUS_ID = 14;

function IconLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function LeaveCheckbox({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0',
        checked
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'bg-white border-pearl-300 text-transparent hover:border-navy-400',
      )}
      aria-label={checked ? 'Deselect asset' : 'Select asset'}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
  );
}

function MarkAsLeftControl({
  empId,
  initialLeaveDate,
  onSaved,
}: {
  empId: string;
  initialLeaveDate: string | null;
  onSaved: (leaveDate: string | null) => void;
}) {
  const [date, setDate] = useState(initialLeaveDate ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function save(clear: boolean) {
    setSaving(true);
    try {
      const value = clear ? null : date;
      await lookupsApi.setEmployeeLeaveDate(Number(empId), value);
      toast.success(clear ? 'Leave date cleared' : 'Employee marked as left');
      onSaved(value);
    } catch (err) {
      handleApiError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
      <span className="text-[11px] font-semibold text-amber-700 shrink-0">
        {initialLeaveDate ? `Left on ${fmtDate(initialLeaveDate)}` : 'Not marked as left'}
      </span>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="input-base text-[12px] py-1 px-2 ml-auto"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => save(false)}
        className="text-[11px] font-semibold text-navy-600 hover:text-navy-700 shrink-0 disabled:opacity-50"
      >
        {initialLeaveDate ? 'Update' : 'Mark as Left'}
      </button>
      {initialLeaveDate && (
        <button
          type="button"
          disabled={saving}
          onClick={() => save(true)}
          className="text-[11px] font-semibold text-red-600 hover:text-red-700 shrink-0 disabled:opacity-50"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function LeaveSummaryTile({ label, value, color }: { label: string; value: number; color: 'green' | 'amber' }) {
  const bg = { green: 'bg-emerald-50 border-emerald-200', amber: 'bg-amber-50 border-amber-200' }[color];
  const text = { green: 'text-emerald-700', amber: 'text-amber-700' }[color];
  return (
    <div className={clsx('border rounded-lg px-4 py-3', bg)}>
      <p className="text-[11px] font-medium text-ink-400 mb-0.5">{label}</p>
      <p className={clsx('text-[22px] font-bold', text)}>{value.toLocaleString()}</p>
    </div>
  );
}

function LeaveProcessModal({
  allAssets,
  statuses,
  onClose,
  onLeaveOut,
  onAssetTransferred,
}: {
  allAssets: AssetListItem[] | null;
  statuses: StatusType[];
  onClose: () => void;
  onLeaveOut: (employeeName: string, eligibleAssets: AssetListItem[], selectedIds: Set<number>) => Promise<boolean>;
  /** Called after a mid-flow transfer (see transferAsset below) so the parent can drop the asset from its cache. */
  onAssetTransferred: (assetId: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<LeaveEmployeeOption | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [leftEmployees, setLeftEmployees] = useState<LeftEmployeeAsset[] | null>(null);
  const [internalEmployees, setInternalEmployees] = useState<Employee[] | null>(null);
  // An asset the user wants to redirect to someone else mid-leave-process — e.g. it was
  // physically handed to a different employee and the system was never updated. Handled
  // inline via TransferAssetModal so the leave flow doesn't have to be abandoned for it.
  const [transferAsset, setTransferAsset] = useState<AssetListItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    assetsApi.getLeftEmployees()
      .then((res) => { if (!cancelled) setLeftEmployees(res.data); })
      .catch(() => { if (!cancelled) setLeftEmployees([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    lookupsApi.getEmployees()
      .then((res) => { if (!cancelled) setInternalEmployees(res.data as Employee[]); })
      .catch(() => { if (!cancelled) setInternalEmployees([]); });
    return () => { cancelled = true; };
  }, []);

  const employeeOptions: LeaveEmployeeOption[] = (() => {
    if (!allAssets || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const map = new Map<string, LeaveEmployeeOption>();

    // Internal employees resolved from the canonical roster first — this doesn't depend on
    // server-side employeeName enrichment succeeding, so it can't silently drop internal employees.
    for (const emp of internalEmployees ?? []) {
      const name = emp.empFullName?.trim();
      const empId = String(emp.empIDUsedBy);
      const matchByName = !!name && name.toLowerCase().includes(q);
      const matchById = empId.toLowerCase().includes(q);
      if (!matchByName && !matchById) continue;
      const assetCount = allAssets.filter((a) => a.empIDUsedBy === emp.empIDUsedBy).length;
      if (assetCount === 0) continue;
      map.set(`internal:${empId}`, { name: name || empId, empId, assetCount, source: 'internal', leaveDate: emp.leaveDate ?? null });
    }

    for (const a of allAssets) {
      if (a.empIDUsedBy != null && map.has(`internal:${a.empIDUsedBy}`)) continue;
      const name = a.employeeName?.trim();
      const isInternal = a.empIDUsedBy != null;
      const empId = a.hrEmpIDUsedBy ?? (a.empIDUsedBy != null ? String(a.empIDUsedBy) : null);
      const source: LeaveEmployeeOption['source'] = empId == null ? null : isInternal ? 'internal' : 'hr';
      const matchByName = !!name && name.toLowerCase().includes(q);
      const matchById = !!empId && empId.toLowerCase().includes(q);
      if (!matchByName && !matchById) continue;

      const key = source && empId ? `${source}:${empId}` : (name?.toLowerCase() ?? '');
      const existing = map.get(key);
      if (existing) {
        existing.assetCount += 1;
        if (!existing.empId && empId) { existing.empId = empId; existing.source = source; }
      } else {
        map.set(key, { name: name ?? empId ?? '', empId, assetCount: 1, source });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 20);
  })();

  const eligibleAssets: AssetListItem[] = (() => {
    if (!allAssets || !selectedEmployee) return [];
    const selectedKey = selectedEmployee.name.trim().toLowerCase();
    const empId = selectedEmployee.empId;
    return allAssets.filter((a) => {
      if (!LEAVE_ELIGIBLE_STATUS_IDS.has(a.statusID ?? -1)) return false;
      if (selectedEmployee.source === 'internal' && empId) {
        return a.empIDUsedBy != null && String(a.empIDUsedBy) === empId;
      }
      if (selectedEmployee.source === 'hr' && empId) {
        return (a.hrEmpIDUsedBy?.trim().toLowerCase() ?? '') === empId.trim().toLowerCase();
      }
      return (a.employeeName?.trim().toLowerCase() ?? '') === selectedKey;
    });
  })();

  const pendingStatusName = statuses.find((s) => s.statusID === LEAVE_PENDING_STATUS_ID)?.status ?? `Status ${LEAVE_PENDING_STATUS_ID}`;
  const allSelected = eligibleAssets.length > 0 && selectedAssetIds.size === eligibleAssets.length;

  function selectEmployee(opt: LeaveEmployeeOption) {
    setSelectedEmployee(opt);
    setSelectedAssetIds(new Set());
    setQuery('');
  }

  function changeEmployee() {
    setSelectedEmployee(null);
    setSelectedAssetIds(new Set());
    setQuery('');
  }

  function toggleAsset(assetId: number) {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  function toggleAll() {
    setSelectedAssetIds(allSelected ? new Set() : new Set(eligibleAssets.map((a) => a.assetID)));
  }

  async function handleSubmit() {
    if (!selectedEmployee || eligibleAssets.length === 0) return;
    setSubmitting(true);
    try {
      const success = await onLeaveOut(selectedEmployee.name, eligibleAssets, selectedAssetIds);
      if (success) onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <IconLogout />
            </span>
            <h3 className="text-[15px] font-semibold text-navy-700">Leave Process</h3>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-800 p-1 rounded-md hover:bg-pearl-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!selectedEmployee ? (
            <>
              {!query.trim() && (
                <div>
                  <label className="text-[11px] font-semibold uppercase text-ink-300 mb-1.5 block">
                    Left Employees Still Holding Assets{leftEmployees ? ` (${leftEmployees.length})` : ''}
                  </label>
                  {leftEmployees === null ? (
                    <p className="text-[11px] text-ink-300">Loading…</p>
                  ) : leftEmployees.length === 0 ? (
                    <p className="text-[12px] text-ink-400 py-2">None — every left employee's assets have been processed.</p>
                  ) : (
                    <div className="border border-pearl-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto divide-y divide-pearl-100">
                      {leftEmployees.map((row) => (
                        <button
                          type="button"
                          key={`${row.source}-${row.companyID}-${row.empID}`}
                          onClick={() => selectEmployee({
                            name: row.fullName,
                            empId: row.empID,
                            assetCount: row.assets.length,
                            source: row.source === 'Internal' ? 'internal' : 'hr',
                            leaveDate: row.leaveDate ?? null,
                          })}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-pearl-50 transition-colors text-left"
                        >
                          <span className="min-w-0">
                            <span className="text-[13px] font-medium text-ink-700 truncate block">{row.fullName}</span>
                            <span className="text-[11px] text-ink-400">
                              {row.companyAbbreviation ?? `Company ${row.companyID}`} · Left {row.leaveDate ?? '—'}
                            </span>
                          </span>
                          <span className="text-[11px] text-ink-300 shrink-0">
                            {row.assets.length} asset{row.assets.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold uppercase text-ink-300 mb-1.5 block">Employee</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    className="input-base pl-8 w-full text-sm"
                    placeholder="Search employee by name…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                {allAssets === null && <p className="text-[11px] text-ink-300 mt-1.5">Loading asset data…</p>}
              </div>

              {query.trim() && (
                <div className="border border-pearl-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto divide-y divide-pearl-100">
                  {employeeOptions.length === 0 ? (
                    <p className="text-center text-ink-400 text-[13px] py-8">No matching employees</p>
                  ) : (
                    employeeOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.name}
                        onClick={() => selectEmployee(opt)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-pearl-50 transition-colors text-left"
                      >
                        <span className="text-[13px] font-medium text-ink-700 truncate">{opt.name}</span>
                        <span className="text-[11px] text-ink-300 shrink-0">
                          {opt.empId ? `ID ${opt.empId}` : 'No ID'} · {opt.assetCount} asset{opt.assetCount !== 1 ? 's' : ''}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* employee card */}
              <div className="bg-pearl-50 border border-pearl-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1">Employee</p>
                  <p className="text-[14px] font-semibold text-navy-700 truncate">{selectedEmployee.name}</p>
                  <p className="text-[12px] text-ink-500 mt-0.5">
                    {selectedEmployee.empId ? `EmpID: ${selectedEmployee.empId}` : 'No EmpID on record'}
                  </p>
                </div>
                <button type="button" onClick={changeEmployee} className="text-[11px] font-semibold text-navy-600 hover:text-navy-700 shrink-0">
                  Change
                </button>
              </div>

              {selectedEmployee.source === 'internal' && selectedEmployee.empId && (
                <MarkAsLeftControl
                  empId={selectedEmployee.empId}
                  initialLeaveDate={selectedEmployee.leaveDate ?? null}
                  onSaved={(leaveDate) => setSelectedEmployee((prev) => (prev ? { ...prev, leaveDate } : prev))}
                />
              )}

              {eligibleAssets.length === 0 ? (
                <p className="text-center text-ink-400 text-[13px] py-8">No eligible assets found for this employee</p>
              ) : (
                <>
                  {/* summary tiles */}
                  <div className="grid grid-cols-2 gap-2">
                    <LeaveSummaryTile label="Selected → In Stock" value={selectedAssetIds.size} color="green" />
                    <LeaveSummaryTile label={`Remaining → ${pendingStatusName}`} value={eligibleAssets.length - selectedAssetIds.size} color="amber" />
                  </div>

                  {/* asset list */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold uppercase text-ink-300">
                        Assets ({eligibleAssets.length})
                      </label>
                      <button type="button" onClick={toggleAll} className="text-[11px] font-semibold text-navy-600 hover:text-navy-700">
                        {allSelected ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="border border-pearl-200 rounded-lg divide-y divide-pearl-100 max-h-64 overflow-y-auto">
                      {eligibleAssets.map((a) => {
                        const checked = selectedAssetIds.has(a.assetID);
                        // category - description - brand - model - serial number
                        const identity = [a.category, a.assetDesc, a.brand, a.model, a.serialNumber]
                          .map((part) => part?.trim())
                          .filter(Boolean)
                          .join(' - ');
                        return (
                          <div
                            key={a.assetID}
                            className="flex items-start gap-3 px-4 py-2.5 hover:bg-pearl-50 transition-colors"
                          >
                            <LeaveCheckbox checked={checked} onClick={() => toggleAsset(a.assetID)} />
                            <div className="min-w-0 flex-1">
                              <p className="font-code text-[12px] font-semibold text-navy-700 truncate">{a.assetCode}</p>
                              <p className="text-[12px] text-ink-500 break-words">
                                {identity || '—'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[10px] font-semibold uppercase text-ink-300">
                                {a.status ?? statuses.find((s) => s.statusID === a.statusID)?.status ?? `Status ${a.statusID}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setTransferAsset(a)}
                                disabled={submitting}
                                title="Already handed to someone else? Transfer it directly instead of leaving it out."
                                className="text-[10px] font-semibold text-navy-600 hover:text-navy-700 disabled:opacity-50"
                              >
                                Transfer
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                    <svg className="mt-0.5 shrink-0 text-amber-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Selected assets move to <strong>In Stock</strong> with a leave note. Unselected assets move to <strong>{pendingStatusName}</strong>.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          {selectedEmployee && eligibleAssets.length > 0 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {submitting ? 'Processing…' : 'Leave Out'}
            </button>
          )}
        </div>
      </div>
    </div>

    {transferAsset && (
      <TransferAssetModal
        asset={{
          assetID: transferAsset.assetID,
          companyID: transferAsset.companyID,
          statusID: transferAsset.statusID,
        }}
        open
        onClose={() => setTransferAsset(null)}
        onTransferred={() => {
          const id = transferAsset.assetID;
          setTransferAsset(null);
          setSelectedAssetIds((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          onAssetTransferred(id);
        }}
        zIndexClassName="z-[110]"
      />
    )}
    </>
  );
}


export default function AssetsPage() {
  const { activeCompanyId, isAuditor } = useAuth();
  const readOnly = isAuditor();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  // Search now runs in SQL, so every keystroke would otherwise be a request with a
  // LIKE '%term%' scan behind it — typing "ABDALLAH" fired eight of them. `search` stays
  // bound to the input so typing feels instant; `debouncedSearch` is what the query uses.
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState<number>(() => Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState<number>(() => Number(searchParams.get('size')) || 10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAssetsCache, setAllAssetsCache] = useState<AssetListItem[] | null>(null);
  // One row per status, from SQL. null = not loaded yet, which is what the tiles show
  // their placeholder for.
  const [statusCounts, setStatusCounts] = useState<AssetStatusCount[] | null>(null);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const statusesLoadedRef = useRef(false);
  const [selectedStatusIds, setSelectedStatusIds] = useState<Set<number>>(() => {
    const raw = searchParams.get('status');
    return new Set(raw ? raw.split(',').map(Number).filter((n) => !Number.isNaN(n)) : []);
  });
  const [leaveProcessOpen, setLeaveProcessOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  // A column starts "fluid" — sized as minmax(min, weight fr) so the row always fills
  // whatever width the screen actually has (a 24" monitor and a 1366px laptop need
  // different pixel widths for the same table). DEFAULT_COLUMN_WIDTHS doubles as the fr
  // weight, preserving the relative proportions the fixed px values used to give. Dragging
  // a column's resize handle pins it to an explicit pixel width from then on — see
  // handleColumnResizeStart — since a manual choice should stick instead of being
  // reflowed away on the next resize.
  const [customizedColumns, setCustomizedColumns] = useState<Set<string>>(new Set());
  const gridTemplateColumns = COLUMNS.map((c) => customizedColumns.has(c.key)
    ? `${columnWidths[c.key]}px`
    : `minmax(${COLUMN_MIN_WIDTHS[c.key] ?? 60}px, ${DEFAULT_COLUMN_WIDTHS[c.key]}fr)`
  ).join(' ');

  // Handed to the detail page so "Back to Assets" returns to this exact view
  // (search, page, size and status filter all live in the query string).
  const listUrl = `/assets${searchParams.toString() ? `?${searchParams}` : ''}`;

  // Exports every asset matching the current view (company scope + search + status filter),
  // not just the assets on the visible page.
  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(true);
    try {
      await assetsApi.export({
        format,
        companyID: activeCompanyId ?? undefined,
        search: search.trim() || undefined,
        statusIDs: Array.from(selectedStatusIds),
      });
      toast.success(`${format === 'excel' ? 'Excel' : 'PDF'} downloaded`);
    } catch (err) {
      handleApiError(err, 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  function handleColumnResizeStart(key: string) {
    return (e: React.MouseEvent<HTMLSpanElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      // Read the column's actual rendered width rather than columnWidths[key]: an
      // untouched column is sized by the fr weight, not that stored default, so starting
      // from the stale number would snap the column to a different width the instant the
      // drag begins.
      const headerCell = e.currentTarget.parentElement as HTMLElement | null;
      const startWidth = headerCell?.getBoundingClientRect().width ?? columnWidths[key];
      const minWidth = COLUMN_MIN_WIDTHS[key] ?? 60;
      setCustomizedColumns((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setColumnWidths((prev) => ({ ...prev, [key]: Math.max(minWidth, startWidth + delta) }));
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none'; // stops text selection while dragging
    };
  }

  
  // Load status types once
  useEffect(() => {
    if (statusesLoadedRef.current) return;
    statusesLoadedRef.current = true;
    lookupsApi.getStatuses()
      .then((r) => setStatuses(r.data as StatusType[]))
      .catch(() => { /* non-critical */ });
  }, []);

  // 350ms after the last keystroke, not on each one.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // `search` only reads the URL's `q` once, on mount (see useState above), so a `q` that
  // shows up later — e.g. the command palette's "View all" link firing navigate() while
  // this page is already mounted — is otherwise silently ignored. Re-syncing here is a
  // no-op in the common case: the effect below writes `search` back to the same `q` it
  // came from, so this just reads back what it already matches.
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearch((prev) => (prev === q ? prev : q));
  }, [searchParams]);

  useEffect(() => {
    const next: Record<string, string> = {};
    if (search.trim()) next.q = search;
    if (pageNumber > 1) next.page = String(pageNumber);
    if (pageSize !== 10) next.size = String(pageSize);
    if (selectedStatusIds.size > 0) next.status = Array.from(selectedStatusIds).join(',');
    setSearchParams(next, { replace: true });
  }, [search, pageNumber, pageSize, selectedStatusIds]); // ✅ all four

const didMountRef = useRef(false);
const prevSearchRef = useRef(search);
const prevStatusRef = useRef(selectedStatusIds);
const prevCompanyRef = useRef(activeCompanyId);

useEffect(() => {
  if (!didMountRef.current) {
    didMountRef.current = true;
    prevSearchRef.current = search;
    prevStatusRef.current = selectedStatusIds;
    prevCompanyRef.current = activeCompanyId;
    return;
  }

  const searchChanged = search !== prevSearchRef.current;
  const statusChanged = selectedStatusIds !== prevStatusRef.current;
  const companyChanged =
    prevCompanyRef.current !== undefined &&
    prevCompanyRef.current !== null &&
    activeCompanyId !== prevCompanyRef.current;

  prevSearchRef.current = search;
  prevStatusRef.current = selectedStatusIds;
  prevCompanyRef.current = activeCompanyId;

  if (searchChanged || statusChanged || companyChanged) {
      setPageNumber(1);
    }
  }, [search, selectedStatusIds, activeCompanyId]);

  // The status tiles used to be counted in the browser from a download of every asset,
  // which is the request that times out on a slow link. /assets/status-counts returns
  // one row per status instead, so the tiles no longer depend on the full list.
  const loadStatusCounts = useCallback(async (notifyOnError = true, signal?: AbortSignal) => {
    try {
      const r = await assetsApi.getStatusCounts(activeCompanyId ?? undefined, signal);
      setStatusCounts(r.data);
    } catch (err) {
      // A cancelled request (unmount, company switch, or navigating away e.g. on logout)
      // is not a failure worth showing — and by the time it settles the toast would be
      // the only thing still on screen, since react-hot-toast renders outside this page.
      const name = (err as { name?: string })?.name;
      if (name === 'CanceledError' || name === 'AbortError') return;
      if (notifyOnError) handleApiError(err, 'Failed to load asset counts');
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setStatusCounts(null);
    // The full list is now only fetched for the leave-process modal, so it has to be
    // dropped here too or that modal would keep showing the previous company's assets.
    setAllAssetsCache(null);
    const controller = new AbortController();
    void loadStatusCounts(true, controller.signal);
    return () => controller.abort();
  }, [loadStatusCounts]);

  // Only the leave-process modal still needs every asset, so it is fetched when that
  // modal opens rather than on every visit to the page. The modal already renders a
  // "Loading asset data…" hint while allAssets is null.
  useEffect(() => {
    if (!leaveProcessOpen || allAssetsCache !== null) return;
    let cancelled = false;
    assetsApi.getList(activeCompanyId ?? undefined)
      .then((r) => { if (!cancelled) setAllAssetsCache(r.data as AssetListItem[]); })
      .catch((err) => { if (!cancelled) handleApiError(err, 'Failed to load asset data'); });
    return () => { cancelled = true; };
  }, [leaveProcessOpen, allAssetsCache, activeCompanyId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const loadData = async () => {
      try {
        const companyFilter = activeCompanyId ?? undefined;
        // Searching and status filtering used to download every asset and filter in the
        // browser. AT.stpAssetsListPaged applies both in SQL over the same nine columns,
        // so one page of rows comes back instead of the whole table.
        const response = await assetsApi.getListPaginated(
          pageNumber,
          pageSize,
          companyFilter,
          debouncedSearch.trim() || undefined,
          selectedStatusIds.size > 0 ? Array.from(selectedStatusIds) : undefined,
          controller.signal,
        );
        const data = response.data as PaginatedResponse<AssetListItem>;
        setAssets(data.data);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      } catch (error) {
        // axios reports a cancelled request as CanceledError; a bare fetch abort is
        // AbortError. Neither is a failure worth showing, and neither should clear the grid.
        const name = (error as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        handleApiError(error, 'Failed to load assets');
        setAssets([]);
      } finally {
        // A `return` in the catch above still runs this block, so an aborted request would
        // otherwise switch the spinner off while its replacement is still in flight.
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadData();
    return () => controller.abort();
  }, [pageNumber, pageSize, debouncedSearch, activeCompanyId, selectedStatusIds]);

  const handlePrevious = () => { if (pageNumber > 1) setPageNumber(pageNumber - 1); };
  const handleNext = () => { if (pageNumber < totalPages) setPageNumber(pageNumber + 1); };

  async function handleLeaveOut(
    employeeName: string,
    eligibleAssets: AssetListItem[],
    selectedIds: Set<number>
  ): Promise<boolean> {
    if (readOnly) return false;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await Promise.all(
        eligibleAssets.map((a) => {
          const isSelected = selectedIds.has(a.assetID);
          const newStatusId = isSelected ? LEAVE_STOCK_STATUS_ID : LEAVE_PENDING_STATUS_ID;
          const empId = a.hrEmpIDUsedBy ?? (a.empIDUsedBy != null ? String(a.empIDUsedBy) : '');
          const statusDesc = isSelected
            ? `Last Use by:${employeeName}, EmpID: ${empId}, Leave: ${today}`
            : null;

          return assetsApi.updateStatus(a.assetID, {
            assetStatusID: newStatusId,
            assetStatusDate: today,
            statusID: newStatusId,
            statusDate: today,
            statusContactID: null,
            statusSalePrice: 0,
            statusSaleCurCode: null,
            statusDesc,
            clearEmployeeLink: isSelected,
          });
        })
      );

      const resultMap = new Map<number, { statusID: number; status?: string; empIDUsedBy?: number; hrEmpIDUsedBy?: string | null; employeeName?: string | null }>();
      for (const a of eligibleAssets) {
        const isSelected = selectedIds.has(a.assetID);
        const newStatusId = isSelected ? LEAVE_STOCK_STATUS_ID : LEAVE_PENDING_STATUS_ID;
        resultMap.set(a.assetID, {
          statusID: newStatusId,
          status: statuses.find((s) => s.statusID === newStatusId)?.status,
          ...(isSelected ? { empIDUsedBy: undefined, hrEmpIDUsedBy: null, employeeName: null } : {}),
        });
      }

      setAssets((prev) => prev.map((a) => resultMap.has(a.assetID) ? { ...a, ...resultMap.get(a.assetID)! } : a));
      setAllAssetsCache((prev) =>
        prev ? prev.map((a) => resultMap.has(a.assetID) ? { ...a, ...resultMap.get(a.assetID)! } : a) : prev
      );
      void loadStatusCounts(false);

      toast.success('Leave process completed');
      return true;
    } catch (err) {
      handleApiError(err, 'Failed to complete leave process');
      return false;
    }
  }

  // A transfer inside the Leave Process modal moves the asset to a different employee
  // (possibly a different company) via TransferAssetModal, which returns no body — so
  // rather than guess the new owner, just drop the row. It'll come back with fresh data
  // next time allAssetsCache reloads (company switch, or reopening after a while).
  function handleAssetTransferredInLeaveProcess(assetId: number) {
    setAllAssetsCache((prev) => prev ? prev.filter((a) => a.assetID !== assetId) : prev);
  }

  const countForStatus = (statusId: number) =>
    (statusCounts ?? []).find((c) => c.statusID === statusId)?.assetCount ?? 0;
  const maintenanceCount = countForStatus(8);
  const instockCount = countForStatus(12);
  const activeCount = countForStatus(0);
  const countsLoading = statusCounts === null;

  return (
    <div>
      <PageHeader
        title="Assets List"
        subtitle={totalCount > 0 ? `${totalCount.toLocaleString()} assets across your organization` : undefined}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Assets' }]}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu busy={exporting} onExport={handleExport} />
            {!readOnly && (
              <>
                <button
                  type="button"
                  onClick={() => setLeaveProcessOpen(true)}
                  className="btn-secondary"
                >
                  <IconLogout />
                  Leave Process
                </button>
                <Link to="/assets/new" state={{ from: listUrl }} className="bg-[#9a7c4b] hover:bg-[#7d6339] btn-primary no-underline">
                  <IconPlus />
                  Add Asset
                </Link>
              </>
            )}
          </div>
        }
      />

      {/* Metric cards */}
      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Assets"
          value={loading ? '—' : totalCount.toLocaleString()}
          sub="in this view"
          accent="navy"
          className={metricShapeCls}
        />
          <MetricCard
        label="Active"
        value={countsLoading ? '—' : activeCount.toLocaleString()}
        sub="active status only"
        accent={activeCount > 0 ? 'success' : 'none'}
        className={metricShapeCls}
      />
      <MetricCard
        label="In Maintenance"
        value={countsLoading ? '—' : maintenanceCount.toLocaleString()}
        sub="currently"
        accent={maintenanceCount > 0 ? 'warning' : 'none'}
        className={metricShapeCls}
      />
        <MetricCard
          label="In Stock"
          value={countsLoading ? '—' : instockCount.toLocaleString()}
          sub="available for use"
          accent={instockCount > 0 ? 'percent' : 'none'}
          className={metricShapeCls}
        />
      </div>

      {/* Search + table */}
      <div className="px-4 sm:px-8 pb-8">
        {/* Search bar + status filter */}
        <div className="bg-white border border-pearl-200 rounded-xl p-4 mb-4 shadow-card">
          {/* Search input */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none">
              <IconSearch />
            </span>
            <input
              className="w-full max-w-xl pl-10 pr-4 py-2.5 text-sm bg-pearl-50 border border-pearl-200 rounded-lg
                         text-ink-800 placeholder:text-ink-300
                         focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20
                         transition-colors duration-150"
              placeholder="Search by code, description, category, location, employee, or barcode."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter chips */}
          {statuses.length > 0 && (
            <div className="mt-3 pt-3 border-t border-pearl-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300 pr-1 shrink-0">
                  Status
                </span>

                {/* All chip */}
                <button
                  type="button"
                  onClick={() => setSelectedStatusIds(new Set())}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                    selectedStatusIds.size === 0
                      ? 'bg-[#1f2b7b] text-white border-[#1f2b7b] shadow-sm'
                      : 'bg-white text-ink-400 border-pearl-200 hover:border-pearl-300 hover:bg-pearl-50 hover:text-ink-600'
                  )}
                >
                  All
                </button>

                {/* Per-status chips. .filter() already returns a new array, so sorting it
                    here does not mutate the statuses state. Under Maintenance (8) is a
                    transient state rather than something people filter by day to day, so
                    it renders after a "|" divider instead of inline with the rest. */}
                {(() => {
                  const statusChip = (s: StatusType) => {
                    const isSelected = selectedStatusIds.has(s.statusID);
                    return (
                      <button
                        key={s.statusID}
                        type="button"
                        onClick={() => {
                          setSelectedStatusIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(s.statusID)) next.delete(s.statusID);
                            else next.add(s.statusID);
                            return next;
                          });
                        }}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all duration-150',
                          isSelected
                            ? statusFilterSelectedClass(s.statusID)
                            : 'bg-white text-ink-400 border-pearl-200 hover:border-pearl-300 hover:bg-pearl-50 hover:text-ink-600'
                        )}
                      >
                        <span className="inline-flex w-3 h-3 items-center justify-center shrink-0">
                          <StatusIcon statusId={s.statusID} />
                        </span>
                        {s.status}
                      </button>
                    );
                  };

                  const visible = statuses.filter((s) => ![5, 9, 10].includes(s.statusID));
                  const mainStatuses = visible.filter((s) => s.statusID !== 8).sort(byStatusFilterOrder);
                  const maintenanceStatus = visible.find((s) => s.statusID === 8);

                  return (
                    <>
                      {mainStatuses.map(statusChip)}
                      {maintenanceStatus && (
                        <>
                          <span className="text-pearl-200 text-sm px-0.5 select-none" aria-hidden="true">|</span>
                          {statusChip(maintenanceStatus)}
                        </>
                      )}
                    </>
                  );
                })()}

                {/* Clear filters */}
                {selectedStatusIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatusIds(new Set())}
                    className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-ink-300 border border-transparent hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-colors"
                  >
                    <IconClose />
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Context hint */}
          {(search || selectedStatusIds.size > 0) && (
            <p className="text-[11px] text-ink-300 mt-2 ml-1">
              {search && selectedStatusIds.size > 0
                ? `Searching & filtering · ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : search
                ? `Searching all assets · ${totalCount} result${totalCount !== 1 ? 's' : ''}`
                : `Filtered by status · ${totalCount} result${totalCount !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="mb-3">
          <TablePagination
            summary={totalCount > 0
              ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount.toLocaleString()} assets`
              : 'No assets to display'}
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNumber(1);
            }}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onFirst={() => setPageNumber(1)}
            onLast={() => setPageNumber(totalPages)}
            onGoToPage={(page) => setPageNumber(page)}
            disabled={loading}
          />
        </div>

        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto ">
          {/* Table header */}
          <div className="grid  gap-0 bg-pearl-100 border-b border-pearl-200 px-5 py-2.5" style={{ gridTemplateColumns }}>
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={clsx(
                  'relative select-none text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300 pr-2',
                  col.key === 'barcode' && 'text-center'
                )}
              >
                {col.label}
                <span
                  onMouseDown={handleColumnResizeStart(col.key)}
                  className="absolute top-0 right-0 h-full w-2 cursor-col-resize hover:bg-navy-400/50 active:bg-navy-500/70 z-10"
                  style={{ transform: 'translateX(50%)' }}
                />
              </div>
            ))}
          </div>

          {loading ? (
            <TableSkeleton />
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-pearl-100 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9a9585" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <div className="text-[14px] font-semibold text-ink-600 mb-1">
                {search || selectedStatusIds.size > 0 ? 'No matching assets' : 'No assets yet'}
              </div>
              <div className="text-[12px] text-ink-300">
                {search
                  ? `No results for "${search}"`
                  : selectedStatusIds.size > 0
                  ? 'No assets match the selected status filter'
                  : 'Add your first asset to get started'}
              </div>
            </div>
          ) : (
            <div>
              {assets.map((a, idx) => (
                <div
                  key={a.assetID}
                  onClick={() => navigate(`/assets/${a.assetID}`, { state: { from: listUrl } })}
                  className={clsx(
                    'grid gap-0 px-5 py-3.5 items-center cursor-pointer',
                    'hover:bg-pearl-50 transition-colors duration-100',
                    idx < assets.length - 1 && 'border-b border-pearl-200'
                  )}
                  style={{ gridTemplateColumns }}
                >
                  {/* Code */}
                  <div className="font-code text-[12px] text-navy-600 font-medium min-w-0 truncate">{a.assetCode}</div>

                  {/* Description */}
                  <div className="text-[13px] text-ink-800 font-medium truncate pr-4 min-w-0" title={a.assetDesc ? a.assetDesc : undefined}>
                    {a.assetDesc ?? '—'}
                  </div>

                  {/* Category */}
                  <div className="text-[12px] text-ink-400 truncate pr-4 min-w-0">{a.category ?? '—'}</div>

                  {/* Location */}
                  <div
                    className="text-[12px] text-ink-400 truncate pr-4 min-w-0"
                    title={
                      a.location || a.floor || a.room
                        ? `${a.location ?? '—'}${a.floor ? ` · ${a.floor}` : ''}${a.room ? ` · ${a.room}` : ''}`
                        : undefined
                    }
                  >
                    {a.location ?? '—'}
                    {a.floor ? ` · ${a.floor}` : ''}
                    {a.room ? ` · ${a.room}` : ''}
                  </div>

                  {/* Employee */}
                  <div
                    className="text-[12px] text-ink-400 truncate pr-4 min-w-0"
                    title={a.employeeName ? (a.hrEmpIDUsedBy ? `${a.employeeName} – ${a.hrEmpIDUsedBy}` : a.employeeName) : undefined}
                  >
                    {a.employeeName ?? a.hrEmpIDUsedBy ?? a.empIDUsedBy?.toString() ?? '—'}
                  </div>

                  {/* Status — info only, not editable from this list. */}
                  <div className="pr-3 min-w-0 flex items-center gap-1.5">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold min-w-0',
                        statusTone(a.statusID)
                      )}
                    >
                      <span className="inline-flex items-center justify-center w-3 h-3 shrink-0">
                        <StatusIcon statusId={a.statusID} />
                      </span>
                      <span className="truncate">{a.status ?? (a.statusID != null ? `Status ${a.statusID}` : 'Active')}</span>
                    </span>
                    {a.statusID === 10 && (
                      <span className="text-[9px] font-bold text-amber-500 tracking-wide uppercase shrink-0">Locked</span>
                    )}
                  </div>

                  {/* Barcode action */}
                  <div className="flex items-center justify-center">
                    {a.barcodeNumber && (
                      <Link
                        to={`/assets/${a.assetID}?print=1`}
                        title="Print barcode"
                        className="text-ink-300 hover:text-navy-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconBarcode />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <TablePagination
          summary={totalCount > 0
            ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount.toLocaleString()} assets`
            : 'No assets to display'}
          pageNumber={pageNumber}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNumber(1);
          }}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onFirst={() => setPageNumber(1)}
          onLast={() => setPageNumber(totalPages)}
          onGoToPage={(page) => setPageNumber(page)}
          disabled={loading}
        />

      </div>

      {!readOnly && leaveProcessOpen && (
        <LeaveProcessModal
          allAssets={allAssetsCache}
          statuses={statuses}
          onClose={() => setLeaveProcessOpen(false)}
          onLeaveOut={handleLeaveOut}
          onAssetTransferred={handleAssetTransferredInLeaveProcess}
        />
      )}

    </div>
  );
}
