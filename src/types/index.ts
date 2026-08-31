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
/** One row per status from /assets/status-counts, for the assets-page status tiles. */
export interface AssetStatusCount {
  statusID: number | null;
  status: string | null;
  assetCount: number;
}

// Dashboard
export interface DashboardCompanyCount {
  companyID: number;
  companyAbbreviation: string;
  companyName: string;
  /** CompanyAbbreviation collides across countries — only CompanyName is globally unique. */
  countryID: string;
  assetCount: number;
}

export interface DashboardCountryCount {
  countryID: string;
  country: string;
  assetCount: number;
}

export interface DashboardExpiringWarranty {
  warntID: number;
  assetID: number;
  companyID: number;
  companyAbbreviation: string;
  assetCode: string;
  assetDesc: string;
  warrantyDesc: string;
  toDate: string;
  daysLeft: number;
}

export interface DashboardTrendPoint {
  month: string;
  depreciationValue: number;
  netBookValue: number;
}

/** An open maintenance — ReturnedDate IS NULL is the open/closed signal, not toDate. */
export interface DashboardOpenMaintenance {
  maintID: number;
  assetID: number;
  companyID: number;
  companyAbbreviation: string;
  assetCode: string;
  assetDesc: string;
  damageDesc: string | null;
  toDate: string;
  daysLeft: number;
}

export interface DashboardAcquisitionTrendPoint {
  month: string;
  assetCount: number;
}

/** Combined payload from /dashboard/summary — one round trip for the whole page. */
export interface DashboardSummary {
  statusCounts: AssetStatusCount[];
  companyCounts: DashboardCompanyCount[];
  countryCounts: DashboardCountryCount[];
  expiringWarranties: DashboardExpiringWarranty[];
  depreciationTrend: DashboardTrendPoint[];
  openMaintenances: DashboardOpenMaintenance[];
  acquisitionTrend: DashboardAcquisitionTrendPoint[];
}

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
  brand?: string;
  model?: string;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  hrEmpIDUsedBy?: string | null;
  empIDUsedBy?: number;
  employeeName?: string | null;
  }

export interface Asset {
  assetID: number;
  companyID: number;
  companyName?: string;
  companyAbbreviation?: string;
  countryID?: string;
  country?: string;
  assetCode: string;
  assetDesc: string;
  locationID: number;
  locDetailID: number;
  groupID: number;
  categoryID: number;
  category?: string;
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
  brandID: number;
  brandDesc?: string;
  model: string;
  statusID?: number;
  statusName?: string;
  statusDate?: string;
  remark?: string;
  ownerID: number;
  ownerDesc?: string;
  ownerTypeDesc?: string;
  empIDUsedBy?: number;
  hrEmpIDUsedBy?: string;
  employeeName?: string | null;
  /** Shared assets nobody is personally responsible for — no Used By employee needed. */
  usedByNotMandatory?: boolean;
}

export interface HrEmployee {
  empID: string;
  fullName: string;
  companyProfileID: number;
  prmName?: string;
  leaveDate?: string | null;
}

export interface Employee {
  empIDUsedBy: number;
  empFullName: string;
  companyID: number;
  companyName?: string;
  leaveDate?: string | null;
}

export interface EmployeePossibleMatches {
  countryID?: string | null;
  hrMatches: HrEmployee[];
  internalMatches: Employee[];
}

export interface LeftEmployeeAssetItem {
  assetID: number;
  assetCode: string;
  assetDesc: string;
  status?: string | null;
}

export interface LeftEmployeeAsset {
  source: 'Internal' | 'HR';
  empID: string;
  fullName: string;
  companyID: number;
  companyAbbreviation?: string | null;
  leaveDate?: string | null;
  assets: LeftEmployeeAssetItem[];
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
  empIDUsedBy?: number;
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
  brandID: number;
  model: string;
  remark?: string;
  ownerID: number;
  ownerDesc?: string;
  hrEmpIDUsedBy?: string;
  statusID?: number;
  usedByNotMandatory?: boolean;
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

/** One entry in the Asset Detail page's unified Activity timeline. */
export interface AssetAuditEntry {
  at: string;
  entityType: 'Asset' | 'Status' | 'Depreciation' | 'Inventory' | 'Warranty' | 'Damage' | 'Maintenance';
  action: 'Created' | 'Updated' | 'Deleted';
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  /** Absent only for Inventory entries — that source carries no user field at all. */
  changedByFullName?: string;
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

/** Result of resolving a scanned barcode against the active inventory's own snapshot. */
export interface InventoryBarcodeMatch {
  invDetailID: number;
  assetID: number;
  assetCode: string;
  assetDesc: string | null;
  isAvailable: boolean;
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
  /** The damage this maintenance repairs. Every maintenance has one. */
  damageID: number;
  attID?: number | null;
  fromDate: string;
  toDate: string;
  supplierContactID: number;
  cost: number;
  curCode: string;
  remark?: string;
  /** What the supplier did. Filled when the asset is marked returned. */
  workPerformed?: string | null;
  /** null means the asset is still out for repair — not ToDate, which is only the plan. */
  returnedDate?: string | null;
  // Joined from the damage so the table can name the fault without a second request.
  damageDesc?: string | null;
  damageDate?: string | null;
  damageFixed?: boolean;
}

// Warranties
export interface Warranty {
  warntID: number;
  assetID: number;
  attID?: number | null;
  warrantyDesc: string;
  fromDate: string;
  toDate: string;
  remark?: string;
}

export interface Damage {
  damageID: number;
  assetID: number;
  damageDate: string;
  damageDesc: string;
  /**
   * Closed by a repair. Reachable only through a maintenance — by returning one as fixed,
   * or by correcting that answer in Edit Maintenance — never from the Damage tab.
   */
  fixed: boolean;
  /** A maintenance for this damage is still open, so it cannot be sent again. */
  underMaintenance: boolean;
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
  hrSourceID?: number | null;
  hrCompanyProfileID?: number | null;
  assetController?: boolean | null;
  assetControllerEmail?: string | null;
  assetControllerName?: string | null;
}

export interface HrCompanyProfile {
  companyProfileID: number;
  prmName: string;
}

/** A row of the HR-side registry (HR_Common.dbo.hr_Databases) — used to pick a target when adding an HR source. */
export interface HrDatabase {
  dbId: number;
  connectTo: string;
  serverName: string;
  databaseName: string;
  /** False when the database is not on the Assets SQL instance, so three-part-name queries cannot read it. */
  isReachable: boolean;
}

/**
 * One HR database the asset system reads from. A company points at exactly one of
 * these; HRCompanyProfileID is only meaningful alongside it, because profile ids
 * restart in every HR database.
 */
export interface HrSource {
  hrSourceID: number;
  hrdbid?: number | null;
  sourceName: string;
  serverName: string;
  databaseName: string;
  countryID: string;
  isActive: boolean;
  /**
   * False when the database is on another SQL instance. HR dropdowns still work,
   * but employee names in the asset list and asset transfers do not resolve,
   * because those go through stored procedures that use three-part names.
   */
  isOnAppInstance: boolean;
  companyCount: number;
}

export interface CategoryType {
  categoryID: number;
  category: string;
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
  countryID: string;
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

export interface BrandType {
  brandID: number;
  brandDesc: string;
}

export interface OwnerType {
  ownerID: number;
  ownerDesc: string;
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
  assetCodeCounter: number;
  hrConnect: boolean;
  hrDatabase?: string | null;
}

// Users & Permissions
export interface UserListItem {
  userID: number;
  userName: string;
  fullName: string;
  emailAddress: string;
  roleID: number;
  roleName: string;
  failedLoginCount: number;
  lockoutUntil: string | null;
  isLockedOut: boolean;
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

export interface InventoryActiveSession {
  inventoryID: number;
  companyID: number;
  inventoryStartDate: string;
  inventoryEndDate?: string | null;
  remark?: string;
}

export interface InventoryListItem {
  inventoryID: number;
  companyID: number;
  inventoryStartDate: string;
  inventoryEndDate: string;
  remark?: string;
  startCreatedByFullName: string;
  startCreatedByDateTime: string;
  endCreatedByFullName?: string;
  totalAssets: number;
  foundAssets: number;
  relocatedAssets: number;
}

// Notifications
export interface AppNotification {
  notifID: number;
  userID: number;
  companyID: number;
  type: 'Warranty' | 'Maintenance';
  entityID: number;
  assetID: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}
