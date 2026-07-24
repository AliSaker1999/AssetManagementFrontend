import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleApiError } from '../utils/errors';
import { assetsApi } from '../api/assets';
import { lookupsApi } from '../api/lookups';
import type { Asset, Company, GroupType, CategoryType, LocationType, LocationDetail, Currency, Contact, Country, BrandType, OwnerType, HrCompanyProfile, HrEmployee } from '../types';
import { contactsApi } from '../api/contacts';
import Select from '../components/ui/Select';
import { useAuth } from '../contexts/AuthContext';

const inputCls = 'border border-[#ddd] rounded-md px-2.5 py-2 text-sm outline-none focus:border-accent transition-colors w-full';
const companyOwnerId = 1;

type ModalType = 'group' | 'category' | 'location' | 'locDetail' | 'currency' | 'company' | 'brand' | 'contact' | null;

interface ContactType {
  contactTypeID: number;
  contactType: string;
}

export default function AssetFormPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const assetId = Number(id);
const { activeCompanyId: ctxCompanyId, user, isAdmin } = useAuth();



  const [form, setForm] = useState<Partial<Asset>>({
    purchasePrice: 0,
    donation: false,
    inServiceDate: new Date().toISOString().slice(0, 10),
    purchaseCurCode: 'USD',
    ownerID: !isEdit ? companyOwnerId : undefined,
    ...(ctxCompanyId != null && !isEdit ? { companyID: ctxCompanyId } : {}),
  });
  

  const [companies, setCompanies] = useState<Company[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);
  const [brands, setBrands] = useState<BrandType[]>([]);
  const [owners, setOwners] = useState<OwnerType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [hrEmployees, setHrEmployees] = useState<HrEmployee[]>([]);
  const [loadingHrEmployees, setLoadingHrEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  // ── Quick-add modal state ───────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [groupForm, setGroupForm] = useState({ countryID: '', groupName: '', acronym: '', depreciationRate: 20, accountNo: '', accountingExclusion: false });
  const [catForm, setCatForm] = useState({ category: '' });
  const [locForm, setLocForm] = useState({ location: '', countryID: '' });
  const [locDetailForm, setLocDetailForm] = useState({ locationID: 0, floor: '', zone: '', room: '' });
  const [brandForm, setBrandForm] = useState({ brandDesc: '' });
  const [curForm, setCurForm] = useState({ curCode: '', curName: '' });
  const [compForm, setCompForm] = useState({ companyName: '', companyAbbreviation: '', companyPrmCurCode: '', companyScdCurCode: '', countryID: '', hrCompanyProfileID: '' });
  const [hrCompanies, setHrCompanies] = useState<HrCompanyProfile[]>([]);
  const [loadingHrCompanies, setLoadingHrCompanies] = useState(false);
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [contactForm, setContactForm] = useState({
    contactName: '', contactTypeID: 0, contactPerson: '', contactPersonEmail: '',
    financialContact: '', financialContactEmail: '', address: '', countryID: '',
    telephone1: '', telephone2: '', mobile1: '', mobile2: '', fax1: '', fax2: '', remark: '',
  });
  const allowedCompanyIds = new Set((user?.permissions ?? []).map((p) => p.companyID));
const visibleCompanies = isAdmin()
  ? companies
  : companies.filter((c) => allowedCompanyIds.has(c.companyID));
  
  
  
  useEffect(() => {
    Promise.all([
      lookupsApi.getCompanies(),
      lookupsApi.getGroupsFull(),
      lookupsApi.getCategories(),
      lookupsApi.getLocations(),
      lookupsApi.getLocationDetails(),
      lookupsApi.getBrands(),
      lookupsApi.getOwners(),
      lookupsApi.getCurrencies(),
      contactsApi.getLookup(),
      lookupsApi.getCountries(),
      lookupsApi.getContactTypes(),
    ]).then(([c, g, cat, l, ld, b, o, cur, con, cty, ctypes]) => {
      const companiesData = c.data as Company[];
      setCompanies(companiesData);
      setGroups(g.data as GroupType[]);
      setCategories(cat.data as CategoryType[]);
      setLocations(l.data as LocationType[]);
      setLocDetails(ld.data as LocationDetail[]);
      setBrands(b.data as BrandType[]);
      setOwners(o.data as OwnerType[]);
      setCurrencies(cur.data as Currency[]);
      setContacts(con.data as Contact[]);
      setCountries(cty.data as Country[]);
      setContactTypes(ctypes.data as ContactType[]);
      if (!isEdit && ctxCompanyId != null) {
        const ctxCountry = companiesData.find((co) => co.companyID === ctxCompanyId)?.countryID?.trim();
        if (ctxCountry) {
          lookupsApi.getAssetCode(false, ctxCountry).then((r) =>
            setForm((prev) => ({ ...prev, assetCode: (r.data as { assetCode: string }).assetCode }))
          );
        }
      }
    });
    if (isEdit) {
      assetsApi.get(assetId).then((r) => setForm(r.data as Asset));
    }
  }, [isEdit, assetId]);

  function set<K extends keyof Asset>(key: K, value: Asset[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function reset(...keys: (keyof Asset)[]) {
    setForm((prev) => { const next = { ...prev }; keys.forEach((k) => delete next[k]); return next; });
  }

  function normalizeText(value?: string | null) {
    return (value ?? '').trim().toLowerCase();
  }

  function formatHrEmployeeLabel(emp: HrEmployee) {
    const empId = emp.empID?.trim() ?? '';
    const rawName = emp.fullName?.trim() ?? '';
    const cleanedName = rawName.replace(/\s*,?\s*\([^)]*\)\s*$/, '').trim();
    const name = cleanedName || rawName;
    return `${name} – ${empId}`;
  }

  async function generateCode() {
    const countryId = selectedCompany?.countryID?.trim();
    if (!countryId) { toast.error('Select a company first'); return; }
    setGeneratingCode(true);
    try {
      const r = await lookupsApi.getAssetCode(false, countryId);
      set('assetCode', (r.data as { assetCode: string }).assetCode);
    } catch (err) { handleApiError(err, 'Failed to generate code'); }
    finally { setGeneratingCode(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.brandID) {
      toast.error('Select a brand');
      return;
    }
    if (!form.model?.trim()) {
      toast.error('Model is required');
      return;
    }
    if (!form.ownerID) {
      toast.error('Select an owner');
      return;
    }
    if (requiresOwnerDesc && !form.ownerDesc?.trim()) {
      toast.error('Owner description is required for non-company ownership');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        model: form.model?.trim(),
        ownerDesc: requiresOwnerDesc ? form.ownerDesc?.trim() : undefined,
      } as Asset;

      if (isEdit) {
        await assetsApi.update(assetId, payload);
        toast.success('Asset updated');
        navigate(`/assets/${assetId}`);
      } else {
        const countryId = selectedCompany?.countryID?.trim() ?? '';
        const codeRes = await lookupsApi.getAssetCode(true, countryId);
        const assetCode = (codeRes.data as { assetCode: string }).assetCode;
        const r = await assetsApi.create({ ...payload, assetCode, statusID: 0 } as Asset);
        toast.success('Asset created');
        navigate(`/assets/${(r.data as { assetID: number }).assetID}`);
      }
    } catch (err) {
      handleApiError(err, 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Open modal helpers (pre-fill contextual defaults) ──────────────────────
  function openModal(type: ModalType) {
    if (type === 'category') {
      setCatForm({ category: '' });
    } else if (type === 'brand') {
      setBrandForm({ brandDesc: '' });
    } else if (type === 'location') {
      setLocForm({ location: '', countryID: selectedCompany?.countryID?.trim() ?? '' });
    } else if (type === 'locDetail') {
      setLocDetailForm({ locationID: form.locationID ?? 0, floor: '', zone: '', room: '' });
    } else if (type === 'group') {
      setGroupForm({ countryID: selectedCompany?.countryID?.trim() ?? '', groupName: '', acronym: '', depreciationRate: 20, accountNo: '', accountingExclusion: false });
    } else if (type === 'currency') {
      setCurForm({ curCode: '', curName: '' });
    } else if (type === 'company') {
      setCompForm({ companyName: '', companyAbbreviation: '', companyPrmCurCode: '', companyScdCurCode: '', countryID: '', hrCompanyProfileID: '' });
      setHrCompanies([]);
    } else if (type === 'contact') {
      setContactForm({
        contactName: '', contactTypeID: 0, contactPerson: '', contactPersonEmail: '',
        financialContact: '', financialContactEmail: '', address: '',
        countryID: selectedCompany?.countryID?.trim() ?? '',
        telephone1: '', telephone2: '', mobile1: '', mobile2: '', fax1: '', fax2: '', remark: '',
      });
    }
    setActiveModal(type);
  }

  // ── Quick-add save handlers ────────────────────────────────────────────────
  async function saveGroup(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const r = await lookupsApi.createGroup(groupForm);
      const newGroup = r.data as GroupType;
      setGroups((prev) => [...prev, newGroup]);
      set('groupID', newGroup.groupID);
      reset('categoryID');
      setActiveModal(null);
      toast.success(`Group "${newGroup.groupName}" created`);
    } catch (err) { handleApiError(err, 'Failed to create group'); }
    finally { setModalSaving(false); }
  }

  async function saveCategory(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const r = await lookupsApi.createCategory(catForm);
      const newCat = r.data as CategoryType;
      setCategories((prev) => [...prev, newCat]);
      set('categoryID', newCat.categoryID);
      setActiveModal(null);
      toast.success(`Category "${newCat.category}" created`);
    } catch (err) { handleApiError(err, 'Failed to create category'); }
    finally { setModalSaving(false); }
  }

  async function saveBrand(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const r = await lookupsApi.createBrand({ brandDesc: brandForm.brandDesc.trim() });
      const newBrand = r.data as BrandType;
      setBrands((prev) => [...prev, newBrand]);
      set('brandID', newBrand.brandID);
      setActiveModal(null);
      toast.success(`Brand "${newBrand.brandDesc}" created`);
    } catch (err) { handleApiError(err, 'Failed to create brand'); }
    finally { setModalSaving(false); }
  }
  

  async function saveLocation(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      await lookupsApi.createLocation(locForm);
      const refreshed = (await lookupsApi.getLocations(locForm.countryID || undefined)).data as LocationType[];
      setLocations(refreshed);

      const newLoc = refreshed
        .filter((l) => l.countryID?.trim() === locForm.countryID?.trim() && normalizeText(l.location) === normalizeText(locForm.location))
        .sort((a, b) => b.locationID - a.locationID)[0];

      if (!newLoc) {
        toast.error('Location created, but could not auto-select it. Please select it manually.');
        setActiveModal(null);
        return;
      }

      set('locationID', newLoc.locationID);
      reset('locDetailID');
      setActiveModal(null);
      toast.success(`Location "${newLoc.location}" created`);
    } catch (err) { handleApiError(err, 'Failed to create location'); }
    finally { setModalSaving(false); }
  }

  async function saveLocDetail(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      await lookupsApi.createLocationDetail(locDetailForm);
      const refreshed = (await lookupsApi.getLocationDetails()).data as LocationDetail[];
      setLocDetails(refreshed);

      const newDet = refreshed
        .filter((d) =>
          d.locationID === locDetailForm.locationID &&
          normalizeText(d.floor) === normalizeText(locDetailForm.floor) &&
          normalizeText(d.zone) === normalizeText(locDetailForm.zone) &&
          normalizeText(d.room) === normalizeText(locDetailForm.room)
        )
        .sort((a, b) => b.locDetailID - a.locDetailID)[0];

      if (!newDet) {
        toast.error('Location detail created, but could not auto-select it. Please select it manually.');
        setActiveModal(null);
        return;
      }

      set('locDetailID', newDet.locDetailID);
      setActiveModal(null);
      toast.success('Location detail created');
    } catch (err) { handleApiError(err, 'Failed to create location detail'); }
    finally { setModalSaving(false); }
  }

  async function saveCurrency(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const r = await lookupsApi.createCurrency({ curCode: curForm.curCode.toUpperCase(), curName: curForm.curName });
      const newCur = r.data as Currency;
      setCurrencies((prev) => [...prev, newCur]);
      set('purchaseCurCode', newCur.curCode);
      setActiveModal(null);
      toast.success(`Currency "${newCur.curCode}" created`);
    } catch (err) { handleApiError(err, 'Failed to create currency'); }
    finally { setModalSaving(false); }
  }

  async function saveCompany(e: FormEvent) {
    e.preventDefault();
    setModalSaving(true);
    try {
      const payload = {
        ...compForm,
        hrCompanyProfileID: compForm.hrCompanyProfileID ? Number(compForm.hrCompanyProfileID) : null,
      };
      const r = await lookupsApi.createCompany(payload);
      const newComp = r.data as Company;
      setCompanies((prev) => [...prev, newComp]);
      set('companyID', newComp.companyID);
      reset('groupID', 'locationID', 'locDetailID');
      setActiveModal(null);
      toast.success(`Company "${newComp.companyName}" created`);
    } catch (err) { handleApiError(err, 'Failed to create company'); }
    finally { setModalSaving(false); }
  }

  async function saveContact(e: FormEvent) {
  e.preventDefault();
  if (!contactForm.contactTypeID) { toast.error('Please select a contact type'); return; }
  setModalSaving(true);
  try {
    const payload = {
      ...contactForm,
      contactPerson: contactForm.contactPerson || null,
      contactPersonEmail: contactForm.contactPersonEmail || null,
      financialContact: contactForm.financialContact || null,
      financialContactEmail: contactForm.financialContactEmail || null,
      telephone2: contactForm.telephone2 || null,
      mobile1: contactForm.mobile1 || null,
      mobile2: contactForm.mobile2 || null,
      fax1: contactForm.fax1 || null,
      fax2: contactForm.fax2 || null,
      remark: contactForm.remark || null,
    };
    const r = await contactsApi.create(payload);
    const newContact = r.data as Contact;
    setContacts((prev) => [...prev, newContact]);
    set('contactID', newContact.contactID);
    setActiveModal(null);
    toast.success(`Contact "${newContact.contactName}" created`);
  } catch (err) { handleApiError(err, 'Failed to create contact'); }
  finally { setModalSaving(false); }
}

  const selectedCompany = companies.find((c) => c.companyID === form.companyID);
  const shouldLoadHrEmployees = !!selectedCompany?.hrCompanyProfileID;
  const selectedCompCountry = countries.find((c) => c.countryID.trim() === compForm.countryID.trim());
  const shouldShowHrCompany = !!selectedCompCountry?.hrConnect && !!selectedCompCountry?.hrDatabase;
  const resolvedCompanyOwnerId = owners.find((o) => o.ownerDesc.trim().toLowerCase() === 'company')?.ownerID ?? companyOwnerId;
  const ownersOrdered = [
    ...owners.filter((o) => o.ownerID === resolvedCompanyOwnerId),
    ...owners.filter((o) => o.ownerID !== resolvedCompanyOwnerId),
  ];
  const requiresOwnerDesc = !!form.ownerID && form.ownerID !== resolvedCompanyOwnerId;
  const filteredGroups = selectedCompany ? groups.filter((g) => g.countryID?.trim() === selectedCompany.countryID?.trim()) : groups;
  const filteredCategories = categories;
  const filteredLocations = selectedCompany
    ? locations.filter((l) => l.countryID?.trim() === selectedCompany.countryID?.trim())
    : locations;
  const filteredLocDetails = form.locationID ? locDetails.filter((d) => d.locationID === form.locationID) : locDetails;

  const usedByValue = (form.hrEmpIDUsedBy ?? '').toString().trim();
const installedAtValue = (form.installedAt ?? '').trim();
const usedByRequired = shouldLoadHrEmployees && !installedAtValue;
const installedAtRequired = shouldLoadHrEmployees ? !usedByValue : !installedAtValue;



  useEffect(() => {
    if (isEdit) return;
    if (!owners.length) return;
    setForm((prev) => {
      if (prev.ownerID) return prev;
      return { ...prev, ownerID: resolvedCompanyOwnerId };
    });
  }, [isEdit, owners, resolvedCompanyOwnerId]);

  useEffect(() => {
    if (!form.companyID || !shouldLoadHrEmployees) {
      setHrEmployees([]);
      set('hrEmpIDUsedBy', '');
      return;
    }

    let isMounted = true;
    setLoadingHrEmployees(true);
    lookupsApi.getHrEmployees(form.companyID)
      .then((r) => {
        if (!isMounted) return;
        setHrEmployees(r.data as HrEmployee[]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setHrEmployees([]);
        set('hrEmpIDUsedBy', '');
        handleApiError(err, 'Failed to load HR employees');
      })
      .finally(() => {
        if (isMounted) setLoadingHrEmployees(false);
      });

    return () => { isMounted = false; };
  }, [form.companyID, shouldLoadHrEmployees]);

  useEffect(() => {
    if (activeModal !== 'company' || !compForm.countryID || !shouldShowHrCompany) {
      setHrCompanies([]);
      return;
    }

    let isMounted = true;
    setLoadingHrCompanies(true);
    lookupsApi.getHrCompanies(compForm.countryID.trim())
      .then((r) => {
        if (!isMounted) return;
        setHrCompanies(r.data as HrCompanyProfile[]);
      })
      .catch((err) => {
        if (!isMounted) return;
        setHrCompanies([]);
        handleApiError(err, 'Failed to load HR companies');
      })
      .finally(() => {
        if (isMounted) setLoadingHrCompanies(false);
      });

    return () => { isMounted = false; };
  }, [activeModal, compForm.countryID, shouldShowHrCompany]);

  function formatCompanyLabel(company: Company) {
    const countryId = company.countryID?.trim() ?? "";
    const companyName = company.companyName?.trim() ?? "";

    // Remove trailing comma from country ID
    const cleanedCountryId = countryId.replace(/,\s*$/, "");

    // Remove leading comma from company name (if it exists)
    const cleanedCompanyName = companyName.replace(/^\s*,\s*/, "");

    return `${cleanedCountryId} – ${cleanedCompanyName}`;
  }
  function formatCurrencyLabel(currency: Currency) {
    const code = currency.curCode?.trim() ?? "";
    const name = currency.curName?.trim() ?? "";

    const cleanedCode = code.replace(/,\s*$/, "");
    const cleanedName = name.replace(/^\s*,\s*/, "");

    return `${cleanedCode} – ${cleanedName}`;
  }
  function formatLocationDetailLabel(detail: LocationDetail) {
    const floor = detail.floor?.trim() ?? "";
    const zone = detail.zone?.trim() ?? "";
    const room = detail.room?.trim() ?? "";

    const cleanedFloor = floor.replace(/,\s*$/, "");
    const cleanedZone = zone.replace(/^\s*,\s*/, "").replace(/,\s*$/, "");
    const cleanedRoom = room.replace(/^\s*,\s*/, "").replace(/,\s*$/, "");

    return `Floor ${cleanedFloor}${
      cleanedZone ? ` / ${cleanedZone}` : ""
    }${cleanedRoom ? ` / ${cleanedRoom}` : ""}`;
  }

  return (
    <div className="px-8 py-6 max-w-[900px]">
      {/* ── Quick-add modals ── */}
      {activeModal === 'group' && (
        <QuickAddModal title="New Group" onClose={() => setActiveModal(null)} onSubmit={saveGroup} saving={modalSaving}>
          <MField label={selectedCompany ? `Country (${selectedCompany.countryID?.trim()})` : 'Country *'}>
            <Select value={groupForm.countryID} onChange={(e) => setGroupForm((p) => ({ ...p, countryID: e.target.value }))} required disabled={!!selectedCompany}>
              <option value="">Select country…</option>
              {countries.filter((c) => c.workingCountry || c.countryID?.trim() === groupForm.countryID).map((c) => <option key={c.countryID} value={c.countryID?.trim()}>{c.country}</option>)}
            </Select>
          </MField>
          <MField label="Group Name *">
            <input className={inputCls} value={groupForm.groupName} onChange={(e) => setGroupForm((p) => ({ ...p, groupName: e.target.value }))} required maxLength={50} placeholder="e.g. IT Equipment" />
          </MField>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Acronym *">
              <input className={inputCls} value={groupForm.acronym} onChange={(e) => setGroupForm((p) => ({ ...p, acronym: e.target.value }))} required maxLength={10} placeholder="e.g. IT" />
            </MField>
            <MField label="Depreciation Rate % *">
              <input className={inputCls} type="number" min={0} max={100} step={0.01} value={groupForm.depreciationRate} onChange={(e) => setGroupForm((p) => ({ ...p, depreciationRate: Number(e.target.value) }))} required />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Account No">
              <input className={inputCls} value={groupForm.accountNo} onChange={(e) => setGroupForm((p) => ({ ...p, accountNo: e.target.value }))} maxLength={20} placeholder="Optional" />
            </MField>
            <MField label="Accounting Exclusion *">
              <Select value={groupForm.accountingExclusion ? 'true' : 'false'} onChange={(e) => setGroupForm((p) => ({ ...p, accountingExclusion: e.target.value === 'true' }))}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
            </MField>
          </div>
        </QuickAddModal>
      )}

      {activeModal === 'category' && (
        <QuickAddModal title="New Category" onClose={() => setActiveModal(null)} onSubmit={saveCategory} saving={modalSaving}>
          <MField label="Category Name *">
            <input className={inputCls} value={catForm.category} onChange={(e) => setCatForm((p) => ({ ...p, category: e.target.value }))} required maxLength={50} placeholder="e.g. Laptops" autoFocus />
          </MField>
        </QuickAddModal>
      )}

      {activeModal === 'brand' && (
        <QuickAddModal title="New Brand" onClose={() => setActiveModal(null)} onSubmit={saveBrand} saving={modalSaving}>
          <MField label="Brand Name *">
            <input className={inputCls} value={brandForm.brandDesc} onChange={(e) => setBrandForm((p) => ({ ...p, brandDesc: e.target.value }))} required maxLength={50} placeholder="e.g. Dell" autoFocus />
          </MField>
        </QuickAddModal>
      )}

      {activeModal === 'location' && (
        <QuickAddModal title="New Location" onClose={() => setActiveModal(null)} onSubmit={saveLocation} saving={modalSaving}>
          <MField label="Location Name *">
            <input className={inputCls} value={locForm.location} onChange={(e) => setLocForm((p) => ({ ...p, location: e.target.value }))} required maxLength={50} placeholder="e.g. Head Office" autoFocus />
          </MField>
          <MField label={selectedCompany ? `Country (${selectedCompany.countryID?.trim()})` : 'Country *'}>
            <Select
              value={locForm.countryID || ''}
              onChange={(e) => setLocForm((p) => ({ ...p, countryID: e.target.value }))}
              required
              disabled={!!selectedCompany}
            >
              <option value="">Select country…</option>
              {countries.filter((c) => c.workingCountry || c.countryID?.trim() === locForm.countryID).map((c) => (
                <option key={c.countryID} value={c.countryID?.trim()}>{c.country}</option>
              ))}
            </Select>
          </MField>
        </QuickAddModal>
      )}

      {activeModal === 'locDetail' && (
        <QuickAddModal title="New Location Detail" onClose={() => setActiveModal(null)} onSubmit={saveLocDetail} saving={modalSaving}>
          <MField label="Location *">
            <Select value={locDetailForm.locationID || ''} onChange={(e) => setLocDetailForm((p) => ({ ...p, locationID: Number(e.target.value) }))} required>
              <option value="">Select location…</option>
              {(filteredLocations.length > 0 ? filteredLocations : locations).map((l) => <option key={l.locationID} value={l.locationID}>{l.location}</option>)}
            </Select>
          </MField>
          <div className="grid grid-cols-3 gap-3">
            <MField label="Floor *">
              <input className={inputCls} value={locDetailForm.floor} onChange={(e) => setLocDetailForm((p) => ({ ...p, floor: e.target.value }))} required maxLength={10} placeholder="e.g. 3" autoFocus />
            </MField>
            <MField label="Zone">
              <input className={inputCls} value={locDetailForm.zone} onChange={(e) => setLocDetailForm((p) => ({ ...p, zone: e.target.value }))} maxLength={10} placeholder="Optional" />
            </MField>
            <MField label="Room">
              <input className={inputCls} value={locDetailForm.room} onChange={(e) => setLocDetailForm((p) => ({ ...p, room: e.target.value }))} maxLength={10} placeholder="Optional" />
            </MField>
          </div>
        </QuickAddModal>
      )}

      {activeModal === 'currency' && (
        <QuickAddModal title="New Currency" onClose={() => setActiveModal(null)} onSubmit={saveCurrency} saving={modalSaving}>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Code *">
              <input className={inputCls} value={curForm.curCode} onChange={(e) => setCurForm((p) => ({ ...p, curCode: e.target.value.toUpperCase() }))} required maxLength={3} placeholder="e.g. EUR" autoFocus />
            </MField>
            <MField label="Currency Name *">
              <input className={inputCls} value={curForm.curName} onChange={(e) => setCurForm((p) => ({ ...p, curName: e.target.value }))} required maxLength={50} placeholder="e.g. Euro" />
            </MField>
          </div>
        </QuickAddModal>
      )}

      {activeModal === 'company' && (
        <QuickAddModal title="New Company" onClose={() => setActiveModal(null)} onSubmit={saveCompany} saving={modalSaving}>
          <MField label="Company Name *">
            <input className={inputCls} value={compForm.companyName} onChange={(e) => setCompForm((p) => ({ ...p, companyName: e.target.value }))} required maxLength={100} placeholder="e.g. Gezairi Trading" autoFocus />
          </MField>
          <MField label="Abbreviation *">
            <input className={inputCls} value={compForm.companyAbbreviation} onChange={(e) => setCompForm((p) => ({ ...p, companyAbbreviation: e.target.value }))} required maxLength={10} placeholder="e.g. GT" />
          </MField>
          <MField label="Country *">
            <Select value={compForm.countryID} onChange={(e) => setCompForm((p) => ({ ...p, countryID: e.target.value, hrCompanyProfileID: '' }))} required>
              <option value="">Select country…</option>
              {countries.filter((c) => c.workingCountry).map((c) => <option key={c.countryID} value={c.countryID}>{c.country}</option>)}
            </Select>
          </MField>
          {shouldShowHrCompany && (
            <MField label="HR Company *">
              <Select
                value={compForm.hrCompanyProfileID}
                onChange={(e) => setCompForm((p) => ({ ...p, hrCompanyProfileID: e.target.value }))}
                required
                disabled={loadingHrCompanies}
              >
                <option value="">{loadingHrCompanies ? 'Loading HR companies…' : 'Select HR company…'}</option>
                {hrCompanies.map((h) => (
                  <option key={h.companyProfileID} value={h.companyProfileID}>{h.prmName} ({h.companyProfileID})</option>
                ))}
              </Select>
            </MField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <MField label="Primary Currency *">
              <Select value={compForm.companyPrmCurCode} onChange={(e) => setCompForm((p) => ({ ...p, companyPrmCurCode: e.target.value }))} required>
                <option value="">Select…</option>
                {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode}</option>)}
              </Select>
            </MField>
            <MField label="Secondary Currency *">
              <Select value={compForm.companyScdCurCode} onChange={(e) => setCompForm((p) => ({ ...p, companyScdCurCode: e.target.value }))} required>
                <option value="">Select…</option>
                {currencies.map((c) => <option key={c.curCode} value={c.curCode}>{c.curCode}</option>)}
              </Select>
            </MField>
          </div>
        </QuickAddModal>
      )}

      {activeModal === 'contact' && (
        <QuickAddModal title="New Contact" onClose={() => setActiveModal(null)} onSubmit={saveContact} saving={modalSaving}>
          <MField label="Contact Name *">
            <input className={inputCls} value={contactForm.contactName} onChange={(e) => setContactForm((p) => ({ ...p, contactName: e.target.value }))} required maxLength={100} autoFocus />
          </MField>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Contact Type *">
              <Select value={contactForm.contactTypeID || ''} onChange={(e) => setContactForm((p) => ({ ...p, contactTypeID: Number(e.target.value) }))} required>
                <option value="">Select type…</option>
                {contactTypes.map((t) => <option key={t.contactTypeID} value={t.contactTypeID}>{t.contactType}</option>)}
              </Select>
            </MField>
            <MField label="Country">
              <Select value={contactForm.countryID} onChange={(e) => setContactForm((p) => ({ ...p, countryID: e.target.value }))}>
                <option value="">Select country…</option>
                {countries.filter((c) => c.activeCountry).map((c) => <option key={c.countryID} value={c.countryID}>{c.country}</option>)}
              </Select>
            </MField>
          </div>
          <MField label="Address">
            <input className={inputCls} value={contactForm.address} onChange={(e) => setContactForm((p) => ({ ...p, address: e.target.value }))} maxLength={200} />
          </MField>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Contact Person">
              <input className={inputCls} value={contactForm.contactPerson} onChange={(e) => setContactForm((p) => ({ ...p, contactPerson: e.target.value }))} maxLength={100} />
            </MField>
            <MField label="Contact Person Email">
              <input className={inputCls} type="email" value={contactForm.contactPersonEmail} onChange={(e) => setContactForm((p) => ({ ...p, contactPersonEmail: e.target.value }))} maxLength={50} />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Financial Contact">
              <input className={inputCls} value={contactForm.financialContact} onChange={(e) => setContactForm((p) => ({ ...p, financialContact: e.target.value }))} maxLength={100} />
            </MField>
            <MField label="Financial Contact Email">
              <input className={inputCls} type="email" value={contactForm.financialContactEmail} onChange={(e) => setContactForm((p) => ({ ...p, financialContactEmail: e.target.value }))} maxLength={50} />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Telephone 1 *">
              <input className={inputCls} value={contactForm.telephone1} onChange={(e) => setContactForm((p) => ({ ...p, telephone1: e.target.value }))} required maxLength={16} />
            </MField>
            <MField label="Telephone 2">
              <input className={inputCls} value={contactForm.telephone2} onChange={(e) => setContactForm((p) => ({ ...p, telephone2: e.target.value }))} maxLength={16} />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Mobile 1">
              <input className={inputCls} value={contactForm.mobile1} onChange={(e) => setContactForm((p) => ({ ...p, mobile1: e.target.value }))} maxLength={16} />
            </MField>
            <MField label="Mobile 2">
              <input className={inputCls} value={contactForm.mobile2} onChange={(e) => setContactForm((p) => ({ ...p, mobile2: e.target.value }))} maxLength={16} />
            </MField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MField label="Fax 1">
              <input className={inputCls} value={contactForm.fax1} onChange={(e) => setContactForm((p) => ({ ...p, fax1: e.target.value }))} maxLength={16} />
            </MField>
            <MField label="Fax 2">
              <input className={inputCls} value={contactForm.fax2} onChange={(e) => setContactForm((p) => ({ ...p, fax2: e.target.value }))} maxLength={16} />
            </MField>
          </div>
          <MField label="Remark">
            <textarea className={inputCls + ' resize-none'} rows={2} value={contactForm.remark} onChange={(e) => setContactForm((p) => ({ ...p, remark: e.target.value }))} maxLength={500} />
          </MField>
        </QuickAddModal>
      )}

      {/* ── Page header ── */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          to={isEdit ? `/assets/${assetId}` : '/assets'}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b7280] bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5 no-underline hover:border-brand hover:text-brand transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          {isEdit ? 'Back to Asset' : 'Back to Assets'}
        </Link>
      </div>
      <h2 className="text-[22px] font-bold text-brand mb-6">
        {isEdit ? 'Edit Asset' : 'New Asset'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-white p-6 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)]">

          {/* Company */}
          <Field label="Company *">
            <DropWithAdd onAdd={() => openModal('company')} showAdd={isAdmin()}>
              <Select value={form.companyID ?? ''} onChange={(e) => {
                const newCompanyId = Number(e.target.value);
                set('companyID', newCompanyId);
                set('hrEmpIDUsedBy', '');
                reset('groupID', 'locationID', 'locDetailID');
                if (!isEdit) {
                  const newCountry = companies.find((co) => co.companyID === newCompanyId)?.countryID?.trim();
                  if (newCountry) {
                    lookupsApi.getAssetCode(false, newCountry)
                      .then((r) => set('assetCode', (r.data as { assetCode: string }).assetCode));
                  } else {
                    set('assetCode', '');
                  }
                }
              }} required>
                <option value="">Select…</option>
                {visibleCompanies.map((c) => (
                  <option key={c.companyID} value={c.companyID}>
                    {formatCompanyLabel(c)}
                  </option>
                ))}
              </Select>
            </DropWithAdd>
          </Field>

          {shouldLoadHrEmployees && (
            <Field label={usedByRequired ? 'Used By (HR Employee) *' : 'Used By (HR Employee)'}>
              <Select
                value={form.hrEmpIDUsedBy ?? ''}
                onChange={(e) => set('hrEmpIDUsedBy', e.target.value || undefined)}
                disabled={loadingHrEmployees}
                required={usedByRequired}
                searchable
              >
                <option value="">{loadingHrEmployees ? 'Loading employees…' : 'None'}</option>
                {hrEmployees.map((emp) => (
                  <option key={emp.empID} value={emp.empID}>
                    {formatHrEmployeeLabel(emp)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {/* Asset Code */}
          <Field label="Asset Code *">
            <div className="flex gap-2">
              <input className={`${inputCls}${!isEdit ? ' bg-[#f5f5f5] cursor-default select-all' : ''}`} value={form.assetCode ?? ''} onChange={(e) => { if (isEdit) set('assetCode', e.target.value); }} readOnly={!isEdit} required maxLength={20} />
              {!isEdit && (
                <button
                  type="button"
                  onClick={generateCode}
                  disabled={generatingCode}
                  className="shrink-0 bg-[#9a7c4b] text-white border-none rounded-md px-3 py-2 text-[13px] font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70 whitespace-nowrap"
                >
                  {generatingCode ? '…' : form.assetCode ? 'Regenerate' : 'Generate'}
                </button>
              )}
            </div>
          </Field>

          {/* Description */}
          <Field label="Description *">
            <input className={inputCls} value={form.assetDesc ?? ''} onChange={(e) => set('assetDesc', e.target.value)} required maxLength={50} />
          </Field>

          <Field label="Brand *">
            <DropWithAdd onAdd={() => openModal('brand')}>
              <Select value={form.brandID ?? ''} onChange={(e) => set('brandID', Number(e.target.value))} required searchable>
                <option value="">Select…</option>
                {brands.map((b) => <option key={b.brandID} value={b.brandID}>{b.brandDesc}</option>)}
              </Select>
            </DropWithAdd>
          </Field>

          <Field label="Model *">
            <input className={inputCls} value={form.model ?? ''} onChange={(e) => set('model', e.target.value)} required maxLength={50} />
          </Field>

          {/* Group */}
          <Field label="Group *">
            <DropWithAdd onAdd={() => openModal('group') } showAdd={isAdmin()}>
              <Select value={form.groupID ?? ''} onChange={(e) => set('groupID', Number(e.target.value))} required>
                <option value="">Select…</option>
                {filteredGroups.map((g) => <option key={g.groupID} value={g.groupID}>{g.groupName}</option>)}
              </Select>
            </DropWithAdd>
          </Field>

          {/* Category */}
          <Field label="Category *">
            <DropWithAdd onAdd={() => openModal('category')}>
              <Select value={form.categoryID ?? ''} onChange={(e) => set('categoryID', Number(e.target.value))} required searchable>
                <option value="">Select…</option>
                {filteredCategories.map((c) => <option key={c.categoryID} value={c.categoryID}>{c.category}</option>)}
              </Select>
            </DropWithAdd>
          </Field>

          {/* Location */}
          <Field label="Location *">
            <DropWithAdd onAdd={() => openModal('location')}>
              <Select value={form.locationID ?? ''} onChange={(e) => { set('locationID', Number(e.target.value)); reset('locDetailID'); }} required>
                <option value="">Select…</option>
                {filteredLocations.map((l) => <option key={l.locationID} value={l.locationID}>{l.location}</option>)}
              </Select>
            </DropWithAdd>
          </Field>

          {/* Location Detail */}
          <Field label="Location Detail *">
            <DropWithAdd onAdd={() => openModal('locDetail')}>
              <Select value={form.locDetailID ?? ''} onChange={(e) => set('locDetailID', Number(e.target.value))} required>
                <option value="">Select…</option>
                {filteredLocDetails.map((d) => (
                <option key={d.locDetailID} value={d.locDetailID}>
                  {formatLocationDetailLabel(d)}
                </option>
              ))}
              </Select>
            </DropWithAdd>
          </Field>

          <Field label="Owner *">
            <Select value={form.ownerID ?? ''} onChange={(e) => {
              const nextOwnerId = Number(e.target.value);
              set('ownerID', nextOwnerId);
              if (nextOwnerId === resolvedCompanyOwnerId) {
                set('ownerDesc', '');
              }
            }} required>
              {ownersOrdered.map((o) => <option key={o.ownerID} value={o.ownerID}>{o.ownerDesc}</option>)}
            </Select>
          </Field>

          <Field label={requiresOwnerDesc ? 'Owner Description *' : 'Owner Description'}>
            <input
              className={inputCls}
              value={form.ownerDesc ?? ''}
              onChange={(e) => set('ownerDesc', e.target.value)}
              maxLength={50}
              required={requiresOwnerDesc}
              disabled={!requiresOwnerDesc}
              placeholder={requiresOwnerDesc ? 'Required for rented / leased / borrowed assets' : 'Only needed when not company-owned'}
            />
          </Field>

          {/* In Service Date */}
          <Field label="In Service Date *">
            <input className={inputCls} type="date" value={form.inServiceDate ?? ''} onChange={(e) => set('inServiceDate', e.target.value)} required />
          </Field>

          {/* Purchase Price */}
          <Field label="Purchase Price">
            <input className={inputCls} type="number" step="0.01" value={form.purchasePrice ?? 0} onChange={(e) => set('purchasePrice', Number(e.target.value))} />
          </Field>

          {/* Currency */}
          <Field label="Currency *">
            <DropWithAdd onAdd={() => openModal('currency') } showAdd={isAdmin()}>
              <Select value={form.purchaseCurCode ?? ''} onChange={(e) => set('purchaseCurCode', e.target.value)} required>
                {currencies.map((c) => (
                <option key={c.curCode} value={c.curCode}>
                  {formatCurrencyLabel(c)}
                </option>
              ))}
              </Select>
            </DropWithAdd>
          </Field>

          <Field label="Purchase Date">
            <input className={inputCls} type="date" value={form.purchaseDate ?? ''} onChange={(e) => set('purchaseDate', e.target.value)} />
          </Field>
          <Field label="Purchase Order No">
            <input className={inputCls} value={form.purchaseOrderNo ?? ''} onChange={(e) => set('purchaseOrderNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Invoice No">
            <input className={inputCls} value={form.invoiceNo ?? ''} onChange={(e) => set('invoiceNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Invoice Date">
            <input className={inputCls} type="date" value={form.invoiceDate ?? ''} onChange={(e) => set('invoiceDate', e.target.value)} />
          </Field>
          <Field label="Accounting Entry Date">
            <input className={inputCls} type="date" value={form.accountingEntryDate ?? ''} onChange={(e) => set('accountingEntryDate', e.target.value)} />
          </Field>
          <Field label="Accounting JV No">
            <input className={inputCls} value={form.accountingEntryJVNo ?? ''} onChange={(e) => set('accountingEntryJVNo', e.target.value)} maxLength={10} />
          </Field>
          <Field label="Barcode Number">
            <input className={inputCls} value={form.barcodeNumber ?? ''} onChange={(e) => set('barcodeNumber', e.target.value)} maxLength={20} />
          </Field>
          <Field label="Serial Number">
            <input className={inputCls} value={form.serialNumber ?? ''} onChange={(e) => set('serialNumber', e.target.value)} maxLength={50} />
          </Field>
        <Field label="Contact / Supplier">
          <DropWithAdd onAdd={() => openModal('contact')}>
            <Select value={form.contactID ?? ''} onChange={(e) => set('contactID', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">None</option>
              {contacts.map((c) => <option key={c.contactID} value={c.contactID}>{c.contactName}</option>)}
            </Select>
          </DropWithAdd>
        </Field>
          <Field label={installedAtRequired ? 'Installed At *' : 'Installed At'}>
            <input
              className={inputCls}
              value={form.installedAt ?? ''}
              onChange={(e) => set('installedAt', e.target.value)}
              maxLength={50}
              required={installedAtRequired}
            />
          </Field>
          <Field label="Donation">
            <Select value={form.donation ? 'true' : 'false'} onChange={(e) => set('donation', e.target.value === 'true')}>
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          </Field>
          <Field label="Remark">
            <input className={inputCls} value={form.remark ?? ''} onChange={(e) => set('remark', e.target.value)} maxLength={100} />
          </Field>
        </div>

        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={saving} className="bg-[#9a7c4b] text-white border-none rounded-lg px-7 py-2.5 text-sm font-semibold cursor-pointer hover:bg-[#7d6339] transition-colors disabled:opacity-70">
            {saving ? 'Saving…' : isEdit ? 'Update Asset' : 'Create Asset'}
          </button>
          <Link to={isEdit ? `/assets/${assetId}` : '/assets'} className="px-5 py-2.5 rounded-lg border border-[#ccc] text-[#555] no-underline text-sm hover:bg-surface-2">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-[#555] uppercase">{label}</label>
      {children}
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</label>
      {children}
    </div>
  );
}

function DropWithAdd({ children, onAdd, showAdd = true }: { children: React.ReactNode; onAdd: () => void; showAdd?: boolean }) {
  if (!showAdd) return <>{children}</>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        onClick={onAdd}
        title="Add new"
        className="shrink-0 w-8 h-[38px] flex items-center justify-center rounded-lg border border-pearl-200 bg-white text-navy-600 hover:bg-navy-50 hover:border-navy-300 transition-colors cursor-pointer"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

function QuickAddModal({ title, onClose, onSubmit, saving, children }: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-2xl border border-pearl-200 shadow-card-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-pearl-200">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1f2b7b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-ink-800">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-300 hover:bg-pearl-100 hover:text-ink-600 transition-colors cursor-pointer border-none bg-transparent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          <div className="px-6 py-4 border-t border-pearl-200 flex items-center justify-between">
            <p className="text-[11px] text-ink-300">New entry will be auto-selected after saving.</p>
            <div className="flex gap-2.5">
              <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-[13px]">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-[13px]">
                {saving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}