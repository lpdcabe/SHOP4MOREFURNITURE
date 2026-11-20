import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'fa-home', label: 'Dashboard' },
  { to: '/products', icon: 'fa-couch', label: 'Products' },
  { to: '/inventory', icon: 'fa-boxes', label: 'Inventory' },
  { to: '/suppliers', icon: 'fa-truck', label: 'Suppliers' },
  { to: '/customers', icon: 'fa-users', label: 'Customers' },
  { to: '/purchase-orders', icon: 'fa-file-invoice', label: 'Purchase Orders' },
  { to: '/receiving', icon: 'fa-dolly', label: 'Goods Receiving' },
  { to: '/delivery', icon: 'fa-truck-ramp-box', label: 'Delivery Receipts' },
  { to: '/reports', icon: 'fa-chart-line', label: 'Reports' },
  { to: '/abc-analysis', icon: 'fa-chart-pie', label: 'ABC Analysis' }
];

const HeaderContext = createContext(null);

export function AppShell() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [header, setHeader] = useState({
    title: '',
    searchValue: '',
    onSearchChange: null,
    searchPlaceholder: 'Search...'
  });

  let user = { name: 'Admin', username: 'administrator', email: 'shop4more@email.com' };
  try {
    const raw = localStorage.getItem('shop4more_user');
    if (raw) user = { ...user, ...JSON.parse(raw) };
  } catch {
    // ignore invalid JSON
  }

  const initial = (user.name || user.username || 'A').charAt(0).toUpperCase();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('shop4more_user');
    setMenuOpen(false);
    navigate('/');
  };

  return (
    <HeaderContext.Provider value={setHeader}>
      <div className="wrapper">
        <aside className="sidebar">
          <div className="logo">
            <img src="/assets/ICON.jpg" className="logo-img" alt="Shop 4 More Logo" />
            <div className="logo-text">
              <h3>SHOP 4 MORE</h3>
              <small>Furniture Inventory</small>
            </div>
          </div>

          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  <i className={`fas ${item.icon}`} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </aside>

        <main className="content">
          <header className="app-header">
            <h2 className="mb-0">{header.title}</h2>

            <div className="app-header-right">
              {typeof header.onSearchChange === 'function' && (
                <div className="search">
                  <input
                    type="text"
                    placeholder={header.searchPlaceholder}
                    value={header.searchValue}
                    onChange={(e) => header.onSearchChange(e.target.value)}
                  />
                  <button type="button" aria-label="Search">
                    <i className="fas fa-search" />
                  </button>
                </div>
              )}

              <div className="user-menu-wrapper" ref={menuRef}>
                <button
                  type="button"
                  className="user-avatar-btn"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="User menu"
                >
                  {initial}
                </button>

                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-name">{user.name || 'Admin'}</div>
                      <div className="user-dropdown-email">
                        {user.email || user.username}
                      </div>
                    </div>
                    <div className="user-dropdown-divider" />
                    <button
                      type="button"
                      className="user-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate('/settings');
                      }}
                    >
                      Settings
                    </button>
                    <button
                      type="button"
                      className="user-dropdown-item logout"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </HeaderContext.Provider>
  );
}

export default function Layout({
  title,
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search...',
  children
}) {
  const setHeader = useContext(HeaderContext);

  useEffect(() => {
    if (setHeader) {
      setHeader({ title, searchValue, onSearchChange, searchPlaceholder });
    }
  }, [setHeader, title, searchValue, onSearchChange, searchPlaceholder]);

  return <>{children}</>;
}
