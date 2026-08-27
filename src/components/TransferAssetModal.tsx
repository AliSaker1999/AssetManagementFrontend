import React, { useState, useEffect, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Select from '../components/ui/Select';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import { handleApiError } from '../utils/errors';
import type {
  Company,
  Employee,
  HrEmployee,
  LocationDetail,
  LocationType,
} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatHrEmployeeLabel(emp: HrEmployee) {
  const empId = emp.empID?.trim() ?? '';
  const rawName = emp.fullName?.trim() ?? '';
  const cleanedName = rawName.replace(/\s*,?\s*\([^)]*\)\s*$/, '').trim();
  const name = cleanedName || rawName;
  return `${name} – ${empId}`;
}

/** Same label the asset form uses, so a detail reads identically in both places. */
function formatLocationDetailLabel(detail: LocationDetail) {
  const floor = (detail.floor ?? '').trim().replace(/,\s*$/, '');
  const zone = (detail.zone ?? '').trim().replace(/^\s*,\s*/, '').replace(/,\s*$/, '');
  const room = (detail.room ?? '').trim().replace(/^\s*,\s*/, '').replace(/,\s*$/, '');
  return `Floor ${floor}${zone ? ` / ${zone}` : ''}${room ? ` / ${room}` : ''}`;
}

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function Modal({
  title,
  onClose,
  children,
  width = 'max-w-lg',
  zIndexClassName = 'z-50',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  zIndexClassName?: string;
}) {
  return (
    <div className={`fixed inset-0 bg-black/40 ${zIndexClassName} flex items-center justify-center p-4`}>
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

/** Select + a square "add new" button, matching the asset form's DropWithAdd. */
function DropWithAdd({
  children,
  onAdd,
  disabled,
}: {
  children: React.ReactNode;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        title="Add new"
        className="shrink-0 w-8 h-[38px] flex items-center justify-center rounded-lg border border-pearl-200 bg-white text-navy-600 hover:bg-navy-50 hover:border-navy-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

const quickAddInputCls =
  'w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-ink-800 '
  + 'placeholder:text-ink-300 shadow-[0_1px_3px_rgba(0,0,0,0.07)] outline-none transition-all duration-150 '
  + 'hover:border-[#9ca3af] focus:border-brand focus:ring-2 focus:ring-[rgba(31,43,123,0.15)]';

/**
 * Quick-add overlay, mirroring the asset form's QuickAddModal. It renders its own form,
 * so it is mounted as a sibling of the transfer modal rather than inside its form — a
 * nested <form> is invalid and would break the transfer submit.
 */
function QuickAddModal({
  title,
  onClose,
  onSubmit,
  saving,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border border-pearl-200 shadow-card-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-200">
          <h3 className="text-[15px] font-bold text-ink-800">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-300 hover:bg-pearl-100 hover:text-ink-600 transition-colors cursor-pointer border-none bg-transparent"
          >
            <IconClose />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">{children}</div>
          <div className="px-6 py-4 border-t border-pearl-200 flex items-center justify-between">
            <p className="text-[11px] text-ink-300">New entry will be auto-selected after saving.</p>
            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-[13px]">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-[13px]">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export interface TransferAssetModalProps {
  /**
   * The asset to be transferred. Requires assetID, companyID, and current statusID.
   * locationID / locDetailID preselect the relocation fields; without them the transfer
   * still works, the location simply starts unselected.
   */
  asset: {
    assetID: number;
    companyID?: number | null;
    statusID?: number;
    locationID?: number | null;
    locDetailID?: number | null;
  };
  /** Whether the modal is open. */
  open: boolean;
  /** Callback when the modal should close (e.g., user clicks cancel or after successful transfer). */
  onClose: () => void;
  /** Callback after a successful transfer; receives the new employee ID. */
  onTransferred: (newEmpID: string) => void;
  /** Stacking order override for when this modal opens on top of another modal (e.g. Leave Process). Defaults to z-50. */
  zIndexClassName?: string;
}

export default function TransferAssetModal({
  asset,
  open,
  onClose,
  onTransferred,
  zIndexClassName,
}: TransferAssetModalProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [transferDate, setTransferDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [transferCompanyId, setTransferCompanyId] = useState<number | ''>('');
  // Mutually exclusive, same as the asset form's Internal / HR "Used By" pair — picking
  // one clears the other, and exactly one is required to submit.
  const [transferEmpIDUsedBy, setTransferEmpIDUsedBy] = useState<number | ''>('');
  const [transferEmpID, setTransferEmpID] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [internalEmployees, setInternalEmployees] = useState<Employee[]>([]);
  const [hrEmployees, setHrEmployees] = useState<HrEmployee[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Relocation (optional) ──────────────────────────────────────────────
  // Locations are country-scoped, so they are loaded for the asset's company country —
  // which is also the country of every company this asset can be transferred to, since
  // the target list is every company in that same country.
  const [assetCountryId, setAssetCountryId] = useState<string>('');
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);
  const [locationID, setLocationID] = useState<number | ''>('');
  const [locDetailID, setLocDetailID] = useState<number | ''>('');
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingLocDetails, setLoadingLocDetails] = useState(false);

  // ─── Quick-add ──────────────────────────────────────────────────────────
  const [quickAdd, setQuickAdd] = useState<'location' | 'locDetail' | null>(null);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newDetail, setNewDetail] = useState({ floor: '', zone: '', room: '' });

  // ─── Effects ────────────────────────────────────────────────────────────

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTransferDate(new Date().toISOString().slice(0, 10));
      setTransferCompanyId('');
      setTransferEmpIDUsedBy('');
      setTransferEmpID('');
      setCompanies([]);
      setInternalEmployees([]);
      setHrEmployees([]);
      setLocationID(asset?.locationID ?? '');
      setLocDetailID(asset?.locDetailID ?? '');
      setQuickAdd(null);
      setNewLocationName('');
      setNewDetail({ floor: '', zone: '', room: '' });
    }
    // asset.locationID / locDetailID are read only to seed the form when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load every company in the asset's own country — the receiving company does not have
  // to share the asset's HR source (or have one at all), only its country.
  useEffect(() => {
    if (!open || !asset) {
      setCompanies([]);
      setAssetCountryId('');
      return;
    }

    let isMounted = true;
    setLoadingCompanies(true);

    (async () => {
      try {
        const companiesRes = await lookupsApi.getCompanies();
        const allCompanies = companiesRes.data as Company[];

        const assetCompany = allCompanies.find(
          (c) => c.companyID === asset.companyID
        );
        const countryId = assetCompany?.countryID?.trim() ?? '';
        if (!countryId) {
          throw new Error("This asset's company has no country configured, so it cannot be transferred.");
        }
        if (!isMounted) return;

        setAssetCountryId(countryId);
        setCompanies(
          allCompanies
            .filter((c) => (c.countryID ?? '').trim() === countryId)
            .sort((a, b) => a.companyName.localeCompare(b.companyName))
        );

        // Locations are a separate concern: a failure here must not block the transfer.
        setLoadingLocations(true);
        try {
          const locRes = await lookupsApi.getLocations(countryId || undefined);
          if (isMounted) setLocations(locRes.data as LocationType[]);
        } catch (err) {
          if (isMounted) handleApiError(err, 'Failed to load locations');
        } finally {
          if (isMounted) setLoadingLocations(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setCompanies([]);
        handleApiError(err, 'Failed to load transfer companies');
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, asset]);

  // Load both employee pools for the selected company — internal employees always (a
  // plain lookup scoped to the company), HR employees only when the company actually has
  // an HR source. Either can fail without blanking the other: an unreachable HR database
  // must not hide the internal employees who are unaffected by it.
  useEffect(() => {
    if (!open || !transferCompanyId) {
      setInternalEmployees([]);
      setHrEmployees([]);
      return;
    }

    const company = companies.find((c) => c.companyID === transferCompanyId);
    let isMounted = true;
    setLoadingEmployees(true);

    Promise.all([
      lookupsApi.getEmployees(Number(transferCompanyId)).catch((err) => {
        if (isMounted) handleApiError(err, 'Failed to load internal employees');
        return { data: [] as Employee[] };
      }),
      company?.hrSourceID
        ? lookupsApi.getHrEmployees(Number(transferCompanyId)).catch(() => ({ data: [] as HrEmployee[] }))
        : Promise.resolve({ data: [] as HrEmployee[] }),
    ]).then(([internalRes, hrRes]) => {
      if (!isMounted) return;
      setInternalEmployees(internalRes.data as Employee[]);
      setHrEmployees(hrRes.data as HrEmployee[]);
    }).finally(() => {
      if (isMounted) setLoadingEmployees(false);
    });

    return () => {
      isMounted = false;
    };
  }, [open, transferCompanyId, companies]);

  // Load location details whenever the selected location changes. The current selection
  // survives if it belongs to the new list, which is what preserves the asset's own
  // detail when the modal first opens.
  useEffect(() => {
    if (!open || !locationID) {
      setLocDetails([]);
      setLocDetailID('');
      return;
    }

    let isMounted = true;
    setLoadingLocDetails(true);

    lookupsApi
      .getLocationDetails(Number(locationID))
      .then((res) => {
        if (!isMounted) return;
        const list = res.data as LocationDetail[];
        setLocDetails(list);
        setLocDetailID((prev) =>
          prev !== '' && list.some((d) => d.locDetailID === prev) ? prev : ''
        );
      })
      .catch((err) => {
        if (!isMounted) return;
        setLocDetails([]);
        setLocDetailID('');
        handleApiError(err, 'Failed to load location details');
      })
      .finally(() => {
        if (isMounted) setLoadingLocDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, locationID]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCompanyChange = (value: string) => {
    setTransferCompanyId(value === '' ? '' : Number(value));
    // Both employee picks reset when the company changes — the old lists no longer apply.
    setTransferEmpIDUsedBy('');
    setTransferEmpID('');
  };

  // Both create endpoints return an empty body, so the new row is found by refetching
  // and taking the newest match — the same pattern the asset form uses.
  const saveNewLocation = async (e: FormEvent) => {
    e.preventDefault();
    const name = newLocationName.trim();
    if (!name) {
      toast.error('Location name is required');
      return;
    }
    if (!assetCountryId) {
      toast.error("This asset's company has no country, so a location cannot be created.");
      return;
    }

    setQuickAddSaving(true);
    try {
      await lookupsApi.createLocation({ location: name, countryID: assetCountryId });
      const refreshed = (await lookupsApi.getLocations(assetCountryId)).data as LocationType[];
      setLocations(refreshed);

      const created = refreshed
        .filter((l) => normalizeText(l.location) === normalizeText(name))
        .sort((a, b) => b.locationID - a.locationID)[0];

      if (!created) {
        toast.error('Location created, but could not auto-select it. Please select it manually.');
      } else {
        setLocationID(created.locationID);
        setLocDetailID('');
        toast.success(`Location "${created.location}" created`);
      }
      setQuickAdd(null);
      setNewLocationName('');
    } catch (err) {
      handleApiError(err, 'Failed to create location');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const saveNewLocDetail = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationID) {
      toast.error('Select a location first');
      return;
    }
    const floor = newDetail.floor.trim();
    if (!floor) {
      toast.error('Floor is required');
      return;
    }

    setQuickAddSaving(true);
    try {
      const zone = newDetail.zone.trim();
      const room = newDetail.room.trim();
      await lookupsApi.createLocationDetail({
        locationID: Number(locationID),
        floor,
        zone: zone || null,
        room: room || null,
      });

      const refreshed = (await lookupsApi.getLocationDetails(Number(locationID)))
        .data as LocationDetail[];
      setLocDetails(refreshed);

      const created = refreshed
        .filter(
          (d) =>
            normalizeText(d.floor) === normalizeText(floor) &&
            normalizeText(d.zone) === normalizeText(zone) &&
            normalizeText(d.room) === normalizeText(room)
        )
        .sort((a, b) => b.locDetailID - a.locDetailID)[0];

      if (!created) {
        toast.error('Location detail created, but could not auto-select it. Please select it manually.');
      } else {
        setLocDetailID(created.locDetailID);
        toast.success('Location detail created');
      }
      setQuickAdd(null);
      setNewDetail({ floor: '', zone: '', room: '' });
    } catch (err) {
      handleApiError(err, 'Failed to create location detail');
    } finally {
      setQuickAddSaving(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!transferDate) {
      toast.error('Transfer date is required');
      return;
    }
    if (!assetCountryId) {
      toast.error('Transfer company lookups are not available for this asset.');
      return;
    }
    if (!transferCompanyId) {
      toast.error('Select a transfer company');
      return;
    }
    const hasInternalEmployee = transferEmpIDUsedBy !== '';
    const hasHrEmployee = transferEmpID.trim() !== '';
    if (!hasInternalEmployee && !hasHrEmployee) {
      toast.error('Select a transfer employee — either HR or internal');
      return;
    }
    if (hasInternalEmployee && hasHrEmployee) {
      toast.error('Select either an HR employee or an internal employee, not both');
      return;
    }
    if (locationID && !locDetailID) {
      toast.error('Select a location detail, or clear the location');
      return;
    }

    // Only sent when the user actually moved the asset. Leaving them null keeps an
    // unchanged transfer byte-for-byte what it was before relocation was supported —
    // including for assets whose current location predates the country rules.
    const relocating =
      locationID !== '' &&
      locDetailID !== '' &&
      (locationID !== (asset.locationID ?? '') || locDetailID !== (asset.locDetailID ?? ''));

    setSubmitting(true);
    try {
      // The asset's status stays the same; we only update the employee assignment.
      await assetsApi.updateStatus(asset.assetID, {
        assetStatusID: asset.statusID ?? 0, // keep current status
        assetStatusDate: transferDate,
        statusID: 2, // transfer action
        statusDate: transferDate,
        statusContactID: null,
        statusSalePrice: 0,
        statusSaleCurCode: null,
        statusDesc: null,
        transferCompanyID: Number(transferCompanyId),
        transferEmpID: hasHrEmployee ? transferEmpID.trim() : null,
        transferEmpIDUsedBy: hasInternalEmployee ? Number(transferEmpIDUsedBy) : null,
        transferLocationID: relocating ? Number(locationID) : null,
        transferLocDetailID: relocating ? Number(locDetailID) : null,
      });

      toast.success('Asset transferred successfully');
      onTransferred(hasHrEmployee ? transferEmpID.trim() : String(transferEmpIDUsedBy));
      onClose();
    } catch (err) {
      handleApiError(err, 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

//   console.log("Modal render");
// console.log(open);
// console.log(asset);

  if (!open) return null;

  // Disable the form if asset is under inventory (status 10) – optional
  const isUnderInventory = asset.statusID === 10;

  // The list is scoped to the asset's own country, so it can legitimately be empty only
  // if that country itself has no companies set up yet.
  const noTransferCompanies = !loadingCompanies && companies.length === 0;
  const selectedCompany = companies.find((c) => c.companyID === transferCompanyId);
  const hasInternalEmployee = transferEmpIDUsedBy !== '';
  const hasHrEmployee = transferEmpID.trim() !== '';

  return (
    <>
    <Modal title="Transfer Asset" onClose={onClose} zIndexClassName={zIndexClassName}>
      <form onSubmit={handleSubmit}>
        {isUnderInventory && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-700">
            Asset is under inventory and cannot be transferred.
          </div>
        )}

        <FormRow label="Transfer Date *">
          <input
            type="date"
            className="input-base"
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            required
            disabled={isUnderInventory}
          />
        </FormRow>

        <FormRow label="Company *">
          <Select
            value={transferCompanyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            disabled={loadingCompanies || noTransferCompanies || isUnderInventory}
            required
          >
            <option value="">
              {loadingCompanies
                ? 'Loading companies…'
                : noTransferCompanies
                  ? "No companies found in this asset's country"
                  : 'Select company…'}
            </option>
            {companies.map((company) => (
              <option key={company.companyID} value={company.companyID}>
                {company.companyName} ({company.companyAbbreviation})
              </option>
            ))}
          </Select>
        </FormRow>

        <FormRow label={hasHrEmployee ? 'Used By (Internal Employee)' : 'Used By (Internal Employee) *'}>
          <Select
            value={transferEmpIDUsedBy}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value);
              setTransferEmpIDUsedBy(value);
              if (value !== '') setTransferEmpID('');
            }}
            disabled={loadingEmployees || !transferCompanyId || hasHrEmployee || isUnderInventory}
            required={!hasHrEmployee}
          >
            <option value="">
              {loadingEmployees
                ? 'Loading employees…'
                : !transferCompanyId
                  ? 'Select company first'
                  : internalEmployees.length
                    ? 'Select employee…'
                    : 'No internal employees for this company'}
            </option>
            {internalEmployees.map((emp) => (
              <option key={emp.empIDUsedBy} value={emp.empIDUsedBy}>
                {emp.empFullName}
              </option>
            ))}
          </Select>
          {hasHrEmployee && (
            <p className="text-[11px] text-ink-300 mt-1">Disabled — an HR employee is selected below. Clear it to use an internal employee.</p>
          )}
        </FormRow>

        <FormRow label={hasInternalEmployee ? 'Used By (HR Employee)' : 'Used By (HR Employee) *'}>
          <Select
            value={transferEmpID}
            onChange={(e) => {
              setTransferEmpID(e.target.value);
              if (e.target.value) setTransferEmpIDUsedBy('');
            }}
            disabled={loadingEmployees || !transferCompanyId || hasInternalEmployee || isUnderInventory}
            required={!hasInternalEmployee}
          >
            <option value="">
              {loadingEmployees
                ? 'Loading employees…'
                : !transferCompanyId
                  ? 'Select company first'
                  : !selectedCompany?.hrSourceID
                    ? 'This company has no HR database configured'
                    : hrEmployees.length
                      ? 'Select employee…'
                      : 'No HR employees found'}
            </option>
            {hrEmployees.map((emp) => (
              <option key={emp.empID} value={emp.empID}>
                {formatHrEmployeeLabel(emp)}
              </option>
            ))}
          </Select>
          {hasInternalEmployee && (
            <p className="text-[11px] text-ink-300 mt-1">Disabled — an internal employee is selected above. Clear it to use an HR employee.</p>
          )}
        </FormRow>

        <div className="mt-5 mb-4 pt-4 border-t border-pearl-200">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400 mb-1">
            Location
          </p>
          <p className="text-[11px] text-ink-300 mb-3">
            Optional — leave as it is to keep the asset where it is.
          </p>

          <FormRow label="Location">
            <DropWithAdd
              onAdd={() => {
                setNewLocationName('');
                setQuickAdd('location');
              }}
              disabled={isUnderInventory || !assetCountryId}
            >
              <Select
                value={locationID}
                onChange={(e) =>
                  setLocationID(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={loadingLocations || isUnderInventory}
              >
                <option value="">
                  {loadingLocations ? 'Loading locations…' : 'Select location…'}
                </option>
                {locations.map((l) => (
                  <option key={l.locationID} value={l.locationID}>
                    {l.location}
                  </option>
                ))}
              </Select>
            </DropWithAdd>
          </FormRow>

          <FormRow label="Location Detail">
            <DropWithAdd
              onAdd={() => {
                setNewDetail({ floor: '', zone: '', room: '' });
                setQuickAdd('locDetail');
              }}
              disabled={isUnderInventory || !locationID}
            >
              <Select
                value={locDetailID}
                onChange={(e) =>
                  setLocDetailID(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={loadingLocDetails || !locationID || isUnderInventory}
                required={!!locationID}
              >
                <option value="">
                  {loadingLocDetails
                    ? 'Loading details…'
                    : locationID
                      ? 'Select location detail…'
                      : 'Select location first'}
                </option>
                {locDetails.map((d) => (
                  <option key={d.locDetailID} value={d.locDetailID}>
                    {formatLocationDetailLabel(d)}
                  </option>
                ))}
              </Select>
            </DropWithAdd>
          </FormRow>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting || isUnderInventory}
            className="btn-primary"
          >
            {submitting ? 'Transferring…' : 'Transfer'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>

    {quickAdd === 'location' && (
      <QuickAddModal
        title="New Location"
        onClose={() => setQuickAdd(null)}
        onSubmit={saveNewLocation}
        saving={quickAddSaving}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Location Name<span className="text-danger ml-0.5">*</span>
          </label>
          <input
            className={quickAddInputCls}
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            required
            maxLength={50}
            placeholder="e.g. Head Office"
            autoFocus
          />
        </div>
        <p className="text-[11px] text-ink-300">
          Created in {assetCountryId || 'this asset’s country'}, matching the asset’s company.
        </p>
      </QuickAddModal>
    )}

    {quickAdd === 'locDetail' && (
      <QuickAddModal
        title="New Location Detail"
        onClose={() => setQuickAdd(null)}
        onSubmit={saveNewLocDetail}
        saving={quickAddSaving}
      >
        <p className="text-[11px] text-ink-300">
          Added under{' '}
          <span className="font-semibold text-ink-600">
            {locations.find((l) => l.locationID === locationID)?.location ?? 'the selected location'}
          </span>
          .
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
              Floor<span className="text-danger ml-0.5">*</span>
            </label>
            <input
              className={quickAddInputCls}
              value={newDetail.floor}
              onChange={(e) => setNewDetail((p) => ({ ...p, floor: e.target.value }))}
              required
              maxLength={10}
              placeholder="e.g. 3"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Zone</label>
            <input
              className={quickAddInputCls}
              value={newDetail.zone}
              onChange={(e) => setNewDetail((p) => ({ ...p, zone: e.target.value }))}
              maxLength={10}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Room</label>
            <input
              className={quickAddInputCls}
              value={newDetail.room}
              onChange={(e) => setNewDetail((p) => ({ ...p, room: e.target.value }))}
              maxLength={10}
              placeholder="Optional"
            />
          </div>
        </div>
      </QuickAddModal>
    )}
    </>
  );
}