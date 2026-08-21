import client from './client';
import type { PaginatedResponse, UserListItem } from '../types';

export const usersApi = {
  getUsers: () => client.get('/users'),
  getUsersPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<UserListItem>>('/users/paginated', { params: { pageNumber, pageSize } }),

  createUser: (data: { userName: string; password: string; fullName: string; emailAddress: string; roleID: number }) =>
    client.post('/users', data),

  updateUser: (id: number, data: { userName: string; password?: string; fullName: string; emailAddress: string; roleID: number }) =>
    client.put(`/users/${id}`, data),

  deleteUser: (id: number) => client.delete(`/users/${id}`),

  unlockUser: (id: number) => client.post(`/users/${id}/unlock`),

  getPermissions: (userId: number) => client.get(`/users/${userId}/permissions`),

  grantPermission: (userId: number, data: { countryID: string; companyID: number }) =>
    client.post(`/users/${userId}/permissions`, data),

  revokePermission: (userId: number, countryId: string, companyId: number) =>
    client.delete(`/users/${userId}/permissions/${countryId}/${companyId}`),
};
