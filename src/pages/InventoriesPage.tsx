import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inventoriesApi } from '../api/inventories';
import type { InventoryDetail } from '../types';

interface InventoryMode {
  inventoryID?: number;
  isActive: boolean;
}

export default function InventoriesPage() {
  const [mode, setMode] = useState<InventoryMode | null>(null);
  const [details, setDetails] = useState<InventoryDetail[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [modeRes, lastDateRes] = await Promise.all([
        inventoriesApi.getMode(),
        inventoriesApi.getLastDate(),
      ]);
      const m = modeRes.data as InventoryMode;
      setMode(m);
      setLastDate(lastDateRes.data as string | null);
      if (m?.isActive && m.inventoryID) {
        const dRes = await inventoriesApi.getDetails({
          inventoryID: m.inventoryID,
          locationID: -1, companyID: -1, categoryID: -1, groupID: -1,
          locationDetailID: -1, accountingExclusion: false,
        });
        setDetails(dRes.data as InventoryDetail[]);
      }
    } catch {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  async function startInventory() {
    const dateStr = prompt('Start date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    try {
      await inventoriesApi.start({ inventoryStartDate: dateStr });
      toast.success('Inventory started');
      void loadData();
    } catch { toast.error('Failed to start inventory'); }
  }

  async function endInventory() {
    if (!mode?.inventoryID) return;
    const dateStr = prompt('End date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    try {
      await inventoriesApi.end(mode.inventoryID, { inventoryEndDate: dateStr });
      toast.success('Inventory ended');
      void loadData();
    } catch { toast.error('Failed to end inventory'); }
  }

  async function toggleAvailable(item: InventoryDetail) {
    try {
      await inventoriesApi.setAvailable(item.invDetailID, !item.isAvailable);
      setDetails((prev) => prev.map((d) => d.invDetailID === item.invDetailID ? { ...d, isAvailable: !d.isAvailable } : d));
    } catch { toast.error('Failed to update'); }
  }

  const filtered = details.filter(
    (d) =>
      d.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      d.assetDesc.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p style={{ padding: 32 }}>Loading…</p>;

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>Inventory</h2>
          {lastDate && <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Last completed: {lastDate}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {mode?.isActive ? (
            <button onClick={endInventory} style={btn('#27ae60')}>End Inventory</button>
          ) : (
            <button onClick={startInventory} style={btn('#1e3a5f')}>Start Inventory</button>
          )}
        </div>
      </div>

      {mode?.isActive ? (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
            <input
              style={{ border: '1.5px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 14, flex: 1, maxWidth: 360 }}
              placeholder="Search by code or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span style={{ fontSize: 13, color: '#666' }}>
              {filtered.filter((d) => d.isAvailable).length} / {filtered.length} found
            </span>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
              <thead>
                <tr>
                  {['Code', 'Description', 'Group', 'Location', 'Available', 'Relocated', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.invDetailID} style={{ borderBottom: '1px solid #f0f0f0', background: d.isAvailable ? '#f0fff4' : '#fff8f8' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}><strong>{d.assetCode}</strong></td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.assetDesc}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.groupName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.location} {d.floor}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>
                      <span style={{ color: d.isAvailable ? '#27ae60' : '#e74c3c', fontWeight: 700 }}>
                        {d.isAvailable ? '✓ Found' : '✗ Missing'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{d.relocated ? '↩ Yes' : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => toggleAvailable(d)}
                        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer', background: '#fff' }}
                      >
                        {d.isAvailable ? 'Mark Missing' : 'Mark Found'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 80, color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <p style={{ fontSize: 16 }}>No active inventory session.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Click "Start Inventory" to begin a new session.</p>
        </div>
      )}
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' };
}
