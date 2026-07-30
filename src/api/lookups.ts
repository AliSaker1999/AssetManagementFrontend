import client from './client';
import type { CategoryType, Company, Country, HrCompanyProfile, HrEmployee, LocationDetail, PaginatedResponse,LocationType, GroupType, BrandType } from '../types';

export const lookupsApi = {
  getCompanies: () => client.get('/lookups/companies'),
  getCompaniesPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<Company>>('/lookups/companies/paginated', { params: { pageNumber, pageSize } }),
  getCategories: () => client.get('/lookups/categories'),
  getCategoriesPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<CategoryType>>('/lookups/categories/paginated', { params: { pageNumber, pageSize } }),
  getGroups: () => client.get('/lookups/groups'),
  getGroupsFull: () => client.get('/lookups/groups/full'),
  getGroupsPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<GroupType>>('/lookups/groups/paginated', { params: { pageNumber, pageSize } }),
  getLocations: (countryId?: string) =>
    client.get('/lookups/locations', { params: countryId != null ? { countryId } : {} }),
  getLocationsPaginated: (countryId?: string, pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<LocationType>>('/lookups/locations/paginated', { params: { countryId, pageNumber, pageSize } }),
  getLocationDetails: (locationId?: number) =>
    client.get('/lookups/location-details', { params: locationId ? { locationId } : {} }),
  getLocationDetailsPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<LocationDetail>>('/lookups/location-details/paginated', { params: { pageNumber, pageSize } }),
  getStatuses: () => client.get('/lookups/statuses'),
  getBrands: () => client.get('/lookups/brands'),
  getBrandsPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<BrandType>>('/lookups/Brands/paginated', { params: { pageNumber, pageSize } }),
  getOwners: () => client.get('/lookups/owners'),
  getCurrencies: () => client.get('/lookups/currencies'),
  getCurrenciesPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<{ curCode: string; curName: string }>>('/lookups/currencies/paginated', { params: { pageNumber, pageSize } }),
  getCountries: () => client.get('/lookups/countries'),
  getHrDatabases: () => client.get<string[]>('/lookups/hr-databases'),
  getHrCompanies: (countryId: string) =>
    client.get<HrCompanyProfile[]>('/lookups/hr-companies', { params: { countryId } }),
  getHrEmployees: (companyId: number) =>
    client.get<HrEmployee[]>('/lookups/hr-employees', { params: { companyId } }),
  getHrEmployeesByCompanyProfile: (countryId: string, companyProfileId: number) =>
    client.get<HrEmployee[]>('/lookups/hr-employees', { params: { countryId, companyProfileId } }),
  getCountriesPaginated: (pageNumber: number = 1, pageSize: number = 10) =>
    client.get<PaginatedResponse<Country>>('/lookups/countries/paginated', { params: { pageNumber, pageSize } }),
  getContactTypes: () => client.get('/lookups/contact-types'),
  getBanks: () => client.get('/lookups/banks'),
  getAtSettings: () => client.get('/lookups/settings/at'),
  getGSetSettings: () => client.get('/lookups/settings/gset'),
  updateAtSetting: (id: number, value: string) =>
    client.put(`/lookups/settings/at/${id}`, JSON.stringify(value), {
      headers: { 'Content-Type': 'application/json' },
    }),
  getAssetCode: (generate: boolean, countryId?: string) =>
    client.get('/lookups/asset-code', { params: { generate, countryId } }),

  // Countries
  createCountry: (data: object) => client.post('/lookups/countries', data),
  updateCountry: (id: string, data: object) => client.put(`/lookups/countries/${id}`, data),

  // Companies
  createCompany: (data: object) => client.post('/lookups/companies', data),
  updateCompany: (id: number, data: object) => client.put(`/lookups/companies/${id}`, data),
  deleteCompany: (id: number) => client.delete(`/lookups/companies/${id}`),

  // Groups
  createGroup: (data: object) => client.post('/lookups/groups', data),
  updateGroup: (id: number, data: object) => client.put(`/lookups/groups/${id}`, data),
  deleteGroup: (id: number) => client.delete(`/lookups/groups/${id}`),

  // Brands
  createBrand: (data: { brandDesc: string }) => client.post('/lookups/brands', data),
  updateBrand: (id: number, data: object) => client.put(`/lookups/brands/${id}`, data),
  deleteBrand: (id: number) => client.delete(`/lookups/brands/${id}`),

  // Categories
  createCategory: (data: object) => client.post('/lookups/categories', data),
  updateCategory: (id: number, data: object) => client.put(`/lookups/categories/${id}`, data),
  deleteCategory: (id: number) => client.delete(`/lookups/categories/${id}`),

  // Locations
  createLocation: (data: object) => client.post('/lookups/locations', data),
  updateLocation: (id: number, data: object) => client.put(`/lookups/locations/${id}`, data),
  deleteLocation: (id: number) => client.delete(`/lookups/locations/${id}`),

  // Location Details
  createLocationDetail: (data: object) => client.post('/lookups/location-details', data),
  updateLocationDetail: (id: number, data: object) => client.put(`/lookups/location-details/${id}`, data),
  deleteLocationDetail: (id: number) => client.delete(`/lookups/location-details/${id}`),

  // Currencies
  createCurrency: (data: { curCode: string; curName: string }) => client.post('/lookups/currencies', data),
  updateCurrency: (code: string, data: { curName: string }) => client.put(`/lookups/currencies/${code}`, data),
  deleteCurrency: (code: string) => client.delete(`/lookups/currencies/${code}`),

  // Countries (toggle)
  toggleCountryActive: (id: string, active: boolean) => client.patch(`/lookups/countries/${id}/active`, active),
};
