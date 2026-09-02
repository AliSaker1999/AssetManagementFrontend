import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { handleApiError } from '../utils/errors';
import { dashboardApi } from '../api/dashboard';
import type { DashboardSummary } from '../types';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import DonutChart from '../components/ui/DonutChart';
import RankedBars from '../components/ui/RankedBars';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCountUp } from '../hooks/useCountUp';
import { fmtDate } from '../utils/date';
import { kindPillClass, categoryPillClass, categoryLabel } from '../components/ui/AttentionPills';

const TREND_MONTHS = 12;
const PULSE_DURATION_MS = 2000;
const COUNTRY_PREVIEW_LIMIT = 5;
const COMPANY_PREVIEW_LIMIT = 5;
const ATTENTION_PREVIEW_LIMIT = 3;

// Shared fixed height (px) for the "Assets by Status" / "Assets by Country" / "Needs Attention"
// cards so they line up exactly regardless of how much content each one has. Edit this number
// to make all three taller or shorter.
const EQUAL_CARD_HEIGHT = 301;

function IconBox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z" />
      <polyline points="3.3 7 12 12 20.7 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 9 11 13 15 21 6" />
      <polyline points="14 6 21 6 21 13" />
    </svg>
  );
}

function IconWrench() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.6 4.9l-6.6 6.6a2 2 0 1 0 2.8 2.8l6.6-6.6a4 4 0 0 0 4.9-5.6l-2.8 2.8-2.1-2.1z" />
    </svg>
  );
}

function IconAlertTriangle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconClipboardList({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function IconCoins() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="9" cy="7" rx="6.5" ry="4" />
      <path d="M2.5 7v6c0 2.2 2.9 4 6.5 4s6.5-1.8 6.5-4V7" />
      <path d="M15.5 9.5c2.7.4 4.5 1.7 4.5 3.5 0 2.2-2.9 4-6.5 4-1.6 0-3-.3-4.2-.9" />
      <path d="M2.5 10.5c0 2.2 2.9 4 6.5 4" />
    </svg>
  );
}

function ViewAllLink({ to, label = 'View all' }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="px-3 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 transition-colors rounded-lg no-underline whitespace-nowrap"
    >
      {label}
    </Link>
  );
}

export default function DashboardPage() {
  const { activeCompanyId, isAdmin, allowedCompanies, setActiveCompanyId } = useAuth();
  const { unread } = useNotifications();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pulse, setPulse] = useState(false);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const lastNotifIdRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await dashboardApi.getSummary(activeCompanyId ?? undefined, TREND_MONTHS, signal);
      setSummary(r.data);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'CanceledError' || name === 'AbortError') return;
      handleApiError(err, 'Failed to load dashboard');
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setSummary(null);
    setSelectedCountryId(null);
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

  useEffect(() => {
    if (unread.length === 0) return;
    const latest = unread[0];
    if (lastNotifIdRef.current === null) {
      lastNotifIdRef.current = latest.notifID;
      return;
    }
    // Compared with > , not !== : the bell list now drops rows as they are marked read, so
    // its head moves backwards too. NotifID is an identity column, so only a larger one is
    // genuinely new — anything else is the list shrinking and must not pulse the dashboard.
    if (latest.notifID <= lastNotifIdRef.current) return;
    lastNotifIdRef.current = latest.notifID;

    setPulse(true);
    void loadSummary();
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), PULSE_DURATION_MS);
  }, [unread, loadSummary]);

  useEffect(() => () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  }, []);

  const loading = summary === null;
  const statusCounts = summary?.statusCounts ?? [];
  const attentionPreview = summary?.attentionPreview ?? [];
  const countryCounts = summary?.countryCounts ?? [];
  const companyCounts = (summary?.companyCounts ?? [])
    .filter((c) => selectedCountryId == null || c.countryID === selectedCountryId);
  const companyOperations = summary?.companyOperations ?? [];
  const openInventories = summary?.openInventories ?? [];

  // System-wide "last" figures: whichever company's run/session is the most recent one,
  // out of the per-company snapshot the API already computed. ISO date strings ("yyyy-MM-dd")
  // sort correctly with plain string comparison, so no Date parsing is needed here.
  const lastDepreciation = companyOperations.reduce<typeof companyOperations[number] | null>((best, c) => {
    if (!c.lastDepreciationDate) return best;
    if (!best?.lastDepreciationDate || c.lastDepreciationDate > best.lastDepreciationDate) return c;
    return best;
  }, null);
  const lastInventory = companyOperations.reduce<typeof companyOperations[number] | null>((best, c) => {
    if (!c.lastInventoryStartDate) return best;
    if (!best?.lastInventoryStartDate || c.lastInventoryStartDate > best.lastInventoryStartDate) return c;
    return best;
  }, null);
  const lastInventoryIsOpen = lastInventory != null
    && lastInventory.lastInventoryStartDate != null
    && lastInventory.lastInventoryEndDate == null;

  const totalAssets = statusCounts.reduce((sum, c) => sum + c.assetCount, 0);
  const activeCount = statusCounts.find((c) => c.statusID === 0)?.assetCount ?? 0;
  const maintenanceCount = statusCounts.find((c) => c.statusID === 8)?.assetCount ?? 0;
  const needsAttentionCount = summary?.totalAttentionCount ?? 0;
  const assetCountStartOfMonth = summary?.assetCountStartOfMonth ?? 0;

  const animatedTotal = useCountUp(totalAssets);
  const animatedActive = useCountUp(activeCount);
  const animatedMaintenance = useCountUp(maintenanceCount);
  const animatedAttention = useCountUp(needsAttentionCount);

  const totalAssetsTrendPct = assetCountStartOfMonth > 0
    ? ((totalAssets - assetCountStartOfMonth) / assetCountStartOfMonth) * 100
    : null;
  const pct = (n: number) => (totalAssets > 0 ? (n / totalAssets) * 100 : 0);

  const showBreakdown = isAdmin() || allowedCompanies.length > 1;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Fleet overview across your organization" />

      {/* Top Metric Cards Row (Styled like Image 2) */}
      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pearl-100 flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <IconBox />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">Total Assets</div>
            <div className="text-2xl font-extrabold text-ink-900 leading-tight">
              {loading ? '—' : animatedTotal.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-emerald-500 flex items-center gap-0.5 mt-0.5">
              {loading ? undefined : totalAssetsTrendPct == null
                ? 'New this month'
                : `${totalAssetsTrendPct >= 0 ? '+' : ''}${totalAssetsTrendPct.toFixed(1)}% from last month ↗`}
            </div>
          </div>
        </div>

        {/* Active Assets */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pearl-100 flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <IconTrendUp />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">Active Assets</div>
            <div className="text-2xl font-extrabold text-ink-900 leading-tight">
              {loading ? '—' : animatedActive.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-ink-400 mt-0.5">
              {loading ? undefined : `${pct(activeCount).toFixed(1)}% of total assets`}
            </div>
          </div>
        </div>

        {/* In Maintenance */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-pearl-100 flex items-center gap-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <IconWrench />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">In Maintenance</div>
            <div className="text-2xl font-extrabold text-ink-900 leading-tight">
              {loading ? '—' : animatedMaintenance.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-ink-400 mt-0.5">
              {loading ? undefined : `${pct(maintenanceCount).toFixed(1)}% of total assets`}
            </div>
          </div>
        </div>

        {/* Needs Attention */}
        <div className={clsx(
          "bg-white rounded-2xl p-4 shadow-sm border border-pearl-100 flex items-center gap-4",
          pulse && 'ring-2 ring-gold-400 transition-shadow duration-700'
        )}>
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
            <IconAlertTriangle />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">Needs Attention</div>
            <div className="text-2xl font-extrabold text-ink-900 leading-tight">
              {loading ? '—' : animatedAttention.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-ink-400 mt-0.5">
              {loading ? undefined : `${pct(needsAttentionCount).toFixed(2)}% of total assets`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Cards Grid */}
      <div className="px-4 sm:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        {/* Assets by Status */}
        <SectionCard title="Assets by Status" height={EQUAL_CARD_HEIGHT}>
          <DonutChart
            data={statusCounts.map((c) => ({ id: c.statusID ?? undefined, label: c.status ?? 'Unknown', value: c.assetCount }))}
            emptyMessage={loading ? 'Loading…' : 'No assets to show.'}
            onItemClick={(d) => { if (d.id != null) navigate(`/assets?status=${d.id}`); }}
          />
          <div className="mt-4 pt-3 border-t border-pearl-100 text-center">
            <Link to="/assets" className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors no-underline inline-flex items-center gap-1">
              View all assets →
            </Link>
          </div>
        </SectionCard>

        {/* Assets by Country */}
        {showBreakdown && (
          <SectionCard
            title="Assets by Country"
            actions={<ViewAllLink to="/dashboard/countries" label="View all" />}
            height={EQUAL_CARD_HEIGHT}
          >
            <RankedBars
              data={countryCounts.slice(0, COUNTRY_PREVIEW_LIMIT).map((c) => ({
                id: c.countryID,
                label: c.country,
                value: c.assetCount,
                selected: c.countryID === selectedCountryId,
              }))}
              emptyMessage={loading ? 'Loading…' : 'No assets to show.'}
              onItemClick={(d) => {
                if (d.id == null) return;
                const id = String(d.id);
                setSelectedCountryId((prev) => (prev === id ? null : id));
              }}
            />
          </SectionCard>
        )}

        {/* Needs Attention */}
        <SectionCard
          title="Needs Attention"
          actions={<ViewAllLink to="/dashboard/attention" label="View all" />}
          className={clsx(pulse && 'ring-2 ring-gold-400 transition-shadow duration-700')}
          height={EQUAL_CARD_HEIGHT}
        >
          {loading ? (
            <div className="text-center text-[13px] text-ink-300 py-6">Loading…</div>
          ) : attentionPreview.length === 0 ? (
            <div className="text-center text-[13px] text-ink-300 py-6">Nothing needs attention right now.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {attentionPreview.slice(0, ATTENTION_PREVIEW_LIMIT).map((item) => (
                <Link
                  key={`${item.entityType}-${item.entityID}`}
                  to={`/assets/${item.assetID}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-200/50 bg-amber-50/20 hover:bg-amber-100/40 transition-colors no-underline"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className={clsx('px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide shrink-0', kindPillClass(item.entityType))}>
                      {item.entityType}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-ink-800 truncate">
                        {item.assetCode} · {item.assetDesc}
                      </div>
                      <div className="text-[11px] text-ink-400 truncate mt-0.5">
                        {item.description ?? item.entityType} · {item.companyAbbreviation}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="num text-[11px] text-ink-400">{fmtDate(item.toDate)}</span>
                    <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap', categoryPillClass(item.category))}>
                      {categoryLabel(item.category)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-pearl-100 text-center">
            <Link to="/dashboard/attention" className="text-[12px] font-medium text-blue-600 hover:text-blue-800 transition-colors no-underline inline-flex items-center gap-1">
              View all issues →
            </Link>
          </div>
        </SectionCard>

        {/* Assets by Company */}
        {showBreakdown && (
          <SectionCard
            title="Assets by Company"
            className="md:col-span-2 xl:col-span-3"
            subtitle={selectedCountryId != null
              ? countryCounts.find((c) => c.countryID === selectedCountryId)?.country
              : undefined}
            actions={
              <div className="flex items-center gap-3">
                {selectedCountryId != null && (
                  <button
                    type="button"
                    onClick={() => setSelectedCountryId(null)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Clear filter
                  </button>
                )}
                <ViewAllLink to="/dashboard/companies" label="View all companies" />
              </div>
            }
          >
            <RankedBars
              data={companyCounts.slice(0, COMPANY_PREVIEW_LIMIT).map((c) => ({
                id: c.companyID,
                label: c.companyAbbreviation,
                value: c.assetCount,
                badge: c.countryID,
                sublabel: c.companyName,
              }))}
              emptyMessage={loading ? 'Loading…' : 'No assets to show.'}
              onItemClick={(d) => {
                if (d.id == null) return;
                setActiveCompanyId(Number(d.id));
                navigate('/assets');
              }}
            />
            {companyCounts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-pearl-100 text-[12px] text-ink-400 text-center flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Showing top {Math.min(COMPANY_PREVIEW_LIMIT, companyCounts.length)} of {companyCounts.length} companies
              </div>
            )}
          </SectionCard>
        )}

        {/* Depreciation & Inventory */}
        <SectionCard
          title="Depreciation & Inventory"
          subtitle="System-wide last run, and any inventory sessions still open"
          className="md:col-span-2 xl:col-span-3"
          actions={<ViewAllLink to="/dashboard/operations" label="View all companies" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Last Depreciation (system-wide) */}
            <button
              type="button"
              disabled={lastDepreciation == null}
              onClick={() => { if (lastDepreciation) { setActiveCompanyId(lastDepreciation.companyID); navigate('/depreciations'); } }}
              className={clsx(
                'rounded-2xl border border-pearl-100 p-4 flex items-center gap-4 text-left transition-colors',
                lastDepreciation ? 'hover:bg-pearl-50 cursor-pointer' : 'cursor-default'
              )}
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gold-500 text-white flex items-center justify-center shadow-sm">
                <IconCoins />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">Last Depreciation</div>
                <div className="num text-xl font-extrabold text-ink-900 leading-tight">
                  {loading ? '—' : lastDepreciation ? fmtDate(lastDepreciation.lastDepreciationDate) : 'Never'}
                </div>
                <div className="text-[11px] font-medium text-ink-400 mt-0.5 truncate">
                  {loading ? undefined : lastDepreciation
                    ? `${lastDepreciation.companyAbbreviation} · ${lastDepreciation.companyName}`
                    : 'No depreciation runs yet'}
                </div>
              </div>
            </button>

            {/* Last Inventory (system-wide) */}
            <button
              type="button"
              disabled={lastInventory == null}
              onClick={() => { if (lastInventory) { setActiveCompanyId(lastInventory.companyID); navigate('/inventories'); } }}
              className={clsx(
                'rounded-2xl border border-pearl-100 p-4 flex items-center gap-4 text-left transition-colors',
                lastInventory ? 'hover:bg-pearl-50 cursor-pointer' : 'cursor-default'
              )}
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-navy-600 text-white flex items-center justify-center shadow-sm">
                <IconClipboardList size={20} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">Last Inventory</div>
                <div className="flex items-center gap-2">
                  <div className="num text-xl font-extrabold text-ink-900 leading-tight">
                    {loading ? '—' : lastInventory ? fmtDate(lastInventory.lastInventoryStartDate) : 'Never'}
                  </div>
                  {lastInventoryIsOpen && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-bg text-success border border-success/20 whitespace-nowrap">
                      Open
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-medium text-ink-400 mt-0.5 truncate">
                  {loading ? undefined : lastInventory
                    ? `${lastInventory.companyAbbreviation} · ${lastInventory.companyName}`
                    : 'No inventory sessions yet'}
                </div>
              </div>
            </button>
          </div>

          {/* Open inventory sessions */}
          <div className="mt-5 pt-4 border-t border-pearl-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-ink-400 uppercase mb-2.5">
              <IconClipboardList size={14} />
              Open Inventories{openInventories.length > 0 && ` (${openInventories.length})`}
            </div>
            {loading ? (
              <div className="text-center text-[13px] text-ink-300 py-6">Loading…</div>
            ) : openInventories.length === 0 ? (
              <div className="text-center text-[13px] text-ink-300 py-6">No open inventory sessions.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {openInventories.map((inv) => (
                  <button
                    key={inv.inventoryID}
                    type="button"
                    onClick={() => { setActiveCompanyId(inv.companyID); navigate('/inventories'); }}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-success/20 bg-success-bg/60 hover:bg-success-bg transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-ink-800 truncate">
                        {inv.companyAbbreviation} · {inv.companyName}
                      </div>
                      <div className="text-[11px] text-ink-400 truncate mt-0.5">
                        Started {fmtDate(inv.inventoryStartDate)} by {inv.startCreatedByFullName}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-success shrink-0">Continue →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}