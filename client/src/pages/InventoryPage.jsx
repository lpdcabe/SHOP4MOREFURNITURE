import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import StockTransactionModal from '../components/StockTransactionModal.jsx';
import { api, getStockBadge } from '../services/api.js';

export default function InventoryPage() {
  const [dash, setDash] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockInList, setStockInList] = useState([]);
  const [stockOutList, setStockOutList] = useState([]);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState(null); // 'in' | 'out' | null
  const [error, setError] = useState('');

  const loadAll = async () => {
    try {
      const [d, sups, custs, ins, outs] = await Promise.all([
        api.dashboard(),
        api.getSuppliers(),
        api.getCustomers(),
        api.getStockIn(),
        api.getStockOut()
      ]);
      setDash(d);
      setSuppliers(sups);
      setCustomers(custs);
      setStockInList(ins);
      setStockOutList(outs);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const products = dash?.products || [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) =>
      `${p.code} ${p.name} ${p.category} ${p.supplier_name}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const exportCsv = () => {
    const header = ['Code', 'Product', 'Category', 'Supplier', 'Stock', 'Reorder Level', 'Status'];
    const rows = filtered.map((p) => [
      p.code,
      `"${p.name}"`,
      p.category,
      `"${p.supplier_name}"`,
      p.stock,
      p.reorder_level,
      getStockBadge(p.stock, p.reorder_level).label
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shop4more-inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const nextNo =
    modalMode === 'in'
      ? `SI-${String(stockInList.length + 1).padStart(4, '0')}`
      : `SO-${String(stockOutList.length + 1).padStart(4, '0')}`;

  return (
    <Layout
      title="Current Inventory"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Product"
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-2 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">Inventory List</h4>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setModalMode('in')}
            >
              <i className="fas fa-arrow-down me-2" />
              Stock In
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setModalMode('out')}
            >
              <i className="fas fa-arrow-up me-2" />
              Stock Out
            </button>
            <button className="btn btn-maroon" onClick={exportCsv}>
              <i className="fas fa-file-export me-2" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Stock</th>
                <th>Reorder Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const badge = getStockBadge(p.stock, p.reorder_level);
                return (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.supplier_name}</td>
                    <td>{p.stock}</td>
                    <td>{p.reorder_level}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row mt-4 g-4">
        <div className="col-lg-6">
          <div className="card p-4 h-100">
            <h5 className="mb-3">Recent Stock In</h5>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Product</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockInList.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td>{t.transaction_no}</td>
                      <td>{t.transaction_date}</td>
                      <td>{t.supplier_name}</td>
                      <td>{t.product_name}</td>
                      <td>{t.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card p-4 h-100">
            <h5 className="mb-3">Recent Stock Out</h5>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOutList.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td>{t.transaction_no}</td>
                      <td>{t.transaction_date}</td>
                      <td>{t.customer_name}</td>
                      <td>{t.product_name}</td>
                      <td>{t.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <StockTransactionModal
        show={Boolean(modalMode)}
        mode={modalMode || 'in'}
        products={products}
        suppliers={suppliers}
        customers={customers}
        nextNo={nextNo}
        onClose={() => setModalMode(null)}
        onSaved={loadAll}
      />
    </Layout>
  );
}
