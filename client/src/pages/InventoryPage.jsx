import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import StockTransactionModal from '../components/StockTransactionModal.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import { api, getStockBadge } from '../services/api.js';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'safety' | 'reorder'
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
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileRef = useRef(null);

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
      setMessage((prev) => (prev.type === 'warning' ? { type: '', text: '' } : prev));
    } catch (err) {
      setMessage({ type: 'warning', text: err.message });
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const products = dash?.products || [];
  const abcItems = dash?.abcItems || [];

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

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return abcItems.filter((p) => {
      const matchesSearch = `${p.code} ${p.name} ${p.category} ${p.size_spec || ''}`
        .toLowerCase()
        .includes(q);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const badgeLabel = getStockBadge(p.stock, p.reorder_level).label;
      const matchesStatus = statusFilter === 'All' || badgeLabel === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [abcItems, search, categoryFilter, statusFilter]);

  const belowReorder = useMemo(
    () =>
      abcItems.filter(
        (i) => i.stock <= (i.computed_reorder_point ?? i.reorder_level ?? 10)
      ),
    [abcItems]
  );

  const pgList = usePagination(filtered, 10);
  const pgSafety = usePagination(filteredItems, 10);
  const pgReorder = usePagination(filteredItems, 10);
  const pgBelow = usePagination(belowReorder, 10);
  const pgIn = usePagination(stockInList, 10);
  const pgOut = usePagination(stockOutList, 10);

  const exportCsv = () => {
    let header;
    let rows;
    let filename;

    if (activeTab === 'safety') {
      header = [
        'No.',
        'Category',
        'Item Name',
        'Size / Spec',
        'Maximum Daily Demand',
        'Maximum Lead Time',
        'Average Daily Demand',
        'Average Lead Time',
        'Safety Stock'
      ];
      rows = filteredItems.map((i) => [
        i.no,
        `"${i.category}"`,
        `"${i.name}"`,
        `"${i.size_spec || ''}"`,
        i.max_daily_demand || 0,
        i.max_lead_time || 0,
        i.avg_daily_demand || 0,
        i.avg_lead_time || 0,
        i.safety_stock || 0
      ]);
      filename = 'safety-stock.csv';
    } else if (activeTab === 'reorder') {
      header = [
        'No.',
        'Category',
        'Item Name',
        'Size / Spec',
        'Average Daily Demand',
        'Lead Time',
        'Safety Stock',
        'Reorder Point'
      ];
      rows = filteredItems.map((i) => [
        i.no,
        `"${i.category}"`,
        `"${i.name}"`,
        `"${i.size_spec || ''}"`,
        i.avg_daily_demand || 0,
        i.avg_lead_time || 0,
        i.safety_stock || 0,
        i.computed_reorder_point || 0
      ]);
      filename = 'reorder-point.csv';
    } else {
      header = ['Code', 'Product', 'Category', 'Supplier', 'Stock', 'Reorder Level', 'Status'];
      rows = filtered.map((p) => [
        p.code,
        `"${p.name}"`,
        p.category,
        `"${p.supplier_name}"`,
        p.stock,
        p.reorder_level,
        getStockBadge(p.stock, p.reorder_level).label
      ]);
      filename = 'shop4more-inventory.csv';
    }

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFieldUpdate = async (item, field, rawVal) => {
    const val = Math.max(0, Number(rawVal) || 0);
    if (Number(item[field] || 0) === val) return;
    await api.updateProduct(item.id, { [field]: val });
    await loadAll();
  };

  const handleImportSafetyCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMessage({ type: '', text: '' });

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) throw new Error('CSV file is empty.');

      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        const no = cols[0] || String(i);
        const category = cols[1] || 'Sofas';
        const name = cols[2];
        if (!name) continue;
        const size_spec = cols[3] || '';
        const max_daily_demand = Number(cols[4]) || 0;
        const max_lead_time = Number(cols[5]) || 0;
        const avg_daily_demand = Number(cols[6]) || 0;
        const avg_lead_time = Number(cols[7]) || 0;

        const existing = abcItems.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (existing) {
          await api.updateProduct(existing.id, {
            size_spec: size_spec || existing.size_spec,
            max_daily_demand,
            max_lead_time,
            avg_daily_demand,
            avg_lead_time
          });
        } else {
          await api.createProduct({
            code: `P-${no.padStart(3, '0')}`,
            name,
            category,
            size_spec,
            supplier_name: 'Shop 4 More',
            price: 0,
            stock: 10,
            reorder_level: 5,
            annual_sales: 0,
            max_daily_demand,
            max_lead_time,
            avg_daily_demand,
            avg_lead_time
          });
        }
        imported++;
      }
      setMessage({ type: 'success', text: `Imported ${imported} Safety Stock records.` });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
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
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {/* Inventory Sub-navigation Tabs */}
      <div className="d-flex flex-wrap gap-2 mt-1">
        <button
          type="button"
          className={`btn ${activeTab === 'list' ? 'btn-maroon' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('list')}
        >
          <i className="fas fa-boxes me-2" />
          Inventory List
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'safety' ? 'btn-maroon' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('safety')}
        >
          <i className="fas fa-shield-halved me-2" />
          Safety Stock
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'reorder' ? 'btn-maroon' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('reorder')}
        >
          <i className="fas fa-bell me-2" />
          Reorder Point
        </button>
      </div>

      {/* Tab 1: Inventory List + Recent Stock In / Out */}
      {activeTab === 'list' && (
        <>
          <div className="card mt-3 p-4">
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
                  {pgList.paginatedItems.map((p) => {
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
            <Pagination {...pgList} onPageChange={pgList.setPage} />
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
                      {pgIn.paginatedItems.map((t) => (
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
                <Pagination {...pgIn} onPageChange={pgIn.setPage} />
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
                      {pgOut.paginatedItems.map((t) => (
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
                <Pagination {...pgOut} onPageChange={pgOut.setPage} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Safety Stock */}
      {activeTab === 'safety' && (
        <div className="card mt-3 p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h4 className="mb-0">Safety Stock Calculation</h4>
              <small className="text-muted">
                Safety Stock = (Max Daily Demand × Max Lead Time) − (Avg Daily Demand × Avg Lead Time)
              </small>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="d-none"
                onChange={handleImportSafetyCsv}
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                <i className="fas fa-file-import me-1" />
                {importing ? 'Importing...' : 'Import CSV'}
              </button>
              <button type="button" className="btn btn-maroon btn-sm" onClick={exportCsv}>
                <i className="fas fa-file-export me-1" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Category</th>
                  <th>Item Name</th>
                  <th>Size / Spec</th>
                  <th>Maximum Daily Demand</th>
                  <th>Maximum Lead Time</th>
                  <th>Average Daily Demand</th>
                  <th>Average Lead Time</th>
                  <th>Safety Stock</th>
                </tr>
              </thead>
              <tbody>
                {pgSafety.paginatedItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.no}</td>
                    <td>{item.category}</td>
                    <td className="fw-semibold">{item.name}</td>
                    <td>{item.size_spec || '—'}</td>
                    <td style={{ width: '130px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control form-control-sm"
                        defaultValue={item.max_daily_demand || 0}
                        onBlur={(e) =>
                          handleFieldUpdate(item, 'max_daily_demand', e.target.value)
                        }
                      />
                    </td>
                    <td style={{ width: '130px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control form-control-sm"
                        defaultValue={item.max_lead_time || 0}
                        onBlur={(e) =>
                          handleFieldUpdate(item, 'max_lead_time', e.target.value)
                        }
                      />
                    </td>
                    <td style={{ width: '130px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control form-control-sm"
                        defaultValue={item.avg_daily_demand || 0}
                        onBlur={(e) =>
                          handleFieldUpdate(item, 'avg_daily_demand', e.target.value)
                        }
                      />
                    </td>
                    <td style={{ width: '130px' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-control form-control-sm"
                        defaultValue={item.avg_lead_time || 0}
                        onBlur={(e) =>
                          handleFieldUpdate(item, 'avg_lead_time', e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <span className="badge bg-dark">{item.safety_stock || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination {...pgSafety} onPageChange={pgSafety.setPage} />
        </div>
      )}

      {/* Tab 3: Reorder Point */}
      {activeTab === 'reorder' && (
        <>
          <div className="card mt-3 p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h4 className="mb-0">Reorder Point Calculation</h4>
                <small className="text-muted">
                  Reorder Point = (Average Daily Demand × Lead Time) + Safety Stock
                </small>
              </div>
              <button type="button" className="btn btn-maroon btn-sm" onClick={exportCsv}>
                <i className="fas fa-file-export me-1" />
                Export CSV
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Category</th>
                    <th>Item Name</th>
                    <th>Size / Spec</th>
                    <th>Average Daily Demand</th>
                    <th>Lead Time</th>
                    <th>Safety Stock</th>
                    <th>Reorder Point</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pgReorder.paginatedItems.map((item) => {
                    const rop = item.computed_reorder_point ?? item.reorder_level ?? 0;
                    const needsReorder = item.stock <= rop;
                    return (
                      <tr key={item.id}>
                        <td>{item.no}</td>
                        <td>{item.category}</td>
                        <td className="fw-semibold">{item.name}</td>
                        <td>{item.size_spec || '—'}</td>
                        <td>{item.avg_daily_demand || 0}</td>
                        <td>{item.avg_lead_time || 0}</td>
                        <td>{item.safety_stock || 0}</td>
                        <td>
                          <span className="badge bg-dark">{rop}</span>
                        </td>
                        <td>{item.stock}</td>
                        <td>
                          <span
                            className={`badge ${
                              item.stock === 0
                                ? 'bg-danger'
                                : needsReorder
                                ? 'bg-warning text-dark'
                                : 'bg-success'
                            }`}
                          >
                            {item.stock === 0
                              ? 'Out of Stock'
                              : needsReorder
                              ? 'Reorder Now'
                              : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pgReorder} onPageChange={pgReorder.setPage} />
          </div>

          <div className="card mt-4 p-4">
            <h4>Products Below Reorder Point</h4>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Reorder Point</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pgBelow.paginatedItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.stock}</td>
                      <td>{item.computed_reorder_point ?? item.reorder_level}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.stock === 0 ? 'bg-danger' : 'bg-warning text-dark'
                          }`}
                        >
                          {item.stock === 0 ? 'Reorder Now' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {belowReorder.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted">
                        All products are above reorder point.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination {...pgBelow} onPageChange={pgBelow.setPage} />
          </div>
        </>
      )}

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
