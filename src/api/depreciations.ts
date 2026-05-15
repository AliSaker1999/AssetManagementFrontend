import client from './client';

export const depreciationsApi = {
  getAll: (companyId: number) => client.get('/depreciations', { params: { companyId } }),
  getReport: (id: number) => client.get(`/depreciations/${id}/report`),
  getLastDate: (companyId: number) => client.get('/depreciations/last-date', { params: { companyId } }),
  getNotDepreciated: () => client.get('/depreciations/not-depreciated'),
  run: (data: object) => client.post('/depreciations/run', data),
  deleteLast: (companyId: number) => client.delete('/depreciations/last', { params: { companyId } }),
};
