// ==================== CONFIGURATION ====================
const API = "http://localhost:3001/api/products";

// Variables
let editId = null;
let allProducts = [];
let products = [];
let dbConnected = false;

// ==================== DATABASE CONNECTION ====================
async function connectToDatabase() {
  try {
    const response = await fetch('http://localhost:3001/products');
    if (response.ok) {
      const data = await response.json();
      products = data;
      allProducts = data;
      dbConnected = true;
      document.getElementById('connectionStatus').className = 'connection-status status-connected';
      document.getElementById('connectionStatus').textContent = '�️ متصل بقاعدة البيانات';
      displayProducts(products);
      return true;
    }
  } catch (error) {
    console.log('لا يمكن الاتصال بقاعدة البيانات:', error);
    document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
    document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
    alert('❌ لا يمكن الاتصال بالخادم. تأكد من تشغيل السيرفر على http://localhost:3001');
    return false;
  }
}

// ==================== RECONNECT ====================
async function reconnectToDatabase() {
  console.log('🔄 محاولة إعادة الاتصال بقاعدة البيانات...');
  return await connectToDatabase();
}

// ==================== LOAD PRODUCTS ====================
async function loadProducts() {
  try {
    const res = await fetch(API);
    const data = await res.json();
    allProducts = data;
    products = data;
    displayProducts(data);
  } catch (error) {
    console.log('فشل في تحميل المنتجات من قاعدة البيانات:', error);
    document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
    document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
    dbConnected = false;
  }
}

// ==================== DISPLAY PRODUCTS ====================
function displayProducts(productList) {
  const tbody = document.getElementById("tableBody");
  
  if (productList.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <h3>📦 لا توجد منتجات</h3>
            <p>أضف منتجات جديدة لبدء إدارة المخزون</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let rows = "";

  productList.forEach(p => {
    const quantity = p.quantity || 0;
    let stockClass = 'stock-high';
    let stockText = 'متوفر';
    
    if (quantity === 0) {
      stockClass = 'stock-low';
      stockText = 'نفذ';
    } else if (quantity < 5) {
      stockClass = 'stock-medium';
      stockText = 'منخفض';
    }

    rows += `
      <tr>
        <td><strong>${p.name || 'غير محدد'}</strong></td>
        <td>${p.category || 'غير محدد'}</td>
        <td>${formatPrice(p.purchase_price || 0)}</td>
        <td>${formatPrice(p.sale_price || 0)}</td>
        <td>
          <span class="stock-badge ${stockClass}">${quantity} ${stockText}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="fillEdit(${p.id}, '${p.name || 'غير محدد'}', '${p.category || 'غير محدد'}', ${parseFloat(p.purchase_price || 0)}, ${parseFloat(p.sale_price || 0)}, ${p.quantity || 0})">✏️ تعديل</button>
            <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
  updateStats(productList);
}

// ==================== UPDATE STATS ====================
function updateStats(productList) {
  const totalProducts = productList.length;
  const totalStock = productList.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalValue = productList.reduce((sum, p) => sum + ((p.quantity || 0) * parseFloat(p.purchase_price || 0)), 0);
  const lowStock = productList.filter(p => (p.quantity || 0) < 5).length;

  document.getElementById("totalProducts").textContent = totalProducts;
  document.getElementById("totalStock").textContent = totalStock;
  document.getElementById("totalValue").textContent = formatPrice(totalValue);
  document.getElementById("lowStock").textContent = lowStock;
}

// ==================== SAVE PRODUCT ====================
async function saveProduct() {
  const product = {
    name: document.getElementById("name").value,
    category: document.getElementById("category").value,
    purchase_price: parseFloat(document.getElementById("purchase").value) || 0,
    sale_price: parseFloat(document.getElementById("sale").value) || 0,
    quantity: parseInt(document.getElementById("qty").value) || 0
  };

  if (!product.name) {
    alert("❌ اسم المنتج فارغ");
    return;
  }

  if (editId) {
    // تعديل منتج موجود
    try {
      const response = await fetch(`${API}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        alert("✅ تم تعديل المنتج في قاعدة البيانات");
        await loadProducts();
      } else {
        throw new Error('فشل في تعديل المنتج');
      }
    } catch (error) {
      console.error('خطأ في تعديل المنتج:', error);
      alert('❌ فشل في تعديل المنتج');
    }
    
    editId = null;
    document.getElementById("formTitle").textContent = "➕ إضافة منتج جديد";
  } else {
    // إضافة منتج جديد
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        alert("✅ تم حفظ المنتج في قاعدة البيانات");
        await loadProducts();
      } else {
        throw new Error('فشل في حفظ المنتج');
      }
    } catch (error) {
      console.error('خطأ في حفظ المنتج:', error);
      alert('❌ فشل في حفظ المنتج');
    }
  }

  clearInputs();
}

// ==================== DELETE PRODUCT ====================
async function deleteProduct(id) {
  if (!confirm("⚠️ هل تريد حذف هذا المنتج؟")) {
    return;
  }

  try {
    const response = await fetch(`${API}/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      alert("✅ تم حذف المنتج من قاعدة البيانات");
      await loadProducts();
    } else {
      throw new Error('فشل في حذف المنتج');
    }
  } catch (error) {
    console.error('خطأ في حذف المنتج:', error);
    alert('❌ فشل في حذف المنتج');
  }
}

// ==================== EDIT PRODUCT ====================
function fillEdit(id, n, c, p, s, q) {
  editId = id;

  document.getElementById("formTitle").textContent = "✏️ تعديل منتج";
  document.getElementById("name").value = n;
  document.getElementById("category").value = c;
  document.getElementById("purchase").value = p;
  document.getElementById("sale").value = s;
  document.getElementById("qty").value = q;

  document.getElementById("name").focus();
}

// ==================== CLEAR INPUTS ====================
function clearInputs() {
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("purchase").value = "";
  document.getElementById("sale").value = "";
  document.getElementById("qty").value = "";
}

// ==================== SEARCH PRODUCTS ====================
function searchProducts() {
  const keyword = document.getElementById("search").value.toLowerCase();

  if (!keyword) {
    displayProducts(allProducts);
    return;
  }

  const filtered = allProducts.filter(p =>
    (p.name || '').toLowerCase().includes(keyword) ||
    (p.category || '').toLowerCase().includes(keyword)
  );

  displayProducts(filtered);
}

// ==================== INITIALIZATION ====================
console.log('🚀 بدء التطبيق...');

// تفعيل الاتصال بقاعدة البيانات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔌 الاتصال بقاعدة البيانات...');
  connectToDatabase();
});

// محاولة إعادة الاتصال التلقائي كل 5 ثواني
setInterval(async () => {
  if (!dbConnected) {
    console.log('🔄 محاولة إعادة الاتصال...');
    await reconnectToDatabase();
  } else {
    // التحقق من الاتصال من خلال تحميل المنتجات
    try {
      const response = await fetch('http://localhost:3001/products');
      if (!response.ok) {
        throw new Error('فقد انقطع الاتصال');
      }
    } catch (error) {
      console.log('فقد انقطع الاتصال بقاعدة البيانات:', error);
      dbConnected = false;
      document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
      document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
      await reconnectToDatabase();
    }
  }
}, 5000);

// مستمع حدث تغيير العملة
window.addEventListener('currencyChanged', function(e) {
  console.log('💱 تم تغيير العملة:', e.detail.currency.name);
  // تحديث عرض المنتجات
  if (allProducts && allProducts.length > 0) {
    displayProducts(allProducts);
  }
  // تحديث جميع رموز العملة في الصفحة
  setTimeout(() => {
    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = e.detail.currency.symbol;
    });
  }, 0);
});
