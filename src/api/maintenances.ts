import client from './client';

export const maintenancesApi = {
  getActiveCount: () => client.get<number>('/maintenances/active-count'),
  getByAsset: (assetId: number) => client.get(`/maintenances/asset/${assetId}`),
  create: (data: object) => client.post('/maintenances', data),
  update: (id: number, data: object) => client.put(`/maintenances/${id}`, data),
  delete: (id: number, data: object) => client.delete(`/maintenances/${id}`, { data }),
  returnFromMaintenance: (id: number) => client.post(`/maintenances/${id}/return`, {}),
};
