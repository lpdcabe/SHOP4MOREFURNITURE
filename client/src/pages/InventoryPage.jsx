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
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalMode, setModalMode] = useState(null); // 'in' | 'out' | null
  const [editingTx, setEditingTx] = useState(null);
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

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchesSearch = `${p.code} ${p.name} ${p.category} ${p.supplier_name}`
        .toLowerCase()
        .includes(q);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const badgeLabel = getStockBadge(p.stock, p.reorder_level).label;
      const matchesStatus = statusFilter === 'All' || badgeLabel === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, search, categoryFilter, statusFilter]);

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

  const handleDeleteStockIn = async (id) => {
    if (!window.confirm('Delete this Stock In transaction?')) return;
    await api.deleteStockIn(id);
    await loadAll();
  };

  const handleDeleteStockOut = async (id) => {
    if (!window.confirm('Delete this Stock Out transaction?')) return;
    await api.deleteStockOut(id);
    await loadAll();
  };

  const pageFilters = useMemo(
    () => [
      { label: 'Category', value: categoryFilter, onChange: setCategoryFilter, options: categories },
      {
        label: 'Status',
        value: statusFilter,
        onChange: setStatusFilter,
        options: ['All', 'In Stock', 'Low Stock', 'Out of Stock']
      }
    ],
    [categoryFilter, statusFilter, categories]
  );

  return (
    <Layout
      title="Current Inventory"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Product"
      filters={pageFilters}
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-2 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">Inventory List</h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setEditingTx(null);
                setModalMode('in');
              }}
            >
              <i className="fas fa-arrow-down me-2" />
              Stock In
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setEditingTx(null);
                setModalMode('out');
              }}
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
                    <th>Action</th>
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
                      <td>
                        <button
                          className="btn btn-primary btn-sm me-1"
                          title="Edit"
                          onClick={() => {
                            setEditingTx(t);
                            setModalMode('in');
                          }}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete"
                          onClick={() => handleDeleteStockIn(t.id)}
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
                    <th>Action</th>
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
                      <td>
                        <button
                          className="btn btn-primary btn-sm me-1"
                          title="Edit"
                          onClick={() => {
                            setEditingTx(t);
                            setModalMode('out');
                          }}
                        >
                          <i className="fas fa-edit" />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete"
                          onClick={() => handleDeleteStockOut(t.id)}
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
        </div>
      </div>

      <StockTransactionModal
        show={Boolean(modalMode)}
        mode={modalMode || 'in'}
        initialData={editingTx}
        products={products}
        suppliers={suppliers}
        customers={customers}
        nextNo={nextNo}
        onClose={() => {
          setModalMode(null);
          setEditingTx(null);
        }}
        onSaved={loadAll}
      />
    </Layout>
  );
}
