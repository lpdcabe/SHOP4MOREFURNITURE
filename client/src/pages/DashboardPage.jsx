import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ChartCanvas from '../components/ChartCanvas.jsx';
import ProductModal from '../components/ProductModal.jsx';
import StockTransactionModal from '../components/StockTransactionModal.jsx';
import { api, formatPeso, getStockBadge } from '../services/api.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [stockModalMode, setStockModalMode] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dash, sups, custs] = await Promise.all([
        api.dashboard(),
        api.getSuppliers(),
        api.getCustomers()
      ]);
      setData(dash);
      setSuppliers(sups);
      setCustomers(custs);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = data?.summary || {
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockCount: 0,
    supplierCount: 0
  };

  const categories = useMemo(() => {
    const set = new Set((data?.products || []).map((p) => p.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [data]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return (data?.products || []).filter((p) => {
      const matchesSearch = `${p.code} ${p.name} ${p.category} ${p.supplier_name}`
        .toLowerCase()
        .includes(q);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const badgeLabel = getStockBadge(p.stock, p.reorder_level).label;
      const matchesStatus = statusFilter === 'All' || badgeLabel === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [data, search, categoryFilter, statusFilter]);

  const barData = useMemo(() => {
    const movement = data?.monthlyMovement || [];
    if (movement.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [
          { label: 'Stock In', data: [0], backgroundColor: '#6B1020', borderRadius: 8 },
          { label: 'Stock Out', data: [0], backgroundColor: '#D9A5B3', borderRadius: 8 }
        ]
      };
    }
    return {
      labels: movement.map((m) => m.label),
      datasets: [
        {
          label: 'Stock In',
          data: movement.map((m) => m.stockIn),
          backgroundColor: '#6B1020',
          borderRadius: 8
        },
        {
          label: 'Stock Out',
          data: movement.map((m) => m.stockOut),
          backgroundColor: '#D9A5B3',
          borderRadius: 8
        }
      ]
    };
  }, [data]);

  const pieData = useMemo(
    () => ({
      labels: ['In Stock', 'Low Stock', 'Out of Stock'],
      datasets: [
        {
          data: [
            summary.inStockCount || 0,
            summary.lowStockCount || 0,
            summary.outOfStockCount || 0
          ],
          backgroundColor: ['#6B1020', '#C98A98', '#E74C3C']
        }
      ]
    }),
    [summary]
  );

  const handleSaveProduct = async (payload) => {
    if (editingProduct) {
      await api.updateProduct(editingProduct.id, payload);
    } else {
      await api.createProduct(payload);
    }
    await loadData();
  };

  const handleQuickAdjust = async (product, delta) => {
    const nextStock = Math.max(0, (product.stock || 0) + delta);
    await api.updateProduct(product.id, { stock: nextStock });
    await loadData();
  };

  return (
    <Layout
      title="Dashboard"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Product..."
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="row g-4 mt-1">
        <div className="col-lg-3 col-md-6">
          <div
            className={`card dashboard-card interactive-card ${
              statusFilter === 'All' ? 'active-card' : ''
            }`}
            onClick={() => setStatusFilter('All')}
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-couch" />
            <h3>{summary.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div
            className="card dashboard-card interactive-card"
            onClick={() => navigate('/inventory')}
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-boxes" />
            <h3>{summary.totalStock}</h3>
            <p>Current Stock</p>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div
            className={`card dashboard-card interactive-card ${
              statusFilter === 'Low Stock' ? 'active-card' : ''
            }`}
            onClick={() =>
              setStatusFilter((prev) => (prev === 'Low Stock' ? 'All' : 'Low Stock'))
            }
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-triangle-exclamation" />
            <h3>{summary.lowStockCount}</h3>
            <p>Low Stock (Click to Filter)</p>
          </div>
        </div>
        <div className="col-lg-3 col-md-6">
          <div
            className="card dashboard-card interactive-card"
            onClick={() => navigate('/suppliers')}
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-truck" />
            <h3>{summary.supplierCount}</h3>
            <p>Suppliers</p>
          </div>
        </div>
      </div>

      <div className="row mt-4 g-4">
        <div className="col-lg-8">
          <div className="card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Monthly Inventory Movement</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={loadData}
                disabled={loading}
              >
                <i className={`fas fa-rotate ${loading ? 'fa-spin' : ''} me-1`} />
                Refresh
              </button>
            </div>
            <ChartCanvas
              type="bar"
              data={barData}
              options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
            />
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="mb-0">Inventory Status</h5>
              {statusFilter !== 'All' && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0"
                  onClick={() => setStatusFilter('All')}
                >
                  Clear filter
                </button>
              )}
            </div>
            <ChartCanvas
              type="doughnut"
              data={pieData}
              options={{ responsive: true, cutout: '65%' }}
            />
          </div>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <h5 className="mb-0">Current Inventory</h5>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'All' ? 'All Categories' : c}
                </option>
              ))}
            </select>

            <div className="btn-group btn-group-sm" role="group">
              {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`btn ${
                    statusFilter === st ? 'btn-maroon' : 'btn-outline-secondary'
                  }`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              className="btn btn-maroon btn-sm"
              onClick={() => {
                setEditingProduct(null);
                setShowModal(true);
              }}
            >
              <i className="fas fa-plus me-1" />
              Add Product
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mt-2">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Status</th>
                <th>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const badge = getStockBadge(p.stock, p.reorder_level);
                return (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          title="Decrease stock by 1"
                          onClick={() => handleQuickAdjust(p, -1)}
                        >
                          -
                        </button>
                        <span className="fw-semibold">{p.stock}</span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm py-0 px-2"
                          title="Increase stock by 1"
                          onClick={() => handleQuickAdjust(p, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>{formatPeso(p.price)}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        title="Edit Product"
                        onClick={() => {
                          setEditingProduct(p);
                          setShowModal(true);
                        }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-4">
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Recent Stock Activity</h5>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setStockModalMode('in')}
            >
              <i className="fas fa-arrow-down me-1" />
              Stock In
            </button>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setStockModalMode('out')}
            >
              <i className="fas fa-arrow-up me-1" />
              Stock Out
            </button>
          </div>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Type</th>
                <th>Ref No.</th>
                <th>Product</th>
                <th>Supplier / Customer</th>
                <th>Qty</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentActivity || []).map((act) => (
                <tr key={act.id}>
                  <td>
                    <span
                      className={`badge ${
                        act.type === 'Stock In' ? 'bg-success' : 'bg-danger'
                      }`}
                    >
                      {act.type}
                    </span>
                  </td>
                  <td>{act.no}</td>
                  <td>{act.product}</td>
                  <td>{act.party}</td>
                  <td>{act.quantity}</td>
                  <td>{act.date}</td>
                  <td>{act.status}</td>
                </tr>
              ))}
              {(data?.recentActivity || []).length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center text-muted py-3">
                    No recent transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        show={showModal}
        initialData={editingProduct}
        suppliers={suppliers}
        onClose={() => setShowModal(false)}
        onSave={handleSaveProduct}
      />

      <StockTransactionModal
        show={Boolean(stockModalMode)}
        mode={stockModalMode || 'in'}
        products={data?.products || []}
        suppliers={suppliers}
        customers={customers}
        onClose={() => setStockModalMode(null)}
        onSaved={loadData}
      />
    </Layout>
  );
}
