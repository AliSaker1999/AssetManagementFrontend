import client from './client';

export const depreciationsApi = {
  getAll: () => client.get('/depreciations'),
  getReport: (id: number) => client.get(`/depreciations/${id}/report`),
  getLastDate: () => client.get('/depreciations/last-date'),
  getNotDepreciated: () => client.get('/depreciations/not-depreciated'),
  run: (data: object) => client.post('/depreciations/run', data),
  deleteLast: () => client.delete('/depreciations/last'),
};
