import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { depreciationsApi } from '../api/depreciations';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../contexts/AuthContext';
import type { Company, Depreciation, DepreciationReportItem, PaginatedResponse } from '../types';
import Select from '../components/ui/Select';
import TablePagination from '../components/ui/TablePagination';

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

export default function DepreciationsPage() {
  const { activeCompanyId, isAuditor, user, isAdmin } = useAuth();

  const readOnly = isAuditor();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number>(activeCompanyId ?? 0);
  const [depreciations, setDepreciations] = useState<Depreciation[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [report, setReport] = useState<DepreciationReportItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const { confirm, dialog } = useConfirm();

  const allowedCompanyIds = new Set((user?.permissions ?? []).map((p) => p.companyID));
  const visibleCompanies = isAdmin()
    ? companies
    : companies.filter((c) => allowedCompanyIds.has(c.companyID));

useEffect(() => {
  lookupsApi.getCompanies()
    .then((r) => {
      const list = r.data as Company[];
      setCompanies(list);

      const allowedIds = new Set((user?.permissions ?? []).map((p) => p.companyID));
      const visible = isAdmin() ? list : list.filter((c) => allowedIds.has(c.companyID));

      if (activeCompanyId != null) {
        setCompanyId(activeCompanyId);
      } else if (visible.length > 0) {
        setCompanyId(visible[0].companyID);
      }
    })
    .catch((err) => handleApiError(err, 'Failed to load companies'))
    .finally(() => setLoading(false));
}, []);

  useEffect(() => {
    if (activeCompanyId != null) setCompanyId(activeCompanyId);
  }, [activeCompanyId]);

  useEffect(() => {
    if (companyId === 0) return;
    setSelected(null);
    setReport([]);
    setTotalCount(0);
    setTotalPages(1);
    Promise.all([depreciationsApi.getAll(companyId), depreciationsApi.getLastDate(companyId)])
      .then(([all, last]) => {
        setDepreciations(all.data as Depreciation[]);
        setLastDate(last.data as string | null);
      })
      .catch((err) => handleApiError(err, 'Failed to load depreciations'));
  }, [companyId]);

  async function selectDep(depId: number, nextPageNumber: number = 1, nextPageSize: number = pageSize) {
    setSelected(depId);
    setReport([]);
    setReportLoading(true);
    try {
      const r = await depreciationsApi.getReportPaginated(depId, nextPageNumber, nextPageSize);
      const data = r.data as PaginatedResponse<DepreciationReportItem>;
      setReport(data.data);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) { handleApiError(err, 'Failed to load report'); }
    finally { setReportLoading(false); }
  }

  useEffect(() => {
    if (!selected) return;
    void selectDep(selected, pageNumber, pageSize);
  }, [selected, pageNumber, pageSize]);

  async function runDepreciation() {
    if (readOnly) return;
    const company = companies.find((c) => c.companyID === companyId);

    const sortedByLatest = [...depreciations].sort((a, b) => b.depID - a.depID);
    const latestRun = sortedByLatest[0] ?? null;
    const sameDayRun = depreciations.find((d) => d.depreciationDate === runDate) ?? null;

    if (sameDayRun) {
      const overwrite = await confirm(`A depreciation run already exists for ${runDate}. Overwrite it?`, {
        title: 'Depreciation Already Exists',
        confirmLabel: 'Overwrite',
        danger: true,
      });
      if (!overwrite) {
        toast('Please select another date to run depreciation.');
        return;
      }

      if (!latestRun || latestRun.depID !== sameDayRun.depID) {
        toast.error('Cannot overwrite this date because it is not the latest run. Delete newer runs first or pick another date.');
        return;
      }
    } else {
      const ok = await confirm(`Run depreciation for ${company?.companyName ?? ''} on ${runDate}?`, {
        title: 'Run Depreciation',
        confirmLabel: 'Run',
        danger: false,
      });
      if (!ok) return;
    }

    try {
      if (sameDayRun) {
        await depreciationsApi.deleteLast(companyId);
        toast.success('Existing same-day run deleted. Running depreciation again...');
      }

      await depreciationsApi.run({ depreciationDate: runDate, companyID: companyId });
      toast.success('Depreciation run successfully');
      const [all, last] = await Promise.all([
        depreciationsApi.getAll(companyId),
        depreciationsApi.getLastDate(companyId),
      ]);
      const list = all.data as Depreciation[];
      setDepreciations(list);
      setLastDate(last.data as string | null);

      if (list.length > 0) {
        const latest = [...list].sort((a, b) => b.depID - a.depID)[0];
        await selectDep(latest.depID);
      } else {
        setSelected(null);
        setReport([]);
      }
    } catch (err) {
      handleApiError(err, 'Depreciation run failed');
    }
  }

  async function deleteLast() {
    if (readOnly) return;
    const ok = await confirm('Delete the last depreciation run for this company? This cannot be undone.', { title: 'Delete Last Run' });
    if (!ok) return;
    try {
      await depreciationsApi.deleteLast(companyId);
      toast.success('Last depreciation deleted');
      const [all, last] = await Promise.all([depreciationsApi.getAll(companyId), depreciationsApi.getLastDate(companyId)]);
      setDepreciations(all.data as Depreciation[]);
      setLastDate(last.data as string | null);
      setSelected(null);
      setReport([]);
      setTotalCount(0);
      setTotalPages(1);
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="px-8 py-6">
      {dialog}
      <h2 className="text-[22px] font-bold text-brand mb-4">Depreciations</h2>

      {/* Run panel */}
      <div className="flex gap-3 items-center bg-white p-4 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] mb-4">
        <label className="text-[13px] font-semibold text-[#555]">Company:</label>
        <div className="min-w-[200px]">
          <Select value={companyId} onChange={(e) => setCompanyId(Number(e.target.value))}>
            {visibleCompanies.map((c) => <option key={c.companyID} value={c.companyID}>{c.companyAbbreviation} – {c.companyName}</option>)}
          </Select>
        </div>
        <label className="text-[13px] font-semibold text-[#555]">Run Depreciation for:</label>
        <input
          type="date"
          value={runDate}
          onChange={(e) => setRunDate(e.target.value)}
          className="border border-[#ddd] rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-accent"
        />
        {!readOnly && (
          <>
            <button onClick={runDepreciation} className="bg-[#9a7c4b] text-white border-none px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors">Run</button>
            <button onClick={deleteLast} className="bg-[#c0392b] text-white border-none px-4 py-2 rounded-md text-[13px] font-semibold cursor-pointer hover:bg-[#a93226] transition-colors">Delete Last</button>
          </>
        )}
      </div>

      {/* Info panel */}
      <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] mb-6 overflow-hidden">
        <div className="px-4 py-3 bg-surface-2 font-bold text-[13px] text-[#555] border-b border-[#eee]">
          Depreciation Info
        </div>
        <div className="grid grid-cols-3">
          <div className="p-4 border-r border-[#f0f0f0]">
            <div className="font-semibold text-[13px] text-brand mb-2.5">Last Depreciation</div>
            <p className="text-[13px] text-[#555] my-1">Date: <strong>{lastDate ?? '—'}</strong></p>
            <p className="text-[13px] text-[#555] my-1">Months ago: <strong>{lastDate ? monthsSince(lastDate) : '—'}</strong></p>
          </div>
          <div className="p-4 border-r border-[#f0f0f0]">
            <div className="font-semibold text-[13px] text-brand mb-2.5">Depreciation Scope</div>
            <p className="text-[13px] text-[#555] my-1.5 leading-[1.7]">
              Depreciation will not take into consideration the following assets:
            </p>
            <ol className="m-0 pl-[18px] text-[13px] text-[#555] leading-[1.8]">
              <li>1. Assets with 0 purchase price</li>
              <li>2. Assets with no accounting entry date</li>
              <li>3. Disposed assets</li>
              <li>4. Reproduced assets</li>
            </ol>
            <p className="text-[13px] text-[#555] mt-2.5 leading-[1.7]">
              Depreciation will be applied on assets with purchase price and accounting entry date, with no status or under maintenance status only.
            </p>
          </div>
          <div className="p-4">
            <div className="font-semibold text-[13px] text-brand mb-2.5">Depreciation Formula</div>
            <p className="text-[13px] text-[#555] leading-[1.8]">
              (Purchase Price × Rate / 100)<br />
              × Days from Accounting Entry Date / 365
            </p>
          </div>
        </div>
      </div>

      {/* List + Report */}
      <div className="grid gap-5 grid-cols-[280px_1fr]">
        <div className="bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="px-4 py-3 bg-surface-2 font-bold text-[13px] text-[#555] border-b border-[#eee]">History</div>
          {depreciations.length === 0 ? (
            <p className="p-5 text-[#999] text-[13px]">No depreciation runs yet.</p>
          ) : (
            depreciations.map((d) => (
              <button
                key={d.depID}
                onClick={() => {
                  setPageNumber(1);
                  setSelected(d.depID);
                }}
                className={clsx(
                  'w-full text-left px-4 py-3 border-none cursor-pointer border-b border-[#f0f0f0] text-sm transition-colors',
                  selected === d.depID ? 'bg-[#e8f0fe] text-accent' : 'bg-transparent text-[#333] hover:bg-surface'
                )}
              >
                <strong>{d.depreciationDate}</strong>
                <br />
                <span className="text-xs text-[#888]">{d.createdByFullName}</span>
              </button>
            ))
          )}
        </div>

        <div>
          {reportLoading ? (
            <div className="text-center mt-16 text-[#bbb]"><p>Loading report…</p></div>
          ) : selected && report.length > 0 ? (
            <>
              <TablePagination
                summary={totalCount > 0
                  ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} items`
                  : 'No depreciation details'}
                pageNumber={pageNumber}
                totalPages={totalPages}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageNumber(1);
                }}
                onPrevious={() => setPageNumber(p => Math.max(1, p - 1))}
                onNext={() => setPageNumber(p => Math.min(totalPages, p + 1))}
              />

              <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
                <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Asset Code', 'Description', 'Rate %', 'Dep. Value', 'Net Book Value', 'Acct. Entry Date'].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, i) => (
                    <tr key={i} className="border-b border-[#f0f0f0]">
                      <td className="px-3.5 py-2.5 text-[13px]"><strong>{r.assetCode}</strong></td>
                      <td className="px-3.5 py-2.5 text-[13px]">{r.assetDesc}</td>
                      <td className="px-3.5 py-2.5 text-[13px]">{r.depreciationRate}%</td>
                      <td className="px-3.5 py-2.5 text-[13px]">{r.depreciationValue.toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 text-[13px]">{r.netBookValue.toFixed(2)}</td>
                      <td className="px-3.5 py-2.5 text-[13px]">{r.accountingEntryDate ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center mt-16 text-[#bbb]">
              <p>{selected ? 'No assets were depreciated in this run.' : 'Select a depreciation run to view the report.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function monthsSince(dateStr: string): number {
  const last = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - last.getFullYear()) * 12 + (now.getMonth() - last.getMonth());
}
