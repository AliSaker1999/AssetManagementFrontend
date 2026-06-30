import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { inventoriesApi } from '../api/inventories';
import { lookupsApi } from '../api/lookups';
import { assetsApi } from '../api/assets';
import { useAuth } from '../contexts/AuthContext';
import { handleApiError } from '../utils/errors';
import Select from '../components/ui/Select';
import type {
  Asset,
  Company,
  InventoryActiveSession,
  InventoryDetail,
  InventoryHistoryItem,
  InventoryListItem,
  LocationDetail,
  LocationType,
  StatusHistoryItem,
} from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB');
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(startIso: string | null | undefined, endIso: string | null | undefined) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
}

function diffMonthsFromNow(dateIso: string | null | undefined) {
  if (!dateIso) return null;
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months -= 1;
  return Math.max(0, months);
}

// ─── RelocateModal ──────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RelocateModal({
  item,
  companyId,
  onConfirm,
  onCancel,
}: {
  item: InventoryDetail;
  companyId: number;
  onConfirm: (locId: number, locDetailId: number) => Promise<void>;
  onCancel: () => void;
}) {
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);
  const [locId, setLocId] = useState(0);
  const [locDetailId, setLocDetailId] = useState(0);
  const [saving, setSaving] = useState(false);

  // inline add-location form
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);

  // inline add-detail form
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [newFloor, setNewFloor] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  useEffect(() => {
    lookupsApi.getLocations(companyId).then((r) => {
      const list = r.data as LocationType[];
      setLocations(list);
      if (list.length > 0) setLocId(list[0].locationID);
    });
  }, [companyId]);

  useEffect(() => {
    if (!locId) return;
    setLocDetailId(0);
    setLocDetails([]);
    setShowAddDetail(false);
    lookupsApi.getLocationDetails(locId).then((r) => {
      const list = r.data as LocationDetail[];
      setLocDetails(list);
      if (list.length > 0) setLocDetailId(list[0].locDetailID);
    });
  }, [locId]);

  async function handleAddLocation() {
    if (!newLocName.trim()) { toast.error('Location name is required.'); return; }
    setSavingLoc(true);
    try {
      const r = await lookupsApi.createLocation({ location: newLocName.trim(), companyID: companyId });
      const created = r.data as LocationType;
      const updated = [...locations, created];
      setLocations(updated);
      setLocId(created.locationID);
      setNewLocName('');
      setShowAddLoc(false);
      toast.success('Location added');
    } catch (err) {
      handleApiError(err, 'Failed to add location');
    } finally {
      setSavingLoc(false);
    }
  }

  async function handleAddDetail() {
    if (!newFloor.trim()) { toast.error('Floor is required.'); return; }
    if (!locId) { toast.error('Select a location first.'); return; }
    setSavingDetail(true);
    try {
      const r = await lookupsApi.createLocationDetail({
        locationID: locId,
        floor: newFloor.trim(),
        zone: newZone.trim() || null,
        room: newRoom.trim() || null,
      });
      const created = r.data as LocationDetail;
      const updated = [...locDetails, created];
      setLocDetails(updated);
      setLocDetailId(created.locDetailID);
      setNewFloor(''); setNewZone(''); setNewRoom('');
      setShowAddDetail(false);
      toast.success('Floor/detail added');
    } catch (err) {
      handleApiError(err, 'Failed to add detail');
    } finally {
      setSavingDetail(false);
    }
  }

  async function handleConfirm() {
    if (!locId || !locDetailId) {
      toast.error('Please select a location and floor/detail.');
      return;
    }
    setSaving(true);
    try {
      await onConfirm(locId, locDetailId);
    } finally {
      setSaving(false);
    }
  }

  const currentLoc = [item.location, item.floor, item.zone, item.room].filter(Boolean).join(' · ');

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[500px] max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </span>
            <h3 className="text-[15px] font-semibold text-navy-700">Set New Location</h3>
          </div>
          <button onClick={onCancel} className="text-ink-300 hover:text-ink-800 p-1 rounded-md hover:bg-pearl-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* asset info */}
          <div className="bg-pearl-50 border border-pearl-200 rounded-lg px-4 py-3">
            <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1">Asset</p>
            <p className="font-code text-[13px] font-semibold text-navy-700">{item.assetCode}</p>
            <p className="text-[13px] text-ink-500 mt-0.5">{item.assetDesc}</p>
          </div>

          {/* current location */}
          <div>
            <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1">Current Location</p>
            <p className="text-[13px] text-ink-500">{currentLoc || '—'}</p>
          </div>

          {/* ── location picker ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold uppercase text-ink-300">New Location</label>
              <button
                type="button"
                onClick={() => { setShowAddLoc((v) => !v); setNewLocName(''); }}
                className={clsx(
                  'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors',
                  showAddLoc
                    ? 'bg-pearl-200 text-ink-500'
                    : 'text-navy-600 hover:bg-navy-50',
                )}
              >
                <PlusIcon />
                {showAddLoc ? 'Cancel' : 'Add new'}
              </button>
            </div>

            <Select
              value={locId}
              onChange={(e) => setLocId(Number(e.target.value))}
              className="input-base w-full"
            >
              <option value={0} disabled>Select location…</option>
              {locations.map((l) => (
                <option key={l.locationID} value={l.locationID}>{l.location}</option>
              ))}
            </Select>

            {/* inline add-location form */}
            {showAddLoc && (
              <div className="mt-2 border border-navy-100 bg-navy-50/40 rounded-lg px-3 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-navy-600 uppercase">New Location</p>
                <input
                  className="input-base w-full text-sm"
                  placeholder="Location name…"
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleAddLocation(); } }}
                  autoFocus
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddLocation}
                    disabled={savingLoc || !newLocName.trim()}
                    className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                  >
                    {savingLoc ? 'Adding…' : 'Add Location'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── floor / detail picker ── */}
          {locId > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase text-ink-300">Floor / Zone / Room</label>
                <button
                  type="button"
                  onClick={() => { setShowAddDetail((v) => !v); setNewFloor(''); setNewZone(''); setNewRoom(''); }}
                  className={clsx(
                    'flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors',
                    showAddDetail
                      ? 'bg-pearl-200 text-ink-500'
                      : 'text-navy-600 hover:bg-navy-50',
                  )}
                >
                  <PlusIcon />
                  {showAddDetail ? 'Cancel' : 'Add new'}
                </button>
              </div>

              {locDetails.length > 0 ? (
                <Select
                  value={locDetailId}
                  onChange={(e) => setLocDetailId(Number(e.target.value))}
                  className="input-base w-full"
                >
                  <option value={0} disabled>Select detail…</option>
                  {locDetails.map((d) => (
                    <option key={d.locDetailID} value={d.locDetailID}>
                      {[d.floor, d.zone, d.room].filter(Boolean).join(' · ')}
                    </option>
                  ))}
                </Select>
              ) : (
                !showAddDetail && (
                  <p className="text-[12px] text-ink-400 italic">No details for this location. Add one below.</p>
                )
              )}

              {/* inline add-detail form */}
              {showAddDetail && (
                <div className="mt-2 border border-navy-100 bg-navy-50/40 rounded-lg px-3 py-3 space-y-2">
                  <p className="text-[11px] font-semibold text-navy-600 uppercase">New Floor / Detail</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-0.5">Floor <span className="text-red-400">*</span></label>
                      <input
                        className="input-base w-full text-sm"
                        placeholder="e.g. F1"
                        value={newFloor}
                        onChange={(e) => setNewFloor(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-0.5">Zone</label>
                      <input
                        className="input-base w-full text-sm"
                        placeholder="optional"
                        value={newZone}
                        onChange={(e) => setNewZone(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-ink-400 mb-0.5">Room</label>
                      <input
                        className="input-base w-full text-sm"
                        placeholder="optional"
                        value={newRoom}
                        onChange={(e) => setNewRoom(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddDetail}
                      disabled={savingDetail || !newFloor.trim()}
                      className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
                    >
                      {savingDetail ? 'Adding…' : 'Add Detail'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={saving || !locId || !locDetailId}
            className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Confirm Relocation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EndInventoryModal ──────────────────────────────────────────────────────

function EndInventoryModal({
  session,
  details,
  onConfirm,
  onCancel,
}: {
  session: InventoryActiveSession;
  details: InventoryDetail[];
  onConfirm: (endDate: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const endDate = todayIso();

  const total     = details.length;
  const found     = details.filter((d) => d.isAvailable).length;
  const notFound  = total - found;
  const relocated = details.filter((d) => d.relocated).length;

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(endDate);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[440px]">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-200">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center text-red-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <h3 className="text-[15px] font-semibold text-navy-700">End Inventory Session</h3>
          </div>
          <button onClick={onCancel} className="text-ink-300 hover:text-ink-800 p-1 rounded-md hover:bg-pearl-100 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pearl-50 border border-pearl-200 rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1">Start Date</p>
              <p className="text-[14px] font-semibold text-navy-700">{fmtDate(session.inventoryStartDate)}</p>
            </div>
            <div className="bg-pearl-50 border border-pearl-200 rounded-lg px-4 py-3">
              <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1">End Date</p>
              <p className="text-[14px] font-semibold text-navy-700">{fmtDate(endDate)}</p>
              <p className="text-[10px] text-ink-300 mt-0.5">Today (locked)</p>
            </div>
          </div>

          {/* summary */}
          <div>
            <p className="text-[11px] font-semibold uppercase text-ink-300 mb-2">Session Summary</p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryTile label="Total Assets" value={total} color="navy" />
              <SummaryTile label="Found" value={found} color="green" />
              <SummaryTile label="Not Found" value={notFound} color="red" />
              <SummaryTile label="Relocated" value={relocated} color="amber" />
            </div>
          </div>

          {notFound > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex gap-2 items-start">
              <svg className="mt-0.5 shrink-0 text-red-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-[12px] text-red-600">
                <strong>{notFound}</strong> asset{notFound !== 1 ? 's' : ''} marked as "Not Found" will be set to Lost status.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary text-sm px-4 py-2">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="btn-danger text-sm px-5 py-2 disabled:opacity-50"
          >
            {saving ? 'Finishing…' : 'Finish Inventory'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }: { label: string; value: number; color: 'navy' | 'green' | 'red' | 'amber' }) {
  const bg = { navy: 'bg-navy-50 border-navy-200', green: 'bg-emerald-50 border-emerald-200', red: 'bg-red-50 border-red-200', amber: 'bg-amber-50 border-amber-200' }[color];
  const text = { navy: 'text-navy-700', green: 'text-emerald-700', red: 'text-red-600', amber: 'text-amber-700' }[color];
  return (
    <div className={clsx('border rounded-lg px-4 py-3', bg)}>
      <p className="text-[11px] font-medium text-ink-400 mb-0.5">{label}</p>
      <p className={clsx('text-[22px] font-bold', text)}>{value.toLocaleString()}</p>
    </div>
  );
}

// ─── AvailabilityCheckbox ────────────────────────────────────────────────────

function AvailabilityCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={clsx(
        'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer',
        checked
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'bg-white border-red-300 text-red-300 hover:border-red-400',
      )}
      aria-label={checked ? 'Mark as missing' : 'Mark as found'}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

// ─── RelocateCheckbox ────────────────────────────────────────────────────────

function RelocateCheckbox({ relocated, onClick }: { relocated: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all',
        relocated
          ? 'bg-amber-400 border-amber-400 text-white cursor-default'
          : 'bg-white border-pearl-300 text-ink-300 hover:border-amber-400 cursor-pointer',
      )}
      aria-label={relocated ? 'Already relocated' : 'Mark as relocated'}
    >
      {relocated && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      )}
    </button>
  );
}

// ─── AssetDetailModal ────────────────────────────────────────────────────────

type DetailTab = 'info' | 'inventory' | 'status';

function TabSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 text-[13px] text-ink-400 py-10">
      <div className="w-4 h-4 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
      Loading…
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 py-2.5 border-b border-pearl-100 last:border-b-0">
      <dt className="text-[11px] font-semibold uppercase text-ink-300 pt-0.5">{label}</dt>
      <dd className="text-[13px] text-ink-700">{value}</dd>
    </div>
  );
}

function InfoTab({ item, asset }: { item: InventoryDetail; asset: Asset }) {
  const currentLoc = [item.location, item.floor, item.zone, item.room].filter(Boolean).join(' · ');
  const relocatedLoc = item.relocated
    ? [item.relocatedLocation, item.relocatedFloor, item.relocatedZone, item.relocatedRoom].filter(Boolean).join(' · ')
    : null;
  return (
    <dl>
      <InfoRow label="Asset Code" value={<span className="font-code font-semibold text-navy-700">{item.assetCode}</span>} />
      <InfoRow label="Description" value={item.assetDesc} />
      <InfoRow label="Group" value={item.groupName} />
      <InfoRow label="Location" value={currentLoc || '—'} />
      {relocatedLoc && (
        <InfoRow label="Relocated To" value={<span className="font-medium text-amber-700">{relocatedLoc}</span>} />
      )}
      <InfoRow label="Barcode" value={asset.barcodeNumber} />
      <InfoRow label="Serial No." value={asset.serialNumber} />
      <InfoRow label="In Service Date" value={asset.inServiceDate ? fmtDate(asset.inServiceDate) : undefined} />
      <InfoRow label="Purchase Date" value={asset.purchaseDate ? fmtDate(asset.purchaseDate) : undefined} />
      <InfoRow
        label="Purchase Price"
        value={asset.purchasePrice ? `${asset.purchasePrice.toLocaleString()} ${asset.purchaseCurCode}` : undefined}
      />
      <InfoRow label="Invoice No." value={asset.invoiceNo} />
      <InfoRow label="PO No." value={asset.purchaseOrderNo} />
      <InfoRow label="Remark" value={item.remark} />
    </dl>
  );
}

function InventoryHistoryTab({ rows }: { rows: InventoryHistoryItem[] }) {
  if (rows.length === 0) return <p className="text-center text-ink-400 text-[13px] py-10">No inventory history.</p>;
  return (
    <div className="rounded-lg border border-pearl-200 overflow-hidden">
      <div className="grid grid-cols-[110px_1fr_70px_70px] bg-pearl-100 px-4 py-2 border-b border-pearl-200">
        {['Date', 'Location', 'Found', 'Relocated'].map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase text-ink-300">{h}</div>
        ))}
      </div>
      <div className="divide-y divide-pearl-100">
        {rows.map((r) => (
          <div key={r.invDetailID} className="grid grid-cols-[110px_1fr_70px_70px] px-4 py-2.5 items-center">
            <div className="text-[12px] text-ink-500">{fmtDate(r.createdDate)}</div>
            <div className="text-[12px] text-ink-700">
              {r.relocated
                ? <span className="text-amber-700">{r.relocatedLocation || '—'}</span>
                : [r.location, r.floor, r.zone, r.room].filter(Boolean).join(' · ')}
            </div>
            <div className={clsx('text-[11px] font-semibold', r.isAvailable ? 'text-emerald-600' : 'text-red-500')}>
              {r.isAvailable ? 'Found' : 'Missing'}
            </div>
            <div className="text-[11px] font-semibold text-amber-600">
              {r.relocated ? 'Yes' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusHistoryTab({ rows }: { rows: StatusHistoryItem[] }) {
  if (rows.length === 0) return <p className="text-center text-ink-400 text-[13px] py-10">No status history.</p>;
  return (
    <div className="rounded-lg border border-pearl-200 overflow-hidden">
      <div className="grid grid-cols-[110px_120px_1fr_130px] bg-pearl-100 px-4 py-2 border-b border-pearl-200">
        {['Date', 'Status', 'Notes', 'By'].map((h) => (
          <div key={h} className="text-[10px] font-semibold uppercase text-ink-300">{h}</div>
        ))}
      </div>
      <div className="divide-y divide-pearl-100">
        {rows.map((r) => (
          <div key={r.statusHistID} className="grid grid-cols-[110px_120px_1fr_130px] px-4 py-2.5 items-center">
            <div className="text-[12px] text-ink-500">{fmtDate(r.statusDate)}</div>
            <div className="text-[12px] font-medium text-navy-700">{r.statusName || `#${r.statusID}`}</div>
            <div className="text-[12px] text-ink-500 pr-2">{r.statusDesc || '—'}</div>
            <div className="text-[11px] text-ink-400">{r.createdByFullName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetDetailModal({ item, onClose }: { item: InventoryDetail; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>('info');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [invHistory, setInvHistory] = useState<InventoryHistoryItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const loadedTabs = useRef<Set<DetailTab>>(new Set());

  useEffect(() => {
    assetsApi.get(item.assetID)
      .then((r) => setAsset(r.data as Asset))
      .catch((err) => handleApiError(err, 'Failed to load asset'))
      .finally(() => setLoading(false));
  }, [item.assetID]);

  useEffect(() => {
    if (tab === 'info' || loadedTabs.current.has(tab)) return;
    loadedTabs.current.add(tab);
    setTabLoading(true);
    const req = tab === 'inventory'
      ? assetsApi.getInventoryHistory(item.assetID).then((r) => setInvHistory(r.data as InventoryHistoryItem[]))
      : assetsApi.getStatusHistory(item.assetID).then((r) => setStatusHistory(r.data as StatusHistoryItem[]));
    req
      .catch((err) => handleApiError(err, 'Failed to load history'))
      .finally(() => setTabLoading(false));
  }, [tab, item.assetID]);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'info', label: 'Info' },
    { id: 'inventory', label: 'Inventory History' },
    { id: 'status', label: 'Status History' },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[680px] max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-pearl-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-code text-[14px] font-bold text-navy-700">{item.assetCode}</span>
              {item.isAvailable ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-semibold">Found</span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-semibold">Missing</span>
              )}
              {item.relocated && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                    <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  Relocated
                </span>
              )}
            </div>
            <p className="text-[13px] text-ink-500 mt-0.5">{item.assetDesc}</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-800 p-1 rounded-md hover:bg-pearl-100 transition-colors shrink-0 ml-4 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-pearl-200 px-6 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'text-[12px] font-semibold px-1 py-3 mr-5 border-b-2 transition-colors',
                tab === t.id ? 'border-navy-600 text-navy-700' : 'border-transparent text-ink-400 hover:text-ink-700',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <TabSpinner />
          ) : (
            <>
              {tab === 'info' && asset && <InfoTab item={item} asset={asset} />}
              {tab === 'inventory' && (tabLoading ? <TabSpinner /> : <InventoryHistoryTab rows={invHistory} />)}
              {tab === 'status' && (tabLoading ? <TabSpinner /> : <StatusHistoryTab rows={statusHistory} />)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PastInventoryDetailModal ────────────────────────────────────────────────

function PastInventoryDetailModal({ item, onClose }: { item: InventoryListItem; onClose: () => void }) {
  const [details, setDetails] = useState<InventoryDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [innerDetail, setInnerDetail] = useState<InventoryDetail | null>(null);

  useEffect(() => {
    inventoriesApi.getDetails({
      inventoryID: item.inventoryID,
      locationID: -1,
      companyID: -1,
      categoryID: -1,
      groupID: -1,
      locationDetailID: -1,
      accountingExclusion: false,
    })
      .then((r) => setDetails(r.data as InventoryDetail[]))
      .catch((err) => handleApiError(err, 'Failed to load inventory details'))
      .finally(() => setLoading(false));
  }, [item.inventoryID]);

  const filtered = details.filter(
    (d) =>
      !search ||
      d.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      d.assetDesc.toLowerCase().includes(search.toLowerCase()),
  );

  const total = details.length;
  const found = details.filter((d) => d.isAvailable).length;
  const relocated = details.filter((d) => d.relocated).length;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[110] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {innerDetail && <AssetDetailModal item={innerDetail} onClose={() => setInnerDetail(null)} />}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[950px] max-h-[90vh] flex flex-col">
        {/* header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-pearl-200 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-6 h-6 rounded-md bg-navy-100 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-navy-600">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <h3 className="text-[15px] font-semibold text-navy-700">
                {fmtDate(item.inventoryStartDate)} — {fmtDate(item.inventoryEndDate)}
              </h3>
            </div>
            {item.endCreatedByFullName && (
              <p className="text-[12px] text-ink-400">Closed by {item.endCreatedByFullName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-800 p-1 rounded-md hover:bg-pearl-100 transition-colors ml-4 mt-0.5 shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* summary tiles */}
        {!loading && (
          <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b border-pearl-200 shrink-0">
            <SummaryTile label="Total Assets" value={total} color="navy" />
            <SummaryTile label="Found" value={found} color="green" />
            <SummaryTile label="Not Found" value={total - found} color="red" />
            <SummaryTile label="Relocated" value={relocated} color="amber" />
          </div>
        )}

        {/* search */}
        <div className="px-6 py-3 border-b border-pearl-200 shrink-0">
          <div className="relative max-w-[360px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="input-base pl-8 w-full text-sm"
              placeholder="Search by code or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* asset list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <TabSpinner />
          ) : filtered.length === 0 ? (
            <p className="text-center text-ink-400 text-[13px] py-10">No assets match.</p>
          ) : (
            <>
              <div className="grid grid-cols-[150px_1fr_130px_200px_60px_60px] bg-pearl-100 border-b border-pearl-200 px-4 py-2">
                {['Code', 'Description', 'Group', 'Location', 'Found', 'Relocated'].map((h) => (
                  <div key={h} className="text-[10px] font-semibold uppercase text-ink-300">{h}</div>
                ))}
              </div>
              <div className="divide-y divide-pearl-100">
                {filtered.map((d) => (
                  <div
                    key={d.invDetailID}
                    onClick={() => setInnerDetail(d)}
                    className={clsx(
                      'grid grid-cols-[150px_1fr_130px_200px_60px_60px] px-4 py-3 items-center cursor-pointer transition-colors',
                      d.isAvailable ? 'bg-white hover:bg-emerald-50/30' : 'bg-red-50/20 hover:bg-red-50/40',
                    )}
                  >
                    <div className="font-code text-[12px] font-semibold text-navy-700 truncate pr-2">{d.assetCode}</div>
                    <div className="text-[13px] text-ink-700 truncate pr-3">{d.assetDesc}</div>
                    <div className="text-[12px] text-ink-400 truncate pr-2">{d.groupName}</div>
                    <div className="text-[12px] text-ink-500 pr-2">
                      {d.relocated ? (
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">↩ Relocated</span>
                          {d.relocatedLocation && <span className="text-ink-400 truncate">{d.relocatedLocation}</span>}
                        </span>
                      ) : (
                        [d.location, d.floor, d.zone].filter(Boolean).join(' · ')
                      )}
                    </div>
                    <div className="flex justify-center">
                      {d.isAvailable
                        ? <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12" /></svg></span>
                        : <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                      }
                    </div>
                    <div className="flex justify-center">
                      {d.relocated && (
                        <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                            <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PastInventoriesSection ───────────────────────────────────────────────────

function PastInventoriesSection({
  items,
  onView,
}: {
  items: InventoryListItem[];
  onView: (item: InventoryListItem) => void;
}) {
  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-400">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <h2 className="text-[13px] font-semibold text-ink-600 uppercase tracking-wide">Past Inventories</h2>
        <span className="text-[11px] text-ink-300 font-medium">{items.length} session{items.length !== 1 ? 's' : ''}</span>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-pearl-200 rounded-xl shadow-card px-6 py-8 text-center">
          <p className="text-[13px] text-ink-400">No completed inventory sessions for this company yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_70px_70px_80px_80px_44px] gap-0 bg-pearl-100 border-b border-pearl-200 px-5 py-2.5">
            {['Started', 'Ended', 'Total', 'Found', 'Missing', 'Relocated', ''].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase text-ink-300">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-pearl-100">
            {items.map((inv) => {
              const missing = inv.totalAssets - inv.foundAssets;
              const pct = inv.totalAssets > 0 ? Math.round((inv.foundAssets / inv.totalAssets) * 100) : 0;
              return (
                <div
                  key={inv.inventoryID}
                  onClick={() => onView(inv)}
                  className="grid grid-cols-[1fr_1fr_70px_70px_80px_80px_44px] gap-0 px-5 py-3.5 items-center hover:bg-pearl-50/60 cursor-pointer transition-colors group"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-ink-700">{fmtDate(inv.inventoryStartDate)}</p>
                    <p className="text-[11px] text-ink-300 mt-0.5">{inv.startCreatedByFullName}</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-ink-600">{fmtDate(inv.inventoryEndDate)}</p>
                    {inv.endCreatedByFullName && (
                      <p className="text-[11px] text-ink-300 mt-0.5">{inv.endCreatedByFullName}</p>
                    )}
                  </div>
                  <div className="text-[14px] font-bold text-ink-700">{inv.totalAssets}</div>
                  <div className="text-[14px] font-bold text-emerald-600">{inv.foundAssets}</div>
                  <div className={clsx('text-[14px] font-bold', missing > 0 ? 'text-red-500' : 'text-ink-300')}>{missing}</div>
                  <div className={clsx('text-[14px] font-bold', inv.relocatedAssets > 0 ? 'text-amber-600' : 'text-ink-300')}>{inv.relocatedAssets}</div>
                  <div className="flex justify-end">
                    <span className={clsx(
                      'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                      'bg-pearl-100 text-ink-300 group-hover:bg-navy-50 group-hover:text-navy-600',
                    )}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </div>
                  {/* found % bar */}
                  <div className="col-span-7 mt-1.5 px-0">
                    <div className="h-1 bg-pearl-200 rounded-full overflow-hidden">
                      <div
                        className={clsx('h-full rounded-full transition-all', pct >= 80 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function InventoriesPage() {
  const { activeCompanyId, isAuditor } = useAuth();
  const readOnly = isAuditor();

  const [companies, setCompanies]           = useState<Company[]>([]);
  const [companyId, setCompanyId]           = useState<number>(0);
  const [session, setSession]               = useState<InventoryActiveSession | null>(null);
  const [details, setDetails]               = useState<InventoryDetail[]>([]);
  const [lastDate, setLastDate]             = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [showEndModal, setShowEndModal]         = useState(false);
  const [relocateTarget, setRelocateTarget]     = useState<InventoryDetail | null>(null);
  const [detailTarget, setDetailTarget]         = useState<InventoryDetail | null>(null);
  const [pastInventories, setPastInventories]   = useState<InventoryListItem[]>([]);
  const [historyTarget, setHistoryTarget]       = useState<InventoryListItem | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const today = todayIso();

  // ── load companies on mount ───────────────────────────────────────────────
  useEffect(() => {
    lookupsApi.getCompanies()
      .then((r) => {
        const list = r.data as Company[];
        setCompanies(list);
        const cid = activeCompanyId ?? (list[0]?.companyID ?? 0);
        setCompanyId(cid);
      })
      .catch((err) => handleApiError(err, 'Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  // ── sync active company from sidebar switcher ─────────────────────────────
  useEffect(() => {
    if (activeCompanyId != null) setCompanyId(activeCompanyId);
  }, [activeCompanyId]);

  // ── load session + last date when company changes ─────────────────────────
  useEffect(() => {
    if (!companyId) return;
    void loadSessionData(companyId);
  }, [companyId]);

  async function loadSessionData(cid: number) {
    setDetailsLoading(true);
    try {
      const [modeRes, lastRes, historyRes] = await Promise.all([
        inventoriesApi.getMode(cid),
        inventoriesApi.getLastDate(cid),
        inventoriesApi.getHistory(cid),
      ]);
      const active = modeRes.data as InventoryActiveSession | null;
      setSession(active);
      setLastDate(lastRes.data as string | null);
      setPastInventories(historyRes.data as InventoryListItem[]);
      if (active?.inventoryID) {
        await loadDetails(active.inventoryID);
      } else {
        setDetails([]);
      }
    } catch (err) {
      handleApiError(err, 'Failed to load inventory data');
    } finally {
      setDetailsLoading(false);
    }
  }

  async function loadDetails(inventoryId: number) {
    const r = await inventoriesApi.getDetails({
      inventoryID: inventoryId,
      locationID: -1,
      companyID: -1,
      categoryID: -1,
      groupID: -1,
      locationDetailID: -1,
      accountingExclusion: false,
    });
    setDetails(r.data as InventoryDetail[]);
  }

  // ── start inventory ───────────────────────────────────────────────────────
  async function handleStart() {
    if (readOnly) return;
    if (!companyId) return;
    setActionLoading(true);
    try {
      await inventoriesApi.start({ inventoryStartDate: today, companyID: companyId });
      toast.success('Inventory session started');
      await loadSessionData(companyId);
    } catch (err) {
      handleApiError(err, 'Failed to start inventory');
    } finally {
      setActionLoading(false);
    }
  }

  // ── end inventory ─────────────────────────────────────────────────────────
  async function handleEnd(endDate: string) {
    if (readOnly) return;
    if (!session) return;
    await inventoriesApi.end(session.inventoryID, { inventoryEndDate: endDate });
    toast.success('Inventory session ended');
    setShowEndModal(false);
    await loadSessionData(companyId);
  }

  // ── refresh ───────────────────────────────────────────────────────────────
  async function handleRefresh() {
    if (readOnly) return;
    if (!session) return;
    setActionLoading(true);
    try {
      await inventoriesApi.refresh(session.inventoryID);
      await loadDetails(session.inventoryID);
      toast.success('Asset list refreshed');
    } catch (err) {
      handleApiError(err, 'Refresh failed');
    } finally {
      setActionLoading(false);
    }
  }

  // ── mark all available ────────────────────────────────────────────────────
  async function handleMarkAllAvailable() {
    if (readOnly) return;
    if (!session) return;
    setActionLoading(true);
    try {
      await inventoriesApi.setAvailableAll(session.inventoryID, true);
      setDetails((prev) => prev.map((d) => ({ ...d, isAvailable: true })));
      toast.success('All assets marked as found');
    } catch (err) {
      handleApiError(err, 'Failed to update');
    } finally {
      setActionLoading(false);
    }
  }

  // ── toggle single availability ────────────────────────────────────────────
  async function toggleAvailable(item: InventoryDetail) {
    if (readOnly) return;
    const next = !item.isAvailable;
    setDetails((prev) => prev.map((d) => d.invDetailID === item.invDetailID ? { ...d, isAvailable: next } : d));
    try {
      await inventoriesApi.setAvailable(item.invDetailID, next);
    } catch (err) {
      setDetails((prev) => prev.map((d) => d.invDetailID === item.invDetailID ? { ...d, isAvailable: item.isAvailable } : d));
      handleApiError(err, 'Failed to update availability');
    }
  }

  // ── confirm relocation ────────────────────────────────────────────────────
  async function handleRelocateConfirm(locId: number, locDetailId: number) {
    if (readOnly) return;
    if (!relocateTarget) return;
    await inventoriesApi.relocate({
      invDetailID: relocateTarget.invDetailID,
      relocatedLocationID: locId,
      relocatedLocDetailID: locDetailId,
    });
    const loc = `Location ${locId}`;
    setDetails((prev) =>
      prev.map((d) =>
        d.invDetailID === relocateTarget.invDetailID
          ? { ...d, relocated: true, relocatedLocation: loc }
          : d,
      ),
    );
    toast.success('Relocation saved');
    setRelocateTarget(null);
  }

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = details.filter(
    (d) =>
      d.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      d.assetDesc.toLowerCase().includes(search.toLowerCase()),
  );

  const foundCount = filtered.filter((d) => d.isAvailable).length;
  const latestCompletedInventory = pastInventories.reduce<InventoryListItem | null>((latest, current) => {
    if (!latest) return current;
    return new Date(current.inventoryEndDate) > new Date(latest.inventoryEndDate) ? current : latest;
  }, null);
  const lastFinishedInDays = diffDays(
    latestCompletedInventory?.inventoryStartDate,
    latestCompletedInventory?.inventoryEndDate,
  );
  const lastMadeInMonths = diffMonthsFromNow(lastDate ?? latestCompletedInventory?.inventoryEndDate ?? null);

  // ── loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-8 py-6">
        <div className="h-7 w-40 bg-pearl-200 rounded-md animate-pulse mb-6" />
        <div className="h-10 w-72 bg-pearl-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-[1400px] mx-auto">
      {/* ── modals ── */}
      {relocateTarget && (
        <RelocateModal
          item={relocateTarget}
          companyId={companyId}
          onConfirm={handleRelocateConfirm}
          onCancel={() => setRelocateTarget(null)}
        />
      )}
      {showEndModal && session && (
        <EndInventoryModal
          session={session}
          details={details}
          onConfirm={handleEnd}
          onCancel={() => setShowEndModal(false)}
        />
      )}
      {detailTarget && (
        <AssetDetailModal item={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
      {historyTarget && (
        <PastInventoryDetailModal item={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}

      {/* ── page header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-navy-700">Inventory</h1>
          <p className="text-[13px] text-ink-400 mt-0.5">Manage asset inventory sessions by company</p>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase text-ink-300">Company</span>
          <Select
            value={companyId}
            onChange={(e) => setCompanyId(Number(e.target.value))}
            className="input-base min-w-[220px] text-sm"
          >
            <option value={0} disabled>Select company…</option>
            {companies.map((c) => (
              <option key={c.companyID} value={c.companyID}>{c.companyName}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* ── no company selected ── */}
      {!companyId && (
        <div className="flex flex-col items-center justify-center mt-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-pearl-100 border border-pearl-200 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-300">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-ink-600">Select a company</p>
          <p className="text-[13px] text-ink-300 mt-1">Choose a company above to manage its inventory.</p>
        </div>
      )}

      {/* ── company selected ── */}
      {!!companyId && (
        <>
          {detailsLoading && !session && (
            <div className="flex items-center gap-2 text-[13px] text-ink-400 mt-8">
              <div className="w-4 h-4 border-2 border-navy-300 border-t-navy-600 rounded-full animate-spin" />
              Loading inventory data…
            </div>
          )}

          {/* ── no active session ── */}
          {!detailsLoading && !session && (
            <div className="grid grid-cols-[380px_1fr] gap-6 items-start mt-2">
              {/* left: start card */}
              <div className="bg-white border border-pearl-200 rounded-xl shadow-card overflow-hidden">
                <div className="bg-gradient-to-br from-navy-700 to-navy-600 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-white">No Active Inventory</p>
                      <p className="text-[12px] text-white/60 mt-0.5">
                        {companies.find((c) => c.companyID === companyId)?.companyName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between py-2.5 border-b border-pearl-100">
                    <span className="text-[12px] text-ink-400">Start date</span>
                    <span className="text-[13px] font-semibold text-ink-700">{fmtDate(today)}</span>
                  </div>

                  {lastDate && (
                    <div className="flex items-center justify-between py-2.5 border-b border-pearl-100">
                      <span className="text-[12px] text-ink-400">Last completed</span>
                      <span className="text-[13px] font-semibold text-ink-700">{fmtDate(lastDate)}</span>
                    </div>
                  )}

                  <div className="bg-pearl-50 border border-pearl-200 rounded-lg px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase text-ink-300 mb-1.5">Inventory Summary</p>
                    <p className="text-[12px] text-ink-500">
                      Inventory was finished in: <span className="font-semibold text-ink-700">{lastFinishedInDays ?? '—'} Day/s</span>.
                    </p>
                    <p className="text-[12px] text-ink-500 mt-1">
                      Inventory was last made in: <span className="font-semibold text-ink-700">{lastMadeInMonths ?? '—'} Month/s</span>.
                    </p>
                  </div>

                  <div className="flex gap-2 items-start bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                    <svg className="mt-0.5 shrink-0 text-amber-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Generating inventory will disregard all the asset with status and will deny disposal or reproduced of any asset.
                    </p>
                  </div>

                  {!readOnly && (
                    <button
                      onClick={handleStart}
                      disabled={actionLoading}
                      className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {actionLoading ? 'Starting…' : `Start Inventory`}
                    </button>
                  )}
                </div>
              </div>

              {/* right: past inventories */}
              <PastInventoriesSection items={pastInventories} onView={setHistoryTarget} />
            </div>
          )}

          {/* ── active session ── */}
          {session && (
            <>
              {/* session banner */}
              <div className="bg-white border-l-4 border-l-navy-600 border border-pearl-200 rounded-lg px-5 py-4 mb-5 flex items-center justify-between shadow-card">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[12px] font-semibold text-emerald-600 uppercase tracking-wide">Active Session</span>
                  </div>
                  <span className="text-ink-200">|</span>
                  <span className="text-[13px] text-ink-500">
                    Started <span className="font-semibold text-ink-700">{fmtDate(session.inventoryStartDate)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-5 text-[12px]">
                  <Stat label="Total" value={details.length} color="ink" />
                  <Stat label="Found" value={details.filter((d) => d.isAvailable).length} color="green" />
                  <Stat label="Missing" value={details.filter((d) => !d.isAvailable).length} color="red" />
                  <Stat label="Relocated" value={details.filter((d) => d.relocated).length} color="amber" />
                </div>
              </div>

              {/* toolbar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    ref={searchRef}
                    className="input-base pl-8 w-full text-sm"
                    placeholder="Search by code or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <span className="text-[12px] text-ink-400 whitespace-nowrap">
                  <span className="font-semibold text-ink-700">{foundCount}</span> / {filtered.length} found
                </span>

                {!readOnly && (
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={handleRefresh}
                      disabled={actionLoading}
                      className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                      Refresh New Assets
                    </button>

                    <button
                      onClick={handleMarkAllAvailable}
                      disabled={actionLoading}
                      className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Mark All Available
                    </button>

                    <button
                      onClick={() => setShowEndModal(true)}
                      className="btn-danger text-sm px-4 py-2 flex items-center gap-1.5"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                      End Inventory
                    </button>
                  </div>
                )}
              </div>

              {/* table */}
              {detailsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-12 bg-pearl-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-ink-400">
                  <svg className="mx-auto mb-3 text-ink-200" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <p className="text-[14px] font-medium">No assets match your search</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
                  {/* table header */}
                  <div className="grid grid-cols-[150px_1fr_130px_200px_64px_64px] gap-0 bg-pearl-100 border-b border-pearl-200 px-4 py-2.5">
                    {['Code', 'Description', 'Group', 'Current Location', 'Found', 'Relocated'].map((h) => (
                      <div key={h} className="text-[10px] font-semibold uppercase text-ink-300">{h}</div>
                    ))}
                  </div>

                  {/* rows */}
                  <div className="divide-y divide-pearl-100">
                    {filtered.map((d) => (
                      <div
                        key={d.invDetailID}
                        onClick={() => setDetailTarget(d)}
                        className={clsx(
                          'grid grid-cols-[150px_1fr_130px_200px_64px_64px] gap-0 px-4 py-3 items-center transition-colors cursor-pointer',
                          d.isAvailable ? 'bg-white hover:bg-emerald-50/40' : 'bg-red-50/30 hover:bg-red-50/60',
                        )}
                      >
                        {/* code */}
                        <div className="font-code text-[12px] font-semibold text-navy-700 truncate pr-2">
                          {d.assetCode}
                        </div>

                        {/* description */}
                        <div className="text-[13px] text-ink-700 truncate pr-3">{d.assetDesc}</div>

                        {/* group */}
                        <div className="text-[12px] text-ink-400 truncate pr-2">{d.groupName}</div>

                        {/* location */}
                        <div className="text-[12px] text-ink-500 pr-2">
                          {d.relocated ? (
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-semibold">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                  <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                                </svg>
                                Relocated
                              </span>
                              {d.relocatedLocation && (
                                <span className="text-ink-400">
                                  {[d.relocatedLocation, d.relocatedFloor].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </span>
                          ) : (
                            [d.location, d.floor, d.zone].filter(Boolean).join(' · ')
                          )}
                        </div>

                        {/* available checkbox */}
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <AvailabilityCheckbox
                            checked={d.isAvailable}
                            onChange={() => { if (!readOnly) void toggleAvailable(d); }}
                          />
                        </div>

                        {/* relocate checkbox */}
                        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <RelocateCheckbox
                            relocated={d.relocated}
                            onClick={() => { if (!readOnly && !d.relocated) setRelocateTarget(d); }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PastInventoriesSection items={pastInventories} onView={setHistoryTarget} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'ink' | 'green' | 'red' | 'amber' }) {
  const cls = { ink: 'text-ink-700', green: 'text-emerald-600', red: 'text-red-500', amber: 'text-amber-600' }[color];
  return (
    <span>
      <span className={clsx('font-bold text-[14px]', cls)}>{value}</span>
      <span className="text-ink-400 ml-1">{label}</span>
    </span>
  );
}
