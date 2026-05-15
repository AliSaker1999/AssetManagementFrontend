import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useConfirm } from '../hooks/useConfirm';
import type { GroupType, CategoryType, LocationType, LocationDetail, Company, Country, Currency, Setting } from '../types';
import Select from '../components/ui/Select';

type Section = 'asset-code' | 'groups' | 'categories' | 'locations' | 'location-details' | 'currencies' | 'countries';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'asset-code', label: 'Asset Code' },
  { key: 'groups', label: 'Asset Groups' },
  { key: 'categories', label: 'Categories' },
  { key: 'locations', label: 'Locations' },
  { key: 'location-details', label: 'Location Details' },
  { key: 'currencies', label: 'Currencies' },
  { key: 'countries', label: 'Countries' },
];

const inputCls = 'w-full px-2.5 py-[7px] border border-[#ddd] rounded-md text-sm outline-none focus:border-accent transition-colors box-border';

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const visibleSections = SECTIONS.filter((s) => s.key !== 'asset-code' || isAdmin());
  const [section, setSection] = useState<Section>(() => visibleSections[0]?.key ?? 'groups');
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [g, c, l, ld, co, cou, cur] = await Promise.all([
      lookupsApi.getGroupsFull(),
      lookupsApi.getCategories(),
      lookupsApi.getLocations(),
      lookupsApi.getLocationDetails(),
      lookupsApi.getCompanies(),
      lookupsApi.getCountries(),
      lookupsApi.getCurrencies(),
    ]);
    setGroups(g.data as GroupType[]);
    setCategories(c.data as CategoryType[]);
    setLocations(l.data as LocationType[]);
    setLocDetails(ld.data as LocationDetail[]);
    setCompanies(co.data as Company[]);
    setCountries(cou.data as Country[]);
    setCurrencies(cur.data as Currency[]);
  }

  async function reloadGroups() { const r = await lookupsApi.getGroupsFull(); setGroups(r.data as GroupType[]); }
  async function reloadCategories() { const r = await lookupsApi.getCategories(); setCategories(r.data as CategoryType[]); }
  async function reloadLocations() { const r = await lookupsApi.getLocations(); setLocations(r.data as LocationType[]); }
  async function reloadLocDetails() { const r = await lookupsApi.getLocationDetails(); setLocDetails(r.data as LocationDetail[]); }
  async function reloadCurrencies() { const r = await lookupsApi.getCurrencies(); setCurrencies(r.data as Currency[]); }
  async function reloadCountries() { const r = await lookupsApi.getCountries(); setCountries(r.data as Country[]); }

  return (
    <div className="px-8 py-6">
      <h2 className="text-[22px] font-bold text-brand mb-5">Settings</h2>

      <div className="flex gap-1 border-b-2 border-[#eee] mb-6 flex-wrap">
        {visibleSections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={clsx(
              'px-[18px] py-2 border-none bg-transparent cursor-pointer text-sm font-semibold -mb-0.5 transition-colors',
              section === s.key ? 'text-brand border-b-2 border-brand' : 'text-[#888] border-b-2 border-transparent hover:text-brand'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'asset-code' && isAdmin() && <AssetCodeSettingsSection />}
      {section === 'groups' && <GroupsSection groups={groups} countries={countries} onReload={reloadGroups} />}
      {section === 'categories' && <CategoriesSection categories={categories} groups={groups} onReload={reloadCategories} />}
      {section === 'locations' && <LocationsSection locations={locations} companies={companies} onReload={reloadLocations} />}
      {section === 'location-details' && <LocationDetailsSection locDetails={locDetails} locations={locations} onReload={reloadLocDetails} />}
      {section === 'currencies' && <CurrenciesSection currencies={currencies} onReload={reloadCurrencies} />}
      {section === 'countries' && <CountriesSection countries={countries} onReload={reloadCountries} />}
    </div>
  );
}

// â”€â”€ Asset Code Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AssetCodeSettingsSection() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [acronym, setAcronym] = useState('');
  const [length, setLength] = useState('6');
  const [savingAcronym, setSavingAcronym] = useState(false);
  const [savingLength, setSavingLength] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await lookupsApi.getAtSettings();
      const s = r.data as Setting[];
      setSettings(s);
      setAcronym(s.find(x => x.setID === 1)?.setValue ?? '');
      setLength(s.find(x => x.setID === 2)?.setValue ?? '6');
    } finally {
      setLoading(false);
    }
  }

  async function saveAcronym(e: FormEvent) {
    e.preventDefault();
    setSavingAcronym(true);
    try {
      await lookupsApi.updateAtSetting(1, acronym.toUpperCase());
      toast.success('Acronym updated');
      await load();
    } catch { toast.error('Save failed'); }
    finally { setSavingAcronym(false); }
  }

  async function saveLength(e: FormEvent) {
    e.preventDefault();
    const len = Number(length);
    if (len < 1 || len > 10) { toast.error('Length must be between 1 and 10'); return; }
    setSavingLength(true);
    try {
      await lookupsApi.updateAtSetting(2, String(len));
      toast.success('Length updated');
      await load();
    } catch { toast.error('Save failed'); }
    finally { setSavingLength(false); }
  }

  const counter = Number(settings.find(x => x.setID === 3)?.setValue ?? 0);
  const len = Math.max(1, Math.min(10, Number(length) || 6));
  const nextCounter = counter + 1;
  const numPart = String(nextCounter).padStart(len, '0');
  const preview = (acronym.toUpperCase() || '—') + numPart;

  if (loading) return <div className="text-sm text-[#aaa] py-6">Loading…</div>;

  return (
    <div className="max-w-[680px]">
      {/* Preview banner */}
      <div className="bg-brand rounded-xl px-6 py-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-widest mb-1">Next Asset Code Preview</p>
          <p className="text-[28px] font-bold text-white font-mono tracking-[0.12em] leading-none">{preview}</p>
        </div>
        <div className="text-right bg-white/10 rounded-lg px-4 py-3">
          <p className="text-[11px] text-white/50 uppercase tracking-wide font-semibold mb-0.5">Counter</p>
          <p className="text-2xl font-bold text-white">{counter}</p>
        </div>
      </div>

      {/* Settings card */}
      <div className="bg-white rounded-xl border border-[#e8eaf0] shadow-[0_1px_4px_rgba(0,0,0,0.06)] divide-y divide-[#f0f2f5]">

        {/* Acronym row */}
        <div className="px-6 py-5 flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#111827] mb-0.5">Acronym</p>
            <p className="text-[13px] text-[#6b7280] leading-relaxed">
              Prefix letters added before the number. Max 5 characters.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9ca3af] font-mono">
              <span className="bg-[#f3f4f6] rounded px-1.5 py-0.5 text-brand-mid font-bold">{acronym || 'GEZ'}</span>
              <span className="text-[#d1d5db]">+</span>
              <span className="bg-[#f3f4f6] rounded px-1.5 py-0.5 text-[#6b7280]">{numPart}</span>
              <span className="text-[#d1d5db] mx-1">=</span>
              <span className="text-[#374151] font-semibold">{preview}</span>
            </div>
          </div>
          <form onSubmit={saveAcronym} className="flex gap-2 items-center shrink-0 pt-0.5">
            <input
              className="w-[90px] px-3 py-2 border border-[#ddd] rounded-lg text-sm font-mono font-bold text-center outline-none focus:border-accent focus:ring-2 focus:ring-[#1a73e8]/10 transition-all"
              value={acronym}
              onChange={e => setAcronym(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="GEZ"
              required
            />
            <button
              type="submit"
              disabled={savingAcronym}
              className="bg-[#9a7c4b] text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {savingAcronym ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>

        {/* Length row */}
        <div className="px-6 py-5 flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#111827] mb-0.5">Number Length</p>
            <p className="text-[13px] text-[#6b7280] leading-relaxed">
              Total digits in the numeric part, zero-padded. Range: 1–10.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#9ca3af] font-mono">
              <span className="bg-[#f3f4f6] rounded px-1.5 py-0.5 text-[#6b7280]">{acronym || 'GEZ'}</span>
              <span className="text-[#d1d5db]">+</span>
              <span className="bg-[#f3f4f6] rounded px-1.5 py-0.5 text-brand-mid font-bold">{numPart}</span>
              <span className="text-[#9ca3af] ml-1">({len} digits)</span>
            </div>
          </div>
          <form onSubmit={saveLength} className="flex gap-2 items-center shrink-0 pt-0.5">
            <input
              className="w-[70px] px-3 py-2 border border-[#ddd] rounded-lg text-sm font-bold text-center outline-none focus:border-accent focus:ring-2 focus:ring-[#1a73e8]/10 transition-all"
              type="number"
              value={length}
              onChange={e => setLength(e.target.value)}
              min={1}
              max={10}
              required
            />
            <button
              type="submit"
              disabled={savingLength}
              className="bg-[#9a7c4b] text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {savingLength ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>

        {/* Counter row — read only */}
        <div className="px-6 py-5 flex items-center justify-between bg-[#fafafa] rounded-b-xl">
          <div>
            <p className="text-[14px] font-semibold text-[#111827] mb-0.5">Counter</p>
            <p className="text-[13px] text-[#6b7280]">Auto-increments each time a new asset code is generated. Read-only.</p>
          </div>
          <div className="bg-white border border-[#e8eaf0] rounded-lg px-5 py-2.5 text-right shadow-sm">
            <p className="text-[11px] text-[#9ca3af] uppercase tracking-wide font-semibold mb-0.5">Current value</p>
            <p className="text-2xl font-bold text-[#374151]">{counter}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

// â”€â”€ Groups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyGroup = { groupName: '', acronym: '', depreciationRate: 0, accountNo: '', accountingExclusion: false, countryID: '' };

function GroupsSection({ groups, countries, onReload }: { groups: GroupType[]; countries: Country[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyGroup);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  function startAdd() { setForm(emptyGroup); setEditId(null); setMode('add'); }
  function startEdit(g: GroupType) {
    setForm({ groupName: g.groupName, acronym: g.acronym, depreciationRate: g.depreciationRate, accountNo: g.accountNo ?? '', accountingExclusion: g.accountingExclusion, countryID: g.countryID.trim() });
    setEditId(g.groupID);
    setMode('edit');
  }
  function cancel() { setMode(null); setEditId(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, accountNo: form.accountNo || null };
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateGroup(editId, payload);
        toast.success('Group updated');
      } else {
        await lookupsApi.createGroup(payload);
        toast.success('Group created');
      }
      cancel();
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function del(g: GroupType) {
    const ok = await confirm(`Delete group "${g.groupName}"?`, { title: 'Delete Group' });
    if (!ok) return;
    try {
      await lookupsApi.deleteGroup(g.groupID);
      await onReload();
      toast.success('Group deleted');
    } catch { toast.error('Delete failed — group may be in use'); }
  }

  return (
    <SectionWrapper title="Asset Groups" onAdd={mode === null ? startAdd : undefined}>
      {dialog}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Group' : 'New Group'} onClose={cancel} width="max-w-[600px]">
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              <Field label="Country *">
                <Select value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value }))} required>
                  <option value="">Select country…</option>
                  {countries.filter(c => c.activeCountry).map(c => <option key={c.countryID} value={c.countryID}>{c.countryID} – {c.country}</option>)}
                </Select>
              </Field>
              <Field label="Group Name *">
                <input className={inputCls} value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} required maxLength={50} autoFocus />
              </Field>
              <Field label="Acronym *">
                <input className={inputCls} value={form.acronym} onChange={e => setForm(f => ({ ...f, acronym: e.target.value }))} required maxLength={10} />
              </Field>
              <Field label="Dep. Rate % *">
                <input className={inputCls} type="number" min={0} max={100} value={form.depreciationRate} onChange={e => setForm(f => ({ ...f, depreciationRate: Number(e.target.value) }))} required />
              </Field>
              <Field label="Account No">
                <input className={inputCls} value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))} maxLength={20} />
              </Field>
              <Field label="Accounting Exclusion">
                <Select value={form.accountingExclusion ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, accountingExclusion: e.target.value === 'true' }))}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}
      <DataTable
        columns={['Country', 'Group Name', 'Acronym', 'Dep. Rate %', 'Account No', 'Excl.']}
        rows={groups.map(g => [countries.find(c => c.countryID.trim() === g.countryID.trim())?.country ?? g.countryID.trim(), g.groupName, g.acronym, `${g.depreciationRate}%`, g.accountNo ?? '—', g.accountingExclusion ? 'Yes' : 'No'])}
        highlightIndex={editId !== null ? groups.findIndex(g => g.groupID === editId) : null}
        onEdit={i => startEdit(groups[i])}
        onDelete={i => del(groups[i])}
      />
    </SectionWrapper>
  );
}

// â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyCat = { category: '', groupID: 0 };

function CategoriesSection({ categories, groups, onReload }: { categories: CategoryType[]; groups: GroupType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCat);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  function startAdd() { setForm(emptyCat); setEditId(null); setMode('add'); }
  function startEdit(c: CategoryType) { setForm({ category: c.category, groupID: c.groupID }); setEditId(c.categoryID); setMode('edit'); }
  function cancel() { setMode(null); setEditId(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form.groupID) { toast.error('Please select a group'); return; }
    setSaving(true);
    try {
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateCategory(editId, form);
        toast.success('Category updated');
      } else {
        await lookupsApi.createCategory(form);
        toast.success('Category created');
      }
      cancel();
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function del(c: CategoryType) {
    const ok = await confirm(`Delete category "${c.category}"?`, { title: 'Delete Category' });
    if (!ok) return;
    try {
      await lookupsApi.deleteCategory(c.categoryID);
      await onReload();
      toast.success('Category deleted');
    } catch { toast.error('Delete failed — category may be in use'); }
  }

  return (
    <SectionWrapper title="Categories" onAdd={mode === null ? startAdd : undefined}>
      {dialog}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Category' : 'New Category'} onClose={cancel}>
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              <Field label="Category *">
                <input className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required maxLength={50} autoFocus />
              </Field>
              <Field label="Group *">
                <Select value={form.groupID || ''} onChange={e => setForm(f => ({ ...f, groupID: Number(e.target.value) }))} required>
                  <option value="">Select group…</option>
                  {groups.map(g => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
                </Select>
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}
      <DataTable
        columns={['Category', 'Group']}
        rows={categories.map(c => [c.category, groups.find(g => g.groupID === c.groupID)?.groupName ?? String(c.groupID)])}
        highlightIndex={editId !== null ? categories.findIndex(c => c.categoryID === editId) : null}
        onEdit={i => startEdit(categories[i])}
        onDelete={i => del(categories[i])}
      />
    </SectionWrapper>
  );
}

// â”€â”€ Locations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LocationsSection({ locations, companies, onReload }: { locations: LocationType[]; companies: Company[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ location: '', companyID: 0 });
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  function startAdd() { setForm({ location: '', companyID: companies[0]?.companyID ?? 0 }); setEditId(null); setMode('add'); }
  function startEdit(l: LocationType) { setForm({ location: l.location, companyID: l.companyID }); setEditId(l.locationID); setMode('edit'); }
  function cancel() { setMode(null); setEditId(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateLocation(editId, form);
        toast.success('Location updated');
      } else {
        await lookupsApi.createLocation(form);
        toast.success('Location created');
      }
      cancel();
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function del(l: LocationType) {
    const ok = await confirm(`Delete location "${l.location}"?`, { title: 'Delete Location' });
    if (!ok) return;
    try {
      await lookupsApi.deleteLocation(l.locationID);
      await onReload();
      toast.success('Location deleted');
    } catch { toast.error('Delete failed — location may be in use'); }
  }

  return (
    <SectionWrapper title="Locations" onAdd={mode === null ? startAdd : undefined}>
      {dialog}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Location' : 'New Location'} onClose={cancel}>
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              <Field label="Location Name *">
                <input className={inputCls} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} required maxLength={50} autoFocus />
              </Field>
              <Field label="Company *">
                <Select value={form.companyID || ''} onChange={e => setForm(f => ({ ...f, companyID: Number(e.target.value) }))} required>
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.companyID} value={c.companyID}>{c.companyName}</option>)}
                </Select>
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}
      <DataTable
        columns={['Location', 'Company']}
        rows={locations.map(l => [l.location, companies.find(c => c.companyID === l.companyID)?.companyName ?? String(l.companyID)])}
        highlightIndex={editId !== null ? locations.findIndex(l => l.locationID === editId) : null}
        onEdit={i => startEdit(locations[i])}
        onDelete={i => del(locations[i])}
      />
    </SectionWrapper>
  );
}

// â”€â”€ Location Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyLd = { locationID: 0, floor: '', zone: '', room: '' };

function LocationDetailsSection({ locDetails, locations, onReload }: { locDetails: LocationDetail[]; locations: LocationType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyLd);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  function startAdd() { setForm(emptyLd); setEditId(null); setMode('add'); }
  function startEdit(d: LocationDetail) { setForm({ locationID: d.locationID, floor: d.floor, zone: d.zone ?? '', room: d.room ?? '' }); setEditId(d.locDetailID); setMode('edit'); }
  function cancel() { setMode(null); setEditId(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (mode === 'add' && !form.locationID) { toast.error('Please select a location'); return; }
    setSaving(true);
    try {
      const payload = { ...form, zone: form.zone || null, room: form.room || null };
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateLocationDetail(editId, { floor: payload.floor, zone: payload.zone, room: payload.room, locDetailID: editId });
        toast.success('Location detail updated');
      } else {
        await lookupsApi.createLocationDetail({ locationID: form.locationID, floor: payload.floor, zone: payload.zone, room: payload.room });
        toast.success('Location detail created');
      }
      cancel();
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function del(d: LocationDetail) {
    const ok = await confirm('Delete this location detail?', { title: 'Delete Location Detail' });
    if (!ok) return;
    try {
      await lookupsApi.deleteLocationDetail(d.locDetailID);
      await onReload();
      toast.success('Location detail deleted');
    } catch { toast.error('Delete failed'); }
  }

  return (
    <SectionWrapper title="Location Details" onAdd={mode === null ? startAdd : undefined}>
      {dialog}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Location Detail' : 'New Location Detail'} onClose={cancel}>
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              {mode === 'add' && (
                <Field label="Location *">
                  <Select value={form.locationID || ''} onChange={e => setForm(f => ({ ...f, locationID: Number(e.target.value) }))} required>
                    <option value="">Select location…</option>
                    {locations.map(l => <option key={l.locationID} value={l.locationID}>{l.location}</option>)}
                  </Select>
                </Field>
              )}
              <Field label="Floor *">
                <input className={inputCls} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} required maxLength={10} autoFocus />
              </Field>
              <Field label="Zone">
                <input className={inputCls} value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} maxLength={10} />
              </Field>
              <Field label="Room">
                <input className={inputCls} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} maxLength={10} />
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}
      <DataTable
        columns={['Location', 'Floor', 'Zone', 'Room']}
        rows={locDetails.map(d => [locations.find(l => l.locationID === d.locationID)?.location ?? String(d.locationID), d.floor, d.zone ?? '—', d.room ?? '—'])}
        highlightIndex={editId !== null ? locDetails.findIndex(d => d.locDetailID === editId) : null}
        onEdit={i => startEdit(locDetails[i])}
        onDelete={i => del(locDetails[i])}
      />
    </SectionWrapper>
  );
}

// â”€â”€ Currencies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyCurrency = { curCode: '', curName: '' };

function CurrenciesSection({ currencies, onReload }: { currencies: Currency[]; onReload: () => Promise<void> }) {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCurrency);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();

  function startAdd() { setForm(emptyCurrency); setEditCode(null); setMode('add'); }
  function startEdit(c: Currency) { setForm({ curCode: c.curCode.trim(), curName: c.curName }); setEditCode(c.curCode.trim()); setMode('edit'); }
  function cancel() { setMode(null); setEditCode(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'edit' && editCode !== null) {
        await lookupsApi.updateCurrency(editCode, { curName: form.curName });
        toast.success('Currency updated');
      } else {
        await lookupsApi.createCurrency({ curCode: form.curCode.toUpperCase(), curName: form.curName });
        toast.success('Currency created');
      }
      cancel();
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function del(c: Currency) {
    const ok = await confirm(`Delete currency "${c.curCode.trim()} – ${c.curName}"?`, { title: 'Delete Currency' });
    if (!ok) return;
    try {
      await lookupsApi.deleteCurrency(c.curCode.trim());
      await onReload();
      toast.success('Currency deleted');
    } catch { toast.error('Delete failed — currency may be in use'); }
  }

  return (
    <SectionWrapper title="Currencies" onAdd={isAdmin() && mode === null ? startAdd : undefined}>
      {dialog}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Currency' : 'New Currency'} onClose={cancel}>
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              <Field label="Code *">
                <input className={inputCls} value={form.curCode} onChange={e => setForm(f => ({ ...f, curCode: e.target.value.toUpperCase() }))} required maxLength={3} minLength={3} readOnly={mode === 'edit'} autoFocus />
              </Field>
              <Field label="Currency Name *">
                <input className={inputCls} value={form.curName} onChange={e => setForm(f => ({ ...f, curName: e.target.value }))} required maxLength={50} autoFocus={mode === 'edit'} />
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}
      <DataTable
        columns={['Code', 'Currency Name']}
        rows={currencies.map(c => [c.curCode.trim(), c.curName])}
        highlightIndex={editCode !== null ? currencies.findIndex(c => c.curCode.trim() === editCode) : null}
        onEdit={isAdmin() ? i => startEdit(currencies[i]) : undefined}
        onDelete={isAdmin() ? i => del(currencies[i]) : undefined}
      />
    </SectionWrapper>
  );
}

// â”€â”€ Countries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const emptyCountry = { countryID: '', country: '', nationality: '', zipCode: '', workingCountry: false, activeCountry: true };
const PAGE_SIZE = 10;

function CountriesSection({ countries, onReload }: { countries: Country[]; onReload: () => Promise<void> }) {
  const { isAdmin } = useAuth();
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editID, setEditID] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCountry);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = countries.filter(c => {
    if (activeOnly && !c.activeCountry) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.countryID.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function startAdd() { setForm(emptyCountry); setEditID(null); setMode('add'); }
  function startEdit(c: Country) {
    setForm({ countryID: c.countryID.trim(), country: c.country, nationality: c.nationality, zipCode: c.zipCode ?? '', workingCountry: c.workingCountry, activeCountry: c.activeCountry });
    setEditID(c.countryID.trim());
    setMode('edit');
  }
  function cancel() { setMode(null); setEditID(null); }

  async function save(e: FormEvent) {
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
      await onReload();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  }

  async function toggle(c: Country) {
    setToggling(c.countryID);
    try {
      await lookupsApi.toggleCountryActive(c.countryID.trim(), !c.activeCountry);
      await onReload();
      toast.success(c.activeCountry ? 'Country deactivated' : 'Country activated');
    } catch { toast.error('Failed to update status'); }
    finally { setToggling(null); }
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
        <div className="flex gap-2 items-center flex-wrap">
          <input
            className="px-3 py-[7px] border border-[#ddd] rounded-md text-sm outline-none focus:border-accent transition-colors w-[220px]"
            placeholder="Search by code or name…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          <label className="flex items-center gap-1.5 text-[13px] text-[#555] cursor-pointer select-none">
            <input type="checkbox" checked={activeOnly} onChange={e => { setActiveOnly(e.target.checked); setPage(1); }} />
            Active only
          </label>
        </div>
        {isAdmin() && mode === null && (
          <button onClick={startAdd} className="bg-[#9a7c4b] text-white border-none rounded-md px-4 py-[7px] text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors">
            + Add Country
          </button>
        )}
      </div>

      {/* Modal */}
      {mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Country' : 'New Country'} onClose={cancel} width="max-w-[580px]">
          <form onSubmit={save}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
              <Field label="Code * (2 chars)">
                <input className={inputCls} value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value.toUpperCase() }))} required maxLength={2} placeholder="LB" readOnly={mode === 'edit'} autoFocus={mode === 'add'} />
              </Field>
              <Field label="Country Name *">
                <input className={inputCls} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} required maxLength={50} autoFocus={mode === 'edit'} />
              </Field>
              <Field label="Nationality *">
                <input className={inputCls} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} required maxLength={50} />
              </Field>
              <Field label="Zip Code">
                <input className={inputCls} value={form.zipCode} onChange={e => setForm(f => ({ ...f, zipCode: e.target.value }))} maxLength={5} />
              </Field>
              <Field label="Flags">
                <div className="flex flex-col gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={form.workingCountry} onChange={e => setForm(f => ({ ...f, workingCountry: e.target.checked }))} />
                    Working Country
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                    <input type="checkbox" checked={form.activeCountry} onChange={e => setForm(f => ({ ...f, activeCountry: e.target.checked }))} />
                    Active
                  </label>
                </div>
              </Field>
            </div>
            <FormActions saving={saving} mode={mode} onCancel={cancel} />
          </form>
        </Modal>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] mt-1">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              {['Code', 'Country', 'Nationality', 'Zip', 'Working', 'Status', ''].map(h => (
                <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="p-5 text-center text-[#bbb] text-[13px]">No countries found.</td></tr>
            ) : (
              paged.map(c => (
                <tr key={c.countryID} className={clsx('border-b border-[#f0f0f0]', editID === c.countryID.trim() && 'bg-[#eef2ff]')}>
                  <td className="px-3.5 py-2.5 text-[13px] font-semibold text-[#6b7280]">{c.countryID.trim()}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{c.country}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{c.nationality}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{c.zipCode ?? '—'}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-[#333]">{c.workingCountry ? '✓' : '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold', c.activeCountry ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f3f4f6] text-[#9ca3af]')}>
                      {c.activeCountry ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {isAdmin() && (
                        <button
                          onClick={() => toggle(c)}
                          disabled={toggling === c.countryID}
                          className={clsx(
                            'rounded-md px-2.5 py-1 text-xs cursor-pointer border transition-colors disabled:opacity-60',
                            c.activeCountry
                              ? 'bg-[#fef3c7] text-[#b45309] border-[#fcd34d] hover:bg-[#fde68a]'
                              : 'bg-[#dcfce7] text-[#16a34a] border-[#86efac] hover:bg-[#bbf7d0]'
                          )}
                        >
                          {toggling === c.countryID ? '…' : c.activeCountry ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                      {isAdmin() && (
                        <button onClick={() => startEdit(c)} className="bg-[#e8f0fe] text-accent border border-[#c5d8fb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#d2e3fc]">
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 text-[13px] text-[#666]">
          <span>{filtered.length} countries آ· page {safePage} of {totalPages}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="px-3 py-1 rounded-md border border-[#ddd] bg-white disabled:opacity-40 hover:bg-surface cursor-pointer">‹ Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="px-3 py-1 rounded-md border border-[#ddd] bg-white disabled:opacity-40 hover:bg-surface cursor-pointer">Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€ Shared components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionWrapper({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-bold text-[#333]">{title}</h3>
        {onAdd && (
          <button onClick={onAdd} className="bg-[#9a7c4b] text-white border-none rounded-md px-4 py-[7px] text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors">
            + Add
          </button>
        )}
      </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-[#555]">{label}</label>
      {children}
    </div>
  );
}

function DataTable({ columns, rows, highlightIndex, onEdit, onDelete }: {
  columns: string[];
  rows: string[][];
  highlightIndex: number | null;
  onEdit?: (i: number) => void;
  onDelete?: (i: number) => void;
}) {
  const hasActions = onEdit != null || onDelete != null;
  return (
    <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] mt-1">
      <table className="w-full border-collapse bg-white">
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{c}</th>
            ))}
            {hasActions && <th className="px-3.5 py-2.5 bg-surface-2 border-b border-[#eee] w-[120px]" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + (hasActions ? 1 : 0)} className="p-5 text-center text-[#bbb] text-[13px]">No records.</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className={clsx('border-b border-[#f0f0f0]', highlightIndex === i && 'bg-[#eef2ff]')}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3.5 py-2.5 text-[13px] text-[#333]">{cell}</td>
                ))}
                {hasActions && (
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      {onEdit && <button onClick={() => onEdit(i)} className="bg-[#e8f0fe] text-accent border border-[#c5d8fb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#d2e3fc]">Edit</button>}
                      {onDelete && <button onClick={() => onDelete(i)} className="bg-[#c0392b] text-white border-none rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors">Delete</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

