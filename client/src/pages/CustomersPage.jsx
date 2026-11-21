import { useEffect, useMemo, useState } from 'react';
import Layout, { useFeedback } from '../components/Layout.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import TableActionMenu from '../components/TableActionMenu.jsx';
import { api, getNextCode } from '../services/api.js';

const CUSTOMER_ACTIONS = [
  { key: 'edit', label: 'Edit', icon: 'fas fa-edit', variant: 'primary' },
  { key: 'delete', label: 'Delete', icon: 'fas fa-trash', variant: 'danger' }
];

const EMPTY = {
  code: '',
  name: '',
  contact_number: '',
  email: '',
  address: '',
  total_orders: 0,
  status: 'Active'
};

export default function CustomersPage() {
  const { notify, confirmAction } = useFeedback();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setCustomers(await api.getCustomers());
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
    return customers.filter((c) => {
      const matchesSearch = `${c.code} ${c.name} ${c.email} ${c.address}`
        .toLowerCase()
        .includes(q);
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const pg = usePagination(filtered, 10);

  const openModal = (item = null) => {
    setEditing(item);
    setForm(item ? { ...EMPTY, ...item } : { ...EMPTY, code: getNextCode(customers, 'code', 'CUS-', 3) });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...form, total_orders: Number(form.total_orders) || 0 };
    if (editing) {
      await api.updateCustomer(editing.id, payload);
      notify('Customer updated.');
    } else {
      await api.createCustomer(payload);
      notify('Customer added.');
    }
    setShowModal(false);
    await load();
  };

  const handleDelete = async (id) => {
    const ok = await confirmAction({ message: 'Are you sure you want to delete this customer?' });
    if (!ok) return;
    await api.deleteCustomer(id);
    notify('Customer deleted.');
    await load();
  };

  const pageFilters = useMemo(
    () => [
      {
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: ['All', 'Active', 'Occasional', 'Inactive']
      }
    ],
    [statusFilter]
  );

  return (
    <Layout
      title="Customer Management"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Customer"
      filters={pageFilters}
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-4 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">Customer Directory</h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <TableActionMenu
              mode={actionMode}
              onModeChange={setActionMode}
              actions={CUSTOMER_ACTIONS}
            />
            <button className="btn btn-maroon" onClick={() => openModal()}>
              <i className="fas fa-user-plus me-2" />
              Add Customer
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Contact Number</th>
                <th>Email</th>
                <th>Address</th>
                <th>Total Orders</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pg.paginatedItems.map((c) => (
                <tr
                  key={c.id}
                  className={actionMode ? `table-row-action table-row-action-${actionMode}` : ''}
                  onClick={() => {
                    if (actionMode === 'edit') openModal(c);
                    else if (actionMode === 'delete') handleDelete(c.id);
                  }}
                >
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.contact_number}</td>
                  <td>{c.email}</td>
                  <td>{c.address}</td>
                  <td>{c.total_orders}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.status === 'Active' ? 'bg-success' : 'bg-warning text-dark'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} onPageChange={pg.setPage} />
      </div>

      {showModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{editing ? 'Edit Customer' : 'Add Customer'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                {editing && (
                  <div className="col-md-4">
                    <label className="form-label">Customer ID</label>
                    <input className="form-control bg-light" value={form.code} readOnly disabled />
                  </div>
                )}
                <div className={editing ? 'col-md-8' : 'col-12'}>
                  <label className="form-label">Name</label>
                  <input
                    className="form-control"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Contact Number</label>
                  <input
                    className="form-control"
                    value={form.contact_number}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Total Orders</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={form.total_orders}
                    onChange={(e) => setForm({ ...form, total_orders: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Active</option>
                    <option>Occasional</option>
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
