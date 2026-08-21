import client from './client';
import type { Maintenance } from '../types';

export const maintenancesApi = {
  getActiveCount: () => client.get<number>('/maintenances/active-count'),
  getByAsset: (assetId: number) => client.get(`/maintenances/asset/${assetId}`),
  create: (data: object) => client.post('/maintenances', data),
  update: (id: number, data: object) => client.put(`/maintenances/${id}`, data),
  /** Returns the asset's restored status when this record was the one holding it "Under Maintenance". */
  delete: (id: number, data: object) =>
    client.delete<{ revertedStatusID: number | null }>(`/maintenances/${id}`, { data }),
  /** Closes the maintenance, records the work, and settles its damage. Returns the settled row. */
  returnFromMaintenance: (id: number, data: { workPerformed: string | null; fixed: boolean }) =>
    client.post<Maintenance>(`/maintenances/${id}/return`, data),
};
