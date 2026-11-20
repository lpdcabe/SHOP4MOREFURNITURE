-- ============================================================
-- Shop 4 More Furniture Inventory System - Supabase Schema
-- Run this SQL in your Supabase Project -> SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    contact_number TEXT,
    email TEXT,
    address TEXT,
    total_orders INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Occasional', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    size_spec TEXT DEFAULT '',
    item_type TEXT DEFAULT '',
    supplier_name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 10,
    annual_sales INTEGER NOT NULL DEFAULT 0,
    max_daily_demand NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_lead_time NUMERIC(10, 2) NOT NULL DEFAULT 0,
    avg_daily_demand NUMERIC(10, 2) NOT NULL DEFAULT 0,
    avg_lead_time NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Stock In
CREATE TABLE IF NOT EXISTS stock_in (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_no TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_name TEXT NOT NULL,
    received_by TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Stock Out
CREATE TABLE IF NOT EXISTS stock_out (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_no TEXT UNIQUE NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name TEXT NOT NULL,
    released_by TEXT,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no TEXT UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Goods Receiving
CREATE TABLE IF NOT EXISTS goods_receiving (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiving_no TEXT UNIQUE NOT NULL,
    date_received DATE NOT NULL DEFAULT CURRENT_DATE,
    po_no TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    received_by TEXT,
    condition TEXT NOT NULL DEFAULT 'Good' CHECK (condition IN ('Good', 'Damaged', 'Incomplete')),
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Inspection')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Delivery Receipts
CREATE TABLE IF NOT EXISTS delivery_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dr_no TEXT UNIQUE NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name TEXT NOT NULL,
    driver TEXT,
    vehicle TEXT,
    status TEXT NOT NULL DEFAULT 'Preparing' CHECK (status IN ('Preparing', 'Out for Delivery', 'Delivered')),
    delivery_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Settings (singleton row)
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name TEXT NOT NULL DEFAULT 'Shop 4 More Furniture',
    business_address TEXT NOT NULL DEFAULT 'Angeles City, Pampanga',
    contact_number TEXT NOT NULL DEFAULT '0917-123-4567',
    email TEXT NOT NULL DEFAULT 'shop4more@email.com',
    admin_name TEXT NOT NULL DEFAULT 'Admin',
    admin_username TEXT NOT NULL DEFAULT 'administrator',
    admin_password TEXT NOT NULL DEFAULT 'password',
    low_stock_notification BOOLEAN NOT NULL DEFAULT TRUE,
    auto_generate_code BOOLEAN NOT NULL DEFAULT TRUE,
    allow_negative_inventory BOOLEAN NOT NULL DEFAULT FALSE,
    theme_color TEXT NOT NULL DEFAULT 'Maroon & White',
    language TEXT NOT NULL DEFAULT 'English',
    time_zone TEXT NOT NULL DEFAULT 'GMT +8 Philippines',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed Data
-- ============================================================

INSERT INTO suppliers (code, company_name, contact_person, phone, email, address, status) VALUES
    ('SUP-001', 'ABC Furniture', 'Juan Dela Cruz', '09171234567', 'abc@email.com', 'Angeles City', 'Active'),
    ('SUP-002', 'Modern Home', 'Maria Santos', '09181234567', 'modern@email.com', 'San Fernando', 'Active'),
    ('SUP-003', 'Comfort Seating', 'Pedro Reyes', '09192345678', 'comfort@email.com', 'Mabalacat', 'Inactive'),
    ('SUP-004', 'Dream Furniture', 'Elena Garcia', '09203456789', 'dream@email.com', 'Clark Freeport', 'Active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO customers (code, name, contact_number, email, address, total_orders, status) VALUES
    ('CUS-001', 'Hotel Royale', '09171234567', 'hotel@email.com', 'Angeles City', 15, 'Active'),
    ('CUS-002', 'ABC Construction', '09181234567', 'abc@email.com', 'San Fernando', 10, 'Active'),
    ('CUS-003', 'Walk-in Customer', '----', '----', '----', 3, 'Occasional'),
    ('CUS-004', 'XYZ Office', '09198887777', 'xyz@email.com', 'Mabalacat', 7, 'Active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, category, supplier_name, price, stock, reorder_level, annual_sales) VALUES
    ('P001', 'Wooden Sofa', 'Living Room', 'ABC Furniture', 12500.00, 20, 10, 192),
    ('P002', 'Dining Table', 'Dining', 'Modern Home', 18000.00, 5, 10, 75),
    ('P003', 'Office Chair', 'Office', 'Comfort Seating', 3500.00, 42, 10, 243),
    ('P004', 'Queen Bed Frame', 'Bedroom', 'Dream Furniture', 15000.00, 18, 10, 60),
    ('P005', 'Bookshelf', 'Office', 'ABC Furniture', 4500.00, 3, 5, 40),
    ('P006', 'Coffee Table', 'Living Room', 'Modern Home', 3000.00, 14, 10, 140),
    ('P007', 'TV Rack', 'Living Room', 'ABC Furniture', 2500.00, 0, 5, 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO stock_in (transaction_no, transaction_date, supplier_name, received_by, product_name, quantity, unit_cost, remarks, status) VALUES
    ('SI-0001', '2026-08-04', 'ABC Furniture', 'Admin', 'Wooden Sofa', 15, 9500.00, 'Initial batch', 'Completed'),
    ('SI-0002', '2026-08-03', 'Modern Home', 'Admin', 'Dining Table', 10, 14000.00, 'Restock', 'Completed'),
    ('SI-0003', '2026-08-02', 'Comfort Seating', 'Warehouse Staff', 'Office Chair', 25, 2500.00, 'Awaiting inspection', 'Pending')
ON CONFLICT (transaction_no) DO NOTHING;

INSERT INTO stock_out (transaction_no, transaction_date, customer_name, released_by, product_name, quantity, unit_price, remarks, status) VALUES
    ('SO-0001', '2026-08-04', 'Hotel Royale', 'Admin', 'Wooden Sofa', 5, 12500.00, 'Lobby renovation', 'Completed'),
    ('SO-0002', '2026-08-03', 'ABC Construction', 'Admin', 'Office Chair', 8, 3500.00, 'Office setup', 'Completed'),
    ('SO-0003', '2026-08-02', 'Walk-in Customer', 'Cashier', 'Dining Table', 2, 18000.00, 'For pickup', 'Pending')
ON CONFLICT (transaction_no) DO NOTHING;

INSERT INTO purchase_orders (po_no, supplier_name, order_date, expected_delivery, total_amount, status, notes) VALUES
    ('PO-0001', 'ABC Furniture', '2026-08-01', '2026-08-05', 120000.00, 'Approved', 'Monthly living room restock'),
    ('PO-0002', 'Modern Home', '2026-08-02', '2026-08-06', 58000.00, 'Pending', 'Dining sets'),
    ('PO-0003', 'Comfort Seating', '2026-08-03', '2026-08-08', 39500.00, 'Cancelled', 'Supplier out of stock')
ON CONFLICT (po_no) DO NOTHING;

INSERT INTO goods_receiving (receiving_no, date_received, po_no, supplier_name, received_by, condition, remarks, status) VALUES
    ('GR-0001', '2026-08-05', 'PO-0001', 'ABC Furniture', 'Warehouse Staff', 'Good', 'All items intact', 'Received'),
    ('GR-0002', '2026-08-06', 'PO-0002', 'Modern Home', 'Warehouse Staff', 'Good', 'Verified count', 'Received'),
    ('GR-0003', '2026-08-07', 'PO-0003', 'Comfort Seating', 'Admin', 'Damaged', '2 boxes dented', 'Inspection')
ON CONFLICT (receiving_no) DO NOTHING;

INSERT INTO delivery_receipts (dr_no, delivery_date, customer_name, driver, vehicle, status, delivery_address) VALUES
    ('DR-0001', '2026-08-06', 'Hotel Royale', 'Juan Dela Cruz', 'ABC-1234', 'Delivered', 'Balibago, Angeles City'),
    ('DR-0002', '2026-08-05', 'ABC Construction', 'Pedro Reyes', 'XYZ-5678', 'Out for Delivery', 'Dolores, San Fernando'),
    ('DR-0003', '2026-08-04', 'Walk-in Customer', 'Maria Santos', 'DEF-9012', 'Preparing', 'Mabalacat City')
ON CONFLICT (dr_no) DO NOTHING;

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Ensure API roles can access all tables in public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
