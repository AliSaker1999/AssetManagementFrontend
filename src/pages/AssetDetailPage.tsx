import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import clsx from 'clsx';
import Select from '../components/ui/Select';
import { assetsApi } from '../api/assets';
import { maintenancesApi } from '../api/maintenances';
import { warrantiesApi } from '../api/warranties';
import { damagesApi } from '../api/damages';
import { attachmentsApi } from '../api/attachments';
import { contactsApi } from '../api/contacts';
import { lookupsApi } from '../api/lookups';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import StatusBadge from '../components/ui/StatusBadge';
import BarcodePrintModal from '../components/BarcodePrintModal';
import TransferAssetModal from '../components/TransferAssetModal';
import type {
  Asset, DepreciationHistoryItem, InventoryHistoryItem, StatusHistoryItem,
  Maintenance, Warranty, Damage, Attachment, Contact, Currency, StatusType,
} from '../types';

type Tab = 'info' | 'depreciation' | 'inventory' | 'status' | 'maintenance' | 'warranty' | 'damage' | 'attachments' | 'remark';

const TAB_KEYS: Tab[] = ['info', 'depreciation', 'inventory', 'status', 'maintenance', 'warranty', 'damage', 'attachments', 'remark'];
type MaintForm = Omit<Maintenance, 'maintID' | 'assetID'>;
type StatusChangeForm = {
  statusDate: string;
  statusDesc: string;
  statusContactID: number | '';
  statusSalePrice: number | '';
  statusSaleCurCode: string;
};

const STATUSES_WITH_MODAL = new Set([1, 3, 4, 7]); // 2 is now handled by TransferAssetModal
const BLOCKED_ATTACHMENT_EXTENSIONS = new Set(['csv', 'txt', 'gif', 'webp']);
const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.bmp,.svg';

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
function IconChevronDown() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

function StatusIcon({ statusId }: { statusId?: number }) {
  if (statusId === 0) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    );
  }
  if (statusId === 1) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    );
  }
  if (statusId === 2) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 7h10"/>
        <path d="M13 3l4 4-4 4"/>
        <path d="M17 17H7"/>
        <path d="M11 21l-4-4 4-4"/>
      </svg>
    );
  }
  if (statusId === 3) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18"/>
        <path d="m6 6 12 12"/>
      </svg>
    );
  }
  if (statusId === 4) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8"/>
        <path d="M10 9h3a2 2 0 1 1 0 4h-2a2 2 0 1 0 0 4h3"/>
      </svg>
    );
  }
  if (statusId === 6) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7"/>
        <path d="m21 21-4.35-4.35"/>
        <path d="M7 7l8 8"/>
      </svg>
    );
  }
  if (statusId === 7) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 4 4 10l6 6"/>
        <path d="M20 20V8a4 4 0 0 0-4-4H4"/>
      </svg>
    );
  }
  if (statusId === 8) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h16"/>
        <path d="M12 4v16"/>
      </svg>
    );
  }
  if (statusId === 11) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8a2 2 0 0 1-2 2H5a2 2 0 0 1 0-4h14a2 2 0 0 1 2 2Z"/>
        <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z"/>
      </svg>
    );
  }
    if (statusId === 12) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/>
      <polyline points="3.3 7 12 12 20.7 7"/>
      <line x1="12" y1="22" x2="12" y2="12"/>
    </svg>
  );
}

if (statusId === 14) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16v10H4z" />
      <path d="M12 7v10" />
      <path d="M4 12h16" />
    </svg>
  );
}

if (statusId === 13) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5L12 3l9 7.5"/>
      <path d="M5 9v11h14V9"/>
      <path d="M9 20v-6h6v6"/>
    </svg>
  );
}

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="4"/>
    </svg>
  );
}

function statusTone(statusId?: number) {
  if (statusId === 0 || statusId === 13) 
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (statusId === 3 || statusId === 11) 
    return 'bg-rose-50 text-rose-700 border-rose-200';

  if (statusId === 4 || statusId === 1 || statusId === 7) 
    return 'bg-amber-50 text-amber-700 border-amber-200';

  if (statusId === 2) 
    return 'bg-sky-50 text-sky-700 border-sky-200';

  if (statusId === 6) 
    return 'bg-violet-50 text-violet-700 border-violet-200';

  if (statusId === 12 || statusId === 14) 
    return 'bg-blue-50 text-blue-700 border-blue-200';

  return 'bg-pearl-50 text-ink-700 border-pearl-200';
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const location = useLocation();
  const { isAuditor } = useAuth();
  const readOnly = isAuditor();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assetId = Number(id);

  const [searchParams, setSearchParams] = useSearchParams();
  // The Assets view we came from, so going back keeps its filters and page.
  const backToListUrl = (location.state as { from?: string } | null)?.from ?? '/assets';

  const [asset, setAsset] = useState<Asset | null>(null);
  // Supports deep links such as /assets/12?tab=damage
  const [tab, setTab] = useState<Tab>(() => {
    const requested = searchParams.get('tab') as Tab | null;
    return requested && TAB_KEYS.includes(requested) ? requested : 'info';
  });
  const [loading, setLoading] = useState(true);

  const [depHistory, setDepHistory] = useState<DepreciationHistoryItem[]>([]);
  const [invHistory, setInvHistory] = useState<InventoryHistoryItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [changingStatus, setChangingStatus] = useState(false);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [statusMaintenanceModalOpen, setStatusMaintenanceModalOpen] = useState(false);
  const [statusMaintForm, setStatusMaintForm] = useState<MaintForm>({ attID: null, fromDate: '', toDate: '', supplierContactID: 0, cost: 0, curCode: 'USD', remark: '' });
  const [statusMaintAttachmentFile, setStatusMaintAttachmentFile] = useState<File | null>(null);
  const [savingStatusMaintenance, setSavingStatusMaintenance] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalStatusId, setStatusModalStatusId] = useState<number | null>(null);
  const [statusChangeForm, setStatusChangeForm] = useState<StatusChangeForm>({
    statusDate: new Date().toISOString().slice(0, 10),
    statusDesc: '',
    statusContactID: '',
    statusSalePrice: '',
    statusSaleCurCode: 'USD',
  });

  // Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const lookupsLoadedRef = useRef(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  useEffect(() => {
    Promise.all([
      assetsApi.get(assetId),
      lookupsApi.getStatuses(),
    ])
      .then(([assetRes, statusRes]) => {
        setAsset(assetRes.data as Asset);
        setStatuses(statusRes.data as StatusType[]);
      })
      .catch((err) => handleApiError(err, 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-status-menu-root="true"]')) return;
      setOpenStatusMenu(false);
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, []);
 



  function makeDefaultMaintenanceForm(cs: Contact[] = contacts, ccy: Currency[] = currencies): MaintForm {
    return {
      attID: null,
      fromDate: '',
      toDate: '',
      supplierContactID: cs[0]?.contactID ?? 0,
      cost: 0,
      curCode: ccy[0]?.curCode ?? 'USD',
      remark: '',
    };
  }

  async function openUnderMaintenanceModal() {
    if (readOnly) return;
    if (asset?.statusID === 10) return;

    try {
      let nextContacts = contacts;
      let nextCurrencies = currencies;

      if (nextContacts.length === 0 || nextCurrencies.length === 0) {
        const [c, cur] = await Promise.all([contactsApi.getLookup(), lookupsApi.getCurrencies()]);
        nextContacts = c.data as Contact[];
        nextCurrencies = cur.data as Currency[];
        setContacts(nextContacts);
        setCurrencies(nextCurrencies);
        lookupsLoadedRef.current = true;
      }

      setStatusMaintForm(makeDefaultMaintenanceForm(nextContacts, nextCurrencies));
      setStatusMaintAttachmentFile(null);
      setStatusMaintenanceModalOpen(true);
    } catch (err) {
      handleApiError(err, 'Failed to load maintenance lookups');
    }
  }

  function setStatusMaintField<K extends keyof MaintForm>(key: K, value: MaintForm[K]) {
    setStatusMaintForm((prev) => ({ ...prev, [key]: value }));
  }

  function makeDefaultStatusChangeForm(cs: Contact[] = contacts, ccy: Currency[] = currencies): StatusChangeForm {
    const today = new Date().toISOString().slice(0, 10);
    return {
      statusDate: today,
      statusDesc: '',
      statusContactID: cs[0]?.contactID ?? '',
      statusSalePrice: '',
      statusSaleCurCode: ccy[0]?.curCode ?? 'USD',
    };
  }

  function setStatusChangeField<K extends keyof StatusChangeForm>(key: K, value: StatusChangeForm[K]) {
    setStatusChangeForm((prev) => ({ ...prev, [key]: value }));
  }

  function closeStatusModal() {
    setStatusModalOpen(false);
    setStatusModalStatusId(null);
  }

  // Modified: only non-transfer statuses
  async function openStatusChangeModal(nextStatusId: number) {
    if (readOnly) return;
    if (!asset) return;
    if (asset.statusID === 10) return;

    const needsLookups = nextStatusId === 1 || nextStatusId === 4;
    try {
      let nextContacts = contacts;
      let nextCurrencies = currencies;

      if (needsLookups && (nextContacts.length === 0 || nextCurrencies.length === 0)) {
        const [c, cur] = await Promise.all([contactsApi.getLookup(), lookupsApi.getCurrencies()]);
        nextContacts = c.data as Contact[];
        nextCurrencies = cur.data as Currency[];
        setContacts(nextContacts);
        setCurrencies(nextCurrencies);
        lookupsLoadedRef.current = true;
      }

      setStatusModalStatusId(nextStatusId);
      setStatusChangeForm(makeDefaultStatusChangeForm(nextContacts, nextCurrencies));
      setStatusModalOpen(true);
    } catch (err) {
      handleApiError(err, 'Failed to load status lookups');
    }
  }

  // New: open transfer modal
  const openTransferModal = () => {
    if (readOnly || !asset || asset.statusID === 10) return;
    setTransferModalOpen(true);
  };

  async function handleStatusMaintenanceSubmit(e: FormEvent) {
    e.preventDefault();
    if (!asset || readOnly) return;
    if (statusMaintForm.fromDate && statusMaintForm.toDate && statusMaintForm.fromDate > statusMaintForm.toDate) {
      toast.error('From Date must be before or equal to To Date');
      return;
    }

    setSavingStatusMaintenance(true);
    try {
      let attID = statusMaintForm.attID ?? null;
      if (statusMaintAttachmentFile) {
        const base64 = await toBase64(statusMaintAttachmentFile);
        const ext = getNormalizedFileExtension(statusMaintAttachmentFile.name);
        if (isBlockedAttachmentExtension(ext)) {
          toast.error('This file type is not allowed.');
          return;
        }
        const upload = await attachmentsApi.create({
          assetID: assetId,
          attDesc: 'Maintenance Attachment',
          attFileName: statusMaintAttachmentFile.name,
          attFileExt: ext,
          remark: null,
          fileBase64: base64,
        });
        attID = (upload.data as Attachment).attID;
      }

      const createdMaintenance = await maintenancesApi.create({ assetID: assetId, ...statusMaintForm, attID });
      setMaintenances((prev) => [...prev, createdMaintenance.data as Maintenance]);

      const today = new Date().toISOString().slice(0, 10);
      await assetsApi.updateStatus(assetId, {
        assetStatusID: 8,
        assetStatusDate: today,
        statusID: 8,
        statusDate: today,
        statusContactID: null,
        statusSalePrice: 0,
        statusSaleCurCode: null,
        statusDesc: null,
      });

      setAsset((a) => a
        ? { ...a, statusID: 8, statusName: statuses.find((s) => s.statusID === 8)?.status ?? 'Under Maintenance' }
        : a);
      setTab('maintenance');
      setStatusMaintenanceModalOpen(false);
      setStatusMaintAttachmentFile(null);
      toast.success('Asset moved to Under Maintenance');
    } catch (err) {
      handleApiError(err, 'Failed to move asset to maintenance');
    } finally {
      setSavingStatusMaintenance(false);
    }
  }

  async function handleStatusChange(newStatusId: number) {
    if (!asset) return;
    if (readOnly) return;
    if (asset.statusID === 10) return;
    const today = new Date().toISOString().slice(0, 10);
    setChangingStatus(true);
    try {
      await assetsApi.updateStatus(assetId, {
        assetStatusID: newStatusId,
        assetStatusDate: today,
        statusID: newStatusId,
        statusDate: today,
        statusContactID: null,
        statusSalePrice: 0,
        statusSaleCurCode: null,
        statusDesc: null,
      });
      setAsset((a) => a ? { ...a, statusID: newStatusId, statusName: statuses.find((s) => s.statusID === newStatusId)?.status } : a);
      toast.success('Status updated');
    } catch (err) {
      handleApiError(err, 'Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  }

  // Modified: removed transfer logic
  async function handleStatusModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!asset) return;
    if (readOnly) return;
    if (asset.statusID === 10) return;
    if (statusModalStatusId == null) return;

    const salePrice = Number(statusChangeForm.statusSalePrice || 0);
    if (statusModalStatusId === 4 && salePrice < 0) {
      toast.error('Sale price cannot be negative');
      return;
    }
    if (!statusChangeForm.statusDate) {
      toast.error('Status date is required');
      return;
    }

    setChangingStatus(true);
    try {
      const contactId = statusModalStatusId === 1 || statusModalStatusId === 4
        ? (statusChangeForm.statusContactID === '' ? null : Number(statusChangeForm.statusContactID))
        : null;

      await assetsApi.updateStatus(assetId, {
        assetStatusID: statusModalStatusId,
        assetStatusDate: statusChangeForm.statusDate,
        statusID: statusModalStatusId,
        statusDate: statusChangeForm.statusDate,
        statusContactID: contactId,
        statusSalePrice: statusModalStatusId === 4 ? salePrice : 0,
        statusSaleCurCode: statusModalStatusId === 4 ? statusChangeForm.statusSaleCurCode : null,
        statusDesc: statusChangeForm.statusDesc.trim() || null,
      });

      setAsset((a) => a
        ? {
            ...a,
            statusID: statusModalStatusId,
            statusName: statuses.find((s) => s.statusID === statusModalStatusId)?.status,
          }
        : a);

      // Refresh status history
      try {
        const historyRes = await assetsApi.getStatusHistory(assetId);
        setStatusHistory(historyRes.data as StatusHistoryItem[]);
      } catch {
        // Non-critical
      }

      closeStatusModal();
      toast.success('Status updated');
    } catch (err) {
      handleApiError(err, 'Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleRemoveStatus() {
    if (!asset) return;
    if (readOnly) return;
    if (asset.statusID === 10) return;
    const today = new Date().toISOString().slice(0, 10);
    setChangingStatus(true);
    try {
      await assetsApi.removeStatus(assetId, {
        statusID: 5,
        statusDate: today,
        statusContactID: null,
        statusSalePrice: 0,
        statusSaleCurCode: null,
        statusDesc: null,
      });
      setAsset((a) => a ? { ...a, statusID: 0, statusName: statuses.find((s) => s.statusID === 0)?.status ?? 'Active' } : a);
      toast.success('Status removed');
    } catch (err) {
      handleApiError(err, 'Failed to remove status');
    } finally {
      setChangingStatus(false);
    }
  }

  // Removed useEffect hooks for transfer companies/employees

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
    if (tab === 'damage' && damages.length === 0)
      damagesApi.getByAsset(assetId)
        .then((r) => setDamages(r.data))
        .catch((err) => handleApiError(err, 'Failed to load damage records'));
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
    { key: 'damage', label: 'Damage' },
    { key: 'attachments', label: 'Attachments' },
    { key: 'remark', label: 'Remark' },
  ];
  const isUnderInventory = asset.statusID === 10;
  const statusModalStatusName = statuses.find((s) => s.statusID === statusModalStatusId)?.status ?? 'Status';

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
      <div className="bg-white border-b border-pearl-200 px-4 sm:px-8 py-5">
        <button
        type="button"
        onClick={() => navigate(backToListUrl)}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-300 hover:text-ink-600 transition-colors mb-3 bg-transparent border-none p-0 cursor-pointer"
      >
        <IconBack />
        Back to Assets
      </button>

        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-code text-[12px] text-navy-500 font-medium mb-0.5">{asset.assetCode}</div>
              <h1 className="text-[18px] sm:text-[20px] font-extrabold text-ink-800 leading-tight break-words">{asset.assetDesc}</h1>
              {asset.inServiceDate && (
                <span className="text-[11px] text-ink-300 mt-1 block">
                  In service: {new Date(asset.inServiceDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Status dropdown */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">Status</span>
              {asset.statusID === 10 ? (
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={asset.statusName ?? 'Under Inventory'} />
                  <span className="text-[10px] text-amber-600 font-medium">(locked)</span>
                </div>
              ) : readOnly ? (
                <StatusBadge status={asset.statusName ?? (asset.statusID != null ? `Status ${asset.statusID}` : 'Unknown')} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="relative inline-flex items-center" data-status-menu-root="true">
                    <button
                      type="button"
                      onClick={() => {
                        if (changingStatus) return;
                        setOpenStatusMenu((prev) => !prev);
                      }}
                      className={clsx(
                        'inline-flex items-center gap-2 min-w-[180px] rounded-lg border px-2.5 py-1.5 text-[12px] font-medium',
                        statusTone(asset.statusID),
                        'hover:shadow-sm transition-all cursor-pointer',
                        'focus:outline-none focus:ring-2 focus:ring-navy-500/20',
                        changingStatus && 'opacity-70 cursor-not-allowed'
                      )}
                    >
                      <span className="inline-flex items-center justify-center w-4 h-4">
                        {changingStatus
                          ? <span className="block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          : <StatusIcon statusId={asset.statusID} />}
                      </span>
                      <span className="truncate">{asset.statusName ?? (asset.statusID != null ? `Status ${asset.statusID}` : 'Active')}</span>
                      <span className="ml-auto text-ink-300"><IconChevronDown /></span>
                    </button>

                    {openStatusMenu && (
                      <div className="absolute top-[calc(100%+6px)] left-0 z-30 min-w-[220px] bg-white border border-pearl-200 rounded-xl shadow-xl p-1">
                        {statuses
                          .filter((s) => ![5, 9, 10].includes(s.statusID))
                          .map((s) => (
                            <button
                              type="button"
                              key={s.statusID}
                              onClick={() => {
                                if (asset.statusID === s.statusID) {
                                  setOpenStatusMenu(false);
                                  return;
                                }
                                setOpenStatusMenu(false);
                                if (s.statusID === 8) {
                                  void openUnderMaintenanceModal();
                                  return;
                                }
                                if (s.statusID === 2) {
                                  openTransferModal();
                                  return;
                                }
                                if (STATUSES_WITH_MODAL.has(s.statusID)) {
                                  void openStatusChangeModal(s.statusID);
                                  return;
                                }
                                void handleStatusChange(s.statusID);
                              }}
                              className={clsx(
                                'w-full text-left flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] transition-colors cursor-pointer',
                                asset.statusID === s.statusID
                                  ? 'bg-navy-50 text-navy-700'
                                  : 'hover:bg-pearl-50 text-ink-700'
                              )}
                            >
                              <span className={clsx('inline-flex items-center justify-center w-5 h-5 rounded-md border', statusTone(s.statusID))}>
                                <StatusIcon statusId={s.statusID} />
                              </span>
                              <span>{s.status}</span>
                              {asset.statusID === s.statusID && <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-navy-500">Current</span>}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveStatus}
                    disabled={changingStatus || asset.statusID === 0 || asset.statusID === 12 || asset.statusID === 13}
                    className="shrink-0 whitespace-nowrap text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-danger-light text-danger bg-danger-bg hover:bg-danger-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove Status
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-8 bg-pearl-200" />

            <button
              onClick={() => setShowBarcodeModal(true)}
              disabled={!asset.barcodeNumber}
              title={asset.barcodeNumber ? 'Print barcode label' : 'No barcode number assigned'}
              className="btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconBarcode />
              Print Barcode
            </button>
            {!readOnly && (
              <>
                {isUnderInventory ? (
                  <button
                    type="button"
                    disabled
                    title="Edit is disabled while asset is under inventory"
                    className="btn-secondary no-underline opacity-50 cursor-not-allowed"
                  >
                    <IconEdit />
                    Edit
                  </button>
                ) : (
                  <Link
                    to={`/assets/${assetId}/edit`}
                    state={{ from: backToListUrl, ref: 'detail' }}
                    className="btn-secondary no-underline"
                  >
                    <IconEdit />
                    Edit
                  </Link>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isUnderInventory}
                  title={isUnderInventory ? 'Delete is disabled while asset is under inventory' : undefined}
                  className={clsx('btn-danger', isUnderInventory && 'opacity-50 cursor-not-allowed')}
                >
                  <IconTrash />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-pearl-200 px-4 sm:px-8">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                const next = new URLSearchParams(searchParams);
                if (t.key === 'info') next.delete('tab'); else next.set('tab', t.key);
                setSearchParams(next, { replace: true });
              }}
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
      <div className="px-4 sm:px-8 py-6">
        {tab === 'info' && <AssetInfo asset={asset} />}
        {tab === 'depreciation' && <DepreciationTab data={depHistory} />}
        {tab === 'inventory' && <SimpleTable data={invHistory} columns={['inventoryID', 'isAvailable', 'location', 'relocated', 'createdDate']} />}
        {tab === 'status' && <SimpleTable data={statusHistory} columns={['statusDate', 'statusName', 'statusDesc', 'contactName', 'statusSalePrice', 'statusSaleCurCode', 'createdByFullName']} />}
        {tab === 'maintenance' && (
          <MaintenanceTab
            readOnly={readOnly}
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
          <WarrantyTab readOnly={readOnly} assetId={assetId} items={warranties} onChange={setWarranties} />
        )}
        {tab === 'damage' && (
          <DamageTab readOnly={readOnly} assetId={assetId} items={damages} onChange={setDamages} />
        )}
        {tab === 'attachments' && (
          <AttachmentsTab readOnly={readOnly} assetId={assetId} items={attachments} onChange={setAttachments} />
        )}
        {tab === 'remark' && (
          <RemarkTab readOnly={readOnly} asset={asset} onSaved={(updated) => setAsset(updated)} />
        )}
      </div>

      {/* Status Modal (now only for non-transfer statuses) */}
      {!readOnly && statusModalOpen && statusModalStatusId != null && (
        <Modal title={statusModalStatusName} onClose={closeStatusModal}>
          <form onSubmit={handleStatusModalSubmit}>
            <FormRow label="Date *">
              <input
                className={inp}
                type="date"
                value={statusChangeForm.statusDate}
                onChange={(e) => setStatusChangeField('statusDate', e.target.value)}
                required
              />
            </FormRow>

            <FormRow label="Description">
              <input
                className={inp}
                value={statusChangeForm.statusDesc}
                onChange={(e) => setStatusChangeField('statusDesc', e.target.value)}
                maxLength={500}
              />
            </FormRow>

            {(statusModalStatusId === 1 || statusModalStatusId === 4) && (
              <FormRow label="Contact">
                <Select
                  value={statusChangeForm.statusContactID}
                  onChange={(e) => setStatusChangeField('statusContactID', e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">Select…</option>
                  {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
                </Select>
              </FormRow>
            )}

            {statusModalStatusId === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormRow label="Price">
                  <input
                    className={inp}
                    type="number"
                    min="0"
                    step="0.01"
                    value={statusChangeForm.statusSalePrice}
                    onChange={(e) => setStatusChangeField('statusSalePrice', e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </FormRow>
                <FormRow label="Currency">
                  <Select value={statusChangeForm.statusSaleCurCode} onChange={(e) => setStatusChangeField('statusSaleCurCode', e.target.value)}>
                    {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode}</option>)}
                  </Select>
                </FormRow>
              </div>
            )}

            <ModalActions saving={changingStatus} onCancel={closeStatusModal} />
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {!readOnly && asset && (
        <TransferAssetModal
          asset={{
            assetID: asset.assetID,
            companyID: asset.companyID,
            statusID: asset.statusID,
          }}
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onTransferred={(newEmpID) => {
            setAsset((prev) => prev ? { ...prev, hrEmpIDUsedBy: newEmpID } : prev);
            // Refresh status history
            assetsApi.getStatusHistory(assetId)
              .then((r) => setStatusHistory(r.data as StatusHistoryItem[]))
              .catch(() => {});
          }}
        />
      )}

      {/* Maintenance modal (unchanged) */}
      {!readOnly && statusMaintenanceModalOpen && (
        <Modal title="Add Maintenance" onClose={() => setStatusMaintenanceModalOpen(false)}>
          <form onSubmit={handleStatusMaintenanceSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormRow label="From Date *">
                <input className={inp} type="date" value={statusMaintForm.fromDate} max={statusMaintForm.toDate || undefined} onChange={(e) => setStatusMaintField('fromDate', e.target.value)} required />
              </FormRow>
              <FormRow label="To Date *">
                <input className={inp} type="date" value={statusMaintForm.toDate} min={statusMaintForm.fromDate || undefined} onChange={(e) => setStatusMaintField('toDate', e.target.value)} required />
              </FormRow>
            </div>
            <FormRow label="Supplier *">
              <Select value={statusMaintForm.supplierContactID} onChange={(e) => setStatusMaintField('supplierContactID', Number(e.target.value))} required>
                <option value="">Select…</option>
                {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
              </Select>
            </FormRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormRow label="Cost">
                <input className={inp} type="number" step="0.01" value={statusMaintForm.cost} onChange={(e) => setStatusMaintField('cost', Number(e.target.value))} />
              </FormRow>
              <FormRow label="Currency *">
                <Select value={statusMaintForm.curCode} onChange={(e) => setStatusMaintField('curCode', e.target.value)} required>
                  {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode}</option>)}
                </Select>
              </FormRow>
            </div>
            <FormRow label="Remark">
              <input className={inp} value={statusMaintForm.remark ?? ''} onChange={(e) => setStatusMaintField('remark', e.target.value)} maxLength={100} />
            </FormRow>
            <FormRow label="Attachment">
              <input
                className={inp}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => setStatusMaintAttachmentFile(e.target.files?.[0] ?? null)}
              />
            </FormRow>
            <ModalActions saving={savingStatusMaintenance} onCancel={() => setStatusMaintenanceModalOpen(false)} />
          </form>
        </Modal>
      )}
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
        <InfoField
          label="Used By"
          value={
            asset.employeeName
              ? asset.hrEmpIDUsedBy
                ? `${asset.employeeName} – ${asset.hrEmpIDUsedBy}`
                : asset.empIDUsedBy
                  ? `${asset.employeeName} – ${asset.empIDUsedBy}`
                  : asset.employeeName
              : asset.hrEmpIDUsedBy ?? asset.empIDUsedBy?.toString() ?? null
          }
        />
        <InfoField label="Brand" value={asset.brandDesc} />
        <InfoField label="Model" value={asset.model} />
        <InfoField label="Barcode" value={asset.barcodeNumber} mono />
        <InfoField label="Serial Number" value={asset.serialNumber} mono />
        <InfoField label="In Service Date" value={asset.inServiceDate} />
        <InfoField label="Donation" value={asset.donation ? 'Yes' : 'No'} />
        <InfoField label="Owner" value={asset.ownerTypeDesc} />
        <InfoField label="Owner Description" value={asset.ownerDesc} />
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

// ─── Depreciation Tab ─────────────────────────────────────────────────────────

function DepreciationTab({ data }: { data: DepreciationHistoryItem[] }) {
  if (data.length === 0) return <EmptyState message="No depreciation records yet." />;

  return (
    <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
      <div className="bg-pearl-100 border-b border-pearl-200 px-5 py-2.5 grid grid-cols-5 gap-4 min-w-[700px]">
        {['Date', 'Rate %', 'Depreciation', 'Net Book Value', 'Recorded By'].map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
        ))}
      </div>
      {data.map((row, i) => (
        <div
          key={i}
          className={clsx(
            'grid grid-cols-5 gap-4 px-5 py-3.5 items-center min-w-[700px]',
            'hover:bg-pearl-50 transition-colors duration-100',
            i < data.length - 1 && 'border-b border-pearl-200'
          )}
        >
          <div className="text-[12px] text-ink-600">{row.depreciationDate}</div>
          <div className="num text-[12px] text-ink-600">{row.depreciationRate}%</div>
          <div className="num-cost text-[13px] font-semibold">
            {row.depreciationValue != null ? `(${Number(row.depreciationValue).toLocaleString(undefined, { minimumFractionDigits: 2 })})` : '—'}
          </div>
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
    <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
      <div className={`grid gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200`}
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))`, minWidth: `${columns.length * 120}px` }}>
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
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(120px, 1fr))`, minWidth: `${columns.length * 120}px` }}
          >
            {columns.map((c) => (
              <div key={c} className="text-[12px] text-ink-700 break-words max-w-xs">{String(r[c] ?? '—')}</div>
            ))}
          </div>
        );
      })}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-10 h-10 rounded-full bg-pearl-100 flex items-center justify-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9a9585" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      </div>
      <p className="text-[13px] text-ink-400">{message}</p>
    </div>
  );
}

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

// ─── Maintenance Tab ─────────────────────────────────────────────────────────

function MaintenanceTab({
  readOnly, assetId, assetStatusID, onAssetStatusChange, items, contacts, currencies, onChange,
}: {
  readOnly: boolean;
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
  const [form, setForm] = useState<MaintForm>({ attID: null, fromDate: '', toDate: '', supplierContactID: 0, cost: 0, curCode: 'USD', remark: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNames, setAttachmentNames] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);

  useEffect(() => {
    const linkedIds = new Set(
      items
        .map((x) => x.attID)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    );

    if (linkedIds.size === 0) {
      setAttachmentNames({});
      return;
    }

    attachmentsApi.getByAsset(assetId)
      .then((r) => {
        const map: Record<number, string> = {};
        (r.data as Attachment[]).forEach((att) => {
          if (linkedIds.has(att.attID)) {
            map[att.attID] = att.attFileName;
          }
        });
        setAttachmentNames(map);
      })
      .catch(() => setAttachmentNames({}));
  }, [assetId, items]);

  async function handleReturn(m: Maintenance) {
    if (readOnly) return;
    const ok = await confirm(`Mark asset as returned from maintenance?`, { title: 'Return From Maintenance' });
    if (!ok) return;
    setReturning(m.maintID);
    try {
      await maintenancesApi.returnFromMaintenance(m.maintID);
      onAssetStatusChange(0);
      toast.success('Asset marked as returned from maintenance');
    } catch (err) { handleApiError(err, 'Failed to update status'); }
    finally { setReturning(null); }
  }

  function openAdd() {
    if (readOnly) return;
    setForm({ attID: null, fromDate: '', toDate: '', supplierContactID: contacts[0]?.contactID ?? 0, cost: 0, curCode: currencies[0]?.curCode ?? 'USD', remark: '' });
    setAttachmentFile(null);
    setModal('add');
  }
  function openEdit(item: Maintenance) {
    if (readOnly) return;
    setEditing(item);
    setForm({ attID: item.attID ?? null, fromDate: item.fromDate, toDate: item.toDate, supplierContactID: item.supplierContactID, cost: item.cost, curCode: item.curCode, remark: item.remark ?? '' });
    setAttachmentFile(null);
    setModal('edit');
  }
  function close() { setModal(null); setEditing(null); setAttachmentFile(null); }
  function setF<K extends keyof MaintForm>(k: K, v: MaintForm[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (form.fromDate && form.toDate && form.fromDate > form.toDate) {
      toast.error('From Date must be before or equal to To Date');
      return;
    }
    setSaving(true);
    try {
      let attID = form.attID ?? null;
      if (attachmentFile) {
        const base64 = await toBase64(attachmentFile);
        const ext = getNormalizedFileExtension(attachmentFile.name);
        if (isBlockedAttachmentExtension(ext)) {
          toast.error('This file type is not allowed.');
          return;
        }
        const upload = await attachmentsApi.create({
          assetID: assetId,
          attDesc: 'Maintenance Attachment',
          attFileName: attachmentFile.name,
          attFileExt: ext,
          remark: null,
          fileBase64: base64,
        });
        attID = (upload.data as Attachment).attID;
      }

      if (modal === 'add') {
        const r = await maintenancesApi.create({ assetID: assetId, ...form, attID });
        onChange([...items, r.data as Maintenance]);
        toast.success('Maintenance added');
      } else if (editing) {
        const r = await maintenancesApi.update(editing.maintID, {
          assetID: assetId, maintID: editing.maintID, ...form, attID,
          original_MaintID: editing.maintID, original_AssetID: editing.assetID,
          isNull_AttID: editing.attID == null ? 1 : 0, original_AttID: editing.attID ?? null,
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
    if (readOnly) return;
    const ok = await confirm('This maintenance record will be permanently removed.', { title: 'Delete Maintenance?' });
    if (!ok) return;
    try {
      await maintenancesApi.delete(item.maintID, {
        assetID: item.assetID, attID: item.attID ?? null, fromDate: item.fromDate, toDate: item.toDate,
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
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button onClick={openAdd} className="btn-primary">
            <IconPlus /> Add Maintenance
          </button>
        </div>
      )}

      {items.length === 0 ? <EmptyState message="No maintenance records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_2fr_110px_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[900px]">
            {['From', 'To', 'Supplier', 'Cost', 'Currency', 'Remark', 'Attachment', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((m, i) => (
            <div key={m.maintID} className={clsx(
              'grid grid-cols-[1fr_1fr_2fr_1fr_1fr_2fr_110px_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[900px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-700">{m.fromDate}</div>
              <div className="text-[12px] text-ink-700">{m.toDate}</div>
              <div className="text-[12px] text-ink-700 truncate">{contactName(m.supplierContactID)}</div>
              <div className="num-cost text-[12px] font-medium">{m.cost}</div>
              <div className="text-[12px] font-code text-ink-600">{m.curCode}</div>
              <div className="text-[12px] text-ink-400 truncate">{m.remark ?? '—'}</div>
              <div>
                {m.attID ? (
                  <div className="flex items-center gap-1.5">
                    <ActionBtn onClick={() => downloadAttachmentById(m.attID!, `maintenance-${m.maintID}-attachment`)}>Download</ActionBtn>
                    <ActionBtn onClick={() => previewAttachmentById(m.attID!)}>Preview</ActionBtn>
                  </div>
                ) : <span className="text-[12px] text-ink-300">—</span>}
              </div>
              <div className="flex gap-1.5">
                {!readOnly && <ActionBtn onClick={() => openEdit(m)}>Edit</ActionBtn>}
                {!readOnly && <ActionBtn danger onClick={() => handleDelete(m)}>Delete</ActionBtn>}
                {!readOnly && assetStatusID === 8 && (
                  <ActionBtn onClick={() => handleReturn(m)} disabled={returning === m.maintID}>
                    {returning === m.maintID ? '…' : 'Mark Returned'}
                  </ActionBtn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && modal && (
        <Modal title={modal === 'add' ? 'Add Maintenance' : 'Edit Maintenance'} onClose={close}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormRow label="From Date *">
                <input className={inp} type="date" value={form.fromDate} max={form.toDate || undefined} onChange={(e) => setF('fromDate', e.target.value)} required />
              </FormRow>
              <FormRow label="To Date *">
                <input className={inp} type="date" value={form.toDate} min={form.fromDate || undefined} onChange={(e) => setF('toDate', e.target.value)} required />
              </FormRow>
            </div>
            <FormRow label="Supplier *">
              <Select value={form.supplierContactID} onChange={(e) => setF('supplierContactID', Number(e.target.value))} required>
                <option value="">Select…</option>
                {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
              </Select>
            </FormRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <FormRow label="Attachment">
              <input
                className={inp}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              {modal === 'edit' && form.attID && !attachmentFile && (
                <div className="mt-2 rounded-md border border-pearl-200 bg-pearl-50 px-3 py-2.5">
                  <div className="text-[11px] text-ink-600">
                    Current file: <span className="font-semibold">{attachmentNames[form.attID] ?? `Attachment #${form.attID}`}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => downloadAttachmentById(form.attID!, `maintenance-${editing?.maintID ?? 'attachment'}-attachment`)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => previewAttachmentById(form.attID!)}
                    >
                      Preview
                    </button>
                  </div>
                  <div className="text-[11px] text-ink-400 mt-2">Choose a file only if you want to replace it.</div>
                </div>
              )}
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

function WarrantyTab({ readOnly, assetId, items, onChange }: { readOnly: boolean; assetId: number; items: Warranty[]; onChange: (v: Warranty[]) => void }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Warranty | null>(null);
  const [form, setForm] = useState<WarrForm>({ attID: null, warrantyDesc: '', fromDate: '', toDate: '', remark: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNames, setAttachmentNames] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const linkedIds = new Set(
      items
        .map((x) => x.attID)
        .filter((id): id is number => typeof id === 'number' && id > 0)
    );

    if (linkedIds.size === 0) {
      setAttachmentNames({});
      return;
    }

    attachmentsApi.getByAsset(assetId)
      .then((r) => {
        const map: Record<number, string> = {};
        (r.data as Attachment[]).forEach((att) => {
          if (linkedIds.has(att.attID)) {
            map[att.attID] = att.attFileName;
          }
        });
        setAttachmentNames(map);
      })
      .catch(() => setAttachmentNames({}));
  }, [assetId, items]);

  function openAdd() { if (readOnly) return; setForm({ attID: null, warrantyDesc: '', fromDate: '', toDate: '', remark: '' }); setAttachmentFile(null); setModal('add'); }
  function openEdit(item: Warranty) {
    if (readOnly) return;
    setEditing(item);
    setForm({ attID: item.attID ?? null, warrantyDesc: item.warrantyDesc, fromDate: item.fromDate, toDate: item.toDate, remark: item.remark ?? '' });
    setAttachmentFile(null);
    setModal('edit');
  }
  function close() { setModal(null); setEditing(null); setAttachmentFile(null); }
  function setF<K extends keyof WarrForm>(k: K, v: WarrForm[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (form.fromDate && form.toDate && form.fromDate > form.toDate) {
      toast.error('From Date must be before or equal to To Date');
      return;
    }
    setSaving(true);
    try {
      let attID = form.attID ?? null;
      if (attachmentFile) {
        const base64 = await toBase64(attachmentFile);
        const ext = getNormalizedFileExtension(attachmentFile.name);
        if (isBlockedAttachmentExtension(ext)) {
          toast.error('This file type is not allowed.');
          return;
        }
        const upload = await attachmentsApi.create({
          assetID: assetId,
          attDesc: 'Warranty Attachment',
          attFileName: attachmentFile.name,
          attFileExt: ext,
          remark: null,
          fileBase64: base64,
        });
        attID = (upload.data as Attachment).attID;
      }

      if (modal === 'add') {
        const r = await warrantiesApi.create({ assetID: assetId, ...form, attID });
        onChange([...items, r.data as Warranty]);
        toast.success('Warranty added');
      } else if (editing) {
        const r = await warrantiesApi.update(editing.warntID, {
          assetID: assetId, warntID: editing.warntID, ...form, attID,
          original_WarntID: editing.warntID, original_AssetID: editing.assetID,
          isNull_AttID: editing.attID == null ? 1 : 0, original_AttID: editing.attID ?? null,
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
    if (readOnly) return;
    const ok = await confirm('This warranty record will be permanently removed.', { title: 'Delete Warranty?' });
    if (!ok) return;
    try {
      await warrantiesApi.delete(item.warntID, {
        assetID: item.assetID, attID: item.attID ?? null, warrantyDesc: item.warrantyDesc,
        fromDate: item.fromDate, toDate: item.toDate, remark: item.remark ?? null,
      });
      onChange(items.filter((i) => i.warntID !== item.warntID));
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  return (
    <>
      {confirmDialog}
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button onClick={openAdd} className="btn-primary"><IconPlus /> Add Warranty</button>
        </div>
      )}

      {items.length === 0 ? <EmptyState message="No warranty records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_110px_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[760px]">
            {['Description', 'From Date', 'To Date', 'Remark', 'Attachment', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((w, i) => (
            <div key={w.warntID} className={clsx(
              'grid grid-cols-[2fr_1fr_1fr_2fr_110px_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[760px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-800 font-medium truncate">{w.warrantyDesc}</div>
              <div className="text-[12px] text-ink-600">{w.fromDate}</div>
              <div className="text-[12px] text-ink-600">{w.toDate}</div>
              <div className="text-[12px] text-ink-400 truncate">{w.remark ?? '—'}</div>
              <div>
                {w.attID ? (
                  <div className="flex items-center gap-1.5">
                    <ActionBtn onClick={() => downloadAttachmentById(w.attID!, `warranty-${w.warntID}-attachment`)}>Download</ActionBtn>
                    <ActionBtn onClick={() => previewAttachmentById(w.attID!)}>Preview</ActionBtn>
                  </div>
                ) : <span className="text-[12px] text-ink-300">—</span>}
              </div>
              <div className="flex gap-1.5">
                {!readOnly && <ActionBtn onClick={() => openEdit(w)}>Edit</ActionBtn>}
                {!readOnly && <ActionBtn danger onClick={() => handleDelete(w)}>Delete</ActionBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && modal && (
        <Modal title={modal === 'add' ? 'Add Warranty' : 'Edit Warranty'} onClose={close}>
          <form onSubmit={handleSubmit}>
            <FormRow label="Description *">
              <input className={inp} value={form.warrantyDesc} onChange={(e) => setF('warrantyDesc', e.target.value)} required maxLength={50} />
            </FormRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormRow label="From Date *">
                <input className={inp} type="date" value={form.fromDate} max={form.toDate || undefined} onChange={(e) => setF('fromDate', e.target.value)} required />
              </FormRow>
              <FormRow label="To Date *">
                <input className={inp} type="date" value={form.toDate} min={form.fromDate || undefined} onChange={(e) => setF('toDate', e.target.value)} required />
              </FormRow>
            </div>
            <FormRow label="Remark">
              <input className={inp} value={form.remark ?? ''} onChange={(e) => setF('remark', e.target.value)} maxLength={100} />
            </FormRow>
            <FormRow label="Attachment">
              <input
                className={inp}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              {modal === 'edit' && form.attID && !attachmentFile && (
                <div className="mt-2 rounded-md border border-pearl-200 bg-pearl-50 px-3 py-2.5">
                  <div className="text-[11px] text-ink-600">
                    Current file: <span className="font-semibold">{attachmentNames[form.attID] ?? `Attachment #${form.attID}`}</span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => downloadAttachmentById(form.attID!, `warranty-${editing?.warntID ?? 'attachment'}-attachment`)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => previewAttachmentById(form.attID!)}
                    >
                      Preview
                    </button>
                  </div>
                  <div className="text-[11px] text-ink-400 mt-2">Choose a file only if you want to replace it.</div>
                </div>
              )}
            </FormRow>
            <ModalActions saving={saving} onCancel={close} />
          </form>
        </Modal>
      )}
    </>
  );
}

// ─── Damage tab ──────────────────────────────────────────────────────────────

type DamageForm = { damageDate: string; damageDesc: string };

function DamageTab({ readOnly, assetId, items, onChange }: { readOnly: boolean; assetId: number; items: Damage[]; onChange: (v: Damage[]) => void }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Damage | null>(null);
  const [form, setForm] = useState<DamageForm>({ damageDate: '', damageDesc: '' });
  const [saving, setSaving] = useState(false);

  function openAdd() {
    if (readOnly) return;
    setEditing(null);
    setForm({ damageDate: new Date().toISOString().slice(0, 10), damageDesc: '' });
    setModal('add');
  }

  function openEdit(item: Damage) {
    if (readOnly) return;
    setEditing(item);
    setForm({ damageDate: item.damageDate, damageDesc: item.damageDesc });
    setModal('edit');
  }

  function close() { setModal(null); setEditing(null); }
  function setF<K extends keyof DamageForm>(k: K, v: DamageForm[K]) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const damageDesc = form.damageDesc.trim();
    if (!damageDesc) { toast.error('Description is required'); return; }

    setSaving(true);
    try {
      const payload = { assetID: assetId, damageDate: form.damageDate, damageDesc };
      if (modal === 'add') {
        const r = await damagesApi.create(payload);
        onChange([r.data, ...items]);
        toast.success('Damage added');
      } else if (editing) {
        const r = await damagesApi.update(editing.damageID, payload);
        onChange(items.map((i) => (i.damageID === editing.damageID ? r.data : i)));
        toast.success('Damage updated');
      }
      close();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Damage) {
    if (readOnly) return;
    const ok = await confirm('This damage record will be permanently removed.', { title: 'Delete Damage?' });
    if (!ok) return;
    try {
      await damagesApi.delete(item.damageID);
      onChange(items.filter((i) => i.damageID !== item.damageID));
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  return (
    <>
      {confirmDialog}
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button onClick={openAdd} className="btn-primary"><IconPlus /> Add Damage</button>
        </div>
      )}

      {items.length === 0 ? <EmptyState message="No damage records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className="grid grid-cols-[140px_1fr_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[560px]">
            {['Date', 'Description', ''].map((h, i) => (
              <div key={i} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((d, i) => (
            <div key={d.damageID} className={clsx(
              'grid grid-cols-[140px_1fr_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[560px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-600">{d.damageDate}</div>
              <div className="text-[12px] text-ink-800 font-medium break-words">{d.damageDesc}</div>
              <div className="flex gap-1.5">
                {!readOnly && <ActionBtn onClick={() => openEdit(d)}>Edit</ActionBtn>}
                {!readOnly && <ActionBtn danger onClick={() => handleDelete(d)}>Delete</ActionBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && modal && (
        <Modal title={modal === 'add' ? 'Add Damage' : 'Edit Damage'} onClose={close}>
          <form onSubmit={handleSubmit}>
            <FormRow label="Date *">
              <input className={inp} type="date" value={form.damageDate} onChange={(e) => setF('damageDate', e.target.value)} required />
            </FormRow>
            <FormRow label="Description *">
              <input
                className={inp}
                value={form.damageDesc}
                onChange={(e) => setF('damageDesc', e.target.value)}
                placeholder="e.g. Chair has a broken leg"
                required
                maxLength={100}
              />
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
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    avif: 'image/avif',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
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

async function downloadAttachmentById(attId: number, fallbackName: string) {
  try {
    const res = await attachmentsApi.download(attId);
    const url = URL.createObjectURL(new Blob([res.data]));
    const contentDisposition = (res.headers?.['content-disposition'] as string | undefined) ?? undefined;
    const fileName = getFileNameFromContentDisposition(contentDisposition) ?? fallbackName;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) { handleApiError(err, 'Download failed'); }
}

function getFileNameFromContentDisposition(contentDisposition?: string): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) return plainMatch[1].trim();

  return null;
}

async function previewAttachmentById(attId: number) {
  try {
    const res = await attachmentsApi.view(attId);
    const contentType = (res.headers?.['content-type'] as string | undefined) ?? 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([res.data], { type: contentType }));
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) { handleApiError(err, 'Preview failed'); }
}

// ─── Attachments Tab ──────────────────────────────────────────────────────────

function AttachmentsTab({ readOnly, assetId, items, onChange }: { readOnly: boolean; assetId: number; items: Attachment[]; onChange: (v: Attachment[]) => void }) {
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
    if (readOnly) return;
    if (!file) { toast.error('Please select a file'); return; }
    setSaving(true);
    try {
      const base64 = await toBase64(file);
      const ext = getNormalizedFileExtension(file.name);
      if (isBlockedAttachmentExtension(ext)) {
        toast.error('This file type is not allowed.');
        return;
      }
      const r = await attachmentsApi.create({ assetID: assetId, attDesc, attFileName: file.name, attFileExt: ext, remark: remark || null, fileBase64: base64 });
      onChange([...items, r.data as Attachment]);
      toast.success('Attachment uploaded');
      close();
    } catch (err) { handleApiError(err, 'Upload failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Attachment) {
    if (readOnly) return;
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
      {!readOnly && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowModal(true)} className="btn-primary"><IconPaperclip /> Upload Attachment</button>
        </div>
      )}

      {items.length === 0 ? <EmptyState message="No attachments yet." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className="grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[640px]">
            {['Description', 'File Name', 'Ext', 'Remark', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((a, i) => (
            <div key={a.attID} className={clsx(
              'grid grid-cols-[2fr_2fr_1fr_2fr_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[640px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-800 font-medium truncate">{a.attDesc}</div>
              <div className="text-[12px] text-ink-600 truncate font-code">{a.attFileName}</div>
              <div className="text-[11px] text-ink-400 uppercase font-code">{a.attFileExt}</div>
              <div className="text-[12px] text-ink-400 truncate">{a.remark ?? '—'}</div>
              <div className="flex items-center gap-2">
                <ActionBtn onClick={() => downloadAttachment(a)}>Download</ActionBtn>
                <ActionBtn onClick={() => handlePreview(a)} disabled={previewLoading}>{previewLoading ? 'Loading…' : 'Preview'}</ActionBtn>
                {!readOnly && <ActionBtn danger onClick={() => handleDelete(a)}>Delete</ActionBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!readOnly && showModal && (
        <Modal title="Upload Attachment" onClose={close}>
          <form onSubmit={handleUpload}>
            <FormRow label="Description *">
              <input className={inp} value={attDesc} onChange={(e) => setAttDesc(e.target.value)} required maxLength={50} />
            </FormRow>
            <FormRow label="File *">
              <input
                type="file"
                accept={ATTACHMENT_ACCEPT}
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
  const isImage = ['png', 'jpg', 'jpeg', 'bmp', 'svg', 'avif'].includes(ext);
  const isPdf   = ext === 'pdf';

  return (
    <Modal title={item.attFileName} onClose={onClose} width="max-w-4xl">
      {isImage && (
        <img src={url} alt={item.attFileName} className="max-w-full max-h-[70vh] mx-auto rounded object-contain block" />
      )}
      {isPdf && (
        <iframe src={url} title={item.attFileName} className="w-full rounded border border-pearl-200" style={{ height: '70vh' }} />
      )}
      {!isImage && !isPdf && (
        <div className="py-10 text-center text-ink-400 text-sm">
          <p className="mb-2">Preview is not available for <span className="font-semibold uppercase">.{ext}</span> files.</p>
          <p>Use the <span className="font-semibold">Download</span> button to open this file.</p>
        </div>
      )}
    </Modal>
  );
}

function getNormalizedFileExtension(fileName: string): string {
  return (fileName.split('.').pop() ?? '').trim().toLowerCase();
}

function isBlockedAttachmentExtension(ext: string): boolean {
  return BLOCKED_ATTACHMENT_EXTENSIONS.has((ext ?? '').trim().toLowerCase().replace(/^\./, ''));
}

// ─── Remark Tab ───────────────────────────────────────────────────────────────

function RemarkTab({ readOnly, asset, onSaved }: { readOnly: boolean; asset: Asset; onSaved: (updated: Asset) => void }) {
  const [remark, setRemark] = useState(asset.remark ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
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
          disabled={readOnly}
        />
        <div className="text-right text-[11px] text-ink-300 mb-4">{remark.length}/100</div>
        {!readOnly && (
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Remark'}
          </button>
        )}
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