import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import ChartCanvas from '../components/ChartCanvas.jsx';
import StockTransactionModal from '../components/StockTransactionModal.jsx';
import { api } from '../services/api.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stockModalMode, setStockModalMode] = useState(null);
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

  return (
    <Layout title="Dashboard">
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="row g-4 mt-1">
        <div className="col-lg-3 col-md-6">
          <div
            className="card dashboard-card interactive-card"
            onClick={() => navigate('/products')}
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
            className="card dashboard-card interactive-card"
            onClick={() => navigate('/inventory')}
            role="button"
            tabIndex={0}
          >
            <i className="fas fa-triangle-exclamation" />
            <h3>{summary.lowStockCount}</h3>
            <p>Low Stock</p>
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
            <h5 className="mb-2">Inventory Status</h5>
            <ChartCanvas
              type="doughnut"
              data={pieData}
              options={{ responsive: true, cutout: '65%' }}
            />
          </div>
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
                  <td>
                    <span className="badge bg-secondary">{act.status}</span>
                  </td>
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
