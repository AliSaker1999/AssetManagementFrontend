import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assetsApi } from '../api/assets';
import type { AssetListItem } from '../types';

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetsApi.getList()
      .then((r) => setAssets(r.data as AssetListItem[]))
      .catch(() => toast.error('Failed to load assets'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assets.filter(
    (a) =>
      a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      a.assetDesc.toLowerCase().includes(search.toLowerCase()) ||
      (a.barcodeNumber ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Assets</h2>
        <Link to="/assets/new" style={styles.addBtn}>+ New Asset</Link>
      </div>
      <input
        style={styles.search}
        placeholder="Search by code, description or barcode…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={styles.empty}>No assets found.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Code', 'Description', 'Category', 'Location', 'Status', 'Barcode', ''].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.assetID} style={styles.tr}>
                  <td style={styles.td}><strong>{a.assetCode}</strong></td>
                  <td style={styles.td}>{a.assetDesc}</td>
                  <td style={styles.td}>{a.category}</td>
                  <td style={styles.td}>
                    {a.location}{a.floor ? ` / ${a.floor}` : ''}{a.room ? ` - ${a.room}` : ''}
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: a.status ? '#e8f0fe' : '#f5f5f5', color: a.status ? '#1a73e8' : '#888' }}>
                      {a.status ?? 'Active'}
                    </span>
                  </td>
                  <td style={styles.td}>{a.barcodeNumber ?? '—'}</td>
                  <td style={styles.td}>
                    <Link to={`/assets/${a.assetID}`} style={styles.viewLink}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '24px 32px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, color: '#1e3a5f' },
  addBtn: {
    background: '#1e3a5f', color: '#fff', textDecoration: 'none',
    padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
  },
  search: {
    width: '100%', maxWidth: 400, padding: '9px 14px',
    border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14,
    marginBottom: 20, outline: 'none',
  },
  tableWrap: { overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', fontSize: 14, color: '#333', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  viewLink: { color: '#1a73e8', textDecoration: 'none', fontSize: 13, fontWeight: 600 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60, fontSize: 16 },
};
