import clsx from 'clsx';
import type { ChartDatum } from './BarChart';

export interface RankedDatum extends ChartDatum {
  /** Small pill next to the label — e.g. a country code, to disambiguate a non-unique label. */
  badge?: string;
  /** Muted second line below the label — e.g. the full company name. */
  sublabel?: string;
}

interface RankedBarsProps {
  data: RankedDatum[];
  formatValue?: (n: number) => string;
  emptyMessage?: string;
  className?: string;
  /** Rows become clickable when passed; omit to render an informational, non-interactive list. */
  onItemClick?: (datum: RankedDatum, index: number) => void;
}

const defaultFormat = (n: number) => n.toLocaleString();

/** Ranked leaderboard style for Company/Country breakdowns — rank badge, mini progress bar, % share. */
export default function RankedBars({
  data,
  formatValue = defaultFormat,
  emptyMessage = 'No data to show.',
  className,
  onItemClick,
}: RankedBarsProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  if (isEmpty) {
    return (
      <div className={clsx('flex items-center justify-center py-10 text-[13px] text-ink-300', className)}>
        {emptyMessage}
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={clsx('flex flex-col gap-2.5', className)}>
      {data.map((d, i) => {
        const pct = (d.value / total) * 100;
        const barPct = (d.value / max) * 100;
        return (
          <div
            key={`${d.label}-${i}`}
            onClick={onItemClick ? () => onItemClick(d, i) : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 transition-colors',
              onItemClick && 'cursor-pointer hover:bg-pearl-50'
            )}
          >
            <div
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                i === 0 ? 'bg-gold-400 text-white' : 'bg-pearl-100 text-ink-400'
              )}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-semibold text-ink-800 truncate">{d.label}</span>
                  {d.badge && (
                    <span className="text-[10px] font-semibold text-ink-400 bg-pearl-100 border border-pearl-200 rounded px-1 py-0.5 shrink-0">
                      {d.badge}
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-ink-300 shrink-0">
                  <span className="num font-semibold text-ink-800">{formatValue(d.value)}</span> · {pct.toFixed(0)}%
                </span>
              </div>
              {d.sublabel && <div className="text-[11px] text-ink-300 truncate mb-1">{d.sublabel}</div>}
              <div className="h-1.5 rounded-full bg-pearl-200 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barPct}%`, background: i === 0 ? 'var(--gold-400)' : 'var(--navy-600)' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
