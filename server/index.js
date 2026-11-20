import express from 'express';
import cors from 'cors';
import { isSupabaseConfigured, supabase } from './config/supabase.js';
import { createCrudRouter } from './routes/crudFactory.js';
import transactionsRouter from './routes/transactions.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json());

// Health check (also verifies Supabase connectivity)
app.get('/api/health', async (_req, res) => {
  if (!isSupabaseConfigured) {
    return res.json({
      status: 'running',
      database: 'not_configured',
      message: 'Set SUPABASE_URL and SUPABASE_KEY in server/.env'
    });
  }

  const { error } = await supabase.from('settings').select('id').limit(1);
  if (error) {
    return res.json({
      status: 'running',
      database: 'error',
      message: error.message
    });
  }

  res.json({
    status: 'running',
    database: 'connected',
    message: 'Supabase PostgreSQL connected'
  });
});

// Auth login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  if (!isSupabaseConfigured) {
    if (username === 'administrator' && password === 'password') {
      return res.json({
        user: { name: 'Admin', username: 'administrator', email: 'shop4more@email.com' },
        demo: true
      });
    }
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const { data: settings, error } = await supabase
    .from('settings')
    .select('admin_name, admin_username, admin_password, email')
    .eq('id', 1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  const validUser = settings?.admin_username || 'administrator';
  const validPass = settings?.admin_password || 'password';

  if (username === validUser && password === validPass) {
    return res.json({
      user: {
        name: settings?.admin_name || 'Admin',
        username: validUser,
        email: settings?.email || 'shop4more@email.com'
      }
    });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
});

// CRUD Routes
app.use('/api/products', createCrudRouter('products', { orderBy: 'code', ascending: true }));
app.use('/api/suppliers', createCrudRouter('suppliers', { orderBy: 'code', ascending: true }));
app.use('/api/customers', createCrudRouter('customers', { orderBy: 'code', ascending: true }));
app.use('/api/purchase-orders', createCrudRouter('purchase_orders', { orderBy: 'order_date', ascending: false }));
app.use('/api/goods-receiving', createCrudRouter('goods_receiving', { orderBy: 'date_received', ascending: false }));
app.use('/api/delivery-receipts', createCrudRouter('delivery_receipts', { orderBy: 'delivery_date', ascending: false }));

// Stock In / Stock Out & Dashboard / Settings
app.use('/api', transactionsRouter);
app.use('/api', dashboardRouter);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Shop 4 More API server running on http://localhost:${PORT}`);
  });
}

export default app;
