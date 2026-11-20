import express from 'express';
import { supabase, requireSupabase } from '../config/supabase.js';

const router = express.Router();
router.use(requireSupabase);

async function generateNextTxNo(table, prefix) {
  const { data } = await supabase.from(table).select('transaction_no');
  let maxNum = 0;
  for (const row of data || []) {
    const match = String(row.transaction_no || '').match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = Math.max(maxNum + 1, (data?.length || 0) + 1);
  return `${prefix}-${String(next).padStart(4, '0')}`;
}

// --- Stock In ---
router.get('/stock-in', async (_req, res) => {
  const { data, error } = await supabase
    .from('stock_in')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/stock-in', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.transaction_no) {
    payload.transaction_no = await generateNextTxNo('stock_in', 'SI');
  }
  const qty = Number(payload.quantity) || 0;
  if (qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0.' });
  }

  const { data: tx, error } = await supabase
    .from('stock_in')
    .insert([payload])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Update product stock if completed
  if ((tx.status || 'Completed') === 'Completed') {
    const matchField = tx.product_id ? 'id' : 'name';
    const matchVal = tx.product_id || tx.product_name;
    const { data: prod } = await supabase
      .from('products')
      .select('id, stock')
      .eq(matchField, matchVal)
      .maybeSingle();

    if (prod) {
      await supabase
        .from('products')
        .update({ stock: (prod.stock || 0) + qty })
        .eq('id', prod.id);
    }
  }

  res.status(201).json(tx);
});

router.put('/stock-in/:id', async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from('stock_in')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (findErr) return res.status(404).json({ error: findErr.message });

  const { data: updated, error } = await supabase
    .from('stock_in')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  // Adjust product stock by delta if completed
  const oldQty = existing.status === 'Completed' ? Number(existing.quantity || 0) : 0;
  const newQty = updated.status === 'Completed' ? Number(updated.quantity || 0) : 0;
  const delta = newQty - oldQty;
  if (delta !== 0) {
    const matchField = updated.product_id ? 'id' : 'name';
    const matchVal = updated.product_id || updated.product_name;
    const { data: prod } = await supabase
      .from('products')
      .select('id, stock')
      .eq(matchField, matchVal)
      .maybeSingle();
    if (prod) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, (prod.stock || 0) + delta) })
        .eq('id', prod.id);
    }
  }

  res.json(updated);
});

router.delete('/stock-in/:id', async (req, res) => {
  const { data: existing } = await supabase
    .from('stock_in')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  const { error } = await supabase.from('stock_in').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  if (existing && existing.status === 'Completed') {
    const matchField = existing.product_id ? 'id' : 'name';
    const matchVal = existing.product_id || existing.product_name;
    const { data: prod } = await supabase
      .from('products')
      .select('id, stock')
      .eq(matchField, matchVal)
      .maybeSingle();
    if (prod) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, (prod.stock || 0) - Number(existing.quantity || 0)) })
        .eq('id', prod.id);
    }
  }

  res.status(204).send();
});

// --- Stock Out ---
router.get('/stock-out', async (_req, res) => {
  const { data, error } = await supabase
    .from('stock_out')
    .select('*')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/stock-out', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.transaction_no) {
    payload.transaction_no = await generateNextTxNo('stock_out', 'SO');
  }
  const qty = Number(payload.quantity) || 0;
  if (qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be greater than 0.' });
  }

  const matchField = payload.product_id ? 'id' : 'name';
  const matchVal = payload.product_id || payload.product_name;
  const { data: prod } = await supabase
    .from('products')
    .select('id, stock')
    .eq(matchField, matchVal)
    .maybeSingle();

  const { data: settings } = await supabase
    .from('settings')
    .select('allow_negative_inventory')
    .eq('id', 1)
    .maybeSingle();

  const allowNegative = Boolean(settings?.allow_negative_inventory);
  if (prod && !allowNegative && (prod.stock || 0) < qty) {
    return res.status(400).json({
      error: `Insufficient stock for ${payload.product_name}. Available: ${prod.stock}.`
    });
  }

  const { data: tx, error } = await supabase
    .from('stock_out')
    .insert([payload])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (prod && (tx.status || 'Completed') === 'Completed') {
    await supabase
      .from('products')
      .update({ stock: (prod.stock || 0) - qty })
      .eq('id', prod.id);
  }

  res.status(201).json(tx);
});

router.put('/stock-out/:id', async (req, res) => {
  const { data: existing, error: findErr } = await supabase
    .from('stock_out')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (findErr) return res.status(404).json({ error: findErr.message });

  const { data: updated, error } = await supabase
    .from('stock_out')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });

  const oldQty = existing.status === 'Completed' ? Number(existing.quantity || 0) : 0;
  const newQty = updated.status === 'Completed' ? Number(updated.quantity || 0) : 0;
  const delta = newQty - oldQty;
  if (delta !== 0) {
    const matchField = updated.product_id ? 'id' : 'name';
    const matchVal = updated.product_id || updated.product_name;
    const { data: prod } = await supabase
      .from('products')
      .select('id, stock')
      .eq(matchField, matchVal)
      .maybeSingle();
    if (prod) {
      await supabase
        .from('products')
        .update({ stock: Math.max(0, (prod.stock || 0) - delta) })
        .eq('id', prod.id);
    }
  }

  res.json(updated);
});

router.delete('/stock-out/:id', async (req, res) => {
  const { data: existing } = await supabase
    .from('stock_out')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  const { error } = await supabase.from('stock_out').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  if (existing && existing.status === 'Completed') {
    const matchField = existing.product_id ? 'id' : 'name';
    const matchVal = existing.product_id || existing.product_name;
    const { data: prod } = await supabase
      .from('products')
      .select('id, stock')
      .eq(matchField, matchVal)
      .maybeSingle();
    if (prod) {
      await supabase
        .from('products')
        .update({ stock: (prod.stock || 0) + Number(existing.quantity || 0) })
        .eq('id', prod.id);
    }
  }

  res.status(204).send();
});

export default router;
