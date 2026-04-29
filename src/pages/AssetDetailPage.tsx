import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assetsApi } from '../api/assets';
import type { Asset, DepreciationHistoryItem, InventoryHistoryItem, StatusHistoryItem, Maintenance, Warranty } from '../types';
import { maintenancesApi } from '../api/maintenances';
import { warrantiesApi } from '../api/warranties';

type Tab = 'info' | 'depreciation' | 'inventory' | 'status' | 'maintenance' | 'warranty';

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [depHistory, setDepHistory] = useState<DepreciationHistoryItem[]>([]);
  const [invHistory, setInvHistory] = useState<InventoryHistoryItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetsApi.get(assetId)
      .then((r) => setAsset(r.data as Asset))
      .catch(() => toast.error('Failed to load asset'))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => {
    if (tab === 'depreciation' && depHistory.length === 0)
      assetsApi.getDepreciationHistory(assetId).then((r) => setDepHistory(r.data as DepreciationHistoryItem[]));
    if (tab === 'inventory' && invHistory.length === 0)
      assetsApi.getInventoryHistory(assetId).then((r) => setInvHistory(r.data as InventoryHistoryItem[]));
    if (tab === 'status' && statusHistory.length === 0)
      assetsApi.getStatusHistory(assetId).then((r) => setStatusHistory(r.data as StatusHistoryItem[]));
    if (tab === 'maintenance' && maintenances.length === 0)
      maintenancesApi.getByAsset(assetId).then((r) => setMaintenances(r.data as Maintenance[]));
    if (tab === 'warranty' && warranties.length === 0)
      warrantiesApi.getByAsset(assetId).then((r) => setWarranties(r.data as Warranty[]));
  }, [tab, assetId, depHistory.length, invHistory.length, statusHistory.length, maintenances.length, warranties.length]);

  async function handleDelete() {
    if (!confirm('Delete this asset? This cannot be undone.')) return;
    try {
      await assetsApi.delete(assetId);
      toast.success('Asset deleted');
      navigate('/assets');
    } catch {
      toast.error('Delete failed');
    }
  }

  if (loading) return <p style={{ padding: 32 }}>Loading…</p>;
  if (!asset) return <p style={{ padding: 32 }}>Asset not found.</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'depreciation', label: 'Depreciation' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'status', label: 'Status History' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'warranty', label: 'Warranty' },
  ];

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Link to="/assets" style={{ color: '#1a73e8', textDecoration: 'none', fontSize: 13 }}>← Back to Assets</Link>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginTop: 4 }}>
            {asset.assetCode} – {asset.assetDesc}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to={`/assets/${assetId}/edit`} style={btnStyle('#1e3a5f')}>Edit</Link>
          <button onClick={handleDelete} style={btnStyle('#c0392b')}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #eee', marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              color: tab === t.key ? '#1e3a5f' : '#888',
              borderBottom: tab === t.key ? '2px solid #1e3a5f' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && <AssetInfo asset={asset} />}
      {tab === 'depreciation' && <SimpleTable data={depHistory} columns={['depreciationDate', 'depreciationRate', 'depreciationValue', 'netBookValue', 'createdByFullName']} />}
      {tab === 'inventory' && <SimpleTable data={invHistory} columns={['inventoryID', 'isAvailable', 'location', 'relocated', 'createdDate']} />}
      {tab === 'status' && <SimpleTable data={statusHistory} columns={['statusDate', 'statusID', 'statusDesc', 'statusSalePrice', 'createdByFullName']} />}
      {tab === 'maintenance' && <SimpleTable data={maintenances} columns={['fromDate', 'toDate', 'cost', 'curCode', 'remark']} />}
      {tab === 'warranty' && <SimpleTable data={warranties} columns={['warrantyDesc', 'fromDate', 'toDate', 'remark']} />}
    </div>
  );
}

function AssetInfo({ asset }: { asset: Asset }) {
  const fields: [string, unknown][] = [
    ['Asset Code', asset.assetCode],
    ['Description', asset.assetDesc],
    ['In Service Date', asset.inServiceDate],
    ['Purchase Price', `${asset.purchaseCurCode} ${asset.purchasePrice}`],
    ['Purchase Date', asset.purchaseDate ?? '—'],
    ['Purchase Order No', asset.purchaseOrderNo ?? '—'],
    ['Invoice No', asset.invoiceNo ?? '—'],
    ['Invoice Date', asset.invoiceDate ?? '—'],
    ['Accounting Entry Date', asset.accountingEntryDate ?? '—'],
    ['Accounting JV No', asset.accountingEntryJVNo ?? '—'],
    ['Barcode', asset.barcodeNumber ?? '—'],
    ['Serial Number', asset.serialNumber ?? '—'],
    ['Donation', asset.donation ? 'Yes' : 'No'],
    ['Remark', asset.remark ?? '—'],
    ['Installed At', asset.installedAt ?? '—'],
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px', background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {fields.map(([label, value]) => (
        <div key={label}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 14, color: '#333' }}>{String(value)}</div>
        </div>
      ))}
    </div>
  );
}

function SimpleTable({ data, columns }: { data: object[]; columns: string[] }) {
  if (data.length === 0) return <p style={{ color: '#999', textAlign: 'center', marginTop: 40 }}>No records found.</p>;
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>
                {c.replace(/([A-Z])/g, ' $1').trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const r = row as Record<string, unknown>;
            return (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                {columns.map((c) => (
                  <td key={c} style={{ padding: '10px 14px', fontSize: 13, color: '#333' }}>
                    {String(r[c] ?? '—')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', padding: '8px 16px',
    borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
    textDecoration: 'none', display: 'inline-block',
  };
}
