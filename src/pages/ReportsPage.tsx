import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import { reportsApi, type ReportPreview } from '../api/reports';
import { lookupsApi } from '../api/lookups';
import { inventoriesApi } from '../api/inventories';
import { depreciationsApi } from '../api/depreciations';
import { useAuth } from '../contexts/AuthContext';
import type {
  Company, LocationType, LocationDetail, CategoryType, GroupType,
  Depreciation, InventoryListItem,
} from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportType = 'assets-list' | 'assets-list-inventory' | 'depreciation' | 'assets-not-depreciated';
type ListType = 'ALL' | 'NotAvailable' | 'Relocated';
type Format = 'pdf' | 'excel';

const REPORT_TYPES: { key: ReportType; label: string }[] = [
  { key: 'assets-list',              label: 'Assets List' },
  { key: 'assets-list-inventory',    label: 'Assets List Inventory' },
  { key: 'depreciation',             label: 'Depreciation' },
  { key: 'assets-not-depreciated',   label: 'Assets Not Depreciated' },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPdf() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}
function IconExcel() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="m9 9 6 6m0-6-6 6"/>
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconX() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function OptionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400 w-32 shrink-0 pt-0.5">
      {children}
    </span>
  );
}

function OptionRow({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={clsx('flex items-start gap-4 py-2.5 border-b border-pearl-100 last:border-0', disabled && 'opacity-40 pointer-events-none')}>
      <OptionLabel>{label}</OptionLabel>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function RadioGroup({
  name, options, value, onChange, disabled,
}: {
  name: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={clsx('flex flex-wrap gap-4', disabled && 'opacity-40 pointer-events-none')}>
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-1.5 cursor-pointer text-[12px] text-ink-700">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="accent-navy-600 w-3.5 h-3.5 cursor-pointer"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

function YesNo({
  name, value, onChange, disabled,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      name={name}
      options={[{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]}
      value={value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      disabled={disabled}
    />
  );
}

function SelectField({
  value, onChange, disabled, placeholder, children,
}: {
  value: string | number;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={clsx(
        'w-full max-w-xs input-base text-[12px] py-1.5 disabled:opacity-50 disabled:bg-pearl-100 disabled:cursor-not-allowed'
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { activeCompanyId } = useAuth();

  const [reportType, setReportType] = useState<ReportType>('assets-list');
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<ReportPreview | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Lookup data
  const [companies,       setCompanies]       = useState<Company[]>([]);
  const [locations,       setLocations]       = useState<LocationType[]>([]);
  const [locDetails,      setLocDetails]      = useState<LocationDetail[]>([]);
  const [categories,      setCategories]      = useState<CategoryType[]>([]);
  const [groups,          setGroups]          = useState<GroupType[]>([]);
  const [depreciations,   setDepreciations]   = useState<Depreciation[]>([]);
  const [inventories,     setInventories]     = useState<InventoryListItem[]>([]);
  const lookupsLoadedRef = useRef(false);

  // Filter state
  const [companyId,         setCompanyId]         = useState<number>(activeCompanyId ?? 0);
  const [locationId,        setLocationId]         = useState<number>(0);
  const [locDetailId,       setLocDetailId]        = useState<number>(0);
  const [categoryId,        setCategoryId]         = useState<number>(0);
  const [groupId,           setGroupId]            = useState<number>(0);
  const [inventoryId,       setInventoryId]        = useState<number>(0);
  const [depId,             setDepId]              = useState<number>(0);
  const [listType,          setListType]           = useState<ListType>('ALL');
  const [additionalDetail,  setAdditionalDetail]   = useState(true);
  const [accountingExclusion, setAccountingExclusion] = useState(true);
  const [totalOnly,         setTotalOnly]          = useState(false);

  // Load all lookups once
  useEffect(() => {
    if (lookupsLoadedRef.current) return;
    lookupsLoadedRef.current = true;

    Promise.all([
      lookupsApi.getCompanies(),
      lookupsApi.getLocations(),
      lookupsApi.getCategories(),
      lookupsApi.getGroups(),
    ]).then(([c, l, cat, g]) => {
      setCompanies(c.data as Company[]);
      setLocations(l.data as LocationType[]);
      setCategories(cat.data as CategoryType[]);
      setGroups(g.data as GroupType[]);
    }).catch(() => {/* non-critical */});
  }, []);

  // Load location details when location changes
  useEffect(() => {
    setLocDetailId(0);
    if (!locationId) { setLocDetails([]); return; }
    lookupsApi.getLocationDetails(locationId || undefined)
      .then((r) => setLocDetails(r.data as LocationDetail[]))
      .catch(() => {/* non-critical */});
  }, [locationId]);

  // Load depreciations / inventories when report type changes
  useEffect(() => {
    if (reportType === 'depreciation' && companyId) {
      depreciationsApi.getAll(companyId)
        .then((r) => {
          const list = r.data as Depreciation[];
          setDepreciations(list);
          if (list.length > 0) setDepId(list[0].depID);
        })
        .catch(() => {/* non-critical */});
    }
    if (reportType === 'assets-list-inventory' && companyId) {
      inventoriesApi.getHistory(companyId)
        .then((r) => {
          const list = r.data as InventoryListItem[];
          setInventories(list);
          if (list.length > 0) setInventoryId(list[0].inventoryID);
        })
        .catch(() => {/* non-critical */});
    }
  }, [reportType, companyId]);

  // Reload depreciations / inventories when company changes
  useEffect(() => {
    if (!companyId) return;
    if (reportType === 'depreciation') {
      depreciationsApi.getAll(companyId)
        .then((r) => {
          const list = r.data as Depreciation[];
          setDepreciations(list);
          if (list.length > 0) setDepId(list[0].depID);
          else setDepId(0);
        }).catch(() => {});
    }
    if (reportType === 'assets-list-inventory') {
      inventoriesApi.getHistory(companyId)
        .then((r) => {
          const list = r.data as InventoryListItem[];
          setInventories(list);
          if (list.length > 0) setInventoryId(list[0].inventoryID);
          else setInventoryId(0);
        }).catch(() => {});
    }
  }, [companyId]);

  const canDownload = (): boolean => {
    if (reportType === 'depreciation') return depId > 0;
    if (reportType === 'assets-list-inventory') return inventoryId > 0;
    return true;
  };

  function buildPayload(format = 'pdf') {
    const base = {
      format,
      locationID:       locationId   || -1,
      companyID:        companyId    || -1,
      categoryID:       categoryId   || -1,
      groupID:          groupId      || -1,
      locationDetailID: locDetailId  || -1,
      accountingExclusion,
    };
    if (reportType === 'assets-list')
      return { ...base, listType, additionalDetail, totalOnly };
    if (reportType === 'assets-list-inventory')
      return { ...base, inventoryID: inventoryId, listType, totalOnly };
    if (reportType === 'depreciation')
      return { format, depID: depId };
    return { format, accountingExclusion };
  }

  async function preview() {
    if (!canDownload()) {
      toast.error(reportType === 'depreciation' ? 'Select a depreciation run first' : 'Select an inventory first');
      return;
    }
    setPreviewing(true);
    try {
      const payload = buildPayload();
      let res;
      if (reportType === 'assets-list')             res = await reportsApi.previewAssetsList(payload);
      else if (reportType === 'assets-list-inventory') res = await reportsApi.previewAssetsListInventory(payload);
      else if (reportType === 'depreciation')       res = await reportsApi.previewDepreciation(payload);
      else                                          res = await reportsApi.previewAssetsNotDepreciated(payload);
      setPreviewData(res.data);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      handleApiError(err, 'Failed to load preview');
    } finally {
      setPreviewing(false);
    }
  }

  async function download(format: Format) {
    if (!canDownload()) {
      toast.error(reportType === 'depreciation' ? 'Select a depreciation run first' : 'Select an inventory first');
      return;
    }
    setDownloading(true);
    try {
      const payload = buildPayload(format);
      if (reportType === 'assets-list')               await reportsApi.downloadAssetsList(payload);
      else if (reportType === 'assets-list-inventory') await reportsApi.downloadAssetsListInventory(payload);
      else if (reportType === 'depreciation')          await reportsApi.downloadDepreciation(payload);
      else                                             await reportsApi.downloadAssetsNotDepreciated(payload);
      toast.success(`${format.toUpperCase()} downloaded`);
    } catch (err) {
      handleApiError(err, 'Failed to generate report');
    } finally {
      setDownloading(false);
    }
  }

  // Clear preview when report type changes
  useEffect(() => { setPreviewData(null); }, [reportType]);

  const isAssetsList     = reportType === 'assets-list';
  const isInventory      = reportType === 'assets-list-inventory';
  const isDepreciation   = reportType === 'depreciation';
  const isNotDepreciated = reportType === 'assets-not-depreciated';
  const filtersDisabled  = isNotDepreciated;
  const busy             = downloading || previewing;
  const pd               = previewData; // local const for TS narrowing

  return (
    <div className="min-h-screen bg-pearl-50">
      <div className="bg-white border-b border-pearl-200 px-8 py-5">
        <h1 className="text-[22px] font-extrabold text-ink-800 leading-tight">Reports</h1>
        <p className="text-[12px] text-ink-300 mt-0.5">Generate and download asset management reports in PDF or Excel</p>
      </div>

      <div className="px-8 py-6 flex gap-6 items-start">
        <div className="w-[380px] shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-pearl-100 bg-pearl-50">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Report</span>
            </div>
            <div className="p-2">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.key}
                  type="button"
                  onClick={() => setReportType(rt.key)}
                  className={clsx(
                    'w-full text-left px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer border-none',
                    reportType === rt.key
                      ? 'bg-navy-600 text-white shadow-sm'
                      : 'text-ink-700 hover:bg-pearl-100'
                  )}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-4 space-y-2.5">
            <button
              type="button"
              onClick={preview}
              disabled={busy || !canDownload()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-navy-600 hover:bg-navy-700 text-white text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {previewing ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <IconEye />
              )}
              Preview Report
            </button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-pearl-100" />
              <span className="text-[10px] font-semibold text-ink-300 uppercase tracking-widest">Download</span>
              <div className="flex-1 h-px bg-pearl-100" />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => download('pdf')}
                disabled={busy || !canDownload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <IconPdf />
                )}
                PDF
              </button>
              <button
                type="button"
                onClick={() => download('excel')}
                disabled={busy || !canDownload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <IconExcel />
                )}
                Excel
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-pearl-100 bg-pearl-50 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Options</span>
              <span className="text-[11px] font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-3 py-0.5">
                {REPORT_TYPES.find((r) => r.key === reportType)?.label}
              </span>
            </div>

            <div className="px-6 py-4 divide-y divide-pearl-100">
              <OptionRow label="Inventory" disabled={!isInventory}>
                <SelectField
                  value={inventoryId}
                  onChange={(v) => setInventoryId(Number(v))}
                  disabled={!isInventory}
                  placeholder="Select inventory…"
                >
                  {inventories.map((inv) => (
                    <option key={inv.inventoryID} value={inv.inventoryID}>
                      {inv.inventoryStartDate}
                      {inv.inventoryEndDate ? ` – ${inv.inventoryEndDate}` : ' (active)'}
                    </option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Company" disabled={isDepreciation || isNotDepreciated}>
                <SelectField
                  value={companyId}
                  onChange={(v) => setCompanyId(Number(v))}
                  disabled={isDepreciation || isNotDepreciated}
                  placeholder="All companies"
                >
                  {companies.map((c) => (
                    <option key={c.companyID} value={c.companyID}>{c.companyName}</option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Location" disabled={filtersDisabled || isDepreciation}>
                <SelectField
                  value={locationId}
                  onChange={(v) => setLocationId(Number(v))}
                  disabled={filtersDisabled || isDepreciation}
                  placeholder="All locations"
                >
                  {locations
                    .filter((l) => !companyId || l.companyID === companyId)
                    .map((l) => (
                      <option key={l.locationID} value={l.locationID}>{l.location}</option>
                    ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Location Detail" disabled={filtersDisabled || isDepreciation || !locationId}>
                <SelectField
                  value={locDetailId}
                  onChange={(v) => setLocDetailId(Number(v))}
                  disabled={filtersDisabled || isDepreciation || !locationId}
                  placeholder="All details"
                >
                  {locDetails.map((ld) => (
                    <option key={ld.locDetailID} value={ld.locDetailID}>
                      {[ld.floor, ld.zone, ld.room].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Group" disabled={filtersDisabled || isDepreciation}>
                <SelectField
                  value={groupId}
                  onChange={(v) => setGroupId(Number(v))}
                  disabled={filtersDisabled || isDepreciation}
                  placeholder="All groups"
                >
                  {groups.map((g) => (
                    <option key={g.groupID} value={g.groupID}>{g.groupName}</option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Category" disabled={filtersDisabled || isDepreciation}>
                <SelectField
                  value={categoryId}
                  onChange={(v) => setCategoryId(Number(v))}
                  disabled={filtersDisabled || isDepreciation}
                  placeholder="All categories"
                >
                  {categories.map((c) => (
                    <option key={c.categoryID} value={c.categoryID}>{c.category}</option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="List Type" disabled={isDepreciation || isNotDepreciated}>
                <RadioGroup
                  name="listType"
                  options={[
                    { label: 'ALL', value: 'ALL' },
                    { label: 'Not Available (Lost)', value: 'NotAvailable' },
                    { label: 'Relocated', value: 'Relocated' },
                  ]}
                  value={listType}
                  onChange={(v) => setListType(v as ListType)}
                  disabled={isDepreciation || isNotDepreciated}
                />
              </OptionRow>

              <OptionRow label="Depreciation" disabled={!isDepreciation}>
                <SelectField
                  value={depId}
                  onChange={(v) => setDepId(Number(v))}
                  disabled={!isDepreciation}
                  placeholder="Select run…"
                >
                  {depreciations.map((d) => (
                    <option key={d.depID} value={d.depID}>
                      {d.depreciationDate}
                      {d.remark ? ` — ${d.remark}` : ''}
                    </option>
                  ))}
                </SelectField>
              </OptionRow>

              <OptionRow label="Additional Detail" disabled={!isAssetsList}>
                <YesNo
                  name="additionalDetail"
                  value={additionalDetail}
                  onChange={setAdditionalDetail}
                  disabled={!isAssetsList}
                />
              </OptionRow>

              <OptionRow label="Accounting Exclusion" disabled={isDepreciation}>
                <YesNo
                  name="accountingExclusion"
                  value={accountingExclusion}
                  onChange={setAccountingExclusion}
                  disabled={isDepreciation}
                />
              </OptionRow>

              <OptionRow label="Total Only" disabled={isDepreciation || isNotDepreciated}>
                <YesNo
                  name="totalOnly"
                  value={totalOnly}
                  onChange={setTotalOnly}
                  disabled={isDepreciation || isNotDepreciated}
                />
              </OptionRow>
            </div>

            <div className="px-6 py-3.5 bg-pearl-50 border-t border-pearl-100 flex items-center gap-2">
              <IconDownload />
              <span className="text-[11px] text-ink-400">
                Click <strong>Preview Report</strong> to view data inline, or <strong>PDF</strong> / <strong>Excel</strong> to download.
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {pd ? (
            <div ref={previewRef} className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-pearl-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[15px] font-bold text-ink-800">{pd.title}</h2>
                  <p className="text-[12px] text-ink-400 mt-0.5">{pd.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] font-semibold text-navy-700 bg-navy-50 border border-navy-100 rounded-full px-3 py-0.5">
                    {pd.totalCount.toLocaleString()} rows
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewData(null)}
                    className="p-1.5 rounded-lg text-ink-400 hover:bg-pearl-100 hover:text-ink-700 transition-colors border-none cursor-pointer"
                    title="Close preview"
                  >
                    <IconX />
                  </button>
                </div>
              </div>

              <div className="overflow-auto max-h-[calc(100vh-220px)] min-h-[420px]">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      {pd.headers.map((h, i) => (
                        <th
                          key={i}
                          className="sticky top-0 bg-navy-700 text-white text-left px-4 py-2.5 font-semibold whitespace-nowrap border-r border-navy-600 last:border-r-0"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pd.rows.length === 0 ? (
                      <tr>
                        <td colSpan={pd.headers.length} className="px-4 py-6 text-center text-ink-300">
                          No data found for the selected filters.
                        </td>
                      </tr>
                    ) : (
                      pd.rows.map((row, ri) => (
                        <tr
                          key={ri}
                          className={ri % 2 === 0 ? 'bg-white' : 'bg-pearl-50'}
                        >
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-2 text-ink-700 border-r border-pearl-100 last:border-r-0 whitespace-nowrap">
                              {cell ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-dashed border-pearl-300 shadow-card min-h-[420px] flex items-center justify-center px-10 text-center">
              <div className="max-w-md space-y-3">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
                  <IconEye />
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-ink-800">Preview appears here</h2>
                  <p className="text-[12px] text-ink-400 mt-1">
                    Choose a report, adjust the options on the left, then click <strong>Preview Report</strong> to load the result here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
