import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { depreciationsApi } from '../api/depreciations';
import type { Depreciation, DepreciationReportItem } from '../types';

export default function DepreciationsPage() {
  const [depreciations, setDepreciations] = useState<Depreciation[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [report, setReport] = useState<DepreciationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([depreciationsApi.getAll(), depreciationsApi.getLastDate()])
      .then(([all, last]) => {
        setDepreciations(all.data as Depreciation[]);
        setLastDate(last.data as string | null);
      })
      .catch(() => toast.error('Failed to load depreciations'))
      .finally(() => setLoading(false));
  }, []);

  async function selectDep(depId: number) {
    setSelected(depId);
    try {
      const r = await depreciationsApi.getReport(depId);
      setReport(r.data as DepreciationReportItem[]);
    } catch { toast.error('Failed to load report'); }
  }

  async function runDepreciation() {
    if (!confirm(`Run depreciation for ${runDate}?`)) return;
    try {
      await depreciationsApi.run({ depreciationDate: runDate });
      toast.success('Depreciation run successfully');
      const all = await depreciationsApi.getAll();
      setDepreciations(all.data as Depreciation[]);
    } catch { toast.error('Depreciation run failed'); }
  }

  async function deleteLast() {
    if (!confirm('Delete the last depreciation run? This cannot be undone.')) return;
    try {
      await depreciationsApi.deleteLast();
      toast.success('Last depreciation deleted');
      const [all, last] = await Promise.all([depreciationsApi.getAll(), depreciationsApi.getLastDate()]);
      setDepreciations(all.data as Depreciation[]);
      setLastDate(last.data as string | null);
      setSelected(null);
      setReport([]);
    } catch { toast.error('Delete failed'); }
  }

  if (loading) return <p style={{ padding: 32 }}>Loading…</p>;

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>Depreciations</h2>
      {lastDate && <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Last run: {lastDate}</p>}

      {/* Run depreciation */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Run Depreciation for:</label>
        <input type="date" value={runDate} onChange={(e) => setRunDate(e.target.value)}
          style={{ border: '1.5px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 14 }} />
        <button onClick={runDepreciation} style={btn('#1e3a5f')}>Run</button>
        <button onClick={deleteLast} style={btn('#c0392b')}>Delete Last</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* List */}
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8f9fa', fontWeight: 700, fontSize: 13, color: '#555', borderBottom: '1px solid #eee' }}>History</div>
          {depreciations.length === 0 ? (
            <p style={{ padding: 20, color: '#999', fontSize: 13 }}>No depreciation runs yet.</p>
          ) : (
            depreciations.map((d) => (
              <button key={d.depID} onClick={() => selectDep(d.depID)} style={{
                width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', cursor: 'pointer',
                background: selected === d.depID ? '#e8f0fe' : 'transparent',
                color: selected === d.depID ? '#1a73e8' : '#333',
                borderBottom: '1px solid #f0f0f0', fontSize: 14,
              }}>
                <strong>{d.depreciationDate}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#888' }}>{d.createdByFullName}</span>
              </button>
            ))
          )}
        </div>

        {/* Report */}
        <div>
          {selected && report.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
                <thead>
                  <tr>
                    {['Asset Code', 'Description', 'Rate %', 'Dep. Value', 'Net Book Value', 'Acct. Entry Date'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}><strong>{r.assetCode}</strong></td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.assetDesc}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.depreciationRate}%</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.depreciationValue.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.netBookValue.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{r.accountingEntryDate ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginTop: 60, color: '#bbb' }}>
              <p>Select a depreciation run to view the report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}
