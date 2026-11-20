const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  dashboard: () => request('/dashboard'),

  // Products
  getProducts: () => request('/products'),
  createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Suppliers
  getSuppliers: () => request('/suppliers'),
  createSupplier: (body) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  updateSupplier: (id, body) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: () => request('/customers'),
  createCustomer: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
  updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // Stock In / Out
  getStockIn: () => request('/stock-in'),
  createStockIn: (body) => request('/stock-in', { method: 'POST', body: JSON.stringify(body) }),
  updateStockIn: (id, body) => request(`/stock-in/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStockIn: (id) => request(`/stock-in/${id}`, { method: 'DELETE' }),
  getStockOut: () => request('/stock-out'),
  createStockOut: (body) => request('/stock-out', { method: 'POST', body: JSON.stringify(body) }),
  updateStockOut: (id, body) => request(`/stock-out/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStockOut: (id) => request(`/stock-out/${id}`, { method: 'DELETE' }),

  // Purchase Orders
  getPurchaseOrders: () => request('/purchase-orders'),
  createPurchaseOrder: (body) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),
  updatePurchaseOrder: (id, body) => request(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePurchaseOrder: (id) => request(`/purchase-orders/${id}`, { method: 'DELETE' }),

  // Goods Receiving
  getGoodsReceiving: () => request('/goods-receiving'),
  createGoodsReceiving: (body) => request('/goods-receiving', { method: 'POST', body: JSON.stringify(body) }),
  updateGoodsReceiving: (id, body) => request(`/goods-receiving/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGoodsReceiving: (id) => request(`/goods-receiving/${id}`, { method: 'DELETE' }),

  // Delivery Receipts
  getDeliveryReceipts: () => request('/delivery-receipts'),
  createDeliveryReceipt: (body) => request('/delivery-receipts', { method: 'POST', body: JSON.stringify(body) }),
  updateDeliveryReceipt: (id, body) => request(`/delivery-receipts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDeliveryReceipt: (id) => request(`/delivery-receipts/${id}`, { method: 'DELETE' }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) })
};

export function formatPeso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

export function getStockBadge(stock, reorderLevel = 10) {
  if (stock <= 0) return { label: 'Out of Stock', cls: 'bg-danger' };
  if (stock <= reorderLevel) return { label: 'Low Stock', cls: 'bg-warning text-dark' };
  return { label: 'In Stock', cls: 'bg-success' };
}

export function getNextCode(items = [], field = 'code', prefix = 'ID-', pad = 3) {
  let maxNum = 0;
  for (const item of items) {
    const match = String(item[field] || '').match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = Math.max(maxNum + 1, items.length + 1);
  return `${prefix}${String(next).padStart(pad, '0')}`;
}
