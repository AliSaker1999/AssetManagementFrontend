import React, { useState, useEffect, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Select from '../components/ui/Select';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import { handleApiError } from '../utils/errors';
import type { Company, HrCompanyProfile, HrEmployee } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatHrEmployeeLabel(emp: HrEmployee) {
  const empId = emp.empID?.trim() ?? '';
  const rawName = emp.fullName?.trim() ?? '';
  const cleanedName = rawName.replace(/\s*,?\s*\([^)]*\)\s*$/, '').trim();
  const name = cleanedName || rawName;
  return `${name} – ${empId}`;
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
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

// ─── Main Component ───────────────────────────────────────────────────────

export interface TransferAssetModalProps {
  /** The asset to be transferred. Requires assetID, companyID, and current statusID. */
  asset: {
    assetID: number;
    companyID?: number | null;
    statusID?: number;
  };
  /** Whether the modal is open. */
  open: boolean;
  /** Callback when the modal should close (e.g., user clicks cancel or after successful transfer). */
  onClose: () => void;
  /** Callback after a successful transfer; receives the new employee ID. */
  onTransferred: (newEmpID: string) => void;
}

export default function TransferAssetModal({
  asset,
  open,
  onClose,
  onTransferred,
}: TransferAssetModalProps) {
  // ─── State ──────────────────────────────────────────────────────────────
  const [transferDate, setTransferDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [transferCompanyProfileID, setTransferCompanyProfileID] = useState<number | ''>('');
  const [transferEmpID, setTransferEmpID] = useState<string>('');
  // The asset's company names its HR source directly. This used to derive a countryID
  // instead, which cannot work once a country has more than one HR database.
  const [transferHrSourceId, setTransferHrSourceId] = useState<number | ''>('');
  const [transferCompanies, setTransferCompanies] = useState<HrCompanyProfile[]>([]);
  const [transferEmployees, setTransferEmployees] = useState<HrEmployee[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ─── Effects ────────────────────────────────────────────────────────────

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTransferDate(new Date().toISOString().slice(0, 10));
      setTransferCompanyProfileID('');
      setTransferEmpID('');
      setTransferHrSourceId('');
      setTransferCompanies([]);
      setTransferEmployees([]);
    }
  }, [open]);

  // Load transfer companies from the HR source the asset's company reads
  useEffect(() => {
    if (!open || !asset) {
      setTransferCompanies([]);
      setTransferHrSourceId('');
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
        const hrSourceId = assetCompany?.hrSourceID;
        if (!hrSourceId) {
          throw new Error("This asset's company has no HR database configured, so it cannot be transferred to an HR employee.");
        }

        const hrCompaniesRes = await lookupsApi.getHrCompanies(hrSourceId);
        if (!isMounted) return;

        setTransferHrSourceId(hrSourceId);
        setTransferCompanies(hrCompaniesRes.data as HrCompanyProfile[]);
      } catch (err) {
        if (!isMounted) return;
        setTransferHrSourceId('');
        setTransferCompanies([]);
        handleApiError(err, 'Failed to load transfer companies');
      } finally {
        if (isMounted) setLoadingCompanies(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [open, asset]);

  // Load employees when a company is selected
  useEffect(() => {
    if (!open || !transferHrSourceId || !transferCompanyProfileID) {
      setTransferEmployees([]);
      return;
    }

    let isMounted = true;
    setLoadingEmployees(true);

    lookupsApi
      .getHrEmployeesByCompanyProfile(
        Number(transferHrSourceId),
        Number(transferCompanyProfileID)
      )
      .then((res) => {
        if (!isMounted) return;
        setTransferEmployees(res.data as HrEmployee[]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setTransferEmployees([]);
        handleApiError(err, 'Failed to load transfer employees');
      })
      .finally(() => {
        if (isMounted) setLoadingEmployees(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, transferHrSourceId, transferCompanyProfileID]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleCompanyChange = (value: string) => {
    setTransferCompanyProfileID(value === '' ? '' : Number(value));
    setTransferEmpID(''); // reset employee when company changes
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validation
    if (!transferDate) {
      toast.error('Transfer date is required');
      return;
    }
    if (!transferHrSourceId) {
      toast.error('Transfer company lookups are not available for this asset.');
      return;
    }
    if (!transferCompanyProfileID) {
      toast.error('Select a transfer company');
      return;
    }
    if (!transferEmpID.trim()) {
      toast.error('Select a transfer employee');
      return;
    }

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
        transferCompanyProfileID: transferCompanyProfileID,
        transferEmpID: transferEmpID.trim(),
      });

      toast.success('Asset transferred successfully');
      onTransferred(transferEmpID.trim());
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

  return (
    <Modal title="Transfer Asset" onClose={onClose}>
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
            value={transferCompanyProfileID}
            onChange={(e) => handleCompanyChange(e.target.value)}
            disabled={loadingCompanies || isUnderInventory}
            required
          >
            <option value="">
              {loadingCompanies ? 'Loading companies…' : 'Select company…'}
            </option>
            {transferCompanies.map((company) => (
              <option
                key={company.companyProfileID}
                value={company.companyProfileID}
              >
                {company.prmName} ({company.companyProfileID})
              </option>
            ))}
          </Select>
        </FormRow>

        <FormRow label="Employee *">
          <Select
            value={transferEmpID}
            onChange={(e) => setTransferEmpID(e.target.value)}
            disabled={
              loadingEmployees || !transferCompanyProfileID || isUnderInventory
            }
            required
          >
            <option value="">
              {loadingEmployees
                ? 'Loading employees…'
                : transferCompanyProfileID
                ? 'Select employee…'
                : 'Select company first'}
            </option>
            {transferEmployees.map((emp) => (
              <option key={emp.empID} value={emp.empID}>
                {formatHrEmployeeLabel(emp)}
              </option>
            ))}
          </Select>
        </FormRow>

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
  );
}