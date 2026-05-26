import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { lookupsApi } from '../api/lookups';
import type { Country } from '../types';

const emptyForm = {
  countryID: '',
  country: '',
  nationality: '',
  zipCode: '',
  workingCountry: false,
  activeCountry: true,
};

const inputCls = 'w-full px-2.5 py-2 rounded-md border border-[#d1d5db] text-[13px] outline-none focus:border-accent transition-colors box-border';
const labelCls = 'text-xs font-semibold text-[#374151]';

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editID, setEditID] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await lookupsApi.getCountries();
      setCountries(r.data as Country[]);
    } catch (err) {
      handleApiError(err, 'Failed to load countries');
    } finally {
      setLoading(false);
    }
  }

  function startAdd() { setForm(emptyForm); setEditID(null); setMode('add'); }
  function startEdit(c: Country) {
    setForm({ countryID: c.countryID, country: c.country, nationality: c.nationality, zipCode: c.zipCode ?? '', workingCountry: c.workingCountry, activeCountry: c.activeCountry });
    setEditID(c.countryID);
    setMode('edit');
  }
  function cancel() { setMode(null); setEditID(null); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, zipCode: form.zipCode || null };
      if (mode === 'edit' && editID) {
        await lookupsApi.updateCountry(editID, payload);
        toast.success('Country updated');
      } else {
        await lookupsApi.createCountry({ ...payload, countryID: payload.countryID.toUpperCase() });
        toast.success('Country created');
      }
      cancel();
      await load();
    } catch (err) {
      handleApiError(err, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-bold text-brand">Countries</h1>
        {mode === null && (
          <button className="px-4 py-2 bg-[#9a7c4b] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors" onClick={startAdd}>
            + New Country
          </button>
        )}
      </div>

      {mode !== null && (
        <div className="bg-white rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)] mb-6">
          <h3 className="text-[15px] font-semibold text-brand mb-4">
            {mode === 'edit' ? 'Edit Country' : 'New Country'}
          </h3>
          <form onSubmit={handleSave}>
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Country Code * (2 chars)</label>
                <input className={inputCls} value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value.toUpperCase() }))} required maxLength={2} placeholder="LB" readOnly={mode === 'edit'} autoFocus={mode === 'add'} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Country Name *</label>
                <input className={inputCls} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required maxLength={50} autoFocus={mode === 'edit'} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Nationality *</label>
                <input className={inputCls} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} required maxLength={50} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Zip Code</label>
                <input className={inputCls} value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} maxLength={5} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Flags</label>
                <div className="flex gap-5 pt-1.5">
                  <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={form.workingCountry} onChange={e => setForm(f => ({ ...f, workingCountry: e.target.checked }))} />
                    Working Country
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={form.activeCountry} onChange={e => setForm(f => ({ ...f, activeCountry: e.target.checked }))} />
                    Active
                  </label>
                </div>
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
              {['Code', 'Country', 'Nationality', 'Zip', 'Working', 'Status', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs text-[#6b7280] font-semibold border-b border-[#e5e7eb]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {countries.map(c => (
              <tr key={c.countryID} className={clsx(editID === c.countryID && 'bg-[#eef3fb]')}>
                <td className="px-3 py-2.5 text-[13px] font-semibold text-[#6b7280] border-b border-[#f3f4f6]">{c.countryID}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.country}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.nationality}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.zipCode ?? '—'}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{c.workingCountry ? '✓' : '—'}</td>
                <td className="px-3 py-2.5 border-b border-[#f3f4f6]">
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold', c.activeCountry ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f3f4f6] text-[#9ca3af]')}>
                    {c.activeCountry ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2.5 border-b border-[#f3f4f6] whitespace-nowrap">
                  <button className="px-2.5 py-1 bg-[#f3f4f6] text-[#374151] border-none rounded-md text-xs cursor-pointer hover:bg-[#e5e7eb]" onClick={() => startEdit(c)}>Edit</button>
                </td>
              </tr>
            ))}
            {countries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[13px] text-[#9ca3af] text-center border-b border-[#f3f4f6]">
                  No countries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

