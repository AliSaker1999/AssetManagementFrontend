import clsx from 'clsx';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'navy' | 'gold' | 'success' | 'warning' | 'danger' | 'none' | 'percent' ;
  icon?: ReactNode;
  className?: string;
}

const accentBar: Record<string, string> = {
  navy:    'border-t-navy-600',
  gold:    'border-t-gold-400',
  success: 'border-t-success',
  warning: 'border-t-warning',
  danger:  'border-t-danger',
  none:    'border-t-transparent',
  percent: 'border-t-percent',
};

export default function MetricCard({ label, value, sub, accent = 'none', icon, className }: Props) {
  return (
    <div className={clsx(
      'bg-white rounded-xl border border-pearl-200 shadow-card p-4 flex flex-col gap-1 border-t-4',
      accentBar[accent],
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-300">{label}</div>
        {icon && <div className="text-ink-300">{icon}</div>}
      </div>
      <div className="text-[26px] font-extrabold text-ink-800 leading-none num">{value}</div>
      {sub && <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>}
    </div>
  );
}
