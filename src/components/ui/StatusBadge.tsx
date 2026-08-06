import clsx from 'clsx';

type Status = 'active' | 'inactive' | 'maintenance' | 'disposed' | 'missing' | string;

function normalize(raw: string | null | undefined): Status {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('inactiv') || s.includes('idle')) return 'inactive';
  if (s.includes('maint')) return 'maintenance';
  if (s.includes('dispos') || s.includes('retire')) return 'disposed';
  if (s.includes('miss') || s.includes('lost')) return 'missing';
  if (s.includes('activ')) return 'active';
  return s || 'active';
}

const styles: Record<string, string> = {
  active:      'bg-success-bg text-success border border-success/20',
  inactive:    'bg-pearl-100 text-ink-400 border border-pearl-200',
  maintenance: 'bg-warning-bg text-warning border border-warning/20',
  disposed:    'bg-danger-bg text-danger border border-danger/20',
  missing:     'bg-gold-50 text-gold-600 border border-gold-200',
};

const dots: Record<string, string> = {
  active:      'bg-success',
  inactive:    'bg-ink-300',
  maintenance: 'bg-warning',
  disposed:    'bg-danger',
  missing:     'bg-gold-500',
};

const labels: Record<string, string> = {
  active:      'Active',
  inactive:    'Inactive',
  maintenance: 'Maintenance',
  disposed:    'Disposed',
  missing:     'Missing',
};

interface Props {
  status?: string | null;
  className?: string;
}

export default function StatusBadge({ status, className }: Props) {
  const key = normalize(status);
  const style = styles[key] ?? styles.active;
  const dot = dots[key] ?? dots.active;
  const label = labels[key] ?? (status ? status : 'Active');

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium',
      style,
      className
    )}>
      <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {label}
    </span>
  );
}
