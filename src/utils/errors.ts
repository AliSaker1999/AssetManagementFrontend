import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export function parseApiError(err: unknown, fallback = 'Something went wrong'): string {
  const msg = (err as AxiosError<{ message?: string }>)?.response?.data?.message;
  return msg ?? fallback;
}

export function handleApiError(err: unknown, fallback = 'Something went wrong'): void {
  toast.error(parseApiError(err, fallback));
}
