import { useEffect, useMemo, useRef, useState } from 'react';
import Layout, { useFeedback } from '../components/Layout.jsx';
import ChartCanvas from '../components/ChartCanvas.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import { api, formatPeso } from '../services/api.js';

export default function AbcAnalysisPage() {
  const { notify } = useFeedback();
  const [abcItems, setAbcItems] = useState([]);
  const [activeTab, setActiveTab] = useState('abc'); // 'abc' | 'summary'
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const d = await api.dashboard();
      setAbcItems(d.abcItems || []);
    } catch (err) {
      notify(err.message, 'warning');
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

  const categorySummary = useMemo(() => {
    const map = new Map();
    for (const item of abcItems) {
      const cat = item.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + 1);
    }
    return Array.from(map.entries()).map(([category, count]) => ({ category, count }));
  }, [abcItems]);

  const pgMain = usePagination(filtered, 10);
  const pgSummary = usePagination(categorySummary, 10);

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
        imported++;
      }
      notify(`Imported ${imported} items into ABC Analysis.`);
      await load();
    } catch (err) {
      notify(err.message, 'danger');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const exportCsv = () => {
    const header = [
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
    const rows = filtered.map((i) => [
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

    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abc-analysis.csv';
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
      title="ABC Analysis"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Item or Category..."
      filters={pageFilters}
    >
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

      <div className="page-tabs mt-4">
        <button
          type="button"
          className={`page-tab-btn ${activeTab === 'abc' ? 'active' : ''}`}
          onClick={() => setActiveTab('abc')}
        >
          <i className="fas fa-chart-pie" />
          <span>ABC Analysis</span>
        </button>
        <button
          type="button"
          className={`page-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <i className="fas fa-list-ol" />
          <span>Summary</span>
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
                  {pgMain.paginatedItems.map((item) => {
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
            <Pagination {...pgMain} onPageChange={pgMain.setPage} />
          </div>
        </>
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
                {pgSummary.paginatedItems.map((row) => (
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
          <Pagination {...pgSummary} onPageChange={pgSummary.setPage} />
        </div>
      )}
    </Layout>
  );
}
