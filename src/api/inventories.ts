import client from './client';

export const inventoriesApi = {
  getMode: () => client.get('/inventories/mode'),
  getInfo: () => client.get('/inventories/info'),
  getFinishInfo: () => client.get('/inventories/finish-info'),
  getLastDate: () => client.get('/inventories/last-date'),
  getDetails: (filter: object) => client.post('/inventories/details', filter),
  getGenerated: (id: number) => client.get(`/inventories/${id}/generated`),
  getRelocated: (id: number) => client.get(`/inventories/${id}/relocated`),
  getReport: (filter: object) => client.post('/inventories/report', filter),
  start: (data: object) => client.post('/inventories/start', data),
  refresh: (id: number) => client.post(`/inventories/${id}/refresh`),
  end: (id: number, data: object) => client.post(`/inventories/${id}/end`, data),
  setAvailable: (invDetailId: number, isAvailable: boolean) =>
    client.put(`/inventories/available/${invDetailId}`, isAvailable),
  setAvailableAll: (inventoryId: number, isAvailable: boolean) =>
    client.put(`/inventories/${inventoryId}/available-all`, isAvailable),
  setAvailableByCode: (inventoryId: number, assetCode: string, isAvailable: boolean) =>
    client.put(`/inventories/${inventoryId}/available-by-code`, isAvailable, { params: { assetCode } }),
  relocate: (data: object) => client.put('/inventories/relocate', data),
};
