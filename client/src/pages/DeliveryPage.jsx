import { useEffect, useMemo, useState } from 'react';
import Layout, { useFeedback } from '../components/Layout.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import TableActionMenu from '../components/TableActionMenu.jsx';
import { api, getNextCode } from '../services/api.js';

const DELIVERY_ACTIONS = [
  { key: 'edit', label: 'Edit', icon: 'fas fa-edit', variant: 'primary' },
  { key: 'print', label: 'Print', icon: 'fas fa-print', variant: 'success' },
  { key: 'delete', label: 'Delete', icon: 'fas fa-trash', variant: 'danger' }
];

const today = () => new Date().toISOString().slice(0, 10);

export default function DeliveryPage() {
  const { notify, confirmAction } = useFeedback();
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [form, setForm] = useState({
    dr_no: 'DR-0001',
    delivery_date: today(),
    customer_name: '',
    driver: '',
    vehicle: '',
    status: 'Preparing',
    delivery_address: ''
  });

  const load = async () => {
    try {
      const [drs, custs] = await Promise.all([api.getDeliveryReceipts(), api.getCustomers()]);
      setReceipts(drs);
      setCustomers(custs);
    } catch (err) {
      notify(err.message, 'warning');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter((r) => {
      const matchesSearch = `${r.dr_no} ${r.customer_name} ${r.driver} ${r.status}`
        .toLowerCase()
        .includes(q);
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [receipts, search, statusFilter]);

  const pg = usePagination(filtered, 10);

  const openModal = (item = null) => {
    setEditing(item);
    if (item) {
      setForm({
        dr_no: item.dr_no || '',
        delivery_date: item.delivery_date || today(),
        customer_name: item.customer_name || '',
        driver: item.driver || '',
        vehicle: item.vehicle || '',
        status: item.status || 'Preparing',
        delivery_address: item.delivery_address || ''
      });
    } else {
      setForm({
        dr_no: getNextCode(receipts, 'dr_no', 'DR-', 4),
        delivery_date: today(),
        customer_name: customers[0]?.name || '',
        driver: '',
        vehicle: '',
        status: 'Preparing',
        delivery_address: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateDeliveryReceipt(editing.id, form);
        notify('Delivery receipt updated.');
      } else {
        await api.createDeliveryReceipt(form);
        notify('Delivery receipt saved.');
      }
      setShowModal(false);
      await load();
    } catch (err) {
      notify(err.message, 'danger');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirmAction({ message: 'Are you sure you want to delete this delivery receipt?' });
    if (!ok) return;
    await api.deleteDeliveryReceipt(id);
    notify('Delivery receipt deleted.');
    await load();
  };

  const pageFilters = useMemo(
    () => [
      {
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: ['All', 'Preparing', 'Out for Delivery', 'Delivered']
      }
    ],
    [statusFilter]
  );

  return (
    <Layout
      title="Delivery Receipts"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Delivery Receipt"
      filters={pageFilters}
    >
      <div className="card mt-2 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">Delivery History</h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <TableActionMenu
              mode={actionMode}
              onModeChange={setActionMode}
              actions={DELIVERY_ACTIONS}
            />
            <button className="btn btn-maroon" onClick={() => openModal()}>
              <i className="fas fa-truck-fast me-2" />
              Create Delivery Receipt
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>DR No.</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Driver</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pg.paginatedItems.map((dr) => {
                const badgeCls =
                  dr.status === 'Delivered'
                    ? 'bg-success'
                    : dr.status === 'Out for Delivery'
                    ? 'bg-warning text-dark'
                    : 'bg-secondary';
                return (
                  <tr
                    key={dr.id}
                    className={actionMode ? `table-row-action table-row-action-${actionMode}` : ''}
                    onClick={() => {
                      if (actionMode === 'edit') openModal(dr);
                      else if (actionMode === 'print') window.print();
                      else if (actionMode === 'delete') handleDelete(dr.id);
                    }}
                  >
                    <td>{dr.dr_no}</td>
                    <td>{dr.customer_name}</td>
                    <td>{dr.delivery_date}</td>
                    <td>{dr.driver}</td>
                    <td>
                      <span className={`badge ${badgeCls}`}>{dr.status}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No delivery receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} onPageChange={pg.setPage} />
      </div>

      {showModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: '640px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="fas fa-truck-fast me-2" />
                {editing ? `Edit Delivery Receipt (${editing.dr_no})` : 'Create Delivery Receipt'}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Customer</label>
                  <select
                    className="form-select"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Driver</label>
                  <input
                    className="form-control"
                    placeholder="Driver Name"
                    value={form.driver}
                    onChange={(e) => setForm({ ...form, driver: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Vehicle</label>
                  <input
                    className="form-control"
                    placeholder="Vehicle Plate Number"
                    value={form.vehicle}
                    onChange={(e) => setForm({ ...form, vehicle: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Preparing</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Delivery Address</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={form.delivery_address}
                    onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
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
                  <i className="fas fa-save me-2" />
                  Save Delivery Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
