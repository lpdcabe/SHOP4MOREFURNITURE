import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import FeatureTour from './FeatureTour.jsx';

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
const FeedbackContext = createContext(null);

export function useFeedback() {
  return useContext(FeedbackContext);
}

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const menuRef = useRef(null);
  const pageBodyRef = useRef(null);
  const [header, setHeader] = useState({
    title: '',
    searchValue: '',
    onSearchChange: null,
    searchPlaceholder: 'Search...',
    filters: []
  });

  const notify = (text, type = 'success') => {
    setToast({ text, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const confirmAction = ({
    title = 'Confirm Delete',
    message = 'Are you sure you want to delete this record?',
    confirmText = 'Delete'
  } = {}) =>
    new Promise((resolve) => {
      setConfirmState({ title, message, confirmText, resolve });
    });

  const closeConfirm = (result) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

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

  // Automatically populate data-label attributes on table cells for mobile card layout
  useEffect(() => {
    const root = pageBodyRef.current;
    if (!root) return;

    const applyLabels = () => {
      root.querySelectorAll('table').forEach((table) => {
        const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
          th.textContent.trim()
        );
        if (headers.length === 0) return;
        table.querySelectorAll('tbody tr').forEach((tr) => {
          Array.from(tr.children).forEach((td, idx) => {
            if (td.tagName === 'TD' && headers[idx] && !td.hasAttribute('colspan')) {
              td.setAttribute('data-label', headers[idx]);
            }
          });
        });
      });
    };

    applyLabels();
    const observer = new MutationObserver(applyLabels);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('shop4more_user');
    setMenuOpen(false);
    navigate('/');
  };

  const activeFilterCount = (header.filters || []).filter((f) => f.value && f.value !== 'All').length;

  const handleResetFilters = () => {
    (header.filters || []).forEach((f) => f.onChange?.('All'));
  };

  return (
    <FeedbackContext.Provider value={{ notify, confirmAction }}>
      <HeaderContext.Provider value={setHeader}>
      <div className="wrapper">
        {mobileNavOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
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
                  onClick={() => setMobileNavOpen(false)}
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
            <div className="app-header-left">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-label="Toggle navigation"
              >
                <i className={`fas ${mobileNavOpen ? 'fa-times' : 'fa-bars'}`} />
              </button>
              <h2 className="mb-0">{header.title}</h2>
            </div>

            {((header.filters && header.filters.length > 0) ||
              typeof header.onSearchChange === 'function') && (
              <div className="app-header-controls">
                {header.filters && header.filters.length > 0 && (
                  <button
                    type="button"
                    className={`header-filter-btn ${activeFilterCount > 0 ? 'has-active' : ''}`}
                    onClick={() => setFilterModalOpen(true)}
                  >
                    <i className="fas fa-filter" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="filter-count-badge">{activeFilterCount}</span>
                    )}
                  </button>
                )}

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
          </header>

          <div className="page-body" ref={pageBodyRef}>
            <Outlet />
          </div>
        </main>
      </div>

      {filterModalOpen && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: '440px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="fas fa-filter me-2" />
                Filters
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setFilterModalOpen(false)}
              />
            </div>

            <div className="d-flex flex-column gap-3">
              {(header.filters || []).map((f) => (
                <div key={f.label}>
                  <label className="form-label fw-semibold mb-2">{f.label}</label>
                  <div className="filter-chip-group">
                    {(f.options || []).map((opt) => {
                      const isActive = f.value === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          className={`filter-chip ${isActive ? 'active' : ''}`}
                          onClick={() => f.onChange(opt)}
                        >
                          {opt === 'All' ? `All ${f.label}` : opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-between align-items-center mt-4">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetFilters}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn btn-maroon"
                onClick={() => setFilterModalOpen(false)}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: '400px' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0 text-danger">
                <i className="fas fa-triangle-exclamation me-2" />
                {confirmState.title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => closeConfirm(false)}
              />
            </div>
            <p className="text-muted mb-4">{confirmState.message}</p>
            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => closeConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`app-toast app-toast-${toast.type}`} role="status">
          <i
            className={`fas ${
              toast.type === 'danger'
                ? 'fa-circle-exclamation'
                : toast.type === 'warning'
                ? 'fa-triangle-exclamation'
                : 'fa-circle-check'
            }`}
          />
          <span>{toast.text}</span>
          <button
            type="button"
            className="app-toast-close"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      )}
      <FeatureTour />
    </HeaderContext.Provider>
    </FeedbackContext.Provider>
  );
}

export default function Layout({
  title,
  searchValue = '',
  onSearchChange = null,
  searchPlaceholder = 'Search...',
  filters = [],
  children
}) {
  const setHeader = useContext(HeaderContext);

  useEffect(() => {
    if (setHeader) {
      setHeader({ title, searchValue, onSearchChange, searchPlaceholder, filters });
    }
  }, [setHeader, title, searchValue, onSearchChange, searchPlaceholder, filters]);

  return <>{children}</>;
}
