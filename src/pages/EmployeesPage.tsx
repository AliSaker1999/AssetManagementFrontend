import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import { confirmEmployeeMatches } from '../utils/employeeMatches';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import PageHeader from '../components/ui/PageHeader';
import Select from '../components/ui/Select';
import StatusBadge from '../components/ui/StatusBadge';
import TablePagination from '../components/ui/TablePagination';
import type { Company, Employee, PaginatedResponse } from '../types';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

const emptyForm = { empFullName: '', companyID: 0 };

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function Modal({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-card-lg w-full ${width} border border-pearl-200`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-pearl-200">
          <h3 className="text-[14px] font-semibold text-ink-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-300 hover:text-ink-700 border-none bg-transparent cursor-pointer p-1.5 rounded-md hover:bg-pearl-100 transition-colors"
          >
            <IconClose />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ saving, mode, onCancel }: { saving: boolean; mode: 'add' | 'edit'; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="submit" disabled={saving} className="bg-[#9a7c4b] text-white border-none rounded-md px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70">
        {saving ? 'Saving…' : mode === 'edit' ? 'Update' : 'Create'}
      </button>
      <button type="button" onClick={onCancel} className="bg-white text-[#555] border border-[#ccc] rounded-md px-4 py-2 text-[13px] cursor-pointer hover:bg-surface">
        Cancel
      </button>
    </div>
  );
}

export default function EmployeesPage() {
  const { isAdmin, isAuditor, allowedCompanies } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [allEmployeesCache, setAllEmployeesCache] = useState<Employee[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'add' | 'edit' | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [leaveModalEmp, setLeaveModalEmp] = useState<Employee | null>(null);
  const [leaveDateInput, setLeaveDateInput] = useState('');
  const [leaveSaving, setLeaveSaving] = useState(false);
  const { confirm, dialog } = useConfirm();
  const readOnly = isAuditor();
  const allowedCompanySet = new Set(allowedCompanies);
  const visibleCompanies = isAdmin()
    ? companies
    : companies.filter((c) => allowedCompanySet.has(c.companyID));

  useEffect(() => {
    lookupsApi.getCompanies()
      .then((r) => setCompanies(r.data as Company[]))
      .catch((err) => handleApiError(err, 'Failed to load companies'));
  }, []);

  useEffect(() => {
    setPageNumber(1);
    setAllEmployeesCache(null);
  }, [search, pageSize]);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        if (search.trim() === '') {
          const r = await lookupsApi.getEmployeesPaginated(pageNumber, pageSize);
          const data = r.data as PaginatedResponse<Employee>;
          setEmployees(data.data);
          setTotalPages(data.totalPages);
          setTotalCount(data.totalCount);
          setAllEmployeesCache(null);
          return;
        }

        let allData = allEmployeesCache;
        if (!allData) {
          const r = await lookupsApi.getEmployees();
          allData = r.data;
          setAllEmployeesCache(allData);
        }

        const q = search.toLowerCase();
        const filtered = allData.filter((e) =>
          e.empFullName.toLowerCase().includes(q) ||
          (e.companyName ?? '').toLowerCase().includes(q)
        );
        const newTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const start = (pageNumber - 1) * pageSize;
        setEmployees(filtered.slice(start, start + pageSize));
        setTotalPages(newTotalPages);
        setTotalCount(filtered.length);
      } catch (err) {
        handleApiError(err, 'Failed to load employees');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [pageNumber, pageSize, search, reloadKey]);

  async function reload() {
    setAllEmployeesCache(null);
    setReloadKey((k) => k + 1);
  }

  function startAdd() {
    if (readOnly) return;
    setForm(emptyForm);
    setEditId(null);
    setMode('add');
  }

  function startEdit(emp: Employee) {
    if (readOnly) return;
    setForm({ empFullName: emp.empFullName, companyID: emp.companyID });
    setEditId(emp.empIDUsedBy);
    setMode('edit');
  }

  function cancel() { setMode(null); setEditId(null); }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!form.companyID) { toast.error('Please select a company'); return; }
    setSaving(true);
    try {
      if (mode === 'edit' && editId !== null) {
        await lookupsApi.updateEmployee(editId, form);
        toast.success('Employee updated');
      } else {
        const proceed = await confirmEmployeeMatches(form.companyID, form.empFullName.trim(), confirm);
        if (!proceed) return;
        await lookupsApi.createEmployee(form);
        toast.success('Employee created');
      }
      cancel();
      await reload();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(emp: Employee) {
    if (readOnly) return;
    const ok = await confirm(`Delete "${emp.empFullName}"?`, { title: 'Delete Employee' });
    if (!ok) return;
    try {
      await lookupsApi.deleteEmployee(emp.empIDUsedBy);
      setEmployees((prev) => prev.filter((e) => e.empIDUsedBy !== emp.empIDUsedBy));
      toast.success('Employee deleted');
    } catch (err) { handleApiError(err, 'Delete failed — employee may have assets assigned'); }
  }

  function startLeave(emp: Employee) {
    if (readOnly) return;
    setLeaveDateInput(emp.leaveDate ?? new Date().toISOString().slice(0, 10));
    setLeaveModalEmp(emp);
  }

  function closeLeaveModal() { setLeaveModalEmp(null); }

  async function handleLeaveSubmit(e: FormEvent) {
    e.preventDefault();
    if (!leaveModalEmp) return;
    setLeaveSaving(true);
    try {
      await lookupsApi.setEmployeeLeaveDate(leaveModalEmp.empIDUsedBy, leaveDateInput);
      toast.success('Employee marked as left');
      closeLeaveModal();
      await reload();
    } catch (err) { handleApiError(err, 'Failed to set leave date'); }
    finally { setLeaveSaving(false); }
  }

  async function handleReinstate(emp: Employee) {
    if (readOnly) return;
    const ok = await confirm(`Reinstate "${emp.empFullName}"? This clears their leave date.`, {
      title: 'Reinstate Employee',
      confirmLabel: 'Reinstate',
      danger: false,
    });
    if (!ok) return;
    try {
      await lookupsApi.setEmployeeLeaveDate(emp.empIDUsedBy, null);
      toast.success('Employee reinstated');
      await reload();
    } catch (err) { handleApiError(err, 'Failed to reinstate employee'); }
  }

  return (
    <div>
      {dialog}
      <PageHeader
        title="Employees"
        subtitle={totalCount > 0 ? `${totalCount.toLocaleString()} employees across your organization` : undefined}
        breadcrumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Employees' }]}
        actions={
          !readOnly && (
            <button
              type="button"
              onClick={startAdd}
              className="bg-[#9a7c4b] text-white border-none rounded-lg px-4 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors"
            >
              + Add Employee
            </button>
          )
        }
      />

      <div className="px-4 sm:px-8 pt-3 pb-8">
        {/* Search bar */}
        <div className="bg-white border border-pearl-200 rounded-xl p-4 mb-4 shadow-card">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300 pointer-events-none">
              <IconSearch />
            </span>
            <input
              className="w-full max-w-xl pl-10 pr-4 py-2.5 text-sm bg-pearl-50 border border-pearl-200 rounded-lg
                         text-ink-800 placeholder:text-ink-300
                         focus:outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600/20
                         transition-colors duration-150"
              placeholder="Search by name or company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Add / Edit Modal */}
        {!readOnly && mode !== null && (
          <Modal title={mode === 'edit' ? 'Edit Employee' : 'New Employee'} onClose={cancel}>
            <form onSubmit={handleSave}>
              <FormRow label="Full Name *">
                <input
                  className="input-base"
                  value={form.empFullName}
                  onChange={(e) => setForm((f) => ({ ...f, empFullName: e.target.value }))}
                  required
                  maxLength={100}
                  autoFocus
                />
              </FormRow>
              <FormRow label="Company *">
                <Select
                  value={form.companyID || ''}
                  onChange={(e) => setForm((f) => ({ ...f, companyID: Number(e.target.value) }))}
                  required
                >
                  <option value="">Select company…</option>
                  {visibleCompanies.map((c) => (
                    <option key={c.companyID} value={c.companyID}>{c.companyName}</option>
                  ))}
                </Select>
              </FormRow>
              <ModalActions saving={saving} mode={mode} onCancel={cancel} />
            </form>
          </Modal>
        )}

        {/* Leave Employee Modal */}
        {!readOnly && leaveModalEmp && (
          <Modal title="Leave Employee" onClose={closeLeaveModal} width="max-w-md">
            <form onSubmit={handleLeaveSubmit}>
              <p className="text-[13px] text-ink-600 mb-4">
                Mark <span className="font-semibold text-ink-800">{leaveModalEmp.empFullName}</span> as having left the company.
              </p>
              <FormRow label="Leave Date *">
                <input
                  type="date"
                  className="input-base"
                  value={leaveDateInput}
                  onChange={(e) => setLeaveDateInput(e.target.value)}
                  required
                  autoFocus
                />
              </FormRow>
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={leaveSaving} className="bg-[#9a7c4b] text-white border-none rounded-md px-5 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70">
                  {leaveSaving ? 'Saving…' : 'Mark as Left'}
                </button>
                <button type="button" onClick={closeLeaveModal} className="bg-white text-[#555] border border-[#ccc] rounded-md px-4 py-2 text-[13px] cursor-pointer hover:bg-surface">
                  Cancel
                </button>
              </div>
            </form>
          </Modal>
        )}

        {loading ? (
          <p className="text-ink-300 text-sm">Loading…</p>
        ) : (
          <>
            <TablePagination
              summary={totalCount > 0
                ? `Showing ${((pageNumber - 1) * pageSize) + 1}-${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} employees`
                : 'No employees'}
              pageNumber={pageNumber}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
              onFirst={() => setPageNumber(1)}
              onPrevious={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              onLast={() => setPageNumber(totalPages)}
              onGoToPage={(page) => setPageNumber(page)}
            />

            <div className="overflow-x-auto rounded-xl border border-pearl-200 shadow-card bg-white mt-3">
              <table className="w-full border-collapse min-w-[560px]">
                <thead>
                  <tr>
                    {['Full Name', 'Company', 'Status', ...(readOnly ? [] : [''])].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left text-xs font-bold text-ink-400 bg-pearl-100 border-b border-pearl-200">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={readOnly ? 3 : 4} className="p-5 text-center text-ink-300 text-sm">No employees found.</td></tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.empIDUsedBy} className="border-b border-pearl-100 hover:bg-pearl-50 transition-colors">
                        <td className="px-3.5 py-2.5 text-[13px] font-semibold text-ink-800">{emp.empFullName}</td>
                        <td className="px-3.5 py-2.5 text-[13px] text-ink-600">{emp.companyName ?? '—'}</td>
                        <td className="px-3.5 py-2.5 text-[13px]">
                          <StatusBadge status={emp.leaveDate ? 'inactive' : 'active'} />
                          {emp.leaveDate && (
                            <div className="text-[11px] text-ink-300 mt-0.5">Left {emp.leaveDate}</div>
                          )}
                        </td>
                        {!readOnly && (
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex gap-1.5">
                              <button onClick={() => startEdit(emp)} className="bg-[#e8f0fe] text-accent border border-[#c5d8fb] rounded-md px-2.5 py-1 text-xs cursor-pointer hover:bg-[#d2e3fc]">Edit</button>
                              {emp.leaveDate ? (
                                <button onClick={() => handleReinstate(emp)} className="px-2.5 py-1 bg-green-50 text-green-700 border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-green-100 transition-colors">
                                  Reinstate
                                </button>
                              ) : (
                                <button onClick={() => startLeave(emp)} className="px-2.5 py-1 bg-amber-50 text-amber-700 border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-amber-100 transition-colors inline-flex items-center gap-1">
                                  <IconLogout /> Leave
                                </button>
                              )}
                              <button onClick={() => handleDelete(emp)} className="px-2.5 py-1 bg-[#c0392b] text-white border-none rounded-md text-xs font-semibold cursor-pointer hover:bg-[#a93226] transition-colors">Delete</button>
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
    </div>
  );
}
