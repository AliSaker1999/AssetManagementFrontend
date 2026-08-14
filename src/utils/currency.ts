import type { Company } from '../types';

/**
 * The currency a money field on one of this company's assets should start on — sale
 * price when a status is set to Sold, maintenance cost, purchase price on a new asset.
 * `GSET.Companies.CompanyPrmCurCode` is the source of truth.
 *
 * Returns undefined when the company isn't in the list or has no primary currency
 * recorded, so callers keep whatever fallback they already had rather than showing a
 * blank currency.
 *
 * Reading it from the companies lookup is safe on any page: `/lookups/companies`
 * returns every company for admins and full-access users, and the caller's permitted
 * companies otherwise — which always covers any asset that caller is allowed to open.
 */
export function companyPrmCurrency(companies: Company[], companyId?: number) {
  return companies.find((c) => c.companyID === companyId)?.companyPrmCurCode?.trim() || undefined;
}
