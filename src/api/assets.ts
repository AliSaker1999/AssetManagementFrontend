import client from './client';
import type { AssetCreateRequest, AssetReportFilter, PaginatedResponse, AssetListItem, AssetStatusCount, LeftEmployeeAsset } from '../types';

async function downloadBlob(promise: Promise<{ data: ArrayBuffer; headers: Record<string, string> }>, fallbackName: string) {
  const res = await promise;
  const contentDisposition = res.headers?.['content-disposition'] as string | undefined;
  let fileName = fallbackName;
  if (contentDisposition) {
    const m = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (m?.[1]) fileName = m[1].trim();
  }
  const url = URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export const assetsApi = {
  getList: (companyId?: number) => client.get('/assets', { params: companyId ? { companyId } : {} }),
  export: (data: { format: 'excel' | 'pdf'; companyID?: number; search?: string; statusIDs: number[] }) =>
    downloadBlob(
      client.post('/assets/export', data, { responseType: 'arraybuffer' }) as never,
      data.format === 'excel' ? 'Assets.xlsx' : 'Assets.pdf'
    ),
  getLeftEmployees: (companyId?: number) =>
    client.get<LeftEmployeeAsset[]>('/assets/left-employees', { params: companyId ? { companyId } : {} }),
  // search and statusIds are applied in SQL. Passing them means the page no longer
  // has to download every asset to filter locally. Omit them and behaviour is unchanged.
  // `signal` lets the caller cancel an in-flight page request. Without it, a response for
  // an older filter can arrive after a newer one and overwrite the grid with stale rows.
  getListPaginated: (
    pageNumber: number = 1,
    pageSize: number = 10,
    companyId?: number,
    search?: string,
    statusIds?: number[],
    signal?: AbortSignal,
  ) =>
    client.get<PaginatedResponse<AssetListItem>>('/assets/paginated', {
      params: {
        pageNumber,
        pageSize,
        ...(companyId ? { companyId } : {}),
        ...(search && search.trim() ? { search: search.trim() } : {}),
        ...(statusIds && statusIds.length ? { statusIds: statusIds.join(',') } : {}),
      },
      signal,
    }),
  // One row per status, for the status tiles — replaces counting a full asset download.
  getStatusCounts: (companyId?: number) =>
    client.get<AssetStatusCount[]>('/assets/status-counts', { params: companyId ? { companyId } : {} }),
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
