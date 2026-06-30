import client from './client';

export interface ReportPreview {
  title: string;
  subtitle: string;
  headers: string[];
  rows: (string | null)[][];
  totalCount: number;
}

async function downloadBlob(
  promise: Promise<{ data: ArrayBuffer; headers: Record<string, string> }>,
  fallbackName: string
) {
  const res = await promise;
  const contentDisposition = res.headers?.['content-disposition'] as string | undefined;
  let fileName = fallbackName;
  if (contentDisposition) {
    const m = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (m?.[1]) fileName = m[1].trim();
  }
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
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

  // ── Preview (returns JSON) ─────────────────────────────────────────────────
  previewAssetsList: (data: object) =>
    client.post<ReportPreview>('/reports/assets-list/preview', data),
  previewAssetsListInventory: (data: object) =>
    client.post<ReportPreview>('/reports/assets-list-inventory/preview', data),
  previewDepreciation: (data: object) =>
    client.post<ReportPreview>('/reports/depreciation/preview', data),
  previewAssetsNotDepreciated: (data: object) =>
    client.post<ReportPreview>('/reports/assets-not-depreciated/preview', data),
};
