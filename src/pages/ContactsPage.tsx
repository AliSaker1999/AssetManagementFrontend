import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { contactsApi } from '../api/contacts';
import type { Contact } from '../types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contactsApi.getList()
      .then((r) => setContacts(r.data as Contact[]))
      .catch(() => toast.error('Failed to load contacts'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: number) {
    if (!confirm('Delete this contact?')) return;
    try {
      await contactsApi.delete(id);
      setContacts((prev) => prev.filter((c) => c.contactID !== id));
      toast.success('Contact deleted');
    } catch { toast.error('Delete failed — contact may be in use'); }
  }

  const filtered = contacts.filter(
    (c) =>
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.telephone1.includes(search)
  );

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f' }}>Contacts</h2>
      </div>
      <input
        style={{ width: '100%', maxWidth: 400, padding: '9px 14px', border: '1.5px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: 20, outline: 'none' }}
        placeholder="Search by name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <p style={{ color: '#999' }}>Loading…</p>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr>
                {['Name', 'Contact Person', 'Address', 'Telephone', 'Mobile', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#bbb' }}>No contacts found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.contactID} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}><strong>{c.contactName}</strong></td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.contactPerson ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.address}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.telephone1}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.mobile1 ?? '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => handleDelete(c.contactID)} style={{ background: '#fee', color: '#c0392b', border: '1px solid #fcc', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
