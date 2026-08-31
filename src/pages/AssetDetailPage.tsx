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
import EmptyState from '../components/ui/EmptyState';
import AuditTimeline from '../components/ui/AuditTimeline';
import BarcodePrintModal from '../components/BarcodePrintModal';
import TransferAssetModal from '../components/TransferAssetModal';
import { companyPrmCurrency } from '../utils/currency';
import { fmtDate, fmtDateTime } from '../utils/date';
import { addRecentAsset } from '../utils/recentAssets';
import type {
  Asset, Company, DepreciationHistoryItem, InventoryHistoryItem, StatusHistoryItem, AssetAuditEntry,
  Maintenance, Warranty, Damage, Attachment, Contact, Currency, StatusType,
} from '../types';

type Tab = 'info' | 'activity' | 'depreciation' | 'inventory' | 'status' |'damage' | 'warranty' |  'attachments' | 'remark';

const TAB_KEYS: Tab[] = ['info', 'activity', 'depreciation', 'inventory', 'status', 'damage', 'warranty',  'attachments', 'remark'];
/**
 * Spelled out rather than derived from Maintenance: the row carries fields the form has
 * no business editing (returnedDate, and the damageDesc/damageDate/damageFixed columns
 * joined in for display). damageID is '' until one is chosen, so the select can start empty.
 */
type MaintForm = {
  damageID: number | '';
  attID: number | null;
  fromDate: string;
  toDate: string;
  supplierContactID: number;
  cost: number;
  curCode: string;
  remark?: string;
  workPerformed?: string;
};

type StatusChangeForm = {
  statusDate: string;
  statusDesc: string;
  statusContactID: number | '';
  statusSalePrice: number | '';
  statusSaleCurCode: string;
};

const STATUSES_WITH_MODAL = new Set([1, 3, 4, 7]); // 2 is now handled by TransferAssetModal

/**
 * Grouping/order for the status-change dropdown in the header. Statuses within a group are
 * listed in this order; a thin divider is drawn between groups. Any status not listed here
 * (and not already excluded from the menu) sorts after all groups, in raw statusID order.
 */
const STATUS_MENU_GROUPS: number[][] = [
  [0, 13],    // Active, Active/Remote Work
  [12, 14],   // In Stock, Unreceived Stock
  [3, 11, 6], // Destroyed, Decomission, Lost
  [4, 7, 1],  // Sold, Return To Supplier, Donated
  [2],        // Transferred
];
const STATUS_MENU_ORDER: number[] = STATUS_MENU_GROUPS.flat();
const STATUS_MENU_GROUP_END = new Set(STATUS_MENU_GROUPS.slice(0, -1).map((g) => g[g.length - 1]));

function byStatusMenuOrder(a: StatusType, b: StatusType): number {
  const ia = STATUS_MENU_ORDER.indexOf(a.statusID);
  const ib = STATUS_MENU_ORDER.indexOf(b.statusID);
  if (ia === -1 && ib === -1) return a.statusID - b.statusID;
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}
// Allowlist, mirroring AttachmentContentValidator on the server. The old four-item
// blocklist let through .exe, .aspx, .html and .js. SVG is excluded: it is XML that can
// carry script, and the server no longer stores or serves it.
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'bmp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);
const ATTACHMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.bmp';

// Shared input style
const inp = 'input-base';

/**
 * Every control in the detail-page header row (status dropdown, Remove Status,
 * Print Barcode, Edit, Delete) carries this so they read as one toolbar.
 * 38px is btn-secondary's natural height — text-sm (20px line) + py-2 + 1px border —
 * so the taller buttons keep their current size and the smaller ones grow to meet them.
 */
const HEADER_CTRL = 'h-[38px]';

// ─── helpers ───────────────────────────────────────────────────────────────

// ─── Icons ─────────────────────────────────────────────────────────────────

function IconWrench() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3l9.4-9.4a4 4 0 0 0-5-5l3.1 3.1-2.1 2.1-3.1-3.1a4 4 0 0 0 5 5z"/>
    </svg>
  );
}

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

  if (statusId === 3 || statusId === 11 || statusId === 6)
    return 'bg-rose-50 text-rose-700 border-rose-200';

  if (statusId === 4 || statusId === 1 || statusId === 7)
    return 'bg-amber-50 text-amber-700 border-amber-200';

  if (statusId === 2)
    return 'bg-sky-50 text-sky-700 border-sky-200';

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
  const [auditLog, setAuditLog] = useState<AssetAuditEntry[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [damages, setDamages] = useState<Damage[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  // Only needed to resolve the asset company's primary currency, so a failure here must
  // not break the page — the currency inputs just fall back to their previous default.
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statuses, setStatuses] = useState<StatusType[]>([]);
  const [changingStatus, setChangingStatus] = useState(false);
  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [statusMaintenanceModalOpen, setStatusMaintenanceModalOpen] = useState(false);
  const [statusMaintForm, setStatusMaintForm] = useState<MaintForm>({ damageID: '', attID: null, fromDate: new Date().toISOString().slice(0, 10), toDate: '', supplierContactID: 0, cost: 0, curCode: 'USD', remark: '' });
  const [statusMaintAttachmentFile, setStatusMaintAttachmentFile] = useState<File | null>(null);
  const [savingStatusMaintenance, setSavingStatusMaintenance] = useState(false);
  // The damage the Send to Maintenance modal is repairing — always known up front now,
  // since the modal is only ever opened from a specific row on the Damage tab. Shown as
  // read-only info rather than a picker. Refetched every time the modal opens so a damage
  // another user just fixed or dispatched can't be offered.
  const [maintenanceDamage, setMaintenanceDamage] = useState<Damage | null>(null);
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
        const loadedAsset = assetRes.data as Asset;
        setAsset(loadedAsset);
        setStatuses(statusRes.data as StatusType[]);
        addRecentAsset({
          assetID: loadedAsset.assetID,
          assetDesc: loadedAsset.assetDesc,
          assetCode: loadedAsset.assetCode,
          category: loadedAsset.category,
        });
      })
      .catch((err) => handleApiError(err, 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [assetId]);

  // Separate from the load above, and deliberately not fatal: this only supplies the
  // company's primary currency for the money inputs, so losing it must not stop the
  // asset from rendering.
  useEffect(() => {
    lookupsApi.getCompanies()
      .then((r) => setCompanies(r.data as Company[]))
      .catch(() => setCompanies([]));
  }, []);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-status-menu-root="true"]')) return;
      setOpenStatusMenu(false);
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, []);
 



  /**
   * Which currency a money field on this asset should start on: its company's primary
   * currency. Falls back to the old behaviour — first row of the currency lookup, then
   * 'USD' — when the companies lookup hasn't loaded or the company has no primary
   * currency recorded. This is only the default; every form using it stays editable.
   *
   * Takes the currency list as an argument because callers often have a freshly fetched
   * list that has not landed in state yet.
   */
  function defaultCurCode(ccy: Currency[] = currencies) {
    return companyPrmCurrency(companies, asset?.companyID) || ccy[0]?.curCode || 'USD';
  }

  function makeDefaultMaintenanceForm(cs: Contact[] = contacts, ccy: Currency[] = currencies, damageID: number | '' = ''): MaintForm {
    return {
      damageID,
      attID: null,
      fromDate: new Date().toISOString().slice(0, 10),
      toDate: '',
      supplierContactID: cs[0]?.contactID ?? 0,
      cost: 0,
      curCode: defaultCurCode(ccy),
      remark: '',
    };
  }

  /**
   * The single entry point to the Send to Maintenance modal — always reached from a
   * specific damage's row on the Damage tab, so the damage is never in question.
   */
  async function openUnderMaintenanceModal(damageId: number) {
    if (readOnly) return;
    if (asset?.statusID === 8 || asset?.statusID === 10) return;

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

      // Always fresh: another user may have fixed or dispatched this damage since this
      // page loaded, and the API rejects either.
      const selectable = (await damagesApi.getSelectableByAsset(assetId)).data;
      const target = selectable.find((d) => d.damageID === damageId);
      if (!target) {
        toast.error('That damage is already fixed or already out for repair.');
        void refreshDamages();
        return;
      }

      setMaintenanceDamage(target);
      setStatusMaintForm(makeDefaultMaintenanceForm(nextContacts, nextCurrencies, damageId));
      setStatusMaintAttachmentFile(null);
      setStatusMaintenanceModalOpen(true);
    } catch (err) {
      handleApiError(err, 'Failed to load maintenance lookups');
    }
  }

  function setStatusMaintField<K extends keyof MaintForm>(key: K, value: MaintForm[K]) {
    setStatusMaintForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Re-read the damage list so Fixed / out-for-repair badges and buttons stay truthful. */
  async function refreshDamages() {
    try {
      const r = await damagesApi.getByAsset(assetId);
      setDamages(r.data);
    } catch {
      /* The tab keeps showing what it had; the next open refetches. */
    }
  }

  /** Status History is only fetched lazily, so a status change has to invalidate it. */
  async function refreshStatusHistory() {
    try {
      const r = await assetsApi.getStatusHistory(assetId);
      setStatusHistory(r.data as StatusHistoryItem[]);
    } catch {
      /* Non-critical: the tab refetches when opened. */
    }
  }

  function makeDefaultStatusChangeForm(cs: Contact[] = contacts, ccy: Currency[] = currencies): StatusChangeForm {
    const today = new Date().toISOString().slice(0, 10);
    return {
      statusDate: today,
      statusDesc: '',
      statusContactID: cs[0]?.contactID ?? '',
      statusSalePrice: '',
      statusSaleCurCode: defaultCurCode(ccy),
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
    if (asset.statusID === 10 || asset.statusID === 8) return;

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
    if (readOnly || !asset || asset.statusID === 10 || asset.statusID === 8) return;
    setTransferModalOpen(true);
  };

  async function handleStatusMaintenanceSubmit(e: FormEvent) {
    e.preventDefault();
    if (!asset || readOnly) return;
    if (statusMaintForm.fromDate && statusMaintForm.toDate && statusMaintForm.fromDate > statusMaintForm.toDate) {
      toast.error('From Date must be before or equal to To Date');
      return;
    }
    if (!statusMaintForm.damageID) {
      toast.error('Select the damage being repaired');
      return;
    }

    setSavingStatusMaintenance(true);
    try {
      const damageID = statusMaintForm.damageID;
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

      // POST /maintenances already moves the asset to Under Maintenance and writes the
      // status-history row itself. This used to follow it with assetsApi.updateStatus(8),
      // which logged the same change a second time — that is why Status History showed
      // "Under Maintenance" twice per trip. The status is reflected locally instead.
      const createdMaintenance = await maintenancesApi.create({ assetID: assetId, ...statusMaintForm, damageID, attID });
      setMaintenances((prev) => [createdMaintenance.data as Maintenance, ...prev]);

      setAsset((a) => a
        ? { ...a, statusID: 8, statusName: statuses.find((s) => s.statusID === 8)?.status ?? 'Under Maintenance' }
        : a);
      // The damage is now out for repair, so its row must lose its send button.
      void refreshDamages();
      void refreshStatusHistory();
      setStatusMaintenanceModalOpen(false);
      setStatusMaintAttachmentFile(null);
      setMaintenanceDamage(null);
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
    if (asset.statusID === 10 || asset.statusID === 8) return;
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
    if (asset.statusID === 10 || asset.statusID === 8) return;
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
    if (asset.statusID === 10 || asset.statusID === 8) return;
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
    if (tab === 'activity' && auditLog.length === 0)
      assetsApi.getAuditLog(assetId)
        .then((r) => setAuditLog(r.data as AssetAuditEntry[]))
        .catch((err) => handleApiError(err, 'Failed to load activity'));
    if (tab === 'depreciation' && depHistory.length === 0)
      assetsApi.getDepreciationHistory(assetId).then((r) => setDepHistory(r.data as DepreciationHistoryItem[]));
    if (tab === 'inventory' && invHistory.length === 0)
      assetsApi.getInventoryHistory(assetId).then((r) => setInvHistory(r.data as InventoryHistoryItem[]));
    if (tab === 'status' && statusHistory.length === 0)
      assetsApi.getStatusHistory(assetId)
        .then((r) => setStatusHistory(r.data as StatusHistoryItem[]))
        .catch((err) => handleApiError(err, 'Failed to load status history'));
    if (tab === 'warranty' && warranties.length === 0)
      warrantiesApi.getByAsset(assetId).then((r) => setWarranties(r.data as Warranty[]));
    if (tab === 'damage') {
      if (damages.length === 0)
        damagesApi.getByAsset(assetId)
          .then((r) => setDamages(r.data))
          .catch((err) => handleApiError(err, 'Failed to load damage records'));
      // Every damage row's Maintenance button needs this, so it's loaded with the tab
      // rather than lazily per row.
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
    if (tab === 'attachments' && attachments.length === 0)
      attachmentsApi.getGeneralByAsset(assetId).then((r) => setAttachments(r.data as Attachment[]));
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
    { key: 'activity', label: 'Activity' },
    { key: 'depreciation', label: 'Depreciation' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'status', label: 'Status History' },
    { key: 'damage', label: 'Damage' },
    { key: 'warranty', label: 'Warranty' },
    { key: 'attachments', label: 'Attachments' },
    { key: 'remark', label: 'Remark' },
  ];
  const isUnderInventory = asset.statusID === 10;
  const isUnderMaintenance = asset.statusID === 8;
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
              <div className="font-code text-[16px] sm:text-[18px] text-navy-500 font-bold mb-0.5">{asset.assetCode}</div>
              <h1 className="text-[18px] sm:text-[20px] text-ink-800 leading-tight break-words">
                {asset.category && <span className="font-extrabold">{asset.category}{' '}</span>}
                <span className={asset.category ? 'font-medium text-ink-600' : 'font-extrabold'}>{asset.assetDesc}</span>
              </h1>
              {asset.inServiceDate && (
                <span className="text-[11px] text-ink-300 mt-1 block">
                  In service: {fmtDate(asset.inServiceDate)}
                </span>
              )}
            </div>
          </div>

          {/* items-end, not items-center: the "Status" label makes its column ~17px taller than
              the bare buttons, so centring would sit the dropdown lower than the rest. Every
              control is HEADER_CTRL tall, so aligning bottoms lines all five up exactly. */}
          <div className="flex flex-wrap items-end gap-3 shrink-0">
            {/* Status dropdown */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300">Status</span>
              {isUnderInventory || isUnderMaintenance ? (
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={asset.statusName ?? (isUnderInventory ? 'Under Inventory' : 'Under Maintenance')} />
                  <span className="text-[10px] text-amber-600 font-medium">(locked)</span>
                </div>
              ) : readOnly ? (
                <StatusBadge status={asset.statusName ?? (asset.statusID != null ? `Status ${asset.statusID}` : 'Unknown')} />
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="relative inline-flex items-center" data-status-menu-root="true">
                    <button
                      disabled={changingStatus}
                      type="button"
                      onClick={() => {
                        if (changingStatus) return;
                        setOpenStatusMenu((prev) => !prev);
                      }}
                      className={clsx(
                        HEADER_CTRL,
                        'inline-flex items-center gap-2 min-w-[180px] rounded-lg border px-4 text-sm font-medium',
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
                          // 8 (Under Maintenance) is reachable only via a damage's "Send to
                          // Maintenance" button now, not from this menu.
                          .filter((s) => ![5, 8, 9, 10].includes(s.statusID))
                          .sort(byStatusMenuOrder)
                          .map((s) => (
                            <div key={s.statusID}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (asset.statusID === s.statusID) {
                                    setOpenStatusMenu(false);
                                    return;
                                  }
                                  setOpenStatusMenu(false);
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
                              {STATUS_MENU_GROUP_END.has(s.statusID) && <div className="my-1 h-px bg-pearl-200" />}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveStatus}
                    disabled={changingStatus || asset.statusID === 0 || asset.statusID === 12 || asset.statusID === 13 || asset.statusID === 8}
                    className={clsx(HEADER_CTRL, 'btn-danger shrink-0 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed')}
                  >
                    Remove Status
                  </button>
                </div>
              )}
            </div>

            <div className={clsx(HEADER_CTRL, 'w-px bg-pearl-200')} />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBarcodeModal(true)}
                disabled={!asset.barcodeNumber}
                title={asset.barcodeNumber ? 'Print barcode label' : 'No barcode number assigned'}
                className={clsx(HEADER_CTRL, 'btn-secondary disabled:opacity-40 disabled:cursor-not-allowed')}
              >
                <IconBarcode />
                Print Barcode
              </button>
            </div>

            {!readOnly && (
              <>
                <div className={clsx(HEADER_CTRL, 'w-px bg-pearl-200')} />

                <div className="flex items-center gap-2">
                  {isUnderInventory ? (
                    <button
                      type="button"
                      disabled
                      title="Edit is disabled while asset is under inventory"
                      className={clsx(HEADER_CTRL, 'btn-secondary no-underline opacity-50 cursor-not-allowed')}
                    >
                      <IconEdit />
                      Edit
                    </button>
                  ) : (
                    <Link
                      to={`/assets/${assetId}/edit`}
                      state={{ from: backToListUrl, ref: 'detail' }}
                      className={clsx(HEADER_CTRL, 'btn-secondary no-underline')}
                    >
                      <IconEdit />
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={isUnderInventory}
                    title={isUnderInventory ? 'Delete is disabled while asset is under inventory' : undefined}
                    className={clsx(HEADER_CTRL, 'btn-danger', isUnderInventory && 'opacity-50 cursor-not-allowed')}
                  >
                    <IconTrash />
                    Delete
                  </button>
                </div>
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
        {tab === 'activity' && <AuditTimeline entries={auditLog} />}
        {tab === 'depreciation' && <DepreciationTab data={depHistory} />}
        {tab === 'inventory' && (
          <SimpleTable
            data={invHistory.map((r) => ({ ...r, createdDate: fmtDate(r.createdDate) }))}
            columns={['inventoryID', 'isAvailable', 'location', 'relocated', 'createdDate']}
          />
        )}
        {tab === 'status' && (
          // StatusDate is a date-only column, so the Status Date cell shows CreatedByDateTime —
          // the one field carrying both the day and the clock time of the change.
          //
          // Newest first. Migration 22 makes AT.stpStatusHistoryS return it in this order;
          // sorting here as well keeps the tab correct against a database that has not had
          // that migration applied, and stops the order being whatever the query plan felt
          // like. statusHistID breaks the tie when two changes share a timestamp to the
          // second — which the create-then-activate pair on a new asset always does.
          <SimpleTable
            data={[...statusHistory]
              .sort((a, b) =>
                (Date.parse(b.createdByDateTime) - Date.parse(a.createdByDateTime))
                || (b.statusHistID - a.statusHistID))
              .map((r) => ({ ...r, statusDate: fmtDateTime(r.createdByDateTime) }))}
            columns={['statusDate', 'statusName', 'statusDesc', 'contactName', 'statusSalePrice', 'statusSaleCurCode', 'createdByFullName']}
          />
        )}
        {tab === 'warranty' && (
          <WarrantyTab readOnly={readOnly} assetId={assetId} items={warranties} onChange={setWarranties} />
        )}
        {tab === 'damage' && (
          <DamageTab
            readOnly={readOnly}
            assetId={assetId}
            items={damages}
            onChange={setDamages}
            assetStatusID={asset?.statusID ?? null}
            // Already under maintenance (8) or locked by an inventory (10): the status
            // cannot move, so offering the button would only produce a rejection.
            canSendToMaintenance={asset?.statusID !== 8 && asset?.statusID !== 10}
            onSendToMaintenance={(d) => void openUnderMaintenanceModal(d.damageID)}
            maintenances={maintenances}
            onMaintenancesChange={setMaintenances}
            contacts={contacts}
            currencies={currencies}
            onAssetStatusChange={(sid) => setAsset(a => a ? { ...a, statusID: sid, statusName: statuses.find((s) => s.statusID === sid)?.status ?? 'Active' } : a)}
            onMaintenanceReturned={() => { void refreshDamages(); void refreshStatusHistory(); }}
          />
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
            locationID: asset.locationID,
            locDetailID: asset.locDetailID,
          }}
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          onTransferred={(newEmpID) => {
            // employeeName is resolved server-side, so it has to be cleared here too —
            // keeping it would show the previous employee's name beside the new id until
            // the refetch lands. The company and location move as well, hence the refetch
            // rather than a field-by-field patch.
            setAsset((prev) =>
              prev ? { ...prev, hrEmpIDUsedBy: newEmpID, employeeName: null } : prev
            );
            assetsApi.get(assetId)
              .then((r) => setAsset(r.data as Asset))
              .catch((err) => handleApiError(err, 'Transferred, but the asset could not be reloaded'));
            // Refresh status history
            assetsApi.getStatusHistory(assetId)
              .then((r) => setStatusHistory(r.data as StatusHistoryItem[]))
              .catch(() => {});
          }}
        />
      )}

      {/* Send to maintenance. Always repairs the one damage whose row this was opened
          from — chosen there, so it is shown here as info rather than a picker. */}
      {!readOnly && statusMaintenanceModalOpen && (
        <Modal title="Send to Maintenance" onClose={() => setStatusMaintenanceModalOpen(false)}>
          <form onSubmit={handleStatusMaintenanceSubmit}>
            <div className="mb-4 rounded-xl border border-navy-100 bg-navy-50/40 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-600 mb-2">
                Damage being repaired
              </div>
              <div className="text-[13px] text-ink-800 font-medium">
                {maintenanceDamage ? `${fmtDate(maintenanceDamage.damageDate)} — ${maintenanceDamage.damageDesc}` : '—'}
              </div>
            </div>
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
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-300 mb-1">{label}</div>
      <div className={clsx('text-[13px] text-ink-800 font-medium', mono && 'font-code text-navy-600')}>
        {String(value ?? '—')}
      </div>
    </div>
  );
}

function CardSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <span className="w-1 h-4 rounded-full bg-navy-500" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">{children}</span>
    </div>
  );
}

function AssetInfo({ asset }: { asset: Asset }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Identification card */}
      <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-5">
        <CardSectionTitle>Identification</CardSectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <InfoField
            label="Company"
            value={asset.companyName ? `${asset.countryID ?? ''}-${asset.companyName}` : null}
          />
          <InfoField label="Country" value={asset.country} />
          <InfoField
            label="Used By"
            value={
              asset.employeeName
                ? asset.hrEmpIDUsedBy
                  ? `${asset.employeeName} – ${asset.hrEmpIDUsedBy}`
                  : asset.empIDUsedBy
                    ? `${asset.employeeName} – ${asset.empIDUsedBy}`
                    : asset.employeeName
                : asset.hrEmpIDUsedBy
                  ?? asset.empIDUsedBy?.toString()
                  // Shared asset with nobody responsible for it — say so instead of showing a dash.
                  ?? (asset.usedByNotMandatory ? 'Not required' : null)
            }
          />
          <InfoField label="Owner" value={asset.ownerTypeDesc} />
          <InfoField label="Brand" value={asset.brandDesc} />
          <InfoField label="Model" value={asset.model} />
          <InfoField label="Barcode" value={asset.barcodeNumber} mono />
          <InfoField label="Serial Number" value={asset.serialNumber} mono />
          <InfoField label="Donation" value={asset.donation ? 'Yes' : 'No'} />
          <InfoField label="Owner Description" value={asset.ownerDesc} />
        </div>
      </div>

      {/* Financial card */}
      <div className="bg-white rounded-xl border border-pearl-200 shadow-card p-5">
        <CardSectionTitle>Financial</CardSectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <InfoField label="Purchase Price" value={`${asset.purchaseCurCode ?? ''} ${asset.purchasePrice ?? '—'}`} />
          <InfoField label="Purchase Date" value={fmtDate(asset.purchaseDate)} />
          <InfoField label="Purchase Order No" value={asset.purchaseOrderNo} mono />
          <InfoField label="Invoice No" value={asset.invoiceNo} mono />
          <InfoField label="Invoice Date" value={fmtDate(asset.invoiceDate)} />
          <InfoField label="Accounting Entry Date" value={fmtDate(asset.accountingEntryDate)} />
          <InfoField label="Accounting JV No" value={asset.accountingEntryJVNo} mono />
        </div>
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
          <div className="text-[12px] text-ink-600">{fmtDate(row.depreciationDate)}</div>
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
// ─── Damage picker ───────────────────────────────────────────────────────────

/**
 * Small status label — damage open/fixed, maintenance out/returned. The leading dot
 * carries the colour, so the state is readable at a glance down a column and doesn't
 * depend on colour alone.
 */
function Pill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'grey'; children: React.ReactNode }) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap',
      tone === 'green' && 'bg-success-bg text-success border-success-light',
      tone === 'amber' && 'bg-warning-bg text-warning border-warning-light',
      tone === 'red' && 'bg-danger-bg text-danger border-danger-light',
      tone === 'grey' && 'bg-pearl-100 text-ink-400 border-pearl-200',
    )}>
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full shrink-0',
        tone === 'green' && 'bg-success',
        tone === 'amber' && 'bg-warning',
        tone === 'red' && 'bg-danger',
        tone === 'grey' && 'bg-ink-200',
      )} />
      {children}
    </span>
  );
}

/**
 * The fixed / not-fixed decision on the return modal. A pair of large cards rather than a
 * checkbox: this is the moment that closes a damage or sends it back out, and it deserves
 * to be read before it is clicked.
 */
function FixedChoice({
  selected, tone, title, detail, onClick,
}: {
  selected: boolean;
  tone: 'green' | 'amber';
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'text-left rounded-xl border p-3.5 transition-all cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-navy-500/20',
        selected
          ? tone === 'green'
            ? 'border-success bg-success-bg shadow-card'
            : 'border-warning bg-warning-bg shadow-card'
          : 'border-pearl-200 bg-white hover:border-pearl-300 hover:bg-pearl-50'
      )}
    >
      <span className="flex items-center gap-2">
        <span className={clsx(
          'inline-flex items-center justify-center w-4 h-4 rounded-full border-2 shrink-0',
          selected
            ? tone === 'green' ? 'border-success' : 'border-warning'
            : 'border-ink-200'
        )}>
          {selected && <span className={clsx('block w-2 h-2 rounded-full', tone === 'green' ? 'bg-success' : 'bg-warning')} />}
        </span>
        <span className={clsx(
          'text-[13px] font-semibold',
          selected ? (tone === 'green' ? 'text-success' : 'text-warning') : 'text-ink-700'
        )}>
          {title}
        </span>
      </span>
      <span className="block text-[11px] text-ink-400 mt-1.5 leading-snug">{detail}</span>
    </button>
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

function Modal({ title, onClose, children, width = 'max-w-lg', contentClassName }: { title: string; onClose: () => void; children: React.ReactNode; width?: string; contentClassName?: string }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-card-lg w-full ${width} border border-pearl-200 flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center px-6 py-4 border-b border-pearl-200 shrink-0">
          <h3 className="text-[14px] font-semibold text-ink-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-ink-300 hover:text-ink-700 border-none bg-transparent cursor-pointer p-1.5 rounded-md hover:bg-pearl-100 transition-colors"
          >
            <IconClose />
          </button>
        </div>
        {/* min-h-0 overrides the flex item's default min-height:auto, which would
            otherwise refuse to shrink below the content's natural height and defeat
            max-h-[90vh] above — this is what makes tall forms scroll instead of running
            off the screen. */}
        <div className={clsx('px-6 py-5 overflow-y-auto min-h-0', contentClassName)}>{children}</div>
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

// ─── Damage Maintenance Modal ────────────────────────────────────────────────

/**
 * Maintenance history for one damage, opened from the Damage tab's "Maintenance" button.
 * There is no standalone Maintenance tab any more — a maintenance is always reached
 * through the damage it repairs — so this is the one place left to edit, return, or
 * delete those records. It cannot create one: creation happens from the damage row's
 * "Send to Maintenance" button, which is what guarantees a damage never picks up a
 * second live maintenance record.
 */
function DamageMaintenanceModal({
  readOnly, assetId, damage, assetStatusID, onAssetStatusChange, items, contacts, currencies, onChange, onReturned, onClose,
}: {
  readOnly: boolean;
  assetId: number;
  damage: Damage;
  assetStatusID: number | null;
  onAssetStatusChange: (sid: number) => void;
  /** Every maintenance record for the asset — filtered down to this damage below. */
  items: Maintenance[];
  contacts: Contact[];
  currencies: Currency[];
  onChange: (v: Maintenance[]) => void;
  /**
   * Called whenever a damage's result changes — by returning a maintenance, or by
   * correcting that result in Edit Maintenance — since the Damage tab has to be re-read.
   */
  onReturned: () => void;
  onClose: () => void;
}) {
  const records = items.filter((m) => m.damageID === damage.damageID);

  const { confirm, dialog: confirmDialog } = useConfirm();
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [form, setForm] = useState<MaintForm>({ damageID: damage.damageID, attID: null, fromDate: new Date().toISOString().slice(0, 10), toDate: '', supplierContactID: 0, cost: 0, curCode: 'USD', remark: '' });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNames, setAttachmentNames] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  // The maintenance being returned, plus what the supplier did and whether it worked.
  // `fixed: null` forces an explicit choice — defaulting either way would quietly put a
  // wrong answer into the damage record.
  const [returnTarget, setReturnTarget] = useState<Maintenance | null>(null);
  const [returnForm, setReturnForm] = useState<{ workPerformed: string; fixed: boolean | null }>({ workPerformed: '', fixed: null });
  const [returning, setReturning] = useState(false);
  // The damage's own fixed flag, editable so the answer given at return time can be
  // corrected. Kept out of MaintForm because it belongs to the damage, not the
  // maintenance, and null while editing a record whose damage is not settled yet.
  const [editDamageFixed, setEditDamageFixed] = useState<boolean | null>(null);

  useEffect(() => {
    const linkedIds = new Set(
      items
        .filter((m) => m.damageID === damage.damageID)
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
  }, [assetId, items, damage.damageID]);

  function openReturn(m: Maintenance) {
    if (readOnly) return;
    setReturnTarget(m);
    setReturnForm({ workPerformed: m.workPerformed ?? '', fixed: null });
  }

  async function handleReturnSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly || !returnTarget || returnForm.fixed === null) return;

    setReturning(true);
    try {
      const r = await maintenancesApi.returnFromMaintenance(returnTarget.maintID, {
        workPerformed: returnForm.workPerformed.trim() || null,
        fixed: returnForm.fixed,
      });
      // The endpoint returns the settled row, so the table updates in place — no refetch.
      onChange(items.map((i) => (i.maintID === returnTarget.maintID ? r.data : i)));
      onAssetStatusChange(0);
      onReturned();
      setReturnTarget(null);
      toast.success(returnForm.fixed
        ? 'Returned — damage marked fixed'
        : 'Returned — damage still open');
    } catch (err) { handleApiError(err, 'Failed to update status'); }
    finally { setReturning(false); }
  }

  function openEdit(item: Maintenance) {
    if (readOnly) return;
    setEditing(item);
    setForm({
      damageID: item.damageID, attID: item.attID ?? null, fromDate: item.fromDate, toDate: item.toDate,
      supplierContactID: item.supplierContactID, cost: item.cost, curCode: item.curCode,
      remark: item.remark ?? '', workPerformed: item.workPerformed ?? '',
    });
    // Only a returned maintenance has a damage result to correct.
    setEditDamageFixed(item.returnedDate == null ? null : item.damageFixed ?? false);
    setAttachmentFile(null);
  }
  function closeEdit() { setEditing(null); setAttachmentFile(null); setEditDamageFixed(null); }
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

      if (editing) {
        const fixedChanged = editDamageFixed !== null && editDamageFixed !== (editing.damageFixed ?? false);
        const r = await maintenancesApi.update(editing.maintID, {
          assetID: assetId, maintID: editing.maintID, ...form, attID,
          // Omitted entirely when there is nothing to correct, so an ordinary edit cannot
          // touch the damage.
          ...(editDamageFixed !== null ? { damageFixed: editDamageFixed } : {}),
          original_MaintID: editing.maintID, original_AssetID: editing.assetID,
          isNull_AttID: editing.attID == null ? 1 : 0, original_AttID: editing.attID ?? null,
          original_FromDate: editing.fromDate, original_ToDate: editing.toDate,
          original_SupplierContactID: editing.supplierContactID, original_Cost: editing.cost,
          original_CurCode: editing.curCode, isNull_Remark: editing.remark == null ? 1 : 0,
          original_Remark: editing.remark ?? null,
        });

        if (fixedChanged) {
          // Fixed lives on the damage, and every maintenance for that damage joins it in
          // for its pill, so patching this one row would leave the siblings stale.
          const all = await maintenancesApi.getByAsset(assetId);
          onChange(all.data as Maintenance[]);
          onReturned();
          toast.success(editDamageFixed ? 'Updated — damage marked fixed' : 'Updated — damage left open');
        } else {
          onChange(items.map((i) => i.maintID === editing.maintID ? r.data as Maintenance : i));
          toast.success('Maintenance updated');
        }
      }
      closeEdit();
    } catch (err) { handleApiError(err, 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: Maintenance) {
    if (readOnly) return;
    const ok = await confirm('This maintenance record will be permanently removed.', { title: 'Delete Maintenance?' });
    if (!ok) return;
    try {
      const r = await maintenancesApi.delete(item.maintID, {
        assetID: item.assetID, attID: item.attID ?? null, fromDate: item.fromDate, toDate: item.toDate,
        supplierContactID: item.supplierContactID, cost: item.cost,
        curCode: item.curCode, remark: item.remark ?? null,
      });
      onChange(items.filter((i) => i.maintID !== item.maintID));
      // Null means this record wasn't the one holding the asset "Under Maintenance"
      // (already returned, a sibling maintenance is still open, etc.) — see the API.
      if (r.data.revertedStatusID != null) onAssetStatusChange(r.data.revertedStatusID);
      // Deleting can reopen the damage (if this was its only/last maintenance) or leave
      // it under maintenance (a sibling record still open) — either way the damage's
      // fixed/underMaintenance flags are stale until re-read, same as return/edit.
      onReturned();
      toast.success('Deleted');
    } catch (err) { handleApiError(err, 'Delete failed'); }
  }

  const contactName = (id: number) => contacts.find((c) => c.contactID === id)?.contactName ?? String(id);
  // A later maintenance on the same damage is still open, so that attempt owns the result
  // and this one must not overwrite it. Mirrors the rule the API enforces, so the choice is
  // hidden rather than offered and then rejected.
  const damageSentOutAgain = editing != null && items.some(
    (i) => i.damageID === editing.damageID && i.maintID !== editing.maintID && i.returnedDate == null
  );
  // Fixed tracks throughout, for the same reason as DAMAGE_COLS: each row is its own grid
  // container, so an `auto` column would size per row and break vertical alignment.
  const cols = 'grid-cols-[130px_1fr_1fr_1.6fr_1fr_2fr_2fr_170px_265px]';

  return (
    <Modal
      title="Maintenance History"
      onClose={onClose}
      width="max-w-7xl"
      contentClassName="max-h-[80vh]"
    >
      {confirmDialog}

      <div className="rounded-lg border border-pearl-200 bg-pearl-50 px-4 py-3 mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">Damage</div>
          <div className="text-[13px] text-ink-800 font-medium break-words">{fmtDate(damage.damageDate)} — {damage.damageDesc}</div>
        </div>
        {damage.fixed
          ? <Pill tone="green">Fixed</Pill>
          : damage.underMaintenance
            ? <Pill tone="amber">Out for repair</Pill>
            : <Pill tone="red">Open</Pill>}
      </div>

      {records.length === 0 ? (
        <EmptyState message="No maintenance records for this damage yet." />
      ) : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className={clsx('grid gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[1250px]', cols)}>
            {['Status', 'From', 'To', 'Supplier', 'Cost', 'Work Performed', 'Remark', 'Attachment', 'Actions'].map((h, i, arr) => (
              <div key={i} className={clsx(
                'text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300',
                i === arr.length - 1 && 'text-right'
              )}>{h}</div>
            ))}
          </div>
          {records.map((m, i) => {
            const open = m.returnedDate == null;
            return (
              <div key={m.maintID} className={clsx(
                'grid gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[1250px]', cols,
                i < records.length - 1 && 'border-b border-pearl-200'
              )}>
                <div>
                  {open
                    ? <Pill tone="amber">Out for repair</Pill>
                    : m.damageFixed
                      ? <Pill tone="green">Fixed {fmtDate(m.returnedDate)}</Pill>
                      : <Pill tone="red">Not fixed {fmtDate(m.returnedDate)}</Pill>}
                </div>
                <div className="text-[12px] text-ink-700">{fmtDate(m.fromDate)}</div>
                <div className="text-[12px] text-ink-700">{fmtDate(m.toDate)}</div>
                <div className="text-[12px] text-ink-700 truncate">{contactName(m.supplierContactID)}</div>
                <div className="num-cost text-[12px] font-medium whitespace-nowrap">{m.cost} <span className="font-code text-ink-400">{m.curCode}</span></div>
                <div className="text-[12px] text-ink-600 break-words">{m.workPerformed || <span className="text-ink-300">—</span>}</div>
                <div className="text-[12px] text-ink-400 break-words">{m.remark || '—'}</div>
                <div>
                  {m.attID ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ActionBtn onClick={() => downloadAttachmentById(m.attID!, `maintenance-${m.maintID}-attachment`)}>Download</ActionBtn>
                      <ActionBtn onClick={() => previewAttachmentById(m.attID!)}>Preview</ActionBtn>
                    </div>
                  ) : <span className="text-[12px] text-ink-300">—</span>}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {/* Driven by this record's own ReturnedDate rather than "highest id wins",
                      which returned the wrong row whenever an older maintenance was still
                      open. Leads the group because it's the action a row usually wants. */}
                  {!readOnly && open && assetStatusID === 8 && (
                    <button
                      type="button"
                      onClick={() => openReturn(m)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded border bg-success-bg text-success border-success-light hover:bg-success-light transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <IconWrench />
                      Mark Returned
                    </button>
                  )}
                  {!readOnly && <ActionBtn onClick={() => openEdit(m)}>Edit</ActionBtn>}
                  {!readOnly && <ActionBtn danger onClick={() => handleDelete(m)}>Delete</ActionBtn>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!readOnly && returnTarget && (
        <Modal title="Return From Maintenance" onClose={() => setReturnTarget(null)}>
          <form onSubmit={handleReturnSubmit}>
            <div className="rounded-lg border border-pearl-200 bg-pearl-50 px-4 py-3 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">Damage</div>
              <div className="text-[13px] text-ink-800 font-medium">{returnTarget.damageDesc ?? '—'}</div>
            </div>

            <FormRow label="Work Performed">
              <textarea
                className={clsx(inp, 'min-h-[92px] resize-y')}
                value={returnForm.workPerformed}
                onChange={(e) => setReturnForm((p) => ({ ...p, workPerformed: e.target.value }))}
                maxLength={500}
                placeholder="What the supplier actually did…"
              />
            </FormRow>

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400 mb-2">
                Is the damage fixed? *
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FixedChoice
                  selected={returnForm.fixed === true}
                  tone="green"
                  title="Fixed"
                  detail="Closes the damage. It won't be offered for maintenance again."
                  onClick={() => setReturnForm((p) => ({ ...p, fixed: true }))}
                />
                <FixedChoice
                  selected={returnForm.fixed === false}
                  tone="amber"
                  title="Not fixed"
                  detail="Leaves the damage open so it can be sent out again."
                  onClick={() => setReturnForm((p) => ({ ...p, fixed: false }))}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-5">
              <button type="submit" disabled={returning || returnForm.fixed === null} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {returning ? 'Saving…' : 'Confirm Return'}
              </button>
              <button type="button" onClick={() => setReturnTarget(null)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {!readOnly && editing && (
        <Modal title="Edit Maintenance" onClose={closeEdit}>
          <form onSubmit={handleSubmit}>
            {/* Read-only: re-pointing a maintenance at a different fault would rewrite
                history. Fix the damage text on the Damage tab instead. */}
            <div className="rounded-lg border border-pearl-200 bg-pearl-50 px-4 py-3 mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">Damage</div>
              <div className="text-[13px] text-ink-800 font-medium">{editing.damageDesc ?? '—'}</div>
            </div>

            {/* The damage's result. Editable here so a wrong answer at return time can be
                corrected without sending the asset out for repair a second time. */}
            {editing.returnedDate == null ? (
              <div className="rounded-lg border border-pearl-200 bg-white px-4 py-3 mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">Damage Result</div>
                <div className="text-[11px] text-ink-400 leading-snug">
                  Still out for repair — use <span className="font-semibold text-ink-600">Mark Returned</span> to record whether the damage was fixed.
                </div>
              </div>
            ) : damageSentOutAgain ? (
              <div className="rounded-lg border border-pearl-200 bg-white px-4 py-3 mb-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-300 mb-1">Damage Result</div>
                <div className="text-[11px] text-ink-400 leading-snug">
                  This damage is out for repair again, so the newer maintenance record carries its result.
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400 mb-2">
                  Is the damage fixed?
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FixedChoice
                    selected={editDamageFixed === true}
                    tone="green"
                    title="Fixed"
                    detail="Closes the damage. It won't be offered for maintenance again."
                    onClick={() => setEditDamageFixed(true)}
                  />
                  <FixedChoice
                    selected={editDamageFixed === false}
                    tone="amber"
                    title="Not fixed"
                    detail="Leaves the damage open so it can be sent out again."
                    onClick={() => setEditDamageFixed(false)}
                  />
                </div>
              </div>
            )}

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
            <FormRow label="Work Performed">
              <textarea
                className={clsx(inp, 'min-h-[80px] resize-y')}
                value={form.workPerformed ?? ''}
                onChange={(e) => setF('workPerformed', e.target.value)}
                maxLength={500}
                placeholder="Normally filled in when the asset is marked returned."
              />
            </FormRow>
            <FormRow label="Attachment">
              <input
                className={inp}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              />
              {form.attID && !attachmentFile && (
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
            <ModalActions saving={saving} onCancel={closeEdit} />
          </form>
        </Modal>
      )}
    </Modal>
  );
}

// ─── Warranty Tab ─────────────────────────────────────────────────────────────

type WarrForm = Omit<Warranty, 'warntID' | 'assetID'>;

function WarrantyTab({ readOnly, assetId, items, onChange }: { readOnly: boolean; assetId: number; items: Warranty[]; onChange: (v: Warranty[]) => void }) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Warranty | null>(null);
  const [form, setForm] = useState<WarrForm>({ attID: null, warrantyDesc: '', fromDate: new Date().toISOString().slice(0, 10), toDate: '', remark: '' });
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

  function openAdd() { if (readOnly) return; setForm({ attID: null, warrantyDesc: '', fromDate: new Date().toISOString().slice(0, 10), toDate: '', remark: '' }); setAttachmentFile(null); setModal('add'); }
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
          <div className="grid grid-cols-[2fr_1fr_1fr_2fr_190px_auto] gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[840px]">
            {['Description', 'From Date', 'To Date', 'Remark', 'Attachment', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">{h}</div>
            ))}
          </div>
          {items.map((w, i) => (
            <div key={w.warntID} className={clsx(
              'grid grid-cols-[2fr_1fr_1fr_2fr_190px_auto] gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[840px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-800 font-medium truncate">{w.warrantyDesc}</div>
              <div className="text-[12px] text-ink-600">{fmtDate(w.fromDate)}</div>
              <div className="text-[12px] text-ink-600">{fmtDate(w.toDate)}</div>
              <div className="text-[12px] text-ink-400 truncate">{w.remark ?? '—'}</div>
              <div>
                {w.attID ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActionBtn onClick={() => downloadAttachmentById(w.attID!, `warranty-${w.warntID}-attachment`)}>Download</ActionBtn>
                    <ActionBtn onClick={() => previewAttachmentById(w.attID!)}>Preview</ActionBtn>
                  </div>
                ) : <span className="text-[12px] text-ink-300">—</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
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

/**
 * Every row here is its own grid container, so the tracks only line up if they are all
 * fixed. The last column used to be `auto`, which sized to its own row's buttons — a row
 * with Send to Maintenance laid out differently from one without, leaving the Status
 * pills and the header at three different x positions. Fixed width, contents right-aligned.
 */
const DAMAGE_COLS = 'grid-cols-[120px_minmax(180px,1fr)_150px_420px]';

function DamageTab({
  readOnly, assetId, items, onChange, canSendToMaintenance, onSendToMaintenance,
  assetStatusID, maintenances, onMaintenancesChange, contacts, currencies, onAssetStatusChange, onMaintenanceReturned,
}: {
  readOnly: boolean;
  assetId: number;
  items: Damage[];
  onChange: (v: Damage[]) => void;
  /** False while the asset is already under maintenance or locked by an inventory. */
  canSendToMaintenance: boolean;
  onSendToMaintenance: (damage: Damage) => void;
  assetStatusID: number | null;
  /** Every maintenance record for the asset — the history modal filters to one damage. */
  maintenances: Maintenance[];
  onMaintenancesChange: (v: Maintenance[]) => void;
  contacts: Contact[];
  currencies: Currency[];
  onAssetStatusChange: (sid: number) => void;
  onMaintenanceReturned: () => void;
}) {
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Damage | null>(null);
  const [form, setForm] = useState<DamageForm>({ damageDate: '', damageDesc: '' });
  const [saving, setSaving] = useState(false);
  // Stored as an ID rather than the Damage object itself, so the modal always reflects
  // the latest fixed/underMaintenance flags after a refresh (e.g. deleting a maintenance
  // record) instead of a snapshot taken when the button was clicked.
  const [historyTargetId, setHistoryTargetId] = useState<number | null>(null);
  const historyTarget = historyTargetId != null ? items.find((d) => d.damageID === historyTargetId) ?? null : null;
  // The asset is already out for repair for some damage — a new fault cannot be logged
  // until it returns, mirroring the check the API makes on create.
  const underRepair = assetStatusID === 8;

  function openAdd() {
    if (readOnly || underRepair) return;
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
          <button
            onClick={openAdd}
            disabled={underRepair}
            title={underRepair ? 'Cannot add a damage while the asset is under maintenance' : undefined}
            className={clsx('btn-primary', underRepair && 'opacity-50 cursor-not-allowed')}
          >
            <IconPlus /> Add Damage
          </button>
        </div>
      )}

      {items.length === 0 ? <EmptyState message="No damage records." /> : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-x-auto">
          <div className={clsx(DAMAGE_COLS, 'grid gap-4 px-5 py-2.5 bg-pearl-100 border-b border-pearl-200 min-w-[990px]')}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Date</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Description</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300">Status</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-300 text-right">Actions</div>
          </div>
          {items.map((d, i) => (
            <div key={d.damageID} className={clsx(
              DAMAGE_COLS,
              'grid gap-4 px-5 py-3 items-center hover:bg-pearl-50 transition-colors min-w-[990px]',
              i < items.length - 1 && 'border-b border-pearl-200'
            )}>
              <div className="text-[12px] text-ink-600 whitespace-nowrap">{fmtDate(d.damageDate)}</div>
              <div className="text-[12px] text-ink-800 font-medium break-words">{d.damageDesc}</div>
              <div>
                {d.fixed
                  ? <Pill tone="green">Fixed</Pill>
                  : d.underMaintenance
                    ? <Pill tone="amber">Out for repair</Pill>
                    : <Pill tone="red">Open</Pill>}
              </div>
              {/* Right-aligned against a fixed track, so Edit/Delete land on the same
                  column whether or not the row also offers Send to Maintenance. */}
              <div className="flex items-center justify-end gap-1.5">
                {/* Offered only when the API would actually accept it: damage open, not
                    already out for repair, and the asset free to change status. */}
                {!readOnly && !d.fixed && !d.underMaintenance && canSendToMaintenance && (
                  <button
                    type="button"
                    onClick={() => onSendToMaintenance(d)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded border bg-warning-bg text-warning border-warning-light hover:bg-warning-light transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <IconWrench />
                    Send to Maintenance
                  </button>
                )}
                <ActionBtn onClick={() => setHistoryTargetId(d.damageID)}>Maintenance</ActionBtn>
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

      {historyTarget && (
        <DamageMaintenanceModal
          readOnly={readOnly}
          assetId={assetId}
          damage={historyTarget}
          assetStatusID={assetStatusID}
          onAssetStatusChange={onAssetStatusChange}
          items={maintenances}
          contacts={contacts}
          currencies={currencies}
          onChange={onMaintenancesChange}
          onReturned={onMaintenanceReturned}
          onClose={() => setHistoryTargetId(null)}
        />
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
    // No svg+xml: an SVG rendered from a blob: URL runs in this origin.
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
  const isImage = ['png', 'jpg', 'jpeg', 'bmp', 'avif'].includes(ext);
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
  return !ALLOWED_ATTACHMENT_EXTENSIONS.has((ext ?? '').trim().toLowerCase().replace(/^\./, ''));
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
