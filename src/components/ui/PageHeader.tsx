import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, breadcrumbs, actions, className }: Props) {
  return (
    <div className={clsx('bg-white border-b border-pearl-200 px-8 py-4', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-2 text-[12px]">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-200">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="text-ink-300 hover:text-ink-600 no-underline transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-800 font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-ink-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-ink-300 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
