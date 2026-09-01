import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { handleApiError } from '../utils/errors';
import { dashboardApi } from '../api/dashboard';
import type { DashboardCompanyOperations, DashboardOpenInventory } from '../types';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import TablePagination from '../components/ui/TablePagination';
import { useAuth } from '../contexts/AuthContext';
import { fmtDate, fmtDateTime } from '../utils/date';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

export default function CompanyOperationsPage() {
  const { activeCompanyId, setActiveCompanyId } = useAuth();
  const navigate = useNavigate();
  const [companyOps, setCompanyOps] = useState<DashboardCompanyOperations[] | null>(null);
  const [openInventories, setOpenInventories] = useState<DashboardOpenInventory[]>([]);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const controller = new AbortController();
    setCompanyOps(null);
    dashboardApi.getSummary(activeCompanyId ?? undefined, 1, controller.signal)
      .then((r) => {
        setCompanyOps(r.data.companyOperations);
        setOpenInventories(r.data.openInventories);
        setLoadedAt(new Date());
      })
      .catch((err) => {
        const name = (err as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        handleApiError(err, 'Failed to load company operations');
      });
    return () => controller.abort();
  }, [activeCompanyId]);

  const loading = companyOps === null;
  const list = companyOps ?? [];
  const neverDepreciatedCount = list.filter((c) => c.lastDepreciationDate == null).length;

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const pageRows = list.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  function goToDepreciations(companyID: number) {
    setActiveCompanyId(companyID);
    navigate('/depreciations');
  }

  function goToInventories(companyID: number) {
    setActiveCompanyId(companyID);
    navigate('/inventories');
  }

  return (
    <div>
      <PageHeader
        title="Depreciation & Inventory by Company"
        subtitle="Last depreciation run and last inventory session for every company"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }]}
      />

      <div className="px-4 sm:px-8 pt-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard label="Total Companies" value={loading ? '—' : list.length.toLocaleString()} accent="navy" />
        <MetricCard label="Never Depreciated" value={loading ? '—' : neverDepreciatedCount.toLocaleString()} accent="gold" />
        <MetricCard label="Open Inventories" value={loading ? '—' : openInventories.length.toLocaleString()} accent="success" />
        <MetricCard label="Last Updated" value={loadedAt ? fmtDateTime(loadedAt) : '—'} accent="none" />
      </div>

      <div className="px-4 sm:px-8 pb-4">
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-pearl-100 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="text-left px-4 py-2.5">Company</th>
                  <th className="text-left px-4 py-2.5">Last Depreciation</th>
                  <th className="text-left px-4 py-2.5">Last Inventory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-100">
                {loading ? (
                  <tr><td colSpan={3} className="text-center text-ink-300 py-8">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={3} className="text-center text-ink-300 py-8">No companies to show.</td></tr>
                ) : (
                  pageRows.map((c) => {
                    const inventoryIsOpen = c.lastInventoryStartDate != null && c.lastInventoryEndDate == null;
                    return (
                      <tr key={c.companyID} className="hover:bg-pearl-50 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink-800">{c.companyAbbreviation}</span>
                            <span className="text-[10px] font-semibold text-ink-400 bg-pearl-100 border border-pearl-200 rounded px-1 py-0.5">
                              {c.countryID}
                            </span>
                          </div>
                          <div className="text-[11px] text-ink-300">{c.companyName}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          {c.lastDepreciationDate ? (
                            <button
                              type="button"
                              onClick={() => goToDepreciations(c.companyID)}
                              className="num font-semibold text-gold-600 hover:text-gold-700 hover:underline"
                            >
                              {fmtDate(c.lastDepreciationDate)}
                            </button>
                          ) : (
                            <span className="text-ink-300">Never</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {c.lastInventoryStartDate ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => goToInventories(c.companyID)}
                                className="num font-semibold text-navy-700 hover:text-navy-600 hover:underline"
                              >
                                {fmtDate(c.lastInventoryStartDate)}
                              </button>
                              {inventoryIsOpen && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success-bg text-success border border-success/20 whitespace-nowrap">
                                  Open
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-ink-300">Never</span>
                          )}
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
                ? `Showing ${(pageNumber - 1) * pageSize + 1} to ${Math.min(pageNumber * pageSize, list.length)} of ${list.length} companies`
                : 'No companies to display'}
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

      <div className="px-4 sm:px-8 pb-8">
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-5">
          <div className="text-[13px] font-semibold text-ink-800 mb-3">
            Open Inventories{openInventories.length > 0 && ` (${openInventories.length})`}
          </div>
          {loading ? (
            <div className="text-center text-[13px] text-ink-300 py-6">Loading…</div>
          ) : openInventories.length === 0 ? (
            <div className="text-center text-[13px] text-ink-300 py-6">No open inventory sessions.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {openInventories.map((inv) => (
                <button
                  key={inv.inventoryID}
                  type="button"
                  onClick={() => goToInventories(inv.companyID)}
                  className={clsx(
                    'flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors',
                    'border-success/20 bg-success-bg/60 hover:bg-success-bg'
                  )}
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
      </div>
    </div>
  );
}
