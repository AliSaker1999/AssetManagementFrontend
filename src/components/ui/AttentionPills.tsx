import type { AttentionItem } from '../../types';

/** Shared by the dashboard's Needs Attention preview and the full Needs Attention page. */
export function kindPillClass(entityType: AttentionItem['entityType']) {
  return entityType === 'Warranty'
    ? 'bg-navy-50 text-navy-600 border border-navy-200'
    : 'bg-gold-50 text-gold-600 border border-gold-200';
}

export function categoryPillClass(category: AttentionItem['category']) {
  if (category === 'Overdue') return 'bg-danger-bg text-danger border border-danger/20';
  if (category === 'DueSoon') return 'bg-warning-bg text-warning border border-warning/20';
  return 'bg-pearl-100 text-ink-400 border border-pearl-200';
}

export function categoryLabel(category: AttentionItem['category']) {
  if (category === 'Overdue') return 'Overdue';
  if (category === 'DueSoon') return 'Due Soon';
  return 'Due Later';
}
