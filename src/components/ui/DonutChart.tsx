import clsx from 'clsx';
import { StatusIcon, statusColorHex } from './StatusIcon';

export interface DonutDatum {
  id?: string | number;
  label: string;
  value: number;
}

interface DonutChartProps {
  data: DonutDatum[];
  formatValue?: (n: number) => string;
  emptyMessage?: string;
  className?: string;
  /** Defaults to the shared per-status color grouping (StatusIcon.tsx) keyed by numeric id. */
  colorFor?: (id: DonutDatum['id']) => string;
  onItemClick?: (datum: DonutDatum, index: number) => void;
}

const defaultFormat = (n: number) => n.toLocaleString();
const SIZE = 116;
const STROKE = 15;
const RADIUS = (SIZE - STROKE) / 2;
// Circumference of the ring path — stroke-dasharray/-dashoffset below carve it into per-status arcs.
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Compact donut: ring + centered total, legend to the side with the same StatusIcon used on the Assets page. */
export default function DonutChart({
  data,
  formatValue = defaultFormat,
  emptyMessage = 'No data to show.',
  className,
  colorFor,
  onItemClick,
}: DonutChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  if (isEmpty) {
    return (
      <div className={clsx('flex items-center justify-center py-10 text-[13px] text-ink-300', className)}>
        {emptyMessage}
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const getColor = colorFor ?? ((id: DonutDatum['id']) => statusColorHex(typeof id === 'number' ? id : undefined));

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const dash = fraction * CIRCUMFERENCE;
    const offset = cumulative * CIRCUMFERENCE;
    cumulative += fraction;
    return { ...d, dash, offset, color: getColor(d.id) };
  });

  return (
    <div className={clsx('flex items-center gap-4', className)}>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* rotate(-90) moves the arc-drawing start point from 3 o'clock to 12 o'clock */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" style={{ stroke: 'var(--pearl-200)' }} strokeWidth={STROKE} />
            {segments.map((s, i) => (
              <circle
                key={`${s.label}-${i}`}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${s.dash} ${CIRCUMFERENCE - s.dash}`}
                strokeDashoffset={-s.offset}
                onClick={onItemClick ? () => onItemClick(s, i) : undefined}
                style={onItemClick ? { cursor: 'pointer' } : undefined}
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-300">Total</span>
          <span className="text-[15px] font-extrabold text-ink-800 num leading-tight">{formatValue(total)}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {segments.map((s, i) => {
          const pct = (s.value / total) * 100;
          return (
            <div
              key={`${s.label}-${i}`}
              onClick={onItemClick ? () => onItemClick(s, i) : undefined}
              className={clsx(
                'flex items-center gap-2 rounded-md -mx-1 px-1 py-0.5 transition-colors',
                onItemClick && 'cursor-pointer hover:bg-pearl-50'
              )}
            >
              <span
                className="rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: s.color, width: 18, height: 18 }}
              >
                <StatusIcon statusId={typeof s.id === 'number' ? s.id : undefined} />
              </span>
              <span className="flex-1 min-w-0 text-[12px] font-medium text-ink-800 truncate">{s.label}</span>
              <span className="text-[11px] text-ink-300 shrink-0 whitespace-nowrap">
                <span className="num font-semibold text-ink-800">{formatValue(s.value)}</span> · {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
