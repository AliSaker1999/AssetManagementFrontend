import client from './client';

export const maintenancesApi = {
  getByAsset: (assetId: number) => client.get(`/maintenances/asset/${assetId}`),
  create: (data: object) => client.post('/maintenances', data),
  update: (id: number, data: object) => client.put(`/maintenances/${id}`, data),
  delete: (id: number, data: object) => client.delete(`/maintenances/${id}`, { data }),
};
