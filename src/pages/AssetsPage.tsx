import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assetsApi } from '../api/assets';
import type { AssetListItem, PaginatedResponse } from '../types';

const PAGE_SIZE = 25;

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAssetsCache, setAllAssetsCache] = useState<AssetListItem[] | null>(null); // null = not loaded

  // Reset pagination when search changes
  useEffect(() => {
    setPageNumber(1);
  }, [search]);

  // Main data fetching effect
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const loadData = async () => {
      try {
        if (search.trim() === '') {
          // No search: use paginated endpoint
          const response = await assetsApi.getListPaginated(pageNumber, PAGE_SIZE);
          const data = response.data as PaginatedResponse<AssetListItem>;
          setAssets(data.data);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
          setAllAssetsCache(null); // Clear cache
        } else {
          // Search active: fetch all if not cached
          let allData: AssetListItem[];
          if (allAssetsCache === null) {
            const response = await assetsApi.getList();
            allData = response.data as AssetListItem[];
            setAllAssetsCache(allData);
          } else {
            allData = allAssetsCache;
          }

          // Filter
          const filtered = allData.filter(
            (a) =>
              a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
              a.assetDesc.toLowerCase().includes(search.toLowerCase()) ||
              (a.barcodeNumber ?? '').toLowerCase().includes(search.toLowerCase())
          );

          // Paginate
          const newTotalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const start = (pageNumber - 1) * PAGE_SIZE;
          setAssets(filtered.slice(start, start + PAGE_SIZE));
          setTotalPages(newTotalPages);
          setTotalCount(filtered.length);
        }
      } catch (error) {
        if ((error as any).name !== 'AbortError') {
          toast.error('Failed to load assets');
          setAssets([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [pageNumber, search]);

  const handlePrevious = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const handleNext = () => {
    if (pageNumber < totalPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Assets</h2>
        <Link to="/assets/new" style={styles.addBtn}>+ New Asset</Link>
      </div>
      <div style={styles.searchContainer}>
        <input
          style={styles.search}
          placeholder="Search by code, description or barcode… (searches all assets)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <span style={styles.searchInfo}>Searching all assets</span>}
      </div>
      {loading ? (
        <p style={styles.empty}>Loading…</p>
      ) : assets.length === 0 ? (
        <p style={styles.empty}>No assets found.</p>
      ) : (
        <>
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
                {assets.map((a) => (
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

          {/* Pagination Controls */}
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Page {pageNumber} of {totalPages} ({totalCount} total assets)
            </span>
            <div style={styles.pageControls}>
              <button
                onClick={handlePrevious}
                disabled={pageNumber === 1}
                style={{ ...styles.pageBtn, opacity: pageNumber === 1 ? 0.5 : 1, cursor: pageNumber === 1 ? 'not-allowed' : 'pointer' }}
              >
                ← Previous
              </button>
              <span style={styles.pageNumbers}>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page = i + 1;
                  // Adjust for current page visibility
                  if (pageNumber > 3 && totalPages > 5) {
                    page = pageNumber - 2 + i;
                  }
                  if (page <= totalPages) {
                    return (
                      <button
                        key={page}
                        onClick={() => setPageNumber(page)}
                        style={{
                          ...styles.pageNumber,
                          background: page === pageNumber ? '#1e3a5f' : '#fff',
                          color: page === pageNumber ? '#fff' : '#333',
                          fontWeight: page === pageNumber ? 700 : 400,
                        }}
                      >
                        {page}
                      </button>
                    );
                  }
                  return null;
                })}
              </span>
              <button
                onClick={handleNext}
                disabled={pageNumber === totalPages}
                style={{ ...styles.pageBtn, opacity: pageNumber === totalPages ? 0.5 : 1, cursor: pageNumber === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
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
  searchContainer: { marginBottom: 20 },
  search: {
    width: '100%', maxWidth: 400, padding: '9px 14px',
    border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14,
    outline: 'none',
  },
  searchInfo: { display: 'block', fontSize: 12, color: '#999', marginTop: 4 },
  tableWrap: { overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 24 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f0f0f0' },
  td: { padding: '12px 16px', fontSize: 14, color: '#333', verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  viewLink: { color: '#1a73e8', textDecoration: 'none', fontSize: 13, fontWeight: 600 },
  empty: { color: '#999', textAlign: 'center', marginTop: 60, fontSize: 16 },
  pagination: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, padding: '16px', background: '#f8f9fa', borderRadius: 8 },
  pageInfo: { fontSize: 14, color: '#666', fontWeight: 500 },
  pageControls: { display: 'flex', gap: 8, alignItems: 'center' },
  pageBtn: { padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 13, fontWeight: 600, color: '#333', cursor: 'pointer' },
  pageNumbers: { display: 'flex', gap: 4 },
  pageNumber: { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};


