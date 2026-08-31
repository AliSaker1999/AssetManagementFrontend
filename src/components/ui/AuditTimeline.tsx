import clsx from 'clsx';
import EmptyState from './EmptyState';
import { fmtDateTime } from '../../utils/date';
import type { AssetAuditEntry } from '../../types';

// Reuses only existing navy/gold/ink tokens — no new colors. Cool navy for the asset
// itself and its status; warm gold for the value/count-driven histories (depreciation,
// inventory); neutral ink shades for the three workflow-driven child records.
const ENTITY_DOT: Record<string, string> = {
  Asset: 'bg-navy-600',
  Status: 'bg-navy-400',
  Depreciation: 'bg-gold-600',
  Inventory: 'bg-gold-400',
  Warranty: 'bg-ink-500',
  Damage: 'bg-ink-700',
  Maintenance: 'bg-ink-300',
};

// Curated overrides for fields whose PascalCase name wouldn't read as clean prose
// otherwise (the fallback regex would turn "LocationID" into "Location I D").
const FIELD_LABELS: Record<string, string> = {
  AssetDesc: 'Description',
  LocationID: 'Location',
  LocDetailID: 'Location Detail',
  GroupID: 'Group',
  CategoryID: 'Category',
  ContactID: 'Contact',
  BrandID: 'Brand',
  OwnerID: 'Owner Type',
  OwnerDesc: 'Owner Info',
  EmpIDUsedBy: 'Used By',
  HrEmpIDUsedBy: 'Used By (HR)',
  UsedByNotMandatory: 'Used By Not Mandatory',
  SupplierContactID: 'Supplier',
  CurCode: 'Currency',
};

function humanizeField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/([A-Z])/g, ' $1').trim();
}

function summarize(entry: AssetAuditEntry): string {
  const shown = (value?: string) => value ?? '—';

  if (entry.entityType === 'Status') return `Status changed to ${shown(entry.newValue)}`;
  if (entry.entityType === 'Depreciation') return `Depreciation recorded — ${shown(entry.newValue)}`;
  if (entry.entityType === 'Inventory') return entry.newValue ?? 'Counted in inventory';

  if (entry.action !== 'Updated') {
    const kind = entry.entityType === 'Asset' ? 'Asset' : entry.entityType;
    return `${kind} ${entry.action.toLowerCase()}${entry.newValue ? ` — ${entry.newValue}` : ''}`;
  }

  if (!entry.fieldName) return `${entry.entityType} updated`;
  const prefix = entry.entityType === 'Asset' ? '' : `${entry.entityType} `;
  return `${prefix}${humanizeField(entry.fieldName)} changed from ${shown(entry.oldValue)} to ${shown(entry.newValue)}`;
}

interface AuditTimelineProps {
  entries: AssetAuditEntry[];
}

/** Unified "who changed what, when" timeline for the Asset Detail page's Activity tab. */
export default function AuditTimeline({ entries }: AuditTimelineProps) {
  if (entries.length === 0) return <EmptyState message="No activity recorded yet." />;

  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-pearl-200" />
      <ul className="space-y-4">
        {entries.map((entry, i) => (
          <li key={i} className="relative">
            <span
              className={clsx(
                'absolute -left-6 top-4 w-3 h-3 rounded-full ring-4 ring-white',
                ENTITY_DOT[entry.entityType] ?? 'bg-ink-300'
              )}
            />
            <div className="bg-white rounded-xl border border-pearl-200 shadow-card px-4 py-3">
              <p className="text-[13px] text-ink-700">{summarize(entry)}</p>
              <p className="text-[11px] text-ink-400 mt-1">
                {entry.changedByFullName ?? 'System'} · {fmtDateTime(entry.at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
