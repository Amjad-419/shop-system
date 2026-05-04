// MySQL Server
const mysql = require('mysql2/promise');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 🗄️ DATABASE CONNECTION
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: '1234',
  database: 'shop',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 🔄 QUERY FUNCTION
async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// 🔄 NORMALIZATION
function normalize(str) {
  return str.replace(/\/+/g, '/');
}

// =====================
// 🚀 SERVER
// =====================
const server = http.createServer(async (req, res) => {

  req.setTimeout(15000);
  res.setTimeout(15000);

  // 🌐 HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Pragma');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = normalize(parsed.pathname);

  console.log(`➡️ ${req.method} ${pathname}`);

  // =====================
  // � SERVE STATIC FILES
  // =====================
  if (pathname === '/' || pathname === '/index.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'dashboard-standalone.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (err) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'File not found' }));
    }
  }

  if (pathname === '/style.css') {
    try {
      const css = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
      return res.end(css);
    } catch (err) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'CSS not found' }));
    }
  }

  if (pathname === '/dashboard.js') {
    try {
      const js = fs.readFileSync(path.join(__dirname, 'dashboard.js'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(js);
    } catch (err) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'JS not found' }));
    }
  }

  if (pathname === '/invoice-details.html') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'invoice-details.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (err) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Invoice details not found' }));
    }
  }

  if (pathname === '/invoice-details.js') {
    try {
      const js = fs.readFileSync(path.join(__dirname, 'invoice-details.js'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      return res.end(js);
    } catch (err) {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Invoice details JS not found' }));
    }
  }

  if (pathname === '/currency.js') {
    // Return empty currency module as fallback
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return res.end('// Currency module - not needed');
  }

  // =====================
  // 📦 PRODUCTS
  // =====================
  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM products ORDER BY id DESC');
      res.writeHead(200);
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // =====================
  // 📦 GET SINGLE PRODUCT
  // =====================
  if (pathname.startsWith('/api/products/') && req.method === 'GET') {
    const id = pathname.split('/')[3];
    
    try {
      const result = await query('SELECT * FROM products WHERE id = ?', [id]);
      
      if (result.length === 0) {
        res.writeHead(404);
        return res.end(JSON.stringify({ error: 'Product not found' }));
      }
      
      res.writeHead(200);
      return res.end(JSON.stringify(result[0]));
    } catch (err) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // =====================
  // ➕ ADD PRODUCT
  // =====================
  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);

    req.on('end', async () => {
      try {
        const p = JSON.parse(body);

        // Try to insert with new fields first, fallback to old fields if they don't exist
        let insertResult;
        try {
          insertResult = await query(
            `INSERT INTO products (name, category, supplier, purchase_price, sale_price, quantity, capacity, unit)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [p.name, p.category, p.supplier, p.purchase_price, p.sale_price, p.quantity || 0, p.capacity || 1, p.unit || 'قطعة']
          );
        } catch (err) {
          if (err.message.includes('Unknown column')) {
            // Fallback to old schema
            insertResult = await query(
              `INSERT INTO products (name, category, supplier, purchase_price, sale_price, quantity)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [p.name, p.category, p.supplier, p.purchase_price, p.sale_price, p.quantity || 0]
            );
          } else {
            throw err;
          }
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: insertResult.insertId }));

      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================
  // ✏️ UPDATE PRODUCT
  // =====================
  if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
    const id = pathname.split('/')[3];

    let body = '';
    req.on('data', c => body += c);

    req.on('end', async () => {
      try {
        const p = JSON.parse(body);

        // Try to update with new fields first, fallback to old fields if they don't exist
        try {
          await query(
            `UPDATE products SET name=?, category=?, supplier=?, purchase_price=?, sale_price=?, quantity=?, capacity=?, unit=? WHERE id=?`,
            [p.name, p.category, p.supplier, p.purchase_price, p.sale_price, p.quantity || 0, p.capacity || 1, p.unit || 'قطعة', id]
          );
        } catch (err) {
          if (err.message.includes('Unknown column')) {
            // Fallback to old schema
            await query(
              `UPDATE products SET name=?, category=?, supplier=?, purchase_price=?, sale_price=?, quantity=? WHERE id=?`,
              [p.name, p.category, p.supplier, p.purchase_price, p.sale_price, p.quantity || 0, id]
            );
          } else {
            throw err;
          }
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));

      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================
  // 🗑 DELETE PRODUCT
  // =====================
  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];

    try {
      await query('DELETE FROM products WHERE id=?', [id]);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // 🏢 GET SUPPLIERS
  // =====================
  if (pathname === '/api/suppliers' && req.method === 'GET') {
    try {
      const suppliers = await query('SELECT * FROM suppliers ORDER BY name');
      
      // Count products for each supplier
      for (const supplier of suppliers) {
        const productCount = await query('SELECT COUNT(*) as count FROM products WHERE supplier = ?', [supplier.name]);
        supplier.product_count = productCount[0].count;
      }

      res.writeHead(200);
      res.end(JSON.stringify(suppliers));

    } catch (err) {
      console.log('🔥 SUPPLIERS ERROR:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // ➕ ADD SUPPLIER
  // =====================
  if (pathname === '/api/suppliers' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);

    req.on('end', async () => {
      try {
        const s = JSON.parse(body);
        console.log('🏢 Adding supplier:', s);

        const result = await query(
          `INSERT INTO suppliers (name, phone, email, address)
           VALUES (?, ?, ?, ?)`,
          [s.name, s.phone, s.email, s.address]
        );

        console.log('✅ Supplier added with ID:', result.insertId);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: result.insertId }));

      } catch (err) {
        console.log('🔥 ADD SUPPLIER ERROR:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================
  // 🗑 DELETE SUPPLIER
  // =====================
  if (pathname.startsWith('/api/suppliers/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    console.log('🗑️ Deleting supplier with ID:', id);

    try {
      await query('DELETE FROM suppliers WHERE id=?', [id]);
      console.log('✅ Supplier deleted successfully');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.log('🔥 DELETE SUPPLIER ERROR:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // 👥 GET CUSTOMERS
  // =====================
  if (pathname === '/api/customers' && req.method === 'GET') {
    try {
      const customers = await query('SELECT * FROM customers ORDER BY name');
      
      // Count invoices for each customer
      for (const customer of customers) {
        const invoiceCount = await query('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?', [customer.id]);
        customer.invoice_count = invoiceCount[0].count;
        
        // Get total purchases
        const totalResult = await query('SELECT SUM(total_price) as total FROM invoices WHERE customer_id = ?', [customer.id]);
        customer.total_purchases = totalResult[0].total || 0;
      }

      res.writeHead(200);
      res.end(JSON.stringify(customers));

    } catch (err) {
      console.log('🔥 CUSTOMERS ERROR:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // ➕ ADD CUSTOMER
  // =====================
  if (pathname === '/api/customers' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);

    req.on('end', async () => {
      try {
        const c = JSON.parse(body);
        console.log('👥 Adding customer:', c);

        const result = await query(
          `INSERT INTO customers (name, phone, email, address)
           VALUES (?, ?, ?, ?)`,
          [c.name, c.phone, c.email, c.address]
        );

        console.log('✅ Customer added with ID:', result.insertId);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: result.insertId }));

      } catch (err) {
        console.log('🔥 ADD CUSTOMER ERROR:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =====================
  // 🗑 DELETE CUSTOMER
  // =====================
  if (pathname.startsWith('/api/customers/') && req.method === 'DELETE') {
    const id = pathname.split('/')[3];
    console.log('🗑️ Deleting customer with ID:', id);

    try {
      await query('DELETE FROM customers WHERE id=?', [id]);
      console.log('✅ Customer deleted successfully');
      res.writeHead(200);
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.log('🔥 DELETE CUSTOMER ERROR:', err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // 📄 GET INVOICES
  // =====================
  if (pathname === '/api/invoices' && req.method === 'GET') {
    try {
      const invoices = await query('SELECT * FROM invoices ORDER BY id DESC');
      
      // Add items count and categories to each invoice
      for (const invoice of invoices) {
        const items = await query('SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
        invoice.items_count = items[0].count;
        
        // Get categories for this invoice
        const categories = await query(`
          SELECT DISTINCT p.category 
          FROM invoice_items ii 
          JOIN products p ON p.id = ii.product_id 
          WHERE ii.invoice_id = ? AND p.category IS NOT NULL AND p.category != ''
        `, [invoice.id]);
        invoice.categories = categories.map(c => c.category).filter(c => c).join('، ') || '-';
      }

      res.writeHead(200);
      res.end(JSON.stringify(invoices));

    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // =====================
  // 💰 SELL MULTIPLE
  // =====================
  if (pathname === '/api/sell-multiple' && req.method === 'POST') {
    let body = '';

    req.on('data', c => body += c);

    req.on('end', async () => {
      try {
        const { items } = JSON.parse(body);

        // Generate sequential invoice number starting from 00000001
        // Check if last invoice has old format (timestamp) or new format (padded)
        const lastInvoice = await query('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');
        let nextNumber = 1;
        
        if (lastInvoice.length > 0) {
          const lastNumberStr = lastInvoice[0].invoice_number.replace('INV-', '');
          
          // Check if it's old timestamp format (more than 8 digits) or new format
          if (lastNumberStr.length > 8) {
            // Old format - start fresh with new numbering
            nextNumber = 1;
            console.log('🔄 Altes Nummernformat erkannt, starte bei INV-00000001');
          } else {
            // New format - continue sequence
            const lastNumber = parseInt(lastNumberStr);
            nextNumber = lastNumber + 1;
          }
        }
        
        const invoiceNumber = 'INV-' + String(nextNumber).padStart(8, '0');
        console.log('📄 Neue Rechnungsnummer:', invoiceNumber);
        let total = 0;

        for (const item of items) {
          const product = await query(
            'SELECT * FROM products WHERE id=?',
            [item.product_id]
          );

          if (!product[0]) continue;

          // Use the price from the item (sale_price) or fallback to product price
          const itemPrice = parseFloat(item.price) || parseFloat(product[0].sale_price) || 0;
          const itemQuantity = parseInt(item.quantity) || 0;
          const itemTotal = itemPrice * itemQuantity;
          
          console.log(`📊 Item: ${product[0].name}, Price: ${itemPrice}, Quantity: ${itemQuantity}, Total: ${itemTotal}`);
          
          total += itemTotal;

          await query(
            'UPDATE products SET quantity = quantity - ? WHERE id=?',
            [itemQuantity, item.product_id]
          );
        }
        
        console.log('💰 Calculated total:', total);

        const invoice = await query(
          'INSERT INTO invoices (invoice_number, total_price) VALUES (?, ?)',
          [invoiceNumber, total]
        );

        const invoiceId = invoice.insertId;

        for (const item of items) {
          const product = await query(
            'SELECT * FROM products WHERE id=?',
            [item.product_id]
          );

          if (!product[0]) continue;

          // Use the correct price for invoice items
          const itemPrice = parseFloat(item.price) || parseFloat(product[0].sale_price) || 0;
          
          await query(
            `INSERT INTO invoice_items
            (invoice_id, product_id, product_name, category, quantity, price)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [invoiceId, item.product_id, product[0].name, product[0].category, item.quantity, itemPrice]
          );
        }

        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          invoice_id: invoiceId,
          invoice_number: invoiceNumber
        }));

      } catch (err) {
        console.log('🔥 SELL ERROR:', err.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });

    return;
  }

  // =====================
  // 📄 INVOICE DETAILS
  // =====================
  if (pathname.startsWith('/api/invoice/') && req.method === 'GET') {
    const id = pathname.split('/')[3];
    console.log('🔍 Suche Rechnung mit ID:', id);

    try {
      const invoice = await query('SELECT * FROM invoices WHERE id=?', [id]);
      console.log('📊 Rechnung gefunden:', invoice);
      const items = await query(`
        SELECT ii.quantity, ii.price, p.name, p.category
        FROM invoice_items ii
        JOIN products p ON p.id = ii.product_id
        WHERE ii.invoice_id=?
      `, [id]);
      
      console.log('📊 Invoice items found:', items);
      console.log('📊 Items count:', items.length);

      if (invoice.length === 0) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Invoice not found' }));
        return;
      }

      const result = {
        invoice_number: invoice[0].invoice_number,
        total_price: invoice[0].total_price,
        created_at: invoice[0].created_at,
        items: items
      };
      
      console.log('📊 Final result:', JSON.stringify(result, null, 2));

      res.writeHead(200);
      res.end(JSON.stringify(result));

    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }
  
  if (pathname.startsWith('/api/invoices/') && req.method === 'DELETE') {
  const invoiceId = pathname.split('/')[3];

  try {
    // 1. جلب عناصر الفاتورة
    const items = await query(
      'SELECT * FROM invoice_items WHERE invoice_id=?',
      [invoiceId]
    );

    // 2. استرجاع المخزون
    for (const item of items) {
      await query(
        'UPDATE products SET quantity = quantity + ? WHERE id=?',
        [item.quantity, item.product_id]
      );
    }

    // 3. حذف العناصر
    await query('DELETE FROM invoice_items WHERE invoice_id=?', [invoiceId]);

    // 4. حذف الفاتورة
    await query('DELETE FROM invoices WHERE id=?', [invoiceId]);

    res.writeHead(200);
    return res.end(JSON.stringify({
      success: true,
      message: 'Invoice deleted successfully'
    }));

  } catch (err) {
    console.log('❌ DELETE INVOICE ERROR:', err.message);

    res.writeHead(500);
    return res.end(JSON.stringify({
      success: false,
      message: err.message
    }));
  }
}

  // =====================
  // ❌ NOT FOUND
  // =====================
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// =====================
// 🚀 START SERVER
// =====================
server.listen(3001, () => {
  console.log('🚀 Server running on http://localhost:3001');
});
