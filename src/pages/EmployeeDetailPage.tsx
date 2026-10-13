import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import { reportsApi } from '../api/reports';
import { handleApiError } from '../utils/errors';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import TablePagination from '../components/ui/TablePagination';
import EmptyState from '../components/ui/EmptyState';
import type { Employee, EmployeeAsset, HrEmployee } from '../types';
import { fmtDate } from '../utils/date';

type Tab = 'current' | 'history';
const TAB_KEYS: Tab[] = ['current', 'history'];
const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

const TABS: { key: Tab; label: string }[] = [
  { key: 'current', label: 'Current Assets' },
  { key: 'history', label: 'Asset History' },
];

function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />
    </svg>
  );
}

const HEADER_CTRL =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium cursor-pointer transition-colors';

export default function EmployeeDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Two entry points share this page. An internal employee is a row in ATSET.Employees and
  // has a numeric id in the path. An HR employee lives in an external HR database, has no
  // internal id at all, and arrives as /employees/hr?companyId=&empId= — their id is only
  // unique within that company's HR profile, which is why the company travels with it.
  const isHr = id === undefined;
  const internalId = isHr ? undefined : Number(id);
  const hrEmpId = searchParams.get('empId') ?? undefined;
  const hrCompanyId = searchParams.get('companyId') ? Number(searchParams.get('companyId')) : undefined;
  // The HR route carries the name in the URL: there is no endpoint that resolves a lone HR
  // id to a person, and the caller that linked here already had it.
  const hrName = searchParams.get('name') ?? undefined;

  // The Employees view we came from, so going back keeps its filters and page.
  const backToListUrl = (location.state as { from?: string } | null)?.from ?? '/employees';

  const [employee, setEmployee] = useState<Employee | null>(null);
  // Resolved from the HR database so a refresh or a pasted link shows a real name and the
  // Left badge, neither of which the query string carries.
  const [hrEmployee, setHrEmployee] = useState<HrEmployee | null>(null);
  const [loading, setLoading] = useState(!isHr);

  const [tab, setTab] = useState<Tab>(() => {
    const requested = searchParams.get('tab') as Tab | null;
    return requested && TAB_KEYS.includes(requested) ? requested : 'current';
  });

  const [rows, setRows] = useState<EmployeeAsset[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const identity = isHr
    ? { hrEmpId, companyId: hrCompanyId }
    : { empIdUsedBy: internalId };

  // The resolved record wins; the `name` query param is the instant label so the header
  // never flashes a raw id; the id itself is the last resort when the HR source is down.
  const displayName = isHr
    ? (hrEmployee?.fullName?.trim() || hrName || `HR employee ${hrEmpId ?? ''}`.trim())
    : employee?.empFullName ?? '';
  const leaveDate = isHr ? hrEmployee?.leaveDate ?? null : employee?.leaveDate ?? null;

  // Header. Only the internal route has a row to fetch; the HR route is fully described by
  // its own query string.
  useEffect(() => {
    if (isHr || !internalId) return;
    setLoading(true);
    lookupsApi
      .getEmployee(internalId)
      .then((r) => setEmployee(r.data as Employee))
      .catch((err) => handleApiError(err, 'Failed to load employee'))
      .finally(() => setLoading(false));
  }, [isHr, internalId]);

  // HR header. Deliberately silent on failure: an unreachable HR source or an id that is
  // no longer on the roster must not block the assets below, which are the point of the
  // page. The name falls back to the query param, then the raw id.
  useEffect(() => {
    if (!isHr || !hrEmpId || !hrCompanyId) return;
    lookupsApi
      .getHrEmployee(hrCompanyId, hrEmpId)
      .then((r) => setHrEmployee(r.data as HrEmployee))
      .catch(() => setHrEmployee(null));
  }, [isHr, hrEmpId, hrCompanyId]);

  // Rows. Refetched per tab and per page — the two tabs are two different SQL scopes, not
  // one list filtered in the browser, so paging stays correct on either.
  useEffect(() => {
    if (!isHr && !internalId) return;
    if (isHr && (!hrEmpId || !hrCompanyId)) return;

    const controller = new AbortController();
    setRowsLoading(true);

    assetsApi
      .getByEmployee(
        { ...identity, scope: tab === 'current' ? 'current' : 'past', pageNumber, pageSize },
        controller.signal,
      )
      .then((r) => {
        setRows(r.data.data);
        setTotalCount(r.data.totalCount);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        handleApiError(err, 'Failed to load assets');
      })
      .finally(() => {
        if (!controller.signal.aborted) setRowsLoading(false);
      });

    // Cancels the in-flight request when the tab or page changes, so a slow response for
    // the previous tab cannot land after the new one and show the wrong rows.
    return () => controller.abort();
  }, [tab, pageNumber, pageSize, isHr, internalId, hrEmpId, hrCompanyId]);

  function switchTab(next: Tab) {
    setTab(next);
    setPageNumber(1);
    const params = new URLSearchParams(searchParams);
    if (next === 'current') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  }

  async function handleExport() {
    setExporting(true);
    try {
      await reportsApi.downloadEmployeeAssetHistory({
        format: 'pdf',
        empIDUsedBy: isHr ? null : internalId,
        hrEmpID: isHr ? hrEmpId : null,
        companyID: isHr ? hrCompanyId : (employee?.companyID ?? -1),
        scope: tab === 'current' ? 'current' : 'past',
      });
    } catch (err) {
      handleApiError(err, 'Failed to export');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-8 py-6">
        <p className="text-ink-300 text-sm">Loading…</p>
      </div>
    );
  }

  if (!isHr && !employee) {
    return (
      <div className="px-4 sm:px-8 py-6">
        <EmptyState message="Employee not found." />
      </div>
    );
  }

  const subtitleParts = [
    // prmName is the HR company this id belongs to — worth showing, since an HR id is only
    // unique within one company profile.
    isHr ? (hrEmployee?.prmName?.trim() || 'HR employee') : employee?.companyName ?? undefined,
    isHr && hrEmpId ? `ID ${hrEmpId}` : undefined,
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        title={displayName || 'Employee'}
        subtitle={subtitleParts.join(' · ') || undefined}
        breadcrumbs={[{ label: 'Employees', to: backToListUrl }, { label: displayName || 'Employee' }]}
        actions={
          <>
            {leaveDate && (
              <span className="inline-flex flex-col items-end mr-1">
                <StatusBadge status="inactive" />
                <span className="text-[11px] text-ink-300 mt-0.5">Left {fmtDate(leaveDate)}</span>
              </span>
            )}
            <button
              onClick={handleExport}
              disabled={exporting || rows.length === 0}
              className={clsx(
                HEADER_CTRL,
                'bg-white text-ink-600 border border-pearl-200 hover:bg-pearl-50',
                (exporting || rows.length === 0) && 'opacity-50 cursor-not-allowed',
              )}
            >
              <IconExport />
              {exporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={() => navigate(backToListUrl)}
              className={clsx(HEADER_CTRL, 'bg-white text-ink-600 border border-pearl-200 hover:bg-pearl-50')}
            >
              <IconBack />
              Back
            </button>
          </>
        }
      />

      {/* Tab navigation */}
      <div className="bg-white border-b border-pearl-200 px-4 sm:px-8">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={clsx(
                'px-4 py-3 text-[13px] font-medium -mb-px whitespace-nowrap transition-colors cursor-pointer border-none bg-transparent',
                tab === t.key
                  ? 'border-b-2 border-navy-600 text-navy-600 font-semibold'
                  : 'border-b-2 border-transparent text-ink-400 hover:text-ink-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-8 py-6">
        {rowsLoading ? (
          <p className="text-ink-300 text-sm">Loading…</p>
        ) : rows.length === 0 ? (
          <EmptyState
            message={
              tab === 'current'
                ? 'No assets currently assigned to this employee.'
                : 'No previous assets recorded. Asset history is tracked from the point an asset is next transferred or reassigned.'
            }
          />
        ) : (
          <>
            <TablePagination
              summary={
                totalCount > 0
                  ? `Showing ${(pageNumber - 1) * pageSize + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} assets`
                  : 'No assets'
              }
              pageNumber={pageNumber}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageNumber(1);
              }}
              onFirst={() => setPageNumber(1)}
              onPrevious={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              onLast={() => setPageNumber(totalPages)}
              onGoToPage={(page) => setPageNumber(page)}
            />

            <div className="overflow-x-auto rounded-xl border border-pearl-200 shadow-card bg-white mt-3">
              <table className="w-full border-collapse min-w-[760px]">
                <thead>
                  <tr>
                    {[
                      'Code',
                      'Description',
                      'Category',
                      'Serial',
                      'Company',
                      // The asset's location today — we snapshot custody, not location, so
                      // on a past span this is where the asset is now, not where it was.
                      tab === 'current' ? 'Location' : 'Current Location',
                      'Held From',
                      ...(tab === 'history' ? ['Held Until', 'Handed To'] : ['Status']),
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3.5 py-2.5 text-left text-xs font-bold text-ink-400 bg-pearl-100 border-b border-pearl-200"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.assetID}-${r.fromDate}`}
                      onClick={() => navigate(`/assets/${r.assetID}`, { state: { from: location.pathname + location.search } })}
                      className="border-b border-pearl-100 hover:bg-pearl-50 transition-colors cursor-pointer"
                    >
                      <td className="px-3.5 py-2.5 text-[13px] font-semibold text-ink-800">{r.assetCode}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{r.assetDesc}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{r.category ?? '—'}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{r.serialNumber ?? '—'}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{r.companyAbbreviation ?? '—'}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{r.location ?? '—'}</td>
                      <td className="px-3.5 py-2.5 text-[13px] text-ink-600 whitespace-nowrap">
                        {fmtDate(r.fromDate)}
                        {/* A seeded span dates from the asset's creation, not a recorded
                            handover. Marked rather than presented as fact. */}
                        {r.startedBySource === 'Create' && (
                          <span
                            className="text-[11px] text-ink-300 ml-1"
                            title="Approximate — recorded when the asset was created, before custody tracking began."
                          >
                            approx.
                          </span>
                        )}
                      </td>
                      {tab === 'history' ? (
                        <>
                          <td className="px-3.5 py-2.5 text-[13px] text-ink-600 whitespace-nowrap">
                            {r.toDate ? fmtDate(r.toDate) : '—'}
                          </td>
                          <td className="px-3.5 py-2.5 text-[13px] text-ink-600">
                            {r.nextHolderName ?? <span className="text-ink-300">Unassigned</span>}
                          </td>
                        </>
                      ) : (
                        <td className="px-3.5 py-2.5 text-[13px]">
                          <StatusBadge status={r.status ?? 'active'} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
