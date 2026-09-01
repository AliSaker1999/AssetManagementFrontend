import { createPortal } from 'react-dom';
import Barcode from 'react-barcode';
import Modal from './Modal';

interface Props {
  assetCode: string;
  assetDesc: string;
  onClose: () => void;
}

export function BarcodeLabel({ assetCode, assetDesc }: Omit<Props, 'onClose'>) {
  return (
    <div className="barcode-label">
      <Barcode
        value={assetCode}
        format="CODE128"
        width={1.5}
        height={52}
        displayValue={false}
        margin={0}
        background="#ffffff"
        lineColor="#000000"
      />
      <div className="label-asset-code">{assetCode}</div>
      <div className="label-asset-desc">{assetDesc}</div>
    </div>
  );
}

export default function BarcodePrintModal({ assetCode, assetDesc, onClose }: Props) {
  return (
    <>
      {createPortal(
        <div id="barcode-print-target">
          <BarcodeLabel assetCode={assetCode} assetDesc={assetDesc} />
        </div>,
        document.body
      )}

      <Modal title="Print Barcode Label" onClose={onClose} width="max-w-[440px]">
        <div className="flex justify-center py-6 bg-pearl-50 rounded-lg border border-pearl-200 mb-5">
          <BarcodeLabel assetCode={assetCode} assetDesc={assetDesc} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => window.print()} className="btn-primary">Print Label</button>
        </div>
      </Modal>
    </>
  );
}
