import Select from './ui/Select';
import type { Damage } from '../types';
import { fmtDate, todayIso } from '../utils/date';

/** Inline "the damage isn't on file yet" fields on a maintenance modal. */
export type NewDamageForm = { damageDate: string; damageDesc: string };

export function emptyNewDamage(): NewDamageForm {
  return { damageDate: todayIso(), damageDesc: '' };
}

const inp = 'input-base';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">
      {children}
    </label>
  );
}

/**
 * The damage a maintenance repairs — required, since a maintenance is by definition the
 * repair of a recorded fault.
 *
 * Two modes in one control: pick one of the asset's open damages, or record a new one
 * inline. Inline matters because the alternative is sending the user out to the Damage tab
 * and back, losing everything already typed into the maintenance form.
 *
 * `damages` must already be the server-filtered selectable set (open, and not already out
 * for repair), so everything offered here is something the API will actually accept.
 *
 * Shared by the asset detail page and the assets list, which both send assets to
 * maintenance and must enforce the same rule.
 */
export default function DamagePicker({
  damages, damageID, onSelect, newDamage, onNewDamageChange,
}: {
  damages: Damage[];
  damageID: number | '';
  onSelect: (id: number | '') => void;
  /** null = choosing an existing damage; set = recording a new one. */
  newDamage: NewDamageForm | null;
  onNewDamageChange: (v: NewDamageForm | null) => void;
}) {
  const creating = newDamage !== null;

  return (
    <div className="mb-4 rounded-xl border border-navy-100 bg-navy-50/40 p-4">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-600">
          Damage being repaired *
        </span>
        {/* Hidden when there is nothing to go back to, so the toggle never lands the user
            on an empty select. */}
        {(creating ? damages.length > 0 : true) && (
          <button
            type="button"
            onClick={() => onNewDamageChange(creating ? null : emptyNewDamage())}
            className="text-[11px] font-semibold text-navy-600 hover:text-navy-700 underline decoration-navy-200 hover:decoration-navy-500 cursor-pointer"
          >
            {creating ? 'Choose an existing damage' : '+ New damage'}
          </button>
        )}
      </div>

      {creating ? (
        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Date *</Label>
            <input
              className={inp}
              type="date"
              value={newDamage.damageDate}
              onChange={(e) => onNewDamageChange({ ...newDamage, damageDate: e.target.value })}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>What is wrong *</Label>
            <input
              className={inp}
              value={newDamage.damageDesc}
              onChange={(e) => onNewDamageChange({ ...newDamage, damageDesc: e.target.value })}
              maxLength={100}
              placeholder="e.g. fan making noise, screen has a line"
              required
            />
          </div>
        </div>
      ) : (
        <>
          <Select
            value={damageID}
            onChange={(e) => onSelect(e.target.value === '' ? '' : Number(e.target.value))}
            required
          >
            <option value="">Select the damage…</option>
            {damages.map((d) => (
              <option key={d.damageID} value={d.damageID}>
                {fmtDate(d.damageDate)} — {d.damageDesc}
              </option>
            ))}
          </Select>
          <div className="text-[11px] text-ink-400 mt-2">
            Only open damages that aren't already out for repair are listed.
          </div>
        </>
      )}
    </div>
  );
}
