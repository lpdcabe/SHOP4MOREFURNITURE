import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function StockTransactionModal({
  show,
  mode = 'in',
  initialData = null,
  products = [],
  suppliers = [],
  customers = [],
  nextNo = '',
  onClose,
  onSaved
}) {
  const isIn = mode === 'in';
  const [form, setForm] = useState({
    transaction_no: '',
    transaction_date: today(),
    party_name: '',
    staff_name: '',
    product_name: '',
    quantity: '',
    unit_amount: '',
    remarks: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show) return;
    if (initialData) {
      setForm({
        transaction_no: initialData.transaction_no || '',
        transaction_date: initialData.transaction_date || today(),
        party_name: isIn ? initialData.supplier_name || '' : initialData.customer_name || '',
        staff_name: isIn ? initialData.received_by || '' : initialData.released_by || '',
        product_name: initialData.product_name || '',
        quantity: initialData.quantity ?? '',
        unit_amount: isIn ? initialData.unit_cost ?? '' : initialData.unit_price ?? '',
        remarks: initialData.remarks || ''
      });
    } else {
      const defaultParty = isIn
        ? suppliers[0]?.company_name || ''
        : customers[0]?.name || '';
      const defaultProd = products[0];
      setForm({
        transaction_no: nextNo || (isIn ? 'SI-0001' : 'SO-0001'),
        transaction_date: today(),
        party_name: defaultParty,
        staff_name: '',
        product_name: defaultProd?.name || '',
        quantity: '',
        unit_amount: isIn ? '' : defaultProd?.price || '',
        remarks: ''
      });
    }
    setError('');
  }, [show, mode, initialData, nextNo, products, suppliers, customers, isIn]);

  if (!show) return null;

  const handleProductChange = (name) => {
    const matched = products.find((p) => p.name === name);
    setForm((prev) => ({
      ...prev,
      product_name: name,
      unit_amount: !isIn && matched ? matched.price : prev.unit_amount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const matched = products.find((p) => p.name === form.product_name);
      if (isIn) {
        const payload = {
          transaction_date: form.transaction_date,
          supplier_name: form.party_name,
          received_by: form.staff_name,
          product_id: matched?.id || null,
          product_name: form.product_name,
          quantity: Number(form.quantity),
          unit_cost: Number(form.unit_amount) || 0,
          remarks: form.remarks,
          status: initialData?.status || 'Completed'
        };
        if (initialData) await api.updateStockIn(initialData.id, payload);
        else await api.createStockIn(payload);
      } else {
        const payload = {
          transaction_date: form.transaction_date,
          customer_name: form.party_name,
          released_by: form.staff_name,
          product_id: matched?.id || null,
          product_name: form.product_name,
          quantity: Number(form.quantity),
          unit_price: Number(form.unit_amount) || 0,
          remarks: form.remarks,
          status: initialData?.status || 'Completed'
        };
        if (initialData) await api.updateStockOut(initialData.id, payload);
        else await api.createStockOut(payload);
      }
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom" style={{ maxWidth: '640px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">
            <i className={`fas ${isIn ? 'fa-arrow-down' : 'fa-arrow-up'} me-2`} />
            {initialData
              ? isIn
                ? `Edit Stock In (${initialData.transaction_no})`
                : `Edit Stock Out (${initialData.transaction_no})`
              : isIn
              ? 'New Stock Entry (Stock In)'
              : 'Release Inventory (Stock Out)'}
          </h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Date</label>
              <input
                type="date"
                className="form-control"
                required
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isIn ? 'Received By' : 'Released By'}</label>
              <input
                className="form-control"
                placeholder="Employee Name"
                value={form.staff_name}
                onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isIn ? 'Supplier' : 'Customer'}</label>
              <select
                className="form-select"
                value={form.party_name}
                onChange={(e) => setForm({ ...form, party_name: e.target.value })}
              >
                {(isIn ? suppliers : customers).map((item) => {
                  const label = isIn ? item.company_name : item.name;
                  return (
                    <option key={item.id} value={label}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Product</label>
              <select
                className="form-select"
                value={form.product_name}
                onChange={(e) => handleProductChange(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name} {!isIn ? `(Stock: ${p.stock})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                min="1"
                required
                className="form-control"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">{isIn ? 'Unit Cost (₱)' : 'Unit Price (₱)'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                placeholder="0.00"
                value={form.unit_amount}
                onChange={(e) => setForm({ ...form, unit_amount: e.target.value })}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-maroon" disabled={saving}>
              <i className="fas fa-save me-2" />
              {saving ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
