import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import clsx from 'clsx';
import CommandPalette from './CommandPalette';
import NotificationBell from './NotificationBell';

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function IconAssets() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  );
}
function IconInventory() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
function IconDepreciation() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}
function IconContacts() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  );
}
function IconCompanies() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

// ─── Nav Item ────────────────────────────────────────────────────────────────

function IconReports() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

const navItems = [
  { to: '/assets',        label: 'Assets',      Icon: IconAssets },
  { to: '/inventories',   label: 'Inventory',   Icon: IconInventory },
  { to: '/depreciations', label: 'Depreciation',Icon: IconDepreciation },
  { to: '/reports',       label: 'Reports',     Icon: IconReports },
  { to: '/contacts',      label: 'Contacts',    Icon: IconContacts },
  { to: '/settings',      label: 'Settings',    Icon: IconSettings },
];

function NavItem({ to, Icon, label }: { to: string; Icon: () => React.ReactElement; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-r-md no-underline text-[13px] font-medium transition-all duration-150 border-l-[3px] my-0.5',
          isActive
            ? 'bg-gradient-to-r from-navy-400/30 to-navy-700/40 border-gold-400 text-white font-semibold'
            : 'border-transparent text-navy-200 hover:bg-navy-700 hover:text-white'
        )
      }
    >
      <Icon />
      {label}
    </NavLink>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function avatarColor(name: string) {
  const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-violet-600', 'bg-emerald-600', 'bg-teal-600'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, logout, isAdmin, activeCompanyId, setActiveCompanyId } = useAuth();
  const navigate = useNavigate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [companyDropOpen, setCompanyDropOpen] = useState(false);
  const companyDropRef = useRef<HTMLDivElement>(null);

  // Unique companies from permissions
  const companies = user?.permissions
    ? [...new Map(user.permissions.map((p) => [p.companyID, { id: p.companyID, name: p.companyName }])).values()]
    : [];

  const activeCompany = activeCompanyId != null ? companies.find((c) => c.id === activeCompanyId) : null;

  // Ctrl+K opens palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close company dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (companyDropRef.current && !companyDropRef.current.contains(e.target as Node)) {
        setCompanyDropOpen(false);
      }
    }
    if (companyDropOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [companyDropOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = getInitials(user?.fullName ?? 'U');
  const colorClass = avatarColor(user?.fullName ?? '');

  return (
    <NotificationProvider>
    <div className="flex flex-col min-h-screen">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* ── Top App Bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-11 bg-navy-800 border-b border-navy-700 flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 w-[240px] shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 9 18 20 6 20 2 9" fill="#d4a928" stroke="#d4a928" strokeWidth="1"/>
          </svg>
          <span className="text-white font-bold text-[14px] tracking-tight">Asset Management</span>
        </div>

        {/* Search trigger */}
        <div className="flex-1 max-w-sm">
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 bg-navy-700 border border-navy-600 rounded-md px-3 py-1.5 text-navy-300 text-[13px] cursor-pointer hover:border-navy-400 hover:text-navy-200 transition-colors"
          >
            <IconSearch />
            <span className="flex-1 text-left">Search assets, settings…</span>
            <kbd className="text-[10px] text-navy-500 bg-navy-800 px-1.5 py-0.5 rounded font-mono shrink-0">Ctrl K</kbd>
          </button>
        </div>

        <div className="flex-1" />

        {/* Notification bell */}
        <NotificationBell />

        {/* User */}
        <div className="flex items-center gap-2">
          <div className={clsx('w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0', colorClass)}>
            {initials}
          </div>
          <span className="text-[13px] text-navy-200 font-medium hidden sm:block">{user?.fullName}</span>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-1.5 ml-2 text-navy-300 hover:text-white text-[12px] transition-colors cursor-pointer border-none bg-transparent"
          >
            <IconLogout />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 pt-11">
        {/* ── Sidebar ── */}
        <aside className="w-[240px] bg-navy-600 flex flex-col sticky top-11 h-[calc(100vh-44px)] shrink-0 border-r border-navy-700">

          {/* Company switcher */}
          <div className="px-3 py-3 border-b border-navy-700 relative" ref={companyDropRef}>
            <button
              onClick={() => setCompanyDropOpen((v) => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2 bg-navy-700 hover:bg-navy-500 rounded-lg text-left transition-colors cursor-pointer border-none"
            >
              <div className="w-6 h-6 rounded bg-gold-400/20 flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4a928" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 22 9 18 20 6 20 2 9"/>
                </svg>
              </div>
              <span className="flex-1 text-[13px] text-white font-medium truncate">
                {activeCompany?.name ?? 'All Companies'}
              </span>
              <span className={clsx('text-navy-300 transition-transform duration-150', companyDropOpen && 'rotate-180')}>
                <IconChevronDown />
              </span>
            </button>

            {/* Dropdown */}
            {companyDropOpen && companies.length > 0 && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-navy-800 border border-navy-600 rounded-lg shadow-card-lg z-10 overflow-hidden">
                {/* All Companies option */}
                <button
                  onClick={() => { setActiveCompanyId(null); setCompanyDropOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-navy-700 transition-colors cursor-pointer border-none bg-transparent border-b border-navy-700"
                >
                  <span className={clsx('w-4 shrink-0', activeCompanyId === null ? 'text-gold-400' : 'text-transparent')}>
                    <IconCheck />
                  </span>
                  <span className={clsx('truncate', activeCompanyId === null ? 'text-white font-semibold' : 'text-navy-300')}>
                    All Companies
                  </span>
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setActiveCompanyId(c.id); setCompanyDropOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] hover:bg-navy-700 transition-colors cursor-pointer border-none bg-transparent"
                  >
                    <span className={clsx('w-4 shrink-0', c.id === activeCompanyId ? 'text-gold-400' : 'text-transparent')}>
                      <IconCheck />
                    </span>
                    <span className={clsx('truncate', c.id === activeCompanyId ? 'text-white font-semibold' : 'text-navy-200')}>
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-0 py-3 overflow-y-auto">
            <div className="px-4 pb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">
                Asset Management
              </span>
            </div>
            {navItems.map((item) => <NavItem key={item.to} {...item} />)}

            {isAdmin() && (
              <>
                <div className="px-4 pt-4 pb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-300">
                    Admin Setting
                  </span>
                </div>
                <NavItem to="/companies" Icon={IconCompanies} label="Companies" />
                <NavItem to="/users"     Icon={IconUsers}     label="Users" />
              </>
            )}
          </nav>

          {/* Help footer */}
          <div className="px-3 pb-4 border-t border-navy-700 pt-3">
            <div className="bg-navy-800 rounded-lg px-3 py-2.5">
              <div className="text-[12px] text-gold-400 font-semibold mb-0.5">Need help?</div>
              <div className="text-[11px] text-navy-300">Documentation & support</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-pearl-50 min-h-[calc(100vh-44px)] overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </NotificationProvider>
  );
}
