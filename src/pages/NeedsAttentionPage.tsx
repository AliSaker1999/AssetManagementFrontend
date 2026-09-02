import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { handleApiError } from '../utils/errors';
import { dashboardApi } from '../api/dashboard';
import { reportsApi } from '../api/reports';
import type { AttentionItem, AttentionItemsPage } from '../types';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import ExportMenu from '../components/ui/ExportMenu';
import TablePagination from '../components/ui/TablePagination';
import { kindPillClass, categoryPillClass, categoryLabel } from '../components/ui/AttentionPills';
import StopTrackingWarrantyModal from '../components/StopTrackingWarrantyModal';
import { useAuth } from '../contexts/AuthContext';
import { fmtDate } from '../utils/date';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

export default function NeedsAttentionPage() {
  const { activeCompanyId, isAuditor } = useAuth();
  const [page, setPage] = useState<AttentionItemsPage | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [category, setCategory] = useState<AttentionItem['category'] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [stopTracking, setStopTracking] = useState<AttentionItem | null>(null);
  // Bumped after a warranty stops being tracked, to refetch rather than splice: the row
  // leaves the set entirely and the category tiles are counted server-side, so a local
  // filter would leave the tiles and the pagination totals disagreeing with the table.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    dashboardApi.getAttentionItems(pageNumber, pageSize, activeCompanyId ?? undefined, undefined, category ?? undefined, controller.signal)
      .then((r) => {
        setPage(r.data);
        // Stopping tracking on the last row of the last page (or narrowing by category)
        // can leave us past the end. Step back rather than showing an empty table under
        // a "page 3 of 2" footer. Terminates: pageNumber only ever decreases here.
        if (r.data.items.length === 0 && r.data.totalCount > 0 && pageNumber > 1) {
          setPageNumber((p) => Math.max(1, p - 1));
        }
      })
      .catch((err) => {
        const name = (err as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        handleApiError(err, 'Failed to load Needs Attention list');
      });
    return () => controller.abort();
  }, [activeCompanyId, pageNumber, pageSize, category, refreshKey]);

  const loading = page === null;
  const totalCount = page?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  function toggleCategory(next: AttentionItem['category']) {
    setCategory((prev) => (prev === next ? null : next));
    setPageNumber(1);
  }

  async function handleExport(format: 'excel' | 'pdf') {
    setExporting(true);
    try {
      await reportsApi.downloadAttentionItems({ format, companyID: activeCompanyId ?? -1, category: category ?? undefined });
    } catch (err) {
      handleApiError(err, 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  const tileClass = (matches: boolean) => clsx(matches && 'ring-2 ring-navy-600/40');

  return (
    <div>
      <PageHeader
        title="Needs Attention"
        subtitle="All assets that require attention"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }]}
        actions={<ExportMenu busy={exporting} onExport={handleExport} />}
      />

      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button type="button" onClick={() => { setCategory(null); setPageNumber(1); }} className="text-left bg-transparent border-none p-0">
          <MetricCard label="Total Issues" value={loading ? '—' : totalCount.toLocaleString()} accent="navy" className={tileClass(category === null)} />
        </button>
        <button type="button" onClick={() => toggleCategory('Overdue')} className="text-left bg-transparent border-none p-0">
          <MetricCard label="Overdue" value={loading ? '—' : (page?.overdueCount ?? 0).toLocaleString()} accent="danger" className={tileClass(category === 'Overdue')} />
        </button>
        <button type="button" onClick={() => toggleCategory('DueSoon')} className="text-left bg-transparent border-none p-0">
          <MetricCard label="Due Soon (7 days)" value={loading ? '—' : (page?.dueSoonCount ?? 0).toLocaleString()} accent="warning" className={tileClass(category === 'DueSoon')} />
        </button>
        <button type="button" onClick={() => toggleCategory('DueLater')} className="text-left bg-transparent border-none p-0">
          <MetricCard label="Due Later" value={loading ? '—' : (page?.dueLaterCount ?? 0).toLocaleString()} accent="none" className={tileClass(category === 'DueLater')} />
        </button>
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-pearl-100 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="text-left px-4 py-2.5">Asset</th>
                  <th className="text-left px-4 py-2.5">Type</th>
                  <th className="text-left px-4 py-2.5">Detail</th>
                  <th className="text-left px-4 py-2.5">Due Date</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-ink-300 py-8">Loading…</td></tr>
                ) : (page?.items.length ?? 0) === 0 ? (
                  <tr><td colSpan={6} className="text-center text-ink-300 py-8">Nothing needs attention right now.</td></tr>
                ) : (
                  page!.items.map((item) => (
                    <tr key={`${item.entityType}-${item.entityID}`} className="hover:bg-pearl-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link to={`/assets/${item.assetID}`} className="no-underline">
                          <div className="font-semibold text-ink-800">{item.assetCode}</div>
                          <div className="text-[11px] text-ink-300 truncate">{item.assetDesc} · {item.companyAbbreviation}</div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide', kindPillClass(item.entityType))}>
                          {item.entityType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-500">{item.description ?? '—'}</td>
                      <td className="px-4 py-2.5 num text-ink-400">{fmtDate(item.toDate)}</td>
                      <td className="px-4 py-2.5">
                        <span className={clsx('px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap', categoryPillClass(item.category))}>
                          {categoryLabel(item.category)}
                        </span>
                      </td>
                      {/* Warranties only. A maintenance is closed by returning the asset,
                          which is what clears it from this list — there is nothing to
                          acknowledge here. */}
                      <td className="px-4 py-2.5">
                        {item.entityType === 'Warranty' && !isAuditor() && (
                          <button
                            type="button"
                            onClick={() => setStopTracking(item)}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded border bg-navy-50 text-navy-600 border-navy-100 hover:bg-navy-100 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Stop Tracking
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-pearl-200">
            <TablePagination
              summary={totalCount > 0
                ? `Showing ${(pageNumber - 1) * pageSize + 1} to ${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} issues`
                : 'No issues to display'}
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

      {stopTracking && (
        <StopTrackingWarrantyModal
          warntID={stopTracking.entityID}
          warrantyDesc={stopTracking.description ?? 'Warranty'}
          toDate={stopTracking.toDate}
          onDone={() => setRefreshKey((k) => k + 1)}
          onClose={() => setStopTracking(null)}
        />
      )}
    </div>
  );
}
