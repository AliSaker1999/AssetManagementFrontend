import client from './client';
import type { DepreciationReportItem, PaginatedResponse } from '../types';

export const depreciationsApi = {
  getAll: (companyId: number) => client.get('/depreciations', { params: { companyId } }),
  getReport: (id: number) => client.get(`/depreciations/${id}/report`),
  getReportPaginated: (id: number, pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<DepreciationReportItem>>(`/depreciations/${id}/report/paginated`, { params: { pageNumber, pageSize } }),
  getLastDate: (companyId: number) => client.get('/depreciations/last-date', { params: { companyId } }),
  getNotDepreciated: () => client.get('/depreciations/not-depreciated'),
  run: (data: object) => client.post('/depreciations/run', data),
  deleteLast: (companyId: number) => client.delete('/depreciations/last', { params: { companyId } }),
};
