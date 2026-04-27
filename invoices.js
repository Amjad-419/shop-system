const API = "http://localhost:3001/api/invoices";

async function loadInvoices() {
  try {
    const res = await fetch(API);
    const data = await res.json();

    let rows = "";

    data.forEach(inv => {
      rows += `
        <tr>
          <td>${inv.invoice_number}</td>
          <td>${inv.created_at ? new Date(inv.created_at).toLocaleString() : '-'}</td>
          <td>${formatPrice(inv.total_price)}</td>
          <td>
            <button onclick="viewInvoice(${inv.id})">📄 عرض</button>
            <button onclick="deleteInvoice(${inv.id})">🗑️ حذف</button>
          </td>
        </tr>
      `;
    });

    document.getElementById("tableBody").innerHTML = rows;

  } catch (err) {
    console.log("Invoice load error:", err);
  }
}

function viewInvoice(id) {
  window.open(`invoice-details.html?id=${id}`, '_blank');
}

async function deleteInvoice(id) {
  if (!confirm("هل تريد حذف الفاتورة؟")) return;

  try {
    const res = await fetch(`${API}/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (data.success) {
      alert("تم الحذف");
      loadInvoices();
    } else {
      alert("خطأ: " + data.message);
    }

  } catch (err) {
    alert("خطأ اتصال");
  }
}

document.addEventListener("DOMContentLoaded", loadInvoices);