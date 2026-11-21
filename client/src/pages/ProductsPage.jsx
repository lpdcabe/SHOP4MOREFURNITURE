import { useEffect, useMemo, useState } from 'react';
import Layout, { useFeedback } from '../components/Layout.jsx';
import ProductModal from '../components/ProductModal.jsx';
import Pagination, { usePagination } from '../components/Pagination.jsx';
import TableActionMenu from '../components/TableActionMenu.jsx';
import { api, formatPeso, getStockBadge } from '../services/api.js';

const PRODUCT_ACTIONS = [
  { key: 'edit', label: 'Edit', icon: 'fas fa-edit', variant: 'primary' },
  { key: 'delete', label: 'Delete', icon: 'fas fa-trash', variant: 'danger' }
];

export default function ProductsPage() {
  const { notify, confirmAction } = useFeedback();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionMode, setActionMode] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const [prods, sups] = await Promise.all([api.getProducts(), api.getSuppliers()]);
      setProducts(prods);
      setSuppliers(sups);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  const pg = usePagination(filtered, 10);

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateProduct(editing.id, payload);
      notify('Product updated.');
    } else {
      await api.createProduct(payload);
      notify('Product added.');
    }
    await loadData();
  };

  const handleDelete = async (id) => {
    const ok = await confirmAction({ message: 'Are you sure you want to delete this product?' });
    if (!ok) return;
    await api.deleteProduct(id);
    notify('Product deleted.');
    await loadData();
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
      title="Products"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Product"
      filters={pageFilters}
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-4 p-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="mb-0">Furniture Products</h4>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <TableActionMenu
              mode={actionMode}
              onModeChange={setActionMode}
              actions={PRODUCT_ACTIONS}
            />
            <button
              className="btn btn-maroon"
              onClick={() => {
                setEditing(null);
                setShowModal(true);
              }}
            >
              <i className="fas fa-plus me-2" />
              Add Product
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Size / Spec</th>
                <th>Type</th>
                <th>Supplier</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pg.paginatedItems.map((p) => {
                const badge = getStockBadge(p.stock, p.reorder_level);
                return (
                  <tr
                    key={p.id}
                    className={actionMode ? `table-row-action table-row-action-${actionMode}` : ''}
                    onClick={() => {
                      if (actionMode === 'edit') {
                        setEditing(p);
                        setShowModal(true);
                      } else if (actionMode === 'delete') {
                        handleDelete(p.id);
                      }
                    }}
                  >
                    <td>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>{p.size_spec || '—'}</td>
                    <td>{p.item_type || '—'}</td>
                    <td>{p.supplier_name}</td>
                    <td>{formatPeso(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" className="text-center text-muted py-4">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pg} onPageChange={pg.setPage} />
      </div>

      <ProductModal
        show={showModal}
        initialData={editing}
        products={products}
        suppliers={suppliers}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </Layout>
  );
}
