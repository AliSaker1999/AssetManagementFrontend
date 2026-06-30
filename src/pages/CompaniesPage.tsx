import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import { useAuth } from '../contexts/AuthContext';
import type { Company, Country, Currency } from '../types';
import Select from '../components/ui/Select';

const emptyForm = {
  companyName: '',
  companyAbbreviation: '',
  companyPrmCurCode: '',
  companyScdCurCode: '',
  countryID: '',
};

const inputCls = 'w-full px-2.5 py-2 rounded-md border border-[#d1d5db] text-[13px] outline-none focus:border-accent transition-colors box-border';
const labelCls = 'text-xs font-semibold text-[#374151]';

export default function CompaniesPage() {
  const { isAuditor, allowedCompanies } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();
  const auditorMode = isAuditor();
  const canManage = !auditorMode;
  const visibleCompanies = auditorMode
    ? companies.filter(c => allowedCompanies.includes(c.companyID))
    : companies;

  useEffect(() => {
    const load = async () => {
      try {
        if (auditorMode) {
          const [c, co, cur] = await Promise.all([
            lookupsApi.getCompanies(),
            lookupsApi.getCountries(),
            lookupsApi.getCurrencies(),
          ]);
          setCompanies(c.data as Company[]);
          setCountries(co.data as Country[]);
          setCurrencies(cur.data as Currency[]);
          return;
        }

        const [c, co, cur] = await Promise.all([
          lookupsApi.getCompanies(),
          lookupsApi.getCountries(),
          lookupsApi.getCurrencies(),
        ]);
        setCompanies(c.data as Company[]);
        setCountries(co.data as Country[]);
        setCurrencies(cur.data as Currency[]);
      } catch (err) {
        handleApiError(err, 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auditorMode]);

  async function reload() {
    const r = await lookupsApi.getCompanies();
    setCompanies(r.data as Company[]);
  }

  function startAdd() {
    if (!canManage) return;
    setForm(emptyForm);
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
    });
    setEditId(c.companyID);
    setMode('edit');
  }
  function cancel() { setMode(null); setEditId(null); }

  async function handleSave(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!canManage) return;
    setSaving(true);
    const payload = { ...form };
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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
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
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
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
                <Select value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value }))} required>
                  <option value="">Select country…</option>
                  {countries.filter(c => c.activeCountry).map(c => <option key={c.countryID} value={c.countryID}>{c.country}</option>)}
                </Select>
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
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Company Name', 'Abbreviation', 'Primary Cur.', 'Secondary Cur.', 'Country', 'Counter', ...(canManage ? [''] : [])].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs text-[#6b7280] font-semibold border-b border-[#e5e7eb]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleCompanies.map(c => {
              const counter = countries.find(co => co.countryID.trim() === c.countryID.trim())?.assetCodeCounter ?? 0;
              return (
                <tr key={c.companyID} className={clsx(editId === c.companyID && 'bg-[#eef3fb]')}>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyName}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyAbbreviation}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyPrmCurCode}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.companyScdCurCode}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{countries.find(co => co.countryID === c.countryID)?.country ?? c.countryID}</td>
                  <td className="px-3 py-2.5 border-b border-[#f3f4f6]">
                    <span className="inline-block bg-[#f3f4f6] text-[#374151] font-mono font-semibold text-[13px] px-2.5 py-0.5 rounded-md">{counter}</span>
                  </td>
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
              <tr><td colSpan={canManage ? 7 : 6} className="px-3 py-8 text-[13px] text-[#9ca3af] text-center">No companies yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
