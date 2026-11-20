import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout.jsx';
import ProductModal from '../components/ProductModal.jsx';
import { api, formatPeso, getStockBadge } from '../services/api.js';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) =>
      `${p.code} ${p.name} ${p.category} ${p.supplier_name}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleSave = async (payload) => {
    if (editing) {
      await api.updateProduct(editing.id, payload);
    } else {
      await api.createProduct(payload);
    }
    await loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.deleteProduct(id);
    await loadData();
  };

  return (
    <Layout
      title="Products"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search Product"
    >
      {error && <div className="alert alert-warning">{error}</div>}

      <div className="card mt-4 p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">Furniture Products</h4>
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

        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Supplier</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Action</th>
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
                    <td>{formatPeso(p.price)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => {
                          setEditing(p);
                          setShowModal(true);
                        }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(p.id)}
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted py-4">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        show={showModal}
        initialData={editing}
        suppliers={suppliers}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
      />
    </Layout>
  );
}
