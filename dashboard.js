// ==================== DASHBOARD MAIN SCRIPT ====================
// Configuration
const API = "http://localhost:3001/api/products";
const INVOICES_API = "http://localhost:3001/api/invoices";
let currentPage = 'products';
let dbConnected = false;

// Variables
let editId = null;
let allProducts = [];
let products = [];
let cart = [];
let posProducts = [];
let allInvoices = [];
let currentInvoice = null;

// Show specific page
function showPage(pageName) {
  // Update active tab
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
  
  // Hide all pages
  document.querySelectorAll('.page-content').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  document.getElementById(pageName + 'Page').classList.add('active');
  
  // Update page title
  const titles = {
    products: '📦 إدارة المنتجات',
    pos: '💰 نقطة البيع',
    invoices: '🧾 الفواتير'
  };
  document.getElementById('pageTitle').textContent = titles[pageName];
  
  // Update current page
  currentPage = pageName;
  
  // Load page-specific data
  if (pageName === 'pos') {
    loadPOSProducts();
  } else if (pageName === 'invoices') {
    loadInvoices();
  }
  
  // Update stats
  updateStats();
}

// Refresh current page
function refreshCurrentPage() {
  // Get current active tab to find page name
  const activeTab = document.querySelector('.nav-tab.active');
  const pageName = activeTab ? activeTab.getAttribute('data-page') : '';
  
  console.log('🔄 Refreshing page:', pageName); // Debug log
  
  // Refresh content based on current page
  if (pageName === 'pos') {
    console.log('🔄 Loading POS products...');
    loadPOSProducts();
  } else if (pageName === 'products') {
    console.log('🔄 Loading products...');
    loadProducts();
  } else if (pageName === 'invoices') {
    console.log('🔄 Loading invoices...');
    loadInvoices();
  } else {
    console.log('🔄 Unknown page, just updating stats');
  }
  
  // Always update stats
  updateStats();
}

// Load products with timeout
async function loadProducts() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const res = await fetch(API, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    allProducts = data;
    products = data;
    displayProducts(data);
    dbConnected = true;
    document.getElementById('connectionStatus').className = 'connection-status status-connected';
    document.getElementById('connectionStatus').textContent = '🗄️ متصل بقاعدة البيانات';
    console.log(`📦 تم تحميل ${data.length} منتج بنجاح`);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏰ انتهت مهلة تحميل المنتجات');
    } else {
      console.log('فشل في تحميل المنتجات من قاعدة البيانات:', error);
    }
    document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
    document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
    dbConnected = false;
    
    // Show empty state when disconnected
    const tbody = document.getElementById("tableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <h3>🔌 لا يمكن الاتصال بالخادم</h3>
              <p>جاري محاولة إعادة الاتصال...</p>
              <p style="font-size: 12px; color: #999; margin-top: 10px;">
                آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}
              </p>
            </div>
          </td>
        </tr>
      `;
    }
    
    // Update stats with cached data if available
    if (allProducts && allProducts.length > 0) {
      console.log('📊 عرض البيانات المخزنة مؤقتاً');
      updateStats(allProducts);
    }
  }
}

// Display products
function displayProducts(productList) {
  const tbody = document.getElementById("tableBody");
  const productCount = document.getElementById("productCount");
  
  // Update product count
  productCount.textContent = `${productList.length} منتج`;
  
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

// Update stats
function updateStats(productList = allProducts) {
  const totalProducts = productList.length;
  const totalStock = productList.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalValue = productList.reduce((sum, p) => sum + ((p.quantity || 0) * parseFloat(p.purchase_price || 0)), 0);
  const lowStock = productList.filter(p => (p.quantity || 0) < 5).length;

  document.getElementById("totalProducts").textContent = totalProducts;
  document.getElementById("totalStock").textContent = totalStock;
  document.getElementById("totalValue").textContent = formatPrice(totalValue);
  document.getElementById("lowStock").textContent = lowStock;
}

// Save product
async function saveProduct() {
  if (!dbConnected) {
    alert('❌ لا يمكن حفظ المنتج. لا يوجد اتصال بالخادم.');
    return;
  }

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
    // Update existing product
    try {
      const response = await fetch(`${API}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert("✅ تم تعديل المنتج في قاعدة البيانات");
        await loadProducts();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في تعديل المنتج');
      }
    } catch (error) {
      console.error('خطأ في تعديل المنتج:', error);
      alert('❌ فشل في تعديل المنتج: ' + error.message);
    }
    
    editId = null;
    document.getElementById("formTitle").textContent = "➕ إضافة منتج جديد";
  } else {
    // Add new product
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
      
      if (response.ok) {
        const data = await response.json();
        alert("✅ تم حفظ المنتج في قاعدة البيانات");
        await loadProducts();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في حفظ المنتج');
      }
    } catch (error) {
      console.error('خطأ في حفظ المنتج:', error);
      alert('❌ فشل في حفظ المنتج: ' + error.message);
    }
  }

  clearInputs();
}

// Delete product
async function deleteProduct(id) {
  if (!dbConnected) {
    alert('❌ لا يمكن حذف المنتج. لا يوجد اتصال بالخادم.');
    return;
  }

  if (!confirm("⚠️ هل تريد حذف هذا المنتج؟")) {
    return;
  }

  try {
    const response = await fetch(`${API}/${id}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      const data = await response.json();
      alert("✅ تم حذف المنتج من قاعدة البيانات");
      await loadProducts();
    } else {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'فشل في حذف المنتج');
    }
  } catch (error) {
    console.error('خطأ في حذف المنتج:', error);
    alert('❌ فشل في حذف المنتج: ' + error.message);
  }
}

// Fill edit form
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

// Clear inputs
function clearInputs() {
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("purchase").value = "";
  document.getElementById("sale").value = "";
  document.getElementById("qty").value = "";
}

// Search products
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

// POS Functions
function loadPOSProducts() {
  // Use existing products for POS
  posProducts = [...allProducts];
  displayPOSProducts(posProducts);
}

function displayPOSProducts(productList) {
  const productGrid = document.getElementById("productGrid");
  
  if (productList.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-cart">
        <h4>لا توجد منتجات</h4>
        <p>أضف منتجات أولاً من قسم إدارة المنتجات</p>
      </div>
    `;
    return;
  }

  let grid = "";

  productList.forEach(p => {
    const quantity = p.quantity || 0;
    const inStock = quantity > 0;
    
    grid += `
      <div class="product-card ${!inStock ? 'out-of-stock' : ''}" onclick="addToCart(${p.id})">
        <div class="product-name">${p.name || 'غير محدد'}</div>
        <div class="product-price">${formatPrice(p.sale_price || 0)}</div>
        <div class="product-stock">${quantity} متوفر</div>
        ${!inStock ? '<div class="out-of-stock-label">نفد المخزون</div>' : ''}
      </div>
    `;
  });

  productGrid.innerHTML = grid;
}

function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  
  console.log('🛒 addToCart() Debug:');
  console.log('  Product ID:', productId);
  console.log('  All products available:', allProducts.length);
  console.log('  Product:', product);
  console.log('  Product structure:', JSON.stringify(product, null, 2));
  console.log('  Current cart:', cart);
  
  if (!product) {
    console.log('  ❌ Product not found!');
    alert('❌ هذا المنتج غير موجود في النظام');
    return;
  }
  
  if (product.quantity  <= 0) {
    console.log('  ❌ Product out of stock!');
    alert('❌ هذا المنتج غير متوفر في المخزون');
    return;
  }

  const existingItem = cart.find(item => item.product_id === productId);
  console.log('  Existing item:', existingItem);
  
  if (existingItem) {
    console.log('  Product stock (sale_price):', product.sale_price);
    console.log('  Product quantity:', product.quantity);
    console.log('  Existing item stock:', existingItem.quantity);
    console.log('  Product sale_price:', product.sale_price);
    
    if (existingItem.quantity < product.quantity) {
  existingItem.quantity++;
  existingItem.total = existingItem.quantity * existingItem.price;
} else {
  alert('❌ الكمية المطلوبة غير متوفرة في المخزون');
  return;
}
  } else {
    const newItem = {
      product_id: productId,
      product_name: product.name,
      quantity: 1,
      price: product.sale_price,
      total: product.sale_price
    };
    console.log('  ✅ New item created:', newItem);
    cart.push(newItem);
  }

  updateCart();
}

function updateCart() {
  const cartContent = document.getElementById("cartContent");
  const cartTotal = document.getElementById("cartTotal");
  const cartActions = document.getElementById("cartActions");
  const totalAmount = document.getElementById("totalAmount");

  console.log('🛒 updateCart() Debug:');
  console.log('  Cart items:', cart);

  if (cart.length === 0) {
    cartContent.innerHTML = `
      <div class="empty-cart">
        <h4>السلة فارغة</h4>
        <p>اختر منتجات لإضافتها للسلة</p>
      </div>
    `;
    cartTotal.style.display = "none";
    cartActions.style.display = "none";
    return;
  }

  let cartHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    console.log(`  Item ${index}:`, item);
    console.log(`    - Name: ${item.product_name}`);
    console.log(`    - Price: ${item.sale_price}`);
    console.log(`    - Quantity: ${item.quantity}`);
    console.log(`    - Total: ${item.total}`);
    total += (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.product_name}</div>
          <div class="cart-item-price">${formatPrice(item.price)} × ${item.quantity}</div>
        </div>
        <div class="cart-item-actions">
          <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
          <span class="cart-item-quantity">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
          <button class="btn-remove" onclick="removeFromCart(${index})">🗑️</button>
        </div>
      </div>
    `;
  });

  console.log('  Calculated total:', total);
  console.log('  Formatted total:', formatPrice(total));

  cartContent.innerHTML = cartHTML;
  totalAmount.textContent = formatPrice(total);
  cartTotal.style.display = "block";
  cartActions.style.display = "flex";
}

function updateQuantity(index, change) {
  const item = cart[index];
  const product = allProducts.find(p => p.id === item.product_id);
  
  console.log('🛒 Cart Update Debug:');
  console.log('  Item:', item);
  console.log('  Product:', product);
  console.log('  Current quantity:', item.quantity);
  console.log('  Change:', change);
  
  const newQuantity = item.quantity + change;
  console.log('  New quantity:', newQuantity);
  
  if (newQuantity <= 0) {
    removeFromCart(index);
    return;
  }
  
  if (newQuantity > product.quantity) {
    alert('❌ الكمية المطلوبة غير متوفرة في المخزون');
    return;
  }
  
  item.quantity = newQuantity;
  item.total = item.quantity * item.price;
  console.log('  New item total:', item.total);
  
  updateCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCart();
}

function clearCart() {
  if (confirm('⚠️ هل تريد تفريغ السلة؟')) {
    cart = [];
    updateCart();
  }
}

function checkout() {
  if (cart.length === 0) {
    alert('❌ السلة فارغة');
    return;
  }

  // Check stock availability
  for (const item of cart) {
    const product = allProducts.find(p => p.id === item.product_id);
    if (item.quantity > product.quantity) {
      alert(`❌ المنتج "${product.name}" غير متوفر بالكمية المطلوبة`);
      return;
    }
  }

  if (confirm('💳 تأكيد إتمام عملية البيع؟')) {
    processSale();
  }
}

async function processSale() {
  try {
    const response = await fetch('http://localhost:3001/api/sell-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart })
    });

    const data = await response.json();

    if (data.success) {
      alert(`✅ ${data.message}\nرقم الفاتورة: ${data.invoice_number}`);
      cart = [];
      updateCart();
      await loadProducts(); // Refresh products to update stock
      loadPOSProducts(); // Refresh POS products
    } else {
      alert('❌ فشل في إتمام البيع: ' + data.message);
    }
  } catch (error) {
    console.error('خطأ في إتمام البيع:', error);
    alert('❌ خطأ في إتمام البيع');
  }
}

// Invoice functions
async function loadInvoices() {
  try {
    const res = await fetch(INVOICES_API);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    allInvoices = data;
    displayInvoices(data);
    console.log(`🧾 تم تحميل ${data.length} فاتورة بنجاح`);
  } catch (error) {
    console.log('فشل في تحميل الفواتير:', error);
    
    // Show empty state when disconnected
    const tbody = document.getElementById("invoicesTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <h3>🔌 لا يمكن تحميل الفواتير</h3>
              <p>جاري محاولة إعادة الاتصال...</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function displayInvoices(invoices) {
  const tbody = document.getElementById("invoicesTableBody");
  
  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <h3>🧾 لا توجد فواتير</h3>
            <p>ابدأ إجراء عمليات البيع لإنشاء فواتير</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let rows = "";

  invoices.forEach(inv => {
    rows += `
      <tr>
        <td>${inv.invoice_number}</td>
        <td>${new Date(inv.created_at).toLocaleString()}</td>
        <td>${formatPrice(inv.total_price)}</td>
        <td>${inv.items_count || 0} منتج</td>
        <td>
          <button class="btn-small btn-primary" onclick="viewInvoiceDetails(${inv.id})">📄 عرض</button>
          <button class="btn-small btn-danger" onclick="deleteInvoice(${inv.id})">🗑️ حذف</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
}

function closeInvoiceModal() {
  const modal = document.querySelector('div[style*="position: fixed"]');
  if (modal) {
    modal.remove();
  }
}

function viewInvoiceDetails(invoiceId) {
  const invoice = allInvoices.find(inv => inv.id === invoiceId);
  if (!invoice) return;

  currentInvoice = invoice;
  
  // Create modal for invoice details
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    direction: rtl;
    text-align: right;
  `;
  
  modalContent.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #2c3e50;">📄 تفاصيل الفاتورة</h2>
    </div>
    <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
      <p style="margin: 5px 0;"><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
      <p style="margin: 5px 0;"><strong>التاريخ:</strong> ${new Date(invoice.created_at).toLocaleString()}</p>
      <p style="margin: 5px 0;"><strong>المجموع:</strong> <span style="color: #27ae60; font-weight: bold;">${formatPrice(invoice.total_price)}</span></p>
      <p style="margin: 5px 0;"><strong>عدد المنتجات:</strong> ${invoice.items_count || 0}</p>
    </div>
    <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
      <button onclick="window.open('invoice-details.html?id=${invoiceId}', '_blank')" 
              style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                     color: white; border: none; padding: 12px 24px; border-radius: 8px; 
                     cursor: pointer; font-weight: 600; font-size: 14px; 
                     box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                     transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2H5zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1z"/>
          <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-1a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v1H2a2 2 0 0 1-2-2V7zm2.5 1a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1z"/>
        </svg>
        طباعة الفاتورة
      </button>
      <button onclick="closeInvoiceModal()" 
              style="background: linear-gradient(135deg, #c52323  0%, #c22f43  30%); 
                     color: white; border: none; padding: 12px 24px; border-radius: 8px; 
                     cursor: pointer; font-weight: 600; font-size: 14px; 
                     box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
                     transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
        </svg>
        إغلاق
      </button>
    </div>
  `;
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeInvoiceModal();
    }
  });
}

async function deleteInvoice(invoiceId) {
  if (!confirm("⚠️ هل تريد حذف هذه الفاتورة؟\nسيتم استرجاع الكميات للمخزون")) {
    return;
  }

  try {
    const response = await fetch(`${INVOICES_API}/${invoiceId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (data.success) {
      alert("✅ تم حذف الفاتورة واسترجاع المخزون");
      await loadInvoices();
      await loadProducts(); // Refresh products to update stock
    } else {
      alert("❌ خطأ: " + data.message);
    }

  } catch (error) {
    alert("❌ خطأ في الاتصال: " + error.message);
  }
}

// Search POS products
function searchPOSProducts() {
  const keyword = document.getElementById("searchBox").value.toLowerCase();

  if (!keyword) {
    displayPOSProducts(posProducts);
    return;
  }

  const filtered = posProducts.filter(p =>
    (p.name || '').toLowerCase().includes(keyword) ||
    (p.category || '').toLowerCase().includes(keyword)
  );

  displayPOSProducts(filtered);
}

// Hold sale (placeholder function)
function holdSale() {
  alert('⏸️ تعليق البيع - هذه الميزة قيد التطوير');
}

// Check connection status with more tolerant error handling
async function checkConnection() {
  const startTime = performance.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
    
    // Only log when not checking too frequently
    if (!window.lastConnectionCheck || (Date.now() - window.lastConnectionCheck) > 30000) {
      console.log('🔍 بدء فحص الاتصال...');
      window.lastConnectionCheck = Date.now();
    }
    
    const response = await fetch(`${API}`, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Math.round(performance.now() - startTime);
    
    // Only log successful connections
    if (!window.lastConnectionCheck || (Date.now() - window.lastConnectionCheck) > 30000) {
      console.log(`📊 استجابة فحص الاتصال: ${response.status} (${responseTime}ms)`);
    }
    
    if (!response.ok) {
      // Don't treat minor server issues as connection loss
      if (response.status >= 400 && response.status < 500) {
        console.log(`⚠️ خطأ في السيرفر: HTTP ${response.status}`);
        return true; // Still connected, just a server error
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }
    
    // Try to parse a small amount of data to ensure the server is really working
    const data = await response.json();
    
    if (!window.lastConnectionCheck || (Date.now() - window.lastConnectionCheck) > 30000) {
      console.log(`📦 تم استلام ${data.length} منتج في فحص الاتصال`);
    }
    
    return true;
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    
    if (error.name === 'AbortError') {
      console.log(`⏰ انتهت مهلة الاتصال (${responseTime}ms) - قد يكون السيرفر تحت ضغط`);
      // Don't immediately mark as disconnected for timeout
      return responseTime < 15000; // Consider connected if timeout is reasonable
    } else if (error.message.includes('Failed to fetch')) {
      console.log(`🔌 فشل في الاتصال بالسيرفر (${responseTime}ms):`, error.message);
      return false;
    } else {
      console.log(`❌ خطأ في فحص الاتصال (${responseTime}ms):`, error.message);
      return false;
    }
  }
}

// Reconnect to database with timeout
async function reconnectToDatabase() {
  console.log('🔄 محاولة إعادة الاتصال بقاعدة البيانات...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
    
    const response = await fetch(`${API}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      allProducts = data;
      products = data;
      dbConnected = true;
      document.getElementById('connectionStatus').className = 'connection-status status-connected';
      document.getElementById('connectionStatus').textContent = '🗄️ متصل بقاعدة البيانات';
      
      // Update current page
      if (currentPage === 'products') {
        displayProducts(data);
      } else if (currentPage === 'pos') {
        loadPOSProducts();
      } else if (currentPage === 'invoices') {
        loadInvoices();
      }
      
      updateStats();
      console.log('✅ تم إعادة الاتصال بنجاح');
      return true;
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏰ انتهت مهلة إعادة الاتصال');
    } else {
      console.log('فشل في إعادة الاتصال:', error);
    }
    dbConnected = false;
    document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
    document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
    return false;
  }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Load initial data
  loadProducts();
  
  // Set up event listeners
  document.getElementById('search').addEventListener('input', searchProducts);
  document.getElementById('searchBox').addEventListener('input', searchPOSProducts);
  
  // Initialize currency display
  updateCurrencyDisplay();
  
  // Show products page by default
  showPage('products');
  
  // Auto-refresh less frequently to avoid connection issues
  setInterval(() => {
    if (dbConnected) {
      loadProducts();
      if (currentPage === 'invoices') {
        loadInvoices();
      }
    }
  }, 60000); // Increased to 60 seconds
  
  // Check connection status with better logic
  let connectionCheckInterval;
  let isCheckingConnection = false;
  
  const startConnectionChecking = () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    connectionCheckInterval = setInterval(async () => {
      if (isCheckingConnection) {
        return; // Silently skip if already checking
      }
      
      isCheckingConnection = true;
      
      try {
        if (dbConnected) {
          const isConnected = await checkConnection();
          if (!isConnected) {
            console.log('⚠️ تم اكتشاف انقطع الاتصال حقيقي');
            dbConnected = false;
            document.getElementById('connectionStatus').className = 'connection-status status-disconnected';
            document.getElementById('connectionStatus').textContent = '🔌 منقطع الاتصال';
            
            // Switch to reconnection mode
            startReconnectionMode();
          } else {
            // Connection is still good, update last check time
            window.lastConnectionCheck = Date.now();
          }
        } else {
          // Try to reconnect if disconnected
          const reconnected = await reconnectToDatabase();
          if (reconnected) {
            startNormalMode();
          }
        }
      } finally {
        isCheckingConnection = false;
      }
    }, 30000); // Check every 30 seconds when connected
  };
  
  const startReconnectionMode = () => {
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
    
    console.log('🔄 الدخول في وضع إعادة الاتصال');
    
    connectionCheckInterval = setInterval(async () => {
      if (isCheckingConnection) return;
      isCheckingConnection = true;
      
      try {
        const reconnected = await reconnectToDatabase();
        if (reconnected) {
          console.log('✅ تم إعادة الاتصال بنجاح');
          startNormalMode();
        }
      } finally {
        isCheckingConnection = false;
      }
    }, 10000); // Check every 10 seconds when disconnected
  };
  
  const startNormalMode = () => {
    console.log('✅ الدخول في الوضع الطبيعي');
    startConnectionChecking();
  };
  
  // Start with normal mode
  startNormalMode();
});
