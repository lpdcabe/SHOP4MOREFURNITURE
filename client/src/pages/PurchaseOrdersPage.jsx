import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api, formatPeso, getNextCode } from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    po_no: '',
    supplier_name: '',
    order_date: today(),
    expected_delivery: today(),
    total_amount: '',
    status: 'Pending',
    notes: ''
  });
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [pos, sups] = await Promise.all([api.getPurchaseOrders(), api.getSuppliers()]);
      setOrders(pos);
      setSuppliers(sups);
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
    return orders.filter((o) => {
      const matchesSearch = `${o.po_no} ${o.supplier_name} ${o.status}`
        .toLowerCase()
        .includes(q);
      const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchesSupplier = supplierFilter === 'All' || o.supplier_name === supplierFilter;
      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [orders, search, statusFilter, supplierFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      po_no: getNextCode(orders, 'po_no', 'PO-', 4),
      supplier_name: suppliers[0]?.company_name || 'ABC Furniture',
      order_date: today(),
      expected_delivery: today(),
      total_amount: '',
      status: 'Pending',
      notes: ''
    });
    setShowModal(true);
  };

  const openEdit = (po) => {
    setEditing(po);
    setForm({
      po_no: po.po_no || '',
      supplier_name: po.supplier_name || '',
      order_date: po.order_date || today(),
      expected_delivery: po.expected_delivery || today(),
      total_amount: po.total_amount ?? '',
      status: po.status || 'Pending',
      notes: po.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      total_amount: Number(form.total_amount) || 0
    };
    if (editing) {
      await api.updatePurchaseOrder(editing.id, payload);
    } else {
      await api.createPurchaseOrder(payload);
    }
    setShowModal(false);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this purchase order?')) return;
    await api.deletePurchaseOrder(id);
    await load();
  };


  const pageFilters = useMemo(
    () => [
      {
        label: 'Supplier',
        value: supplierFilter,
        onChange: setSupplierFilter,
        options: ['All', ...suppliers.map((s) => s.company_name)]
      },
      {
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: ['All', 'Approved', 'Pending', 'Cancelled']
      }
    ],
    [supplierFilter, statusFilter, suppliers]
  );

  return (
    <Layout
      title="Purchase Orders"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Purchase Order"
      filters={pageFilters}
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Purchase Order List</h4>
          <button className="btn btn-maroon" onClick={openCreate}>
            <i className="fas fa-plus me-2" />
            Create Purchase Order
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>PO No.</th>
                <th>Supplier</th>
                <th>Order Date</th>
                <th>Expected Delivery</th>
                <th>Total Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((po) => {
                const badgeCls =
                  po.status === 'Approved'
                    ? 'bg-success'
                    : po.status === 'Pending'
                    ? 'bg-warning text-dark'
                    : 'bg-danger';
                return (
                  <tr key={po.id}>
                    <td>{po.po_no}</td>
                    <td>{po.supplier_name}</td>
                    <td>{po.order_date}</td>
                    <td>{po.expected_delivery}</td>
                    <td>{formatPeso(po.total_amount)}</td>
                    <td>
                      <span className={`badge ${badgeCls}`}>{po.status}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm me-2"
                        title="Edit Purchase Order"
                        onClick={() => openEdit(po)}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="btn btn-success btn-sm me-2"
                        title="Print"
                        onClick={() => window.print()}
                      >
                        <i className="fas fa-print" />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        title="Delete Purchase Order"
                        onClick={() => handleDelete(po.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop-custom">
          <div className="modal-card-custom">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">{editing ? 'Edit Purchase Order' : 'Create Purchase Order'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave}>
              <div className="row g-3">
                {editing && (
                  <div className="col-md-6">
                    <label className="form-label">PO No.</label>
                    <input className="form-control bg-light" value={form.po_no} readOnly disabled />
                  </div>
                )}
                <div className={editing ? 'col-md-6' : 'col-12'}>
                  <label className="form-label">Supplier</label>
                  <select
                    className="form-control"
                    value={form.supplier_name}
                    onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.company_name}>
                        {s.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Order Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.order_date}
                    onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Expected Delivery</label>
                  <input
                    type="date"
                    className="form-control"
                    value={form.expected_delivery}
                    onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Total Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="form-control"
                    value={form.total_amount}
                    onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
