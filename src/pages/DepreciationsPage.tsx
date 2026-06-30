import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { depreciationsApi } from '../api/depreciations';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../contexts/AuthContext';
import type { Company, Depreciation, DepreciationReportItem } from '../types';
import Select from '../components/ui/Select';

export default function DepreciationsPage() {
  const { activeCompanyId, isAuditor } = useAuth();
  const readOnly = isAuditor();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number>(activeCompanyId ?? 0);
  const [depreciations, setDepreciations] = useState<Depreciation[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [report, setReport] = useState<DepreciationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    lookupsApi.getCompanies()
      .then((r) => {
        const list = r.data as Company[];
        setCompanies(list);
        if (activeCompanyId != null) {
          setCompanyId(activeCompanyId);
        } else if (list.length > 0) {
          setCompanyId(list[0].companyID);
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
    Promise.all([depreciationsApi.getAll(companyId), depreciationsApi.getLastDate(companyId)])
      .then(([all, last]) => {
        setDepreciations(all.data as Depreciation[]);
        setLastDate(last.data as string | null);
      })
      .catch((err) => handleApiError(err, 'Failed to load depreciations'));
  }, [companyId]);

  async function selectDep(depId: number) {
    setSelected(depId);
    setReport([]);
    setReportLoading(true);
    try {
      const r = await depreciationsApi.getReport(depId);
      setReport(r.data as DepreciationReportItem[]);
    } catch (err) { handleApiError(err, 'Failed to load report'); }
    finally { setReportLoading(false); }
  }

  async function runDepreciation() {
    if (readOnly) return;
    const company = companies.find((c) => c.companyID === companyId);
    const ok = await confirm(`Run depreciation for ${company?.companyName ?? ''} on ${runDate}?`, { title: 'Run Depreciation', confirmLabel: 'Run', danger: false });
    if (!ok) return;
    try {
      await depreciationsApi.run({ depreciationDate: runDate, companyID: companyId });
      toast.success('Depreciation run successfully');
      const all = await depreciationsApi.getAll(companyId);
      setDepreciations(all.data as Depreciation[]);
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
            {companies.map((c) => (
              <option key={c.companyID} value={c.companyID}>{c.companyName}</option>
            ))}
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
            <div className="font-semibold text-[13px] text-brand mb-2.5">Not Applied On</div>
            <ol className="m-0 pl-[18px] text-[13px] text-[#555] leading-[1.8]">
              <li>Assets with 0 purchase price</li>
              <li>Assets with no accounting entry date</li>
              <li>Disposed assets</li>
              <li>Reproduced assets</li>
            </ol>
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
                onClick={() => selectDep(d.depID)}
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
