import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { lookupsApi } from '../api/lookups';
import type { GroupType, CategoryType, LocationType, LocationDetail } from '../types';

type Section = 'groups' | 'categories' | 'locations' | 'location-details';

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('groups');
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [locations, setLocations] = useState<LocationType[]>([]);
  const [locDetails, setLocDetails] = useState<LocationDetail[]>([]);

  useEffect(() => {
    Promise.all([
      lookupsApi.getGroups(),
      lookupsApi.getCategories(),
      lookupsApi.getLocations(),
      lookupsApi.getLocationDetails(),
    ]).then(([g, c, l, ld]) => {
      setGroups(g.data as GroupType[]);
      setCategories(c.data as CategoryType[]);
      setLocations(l.data as LocationType[]);
      setLocDetails(ld.data as LocationDetail[]);
    });
  }, []);

  async function deleteGroup(id: number) {
    if (!confirm('Delete this group?')) return;
    try {
      await lookupsApi.deleteGroup(id);
      setGroups((prev) => prev.filter((g) => g.groupID !== id));
      toast.success('Group deleted');
    } catch { toast.error('Delete failed — group may be in use'); }
  }

  async function deleteCategory(id: number) {
    if (!confirm('Delete this category?')) return;
    try {
      await lookupsApi.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.categoryID !== id));
      toast.success('Category deleted');
    } catch { toast.error('Delete failed — category may be in use'); }
  }

  async function deleteLocation(id: number) {
    if (!confirm('Delete this location?')) return;
    try {
      await lookupsApi.deleteLocation(id);
      setLocations((prev) => prev.filter((l) => l.locationID !== id));
      toast.success('Location deleted');
    } catch { toast.error('Delete failed — location may be in use'); }
  }

  async function deleteLocDetail(id: number) {
    if (!confirm('Delete this location detail?')) return;
    try {
      await lookupsApi.deleteLocationDetail(id);
      setLocDetails((prev) => prev.filter((l) => l.locDetailID !== id));
      toast.success('Location detail deleted');
    } catch { toast.error('Delete failed'); }
  }

  const sections: { key: Section; label: string }[] = [
    { key: 'groups', label: 'Asset Groups' },
    { key: 'categories', label: 'Categories' },
    { key: 'locations', label: 'Locations' },
    { key: 'location-details', label: 'Location Details' },
  ];

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e3a5f', marginBottom: 20 }}>Settings</h2>
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #eee', marginBottom: 24 }}>
        {sections.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} style={{
            padding: '8px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            color: section === s.key ? '#1e3a5f' : '#888',
            borderBottom: section === s.key ? '2px solid #1e3a5f' : '2px solid transparent', marginBottom: -2,
          }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === 'groups' && (
        <SettingsTable
          title="Asset Groups"
          columns={['Group Name', 'Acronym', 'Dep. Rate %', 'Accounting Exclusion']}
          rows={groups.map((g) => [g.groupName, g.acronym, `${g.depreciationRate}%`, g.accountingExclusion ? 'Yes' : 'No'])}
          onDelete={(i) => deleteGroup(groups[i].groupID)}
        />
      )}
      {section === 'categories' && (
        <SettingsTable
          title="Categories"
          columns={['Category', 'Group']}
          rows={categories.map((c) => [c.category, groups.find((g) => g.groupID === c.groupID)?.groupName ?? String(c.groupID)])}
          onDelete={(i) => deleteCategory(categories[i].categoryID)}
        />
      )}
      {section === 'locations' && (
        <SettingsTable
          title="Locations"
          columns={['Location']}
          rows={locations.map((l) => [l.location])}
          onDelete={(i) => deleteLocation(locations[i].locationID)}
        />
      )}
      {section === 'location-details' && (
        <SettingsTable
          title="Location Details"
          columns={['Location', 'Floor', 'Zone', 'Room']}
          rows={locDetails.map((d) => [
            locations.find((l) => l.locationID === d.locationID)?.location ?? String(d.locationID),
            d.floor, d.zone ?? '—', d.room ?? '—',
          ])}
          onDelete={(i) => deleteLocDetail(locDetails[i].locDetailID)}
        />
      )}
    </div>
  );
}

function SettingsTable({
  title, columns, rows, onDelete,
}: {
  title: string; columns: string[]; rows: string[][]; onDelete: (i: number) => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{title}</h3>
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#666', background: '#f8f9fa', borderBottom: '1px solid #eee' }}>{c}</th>
              ))}
              <th style={{ padding: '10px 14px', background: '#f8f9fa', borderBottom: '1px solid #eee' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} style={{ padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>No records.</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '10px 14px', fontSize: 13, color: '#333' }}>{cell}</td>
                  ))}
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => onDelete(i)} style={{ background: '#fee', color: '#c0392b', border: '1px solid #fcc', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
