import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../services/api.js';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    company_name: 'Shop 4 More Furniture',
    business_address: 'Angeles City, Pampanga',
    contact_number: '0917-123-4567',
    email: 'shop4more@email.com',
    admin_name: 'Admin',
    admin_username: 'administrator',
    admin_password: 'password',
    low_stock_notification: true,
    auto_generate_code: true,
    allow_negative_inventory: false,
    theme_color: 'Maroon & White',
    language: 'English',
    time_zone: 'GMT +8 Philippines'
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        if (data && data.id) setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setMessage({ type: 'success', text: 'Settings saved to Supabase.' });
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  return (
    <Layout title="System Settings">
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="row mt-4 g-4">
        <div className="col-12">
          <div className="card p-4">
            <h4>
              <i className="fas fa-building me-2" />
              Company Information
            </h4>
            <hr />
            <div className="mb-3">
              <label className="form-label">Company Name</label>
              <input
                className="form-control"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Business Address</label>
              <input
                className="form-control"
                value={settings.business_address}
                onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Contact Number</label>
              <input
                className="form-control"
                value={settings.contact_number}
                onChange={(e) => setSettings({ ...settings, contact_number: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <button className="btn btn-maroon" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card p-4">
            <h4>
              <i className="fas fa-user-shield me-2" />
              Administrator Account
            </h4>
            <hr />
            <div className="mb-3">
              <label className="form-label">Administrator</label>
              <input
                className="form-control"
                value={settings.admin_name}
                onChange={(e) => setSettings({ ...settings, admin_name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                className="form-control"
                value={settings.admin_username}
                onChange={(e) => setSettings({ ...settings, admin_username: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={settings.admin_password || ''}
                onChange={(e) => setSettings({ ...settings, admin_password: e.target.value })}
              />
            </div>
            <button className="btn btn-maroon" onClick={handleSave}>
              Update Account
            </button>
          </div>
        </div>
      </div>

      <div className="row mt-4 g-4">
        <div className="col-12">
          <div className="card p-4">
            <h4>
              <i className="fas fa-boxes me-2" />
              Inventory Settings
            </h4>
            <hr />
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={settings.low_stock_notification}
                onChange={(e) =>
                  setSettings({ ...settings, low_stock_notification: e.target.checked })
                }
              />
              <label className="form-check-label">Enable Low Stock Notification</label>
            </div>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={settings.auto_generate_code}
                onChange={(e) =>
                  setSettings({ ...settings, auto_generate_code: e.target.checked })
                }
              />
              <label className="form-check-label">Auto Generate Product Code</label>
            </div>
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={settings.allow_negative_inventory}
                onChange={(e) =>
                  setSettings({ ...settings, allow_negative_inventory: e.target.checked })
                }
              />
              <label className="form-check-label">Allow Negative Inventory</label>
            </div>
            <button className="btn btn-maroon" onClick={handleSave}>
              Save Inventory Settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
