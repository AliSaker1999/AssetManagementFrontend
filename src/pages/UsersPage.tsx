import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import { usersApi } from '../api/users';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import type { UserListItem, UserPermission, Company } from '../types';
import Select from '../components/ui/Select';
import TablePagination from '../components/ui/TablePagination';

const ROLES = [
  { id: 1, name: 'Administrator' },
  { id: 2, name: 'System Auditor' },
  { id: 3, name: 'Full Access User' },
];

const emptyForm = { userName: '', password: '', fullName: '', emailAddress: '', roleID: 3 };
const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

const inputCls = 'w-full px-2.5 py-2 rounded-md border border-[#d1d5db] text-[13px] outline-none focus:border-accent transition-colors box-border';
const labelCls = 'block text-xs font-semibold text-[#374151] mb-1 mt-3';
const btnPrimary = 'px-4 py-2 bg-[#9a7c4b] text-white border-none rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors';
const btnSmCls = 'px-2.5 py-1 bg-[#f3f4f6] text-[#374151] border-none rounded-md text-xs cursor-pointer hover:bg-[#e5e7eb]';
const btnDangerCls = 'px-2.5 py-1 bg-[#c0392b] text-white border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors';

export default function UsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedCompanyIDs, setSelectedCompanyIDs] = useState<Set<number>>(new Set());
  const [formSaving, setFormSaving] = useState(false);

  // Access modal state
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [grantCompanyID, setGrantCompanyID] = useState('');
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    lookupsApi.getCompanies()
      .then((companiesRes) => setCompanies(companiesRes.data))
      .catch((err) => handleApiError(err, 'Failed to load companies'));
  }, []);

  useEffect(() => {
    setLoading(true);
    usersApi.getUsersPaginated(pageNumber, pageSize)
      .then((usersRes) => {
        setUsers(usersRes.data.data);
        setTotalPages(usersRes.data.totalPages);
        setTotalCount(usersRes.data.totalCount);
      })
      .catch((err) => handleApiError(err, 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [pageNumber, pageSize, reloadKey]);

  async function openAccessModal(user: UserListItem) {
    setSelectedUser(user);
    setShowAccessModal(true);
    setGrantCompanyID('');
    setPermissionsLoading(true);
    try {
      const res = await usersApi.getPermissions(user.userID);
      setPermissions(res.data);
    } catch (err) {
      handleApiError(err, 'Failed to load permissions');
    } finally {
      setPermissionsLoading(false);
    }
  }

  function closeAccessModal() {
    setShowAccessModal(false);
    setSelectedUser(null);
    setPermissions([]);
  }

  async function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedCompanyIDs(new Set());
    setShowForm(true);
  }

  async function openEdit(u: UserListItem) {
    setEditingId(u.userID);
    setForm({ userName: u.userName, password: '', fullName: u.fullName, emailAddress: u.emailAddress, roleID: u.roleID });
    try {
      const res = await usersApi.getPermissions(u.userID);
      setSelectedCompanyIDs(new Set((res.data as UserPermission[]).map(p => p.companyID)));
    } catch {
      setSelectedCompanyIDs(new Set());
    }
    setShowForm(true);
  }

  function toggleCompany(companyID: number, checked: boolean) {
    setSelectedCompanyIDs(prev => {
      const next = new Set(prev);
      checked ? next.add(companyID) : next.delete(companyID);
      return next;
    });
  }

  async function syncPermissions(userId: number) {
    const needsCompanyAccess = form.roleID === 2 || form.roleID === 3;
    if (!needsCompanyAccess) return;
    const currentRes = await usersApi.getPermissions(userId);
    const current: UserPermission[] = currentRes.data;
    const currentIDs = new Set(current.map(p => p.companyID));
    const toGrant = [...selectedCompanyIDs].filter(id => !currentIDs.has(id));
    const toRevoke = current.filter(p => !selectedCompanyIDs.has(p.companyID));
    await Promise.all([
      ...toGrant.map(id => {
        const co = companies.find(c => c.companyID === id);
        if (!co) return Promise.resolve();
        return usersApi.grantPermission(userId, { countryID: co.countryID, companyID: co.companyID });
      }),
      ...toRevoke.map(p => usersApi.revokePermission(userId, p.countryID, p.companyID)),
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormSaving(true);
    try {
      if (editingId) {
        await usersApi.updateUser(editingId, form);
        await syncPermissions(editingId);
        toast.success('User updated');
      } else {
        const res = await usersApi.createUser(form as typeof form & { password: string });
        const newUserId: number = res.data.userId;
        await syncPermissions(newUserId);
        toast.success('User created');
      }
      setReloadKey((k) => k + 1);
      if (selectedUser && editingId === selectedUser.userID) {
        const permsRes = await usersApi.getPermissions(selectedUser.userID);
        setPermissions(permsRes.data);
      }
      setShowForm(false);
    } catch (err) {
      handleApiError(err, 'Failed to save user');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm('Delete this user?', { title: 'Delete User' });
    if (!ok) return;
    try {
      await usersApi.deleteUser(id);
      setUsers(u => u.filter(x => x.userID !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      if (selectedUser?.userID === id) closeAccessModal();
      toast.success('User deleted');
    } catch (err) {
      handleApiError(err, 'Failed to delete user');
    }
  }

  async function handleGrant() {
    if (!selectedUser || !grantCompanyID) return;
    const co = companies.find(c => c.companyID === Number(grantCompanyID));
    if (!co) return;
    try {
      await usersApi.grantPermission(selectedUser.userID, { countryID: co.countryID, companyID: co.companyID });
      const res = await usersApi.getPermissions(selectedUser.userID);
      setPermissions(res.data);
      setGrantCompanyID('');
      toast.success('Access granted');
    } catch (err) {
      handleApiError(err, 'Failed to grant access');
    }
  }

  async function handleRevoke(p: UserPermission) {
    if (!selectedUser) return;
    try {
      await usersApi.revokePermission(selectedUser.userID, p.countryID, p.companyID);
      setPermissions(prev => prev.filter(x => !(x.companyID === p.companyID && x.countryID === p.countryID)));
      toast.success('Access revoked');
    } catch (err) {
      handleApiError(err, 'Failed to revoke access');
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-[900px] mx-auto">
      {dialog}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-[22px] font-bold text-brand">User Management</h1>
        <button className={btnPrimary} onClick={openCreate}>+ New User</button>
      </div>

      {/* User list — full width */}
      <div className="bg-white rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <h2 className="text-[15px] font-semibold text-[#374151] mb-4">Users</h2>
        <TablePagination
          summary={totalCount > 0
            ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} users`
            : 'No users'}
          pageNumber={pageNumber}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageNumber(1);
          }}
          onFirst={() => setPageNumber(1)}
          onPrevious={() => setPageNumber((p) => Math.max(1, p - 1))}
          onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
          onLast={() => setPageNumber(totalPages)}
          onGoToPage={(page) => setPageNumber(page)}
        />

        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Full Name', 'Username', 'Email', 'Role', ''].map(h => (
                <th key={h} className="text-left px-3 py-2 text-xs text-[#6b7280] font-semibold border-b border-[#e5e7eb]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr
                key={u.userID}
                className={clsx('cursor-pointer', selectedUser?.userID === u.userID && showAccessModal ? 'bg-[#eef3fb]' : 'hover:bg-surface')}
                onClick={() => openAccessModal(u)}
              >
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{u.fullName}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{u.userName}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{u.emailAddress}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{u.roleName}</td>
                <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6] whitespace-nowrap">
                  <button className={btnSmCls} onClick={e => { e.stopPropagation(); openEdit(u); }}>Edit</button>
                  {' '}
                  <button className={btnDangerCls} onClick={e => { e.stopPropagation(); handleDelete(u.userID); }}>Del</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Access Modal */}
      {showAccessModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={closeAccessModal}>
          <div className="bg-white rounded-xl p-8 w-[520px] max-h-[85vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.18)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-brand m-0">
                Access: {selectedUser.fullName}
              </h2>
              <button className={btnSmCls} onClick={closeAccessModal}>✕ Close</button>
            </div>

            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Select value={grantCompanyID} onChange={e => setGrantCompanyID(e.target.value)}>
                  <option value="">-- Select company --</option>
                  {companies.map(c => (
                    <option key={c.companyID} value={c.companyID}>{c.companyName}</option>
                  ))}
                </Select>
              </div>
              <button className={btnPrimary} onClick={handleGrant}>Grant</button>
            </div>

            {permissionsLoading ? (
              <p className="text-[#6b7280] text-[13px]">Loading…</p>
            ) : permissions.length === 0 ? (
              <p className="text-[#6b7280] text-[13px]">No company access assigned.</p>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Company', 'Country', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs text-[#6b7280] font-semibold border-b border-[#e5e7eb]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map(p => (
                    <tr key={`${p.countryID}-${p.companyID}`}>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{p.companyName}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151] border-b border-[#f3f4f6]">{p.country}</td>
                      <td className="px-3 py-2.5 text-[13px] border-b border-[#f3f4f6]">
                        <button className={btnDangerCls} onClick={() => handleRevoke(p)}>Revoke</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-8 w-[440px] max-h-[90vh] overflow-y-auto shadow-[0_8px_32px_rgba(0,0,0,0.18)]" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-brand mt-0 mb-4">
              {editingId ? 'Edit User' : 'New User'}
            </h2>
            <form onSubmit={handleSubmit}>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />

              <label className={labelCls}>Username</label>
              <input className={inputCls} value={form.userName} onChange={e => setForm(f => ({ ...f, userName: e.target.value }))} required />

              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                type="email"
                value={form.emailAddress}
                onChange={e => setForm(f => ({ ...f, emailAddress: e.target.value }))}
                required
              />

              <label className={labelCls}>{editingId ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className={inputCls} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required={!editingId} />

              <label className={labelCls}>Role</label>
              <Select value={form.roleID} onChange={e => setForm(f => ({ ...f, roleID: Number(e.target.value) }))}>
                {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>

              {(form.roleID === 2 || form.roleID === 3) && (
                <div className="mt-4">
                  <label className={labelCls + ' mb-2'}>Company Access</label>
                  <div className="border border-[#e5e7eb] rounded-lg px-3.5 py-2.5 max-h-[200px] overflow-y-auto flex flex-col gap-2">
                    {companies.length === 0 && (
                      <span className="text-[13px] text-[#9ca3af]">No companies available.</span>
                    )}
                    {companies.map(c => (
                      <label key={c.companyID} className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCompanyIDs.has(c.companyID)}
                          onChange={e => toggleCompany(c.companyID, e.target.checked)}
                        />
                        {c.companyName}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-5">
                <button type="submit" className={btnPrimary} disabled={formSaving}>{formSaving ? 'Saving…' : 'Save'}</button>
                <button type="button" className={btnSmCls} onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}