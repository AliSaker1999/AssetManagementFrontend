import clsx from 'clsx';

export interface ChartDatum {
  label: string;
  value: number;
  /** Second series, e.g. NetBookValue alongside DepreciationValue. Only used by variant="trend". */
  secondaryValue?: number;
  /** Original identifier (e.g. StatusID) to hand back on click. Ignored by variant="trend". */
  id?: string | number;
}

interface BarChartProps {
  data: ChartDatum[];
  /** 'bars': horizontal category bars (status/company/country counts). 'trend': monthly bar+line. */
  variant?: 'bars' | 'trend';
  valueLabel?: string;
  secondaryLabel?: string;
  formatValue?: (n: number) => string;
  emptyMessage?: string;
  className?: string;
  /** variant="bars" only — rows become clickable when this is passed. */
  onItemClick?: (datum: ChartDatum, index: number) => void;
}

const defaultFormat = (n: number) => n.toLocaleString();

function truncateLabel(label: string, max = 20) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

/**
 * Hand-rolled inline SVG — this app has no charting library and hand-rolls every UI
 * primitive to match the Royal Elevation design system, and a handful of category bars or a
 * ~12-point monthly trend don't need one. No numeric axis or hover tooltips (no
 * interaction library here either); exact figures are surfaced as plain text instead.
 */
export default function BarChart({
  data,
  variant = 'bars',
  valueLabel,
  secondaryLabel,
  formatValue = defaultFormat,
  emptyMessage = 'No data to show.',
  className,
  onItemClick,
}: BarChartProps) {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0 && (d.secondaryValue ?? 0) === 0);

  if (isEmpty) {
    return (
      <div className={clsx('flex items-center justify-center py-10 text-[13px] text-ink-300', className)}>
        {emptyMessage}
      </div>
    );
  }

  return variant === 'trend' ? (
    <TrendChart data={data} valueLabel={valueLabel} secondaryLabel={secondaryLabel} formatValue={formatValue} className={className} />
  ) : (
    <CategoryBars data={data} formatValue={formatValue} className={className} onItemClick={onItemClick} />
  );
}

function CategoryBars({
  data,
  formatValue,
  className,
  onItemClick,
}: {
  data: ChartDatum[];
  formatValue: (n: number) => string;
  className?: string;
  onItemClick?: (datum: ChartDatum, index: number) => void;
}) {
  const rowHeight = 32;
  const max = Math.max(1, ...data.map((d) => d.value));
  const trackStart = 150;
  const trackEnd = 430;
  const trackWidth = trackEnd - trackStart;

  return (
    <div className={className}>
      <svg viewBox={`0 0 480 ${data.length * rowHeight}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const y = i * rowHeight;
          const barWidth = Math.max(2, (d.value / max) * trackWidth);
          return (
            <g
              key={`${d.label}-${i}`}
              onClick={onItemClick ? () => onItemClick(d, i) : undefined}
              style={onItemClick ? { cursor: 'pointer' } : undefined}
            >
              {onItemClick && <rect x={0} y={y} width={480} height={rowHeight} fill="transparent" />}
              <text x={0} y={y + rowHeight / 2 + 4} style={{ fontSize: 12, fill: 'var(--ink-800)' }}>
                {truncateLabel(d.label)}
              </text>
              <rect x={trackStart} y={y + rowHeight / 2 - 7} width={trackWidth} height={14} rx={4} style={{ fill: 'var(--pearl-200)' }} />
              <rect x={trackStart} y={y + rowHeight / 2 - 7} width={barWidth} height={14} rx={4} style={{ fill: 'var(--navy-600)' }} />
              <text x={480} y={y + rowHeight / 2 + 4} textAnchor="end" className="num" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--ink-800)' }}>
                {formatValue(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TrendChart({
  data,
  valueLabel,
  secondaryLabel,
  formatValue,
  className,
}: {
  data: ChartDatum[];
  valueLabel?: string;
  secondaryLabel?: string;
  formatValue: (n: number) => string;
  className?: string;
}) {
  const width = 600;
  const chartTop = 16;
  const chartBottom = 150;
  const axisY = 172;
  const chartHeight = chartBottom - chartTop;
  const colWidth = width / data.length;
  // Independent scales: DepreciationValue and NetBookValue can differ by orders of
  // magnitude, so a shared linear scale would crush whichever series is smaller.
  const maxPrimary = Math.max(1, ...data.map((d) => d.value));
  const maxSecondary = Math.max(1, ...data.map((d) => d.secondaryValue ?? 0));

  const points = data.map((d, i) => ({
    x: colWidth * i + colWidth / 2,
    y: chartBottom - ((d.secondaryValue ?? 0) / maxSecondary) * chartHeight,
  }));
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const latest = data[data.length - 1];

  return (
    <div className={className}>
      {(valueLabel || secondaryLabel) && (
        <div className="flex items-center gap-4 mb-2 text-[11px] text-ink-300">
          {valueLabel && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm inline-block" style={{ background: 'var(--gold-400)' }} />
              {valueLabel}
            </span>
          )}
          {secondaryLabel && (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--navy-600)' }} />
              {secondaryLabel}
            </span>
          )}
        </div>
      )}
      <svg viewBox={`0 0 ${width} 190`} width="100%" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const x = colWidth * i;
          const barWidth = Math.max(2, colWidth * 0.4);
          const barHeight = Math.max(1, (d.value / maxPrimary) * chartHeight);
          return (
            <g key={`${d.label}-${i}`}>
              <rect
                x={x + colWidth / 2 - barWidth / 2}
                y={chartBottom - barHeight}
                width={barWidth}
                height={barHeight}
                rx={2}
                style={{ fill: 'var(--gold-400)' }}
              />
              <text x={x + colWidth / 2} y={axisY} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--ink-300)' }}>
                {d.label}
              </text>
            </g>
          );
        })}
        <polyline points={polylinePoints} fill="none" style={{ stroke: 'var(--navy-600)' }} strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} style={{ fill: 'var(--navy-600)' }} />
        ))}
      </svg>
      {latest && (
        <div className="flex items-center gap-4 mt-2 text-[12px]">
          <span className="text-ink-300">Latest month:</span>
          {valueLabel && <span className="num-cost font-semibold">{formatValue(latest.value)}</span>}
          {secondaryLabel && latest.secondaryValue !== undefined && (
            <span className="num-value font-semibold">{formatValue(latest.secondaryValue)}</span>
          )}
        </div>
      )}
    </div>
  );
}
