import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import Select from '../components/ui/Select';
import { assetsApi } from '../api/assets';
import { maintenancesApi } from '../api/maintenances';
import { warrantiesApi } from '../api/warranties';
import { attachmentsApi } from '../api/attachments';
import { contactsApi } from '../api/contacts';
import { lookupsApi } from '../api/lookups';
import { useConfirm } from '../hooks/useConfirm';
import StatusBadge from '../components/ui/StatusBadge';
import BarcodePrintModal from '../components/BarcodePrintModal';
import type {
  Asset, DepreciationHistoryItem, InventoryHistoryItem, StatusHistoryItem,
  Maintenance, Warranty, Attachment, Contact, Currency,
} from '../types';

type Tab = 'info' | 'depreciation' | 'inventory' | 'status' | 'maintenance' | 'warranty' | 'attachments' | 'remark';

// Shared input style
const inp = 'input-base';

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function IconBack() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconPaperclip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}
function IconBarcode() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5v14M7 5v14M13 5v14M17 5v14M21 5v14"/>
      <rect x="1" y="3" width="22" height="18" rx="2"/>
    </svg>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [tab, setTab] = useState<Tab>('info');
  const [loading, setLoading] = useState(true);

  const [depHistory, setDepHistory] = useState<DepreciationHistoryItem[]>([]);
  const [invHistory, setInvHistory] = useState<InventoryHistoryItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const lookupsLoadedRef = useRef(false);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    assetsApi.get(assetId)
      .then((r) => setAsset(r.data as Asset))
      .catch((err) => handleApiError(err, 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => {
    if (tab === 'depreciation' && depHistory.length === 0)
      assetsApi.getDepreciationHistory(assetId).then((r) => setDepHistory(r.data as DepreciationHistoryItem[]));
    if (tab === 'inventory' && invHistory.length === 0)
      assetsApi.getInventoryHistory(assetId).then((r) => setInvHistory(r.data as InventoryHistoryItem[]));
    if (tab === 'status' && statusHistory.length === 0)
      assetsApi.getStatusHistory(assetId)
        .then((r) => setStatusHistory(r.data as StatusHistoryItem[]))
        .catch((err) => handleApiError(err, 'Failed to load status history'));
    if (tab === 'maintenance') {
      if (maintenances.length === 0)
        maintenancesApi.getByAsset(assetId).then((r) => setMaintenances(r.data as Maintenance[]));
      if (!lookupsLoadedRef.current) {
        lookupsLoadedRef.current = true;
        Promise.all([contactsApi.getLookup(), lookupsApi.getCurrencies()])
          .then(([c, cur]) => {
            setContacts(c.data as Contact[]);
            setCurrencies(cur.data as Currency[]);
          });
      }
    }
    if (tab === 'warranty' && warranties.length === 0)
      warrantiesApi.getByAsset(assetId).then((r) => setWarranties(r.data as Warranty[]));
    if (tab === 'attachments' && attachments.length === 0)
      attachmentsApi.getByAsset(assetId).then((r) => setAttachments(r.data as Attachment[]));
  }, [tab, assetId]);

  useEffect(() => {
    if (asset && searchParams.get('print') === '1' && asset.barcodeNumber) {
      setShowBarcodeModal(true);
    }
  }, [asset, searchParams]);

  async function handleDelete() {
    const ok = await confirm('This asset will be permanently removed.', { title: 'Delete Asset?' });
    if (!ok) return;
    try {
      await assetsApi.delete(assetId);
      toast.success('Asset deleted');
      navigate('/assets');
    } catch (err) {
      handleApiError(err, 'Delete failed');
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-ink-300 text-sm animate-pulse">Loading asset…</div>
    </div>
  );
  if (!asset) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-danger text-sm">Asset not found.</div>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: 'info', label: 'Info' },
    { key: 'depreciation', label: 'Depreciation' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'status', label: 'Status History' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'warranty', label: 'Warranty' },
    { key: 'attachments', label: 'Attachments' },
    { key: 'remark', label: 'Remark' },
  ];

  return (
    <div>
      {confirmDialog}

      {showBarcodeModal && asset?.barcodeNumber && (
        <BarcodePrintModal
          barcodeNumber={asset.barcodeNumber}
          assetCode={asset.assetCode}
          assetDesc={asset.assetDesc}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-pearl-200 px-8 py-5">
        <Link
          to="/assets"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-300 hover:text-ink-600 no-underline transition-colors mb-3"
        >
          <IconBack />
          Back to Assets
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Asset icon */}
            <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div>
              <div className="font-code text-[12px] text-navy-500 font-medium mb-0.5">{asset.assetCode}</div>
              <h1 className="text-[20px] font-extrabold text-ink-800 leading-tight">{asset.assetDesc}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <StatusBadge status="Active" />
                {asset.inServiceDate && (
                  <span className="text-[11px] text-ink-300">
                    In service: {new Date(asset.inServiceDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowBarcodeModal(true)}
              disabled={!asset.barcodeNumber}
              title={asset.barcodeNumber ? 'Print barcode label' : 'No barcode number assigned'}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconBarcode />
              Print Barcode
            </button>
            <Link
              to={`/assets/${assetId}/edit`}
              className="btn-secondary no-underline"
            >
              <IconEdit />
              Edit
            </Link>
            <button onClick={handleDelete} className="btn-danger">
              <IconTrash />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-pearl-200 px-8">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-3 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors cursor-pointer border-none bg-transparent',
                tab === t.key
                  ? 'border-b-2 border-navy-600 text-navy-600 font-semibold'
                  : 'border-b-2 border-transparent text-ink-400 hover:text-ink-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-8 py-6">
        {tab === 'info' && <AssetInfo asset={asset} />}
        {tab === 'depreciation' && <DepreciationTab data={depHistory} />}
        {tab === 'inventory' && <SimpleTable data={invHistory} columns={['inventoryID', 'isAvailable', 'location', 'relocated', 'createdDate']} />}
        {tab === 'status' && <SimpleTable data={statusHistory} columns={['statusDate', 'statusName', 'statusDesc', 'statusSalePrice', 'createdByFullName']} />}
        {tab === 'maintenance' && (
          <MaintenanceTab
            assetId={assetId}
            assetStatusID={asset?.statusID ?? null}
            onAssetStatusChange={(sid) => setAsset(a => a ? { ...a, statusID: sid } : a)}
            items={maintenances}
            contacts={contacts}
            currencies={currencies}
            onChange={setMaintenances}
          />
        )}
        {tab === 'warranty' && (
          <WarrantyTab assetId={assetId} items={warranties} onChange={setWarranties} />
        )}
        {tab === 'attachments' && (
          <AttachmentsTab assetId={assetId} items={attachments} onChange={setAttachments} />
        )}
        {tab === 'remark' && (
          <RemarkTab asset={asset} onSaved={(updated) => setAsset(updated)} />
        )}
      </div>
    </div>
  );
}

// ─── Info Tab ───────────────────────────────────────────────────────────────

function InfoField({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="py-3 border-b border-pearl-200 last:border-0">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300 mb-0.5">{label}</div>
      <div className={clsx('text-[13px] text-ink-800', mono && 'font-code text-navy-600')}>
        {String(value ?? '—')}
      </div>
    </div>
  );
}

function AssetInfo({ asset }: { asset: Asset }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Identification card */}
      <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300 mb-3">Identification</div>
        <InfoField label="Asset Code" value={asset.assetCode} mono />
        <InfoField label="Description" value={asset.assetDesc} />
        <InfoField label="Barcode" value={asset.barcodeNumber} mono />
        <InfoField label="Serial Number" value={asset.serialNumber} mono />
        <InfoField label="In Service Date" value={asset.inServiceDate} />
        <InfoField label="Donation" value={asset.donation ? 'Yes' : 'No'} />
        <InfoField label="Installed At" value={asset.installedAt} />
      </div>

      {/* Financial card */}
      <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-300 mb-3">Financial</div>
        <InfoField label="Purchase Price" value={`${asset.purchaseCurCode ?? ''} ${asset.purchasePrice ?? '—'}`} />
        <InfoField label="Purchase Date" value={asset.purchaseDate} />
        <InfoField label="Purchase Order No" value={asset.purchaseOrderNo} mono />
        <InfoField label="Invoice No" value={asset.invoiceNo} mono />
        <InfoField label="Invoice Date" value={asset.invoiceDate} />
        <InfoField label="Accounting Entry Date" value={asset.accountingEntryDate} />
        <InfoField label="Accounting JV No" value={asset.accountingEntryJVNo} mono />
      </div>

      {/* Remark */}
      {asset.remark && (
        <div className="bg-navy-50 border border-navy-100 rounded-xl p-5 lg:col-span-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-navy-400 mb-1.5">Remark</div>
          <div className="text-[13px] text-ink-700">{asset.remark}</div>
        </div>
      )}
    </div>
  );
}

// ─── Depreciation Tab (showstopper) ─────────────────────────────────────────

function DepreciationTab({ data }: { data: DepreciationHistoryItem[] }) {
  if (data.length === 0) return <EmptyState message="No depreciation records yet." />;

  return (
    <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
      <div className="bg-pearl-100 border-b border-pearl-200 px-5 py-2.5 grid grid-cols-5 gap-4">
        {['Date', 'Rate %', 'Depreciation', 'Net Book Value', 'Recorded By'].map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
        ))}
      </div>
      {data.map((row, i) => (
        <div
          key={i}
          className={clsx(
            'grid grid-cols-5 gap-4 px-5 py-3.5 items-center',
            'hover:bg-pearl-50 transition-colors duration-100',
            i < data.length - 1 && 'border-b border-pearl-200'
          )}
        >
          <div className="text-[12px] text-ink-600">{row.depreciationDate}</div>
          <div className="num text-[12px] text-ink-600">{row.depreciationRate}%</div>
          {/* Gold = cost/loss */}
          <div className="num-cost text-[13px] font-semibold">
            {row.depreciationValue != null ? `(${Number(row.depreciationValue).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : '—'}
          </div>
          {/* Navy = value */}
          <div className="num-value text-[13px] font-semibold">
            {row.netBookValue != null ? Number(row.netBookValue).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          </div>
          <div className="text-[12px] text-ink-400 truncate">{row.createdByFullName ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Generic read-only table ─────────────────────────────────────────────────

function SimpleTable({ data, columns }: { data: object[]; columns: string[] }) {
  if (data.length === 0) return <EmptyState message="No records found." />;

  const headers = columns.map((c) =>
    c.replace(/([A-Z])/g, ' $1').trim()
  );

  return (
    <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
      <div className={`grid gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200`}
        style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {headers.map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
        ))}
      </div>
      {data.map((row, i) => {
        const r = row as Record<string, unknown>;
        return (
          <div
            key={i}
            className={clsx(
              'grid gap-4 px-5 py-3.5 items-center hover:bg-pearl-50 transition-colors duration-100',
              i < data.length - 1 && 'border-b border-pearl-200'
            )}
            style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
          >
            {columns.map((c) => (
              <div key={c} className="text-[12px] text-ink-700 truncate">{String(r[c] ?? '—')}</div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-pearl-100 flex items-center justify-center mb-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9a9585" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <p className="text-[13px] text-ink-400">{message}</p>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, width = 'max-w-lg' }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
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

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</label>
      {children}
    </div>
  );
}

function ActionBtn({ onClick, danger, disabled, children }: { onClick: () => void; danger?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'text-[11px] font-semibold px-2.5 py-1 rounded transition-colors border',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        danger
          ? 'bg-danger-bg text-danger border-danger-light hover:bg-danger-light'
          : 'bg-navy-50 text-navy-600 border-navy-100 hover:bg-navy-100'
      )}
    >
      {children}
    </button>
  );
}

function ModalActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary">
        Cancel
      </button>
    </div>
  );
}

// ─── Maintenance Tab ─────────────────────────────────────────────────────────

type MaintForm = Omit<Maintenance, 'maintID' | 'assetID'>;

function MaintenanceTab({
  assetId, assetStatusID, onAssetStatusChange, items, contacts, currencies, onChange,
}: {
  assetId: number;
  assetStatusID: number | null;
  onAssetStatusChange: (sid: number) => void;
  items: Maintenance[];
  contacts: Contact[];
  currencies: Currency[];
  onChange: (v: Maintenance[]) => void;
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [form, setForm] = useState<MaintForm>({ fromDate: '', toDate: '', supplierContactID: 0, cost: 0, curCode: 'USD', remark: '' });
  const [saving, setSaving] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);

  async function handleReturn(m: Maintenance) {
    const ok = await confirm(`Mark asset as returned from maintenance?`, { title: 'Return From Maintenance' });
    if (!ok) return;
    setReturning(m.maintID);
    try {
      await maintenancesApi.returnFromMaintenance(m.maintID);
      onAssetStatusChange(9);
      toast.success('Asset marked as returned from maintenance');
    } catch (err) { handleApiError(err, 'Failed to update status'); }
    finally { setReturning(null); }
  }

  function openAdd() {
    setForm({ fromDate: '', toDate: '', supplierContactID: contacts[0]?.contactID ?? 0, cost: 0, curCode: currencies[0]?.curCode ?? 'USD', remark: '' });
    setModal('add');
  }
  function openEdit(item: Maintenance) {
    setEditing(item);
    setForm({ fromDate: item.fromDate, toDate: item.toDate, supplierContactID: item.supplierContactID, cost: item.cost, curCode: item.curCode, remark: item.remark ?? '' });
    setModal('edit');
  }
  function close() { setModal(null); setEditing(null); }
  function setF<K extends keyof MaintForm>(k: K, v: MaintForm[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        const r = await maintenancesApi.create({ assetID: assetId, ...form });
        onChange([...items, r.data as Maintenance]);
        toast.success('Maintenance added');
      } else if (editing) {
        const r = await maintenancesApi.update(editing.maintID, {
          assetID: assetId, maintID: editing.maintID, ...form,
          original_MaintID: editing.maintID, original_AssetID: editing.assetID,
          original_FromDate: editing.fromDate, original_ToDate: editing.toDate,
          original_SupplierContactID: editing.supplierContactID, original_Cost: editing.cost,
          original_CurCode: editing.curCode, isNull_Remark: editing.remark == null ? 1 : 0,
          original_Remark: editing.remark ?? null,
        });
        onChange(items.map((i) => i.maintID === editing.maintID ? r.data as Maintenance : i));
        toast.success('Maintenance updated');
      }
      close();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Maintenance) {
    const ok = await confirm('This maintenance record will be permanently removed.', { title: 'Delete Maintenance?' });
    if (!ok) return;
    try {
      await maintenancesApi.delete(item.maintID, {
        assetID: item.assetID, fromDate: item.fromDate, toDate: item.toDate,
        supplierContactID: item.supplierContactID, cost: item.cost,
        curCode: item.curCode, remark: item.remark ?? null,
      });
      onChange(items.filter((i) => i.maintID !== item.maintID));
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  const contactName = (id: number) => contacts.find((c) => c.contactID === id)?.contactName ?? String(id);

  return (
    <>
      {confirmDialog}
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="btn-primary">
          <IconPlus /> Add Maintenance
        </button>
      </div>

      {items.length === 0 ? <EmptyState message="No maintenance records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_2fr_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200">
            {['From', 'To', 'Supplier', 'Cost', 'Currency', 'Remark', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((m, i) => (
            <div key={m.maintID} className={clsx(
              'grid grid-cols-[1fr_1fr_2fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-700">{m.fromDate}</div>
              <div className="text-[12px] text-ink-700">{m.toDate}</div>
              <div className="text-[12px] text-ink-700 truncate">{contactName(m.supplierContactID)}</div>
              <div className="num-cost text-[12px] font-medium">{m.cost}</div>
              <div className="text-[12px] font-code text-ink-600">{m.curCode}</div>
              <div className="text-[12px] text-ink-400 truncate">{m.remark ?? '—'}</div>
              <div className="flex gap-1.5">
                <ActionBtn onClick={() => openEdit(m)}>Edit</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(m)}>Delete</ActionBtn>
                {assetStatusID === 8 && (
                  <ActionBtn onClick={() => handleReturn(m)} disabled={returning === m.maintID}>
                    {returning === m.maintID ? '…' : 'Mark Returned'}
                  </ActionBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Maintenance' : 'Edit Maintenance'} onClose={close}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="From Date *">
                <input className={inp} type="date" value={form.fromDate} onChange={(e) => setF('fromDate', e.target.value)} required />
              </FormRow>
              <FormRow label="To Date *">
                <input className={inp} type="date" value={form.toDate} onChange={(e) => setF('toDate', e.target.value)} required />
              </FormRow>
            </div>
            <FormRow label="Supplier *">
              <Select value={form.supplierContactID} onChange={(e) => setF('supplierContactID', Number(e.target.value))} required>
                <option value="">Select…</option>
                {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
              </Select>
            </FormRow>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="Cost">
                <input className={inp} type="number" step="0.01" value={form.cost} onChange={(e) => setF('cost', Number(e.target.value))} />
              </FormRow>
              <FormRow label="Currency *">
                <Select value={form.curCode} onChange={(e) => setF('curCode', e.target.value)} required>
                  {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode}</option>)}
                </Select>
              </FormRow>
            </div>
            <FormRow label="Remark">
              <input className={inp} value={form.remark ?? ''} onChange={(e) => setF('remark', e.target.value)} maxLength={100} />
            </FormRow>
            <ModalActions saving={saving} onCancel={close} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Warranty Tab ─────────────────────────────────────────────────────────────

type WarrForm = Omit<Warranty, 'warntID' | 'assetID'>;

function WarrantyTab({ assetId, items, onChange }: { assetId: number; items: Warranty[]; onChange: (v: Warranty[]) => void }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Warranty | null>(null);
  const [form, setForm] = useState<WarrForm>({ warrantyDesc: '', fromDate: '', toDate: '', remark: '' });
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm({ warrantyDesc: '', fromDate: '', toDate: '', remark: '' }); setModal('add'); }
  function openEdit(item: Warranty) {
    setEditing(item);
    setForm({ warrantyDesc: item.warrantyDesc, fromDate: item.fromDate, toDate: item.toDate, remark: item.remark ?? '' });
    setModal('edit');
  }
  function close() { setModal(null); setEditing(null); }
  function setF<K extends keyof WarrForm>(k: K, v: WarrForm[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'add') {
        const r = await warrantiesApi.create({ assetID: assetId, ...form });
        onChange([...items, r.data as Warranty]);
        toast.success('Warranty added');
      } else if (editing) {
        const r = await warrantiesApi.update(editing.warntID, {
          assetID: assetId, warntID: editing.warntID, ...form,
          original_WarntID: editing.warntID, original_AssetID: editing.assetID,
          original_WarrantyDesc: editing.warrantyDesc, original_FromDate: editing.fromDate,
          original_ToDate: editing.toDate, isNull_Remark: editing.remark == null ? 1 : 0,
          original_Remark: editing.remark ?? null,
        });
        onChange(items.map((i) => i.warntID === editing.warntID ? r.data as Warranty : i));
        toast.success('Warranty updated');
      }
      close();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Warranty) {
    const ok = await confirm('This warranty record will be permanently removed.', { title: 'Delete Warranty?' });
    if (!ok) return;
    try {
      await warrantiesApi.delete(item.warntID, {
        assetID: item.assetID, warrantyDesc: item.warrantyDesc,
        fromDate: item.fromDate, toDate: item.toDate, remark: item.remark ?? null,
      });
      onChange(items.filter((i) => i.warntID !== item.warntID));
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  return (
    <>
      {confirmDialog}
      <div className="flex justify-end mb-4">
        <button onClick={openAdd} className="btn-primary"><IconPlus /> Add Warranty</button>
      </div>

      {items.length === 0 ? <EmptyState message="No warranty records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200">
            {['Description', 'From Date', 'To Date', 'Remark', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((w, i) => (
            <div key={w.warntID} className={clsx(
              'grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-800 font-medium truncate">{w.warrantyDesc}</div>
              <div className="text-[12px] text-ink-600">{w.fromDate}</div>
              <div className="text-[12px] text-ink-600">{w.toDate}</div>
              <div className="text-[12px] text-ink-400 truncate">{w.remark ?? '—'}</div>
              <div className="flex gap-1.5">
                <ActionBtn onClick={() => openEdit(w)}>Edit</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(w)}>Delete</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Warranty' : 'Edit Warranty'} onClose={close}>
          <form onSubmit={handleSubmit}>
            <FormRow label="Description *">
              <input className={inp} value={form.warrantyDesc} onChange={(e) => setF('warrantyDesc', e.target.value)} required maxLength={50} />
            </FormRow>
            <div className="grid grid-cols-2 gap-4">
              <FormRow label="From Date *">
                <input className={inp} type="date" value={form.fromDate} onChange={(e) => setF('fromDate', e.target.value)} required />
              </FormRow>
              <FormRow label="To Date *">
                <input className={inp} type="date" value={form.toDate} onChange={(e) => setF('toDate', e.target.value)} required />
              </FormRow>
            </div>
            <FormRow label="Remark">
              <input className={inp} value={form.remark ?? ''} onChange={(e) => setF('remark', e.target.value)} maxLength={100} />
            </FormRow>
            <ModalActions saving={saving} onCancel={close} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Attachment helpers ────────────────────────────────────────────────────────

function getMimeTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return map[(ext ?? '').trim().toLowerCase().replace(/^\./, '')] ?? 'application/octet-stream';
}

async function downloadAttachment(item: Attachment) {
  try {
    const res = await attachmentsApi.download(item.attID);
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = item.attFileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) { handleApiError(err, 'Download failed'); }
}

// ─── Attachments Tab ──────────────────────────────────────────────────────────

function AttachmentsTab({ assetId, items, onChange }: { assetId: number; items: Attachment[]; onChange: (v: Attachment[]) => void }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [attDesc, setAttDesc] = useState('');
  const [remark, setRemark] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewItem, setPreviewItem] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  function close() { setShowModal(false); setAttDesc(''); setRemark(''); setFile(null); }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewItem(null);
    setPreviewUrl(null);
  }

  async function handlePreview(item: Attachment) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewLoading(true);
    try {
      const mime = getMimeTypeFromExt(item.attFileExt);
      const res = await attachmentsApi.view(item.attID);
      const url = URL.createObjectURL(new Blob([res.data], { type: mime }));
      setPreviewItem(item);
      setPreviewUrl(url);
    } catch (err) { handleApiError(err, 'Preview failed'); }
    finally { setPreviewLoading(false); }
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    setSaving(true);
    try {
      const base64 = await toBase64(file);
      const ext = file.name.split('.').pop() ?? '';
      const r = await attachmentsApi.create({ assetID: assetId, attDesc, attFileName: file.name, attFileExt: ext, remark: remark || null, fileBase64: base64 });
      onChange([...items, r.data as Attachment]);
      toast.success('Attachment uploaded');
      close();
    } catch (err) { handleApiError(err, 'Upload failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Attachment) {
    const ok = await confirm(`"${item.attDesc}" will be permanently removed.`, { title: 'Delete Attachment?' });
    if (!ok) return;
    try {
      await attachmentsApi.delete({ attID: item.attID, assetID: item.assetID, attDesc: item.attDesc, attFileName: item.attFileName, attFileExt: item.attFileExt, remark: item.remark ?? null });
      onChange(items.filter((i) => i.attID !== item.attID));
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  return (
    <>
      {confirmDialog}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowModal(true)} className="btn-primary"><IconPaperclip /> Upload Attachment</button>
      </div>

      {items.length === 0 ? <EmptyState message="No attachments yet." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200">
            {['Description', 'File Name', 'Ext', 'Remark', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((a, i) => (
            <div key={a.attID} className={clsx(
              'grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-800 font-medium truncate">{a.attDesc}</div>
              <div className="text-[12px] text-ink-600 truncate font-code">{a.attFileName}</div>
              <div className="text-[11px] text-ink-400 uppercase font-code">{a.attFileExt}</div>
              <div className="text-[12px] text-ink-400 truncate">{a.remark ?? '—'}</div>
              <div className="flex items-center gap-2">
                <ActionBtn onClick={() => downloadAttachment(a)}>Download</ActionBtn>
                <ActionBtn onClick={() => handlePreview(a)} disabled={previewLoading}>{previewLoading ? 'Loading…' : 'Preview'}</ActionBtn>
                <ActionBtn danger onClick={() => handleDelete(a)}>Delete</ActionBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Upload Attachment" onClose={close}>
          <form onSubmit={handleUpload}>
            <FormRow label="Description *">
              <input className={inp} value={attDesc} onChange={(e) => setAttDesc(e.target.value)} required maxLength={50} />
            </FormRow>
            <FormRow label="File *">
              <input
                type="file"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] ?? null)}
                required
                className="text-sm text-ink-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-navy-100 file:text-xs file:font-semibold file:bg-navy-50 file:text-navy-600 hover:file:bg-navy-100 cursor-pointer transition-colors"
              />
            </FormRow>
            <FormRow label="Remark">
              <input className={inp} value={remark} onChange={(e) => setRemark(e.target.value)} maxLength={100} />
            </FormRow>
            <ModalActions saving={saving} onCancel={close} />
          </form>
        </Modal>
      )}

      {previewItem && previewUrl && (
        <AttachmentPreviewModal item={previewItem} url={previewUrl} onClose={closePreview} />
      )}
    </>
  );
}

// ─── Attachment Preview Modal ─────────────────────────────────────────────────

function AttachmentPreviewModal({ item, url, onClose }: { item: Attachment; url: string; onClose: () => void }) {
  const ext = (item.attFileExt ?? '').trim().toLowerCase().replace(/^\./, '');
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext);
  const isPdf   = ext === 'pdf';
  const isText  = ['txt', 'csv'].includes(ext);

  return (
    <Modal title={item.attFileName} onClose={onClose} width="max-w-4xl">
      {isImage && (
        <img src={url} alt={item.attFileName} className="max-w-full max-h-[70vh] mx-auto rounded object-contain block" />
      )}
      {isPdf && (
        <iframe src={url} title={item.attFileName} className="w-full rounded border border-pearl-200" style={{ height: '70vh' }} />
      )}
      {isText && <TextPreview url={url} />}
      {!isImage && !isPdf && !isText && (
        <div className="py-10 text-center text-ink-400 text-sm">
          <p className="mb-2">Preview is not available for <span className="font-semibold uppercase">.{ext}</span> files.</p>
          <p>Use the <span className="font-semibold">Download</span> button to open this file.</p>
        </div>
      )}
    </Modal>
  );
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState('');
  useEffect(() => { fetch(url).then((r) => r.text()).then(setText); }, [url]);
  return <pre className="text-xs text-ink-700 overflow-auto max-h-[60vh] bg-pearl-50 rounded p-4 whitespace-pre-wrap">{text}</pre>;
}

// ─── Remark Tab ───────────────────────────────────────────────────────────────

function RemarkTab({ asset, onSaved }: { asset: Asset; onSaved: (updated: Asset) => void }) {
  const [remark, setRemark] = useState(asset.remark ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await assetsApi.update(asset.assetID, { ...asset, remark } as Asset);
      onSaved({ ...asset, remark });
      toast.success('Remark saved');
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-6 max-w-xl">
      <form onSubmit={handleSave}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-300 mb-2">Remark</div>
        <textarea
          className="input-base resize-none h-28"
          maxLength={100}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
        <div className="text-right text-[11px] text-ink-300 mb-4">{remark.length}/100</div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Remark'}
        </button>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
