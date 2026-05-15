import client from './client';

export const usersApi = {
  getUsers: () => client.get('/users'),

  createUser: (data: { userName: string; password: string; fullName: string; roleID: number }) =>
    client.post('/users', data),

  updateUser: (id: number, data: { userName: string; password?: string; fullName: string; roleID: number }) =>
    client.put(`/users/${id}`, data),

  deleteUser: (id: number) => client.delete(`/users/${id}`),

  getPermissions: (userId: number) => client.get(`/users/${userId}/permissions`),

  grantPermission: (userId: number, data: { countryID: string; companyID: number }) =>
    client.post(`/users/${userId}/permissions`, data),

  revokePermission: (userId: number, countryId: string, companyId: number) =>
    client.delete(`/users/${userId}/permissions/${countryId}/${companyId}`),
};
