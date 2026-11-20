import { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import ChartCanvas from '../components/ChartCanvas.jsx';
import { api, formatPeso } from '../services/api.js';

export default function AbcAnalysisPage() {
  const [abcItems, setAbcItems] = useState([]);
  const [activeTab, setActiveTab] = useState('abc'); // 'abc' | 'safety'
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const d = await api.dashboard();
      setAbcItems(d.abcItems || []);
    } catch (err) {
      setMessage({ type: 'warning', text: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      A: abcItems.filter((i) => i.classification === 'A').length,
      B: abcItems.filter((i) => i.classification === 'B').length,
      C: abcItems.filter((i) => i.classification === 'C').length
    }),
    [abcItems]
  );

  const categories = useMemo(() => {
    const set = new Set(abcItems.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [abcItems]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return abcItems.filter((item) => {
      const matchesClass = classFilter === 'All' || item.classification === classFilter;
      const matchesCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchesSearch = `${item.category} ${item.name} ${item.size_spec || ''}`
        .toLowerCase()
        .includes(q);
      return matchesClass && matchesCat && matchesSearch;
    });
  }, [abcItems, search, classFilter, categoryFilter]);

  const belowReorder = useMemo(
    () => abcItems.filter((i) => i.stock <= (i.reorder_level || 10)),
    [abcItems]
  );

  const categorySummary = useMemo(() => {
    const map = new Map();
    for (const item of abcItems) {
      const cat = item.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [abcItems]);

  const chartData = useMemo(
    () => ({
      labels: ['Class A', 'Class B', 'Class C'],
      datasets: [
        {
          label: 'Number of Products',
          data: [counts.A, counts.B, counts.C],
          backgroundColor: ['#8B0000', '#D4A017', '#198754']
        }
      ]
    }),
    [counts]
  );

  const handleFieldUpdate = async (item, field, rawVal) => {
    const val = Math.max(0, Number(rawVal) || 0);
    if (Number(item[field] || 0) === val) return;
    await api.updateProduct(item.id, { [field]: val });
    await load();
  };

  const handleImportCsv = async (e) => {
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

        if (activeTab === 'reorder') {
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
      rows = filtered.map((i) => [
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
    } else if (activeTab === 'safety') {
          // No., Category, Item Name, Size / Spec, Maximum Daily Demand, Maximum Lead Time, Average Daily Demand, Average Lead Time
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
        } else {
          // No., Category, Item Name, Size / Spec, Unit Cost, Annual Demand
          const price = Number((cols[4] || '0').replace(/[^0-9.]/g, '')) || 0;
          const annual_sales = Number((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0;

          await api.createProduct({
            code: `P-${no.padStart(3, '0')}`,
            name,
            category,
            size_spec,
            supplier_name: 'Shop 4 More',
            price,
            stock: 10,
            reorder_level: 5,
            annual_sales
          });
        }
        imported++;
      }
      setMessage({
        type: 'success',
        text: `Imported ${imported} items into ${activeTab === 'safety' ? 'Safety Stock' : 'ABC Analysis'}.`
      });
      await load();
    } catch (err) {
      setMessage({ type: 'danger', text: err.message });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportCsv = () => {
    let header;
    let rows;
    let filename;

    if (activeTab === 'reorder') {
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
      rows = filtered.map((i) => [
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
    } else if (activeTab === 'safety') {
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
      rows = filtered.map((i) => [
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
    } else {
      header = [
        'No.',
        'Category',
        'Item Name',
        'Size / Spec',
        'Unit Cost',
        'Annual Demand',
        'Annual Consumption Value',
        '% of Total',
        'Cumulative %',
        'ABC CLASS'
      ];
      rows = filtered.map((i) => [
        i.no,
        `"${i.category}"`,
        `"${i.name}"`,
        `"${i.size_spec || ''}"`,
        i.price,
        i.annual_sales,
        i.annual_value,
        `${i.contribution_pct}%`,
        `${i.cumulative_pct ?? ''}%`,
        i.classification
      ]);
      filename = 'abc-analysis.csv';
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

  const pageFilters = useMemo(
    () => [
      { label: 'Category', value: categoryFilter, onChange: setCategoryFilter, options: categories },
      {
        label: 'ABC Class',
        value: classFilter,
        onChange: setClassFilter,
        options: ['All', 'A', 'B', 'C']
      }
    ],
    [categoryFilter, classFilter, categories]
  );

  return (
    <Layout
      title="ABC Analysis, Safety Stock & Reorder Point"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Item or Category..."
      filters={pageFilters}
    >
      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="row mt-2 g-4">
        <div className="col-md-4">
          <div
            className={`dashboard-card interactive-card ${classFilter === 'A' ? 'active-card' : ''}`}
            onClick={() => setClassFilter((c) => (c === 'A' ? 'All' : 'A'))}
            role="button"
            tabIndex={0}
          >
            <h3>Class A</h3>
            <h2>{counts.A} Items</h2>
            <p>High Value Products (≤ 70%)</p>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`dashboard-card interactive-card ${classFilter === 'B' ? 'active-card' : ''}`}
            onClick={() => setClassFilter((c) => (c === 'B' ? 'All' : 'B'))}
            role="button"
            tabIndex={0}
          >
            <h3>Class B</h3>
            <h2>{counts.B} Items</h2>
            <p>Medium Value Products (71% – 90%)</p>
          </div>
        </div>
        <div className="col-md-4">
          <div
            className={`dashboard-card interactive-card ${classFilter === 'C' ? 'active-card' : ''}`}
            onClick={() => setClassFilter((c) => (c === 'C' ? 'All' : 'C'))}
            role="button"
            tabIndex={0}
          >
            <h3>Class C</h3>
            <h2>{counts.C} Items</h2>
            <p>Low Value Products (&gt; 90%)</p>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="d-flex flex-wrap gap-2 mt-4">
        <button
          type="button"
          className={`btn ${activeTab === 'abc' ? 'btn-maroon' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('abc')}
        >
          <i className="fas fa-chart-pie me-2" />
          ABC Analysis
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
        <button
          type="button"
          className={`btn ${activeTab === 'summary' ? 'btn-maroon' : 'btn-outline-secondary'}`}
          onClick={() => setActiveTab('summary')}
        >
          <i className="fas fa-list-ol me-2" />
          Summary
        </button>
      </div>

      {activeTab === 'abc' && (
        <>
          <div className="card mt-3 p-4">
            <h4>ABC Classification</h4>
            <ChartCanvas type="bar" data={chartData} options={{ responsive: true }} />
          </div>

          <div className="card mt-4 p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <h4 className="mb-0">ABC Analysis Result</h4>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="d-none"
                  onChange={handleImportCsv}
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
                    <th>Unit Cost</th>
                    <th>Annual Demand</th>
                    <th>Annual Consumption Value</th>
                    <th>% of Total</th>
                    <th>Cumulative %</th>
                    <th>ABC CLASS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const cls =
                      item.classification === 'A'
                        ? 'bg-danger'
                        : item.classification === 'B'
                        ? 'bg-warning text-dark'
                        : 'bg-success';
                    return (
                      <tr key={item.id}>
                        <td>{item.no}</td>
                        <td>{item.category}</td>
                        <td className="fw-semibold">{item.name}</td>
                        <td>{item.size_spec || '—'}</td>
                        <td>{formatPeso(item.price)}</td>
                        <td style={{ width: '120px' }}>
                          <input
                            type="number"
                            min="0"
                            className="form-control form-control-sm"
                            defaultValue={item.annual_sales}
                            onBlur={(e) =>
                              handleFieldUpdate(item, 'annual_sales', e.target.value)
                            }
                          />
                        </td>
                        <td>{formatPeso(item.annual_value)}</td>
                        <td>{item.contribution_pct}%</td>
                        <td>{item.cumulative_pct ?? item.contribution_pct}%</td>
                        <td>
                          <span className={`badge ${cls}`}>{item.classification}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
                onChange={handleImportCsv}
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
                {filtered.map((item) => (
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
        </div>
      )}

      {activeTab === 'reorder' && (
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
                {filtered.map((item) => {
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
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="card mt-3 p-4">
          <h4 className="mb-3">Category Summary</h4>
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>No. of Items</th>
                </tr>
              </thead>
              <tbody>
                {categorySummary.map((row) => (
                  <tr key={row.category}>
                    <td className="fw-semibold">{row.category}</td>
                    <td>{row.count}</td>
                  </tr>
                ))}
                <tr className="table-light fw-bold">
                  <td>GRAND TOTAL</td>
                  <td>{abcItems.length}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              {belowReorder.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.stock}</td>
                  <td>{item.reorder_level}</td>
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
      </div>
    </Layout>
  );
}
