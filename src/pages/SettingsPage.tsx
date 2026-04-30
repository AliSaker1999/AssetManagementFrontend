import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { lookupsApi } from '../api/lookups';
import type { GroupType, CategoryType, LocationType, LocationDetail } from '../types';

type Section = 'groups' | 'categories' | 'locations' | 'location-details';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'groups', label: 'Asset Groups' },
  { key: 'categories', label: 'Categories' },
  { key: 'locations', label: 'Locations' },
  { key: 'location-details', label: 'Location Details' },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('groups');
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [g, c, l, ld] = await Promise.all([
      lookupsApi.getGroupsFull(),
      lookupsApi.getCategories(),
      lookupsApi.getLocations(),
      lookupsApi.getLocationDetails(),
    ]);
    setGroups(g.data as GroupType[]);
    setCategories(c.data as CategoryType[]);
    setLocations(l.data as LocationType[]);
    setLocDetails(ld.data as LocationDetail[]);
  }

  async function reloadGroups() {
    const r = await lookupsApi.getGroupsFull();
    setGroups(r.data as GroupType[]);
  }
  async function reloadCategories() {
    const r = await lookupsApi.getCategories();
    setCategories(r.data as CategoryType[]);
  }
  async function reloadLocations() {
    const r = await lookupsApi.getLocations();
    setLocations(r.data as LocationType[]);
  }
  async function reloadLocDetails() {
    const r = await lookupsApi.getLocationDetails();
    setLocDetails(r.data as LocationDetail[]);
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>Settings</h2>
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #eee', marginBottom: 24 }}>
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            color: section === s.key ? '#1e3a5f' : '#888',
            borderBottom: section === s.key ? '2px solid #1e3a5f' : '2px solid transparent',
            marginBottom: -2,
          }}>{s.label}</button>
        ))}
      </div>

      {section === 'groups' && (
        <GroupsSection groups={groups} onReload={reloadGroups} />
      )}
      {section === 'categories' && (
        <CategoriesSection categories={categories} groups={groups} onReload={reloadCategories} />
      )}
      {section === 'locations' && (
        <LocationsSection locations={locations} onReload={reloadLocations} />
      )}
      {section === 'location-details' && (
        <LocationDetailsSection locDetails={locDetails} locations={locations} onReload={reloadLocDetails} />
      )}
    </div>
  );
}

// ── Groups ────────────────────────────────────────────────────────────────────

const emptyGroup = { groupName: '', acronym: '', depreciationRate: 0, accountNo: '', accountingExclusion: false };

function GroupsSection({ groups, onReload }: { groups: GroupType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyGroup);
  const [saving, setSaving] = useState(false);

  function startAdd() { setForm(emptyGroup); setEditId(null); setMode('add'); }
  function startEdit(g: GroupType) {
    setForm({ groupName: g.groupName, acronym: g.acronym, depreciationRate: g.depreciationRate, accountNo: g.accountNo ?? '', accountingExclusion: g.accountingExclusion });
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
    if (!confirm(`Delete group "${g.groupName}"?`)) return;
    try {
      await lookupsApi.deleteGroup(g.groupID);
      await onReload();
      toast.success('Group deleted');
    } catch { toast.error('Delete failed — group may be in use'); }
  }

  return (
    <Section title="Asset Groups" onAdd={mode === null ? startAdd : undefined}>
      {mode !== null && (
        <form onSubmit={save} style={formPanelStyle}>
          <div style={formGridStyle}>
            <Field label="Group Name *">
              <input style={inputStyle} value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} required maxLength={50} autoFocus />
            </Field>
            <Field label="Acronym *">
              <input style={inputStyle} value={form.acronym} onChange={e => setForm(f => ({ ...f, acronym: e.target.value }))} required maxLength={10} />
            </Field>
            <Field label="Dep. Rate % *">
              <input style={inputStyle} type="number" min={0} max={100} value={form.depreciationRate} onChange={e => setForm(f => ({ ...f, depreciationRate: Number(e.target.value) }))} required />
            </Field>
            <Field label="Account No">
              <input style={inputStyle} value={form.accountNo} onChange={e => setForm(f => ({ ...f, accountNo: e.target.value }))} maxLength={20} />
            </Field>
            <Field label="Accounting Exclusion">
              <select style={inputStyle} value={form.accountingExclusion ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, accountingExclusion: e.target.value === 'true' }))}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </Field>
          </div>
          <FormActions saving={saving} mode={mode} onCancel={cancel} />
        </form>
      )}
      <Table
        columns={['Group Name', 'Acronym', 'Dep. Rate %', 'Account No', 'Excl.']}
        rows={groups.map(g => [g.groupName, g.acronym, `${g.depreciationRate}%`, g.accountNo ?? '—', g.accountingExclusion ? 'Yes' : 'No'])}
        highlightIndex={editId !== null ? groups.findIndex(g => g.groupID === editId) : null}
        onEdit={i => startEdit(groups[i])}
        onDelete={i => del(groups[i])}
      />
    </Section>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

const emptyCat = { category: '', groupID: 0 };

function CategoriesSection({ categories, groups, onReload }: { categories: CategoryType[]; groups: GroupType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCat);
  const [saving, setSaving] = useState(false);

  function startAdd() { setForm(emptyCat); setEditId(null); setMode('add'); }
  function startEdit(c: CategoryType) {
    setForm({ category: c.category, groupID: c.groupID });
    setEditId(c.categoryID);
    setMode('edit');
  }
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
    if (!confirm(`Delete category "${c.category}"?`)) return;
    try {
      await lookupsApi.deleteCategory(c.categoryID);
      await onReload();
      toast.success('Category deleted');
    } catch { toast.error('Delete failed — category may be in use'); }
  }

  return (
    <Section title="Categories" onAdd={mode === null ? startAdd : undefined}>
      {mode !== null && (
        <form onSubmit={save} style={formPanelStyle}>
          <div style={formGridStyle}>
            <Field label="Category *">
              <input style={inputStyle} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required maxLength={50} autoFocus />
            </Field>
            <Field label="Group *">
              <select style={inputStyle} value={form.groupID || ''} onChange={e => setForm(f => ({ ...f, groupID: Number(e.target.value) }))} required>
                <option value="">Select group…</option>
                {groups.map(g => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
              </select>
            </Field>
          </div>
          <FormActions saving={saving} mode={mode} onCancel={cancel} />
        </form>
      )}
      <Table
        columns={['Category', 'Group']}
        rows={categories.map(c => [c.category, groups.find(g => g.groupID === c.groupID)?.groupName ?? String(c.groupID)])}
        highlightIndex={editId !== null ? categories.findIndex(c => c.categoryID === editId) : null}
        onEdit={i => startEdit(categories[i])}
        onDelete={i => del(categories[i])}
      />
    </Section>
  );
}

// ── Locations ─────────────────────────────────────────────────────────────────

function LocationsSection({ locations, onReload }: { locations: LocationType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ location: '' });
  const [saving, setSaving] = useState(false);

  function startAdd() { setForm({ location: '' }); setEditId(null); setMode('add'); }
  function startEdit(l: LocationType) { setForm({ location: l.location }); setEditId(l.locationID); setMode('edit'); }
  function cancel() { setMode(null); setEditId(null); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateLocation(editId, form.location);
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
    if (!confirm(`Delete location "${l.location}"?`)) return;
    try {
      await lookupsApi.deleteLocation(l.locationID);
      await onReload();
      toast.success('Location deleted');
    } catch { toast.error('Delete failed — location may be in use'); }
  }

  return (
    <Section title="Locations" onAdd={mode === null ? startAdd : undefined}>
      {mode !== null && (
        <form onSubmit={save} style={formPanelStyle}>
          <div style={formGridStyle}>
            <Field label="Location Name *">
              <input style={inputStyle} value={form.location} onChange={e => setForm({ location: e.target.value })} required maxLength={50} autoFocus />
            </Field>
          </div>
          <FormActions saving={saving} mode={mode} onCancel={cancel} />
        </form>
      )}
      <Table
        columns={['Location']}
        rows={locations.map(l => [l.location])}
        highlightIndex={editId !== null ? locations.findIndex(l => l.locationID === editId) : null}
        onEdit={i => startEdit(locations[i])}
        onDelete={i => del(locations[i])}
      />
    </Section>
  );
}

// ── Location Details ──────────────────────────────────────────────────────────

const emptyLd = { locationID: 0, floor: '', zone: '', room: '' };

function LocationDetailsSection({ locDetails, locations, onReload }: { locDetails: LocationDetail[]; locations: LocationType[]; onReload: () => Promise<void> }) {
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyLd);
  const [saving, setSaving] = useState(false);

  function startAdd() { setForm(emptyLd); setEditId(null); setMode('add'); }
  function startEdit(d: LocationDetail) {
    setForm({ locationID: d.locationID, floor: d.floor, zone: d.zone ?? '', room: d.room ?? '' });
    setEditId(d.locDetailID);
    setMode('edit');
  }
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
    if (!confirm('Delete this location detail?')) return;
    try {
      await lookupsApi.deleteLocationDetail(d.locDetailID);
      await onReload();
      toast.success('Location detail deleted');
    } catch { toast.error('Delete failed'); }
  }

  return (
    <Section title="Location Details" onAdd={mode === null ? startAdd : undefined}>
      {mode !== null && (
        <form onSubmit={save} style={formPanelStyle}>
          <div style={formGridStyle}>
            {mode === 'add' && (
              <Field label="Location *">
                <select style={inputStyle} value={form.locationID || ''} onChange={e => setForm(f => ({ ...f, locationID: Number(e.target.value) }))} required>
                  <option value="">Select location…</option>
                  {locations.map(l => <option key={l.locationID} value={l.locationID}>{l.location}</option>)}
                </select>
              </Field>
            )}
            <Field label="Floor *">
              <input style={inputStyle} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} required maxLength={10} autoFocus={mode === 'edit'} />
            </Field>
            <Field label="Zone">
              <input style={inputStyle} value={form.zone} onChange={e => setForm(f => ({ ...f, zone: e.target.value }))} maxLength={10} />
            </Field>
            <Field label="Room">
              <input style={inputStyle} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} maxLength={10} />
            </Field>
          </div>
          <FormActions saving={saving} mode={mode} onCancel={cancel} />
        </form>
      )}
      <Table
        columns={['Location', 'Floor', 'Zone', 'Room']}
        rows={locDetails.map(d => [
          locations.find(l => l.locationID === d.locationID)?.location ?? String(d.locationID),
          d.floor,
          d.zone ?? '—',
          d.room ?? '—',
        ])}
        highlightIndex={editId !== null ? locDetails.findIndex(d => d.locDetailID === editId) : null}
        onEdit={i => startEdit(locDetails[i])}
        onDelete={i => del(locDetails[i])}
      />
    </Section>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function Section({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{title}</h3>
        {onAdd && (
          <button onClick={onAdd} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
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
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <button type="submit" disabled={saving} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}
      </button>
      <button type="button" onClick={onCancel} style={{ background: '#fff', color: '#555', border: '1.5px solid #ccc', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
        Cancel
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>{label}</label>
      {children}
    </div>
  );
}

function Table({ columns, rows, highlightIndex, onEdit, onDelete }: {
  columns: string[];
  rows: string[][];
  highlightIndex: number | null;
  onEdit: (i: number) => void;
  onDelete: (i: number) => void;
}) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginTop: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>{c}</th>
            ))}
            <th style={{ padding: '10px 14px', background: '#f8f9fa', borderBottom: '1px solid #eee', width: 120 }} />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length + 1} style={{ padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No records.</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0', background: highlightIndex === i ? '#eef2ff' : undefined }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '10px 14px', fontSize: 13, color: '#333' }}>{cell}</td>
                ))}
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => onEdit(i)} style={{ background: '#e8f0fe', color: '#1a73e8', border: '1px solid #c5d8fb', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => onDelete(i)} style={{ background: '#fee', color: '#c0392b', border: '1px solid #fcc', borderRadius: 5, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const formPanelStyle: React.CSSProperties = {
  background: '#f8f9fb',
  border: '1px solid #e0e4ed',
  borderRadius: 8,
  padding: '16px 20px',
  marginBottom: 16,
};

const formGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px 16px',
};

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #ddd',
  borderRadius: 6,
  padding: '7px 10px',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
