import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

/** Longer than this is a stack trace or an HTML error page, not a message for a toast. */
const MAX_MESSAGE_LENGTH = 300;

function usable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > MAX_MESSAGE_LENGTH || text.startsWith('<')) return null;
  return text;
}

export function parseApiError(err: unknown, fallback = 'Something went wrong'): string {
  const data = (err as AxiosError)?.response?.data as unknown;

  // ASP.NET returns several shapes. BadRequest("text") is a bare JSON string, which
  // is the most common one in this API, so check it first.
  const bare = usable(data);
  if (bare) return bare;

  if (data && typeof data === 'object') {
    const body = data as {
      message?: unknown;
      detail?: unknown;
      title?: unknown;
      errors?: Record<string, unknown>;
    };

    // { message } from hand-rolled responses, then ProblemDetails.detail.
    const direct = usable(body.message) ?? usable(body.detail);
    if (direct) return direct;

    // Model-validation ProblemDetails: { errors: { Field: ["msg", ...] } }
    if (body.errors && typeof body.errors === 'object') {
      for (const entry of Object.values(body.errors)) {
        const first = Array.isArray(entry)
          ? entry.map(usable).find((m): m is string => m !== null)
          : usable(entry);
        if (first) return first;
      }
    }

    const title = usable(body.title);
    if (title) return title;
  }

  return fallback;
}

export function handleApiError(err: unknown, fallback = 'Something went wrong'): void {
  toast.error(parseApiError(err, fallback));
}
