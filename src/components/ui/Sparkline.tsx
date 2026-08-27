interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * A tile decoration, not a chart — no axes, no legend, no empty-state message. Renders
 * nothing at all below two points rather than a meaningless single dot or flat line.
 */
export default function Sparkline({ values, width = 120, height = 28, className }: SparklineProps) {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min;
  const pad = 3;
  const plotHeight = height - pad * 2;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = range === 0 ? height / 2 : pad + plotHeight - ((v - min) / range) * plotHeight;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} preserveAspectRatio="none">
      <polyline
        points={points.join(' ')}
        fill="none"
        style={{ stroke: 'var(--gold-500)' }}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
