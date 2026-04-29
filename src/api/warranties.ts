import client from './client';

export const warrantiesApi = {
  getByAsset: (assetId: number) => client.get(`/warranties/asset/${assetId}`),
  create: (data: object) => client.post('/warranties', data),
  update: (id: number, data: object) => client.put(`/warranties/${id}`, data),
  delete: (id: number) => client.delete(`/warranties/${id}`),
};
