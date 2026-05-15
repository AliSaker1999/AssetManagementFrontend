import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { assetsApi } from '../api/assets';
import type { AssetListItem, PaginatedResponse } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import MetricCard from '../components/ui/MetricCard';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';

const PAGE_SIZE = 25;

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-5 py-3.5 border-b border-pearl-200">
          <div className="h-3.5 bg-pearl-200 rounded w-24" />
          <div className="h-3.5 bg-pearl-200 rounded flex-1" />
          <div className="h-3.5 bg-pearl-200 rounded w-28" />
          <div className="h-3.5 bg-pearl-200 rounded w-28" />
          <div className="h-5 bg-pearl-200 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}

export default function AssetsPage() {
  const { activeCompanyId } = useAuth();
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allAssetsCache, setAllAssetsCache] = useState<AssetListItem[] | null>(null);

  // Reset to page 1 and clear cache when search or active company changes
  useEffect(() => { setPageNumber(1); setAllAssetsCache(null); }, [search, activeCompanyId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const loadData = async () => {
      try {
        const companyFilter = activeCompanyId ?? undefined;
        if (search.trim() === '') {
          const response = await assetsApi.getListPaginated(pageNumber, PAGE_SIZE, companyFilter);
          const data = response.data as PaginatedResponse<AssetListItem>;
          setAssets(data.data);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
          setAllAssetsCache(null);
        } else {
          let allData: AssetListItem[];
          if (allAssetsCache === null) {
            const response = await assetsApi.getList(companyFilter);
            allData = response.data as AssetListItem[];
            setAllAssetsCache(allData);
          } else {
            allData = allAssetsCache;
          }
          const filtered = allData.filter(
            (a) =>
              a.assetCode.toLowerCase().includes(search.toLowerCase()) ||
              a.assetDesc.toLowerCase().includes(search.toLowerCase()) ||
              (a.barcodeNumber ?? '').toLowerCase().includes(search.toLowerCase())
          );
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
  }, [pageNumber, search, activeCompanyId]);

  const handlePrevious = () => { if (pageNumber > 1) setPageNumber(pageNumber - 1); };
  const handleNext = () => { if (pageNumber < totalPages) setPageNumber(pageNumber + 1); };

  // Derive quick stats from current full dataset
  const activeCount = assets.filter((a) => !a.status || a.status.toLowerCase().includes('activ')).length;
  const maintCount = assets.filter((a) => (a.status ?? '').toLowerCase().includes('maint')).length;

  return (
    <div>
      <PageHeader
        title="Assets Register"
        subtitle={totalCount > 0 ? `${totalCount.toLocaleString()} assets across your organization` : undefined}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Assets' }]}
        actions={
          <Link to="/assets/new" className="btn-primary no-underline">
            <IconPlus />
            Add Asset
          </Link>
        }
      />

      {/* Metric cards */}
      <div className="px-8 pt-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Total Assets"
          value={loading ? '—' : totalCount.toLocaleString()}
          sub="in this view"
          accent="navy"
        />
        <MetricCard
          label="Active"
          value={loading ? '—' : activeCount.toLocaleString()}
          sub={`of ${assets.length} on this page`}
          accent="none"
        />
        <MetricCard
          label="In Maintenance"
          value={loading ? '—' : maintCount.toLocaleString()}
          sub="currently"
          accent={maintCount > 0 ? 'warning' : 'none'}
        />
        <MetricCard
          label="Page"
          value={loading ? '—' : `${pageNumber} / ${totalPages}`}
          sub={`${PAGE_SIZE} per page`}
          accent="none"
        />
      </div>

      {/* Search + table */}
      <div className="px-8 pb-8">
        {/* Search bar */}
        <div className="bg-white border border-pearl-200 rounded-xl p-4 mb-4 shadow-card">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none">
              <IconSearch />
            </span>
            <input
              className="w-full max-w-lg pl-10 pr-4 py-2.5 text-sm bg-pearl-50 border border-pearl-200 rounded-lg
                         text-ink-800 placeholder:text-ink-300
                         focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20
                         transition-colors duration-150"
              placeholder="Search by code, description or barcode…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {search && (
            <p className="text-[11px] text-ink-300 mt-2 ml-1">
              Searching all assets · {totalCount} result{totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_3fr_2fr_2fr_1.5fr_auto] gap-0 bg-pearl-100 border-b border-pearl-200 px-5 py-2.5">
            {['Code', 'Description', 'Category', 'Location', 'Status', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>

          {loading ? (
            <TableSkeleton />
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-pearl-100 flex items-center justify-center mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9a9585" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                </svg>
              </div>
              <div className="text-[14px] font-semibold text-ink-600 mb-1">
                {search ? 'No matching assets' : 'No assets yet'}
              </div>
              <div className="text-[12px] text-ink-300">
                {search ? `No results for "${search}"` : 'Add your first asset to get started'}
              </div>
            </div>
          ) : (
            <div>
              {assets.map((a, idx) => (
                <div
                  key={a.assetID}
                  className={clsx(
                    'grid grid-cols-[2fr_3fr_2fr_2fr_1.5fr_auto] gap-0 px-5 py-3.5 items-center',
                    'hover:bg-pearl-50 transition-colors duration-100',
                    idx < assets.length - 1 && 'border-b border-pearl-200'
                  )}
                >
                  {/* Code */}
                  <div className="font-code text-[12px] text-navy-600 font-medium">{a.assetCode}</div>

                  {/* Description */}
                  <div className="text-[13px] text-ink-800 font-medium truncate pr-4">{a.assetDesc}</div>

                  {/* Category */}
                  <div className="text-[12px] text-ink-400 truncate pr-4">{a.category ?? '—'}</div>

                  {/* Location */}
                  <div className="text-[12px] text-ink-400 truncate pr-4">
                    {a.location ?? '—'}
                    {a.floor ? ` · ${a.floor}` : ''}
                    {a.room ? ` · ${a.room}` : ''}
                  </div>

                  {/* Status */}
                  <div>
                    <StatusBadge status={a.status} />
                  </div>

                  {/* Action */}
                  <div>
                    <Link
                      to={`/assets/${a.assetID}`}
                      className="flex items-center gap-1 text-[11px] text-navy-500 hover:text-navy-700 no-underline font-medium transition-colors"
                    >
                      View <IconArrowRight />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-[12px] text-ink-300">
              Showing {((pageNumber - 1) * PAGE_SIZE) + 1}–{Math.min(pageNumber * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} assets
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevious}
                disabled={pageNumber === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-pearl-200 bg-white text-ink-500
                           hover:bg-pearl-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <IconChevronLeft />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page = i + 1;
                if (pageNumber > 3 && totalPages > 5) page = pageNumber - 2 + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setPageNumber(page)}
                    className={clsx(
                      'w-8 h-8 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer',
                      page === pageNumber
                        ? 'bg-navy-600 text-white border-navy-600'
                        : 'bg-white text-ink-500 border-pearl-200 hover:bg-pearl-50'
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={handleNext}
                disabled={pageNumber === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-pearl-200 bg-white text-ink-500
                           hover:bg-pearl-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <IconChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
