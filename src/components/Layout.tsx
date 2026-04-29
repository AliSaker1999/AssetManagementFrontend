import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/assets', label: 'Assets', icon: '🏷️' },
  { to: '/inventories', label: 'Inventory', icon: '📋' },
  { to: '/depreciations', label: 'Depreciation', icon: '📉' },
  { to: '/contacts', label: 'Contacts', icon: '👥' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={sidebar}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>Asset Management</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>System</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8, margin: '2px 0',
                textDecoration: 'none', fontSize: 14, fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                transition: 'all 0.15s',
              })}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Logged in as</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 10 }}>{user?.fullName}</div>
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: '#f5f7fa', minHeight: '100vh', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}

const sidebar: React.CSSProperties = {
  width: 220,
  background: 'linear-gradient(180deg, #1e3a5f 0%, #152a46 100%)',
  display: 'flex',
  flexDirection: 'column',
  position: 'sticky',
  top: 0,
  height: '100vh',
  flexShrink: 0,
};
