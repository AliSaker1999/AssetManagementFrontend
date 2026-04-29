import client from './client';
import type { AssetCreateRequest, AssetReportFilter } from '../types';

export const assetsApi = {
  getList: () => client.get('/assets'),
  get: (id: number) => client.get(`/assets/${id}`),
  getReport: (filter: AssetReportFilter) => client.post('/assets/report', filter),
  getNotDepreciated: () => client.get('/assets/not-depreciated'),
  create: (data: AssetCreateRequest) => client.post('/assets', data),
  update: (id: number, data: AssetCreateRequest) => client.put(`/assets/${id}`, data),
  delete: (id: number) => client.delete(`/assets/${id}`),
  updateStatus: (id: number, data: object) => client.put(`/assets/${id}/status`, data),
  removeStatus: (id: number, data: object) => client.delete(`/assets/${id}/status`, { data }),
  getDepreciationHistory: (id: number) => client.get(`/assets/${id}/depreciation-history`),
  getInventoryHistory: (id: number) => client.get(`/assets/${id}/inventory-history`),
  getStatusHistory: (id: number) => client.get(`/assets/${id}/status-history`),
  getCodes: () => client.get('/assets/codes'),
};
