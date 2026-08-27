import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { handleApiError } from '../utils/errors';
import { dashboardApi } from '../api/dashboard';
import type { DashboardSummary } from '../types';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import SectionCard from '../components/ui/SectionCard';
import BarChart from '../components/ui/BarChart';
import RankedBars from '../components/ui/RankedBars';
import Sparkline from '../components/ui/Sparkline';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useCountUp } from '../hooks/useCountUp';
import { fmtDate, fmtMonth } from '../utils/date';

const WARRANTY_WINDOW_DAYS = 30;
const TREND_MONTHS = 12;
const PULSE_DURATION_MS = 2000;

type AttentionItem = {
  key: string;
  kind: 'Warranty' | 'Maintenance';
  assetID: number;
  assetCode: string;
  assetDesc: string;
  companyAbbreviation: string;
  detail: string;
  toDate: string;
  daysLeft: number;
};

function daysPillClass(daysLeft: number) {
  if (daysLeft <= 7) return 'bg-danger-bg text-danger border border-danger/20';
  if (daysLeft <= 14) return 'bg-warning-bg text-warning border border-warning/20';
  return 'bg-pearl-100 text-ink-400 border border-pearl-200';
}

function formatDaysLeft(daysLeft: number) {
  if (daysLeft === 0) return 'Today';
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  return `${daysLeft}d left`;
}

function kindPillClass(kind: AttentionItem['kind']) {
  return kind === 'Warranty'
    ? 'bg-navy-50 text-navy-600 border border-navy-200'
    : 'bg-gold-50 text-gold-600 border border-gold-200';
}

export default function DashboardPage() {
  const { activeCompanyId, isAdmin, allowedCompanies, setActiveCompanyId } = useAuth();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pulse, setPulse] = useState(false);
  const lastNotifIdRef = useRef<number | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirrors AssetsPage's loadStatusCounts: one aggregate call, cancelled on unmount or
  // company switch so a stale response can't overwrite a newer one.
  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await dashboardApi.getSummary(activeCompanyId ?? undefined, WARRANTY_WINDOW_DAYS, TREND_MONTHS, signal);
      setSummary(r.data);
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'CanceledError' || name === 'AbortError') return;
      handleApiError(err, 'Failed to load dashboard');
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setSummary(null);
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

  // Live updates: reuses the SignalR connection NotificationProvider already keeps open for
  // the whole app (see Layout.tsx) rather than opening a second one. A genuinely new
  // notification (not the initial history load) refetches the summary and briefly pulses the
  // Needs Attention tile/card. This fires on NotificationBackgroundService's own cadence
  // (24h by default), not the instant an asset actually changes — there's no broadcast hook
  // on the asset-mutation path, and adding one is out of scope here.
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (lastNotifIdRef.current === null) {
      lastNotifIdRef.current = latest.notifID;
      return;
    }
    if (latest.notifID === lastNotifIdRef.current) return;
    lastNotifIdRef.current = latest.notifID;

    setPulse(true);
    void loadSummary();
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulse(false), PULSE_DURATION_MS);
  }, [notifications, loadSummary]);

  useEffect(() => () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  }, []);

  const loading = summary === null;
  const statusCounts = summary?.statusCounts ?? [];
  const expiringWarranties = summary?.expiringWarranties ?? [];
  const openMaintenances = summary?.openMaintenances ?? [];
  const acquisitionTrend = summary?.acquisitionTrend ?? [];

  const totalAssets = statusCounts.reduce((sum, c) => sum + c.assetCount, 0);
  const activeCount = statusCounts.find((c) => c.statusID === 0)?.assetCount ?? 0;
  const maintenanceCount = statusCounts.find((c) => c.statusID === 8)?.assetCount ?? 0;
  const needsAttentionCount = expiringWarranties.length + openMaintenances.length;

  const animatedTotal = useCountUp(totalAssets);
  const animatedActive = useCountUp(activeCount);
  const animatedMaintenance = useCountUp(maintenanceCount);
  const animatedAttention = useCountUp(needsAttentionCount);

  const attentionItems: AttentionItem[] = [
    ...expiringWarranties.map((w): AttentionItem => ({
      key: `w${w.warntID}`,
      kind: 'Warranty',
      assetID: w.assetID,
      assetCode: w.assetCode,
      assetDesc: w.assetDesc,
      companyAbbreviation: w.companyAbbreviation,
      detail: w.warrantyDesc,
      toDate: w.toDate,
      daysLeft: w.daysLeft,
    })),
    ...openMaintenances.map((m): AttentionItem => ({
      key: `m${m.maintID}`,
      kind: 'Maintenance',
      assetID: m.assetID,
      assetCode: m.assetCode,
      assetDesc: m.assetDesc,
      companyAbbreviation: m.companyAbbreviation,
      detail: m.damageDesc ?? 'Maintenance',
      toDate: m.toDate,
      daysLeft: m.daysLeft,
    })),
  ].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 15);

  // Most users are scoped to one company, so the breakdown-by-company/country section would
  // just repeat the status tiles for them — only show it once there's more than one to compare.
  const showBreakdown = isAdmin() || allowedCompanies.length > 1;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Fleet overview across your organization" />

      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Assets"
          value={loading ? '—' : animatedTotal.toLocaleString()}
          sub="in this view"
          accent="navy"
          chart={acquisitionTrend.length > 0 ? <Sparkline values={acquisitionTrend.map((p) => p.assetCount)} /> : undefined}
        />
        <MetricCard
          label="Active"
          value={loading ? '—' : animatedActive.toLocaleString()}
          sub="active status only"
          accent={activeCount > 0 ? 'success' : 'none'}
        />
        <MetricCard
          label="In Maintenance"
          value={loading ? '—' : animatedMaintenance.toLocaleString()}
          sub="currently"
          accent={maintenanceCount > 0 ? 'warning' : 'none'}
        />
        <MetricCard
          label="Needs Attention"
          value={loading ? '—' : animatedAttention.toLocaleString()}
          sub="warranties + maintenance"
          accent={needsAttentionCount > 0 ? 'danger' : 'none'}
          className={clsx(pulse && 'ring-2 ring-gold-400 transition-shadow duration-700')}
        />
      </div>

      <div className="px-4 sm:px-8 pb-8 flex flex-col gap-4">
        <SectionCard title="Assets by Status">
          <BarChart
            data={statusCounts.map((c) => ({ id: c.statusID ?? undefined, label: c.status ?? 'Unknown', value: c.assetCount }))}
            emptyMessage={loading ? 'Loading…' : 'No assets to show.'}
            onItemClick={(d) => { if (d.id != null) navigate(`/assets?status=${d.id}`); }}
          />
        </SectionCard>

        {showBreakdown && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Assets by Company">
              <RankedBars
                data={(summary?.companyCounts ?? []).map((c) => ({
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
            </SectionCard>
            <SectionCard title="Assets by Country">
              <RankedBars
                data={(summary?.countryCounts ?? []).map((c) => ({ id: c.countryID, label: c.country, value: c.assetCount }))}
                emptyMessage={loading ? 'Loading…' : 'No assets to show.'}
              />
            </SectionCard>
          </div>
        )}

        <SectionCard
          title="Needs Attention"
          subtitle={`Warranties expiring within ${WARRANTY_WINDOW_DAYS} days, and open maintenance`}
          className={clsx(pulse && 'ring-2 ring-gold-400 transition-shadow duration-700')}
        >
          {loading ? (
            <div className="text-center text-[13px] text-ink-300 py-6">Loading…</div>
          ) : attentionItems.length === 0 ? (
            <div className="text-center text-[13px] text-ink-300 py-6">Nothing needs attention right now.</div>
          ) : (
            <div className="flex flex-col divide-y divide-pearl-200">
              {attentionItems.map((item) => (
                <Link
                  key={item.key}
                  to={`/assets/${item.assetID}`}
                  className="flex items-center justify-between gap-3 py-2.5 no-underline hover:bg-pearl-50 -mx-1 px-1 rounded transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0', kindPillClass(item.kind))}>
                      {item.kind}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-ink-800 truncate">
                        {item.assetCode} · {item.assetDesc}
                      </div>
                      <div className="text-[12px] text-ink-300 truncate">
                        {item.detail} · {item.companyAbbreviation}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="num text-[12px] text-ink-400">{fmtDate(item.toDate)}</span>
                    <span className={clsx('px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap', daysPillClass(item.daysLeft))}>
                      {formatDaysLeft(item.daysLeft)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Depreciation Trend" subtitle={`Last ${TREND_MONTHS} months`}>
          <BarChart
            variant="trend"
            data={(summary?.depreciationTrend ?? []).map((p) => ({
              label: fmtMonth(p.month),
              value: p.depreciationValue,
              secondaryValue: p.netBookValue,
            }))}
            valueLabel="Depreciation"
            secondaryLabel="Net Book Value"
            formatValue={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            emptyMessage={loading ? 'Loading…' : 'No depreciation runs in this period.'}
          />
          <p className="text-[11px] text-ink-300 mt-3">
            Figures shown in native transaction currency, summed nominally across companies.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
