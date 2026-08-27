import client from './client';
import type { DashboardSummary } from '../types';

export const dashboardApi = {
  // Status/company/country counts, expiring warranties, and the depreciation trend all come
  // back in a single round trip — see DashboardRepository.GetSummaryAsync on the API side.
  getSummary: (companyId?: number, warrantyDays = 30, trendMonths = 12, signal?: AbortSignal) =>
    client.get<DashboardSummary>('/dashboard/summary', {
      params: { ...(companyId ? { companyId } : {}), warrantyDays, trendMonths },
      signal,
    }),
};
