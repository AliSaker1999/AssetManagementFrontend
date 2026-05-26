import client from './client';

export const inventoriesApi = {
  getHistory:   (companyId: number) => client.get('/inventories/history',   { params: { companyId } }),
  getMode:      (companyId: number) => client.get('/inventories/mode',      { params: { companyId } }),
  getInfo:      (companyId: number) => client.get('/inventories/info',      { params: { companyId } }),
  getLastDate:  (companyId: number) => client.get('/inventories/last-date', { params: { companyId } }),
  getGenerated: (companyId: number) => client.get('/inventories/generated', { params: { companyId } }),
  getFinishInfo: ()                  => client.get('/inventories/finish-info'),
  getDetails:   (filter: object)    => client.post('/inventories/details', filter),
  getRelocated: (id: number)        => client.get(`/inventories/${id}/relocated`),
  getReport:    (filter: object)    => client.post('/inventories/report', filter),
  start:        (data: object)      => client.post('/inventories/start', data),
  refresh:      (id: number)        => client.post(`/inventories/${id}/refresh`),
  end:          (id: number, data: object) => client.post(`/inventories/${id}/end`, data),
  setAvailable: (invDetailId: number, isAvailable: boolean) =>
    client.put(`/inventories/available/${invDetailId}`, isAvailable),
  setAvailableAll: (inventoryId: number, isAvailable: boolean) =>
    client.put(`/inventories/${inventoryId}/available-all`, isAvailable),
  setAvailableByCode: (inventoryId: number, assetCode: string, isAvailable: boolean) =>
    client.put(`/inventories/${inventoryId}/available-by-code`, isAvailable, { params: { assetCode } }),
  relocate: (data: object) => client.put('/inventories/relocate', data),
};
