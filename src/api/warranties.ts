import client from './client';

export const warrantiesApi = {
  getByAsset: (assetId: number) => client.get(`/warranties/asset/${assetId}`),
  create: (data: object) => client.post('/warranties', data),
  update: (id: number, data: object) => client.put(`/warranties/${id}`, data),
  delete: (id: number, data: object) => client.delete(`/warranties/${id}`, { data }),
  /** Stop (or resume) tracking a warranty nobody intends to renew. Returns the updated row. */
  setNotRenewing: (id: number, data: { notRenewing: boolean; reason?: string | null }) =>
    client.put(`/warranties/${id}/not-renewing`, data),
};
