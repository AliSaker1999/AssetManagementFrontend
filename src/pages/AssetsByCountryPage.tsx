import { useEffect, useState } from 'react';
import { handleApiError } from '../utils/errors';
import { dashboardApi } from '../api/dashboard';
import { reportsApi } from '../api/reports';
import type { DashboardCountryCount } from '../types';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import ExportMenu from '../components/ui/ExportMenu';
import TablePagination from '../components/ui/TablePagination';
import { useAuth } from '../contexts/AuthContext';
import { fmtDateTime } from '../utils/date';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

export default function AssetsByCountryPage() {
  const { activeCompanyId } = useAuth();
  const [rows, setRows] = useState<DashboardCountryCount[] | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    dashboardApi.getSummary(activeCompanyId ?? undefined, 1, controller.signal)
      .then((r) => { setRows(r.data.countryCounts); setLoadedAt(new Date()); })
      .catch((err) => {
        const name = (err as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        handleApiError(err, 'Failed to load countries');
      });
    return () => controller.abort();
  }, [activeCompanyId]);

  const loading = rows === null;
  const list = rows ?? [];
  const totalAssets = list.reduce((sum, c) => sum + c.assetCount, 0);
  const top = list[0];
  const topPct = top && totalAssets > 0 ? (top.assetCount / totalAssets) * 100 : 0;

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const pageRows = list.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(true);
    try {
      await reportsApi.downloadCountriesBreakdown({ format, companyID: activeCompanyId ?? -1 });
    } catch (err) {
      handleApiError(err, 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assets by Country"
        subtitle="Detailed breakdown of assets by country"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }]}
        actions={<ExportMenu busy={exporting} onExport={handleExport} />}
      />

      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Countries" value={loading ? '—' : list.length.toLocaleString()} accent="navy" />
        <MetricCard label="Total Assets" value={loading ? '—' : totalAssets.toLocaleString()} accent="gold" />
        <MetricCard
          label="Top Country"
          value={loading || !top ? '—' : `${top.country} (${topPct.toFixed(1)}%)`}
          accent="success"
        />
        <MetricCard label="Last Updated" value={loadedAt ? fmtDateTime(loadedAt) : '—'} accent="none" />
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-pearl-100 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="text-left px-4 py-2.5 w-10">#</th>
                  <th className="text-left px-4 py-2.5">Country</th>
                  <th className="text-right px-4 py-2.5">Assets</th>
                  <th className="text-right px-4 py-2.5">Percentage</th>
                  <th className="text-left px-4 py-2.5 w-40">Visualization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-100">
                {loading ? (
                  <tr><td colSpan={5} className="text-center text-ink-300 py-8">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-ink-300 py-8">No countries to show.</td></tr>
                ) : (
                  pageRows.map((c, i) => {
                    const pct = totalAssets > 0 ? (c.assetCount / totalAssets) * 100 : 0;
                    return (
                      <tr key={c.countryID}>
                        <td className="px-4 py-2.5 text-ink-300">{(pageNumber - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-ink-800">{c.country}</td>
                        <td className="px-4 py-2.5 text-right num font-semibold text-ink-800">{c.assetCount.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right num text-ink-400">{pct.toFixed(1)}%</td>
                        <td className="px-4 py-2.5">
                          <div className="h-1.5 rounded-full bg-pearl-200 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: i === 0 ? 'var(--gold-400)' : 'var(--navy-600)' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-pearl-200">
            <TablePagination
              summary={list.length > 0
                ? `Showing ${(pageNumber - 1) * pageSize + 1} to ${Math.min(pageNumber * pageSize, list.length)} of ${list.length} countries`
                : 'No countries to display'}
              pageNumber={pageNumber}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
              onPrevious={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              onFirst={() => setPageNumber(1)}
              onLast={() => setPageNumber(totalPages)}
              onGoToPage={(page) => setPageNumber(page)}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
