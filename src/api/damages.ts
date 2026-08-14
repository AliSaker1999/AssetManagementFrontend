import client from './client';
import type { Damage } from '../types';

export const damagesApi = {
  getByAsset: (assetId: number) => client.get<Damage[]>(`/damages/asset/${assetId}`),
  /** Damages this asset can be sent to maintenance for: still open and not already out for repair. */
  getSelectableByAsset: (assetId: number) =>
    client.get<Damage[]>(`/damages/asset/${assetId}/selectable`),
  create: (data: { assetID: number; damageDate: string; damageDesc: string }) =>
    client.post<Damage>('/damages', data),
  update: (id: number, data: { assetID: number; damageDate: string; damageDesc: string }) =>
    client.put<Damage>(`/damages/${id}`, data),
  delete: (id: number) => client.delete(`/damages/${id}`),
};
