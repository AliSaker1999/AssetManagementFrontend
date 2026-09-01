import clsx from 'clsx';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'navy' | 'gold' | 'success' | 'warning' | 'danger' | 'none' | 'percent' ;
  icon?: ReactNode;
  className?: string;
  /** Optional small decoration below the value/sub — e.g. a Sparkline. Unused by most callers. */
  chart?: ReactNode;
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

/** Icon-badge background — only used when `icon` is passed (see below). Matches DashboardPage's stat cards. */
const badgeBg: Record<string, string> = {
  navy:    'bg-blue-600',
  gold:    'bg-gold-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-rose-500',
  none:    'bg-ink-300',
  percent: 'bg-sky-500',
};

export default function MetricCard({ label, value, sub, accent = 'none', icon, className, chart }: Props) {
  // Icon-badge style: mirrors DashboardPage's top metric cards — a colored rounded-square
  // icon badge on the left, label/value/sub stacked on the right.
  if (icon) {
    return (
      <div className={clsx('bg-white rounded-2xl p-4 shadow-sm border border-pearl-100 flex items-center gap-4 min-w-0', className)}>
        <div className={clsx('w-12 h-12 shrink-0 rounded-2xl text-white flex items-center justify-center shadow-sm', badgeBg[accent])}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">{label}</div>
          <div className="text-2xl font-extrabold text-ink-900 leading-tight num truncate">{value}</div>
          {sub && <div className="text-[11px] font-medium text-ink-400 mt-0.5">{sub}</div>}
          {chart && <div className="mt-1">{chart}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      'bg-white rounded-xl border border-pearl-200 shadow-card p-4 flex flex-col gap-1 border-t-4 min-w-0',
      accentBar[accent],
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-300">{label}</div>
      </div>
      <div className="text-lg sm:text-xl font-extrabold text-ink-800 leading-tight num truncate">{value}</div>
      {sub && <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>}
      {chart && <div className="mt-1">{chart}</div>}
    </div>
  );
}
