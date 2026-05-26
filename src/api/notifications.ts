import client from './client';

export const notificationsApi = {
  getAll: () => client.get('/notifications'),
  getUnreadCount: () => client.get('/notifications/unread-count'),
  markRead: (id: number) => client.put(`/notifications/${id}/read`, {}),
  markAllRead: () => client.put('/notifications/read-all', {}),
};
