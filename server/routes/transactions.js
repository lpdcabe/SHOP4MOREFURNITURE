import express from 'express';
import { supabase, requireSupabase } from '../config/supabase.js';

const router = express.Router();
router.use(requireSupabase);

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
  const payload = req.body;
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
  const payload = req.body;
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

export default router;
