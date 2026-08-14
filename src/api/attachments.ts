import client from './client';

export const attachmentsApi = {
  getByAsset: (assetId: number) => client.get(`/attachments/asset/${assetId}`),
  getGeneralByAsset: (assetId: number) => client.get(`/attachments/asset/${assetId}/general`),
  create: (data: object) => client.post('/attachments', data),
  download: (attId: number) => client.get(`/attachments/${attId}/download`, { responseType: 'blob' }),
  view: (attId: number) => client.get(`/attachments/${attId}/view`, { responseType: 'blob' }),
  delete: (data: object) => client.delete('/attachments', { data }),
};
