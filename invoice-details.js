// ==================== INVOICE DETAILS ====================
const API = "http://localhost:3001";

// 🔹 استخراج ID من الرابط
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

// 🔹 تحميل التفاصيل
async function loadDetails() {
  try {
    console.log('🔍 Lade Rechnung ID:', id);
    
    const res = await fetch(`${API}/api/invoice/${id}`);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('✅ Rechnungsdaten:', data);

    // Update invoice info
    document.getElementById("invoiceNumber").textContent = data.invoice_number || '-';
    document.getElementById("invoiceDate").textContent = data.created_at ? new Date(data.created_at).toLocaleString() : '-';
    document.getElementById("totalAmount").textContent = formatPrice(data.total_price || 0);
    document.getElementById("grandTotal").textContent = formatPrice(data.total_price || 0);

    let rows = "";

    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        rows += `
          <tr>
            <td>${item.name || item.product_name}</td>
            <td>${item.quantity}</td>
            <td>${formatPrice(item.price)}</td>
            <td>${formatPrice(itemTotal)}</td>
          </tr>
        `;
      });
    } else {
      rows = `<tr><td colspan="4" style="text-align: center; padding: 20px;">لا توجد عناصر في هذه الفاتورة</td></tr>`;
    }

    document.getElementById("itemsTableBody").innerHTML = rows;
    
  } catch (error) {
    console.error('❌ Fehler beim Laden der Rechnung:', error);
    document.getElementById("itemsTableBody").innerHTML = `
      <tr><td colspan="4" style="text-align: center; padding: 20px; color: red;">
        خطأ في تحميل بيانات الفاتورة: ${error.message}
      </td></tr>
    `;
  }
}

// 🔹 طباعة الفاتورة
function printInvoice() {
  const content = document.body.innerHTML;

  const printWindow = window.open("", "", "width=600,height=800");

  printWindow.document.write(`
    <html>
      <head>
        <title>فاتورة - نظام إدارة المتجر</title>
        <style>
          body {
            font-family: Arial;
            direction: rtl;
            padding: 20px;
            line-height: 1.6;
          }
          h2, h3, h4 {
            text-align: center;
            margin: 20px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 10px;
            text-align: center;
          }
          th {
            background: #f2f2f2;
            font-weight: bold;
          }
          .no-print {
            display: none;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${content.replace('<button onclick="printInvoice()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">🖨 طباعة الفاتورة</button>', '')}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}

// 🔹 إغلاق النافذة
function closeWindow() {
  window.close();
}

// تحميل التفاصيل عند بدء الصفحة
document.addEventListener('DOMContentLoaded', function() {
  loadDetails();
});
