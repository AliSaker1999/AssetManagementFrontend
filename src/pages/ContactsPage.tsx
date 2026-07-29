import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import { contactsApi } from '../api/contacts';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import { useConfirm } from '../hooks/useConfirm';
import type { Contact, Country, PaginatedResponse } from '../types';
import Select from '../components/ui/Select';
import TablePagination from '../components/ui/TablePagination';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

interface ContactType {
  contactTypeID: number;
  contactType: string;
}

const emptyForm = {
  contactName: '',
  contactTypeID: 0,
  contactPerson: '',
  contactPersonEmail: '',
  financialContact: '',
  financialContactEmail: '',
  address: '',
  countryID: '',
  telephone1: '',
  telephone2: '',
  mobile1: '',
  mobile2: '',
  fax1: '',
  fax2: '',
  remark: '',
};

const inp = 'w-full px-2.5 py-[7px] border border-[#ddd] rounded-md text-sm outline-none focus:border-accent transition-colors box-border';
const lbl = 'text-xs font-semibold text-[#555] mb-1 block';

export default function ContactsPage() {
  const { isAuditor, isAdmin, allowedCountries } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allContactsCache, setAllContactsCache] = useState<Contact[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog } = useConfirm();
  const readOnly = isAuditor();
  const allowedCountrySet = new Set(allowedCountries);
  const visibleCountries = isAdmin()
    ? countries.filter((c) => c.activeCountry)
    : countries.filter((c) => c.activeCountry && allowedCountrySet.has(c.countryID));

  useEffect(() => {
    Promise.all([
      lookupsApi.getContactTypes(),
      lookupsApi.getCountries(),
    ])
      .then(([ct, co]) => {
        setContactTypes(ct.data as ContactType[]);
        setCountries(co.data as Country[]);
      })
      .catch((err) => handleApiError(err, 'Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setAllContactsCache(null);
  }, [search, pageSize]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (search.trim() === '') {
          const r = await contactsApi.getListPaginated(pageNumber, pageSize);
          const data = r.data as PaginatedResponse<Contact>;
          setContacts(data.data);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
          setAllContactsCache(null);
          return;
        }

        let allData = allContactsCache;
        if (!allData) {
          const r = await contactsApi.getList();
          allData = r.data as Contact[];
          setAllContactsCache(allData);
        }

        const q = search.toLowerCase();
        const filtered = allData.filter((c) =>
          c.contactName.toLowerCase().includes(q) ||
          c.telephone1.includes(search)
        );
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const start = (pageNumber - 1) * pageSize;
        setContacts(filtered.slice(start, start + pageSize));
        setTotalPages(newTotalPages);
        setTotalCount(filtered.length);
      } catch (err) {
        handleApiError(err, 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pageNumber, pageSize, search, reloadKey]);

  async function reload() {
    setAllContactsCache(null);
    setReloadKey((k) => k + 1);
  }

  function startAdd() {
    if (readOnly) return;
    setForm(emptyForm);
    setEditId(null);
    setMode('add');
  }

  async function startEdit(id: number) {
    if (readOnly) return;
    try {
      const r = await contactsApi.get(id);
      const c = r.data as Contact;
      setForm({
        contactName: c.contactName,
        contactTypeID: c.contactTypeID,
        contactPerson: c.contactPerson ?? '',
        contactPersonEmail: c.contactPersonEmail ?? '',
        financialContact: c.financialContact ?? '',
        financialContactEmail: c.financialContactEmail ?? '',
        address: c.address ?? '',
        countryID: c.countryID ?? '',
        telephone1: c.telephone1,
        telephone2: c.telephone2 ?? '',
        mobile1: c.mobile1 ?? '',
        mobile2: c.mobile2 ?? '',
        fax1: c.fax1 ?? '',
        fax2: c.fax2 ?? '',
        remark: c.remark ?? '',
      });
      setEditId(id);
      setMode('edit');
    } catch (err) { handleApiError(err, 'Failed to load contact'); }
  }

  function cancel() { setMode(null); setEditId(null); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!form.contactTypeID) { toast.error('Please select a contact type'); return; }
    setSaving(true);
    const payload = {
      ...form,
      contactPerson: form.contactPerson || null,
      contactPersonEmail: form.contactPersonEmail || null,
      financialContact: form.financialContact || null,
      financialContactEmail: form.financialContactEmail || null,
      telephone2: form.telephone2 || null,
      mobile1: form.mobile1 || null,
      mobile2: form.mobile2 || null,
      fax1: form.fax1 || null,
      fax2: form.fax2 || null,
      remark: form.remark || null,
    };
    try {
      if (mode === 'edit' && editId !== null) {
        await contactsApi.update(editId, payload);
        toast.success('Contact updated');
      } else {
        await contactsApi.create(payload);
        toast.success('Contact created');
      }
      cancel();
      await reload();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (readOnly) return;
    const ok = await confirm('Delete this contact?', { title: 'Delete Contact' });
    if (!ok) return;
    try {
      await contactsApi.delete(id);
      setContacts(prev => prev.filter(c => c.contactID !== id));
      toast.success('Contact deleted');
    } catch (err) { handleApiError(err, 'Delete failed — contact may be in use'); }
  }

  function typeName(id: number) {
    return contactTypes.find(t => t.contactTypeID === id)?.contactType ?? '—';
  }

  return (
    <div className="px-8 py-6">
      {dialog}
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-[22px] font-bold text-brand">Contacts</h2>
        {!readOnly && (
          <button
            onClick={startAdd}
            className="bg-[#9a7c4b] text-white border-none rounded-md px-4 py-[7px] text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors"
          >
            + Add Contact
          </button>
        )}
      </div>

      <input
        className="w-full max-w-[400px] px-3.5 py-[9px] border border-[#ddd] rounded-lg text-sm outline-none focus:border-accent transition-colors mb-5"
        placeholder="Search by name or phone…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Add / Edit Modal */}
      {!readOnly && mode !== null && (
        <Modal title={mode === 'edit' ? 'Edit Contact' : 'New Contact'} onClose={cancel} width="max-w-[700px]">
          <form onSubmit={handleSave}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
              <div className="col-span-full">
                <label className={lbl}>Contact Name *</label>
                <input className={inp} value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} required maxLength={100} autoFocus />
              </div>

              <div>
                <label className={lbl}>Contact Type *</label>
                <Select value={form.contactTypeID || ''} onChange={e => setForm(f => ({ ...f, contactTypeID: Number(e.target.value) }))} required>
                  <option value="">Select type…</option>
                  {contactTypes.map(t => <option key={t.contactTypeID} value={t.contactTypeID}>{t.contactType}</option>)}
                </Select>
              </div>

              <div>
                <label className={lbl}>Country</label>
                <Select value={form.countryID} onChange={e => setForm(f => ({ ...f, countryID: e.target.value }))}>
                  <option value="">Select country…</option>
                  {visibleCountries.map(c => <option key={c.countryID} value={c.countryID}>{c.country}</option>)}
                </Select>
              </div>

              <div>
                <label className={lbl}>Address</label>
                <input className={inp} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} maxLength={200} />
              </div>

              <div>
                <label className={lbl}>Contact Person</label>
                <input className={inp} value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} maxLength={100} />
              </div>

              <div>
                <label className={lbl}>Contact Person Email</label>
                <input className={inp} type="email" value={form.contactPersonEmail} onChange={e => setForm(f => ({ ...f, contactPersonEmail: e.target.value }))} maxLength={50} />
              </div>

              <div>
                <label className={lbl}>Financial Contact</label>
                <input className={inp} value={form.financialContact} onChange={e => setForm(f => ({ ...f, financialContact: e.target.value }))} maxLength={100} />
              </div>

              <div>
                <label className={lbl}>Financial Contact Email</label>
                <input className={inp} type="email" value={form.financialContactEmail} onChange={e => setForm(f => ({ ...f, financialContactEmail: e.target.value }))} maxLength={50} />
              </div>

              <div>
                <label className={lbl}>Telephone 1 *</label>
                <input className={inp} value={form.telephone1} onChange={e => setForm(f => ({ ...f, telephone1: e.target.value }))} required maxLength={16} />
              </div>

              <div>
                <label className={lbl}>Telephone 2</label>
                <input className={inp} value={form.telephone2} onChange={e => setForm(f => ({ ...f, telephone2: e.target.value }))} maxLength={16} />
              </div>

              <div>
                <label className={lbl}>Mobile 1</label>
                <input className={inp} value={form.mobile1} onChange={e => setForm(f => ({ ...f, mobile1: e.target.value }))} maxLength={16} />
              </div>

              <div>
                <label className={lbl}>Mobile 2</label>
                <input className={inp} value={form.mobile2} onChange={e => setForm(f => ({ ...f, mobile2: e.target.value }))} maxLength={16} />
              </div>

              <div>
                <label className={lbl}>Fax 1</label>
                <input className={inp} value={form.fax1} onChange={e => setForm(f => ({ ...f, fax1: e.target.value }))} maxLength={16} />
              </div>

              <div>
                <label className={lbl}>Fax 2</label>
                <input className={inp} value={form.fax2} onChange={e => setForm(f => ({ ...f, fax2: e.target.value }))} maxLength={16} />
              </div>

              <div className="col-span-full">
                <label className={lbl}>Remark</label>
                <textarea className={inp + ' resize-none'} rows={2} value={form.remark} onChange={e => setForm(f => ({ ...f, remark: e.target.value }))} maxLength={500} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button type="submit" disabled={saving} className="bg-[#9a7c4b] text-white border-none rounded-md px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70">
                {saving ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={cancel} className="bg-white text-[#555] border border-[#ccc] rounded-md px-4 py-2 text-[13px] cursor-pointer hover:bg-surface">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {loading ? (
        <p className="text-[#999]">Loading…</p>
      ) : (
        <>
          <TablePagination
            summary={totalCount > 0
              ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} contacts`
              : 'No contacts'}
            pageNumber={pageNumber}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageNumber(1);
            }}
            onPrevious={() => setPageNumber(p => Math.max(1, p - 1))}
            onNext={() => setPageNumber(p => Math.min(totalPages, p + 1))}
            onFirst={() => setPageNumber(1)}
             onLast={() => setPageNumber(totalPages)}
             onGoToPage={(page) => setPageNumber(page)}
          />

          <div className="overflow-x-auto rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
            <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Name', 'Contact Type', 'Contact Person', 'Country', 'Telephone', 'Mobile', ...(readOnly ? [] : [''])].map(h => (
                  <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-[#666] bg-surface-2 border-b border-[#eee]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr><td colSpan={readOnly ? 6 : 7} className="p-5 text-center text-[#bbb]">No contacts found.</td></tr>
              ) : (
                contacts.map(c => (
                  <tr key={c.contactID} className="border-b border-[#f0f0f0] hover:bg-[#fafbff]">
                    <td className="px-3.5 py-2.5 text-[13px] font-semibold text-[#333]">{c.contactName}</td>
                    <td className="px-3.5 py-2.5 text-[13px] text-[#555]">{typeName(c.contactTypeID)}</td>
                    <td className="px-3.5 py-2.5 text-[13px] text-[#555]">{c.contactPerson ?? '—'}</td>
                    <td className="px-3.5 py-2.5 text-[13px] text-[#555]">{c.country ?? '—'}</td>
                    <td className="px-3.5 py-2.5 text-[13px] text-[#555]">{c.telephone1}</td>
                    <td className="px-3.5 py-2.5 text-[13px] text-[#555]">{c.mobile1 ?? '—'}</td>
                    {!readOnly && (
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => startEdit(c.contactID)}
                            className="bg-[#e8f0fe] text-accent border border-[#c5d8fb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#d2e3fc]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.contactID)}
                            className="bg-[#c0392b] text-white border-none rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

