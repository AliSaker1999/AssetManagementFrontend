import client from './client';
import type { CategoryType, Company, Country, Employee, EmployeePossibleMatches, HrCompanyProfile, HrDatabase, HrSource, HrEmployee, LocationDetail, PaginatedResponse,LocationType, GroupType, BrandType } from '../types';

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
  getHrDatabases: () => client.get<HrDatabase[]>('/lookups/hr-databases'),
  getHrSources: (activeOnly = false) =>
    client.get<HrSource[]>('/lookups/hr-sources', { params: { activeOnly } }),
  createHrSource: (payload: Partial<HrSource>) => client.post<HrSource>('/lookups/hr-sources', payload),
  updateHrSource: (id: number, payload: Partial<HrSource>) => client.put(`/lookups/hr-sources/${id}`, payload),
  deleteHrSource: (id: number) => client.delete(`/lookups/hr-sources/${id}`),
  testHrSource: (id: number) => client.post<{ message: string }>(`/lookups/hr-sources/${id}/test`),
  // Keyed by HR source, not country: a country can have more than one, and the company
  // create form has no CompanyID yet but does have the chosen source.
  getHrCompanies: (hrSourceId: number) =>
    client.get<HrCompanyProfile[]>('/lookups/hr-companies', { params: { hrSourceId } }),
  getHrEmployees: (companyId: number) =>
    client.get<HrEmployee[]>('/lookups/hr-employees', { params: { companyId } }),
  getHrEmployeesByCompanyProfile: (hrSourceId: number, companyProfileId: number) =>
    client.get<HrEmployee[]>('/lookups/hr-employees', { params: { hrSourceId, companyProfileId } }),
  checkEmployeePossibleMatches: (companyId: number, empFullName: string, excludeEmpId?: number) =>
    client.get<EmployeePossibleMatches>('/lookups/employees/possible-matches', {
      params: { companyId, empFullName, excludeEmpId },
    }),
  getEmployees: (companyId?: number, countryId?: string) =>
    client.get<Employee[]>('/lookups/employees', { params: { companyId, countryId } }),
  getEmployeesPaginated: (pageNumber: number = 1, pageSize: number = 10, companyId?: number, countryId?: string) =>
    client.get<PaginatedResponse<Employee>>('/lookups/employees/paginated', { params: { pageNumber, pageSize, companyId, countryId } }),
  createEmployee: (data: { empFullName: string; companyID: number }) => client.post<Employee>('/lookups/employees', data),
  updateEmployee: (id: number, data: { empFullName: string; companyID: number }) =>
    client.put(`/lookups/employees/${id}`, data),
  deleteEmployee: (id: number) => client.delete(`/lookups/employees/${id}`),
  setEmployeeLeaveDate: (id: number, leaveDate: string | null) =>
    client.put(`/lookups/employees/${id}/leave-date`, { leaveDate }),
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
