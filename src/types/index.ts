export interface User {
  userId: number;
  userName: string;
  fullName: string;
  roleId: number;
  permissions?: UserPermission[];
}

export interface LoginResponse {
  token: string;
  userId: number;
  userName: string;
  fullName: string;
  roleId: number;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Assets
export interface AssetListItem {
  assetID: number;
  companyID: number;
  companyAbbreviation: string;
  assetCode: string;
  assetDesc: string;
  category: string;
  location: string;
  floor?: string;
  room?: string;
  zone?: string;
  statusID?: number;
  status?: string;
  barcodeNumber?: string;
  serialNumber?: string;
  purchaseOrderNo?: string;
  invoiceNo?: string;
}

export interface Asset {
  assetID: number;
  companyID: number;
  assetCode: string;
  assetDesc: string;
  locationID: number;
  locDetailID: number;
  groupID: number;
  categoryID: number;
  donation: boolean;
  contactID?: number;
  purchaseOrderNo?: string;
  purchaseDate?: string;
  purchasePrice: number;
  purchaseCurCode: string;
  inServiceDate: string;
  invoiceNo?: string;
  invoiceDate?: string;
  accountingEntryDate?: string;
  accountingEntryJVNo?: string;
  barcodeNumber?: string;
  serialNumber?: string;
  statusID?: number;
  statusDate?: string;
  remark?: string;
  installedAt?: string;
}

export interface AssetReportItem {
  assetID: number;
  companyAbbreviation: string;
  assetCode: string;
  assetDesc: string;
  category: string;
  groupName: string;
  location: string;
  floor?: string;
  room?: string;
  zone?: string;
  inServiceDate: string;
  status?: string;
  statusDate?: string;
  lastInventoryDateByItem?: string;
  barcodeNumber?: string;
  serialNumber?: string;
}

export interface AssetReportFilter {
  locationID: number;
  companyID: number;
  categoryID: number;
  groupID: number;
  locationDetailID: number;
  accountingExclusion: boolean;
}

export interface AssetCreateRequest {
  companyID: number;
  assetCode: string;
  assetDesc: string;
  locationID: number;
  locDetailID: number;
  groupID: number;
  categoryID: number;
  donation: boolean;
  contactID?: number;
  purchaseOrderNo?: string;
  purchaseDate?: string;
  purchasePrice: number;
  purchaseCurCode: string;
  inServiceDate: string;
  invoiceNo?: string;
  invoiceDate?: string;
  accountingEntryDate?: string;
  accountingEntryJVNo?: string;
  barcodeNumber?: string;
  serialNumber?: string;
  remark?: string;
  installedAt?: string;
}

export interface DepreciationHistoryItem {
  depDetailID: number;
  depreciationDate: string;
  depreciationRate: number;
  depreciationValue: number;
  netBookValue: number;
  groupName: string;
  category: string;
  purchasePrice: number;
  purchaseCurCode: string;
  accountingEntryDate?: string;
  accountingEntryJVNo?: string;
  createdByFullName: string;
  createdByDateTime: string;
}

export interface InventoryHistoryItem {
  invDetailID: number;
  inventoryID: number;
  isAvailable: boolean;
  relocated: boolean;
  relocatedLocation?: string;
  location: string;
  floor?: string;
  zone?: string;
  room?: string;
  createdDate: string;
  companyAbbreviation: string;
  groupName: string;
  category: string;
}

export interface StatusHistoryItem {
  statusHistID: number;
  statusID: number;
  statusName?: string;
  statusDate: string;
  statusDesc?: string;
  contactName?: string;
  statusSalePrice: number;
  statusSaleCurCode?: string;
  createdByFullName: string;
  createdByDateTime: string;
}

// Inventory
export interface InventoryDetail {
  invDetailID: number;
  inventoryID: number;
  assetID: number;
  isAvailable: boolean;
  assetCode: string;
  assetDesc: string;
  relocated: boolean;
  relocatedLocation?: string;
  relocatedFloor?: string;
  relocatedZone?: string;
  relocatedRoom?: string;
  location: string;
  floor?: string;
  zone?: string;
  room?: string;
  locationID: number;
  groupName: string;
  remark?: string;
}

// Depreciations
export interface Depreciation {
  depID: number;
  depreciationDate: string;
  remark?: string;
  createdByUserID: number;
  createdByFullName: string;
  createdByDateTime: string;
  companyID: number;
}

export interface DepreciationReportItem {
  depID: number;
  depreciationDate: string;
  remark?: string;
  createdByFullName: string;
  createdByDateTime: string;
  assetCode: string;
  assetDesc: string;
  depreciationRate: number;
  depreciationValue: number;
  netBookValue: number;
  accountingEntryDate?: string;
  accountingEntryJVNo?: string;
}

// Attachments
export interface Attachment {
  attID: number;
  assetID: number;
  attDesc: string;
  attFileName: string;
  attFileExt: string;
  remark?: string;
}

// Maintenances
export interface Maintenance {
  maintID: number;
  assetID: number;
  fromDate: string;
  toDate: string;
  supplierContactID: number;
  cost: number;
  curCode: string;
  remark?: string;
}

// Warranties
export interface Warranty {
  warntID: number;
  assetID: number;
  warrantyDesc: string;
  fromDate: string;
  toDate: string;
  remark?: string;
}

// Contacts
export interface Contact {
  contactID: number;
  contactName: string;
  contactTypeID: number;
  country?: string;
  contactPerson?: string;
  contactPersonEmail?: string;
  financialContact?: string;
  financialContactEmail?: string;
  address?: string;
  countryID?: string;
  telephone1: string;
  telephone2?: string;
  mobile1?: string;
  mobile2?: string;
  fax1?: string;
  fax2?: string;
  remark?: string;
}

// Lookups
export interface Company {
  companyID: number;
  companyName: string;
  companyAbbreviation: string;
  companyPrmCurCode: string;
  companyScdCurCode: string;
  countryID: string;
}

export interface CategoryType {
  categoryID: number;
  category: string;
  groupID: number;
}

export interface GroupType {
  groupID: number;
  groupName: string;
  acronym: string;
  depreciationRate: number;
  accountNo?: string;
  accountingExclusion: boolean;
  countryID: string;
}

export interface LocationType {
  locationID: number;
  location: string;
  companyID: number;
}

export interface LocationDetail {
  locDetailID: number;
  locationID: number;
  floor: string;
  zone?: string;
  room?: string;
}

export interface StatusType {
  statusID: number;
  status: string;
}

export interface Currency {
  curCode: string;
  curName: string;
}

export interface Country {
  countryID: string;
  country: string;
  nationality: string;
  zipCode?: string;
  workingCountry: boolean;
  activeCountry: boolean;
}

// Users & Permissions
export interface UserListItem {
  userID: number;
  userName: string;
  fullName: string;
  roleID: number;
  roleName: string;
}

export interface UserPermission {
  userID: number;
  countryID: string;
  country: string;
  companyID: number;
  companyName: string;
}

export interface Setting {
  setID: number;
  setValue: string;
  setDescription: string;
  setType: string;
}
