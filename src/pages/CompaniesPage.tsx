import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../contexts/AuthContext';
import type { Company, Country, Currency, HrCompanyProfile, PaginatedResponse } from '../types';
import Select from '../components/ui/Select';
import TablePagination from '../components/ui/TablePagination';

const emptyForm = {
  companyName: '',
  companyAbbreviation: '',
  companyPrmCurCode: '',
  companyScdCurCode: '',
  countryID: '',
  hrCompanyProfileID: '',
  assetController: false,
  assetControllerEmail: '',
  assetControllerName: '',
};

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];
const inputCls = 'w-full px-2.5 py-2 rounded-md border border-[#d1d5db] text-[13px] outline-none focus:border-accent transition-colors box-border';
const labelCls = 'text-xs font-semibold text-[#374151]';

export default function CompaniesPage() {
  const { isAuditor, allowedCompanies } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [search, setSearch] = useState('');
  const [allCompaniesCache, setAllCompaniesCache] = useState<Company[] | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [hrCompanies, setHrCompanies] = useState<HrCompanyProfile[]>([]);
  const [loadingHrCompanies, setLoadingHrCompanies] = useState(false);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();
  const auditorMode = isAuditor();
  const canManage = !auditorMode;
  const visibleCompanies = auditorMode
    ? companies.filter(c => allowedCompanies.includes(c.companyID))
    : companies;

  useEffect(() => {
    setPageNumber(1);
  }, [auditorMode]);

  useEffect(() => {
    setPageNumber(1);
    setAllCompaniesCache(null);
  }, [search, pageSize]);

  useEffect(() => {
    lookupsApi.getCountries()
      .then((r) => setCountries(r.data as Country[]))
      .catch((err) => handleApiError(err, 'Failed to load countries'));
    lookupsApi.getCurrencies()
      .then((r) => setCurrencies(r.data as Currency[]))
      .catch((err) => handleApiError(err, 'Failed to load currencies'));
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (search.trim() === '') {
          const r = await lookupsApi.getCompaniesPaginated(pageNumber, pageSize);
          const companyData = r.data as PaginatedResponse<Company>;
          setCompanies(companyData.data);
          setTotalPages(companyData.totalPages || 1);
          setTotalCount(companyData.totalCount || companyData.data.length);
          setAllCompaniesCache(null);
          return;
        }

        let allData = allCompaniesCache;
        if (!allData) {
          const r = await lookupsApi.getCompanies();
          allData = r.data as Company[];
          setAllCompaniesCache(allData);
        }

        const q = search.trim().toLowerCase();
        const filtered = allData.filter((c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.companyAbbreviation.toLowerCase().includes(q) ||
          (countries.find(co => co.countryID === c.countryID)?.country ?? '').toLowerCase().includes(q)
        );
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const start = (pageNumber - 1) * pageSize;
        setCompanies(filtered.slice(start, start + pageSize));
        setTotalPages(newTotalPages);
        setTotalCount(filtered.length);
      } catch (err) {
        handleApiError(err, 'Failed to load companies');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    void load();
  }, [pageNumber, pageSize, search, reloadKey, auditorMode]);

  useEffect(() => {
    if (pageNumber > totalPages) {
      setPageNumber(totalPages || 1);
    }
  }, [pageNumber, totalPages]);

  async function reload() {
    setAllCompaniesCache(null);
    setReloadKey((value) => value + 1);
  }

  const selectedCountry = countries.find((c) => c.countryID.trim() === form.countryID.trim());
  const shouldShowHrCompany = !!selectedCountry?.hrConnect && !!selectedCountry?.hrDatabase;

  useEffect(() => {
    if (!mode || !form.countryID || !shouldShowHrCompany) {
      setHrCompanies([]);
      return;
    }

    let isMounted = true;
    setLoadingHrCompanies(true);
    lookupsApi.getHrCompanies(form.countryID.trim())
      .then((r) => {
        if (!isMounted) return;
        setHrCompanies(r.data as HrCompanyProfile[]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setHrCompanies([]);
        handleApiError(err, 'Failed to load HR companies');
      })
      .finally(() => {
        if (isMounted) setLoadingHrCompanies(false);
      });

    return () => { isMounted = false; };
  }, [mode, form.countryID, shouldShowHrCompany]);

  function startAdd() {
    if (!canManage) return;
    setForm(emptyForm);
    setHrCompanies([]);
    setEditId(null);
    setMode('add');
  }
  function startEdit(c: Company) {
    if (!canManage) return;
    setForm({
      companyName: c.companyName,
      companyAbbreviation: c.companyAbbreviation,
      companyPrmCurCode: c.companyPrmCurCode,
      companyScdCurCode: c.companyScdCurCode,
      countryID: c.countryID,
      hrCompanyProfileID: c.hrCompanyProfileID != null ? String(c.hrCompanyProfileID) : '',
      assetController: c.assetController ?? false,
      assetControllerEmail: c.assetControllerEmail ?? '',
      assetControllerName: c.assetControllerName ?? '',
    });
    setEditId(c.companyID);
    setMode('edit');
  }
  function cancel() {
    setMode(null);
    setEditId(null);
    setHrCompanies([]);
  }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    const payload = {
      ...form,
      hrCompanyProfileID: form.hrCompanyProfileID ? Number(form.hrCompanyProfileID) : null,
      assetController: !!form.assetController,
      assetControllerEmail: form.assetControllerEmail.trim(),
      assetControllerName: form.assetControllerName.trim(),
    };
    try {
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateCompany(editId, payload);
        toast.success('Company updated');
      } else {
        await lookupsApi.createCompany(payload);
        toast.success('Company created');
      }
      cancel();
      await reload();
    } catch (err) {
      handleApiError(err, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Company) {
    if (!canManage) return;
    const ok = await confirm(`Delete company "${c.companyName}"?`, { title: 'Delete Company' });
    if (!ok) return;
    try {
      await lookupsApi.deleteCompany(c.companyID);
      await reload();
      toast.success('Company deleted');
    } catch (err) {
      handleApiError(err, 'Delete failed — company may be in use');
    }
  }
  async function handleToggleAssetController(c: Company) {
  if (!canManage) return;

  const newStatus = !c.assetController;

  // Optimistic UI update for immediate feedback
  setCompanies((prev) =>
    prev.map((item) =>
      item.companyID === c.companyID
        ? { ...item, assetController: newStatus }
        : item
    )
  );

  try {
    const payload = {
      companyName: c.companyName,
      companyAbbreviation: c.companyAbbreviation,
      companyPrmCurCode: c.companyPrmCurCode,
      companyScdCurCode: c.companyScdCurCode,
      countryID: c.countryID,
      hrCompanyProfileID: c.hrCompanyProfileID,
      assetController: newStatus,
      assetControllerEmail: c.assetControllerEmail,
      assetControllerName: c.assetControllerName,
    };

    await lookupsApi.updateCompany(c.companyID, payload);
    toast.success(`Asset Controller turned ${newStatus ? 'On' : 'Off'}`);
  } catch (err) {
    // Revert state if the API call fails
    await reload();
    handleApiError(err, 'Failed to update Asset Controller status');
  }
}

  if (initialLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="px-4 sm:px-8 py-6 max-w-[1100px] mx-auto">
      {dialog}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-bold text-brand">Companies</h1>
        {canManage && mode === null && (
          <button className="px-4 py-2 bg-[#9a7c4b] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors" onClick={startAdd}>
            + New Company
          </button>
        )}
      </div>

      {canManage && mode !== null && (
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)] mb-6">
          <h3 className="text-[15px] font-semibold text-brand mb-4">
            {mode === 'edit' ? 'Edit Company' : 'New Company'}
          </h3>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Company Name *</label>
                <input className={inputCls} value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} required maxLength={100} autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Abbreviation *</label>
                <input className={inputCls} value={form.companyAbbreviation} onChange={e => setForm(f => ({ ...f, companyAbbreviation: e.target.value }))} required maxLength={10} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Primary Currency *</label>
                <Select value={form.companyPrmCurCode} onChange={e => setForm(f => ({ ...f, companyPrmCurCode: e.target.value }))} required>
                  <option value="">Select currency…</option>
                  {currencies.map(c => <option key={c.curCode} value={c.curCode}>{c.curCode} — {c.curName}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Secondary Currency *</label>
                <Select value={form.companyScdCurCode} onChange={e => setForm(f => ({ ...f, companyScdCurCode: e.target.value }))} required>
                  <option value="">Select currency…</option>
                  {currencies.map(c => <option key={c.curCode} value={c.curCode}>{c.curCode} — {c.curName}</option>)}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Country *</label>
                <Select value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value, hrCompanyProfileID: '' }))} required>
                  <option value="">Select country…</option>
                  {countries.filter(c => c.activeCountry).map(c => <option key={c.countryID} value={c.countryID}>{c.country}</option>)}
                </Select>
              </div>
              {shouldShowHrCompany && (
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>HR Company *</label>
                  <Select
                    value={form.hrCompanyProfileID}
                    onChange={e => setForm(f => ({ ...f, hrCompanyProfileID: e.target.value }))}
                    required
                    disabled={loadingHrCompanies}
                  >
                    <option value="">{loadingHrCompanies ? 'Loading HR companies…' : 'Select HR company…'}</option>
                    {hrCompanies.map(h => (
                      <option key={h.companyProfileID} value={h.companyProfileID}>
                        {h.prmName} ({h.companyProfileID})
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="flex flex-col gap-1 col-span-full">
                <label className={labelCls}>Asset Controller</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.assetController}
                      onChange={e => setForm(f => ({ ...f, assetController: e.target.checked }))}
                      className="h-4 w-4 rounded border-[#d1d5db] text-accent focus:ring-accent"
                    />
                    Enabled
                  </label>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Asset Controller Email</label>
                <input
                  className={inputCls}
                  type="email"
                  value={form.assetControllerEmail}
                  onChange={e => setForm(f => ({ ...f, assetControllerEmail: e.target.value }))}
                  disabled={!form.assetController}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Asset Controller Name</label>
                <input
                  className={inputCls}
                  value={form.assetControllerName}
                  onChange={e => setForm(f => ({ ...f, assetControllerName: e.target.value }))}
                  disabled={!form.assetController}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="px-4 py-2 bg-[#9a7c4b] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="px-4 py-2 bg-[#f3f4f6] text-[#374151] border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#e5e7eb]" onClick={cancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="mb-4">
          <input
            className="w-full max-w-[360px] px-3.5 py-2.5 border border-[#d1d5db] rounded-lg text-sm outline-none focus:border-accent transition-colors"
            placeholder="Search by name, abbreviation, or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <TablePagination
            summary={`Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} companies`}
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNumber(1);
            }}
            onPrevious={() => setPageNumber((value) => Math.max(1, value - 1))}
            onNext={() => setPageNumber((value) => Math.min(totalPages, value + 1))}
            onFirst={() => setPageNumber(1)}
            onLast={() => setPageNumber(totalPages)}
            onGoToPage={(page) => setPageNumber(page)}
            disabled={loading}
          />
        </div>

        <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr>
              {['Company Name', 'Abbreviation', 'Primary Cur.', 'Secondary Cur.', 'Country', 'HR Profile ID', 'Asset Controller', 'Controller Email',  ...(canManage ? [''] : [])].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs text-[#6b7280] font-semibold border-b border-[#e5e7eb]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleCompanies.map(c => {
              // const counter = countries.find(co => co.countryID.trim() === c.countryID.trim())?.assetCodeCounter ?? 0;
              return (
                <tr key={c.companyID} className={clsx(editId === c.companyID && 'bg-[#eef3fb]')}>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyName}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyAbbreviation}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyPrmCurCode}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyScdCurCode}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{countries.find(co => co.countryID === c.countryID)?.country ?? c.countryID}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.hrCompanyProfileID ?? '—'}</td>
                  {/* <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.assetController ? 'On' : 'Off'}</td> */}
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => handleToggleAssetController(c)}
                      className={clsx(
                        'relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none',
                        canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                        c.assetController ? 'bg-emerald-500' : 'bg-danger'
                      )}
                      title={canManage ? `Click to turn ${c.assetController ? 'Off' : 'On'}` : undefined}
                    >
                      {/* Text indicator inside switch */}
                      <span
                        className={clsx(
                          'absolute text-[10px] font-bold uppercase text-white select-none transition-all duration-200',
                          c.assetController ? 'left-2' : 'right-2'
                        )}
                      >
                        {c.assetController ? 'ON' : 'OFF'}
                      </span>

                      {/* Sliding circular toggle */}
                      <span
                        className={clsx(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm',
                          c.assetController ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.assetControllerEmail ?? '—'}</td>
                  {/* <td className="px-3 py-2.5 border-b border-[#f3f4f6]">
                    <span className="inline-block bg-[#f3f4f6] text-[#374151] font-mono font-semibold text-[13px] px-2.5 py-0.5 rounded-md">{counter}</span>
                  </td> */}
                  {canManage && (
                    <td className="px-3 py-2.5 border-b border-[#f3f4f6] whitespace-nowrap">
                      <button className="px-2.5 py-1 bg-[#f3f4f6] text-[#374151] border-none rounded-md text-xs cursor-pointer hover:bg-[#e5e7eb]" onClick={() => startEdit(c)}>Edit</button>
                      {' '}
                      <button className="px-2.5 py-1 bg-[#c0392b] text-white border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors" onClick={() => handleDelete(c)}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
            {visibleCompanies.length === 0 && (
              <tr><td colSpan={canManage ? 10 : 9} className="px-3 py-8 text-[13px] text-[#9ca3af] text-center">{search.trim() ? 'No companies found.' : 'No companies yet.'}</td></tr>
            )}
          </tbody>
        </table>
        </div>
        <TablePagination
            summary={`Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} companies`}
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNumber(1);
            }}
            onPrevious={() => setPageNumber((value) => Math.max(1, value - 1))}
            onNext={() => setPageNumber((value) => Math.min(totalPages, value + 1))}
            onFirst={() => setPageNumber(1)}
            onLast={() => setPageNumber(totalPages)}
            onGoToPage={(page) => setPageNumber(page)}
            disabled={loading}
          />
      </div>
    </div>
  );
}