import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { handleApiError } from '../utils/errors';
import { notificationsApi } from '../api/notifications';
import { useNotifications } from '../contexts/NotificationContext';
import type { AppNotification, NotificationStatusFilter, NotificationsPage as NotificationsPageData } from '../types';
import PageHeader from '../components/ui/PageHeader';
import TablePagination from '../components/ui/TablePagination';
import { NotifIcon } from '../components/ui/NotificationDisplay';
import { fmtDateTime } from '../utils/date';

const PAGE_SIZE_OPTIONS: number[] = [10, 20, 30];

const FILTERS: { value: NotificationStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

/**
 * The full history, in contrast with the bell dropdown, which only ever shows unread.
 * Filtering and paging both happen in SQL — the page never holds more than it displays.
 */
export default function NotificationsPage() {
  const { markRead, markUnread, refreshUnread } = useNotifications();
  const navigate = useNavigate();
  const [page, setPage] = useState<NotificationsPageData | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<NotificationStatusFilter>('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setPage(null);
    notificationsApi.getList({ status, pageNumber, pageSize, signal: controller.signal })
      .then((r) => setPage(r.data))
      .catch((err) => {
        const name = (err as { name?: string })?.name;
        if (name === 'CanceledError' || name === 'AbortError') return;
        handleApiError(err, 'Failed to load notifications');
      });
    return () => controller.abort();
  }, [status, pageNumber, pageSize]);

  const loading = page === null;
  const totalCount = page?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  /**
   * Patch the row in place rather than refetching: on the Unread or Read tab a refetch
   * would pull the row out from under the cursor the instant it was toggled, and reflow
   * every row below it. The bell badge is kept honest by the context instead.
   */
  const applyToggle = useCallback((id: number, isRead: boolean) => {
    setPage((prev) => prev && {
      ...prev,
      items: prev.items.map((n) => (n.notifID === id ? { ...n, isRead } : n)),
    });
  }, []);

  async function toggleRead(n: AppNotification) {
    setBusyId(n.notifID);
    try {
      if (n.isRead) {
        await markUnread(n.notifID);
      } else {
        await markRead(n.notifID);
      }
      applyToggle(n.notifID, !n.isRead);
    } catch (err) {
      handleApiError(err, 'Failed to update the notification');
    } finally {
      setBusyId(null);
    }
  }

  async function openAsset(n: AppNotification) {
    if (!n.isRead) {
      try {
        await markRead(n.notifID);
      } catch {
        /* navigate anyway — read state is not worth blocking the click over */
      }
    }
    navigate(`/assets/${n.assetID}`);
  }

  function changeStatus(next: NotificationStatusFilter) {
    setStatus(next);
    setPageNumber(1);
    // A toggle made on another tab may still be un-mirrored in the bell if a request failed.
    void refreshUnread();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Every warranty and maintenance alert raised for you"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Notifications' }]}
      />

      <div className="px-4 sm:px-8 pt-4 pb-3 flex items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => changeStatus(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer',
              status === f.value
                ? 'bg-navy-600 text-white border-navy-600'
                : 'bg-white text-ink-400 border-pearl-200 hover:text-ink-600 hover:border-pearl-300',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 sm:px-8 pb-8">
        <div className="bg-white rounded-xl border border-pearl-200 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="bg-pearl-100 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                <tr>
                  <th className="text-left px-4 py-2.5 w-24">Type</th>
                  <th className="text-left px-4 py-2.5">Notification</th>
                  <th className="text-left px-4 py-2.5 w-40">Received</th>
                  <th className="text-right px-4 py-2.5 w-32">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pearl-100">
                {loading ? (
                  <tr><td colSpan={4} className="text-center text-ink-300 py-8">Loading…</td></tr>
                ) : (page?.items.length ?? 0) === 0 ? (
                  <tr><td colSpan={4} className="text-center text-ink-300 py-8">No notifications to show.</td></tr>
                ) : (
                  page!.items.map((n) => (
                    <tr
                      key={n.notifID}
                      onClick={() => openAsset(n)}
                      className={clsx(
                        'cursor-pointer transition-colors hover:bg-pearl-50',
                        !n.isRead && 'bg-[#fffbeb]',
                      )}
                    >
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 text-ink-500">
                          <NotifIcon type={n.type} />
                          {n.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-start gap-2">
                          {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                          <span className={clsx('text-ink-700 whitespace-pre-line break-words', !n.isRead && 'font-semibold')}>
                            {n.message}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 num text-ink-400 whitespace-nowrap">{fmtDateTime(n.createdAt)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={busyId === n.notifID}
                          onClick={(e) => { e.stopPropagation(); void toggleRead(n); }}
                          className="px-2.5 py-1 rounded-md border border-pearl-200 bg-white text-[11px] font-semibold text-ink-500 hover:text-ink-800 hover:border-pearl-300 disabled:opacity-40 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {n.isRead ? 'Mark unread' : 'Mark read'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-pearl-200">
            <TablePagination
              summary={totalCount > 0
                ? `Showing ${(pageNumber - 1) * pageSize + 1} to ${Math.min(pageNumber * pageSize, totalCount)} of ${totalCount} notifications`
                : 'No notifications to display'}
              pageNumber={pageNumber}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }}
              onPrevious={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              onFirst={() => setPageNumber(1)}
              onLast={() => setPageNumber(totalPages)}
              onGoToPage={(p) => setPageNumber(p)}
              disabled={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
