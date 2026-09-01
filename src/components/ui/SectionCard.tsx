import type { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Navy-tinted card for metadata/info context */
  tinted?: boolean;
  /** Fixes the body to this pixel height and makes it scrollable — use to force equal-height cards in a grid row. */
  height?: number;
}

export default function SectionCard({ title, subtitle, actions, children, className, tinted, height }: Props) {
  return (
    <div className={clsx(
      'rounded-xl border shadow-card overflow-hidden flex flex-col',
      tinted ? 'bg-navy-50 border-navy-200' : 'bg-white border-pearl-200',
      className
    )}>
      {(title || actions) && (
        <div className={clsx(
          'flex items-center justify-between px-5 py-3.5 border-b shrink-0',
          tinted ? 'border-navy-200' : 'border-pearl-200'
        )}>
          <div>
            <div className="text-[13px] font-semibold text-ink-800">{title}</div>
            {subtitle && <div className="text-[11px] text-ink-300 mt-0.5">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div
        className={clsx('p-5', height != null && 'no-scrollbar')}
        style={height != null ? { height, overflowY: 'auto' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
