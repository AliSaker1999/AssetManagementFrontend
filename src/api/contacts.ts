import client from './client';

export const contactsApi = {
  getList: () => client.get('/contacts'),
  get: (id: number) => client.get(`/contacts/${id}`),
  getLookup: () => client.get('/contacts/lookup'),
  create: (data: object) => client.post('/contacts', data),
  update: (id: number, data: object) => client.put(`/contacts/${id}`, data),
  delete: (id: number) => client.delete(`/contacts/${id}`),
};
