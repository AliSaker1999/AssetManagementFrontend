import { useState } from 'react';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  message: string;
  resolve: (confirmed: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  function confirm(message: string, options?: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      setState({ message, resolve, danger: true, ...options });
    });
  }

  function handleClose(confirmed: boolean) {
    state?.resolve(confirmed);
    setState(null);
  }

  const dialog = state ? (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {state.title && (
          <h3 className="text-[15px] font-bold text-brand mb-2">{state.title}</h3>
        )}
        <p className="text-[14px] text-[#444] leading-relaxed mb-6">{state.message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleClose(false)}
            className="px-5 py-2 rounded-lg border border-[#ddd] text-[#555] text-sm font-semibold bg-white hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => handleClose(true)}
            className={
              state.danger
                ? 'px-5 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer transition-colors bg-[#c0392b] hover:bg-[#a93226]'
                : 'px-5 py-2 rounded-lg border-none text-white text-sm font-semibold cursor-pointer transition-colors bg-[#9a7c4b] hover:bg-[#7d6339]'
            }
          >
            {state.confirmLabel ?? (state.danger ? 'Delete' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}

