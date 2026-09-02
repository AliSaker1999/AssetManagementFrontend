import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { warrantiesApi } from '../api/warranties';
import { handleApiError } from '../utils/errors';
import { fmtDate } from '../utils/date';
import type { Warranty } from '../types';

/**
 * "I know this warranty expires and we are not renewing it — stop tracking it."
 *
 * Shared by the Warranty tab on Asset Detail and by the Needs Attention table, the two
 * places the nagging is actually seen, so the copy, the API call and the toast stay in one
 * place. Resuming tracking needs no reason and goes through the plain useConfirm dialog at
 * each call site instead.
 */
export interface StopTrackingWarrantyModalProps {
  warntID: number;
  warrantyDesc: string;
  /** The warranty's ToDate, shown so the user can confirm they are stopping the right one. */
  toDate: string;
  onDone: (updated: Warranty) => void;
  onClose: () => void;
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</label>
      {children}
    </div>
  );
}

export default function StopTrackingWarrantyModal({
  warntID,
  warrantyDesc,
  toDate,
  onDone,
  onClose,
}: StopTrackingWarrantyModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await warrantiesApi.setNotRenewing(warntID, {
        notRenewing: true,
        reason: reason.trim() || null,
      });
      onDone(r.data as Warranty);
      toast.success('Tracking stopped for this warranty');
      onClose();
    } catch (err) {
      handleApiError(err, 'Could not stop tracking this warranty');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Stop Tracking This Warranty?" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="mb-4 rounded-lg border border-pearl-200 bg-pearl-50 px-4 py-3">
          <div className="text-[13px] font-semibold text-ink-800">{warrantyDesc}</div>
          <div className="text-[11px] text-ink-400 mt-0.5">Expires {fmtDate(toDate)}</div>
        </div>

        <p className="text-[13px] text-ink-600 leading-relaxed mb-3">
          Use this when you know the warranty is ending and you have decided not to renew it.
          It stops:
        </p>
        <ul className="text-[13px] text-ink-600 leading-relaxed mb-4 pl-5 list-disc space-y-1">
          <li>the daily expiry reminder emails</li>
          <li>the in-app alerts, including any still unread</li>
          <li>the Needs Attention entry on the dashboard and its reports</li>
        </ul>
        <p className="text-[12px] text-ink-400 leading-relaxed mb-4">
          The warranty record itself is kept, and you can resume tracking at any time from the
          asset&apos;s Warranty tab.
        </p>

        <FormRow label="Reason (optional)">
          <input
            className="input-base"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder="e.g. Equipment being replaced next quarter"
          />
        </FormRow>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Stopping…' : 'Stop Tracking'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
