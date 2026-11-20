import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function DeliveryPage() {
  const [receipts, setReceipts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
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
      setMessage({ type: 'warning', text: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return receipts.filter((r) =>
      `${r.dr_no} ${r.customer_name} ${r.driver} ${r.status}`.toLowerCase().includes(q)
    );
  }, [receipts, search]);

  const openModal = () => {
    setForm({
      dr_no: `DR-${String(receipts.length + 1).padStart(4, '0')}`,
      delivery_date: today(),
      customer_name: customers[0]?.name || '',
      driver: '',
      vehicle: '',
      status: 'Preparing',
      delivery_address: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createDeliveryReceipt(form);
      setMessage({ type: 'success', text: 'Delivery receipt saved.' });
      setShowModal(false);
      await load();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const advanceStatus = async (dr) => {
    const next =
      dr.status === 'Preparing'
        ? 'Out for Delivery'
        : dr.status === 'Out for Delivery'
        ? 'Delivered'
        : 'Preparing';
    await api.updateDeliveryReceipt(dr.id, { status: next });
    await load();
  };

  return (
    <Layout
      title="Delivery Receipts"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Delivery Receipt"
    >
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="card mt-2 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Delivery History</h4>
          <button className="btn btn-maroon" onClick={openModal}>
            <i className="fas fa-truck-fast me-2" />
            Create Delivery Receipt
          </button>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((dr) => {
                const badgeCls =
                  dr.status === 'Delivered'
                    ? 'bg-success'
                    : dr.status === 'Out for Delivery'
                    ? 'bg-warning text-dark'
                    : 'bg-secondary';
                return (
                  <tr key={dr.id}>
                    <td>{dr.dr_no}</td>
                    <td>{dr.customer_name}</td>
                    <td>{dr.delivery_date}</td>
                    <td>{dr.driver}</td>
                    <td>
                      <span className={`badge ${badgeCls}`}>{dr.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm me-2"
                        title="Cycle Status"
                        onClick={() => advanceStatus(dr)}
                      >
                        <i className="fas fa-sync-alt" />
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        title="Print"
                        onClick={() => window.print()}
                      >
                        <i className="fas fa-print" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No delivery receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom" style={{ maxWidth: '640px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="fas fa-truck-fast me-2" />
                Create Delivery Receipt
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">DR Number</label>
                  <input
                    className="form-control"
                    required
                    value={form.dr_no}
                    onChange={(e) => setForm({ ...form, dr_no: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={form.delivery_date}
                    onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Customer</label>
                  <select
                    className="form-control"
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
                    className="form-control"
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
