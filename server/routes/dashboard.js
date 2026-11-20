import express from 'express';
import { supabase, requireSupabase } from '../config/supabase.js';

const router = express.Router();
router.use(requireSupabase);

router.get('/dashboard', async (_req, res) => {
  const [productsRes, suppliersRes, stockInRes, stockOutRes, poRes] = await Promise.all([
    supabase.from('products').select('*').order('code', { ascending: true }),
    supabase.from('suppliers').select('id, status'),
    supabase.from('stock_in').select('id, transaction_no, product_name, supplier_name, quantity, unit_cost, transaction_date, status'),
    supabase.from('stock_out').select('id, transaction_no, product_name, customer_name, quantity, unit_price, transaction_date, status'),
    supabase.from('purchase_orders').select('id, status')
  ]);

  if (productsRes.error) return res.status(500).json({ error: productsRes.error.message });

  const products = productsRes.data || [];
  const suppliers = suppliersRes.data || [];
  const stockIn = stockInRes.data || [];
  const stockOut = stockOutRes.data || [];
  const purchaseOrders = poRes.data || [];

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= (p.reorder_level || 10)).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;
  const inStockCount = products.filter((p) => p.stock > (p.reorder_level || 10)).length;

  const totalStockInQty = stockIn.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalStockOutQty = stockOut.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalSalesAmount = stockOut.reduce(
    (sum, t) => sum + (t.quantity || 0) * Number(t.unit_price || 0),
    0
  );

  // ABC classification computed from annual_sales * price
  const valued = products.map((p) => ({
    ...p,
    annual_value: (p.annual_sales || 0) * Number(p.price || 0)
  }));
  const grandTotalValue = valued.reduce((s, p) => s + p.annual_value, 0) || 1;
  const sorted = [...valued].sort((a, b) => b.annual_value - a.annual_value);

  let cumulative = 0;
  const abcItems = sorted.map((p, idx) => {
    const pct = (p.annual_value / grandTotalValue) * 100;
    cumulative += pct;
    let classification = 'C';
    if (cumulative <= 70) classification = 'A';
    else if (cumulative <= 90) classification = 'B';

    const maxDaily = Number(p.max_daily_demand || 0);
    const maxLead = Number(p.max_lead_time || 0);
    const avgDaily = Number(p.avg_daily_demand || 0);
    const avgLead = Number(p.avg_lead_time || 0);
    const safety_stock = Math.max(0, Math.round(maxDaily * maxLead - avgDaily * avgLead));
    const computed_reorder_point = Math.round(avgDaily * avgLead + safety_stock);

    return {
      ...p,
      no: idx + 1,
      contribution_pct: Number(pct.toFixed(1)),
      cumulative_pct: Number(cumulative.toFixed(1)),
      classification,
      safety_stock,
      computed_reorder_point
    };
  });

  // Monthly movement from real stock_in & stock_out records
  const monthMap = new Map();
  const addToMonth = (dateStr, key, qty) => {
    const ym = (dateStr || '').slice(0, 7);
    if (!ym) return;
    if (!monthMap.has(ym)) monthMap.set(ym, { ym, stockIn: 0, stockOut: 0 });
    monthMap.get(ym)[key] += Number(qty || 0);
  };
  stockIn.forEach((t) => addToMonth(t.transaction_date, 'stockIn', t.quantity));
  stockOut.forEach((t) => addToMonth(t.transaction_date, 'stockOut', t.quantity));

  const monthlyMovement = Array.from(monthMap.values())
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .slice(-7)
    .map((m) => {
      const [y, mo] = m.ym.split('-');
      const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleString('en-US', {
        month: 'short',
        year: '2-digit'
      });
      return { label, stockIn: m.stockIn, stockOut: m.stockOut };
    });

  const recentActivity = [
    ...stockIn.map((t) => ({
      id: `in-${t.id}`,
      type: 'Stock In',
      no: t.transaction_no,
      product: t.product_name,
      party: t.supplier_name,
      quantity: t.quantity,
      date: t.transaction_date,
      status: t.status
    })),
    ...stockOut.map((t) => ({
      id: `out-${t.id}`,
      type: 'Stock Out',
      no: t.transaction_no,
      product: t.product_name,
      party: t.customer_name,
      quantity: t.quantity,
      date: t.transaction_date,
      status: t.status
    }))
  ]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6);

  res.json({
    summary: {
      totalProducts,
      totalStock,
      lowStockCount,
      outOfStockCount,
      inStockCount,
      supplierCount: suppliers.length,
      totalStockInQty,
      totalStockOutQty,
      totalSalesAmount,
      purchaseOrders: {
        total: purchaseOrders.length,
        approved: purchaseOrders.filter((po) => po.status === 'Approved').length,
        pending: purchaseOrders.filter((po) => po.status === 'Pending').length,
        cancelled: purchaseOrders.filter((po) => po.status === 'Cancelled').length
      }
    },
    products,
    abcItems,
    monthlyMovement,
    recentActivity
  });
});

router.get('/settings', async (_req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data || {});
});

router.put('/settings', async (req, res) => {
  const payload = { ...req.body, id: 1, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('settings')
    .upsert(payload)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
