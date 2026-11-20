import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import { api, formatPeso, getNextCode } from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function ReceivingPage() {
  const [records, setRecords] = useState([]);
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    receiving_no: 'GR-0001',
    date_received: today(),
    po_no: '',
    supplier_name: '',
    received_by: '',
    condition: 'Good',
    remarks: '',
    status: 'Received'
  });

  const load = async () => {
    try {
      const [recs, poList, supList] = await Promise.all([
        api.getGoodsReceiving(),
        api.getPurchaseOrders(),
        api.getSuppliers()
      ]);
      setRecords(recs);
      setPos(poList);
      setSuppliers(supList);
    } catch (err) {
      setMessage({ type: 'warning', text: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchesSearch = `${r.receiving_no} ${r.po_no} ${r.supplier_name} ${r.condition}`
        .toLowerCase()
        .includes(q);
      const matchesCondition = conditionFilter === 'All' || r.condition === conditionFilter;
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchesSearch && matchesCondition && matchesStatus;
    });
  }, [records, search, conditionFilter, statusFilter]);

  const pg = usePagination(filtered, 10);

  const approvedPos = useMemo(
    () => pos.filter((po) => po.status === 'Approved'),
    [pos]
  );

  const selectedPo = useMemo(
    () => approvedPos.find((po) => po.po_no === form.po_no) || null,
    [approvedPos, form.po_no]
  );

  const openModal = (item = null) => {
    setEditing(item);
    if (item) {
      setForm({
        receiving_no: item.receiving_no || '',
        date_received: item.date_received || today(),
        po_no: item.po_no || '',
        supplier_name: item.supplier_name || '',
        received_by: item.received_by || '',
        condition: item.condition || 'Good',
        remarks: item.remarks || '',
        status: item.status || 'Received'
      });
    } else {
      const defaultPo = approvedPos[0];
      setForm({
        receiving_no: getNextCode(records, 'receiving_no', 'GR-', 4),
        date_received: today(),
        po_no: defaultPo?.po_no || '',
        supplier_name: defaultPo?.supplier_name || '',
        received_by: '',
        condition: 'Good',
        remarks: '',
        status: 'Received'
      });
    }
    setShowModal(true);
  };

  const handlePoChange = (poNo) => {
    const matched = approvedPos.find((po) => po.po_no === poNo);
    setForm((prev) => ({
      ...prev,
      po_no: poNo,
      supplier_name: matched?.supplier_name || prev.supplier_name
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const status = form.condition === 'Good' ? 'Received' : 'Inspection';
      if (editing) {
        await api.updateGoodsReceiving(editing.id, { ...form, status });
        setMessage({ type: 'success', text: 'Goods receiving record updated.' });
      } else {
        await api.createGoodsReceiving({ ...form, status });
        setMessage({ type: 'success', text: 'Goods receiving record saved.' });
      }
      setShowModal(false);
      await load();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this receiving record?')) return;
    await api.deleteGoodsReceiving(id);
    await load();
  };

  const previewStatus = form.condition === 'Good' ? 'Received' : 'Inspection';

  const pageFilters = useMemo(
    () => [
      {
        label: 'Condition',
        value: conditionFilter,
        onChange: setConditionFilter,
        options: ['All', 'Good', 'Damaged', 'Incomplete']
      },
      {
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: ['All', 'Received', 'Inspection']
      }
    ],
    [conditionFilter, statusFilter]
  );

  return (
    <Layout
      title="Goods Receiving"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Receiving No."
      filters={pageFilters}
    >
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="card mt-2 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Receiving History</h4>
          <button className="btn btn-maroon" onClick={() => openModal()}>
            <i className="fas fa-box-open me-2" />
            Receive Goods
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Receiving No.</th>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Condition</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pg.paginatedItems.map((r) => (
                <tr key={r.id}>
                  <td>{r.receiving_no}</td>
                  <td>{r.po_no}</td>
                  <td>{r.supplier_name}</td>
                  <td>{r.date_received}</td>
                  <td>{r.condition}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'Received' ? 'bg-success' : 'bg-warning text-dark'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm me-2"
                      title="Edit"
                      onClick={() => openModal(r)}
                    >
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      title="Delete"
                      onClick={() => handleDelete(r.id)}
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    No receiving records found.
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
          <div className="modal-card-custom" style={{ maxWidth: '660px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="fas fa-box-open me-2" />
                {editing ? `Edit Receiving (${editing.receiving_no})` : 'Receive Goods'}
              </h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Date Received</label>
                  <input
                    type="date"
                    className="form-control"
                    required
                    value={form.date_received}
                    onChange={(e) => setForm({ ...form, date_received: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Received By</label>
                  <input
                    className="form-control"
                    placeholder="Employee Name"
                    value={form.received_by}
                    onChange={(e) => setForm({ ...form, received_by: e.target.value })}
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Purchase Order (Approved Only)</label>
                  <select
                    className="form-select"
                    required
                    value={form.po_no}
                    onChange={(e) => handlePoChange(e.target.value)}
                  >
                    {approvedPos.length === 0 && (
                      <option value="">No approved purchase orders</option>
                    )}
                    {approvedPos.map((po) => (
                      <option key={po.id} value={po.po_no}>
                        {po.po_no} — {po.supplier_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Supplier</label>
                  <select
                    className="form-select"
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

                {selectedPo && (
                  <div className="col-12">
                    <div
                      className="p-3 rounded-3 border"
                      style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold text-dark small">
                          <i className="fas fa-file-invoice me-2 text-secondary" />
                          Purchase Order Details ({selectedPo.po_no})
                        </span>
                        <span
                          className={`badge ${
                            selectedPo.status === 'Approved'
                              ? 'bg-success'
                              : selectedPo.status === 'Pending'
                              ? 'bg-warning text-dark'
                              : 'bg-danger'
                          }`}
                        >
                          {selectedPo.status}
                        </span>
                      </div>
                      <div className="row g-2 small text-muted">
                        <div className="col-md-4">
                          <div>Order Date</div>
                          <div className="fw-semibold text-dark">{selectedPo.order_date}</div>
                        </div>
                        <div className="col-md-4">
                          <div>Expected Delivery</div>
                          <div className="fw-semibold text-dark">
                            {selectedPo.expected_delivery || '—'}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <div>Total Amount</div>
                          <div className="fw-semibold text-dark">
                            {formatPeso(selectedPo.total_amount)}
                          </div>
                        </div>
                        {selectedPo.notes && (
                          <div className="col-12 mt-1">
                            <span className="text-muted">Notes: </span>
                            <span className="text-dark">{selectedPo.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center">
                    <label className="form-label">Condition</label>
                    <span
                      className={`badge mb-1 ${
                        previewStatus === 'Received' ? 'bg-success' : 'bg-warning text-dark'
                      }`}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Status: {previewStatus}
                    </span>
                  </div>
                  <select
                    className="form-select"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  >
                    <option value="Good">Good</option>
                    <option value="Damaged">Damaged</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Remarks</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Optional inspection notes..."
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
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
                <button type="submit" className="btn btn-maroon" disabled={approvedPos.length === 0}>
                  <i className="fas fa-save me-2" />
                  Save Receiving
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
