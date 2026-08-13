import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { lookupsApi } from '../api/lookups';
import { handleApiError } from '../utils/errors';
import { useConfirm } from '../hooks/useConfirm';
import type { Country, HrDatabase, HrSource } from '../types';
import Select from './ui/Select';
import Modal from './Modal';

const inputCls = 'w-full px-2.5 py-[7px] border border-[#ddd] rounded-md text-sm outline-none focus:border-accent transition-colors box-border';

const emptyForm = {
  hrdbid: '',
  sourceName: '',
  serverName: '',
  databaseName: '',
  countryID: '',
  isActive: true,
};

function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={clsx('flex flex-col gap-1', full && 'sm:col-span-2')}>
      <label className="text-xs font-semibold text-[#555]">{label}</label>
      {children}
    </div>
  );
}

function FormActions({ saving, mode, onCancel }: { saving: boolean; mode: 'add' | 'edit'; onCancel: () => void }) {
  return (
    <div className="flex gap-2 mt-4">
      <button type="submit" disabled={saving} className="bg-[#9a7c4b] text-white border-none rounded-md px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70">
        {saving ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}
      </button>
      <button type="button" onClick={onCancel} className="bg-white text-[#555] border border-[#ccc] rounded-md px-4 py-2 text-[13px] cursor-pointer hover:bg-surface">
        Cancel
      </button>
    </div>
  );
}

/**
 * Manages GSET.HRSources — the (server, database) pairs a company can read HR from.
 * A country may have several; Lebanon has HRLEB and the Lebanon-Express HR database
 * on a different SQL instance.
 */
export default function HrSourcesSection() {
  const { confirm, dialog } = useConfirm();
  const [sources, setSources] = useState<HrSource[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [registry, setRegistry] = useState<HrDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([lookupsApi.getHrSources(false), lookupsApi.getCountries()]);
      setSources(s.data ?? []);
      setCountries(c.data as Country[]);
      // Admin-only and only needed to prefill the form, so a failure here is not fatal.
      try {
        const r = await lookupsApi.getHrDatabases();
        setRegistry(r.data ?? []);
      } catch { setRegistry([]); }
    } catch (err) {
      handleApiError(err, 'Failed to load HR sources');
    } finally {
      setLoading(false);
    }
  }

  function startAdd() { setForm(emptyForm); setEditId(null); setMode('add'); }

  function startEdit(s: HrSource) {
    setForm({
      hrdbid: s.hrdbid != null ? String(s.hrdbid) : '',
      sourceName: s.sourceName,
      serverName: s.serverName,
      databaseName: s.databaseName,
      countryID: s.countryID.trim(),
      isActive: s.isActive,
    });
    setEditId(s.hrSourceID);
    setMode('edit');
  }

  function cancel() { setMode(null); setEditId(null); }

  /**
   * Picking a registry row fills name, server and database in one go — no retyping a
   * host\instance. All three are overwritten together, deliberately: an earlier version
   * kept a non-empty name while replacing server and database, so switching from
   * "Lebanon-Express 2022" (HR_2022) to "Lebanon-Express" (HR) left a row pointing at
   * HR but still labelled 2022. Edit the name afterwards if you want something else.
   */
  function applyRegistryRow(dbIdValue: string) {
    const row = registry.find((r) => String(r.dbId) === dbIdValue);
    if (!row) { setForm((f) => ({ ...f, hrdbid: '' })); return; }
    setForm((f) => ({
      ...f,
      hrdbid: dbIdValue,
      sourceName: row.connectTo,
      serverName: row.serverName,
      databaseName: row.databaseName,
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        hrdbid: form.hrdbid ? Number(form.hrdbid) : null,
        sourceName: form.sourceName.trim(),
        serverName: form.serverName.trim(),
        databaseName: form.databaseName.trim(),
        countryID: form.countryID.trim().toUpperCase(),
        isActive: form.isActive,
      };
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateHrSource(editId, payload);
        toast.success('HR source updated');
      } else {
        await lookupsApi.createHrSource(payload);
        toast.success('HR source added');
      }
      cancel();
      await load();
    } catch (err) {
      handleApiError(err, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: HrSource) {
    const ok = await confirm(
      `Delete "${s.sourceName}" (${s.databaseName})? Any company using it must be repointed first.`,
      { title: 'Delete HR Source' },
    );
    if (!ok) return;
    try {
      await lookupsApi.deleteHrSource(s.hrSourceID);
      toast.success('HR source deleted');
      await load();
    } catch (err) {
      handleApiError(err, 'Delete failed');
    }
  }

  async function test(s: HrSource) {
    setTesting(s.hrSourceID);
    try {
      const r = await lookupsApi.testHrSource(s.hrSourceID);
      const message = r.data?.message ?? 'No result';
      if (message.startsWith('OK')) toast.success(message, { duration: 6000 });
      else toast.error(message, { duration: 8000 });
    } catch (err) {
      handleApiError(err, 'Test failed');
    } finally {
      setTesting(null);
    }
  }

  if (loading) return <div className="text-sm text-[#aaa] py-6">Loading…</div>;

  return (
    <div>
      {dialog}
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <h3 className="text-base font-bold text-[#333] mb-1">HR Databases</h3>
          <p className="text-[12px] text-[#6b7280] max-w-[640px] leading-relaxed">
            Each row is one HR database. A company points at exactly one of these, and its HR
            company profile id is only meaningful together with it — profile ids restart in
            every HR database. A country can have more than one source.
          </p>
        </div>
        {mode === null && (
          <button
            onClick={startAdd}
            className="shrink-0 bg-[#9a7c4b] text-white border-none rounded-md px-4 py-[7px] text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors"
          >
            + New HR Source
          </button>
        )}
      </div>

      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit HR Source' : 'New HR Source'} onClose={cancel} width="max-w-[600px]">
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              <Field label="Copy from the HR registry" full>
                <Select value={form.hrdbid} onChange={(e) => applyRegistryRow(e.target.value)}>
                  <option value="">
                    {registry.length === 0 ? 'Registry unavailable — enter details manually' : 'Pick a registry entry to prefill…'}
                  </option>
                  {registry.map((r) => (
                    <option key={r.dbId} value={r.dbId}>
                      {`${r.connectTo} — ${r.databaseName} on ${r.serverName}`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Name *">
                <input className={inputCls} value={form.sourceName} required maxLength={100}
                  placeholder="e.g. Lebanon-Express"
                  onChange={(e) => setForm((f) => ({ ...f, sourceName: e.target.value }))} autoFocus />
              </Field>
              <Field label="Country *">
                <Select value={form.countryID} onChange={(e) => setForm((f) => ({ ...f, countryID: e.target.value }))} required>
                  <option value="">Select country…</option>
                  {countries.filter((c) => c.activeCountry).map((c) => (
                    <option key={c.countryID} value={c.countryID.trim()}>{c.country}</option>
                  ))}
                </Select>
              </Field>
              <Field label="SQL Server *">
                <input className={inputCls} value={form.serverName} required maxLength={100}
                  placeholder={'e.g. sql-exsin.gezairi.com\\SQL2016'}
                  onChange={(e) => setForm((f) => ({ ...f, serverName: e.target.value }))} />
                <span className="text-[11px] text-[#9ca3af]">
                  Written exactly as a connection string needs it. A named instance resolves its own port.
                </span>
              </Field>
              <Field label="Database *">
                <input className={inputCls} value={form.databaseName} required maxLength={100}
                  placeholder="e.g. HR"
                  onChange={(e) => setForm((f) => ({ ...f, databaseName: e.target.value }))} />
                <span className="text-[11px] text-[#9ca3af]">Letters, digits and underscore only.</span>
              </Field>
              <Field label="Status" full>
                <label className="inline-flex items-center gap-2 text-[13px] text-ink-700 cursor-pointer">
                  <input type="checkbox" checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                  Active — inactive sources cannot be chosen on a company
                </label>
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}

      <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] mt-1">
        <table className="w-full border-collapse bg-white min-w-[760px]">
          <thead>
            <tr>
              {['Name', 'Country', 'Server', 'Database', 'Companies', 'Status', ''].map((h) => (
                <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 ? (
              <tr><td colSpan={7} className="p-5 text-center text-[#bbb] text-[13px]">No HR sources yet.</td></tr>
            ) : (
              sources.map((s) => (
                <tr key={s.hrSourceID} className={clsx('border-b border-[#f0f0f0]', editId === s.hrSourceID && 'bg-[#eef2ff]')}>
                  <td className="px-3.5 py-2.5 text-[13px] font-semibold text-[#333]">{s.sourceName}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{s.countryID.trim()}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">
                    {s.serverName}
                    {!s.isOnAppInstance && (
                      <span className="block text-[11px] text-[#b45309] mt-0.5">
                        other instance — no employee names in the asset list, no transfers
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{s.databaseName}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{s.companyCount}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                      s.isActive ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f3f4f6] text-[#9ca3af]')}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => void test(s)}
                        disabled={testing === s.hrSourceID}
                        className="bg-[#f3f4f6] text-[#374151] border border-[#e5e7eb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#e5e7eb] transition-colors disabled:opacity-60"
                      >
                        {testing === s.hrSourceID ? '…' : 'Test'}
                      </button>
                      <button onClick={() => startEdit(s)} className="bg-[#e8f0fe] text-accent border border-[#c5d8fb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#d2e3fc]">
                        Edit
                      </button>
                      <button onClick={() => void remove(s)} className="bg-[#c0392b] text-white border-none rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
