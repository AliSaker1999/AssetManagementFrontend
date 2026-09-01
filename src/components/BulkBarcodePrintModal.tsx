import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Modal from './Modal';
import { BarcodeLabel } from './BarcodePrintModal';
import { assetsApi } from '../api/assets';
import { handleApiError } from '../utils/errors';
import type { AssetListItem } from '../types';

interface Props {
  companyId?: number;
  search: string;
  statusIds: number[];
  onClose: () => void;
}

/** Above this many labels, require an explicit "continue anyway" before enabling Print. */
const LARGE_PRINT_THRESHOLD = 200;

/**
 * Prints one label per asset in the current filtered view, each its own physical page —
 * see BarcodePrintModal / the print CSS in index.css for the shared per-label layout this
 * reuses. Fetch is intentionally once-per-mount: this modal is always mounted fresh with the
 * view's current filters captured at open time, not kept in sync with a still-open instance.
 */
export default function BulkBarcodePrintModal({ companyId, search, statusIds, onClose }: Props) {
  const [assets, setAssets] = useState<AssetListItem[] | null>(null); // null = loading
  const [confirmedLarge, setConfirmedLarge] = useState(false);

  useEffect(() => {
    let cancelled = false;
    assetsApi.getList(companyId, search, statusIds)
      .then((r) => { if (!cancelled) setAssets(r.data); })
      .catch((err) => {
        if (cancelled) return;
        handleApiError(err, 'Failed to load assets');
        onClose();
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = assets === null;
  const printable = assets ?? [];
  const needsConfirmation = printable.length > LARGE_PRINT_THRESHOLD && !confirmedLarge;

  return (
    <>
      {!loading && printable.length > 0 && createPortal(
        <div id="barcode-print-target">
          {printable.map((a) => (
            <BarcodeLabel key={a.assetID} assetCode={a.assetCode} assetDesc={a.assetDesc} />
          ))}
        </div>,
        document.body
      )}

      <Modal title="Print Barcode Labels" onClose={onClose} width="max-w-[440px]">
        {loading ? (
          <div className="text-center text-[13px] text-ink-400 py-8">Loading assets…</div>
        ) : (
          <>
            <p className="text-[13px] text-ink-600 mb-4">
              <span className="font-semibold">{printable.length}</span> label{printable.length === 1 ? '' : 's'} ready to print
            </p>
            {needsConfirmation && (
              <div className="bg-warning-bg border border-warning/20 text-warning text-[13px] rounded-lg px-3 py-2.5 mb-4">
                You're about to print {printable.length} labels — this uses that many sheets/labels.{' '}
                <button onClick={() => setConfirmedLarge(true)} className="underline font-semibold">Continue anyway</button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={() => window.print()}
                disabled={printable.length === 0 || needsConfirmation}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Print{printable.length > 0 ? ` (${printable.length})` : ''}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
