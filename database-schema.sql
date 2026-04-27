-- =============================================
-- POS System Database Schema
-- MySQL Tables for Shop Management System
-- =============================================

-- 1️⃣ Products Table (should already exist)
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  purchase_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2️⃣ Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_created_at (created_at)
);

-- 3️⃣ Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  total_item_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * price) STORED,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_product_id (product_id)
);

-- 4️⃣ Optional: Sales Table (for backup/analysis)
CREATE TABLE IF NOT EXISTS sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  invoice_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  INDEX idx_product_id (product_id),
  INDEX idx_created_at (created_at)
);

-- =============================================
-- Sample Data (Optional - for testing)
-- =============================================

-- Sample Products (uncomment if needed)
/*
INSERT INTO products (name, category, purchase_price, sale_price, quantity) VALUES
('بسكوت', 'مواد غذائية', 5.00, 8.00, 100),
('ماء', 'مشروبات', 1.00, 2.00, 200),
('خبز', 'مخبوزات', 3.00, 5.00, 50);
*/

-- =============================================
-- Verification Queries
-- =============================================

-- Check if tables exist
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'shop' 
AND TABLE_NAME IN ('products', 'invoices', 'invoice_items', 'sales')
ORDER BY TABLE_NAME;
