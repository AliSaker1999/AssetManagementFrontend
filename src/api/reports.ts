import client from './client';
import { downloadBlob } from '../utils/downloadBlob';

export interface ReportPreview {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | null)[][];
  totalCount: number;
}

export interface PreviewPagingRequest {
  pageNumber?: number;
  pageSize?: number;
}

export const reportsApi = {
  // ── Download ───────────────────────────────────────────────────────────────
  downloadAssetsList: (data: object) =>
    downloadBlob(
      client.post('/reports/assets-list', data, { responseType: 'arraybuffer' }) as any,
      'AssetsListReport.pdf'
    ),
  downloadAssetsListInventory: (data: object) =>
    downloadBlob(
      client.post('/reports/assets-list-inventory', data, { responseType: 'arraybuffer' }) as any,
      'AssetsListInventoryReport.pdf'
    ),
  downloadDepreciation: (data: object) =>
    downloadBlob(
      client.post('/reports/depreciation', data, { responseType: 'arraybuffer' }) as any,
      'DepreciationReport.pdf'
    ),
  downloadAssetsNotDepreciated: (data: object) =>
    downloadBlob(
      client.post('/reports/assets-not-depreciated', data, { responseType: 'arraybuffer' }) as any,
      'AssetsNotDepreciatedReport.pdf'
    ),
  downloadStatusHistory: (data: object) =>
    downloadBlob(
      client.post('/reports/status-history', data, { responseType: 'arraybuffer' }) as any,
      'StatusHistoryReport.pdf'
    ),
  downloadCompaniesBreakdown: (data: object) =>
    downloadBlob(
      client.post('/reports/companies-breakdown', data, { responseType: 'arraybuffer' }) as any,
      'AssetsByCompany.pdf'
    ),
  downloadCountriesBreakdown: (data: object) =>
    downloadBlob(
      client.post('/reports/countries-breakdown', data, { responseType: 'arraybuffer' }) as any,
      'AssetsByCountry.pdf'
    ),
  downloadAttentionItems: (data: object) =>
    downloadBlob(
      client.post('/reports/attention-items', data, { responseType: 'arraybuffer' }) as any,
      'NeedsAttention.pdf'
    ),

  // ── Preview (returns JSON) ─────────────────────────────────────────────────
  previewAssetsList: (data: object & PreviewPagingRequest) =>
    client.post<ReportPreview>('/reports/assets-list/preview', data),
  previewAssetsListInventory: (data: object & PreviewPagingRequest) =>
    client.post<ReportPreview>('/reports/assets-list-inventory/preview', data),
  previewDepreciation: (data: object & PreviewPagingRequest) =>
    client.post<ReportPreview>('/reports/depreciation/preview', data),
  previewAssetsNotDepreciated: (data: object & PreviewPagingRequest) =>
    client.post<ReportPreview>('/reports/assets-not-depreciated/preview', data),
  previewStatusHistory: (data: object & PreviewPagingRequest) =>
    client.post<ReportPreview>('/reports/status-history/preview', data),
};
