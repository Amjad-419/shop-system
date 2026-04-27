const http = require('http');
const mysql = require('mysql2');
const url = require('url');

// =====================
// 🔧 MySQL STABLE POOL
// =====================
const db = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: '1234',
  database: 'shop',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true
});

// =====================
// 🧠 PROMISE QUERY
// =====================
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

// =====================
// 🔧 NORMALIZE PATH
// =====================
const normalize = (p) => p.replace(/\/$/, "");

// =====================
// 🚀 SERVER
// =====================
const server = http.createServer(async (req, res) => {

  req.setTimeout(15000);
  res.setTimeout(15000);

  // 🌐 HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
  'Access-Control-Allow-Headers',
  'Content-Type, Cache-Control, Pragma'
   );
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = normalize(parsed.pathname);

  console.log(`➡️ ${req.method} ${pathname}`);

  // =====================
  // 📦 PRODUCTS
  // =====================
  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      const result = await query('SELECT * FROM products');
      res.writeHead(200);
      return res.end(JSON.stringify(result));
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

        const result = await query(
          `INSERT INTO products (name, category, purchase_price, sale_price, quantity)
           VALUES (?, ?, ?, ?, ?)`,
          [p.name, p.category, p.purchase_price, p.sale_price, p.quantity]
        );

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, id: result.insertId }));

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

        await query(
          `UPDATE products SET name=?, category=?, purchase_price=?, sale_price=?, quantity=? WHERE id=?`,
          [p.name, p.category, p.purchase_price, p.sale_price, p.quantity, id]
        );

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

          total += item.price * item.quantity;

          await query(
            'UPDATE products SET quantity = quantity - ? WHERE id=?',
            [item.quantity, item.product_id]
          );
        }

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

          await query(
            `INSERT INTO invoice_items
            (invoice_id, product_id, product_name, quantity, price)
            VALUES (?, ?, ?, ?, ?)`,
            [invoiceId, item.product_id, product[0].name, item.quantity, item.price]
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
  // 📄 GET INVOICES
  // =====================
  if (pathname === '/api/invoices' && req.method === 'GET') {
    try {
      const invoices = await query('SELECT * FROM invoices ORDER BY id DESC');
      
      // Add items count to each invoice
      for (const invoice of invoices) {
        const items = await query('SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
        invoice.items_count = items[0].count;
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
  // 📄 INVOICE DETAILS
  // =====================
  if (pathname.startsWith('/api/invoice/') && req.method === 'GET') {
    const id = pathname.split('/')[3];
    console.log('🔍 Suche Rechnung mit ID:', id);
    console.log('📋 pathname:', pathname);

    try {
      const invoice = await query('SELECT * FROM invoices WHERE id=?', [id]);
      console.log('📊 Rechnung gefunden:', invoice);
      const items = await query(`
        SELECT ii.quantity, ii.price, p.name
        FROM invoice_items ii
        JOIN products p ON p.id = ii.product_id
        WHERE ii.invoice_id=?
      `, [id]);

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