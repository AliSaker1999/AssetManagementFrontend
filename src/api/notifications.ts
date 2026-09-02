import client from './client';
import type { NotificationStatusFilter, NotificationsPage } from '../types';

interface ListParams {
  status?: NotificationStatusFilter;
  pageNumber?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export const notificationsApi = {
  /** One page, newest first. The server filters and pages in SQL — never fetch and slice here. */
  getList: ({ status = 'all', pageNumber = 1, pageSize = 50, signal }: ListParams = {}) =>
    client.get<NotificationsPage>('/notifications', {
      params: { status, pageNumber, pageSize },
      signal,
    }),
  getUnreadCount: () => client.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => client.put(`/notifications/${id}/read`, {}),
  markUnread: (id: number) => client.put(`/notifications/${id}/unread`, {}),
  markAllRead: () => client.put('/notifications/read-all', {}),
};
