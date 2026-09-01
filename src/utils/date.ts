/**
 * Every date the app *displays* is dd/mm/yyyy. Use these two helpers rather than
 * rendering a raw API value or reaching for toLocaleDateString.
 *
 * Note what these deliberately do NOT touch: `<input type="date">`. Its value attribute is
 * required by HTML to be yyyy-mm-dd, and the browser renders the picker in the user's own
 * OS locale — neither is ours to change without replacing every date field with a custom
 * picker. So forms stay ISO; everything read-only goes through here.
 *
 * WHY THE REGEX, AND NOT new Date(value):
 * The API sends date-only values as "2026-08-13". `new Date("2026-08-13")` parses that as
 * UTC midnight, so anywhere west of Greenwich it renders as the 12th — an off-by-one-day
 * bug that only appears for some users. Reordering the string's own digits avoids parsing
 * altogether, so the date shown is exactly the date stored. `new Date` is only the
 * fallback for values that aren't ISO at all.
 */

/** Captures yyyy-mm-dd, plus HH:mm when the value carries a time. */
const ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

const pad = (n: number) => String(n).padStart(2, '0');

/** Placeholder for a missing date — matches what the tables already use for empty cells. */
const EMPTY = '—';

/** dd/mm/yyyy. Returns the input untouched if it isn't a date at all. */
export function fmtDate(value?: string | Date | null): string {
  if (value == null || value === '') return EMPTY;

  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? EMPTY
      : `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
  }

  const m = ISO.exec(value);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  const d = new Date(value);
  return isNaN(d.getTime())
    ? value
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * dd/mm/yyyy · HH:mm, 24-hour. The middle dot is padded with non-breaking spaces so a
 * narrow table cell can't split the date from the time across two lines.
 * Falls back to plain dd/mm/yyyy when the value carries no time.
 */
export function fmtDateTime(value?: string | Date | null): string {
  if (value == null || value === '') return EMPTY;

  if (value instanceof Date) {
    return isNaN(value.getTime())
      ? EMPTY
      : `${fmtDate(value)} · ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }

  const m = ISO.exec(value);
  if (m) {
    const date = `${m[3]}/${m[2]}/${m[1]}`;
    return m[4] != null ? `${date} · ${m[4]}:${m[5]}` : date;
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? value : `${fmtDate(d)} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Today as yyyy-mm-dd, for seeding `<input type="date">` values. Local, not UTC. */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}





