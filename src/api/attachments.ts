import client from './client';

export const attachmentsApi = {
  getByAsset: (assetId: number) => client.get(`/attachments/asset/${assetId}`),
  create: (data: object) => client.post('/attachments', data),
  delete: (data: object) => client.delete('/attachments', { data }),
};
