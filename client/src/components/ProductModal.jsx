import { useState, useEffect } from 'react';

const EMPTY = {
  code: '',
  name: '',
  category: 'Sofas',
  size_spec: '',
  item_type: '',
  supplier_name: '',
  price: '',
  stock: '',
  reorder_level: 10,
  annual_sales: 0
};

function getNextProductCode(products = []) {
  let maxNum = 0;
  for (const p of products) {
    const match = String(p.code || '').match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = Math.max(maxNum + 1, products.length + 1);
  return `P${String(next).padStart(3, '0')}`;
}

export default function ProductModal({
  show,
  initialData,
  products = [],
  suppliers = [],
  onClose,
  onSave
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setForm({ ...EMPTY, ...initialData });
    } else {
      setForm({
        ...EMPTY,
        code: getNextProductCode(products),
        supplier_name: suppliers[0]?.company_name || 'ABC Furniture'
      });
    }
    setError('');
  }, [initialData, show, suppliers, products]);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        size_spec: (form.size_spec || '').trim(),
        item_type: (form.item_type || '').trim(),
        supplier_name: form.supplier_name.trim(),
        price: Number(form.price) || 0,
        stock: Number(form.stock) || 0,
        reorder_level: Number(form.reorder_level) || 10,
        annual_sales: Number(form.annual_sales) || 0
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop-custom">
      <div className="modal-card-custom" style={{ maxWidth: '620px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">{initialData ? 'Edit Product' : 'Add Product'}</h5>
          <button type="button" className="btn-close" onClick={onClose} />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            {initialData && (
              <div className="col-md-4">
                <label className="form-label">Code</label>
                <input
                  className="form-control bg-light"
                  value={form.code}
                  readOnly
                  disabled
                />
              </div>
            )}
            <div className={initialData ? 'col-md-8' : 'col-12'}>
              <label className="form-label">Product Name</label>
              <input
                className="form-control"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Category</label>
              <input
                className="form-control"
                list="category-options"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
              <datalist id="category-options">
                <option value="Sofas" />
                <option value="Beds" />
                <option value="Dining Sets" />
                <option value="Cabinets" />
                <option value="Wardrobes" />
                <option value="Tables" />
                <option value="Chairs" />
                <option value="TV Racks" />
                <option value="Office Furniture" />
              </datalist>
            </div>
            <div className="col-md-4">
              <label className="form-label">Size / Spec</label>
              <input
                className="form-control"
                placeholder="e.g. 60 x 75, 6 seater"
                value={form.size_spec || ''}
                onChange={(e) => setForm({ ...form, size_spec: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Type</label>
              <input
                className="form-control"
                placeholder="e.g. Sofa Set, Bedframe"
                value={form.item_type || ''}
                onChange={(e) => setForm({ ...form, item_type: e.target.value })}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Supplier</label>
              <input
                className="form-control"
                list="supplier-options"
                required
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              />
              <datalist id="supplier-options">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.company_name} />
                ))}
              </datalist>
            </div>
            <div className="col-md-6">
              <label className="form-label">Unit Price (₱)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Stock</label>
              <input
                type="number"
                min="0"
                className="form-control"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Reorder Level</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Annual Demand</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={form.annual_sales}
                onChange={(e) => setForm({ ...form, annual_sales: e.target.value })}
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-maroon" disabled={saving}>
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
