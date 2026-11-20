import express from 'express';
import { supabase, requireSupabase } from '../config/supabase.js';

/**
 * Creates a standard REST CRUD router for a Supabase table.
 * Supports GET /, GET /:id, POST /, PUT /:id, DELETE /:id.
 */
export function createCrudRouter(tableName, { orderBy = 'created_at', ascending = false } = {}) {
  const router = express.Router();
  router.use(requireSupabase);

  router.get('/', async (_req, res) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.get('/:id', async (req, res) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(404).json({ error: error.message });
    res.json(data);
  });

  router.post('/', async (req, res) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert([req.body])
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  });

  router.put('/:id', async (req, res) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  router.delete('/:id', async (req, res) => {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(400).json({ error: error.message });
    res.status(204).send();
  });

  return router;
}
