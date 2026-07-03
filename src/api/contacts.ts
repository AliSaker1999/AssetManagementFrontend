import client from './client';
import type { Contact, PaginatedResponse } from '../types';

export const contactsApi = {
  getList: () => client.get('/contacts'),
  getListPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<Contact>>('/contacts/paginated', { params: { pageNumber, pageSize } }),
  get: (id: number) => client.get(`/contacts/${id}`),
  getLookup: () => client.get('/contacts/lookup'),
  create: (data: object) => client.post('/contacts', data),
  update: (id: number, data: object) => client.put(`/contacts/${id}`, data),
  delete: (id: number) => client.delete(`/contacts/${id}`),
};
