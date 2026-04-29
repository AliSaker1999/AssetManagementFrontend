import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import type { Asset, Company, GroupType, CategoryType, LocationType, LocationDetail, Currency, Contact } from '../types';
import { contactsApi } from '../api/contacts';

export default function AssetFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const assetId = Number(id);

  const [form, setForm] = useState<Partial<Asset>>({
    purchasePrice: 0,
    donation: false,
    inServiceDate: new Date().toISOString().slice(0, 10),
    purchaseCurCode: 'USD',
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      lookupsApi.getCompanies(),
      lookupsApi.getGroups(),
      lookupsApi.getCategories(),
      lookupsApi.getLocations(),
      lookupsApi.getLocationDetails(),
      lookupsApi.getCurrencies(),
      contactsApi.getLookup(),
    ]).then(([c, g, cat, l, ld, cur, con]) => {
      setCompanies(c.data as Company[]);
      setGroups(g.data as GroupType[]);
      setCategories(cat.data as CategoryType[]);
      setLocations(l.data as LocationType[]);
      setLocDetails(ld.data as LocationDetail[]);
      setCurrencies(cur.data as Currency[]);
      setContacts(con.data as Contact[]);
    });
    if (isEdit) {
      assetsApi.get(assetId).then((r) => setForm(r.data as Asset));
    }
  }, [isEdit, assetId]);

  function set<K extends keyof Asset>(key: K, value: Asset[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await assetsApi.update(assetId, form as Asset);
        toast.success('Asset updated');
        navigate(`/assets/${assetId}`);
      } else {
        const r = await assetsApi.create(form as Asset);
        toast.success('Asset created');
        navigate(`/assets/${(r.data as { assetID: number }).assetID}`);
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  }

  const filteredCategories = form.groupID
    ? categories.filter((c) => c.groupID === form.groupID)
    : categories;

  const filteredLocDetails = form.locationID
    ? locDetails.filter((d) => d.locationID === form.locationID)
    : locDetails;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <Link to={isEdit ? `/assets/${assetId}` : '/assets'} style={{ color: '#1a73e8', textDecoration: 'none', fontSize: 13 }}>
        ← Back
      </Link>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', margin: '8px 0 24px' }}>
        {isEdit ? 'Edit Asset' : 'New Asset'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={gridStyle}>
          <Field label="Company *">
            <select style={inputStyle} value={form.companyID ?? ''} onChange={(e) => set('companyID', Number(e.target.value))} required>
              <option value="">Select…</option>
              {companies.map((c) => <option key={c.companyID} value={c.companyID}>{c.companyAbbreviation} – {c.companyName}</option>)}
            </select>
          </Field>
          <Field label="Asset Code *">
            <input style={inputStyle} value={form.assetCode ?? ''} onChange={(e) => set('assetCode', e.target.value)} required maxLength={15} />
          </Field>
          <Field label="Description *">
            <input style={inputStyle} value={form.assetDesc ?? ''} onChange={(e) => set('assetDesc', e.target.value)} required maxLength={50} />
          </Field>
          <Field label="Group *">
            <select style={inputStyle} value={form.groupID ?? ''} onChange={(e) => { set('groupID', Number(e.target.value)); set('categoryID', 0); }} required>
              <option value="">Select…</option>
              {groups.map((g) => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
            </select>
          </Field>
          <Field label="Category *">
            <select style={inputStyle} value={form.categoryID ?? ''} onChange={(e) => set('categoryID', Number(e.target.value))} required>
              <option value="">Select…</option>
              {filteredCategories.map((c) => <option key={c.categoryID} value={c.categoryID}>{c.category}</option>)}
            </select>
          </Field>
          <Field label="Location *">
            <select style={inputStyle} value={form.locationID ?? ''} onChange={(e) => { set('locationID', Number(e.target.value)); set('locDetailID', 0); }} required>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.locationID} value={l.locationID}>{l.location}</option>)}
            </select>
          </Field>
          <Field label="Location Detail *">
            <select style={inputStyle} value={form.locDetailID ?? ''} onChange={(e) => set('locDetailID', Number(e.target.value))} required>
              <option value="">Select…</option>
              {filteredLocDetails.map((d) => <option key={d.locDetailID} value={d.locDetailID}>Floor {d.floor}{d.zone ? ` / ${d.zone}` : ''}{d.room ? ` / ${d.room}` : ''}</option>)}
            </select>
          </Field>
          <Field label="In Service Date *">
            <input style={inputStyle} type="date" value={form.inServiceDate ?? ''} onChange={(e) => set('inServiceDate', e.target.value)} required />
          </Field>
          <Field label="Purchase Price">
            <input style={inputStyle} type="number" step="0.01" value={form.purchasePrice ?? 0} onChange={(e) => set('purchasePrice', Number(e.target.value))} />
          </Field>
          <Field label="Currency *">
            <select style={inputStyle} value={form.purchaseCurCode ?? ''} onChange={(e) => set('purchaseCurCode', e.target.value)} required>
              {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode} – {c.curName}</option>)}
            </select>
          </Field>
          <Field label="Purchase Date">
            <input style={inputStyle} type="date" value={form.purchaseDate ?? ''} onChange={(e) => set('purchaseDate', e.target.value)} />
          </Field>
          <Field label="Purchase Order No">
            <input style={inputStyle} value={form.purchaseOrderNo ?? ''} onChange={(e) => set('purchaseOrderNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Invoice No">
            <input style={inputStyle} value={form.invoiceNo ?? ''} onChange={(e) => set('invoiceNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Invoice Date">
            <input style={inputStyle} type="date" value={form.invoiceDate ?? ''} onChange={(e) => set('invoiceDate', e.target.value)} />
          </Field>
          <Field label="Accounting Entry Date">
            <input style={inputStyle} type="date" value={form.accountingEntryDate ?? ''} onChange={(e) => set('accountingEntryDate', e.target.value)} />
          </Field>
          <Field label="Accounting JV No">
            <input style={inputStyle} value={form.accountingEntryJVNo ?? ''} onChange={(e) => set('accountingEntryJVNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Barcode Number">
            <input style={inputStyle} value={form.barcodeNumber ?? ''} onChange={(e) => set('barcodeNumber', e.target.value)} maxLength={20} />
          </Field>
          <Field label="Serial Number">
            <input style={inputStyle} value={form.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value)} maxLength={50} />
          </Field>
          <Field label="Contact / Supplier">
            <select style={inputStyle} value={form.contactID ?? ''} onChange={(e) => set('contactID', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">None</option>
              {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
            </select>
          </Field>
          <Field label="Installed At">
            <input style={inputStyle} value={form.installedAt ?? ''} onChange={(e) => set('installedAt', e.target.value)} maxLength={50} />
          </Field>
          <Field label="Donation">
            <select style={inputStyle} value={form.donation ? 'true' : 'false'} onChange={(e) => set('donation', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </Field>
          <Field label="Remark">
            <input style={inputStyle} value={form.remark ?? ''} onChange={(e) => set('remark', e.target.value)} maxLength={100} />
          </Field>
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
          <button type="submit" disabled={saving} style={{ background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : isEdit ? 'Update Asset' : 'Create Asset'}
          </button>
          <Link to={isEdit ? `/assets/${assetId}` : '/assets'} style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid #ccc', color: '#555', textDecoration: 'none', fontSize: 14 }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: '#555', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px',
  background: '#fff', padding: 24, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
};

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #ddd', borderRadius: 6, padding: '8px 10px', fontSize: 14, outline: 'none',
};
