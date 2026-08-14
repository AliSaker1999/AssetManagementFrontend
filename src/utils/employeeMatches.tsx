import type { ReactNode } from 'react';
import { lookupsApi } from '../api/lookups';
import type { EmployeePossibleMatches } from '../types';
import { fmtDate } from './date';

interface MatchPrompt {
  title: string;
  message: ReactNode;
  confirmLabel: string;
}

function MatchList({ heading, names }: { heading: string; names: string[] }) {
  return (
    <div>
      <div>{heading}</div>
      <ul className="list-none p-0 my-2 space-y-1">
        {names.map((name, i) => (
          <li key={i} className="font-bold text-ink-800">• {name}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Builds the "possible match" warning for a new internal employee.
 * Returns null when nothing similar was found in HR or in the internal employee table.
 */
export function buildEmployeeMatchPrompt(matches: EmployeePossibleMatches): MatchPrompt | null {
  const hr = matches.hrMatches ?? [];
  const internal = matches.internalMatches ?? [];
  if (hr.length === 0 && internal.length === 0) return null;

  const country = matches.countryID?.trim();

  const title =
    internal.length > 0 && hr.length > 0
      ? 'Possible employee match'
      : internal.length > 0
        ? 'Employee already exists'
        : 'Possible HR employee match';

  const message = (
    <div className="space-y-4">
      {internal.length > 0 && (
        <MatchList
          heading="Existing employee(s) already recorded:"
          names={internal.map(
            (m) =>
              `${m.empFullName}${m.companyName ? ` (${m.companyName})` : ''}${m.leaveDate ? ` — left ${fmtDate(m.leaveDate)}` : ''}`,
          )}
        />
      )}
      {hr.length > 0 && (
        <MatchList
          heading={`Possible HR employee match(es) were found${country ? ` in ${country}` : ''}:`}
          names={hr.map((m) => `${m.fullName}${m.prmName ? ` (${m.prmName})` : ''}`)}
        />
      )}
      <div>Do you want to continue and create the internal employee anyway?</div>
    </div>
  );

  return { title, message, confirmLabel: 'Create anyway' };
}

/**
 * Looks up possible HR / internal matches for a name and, when any are found,
 * asks the user to confirm. Returns true when it is OK to proceed.
 */
export async function confirmEmployeeMatches(
  companyId: number,
  empFullName: string,
  confirm: (message: ReactNode, options?: { title?: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>,
  excludeEmpId?: number,
): Promise<boolean> {
  const res = await lookupsApi.checkEmployeePossibleMatches(companyId, empFullName, excludeEmpId);
  const prompt = buildEmployeeMatchPrompt(res.data);
  if (!prompt) return true;

  return confirm(prompt.message, {
    title: prompt.title,
    confirmLabel: prompt.confirmLabel,
    danger: false,
  });
}
