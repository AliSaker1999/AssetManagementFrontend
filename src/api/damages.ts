import client from './client';
import type { Damage } from '../types';

export const damagesApi = {
  getByAsset: (assetId: number) => client.get<Damage[]>(`/damages/asset/${assetId}`),
  create: (data: { assetID: number; damageDate: string; damageDesc: string }) =>
    client.post<Damage>('/damages', data),
  update: (id: number, data: { assetID: number; damageDate: string; damageDesc: string }) =>
    client.put<Damage>(`/damages/${id}`, data),
  delete: (id: number) => client.delete(`/damages/${id}`),
};
