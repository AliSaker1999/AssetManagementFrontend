import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { inventoriesApi } from '../api/inventories';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryDetail } from '../types';

interface InventoryMode {
  inventoryID?: number;
  isActive: boolean;
}

export default function InventoriesPage() {
  const { activeCompanyId } = useAuth();
  const [mode, setMode] = useState<InventoryMode | null>(null);
  const [details, setDetails] = useState<InventoryDetail[]>([]);
  const [lastDate, setLastDate] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData(companyFilter: number) {
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
          locationID: -1, companyID: companyFilter, categoryID: -1, groupID: -1,
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

  useEffect(() => { void loadData(activeCompanyId ?? -1); }, [activeCompanyId]);

  async function startInventory() {
    const dateStr = prompt('Start date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    try {
      await inventoriesApi.start({ inventoryStartDate: dateStr });
      toast.success('Inventory started');
      void loadData(activeCompanyId ?? -1);
    } catch { toast.error('Failed to start inventory'); }
  }

  async function endInventory() {
    if (!mode?.inventoryID) return;
    const dateStr = prompt('End date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!dateStr) return;
    try {
      await inventoriesApi.end(mode.inventoryID, { inventoryEndDate: dateStr });
      toast.success('Inventory ended');
      void loadData(activeCompanyId ?? -1);
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

  if (loading) return <p className="p-8">Loading…</p>;

  return (
    <div className="px-8 py-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h2 className="text-[22px] font-bold text-brand">Inventory</h2>
          {lastDate && <p className="text-[13px] text-[#888] mt-1">Last completed: {lastDate}</p>}
        </div>
        <div className="flex gap-2">
          {mode?.isActive ? (
            <button onClick={endInventory} className="bg-[#27ae60] text-white border-none px-[18px] py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#219a52] transition-colors">
              End Inventory
            </button>
          ) : (
            <button onClick={startInventory} className="bg-[#9a7c4b] text-white border-none px-[18px] py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors">
              Start Inventory
            </button>
          )}
        </div>
      </div>

      {mode?.isActive ? (
        <>
          <div className="flex gap-3 mb-4 items-center">
            <input
              className="border border-[#ddd] rounded-lg px-3 py-2 text-sm flex-1 max-w-[360px] outline-none focus:border-accent transition-colors"
              placeholder="Search by code or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-[13px] text-[#666]">
              {filtered.filter((d) => d.isAvailable).length} / {filtered.length} found
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Code', 'Description', 'Group', 'Location', 'Available', 'Relocated', 'Action'].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.invDetailID} className={clsx('border-b border-[#f0f0f0]', d.isAvailable ? 'bg-[#f0fff4]' : 'bg-[#fff8f8]')}>
                    <td className="px-3.5 py-2.5 text-[13px]"><strong>{d.assetCode}</strong></td>
                    <td className="px-3.5 py-2.5 text-[13px]">{d.assetDesc}</td>
                    <td className="px-3.5 py-2.5 text-[13px]">{d.groupName}</td>
                    <td className="px-3.5 py-2.5 text-[13px]">{d.location} {d.floor}</td>
                    <td className="px-3.5 py-2.5 text-[13px]">
                      <span className={clsx('font-bold', d.isAvailable ? 'text-[#27ae60]' : 'text-[#e74c3c]')}>
                        {d.isAvailable ? '✓ Found' : '✗ Missing'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-[13px]">{d.relocated ? '↩ Yes' : '—'}</td>
                    <td className="px-3.5 py-2.5">
                      <button
                        onClick={() => toggleAvailable(d)}
                        className="text-xs px-2.5 py-1 rounded-md border border-[#ccc] cursor-pointer bg-white hover:bg-surface-2"
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
        <div className="text-center mt-20 text-[#999]">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-base">No active inventory session.</p>
          <p className="text-[13px] mt-2">Click "Start Inventory" to begin a new session.</p>
        </div>
      )}
    </div>
  );
}

