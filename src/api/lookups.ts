import client from './client';

export const lookupsApi = {
  getCompanies: () => client.get('/lookups/companies'),
  getCategories: () => client.get('/lookups/categories'),
  getGroups: () => client.get('/lookups/groups'),
  getLocations: () => client.get('/lookups/locations'),
  getLocationDetails: (locationId?: number) =>
    client.get('/lookups/location-details', { params: locationId ? { locationId } : {} }),
  getStatuses: () => client.get('/lookups/statuses'),
  getCurrencies: () => client.get('/lookups/currencies'),
  getCountries: () => client.get('/lookups/countries'),
  getContactTypes: () => client.get('/lookups/contact-types'),
  getBanks: () => client.get('/lookups/banks'),
  getAtSettings: () => client.get('/lookups/settings/at'),
  getGSetSettings: () => client.get('/lookups/settings/gset'),
  getAssetCode: (companyId: number, groupId: number) =>
    client.get('/lookups/asset-code', { params: { companyId, groupId } }),

  // Groups
  createGroup: (data: object) => client.post('/lookups/groups', data),
  updateGroup: (id: number, data: object) => client.put(`/lookups/groups/${id}`, data),
  deleteGroup: (id: number) => client.delete(`/lookups/groups/${id}`),

  // Categories
  createCategory: (data: object) => client.post('/lookups/categories', data),
  updateCategory: (id: number, data: object) => client.put(`/lookups/categories/${id}`, data),
  deleteCategory: (id: number) => client.delete(`/lookups/categories/${id}`),

  // Locations
  createLocation: (data: object) => client.post('/lookups/locations', data),
  updateLocation: (id: number, location: string) => client.put(`/lookups/locations/${id}`, location),
  deleteLocation: (id: number) => client.delete(`/lookups/locations/${id}`),

  // Location Details
  createLocationDetail: (data: object) => client.post('/lookups/location-details', data),
  updateLocationDetail: (id: number, data: object) => client.put(`/lookups/location-details/${id}`, data),
  deleteLocationDetail: (id: number) => client.delete(`/lookups/location-details/${id}`),
};
