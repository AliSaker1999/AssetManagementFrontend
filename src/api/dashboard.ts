import client from './client';
import type { AttentionItemsPage, DashboardSummary } from '../types';

export const dashboardApi = {
  // Status/company/country counts, a Needs Attention preview, and the monthly trends all come
  // back in a single round trip — see DashboardRepository.GetSummaryAsync on the API side.
  getSummary: (companyId?: number, trendMonths = 12, signal?: AbortSignal) =>
    client.get<DashboardSummary>('/dashboard/summary', {
      params: { ...(companyId ? { companyId } : {}), trendMonths },
      signal,
    }),

  // The full Needs Attention set behind the dashboard's preview — see
  // DashboardController.GetAttentionItems for pagination/category-filter semantics.
  getAttentionItems: (
    pageNumber: number,
    pageSize: number,
    companyId?: number,
    search?: string,
    category?: string,
    signal?: AbortSignal
  ) =>
    client.get<AttentionItemsPage>('/dashboard/attention-items', {
      params: {
        pageNumber,
        pageSize,
        ...(companyId ? { companyId } : {}),
        ...(search ? { search } : {}),
        ...(category ? { category } : {}),
      },
      signal,
    }),
};
