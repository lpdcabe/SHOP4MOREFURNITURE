import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../services/api.js';

const EMPTY = {
  code: '',
  company_name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  status: 'Active'
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setSuppliers(await api.getSuppliers());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return suppliers.filter((s) =>
      `${s.code} ${s.company_name} ${s.contact_person} ${s.address}`.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  const openModal = (item = null) => {
    setEditing(item);
    setForm(item ? { ...EMPTY, ...item } : { ...EMPTY, code: `SUP-${String(suppliers.length + 1).padStart(3, '0')}` });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editing) {
      await api.updateSupplier(editing.id, form);
    } else {
      await api.createSupplier(form);
    }
    setShowModal(false);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this supplier?')) return;
    await api.deleteSupplier(id);
    await load();
  };

  return (
    <Layout
      title="Supplier Management"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Supplier"
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Supplier Directory</h4>
          <button className="btn btn-maroon" onClick={() => openModal()}>
            <i className="fas fa-plus me-2" />
            Add Supplier
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Supplier ID</th>
                <th>Company Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Address</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.code}</td>
                  <td>{s.company_name}</td>
                  <td>{s.contact_person}</td>
                  <td>{s.phone}</td>
                  <td>{s.email}</td>
                  <td>{s.address}</td>
                  <td>
                    <span
                      className={`badge ${
                        s.status === 'Active' ? 'bg-success' : 'bg-warning text-dark'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm me-2"
                      onClick={() => openModal(s)}
                    >
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(s.id)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{editing ? 'Edit Supplier' : 'Add Supplier'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Supplier ID</label>
                  <input
                    className="form-control"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="col-md-8">
                  <label className="form-label">Company Name</label>
                  <input
                    className="form-control"
                    required
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contact Person</label>
                  <input
                    className="form-control"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Address</label>
                  <input
                    className="form-control"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-maroon">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
