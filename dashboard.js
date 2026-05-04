// ==================== DASHBOARD MAIN SCRIPT ====================
// Configuration
const API = "http://localhost:3001/api/products";
const INVOICES_API = "http://localhost:3001/api/invoices";

// =====================
// 💰 FORMAT PRICE
// =====================
function formatPrice(price) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SYP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price || 0);
}
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
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`.nav-item[data-page="${pageName}"]`).classList.add('active');
  
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
    invoices: '🧾 الفواتير',
    suppliers: '🏢 الشركات والموردون'
  };
  document.getElementById('pageTitle').textContent = titles[pageName];
  
  // Update current page
  currentPage = pageName;
  
  // Load page-specific data
  if (pageName === 'pos') {
    loadPOSProducts();
  } else if (pageName === 'invoices') {
    loadInvoices();
  } else if (pageName === 'suppliers') {
    loadSuppliers();
  } else if (pageName === 'customers') {
    loadCustomers();
  } else if (pageName === 'products') {
    // Load suppliers to update dropdown when products page loads
    loadSuppliers();
  }
  
  // Update stats
  updateStats();
}

// Refresh current page
function refreshCurrentPage() {
  // Get current active nav item to find page name
  const activeItem = document.querySelector('.nav-item.active');
  const pageName = activeItem ? activeItem.getAttribute('data-page') : '';
  
  console.log('🔄 Refreshing page:', pageName); // Debug log
  
  // Refresh content based on current page
  if (pageName === 'pos') {
    console.log('🔄 Loading POS products...');
    loadPOSProducts();
  } else if (pageName === 'products') {
    console.log('🔄 Loading products...');
    loadProducts();
    // Also load suppliers to update dropdown
    loadSuppliers();
  } else if (pageName === 'invoices') {
    console.log('🔄 Loading invoices...');
    loadInvoices();
  } else if (pageName === 'suppliers') {
    console.log('🔄 Loading suppliers...');
    loadSuppliers();
  } else if (pageName === 'customers') {
    console.log('🔄 Loading customers...');
    loadCustomers();
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
        <td colspan="9">
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
        <td>${p.supplier || '-'}</td>
        <td>${formatPrice(p.purchase_price || 0)}</td>
        <td>${formatPrice(p.sale_price || 0)}</td>
        <td>
          <span class="stock-badge ${stockClass}">${quantity} ${stockText}</span>
        </td>
        <td>${p.capacity || 1}</td>
        <td>${p.unit || 'قطعة'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="fillEdit(${p.id})">✏️ تعديل</button>
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
    supplier: document.getElementById("supplier").value,
    purchase_price: parseFloat(document.getElementById("purchase").value) || 0,
    sale_price: parseFloat(document.getElementById("sale").value) || 0,
    quantity: parseInt(document.getElementById("qty").value) || 0,
    capacity: parseFloat(document.getElementById("capacity").value) || 1,
    unit: document.getElementById("unit").value || 'قطعة'
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
async function fillEdit(id) {
  try {
    // Get product data from server
    const response = await fetch(`${API}/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }
    
    const product = await response.json();
    
    editId = id;
    document.getElementById("formTitle").textContent = "✏️ تعديل منتج";
    document.getElementById("name").value = product.name || '';
    document.getElementById("category").value = product.category || '';
    document.getElementById("supplier").value = product.supplier || '';
    document.getElementById("purchase").value = product.purchase_price || 0;
    document.getElementById("sale").value = product.sale_price || 0;
    document.getElementById("qty").value = product.quantity || 0;
    document.getElementById("capacity").value = product.capacity || 1;
    document.getElementById("unit").value = product.unit || 'قطعة';

    document.getElementById("name").focus();
  } catch (error) {
    console.error('Error loading product for edit:', error);
    alert('❌ فشل في تحميل بيانات المنتج للتعديل');
  }
}

// Clear inputs
function clearInputs() {
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("supplier").value = "";
  document.getElementById("purchase").value = "";
  document.getElementById("sale").value = "";
  document.getElementById("qty").value = "";
  document.getElementById("capacity").value = "";
  document.getElementById("unit").value = "قطعة";
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
  console.log('🛍️ loadPOSProducts() Debug:');
  console.log('  All products available:', allProducts.length);
  console.log('  All products:', allProducts);
  
  // Use existing products for POS
  posProducts = [...allProducts];
  displayPOSProducts(posProducts);
}

function displayPOSProducts(productList) {
  const productGrid = document.getElementById("productGrid");
  
  console.log('🛍️ displayPOSProducts() Debug:');
  console.log('  Product list length:', productList.length);
  console.log('  Product list:', productList);
  
  if (productList.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-cart">
        <h4>📦 لا توجد منتجات</h4>
        <p>أضف منتجات أولاً من قسم إدارة المنتجات</p>
      </div>
    `;
    return;
  }

  let grid = "";

  productList.forEach(p => {
    const quantity = parseInt(p.quantity) || 0;
    const inStock = quantity > 0;
    const salePrice = parseFloat(p.sale_price) || 0;
    
    console.log(`  📊 Processing product: ${p.name}, Stock: ${quantity}, Price: ${salePrice}`);
    
    const capacity = parseFloat(p.capacity) || 1;
    const unit = p.unit || 'قطعة';
    
    // Display capacity only for all products
    let stockInfo = '';
    if (unit === 'قطعة' || unit === 'صندوق' || unit === 'عبوة') {
      // For pieces, show single unit capacity only
      stockInfo = `السعة: 1 ${unit}`;
    } else {
      // For measuring units, show capacity only
      stockInfo = `السعة: ${capacity} ${unit}`;
    }
    
    grid += `
      <div class="product-card ${!inStock ? 'out-of-stock' : ''}" onclick="addToCart(${p.id})">
        <div class="product-name">${p.name || 'غير محدد'}</div>
        <div class="product-price">${formatPrice(salePrice)}</div>
        <div class="product-stock">${stockInfo}</div>
        ${!inStock ? '<div class="out-of-stock-label">نفد المخزون</div>' : ''}
      </div>
    `;
  });

  productGrid.innerHTML = grid;
  console.log('✅ Products displayed in POS grid');
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
  
  if (product.quantity <= 0) {
    console.log('  ❌ Product out of stock!');
    alert('❌ هذا المنتج غير متوفر في المخزون');
    return;
  }

  const existingItem = cart.find(item => item.product_id === productId);
  console.log('  Existing item:', existingItem);
  
  if (existingItem) {
    console.log('  Product stock (quantity):', product.quantity);
    console.log('  Existing item quantity:', existingItem.quantity);
    
    if (existingItem.quantity < product.quantity) {
      existingItem.quantity++;
      // Einfache Preisberechnung: verwende gespeicherten Preis
      const price = parseFloat(existingItem.price) || parseFloat(product.sale_price) || 0;
      existingItem.total = price * existingItem.quantity;
      console.log('  ✅ Item quantity updated:', existingItem.quantity);
      console.log('  ✅ New total:', existingItem.total);
    } else {
      console.log('  ❌ Insufficient stock');
      alert('❌ الكمية المطلوبة غير متوفرة في المخزون');
      return;
    }
  } else {
    // Einfache Preis-Initialisierung
    const price = parseFloat(product.sale_price) || 0;
    const capacity = parseFloat(product.capacity) || 1;
    const unit = product.unit || 'قطعة';
    
    // Use actual capacity for measuring units, 1 for pieces
    let actualQuantity = 1;
    if (unit !== 'قطعة' && unit !== 'صندوق' && unit !== 'عبوة') {
      actualQuantity = capacity;
    }
    
    const newItem = {
      product_id: productId,
      product_name: product.name,
      quantity: actualQuantity,
      price: price,
      unit: unit,
      total: price * actualQuantity
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
    // Verwende gespeicherten item.total direkt mit Validierung
    let itemTotal = 0;
    if (item.total !== null && item.total !== undefined && item.total !== '') {
      const totalStr = String(item.total).replace(',', '.');
      itemTotal = parseFloat(totalStr) || 0;
    }
    
    // Zusätzliche Validierung
    if (isNaN(itemTotal) || !isFinite(itemTotal)) itemTotal = 0;
    
    // Debug-Informationen
    console.log(`  Item ${index}:`, item);
    console.log(`    - Name: ${item.product_name}`);
    console.log(`    - Stored item.total: ${item.total} -> Cleaned: ${itemTotal}`);
    
    // Gesamtberechnung mit gespeichertem Wert
    total += Math.round(itemTotal * 100) / 100;
    
    // Anzeige-Werte berechnen
    const displayPrice = item.price || 0;
    const displayQuantity = item.quantity || 0;
    
    const unit = item.unit || 'قطعة';
    cartHTML += `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.product_name}</div>
          <div class="cart-item-price">${formatPrice(displayPrice)} × ${displayQuantity} ${unit}</div>
        </div>
        <div class="cart-item-actions">
          <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button>
          <span class="cart-item-quantity">${displayQuantity} ${unit}</span>
          <button class="quantity-btn" onclick="updateQuantity(${index}, 1)">+</button>
          <button class="btn-remove" onclick="removeFromCart(${index})">🗑️</button>
        </div>
      </div>
    `;
  });

  // Finale Gesamtberechnung mit Rundung
  total = Math.round(total * 100) / 100;
  
  console.log('  Final calculated total:', total);
  console.log('  Formatted total:', formatPrice(total));
  console.log('  Number of cart items:', cart.length);

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
  
  // Robuste Mengen-Konvertierung
  const currentQuantity = parseInt(item.quantity) || 0;
  const newQuantity = currentQuantity + change;
  const stockQuantity = parseInt(product.quantity) || 0;
  
  console.log('  New quantity:', newQuantity);
  console.log('  Stock quantity:', stockQuantity);
  
  if (newQuantity <= 0) {
    removeFromCart(index);
    return;
  }
  
  // Robuste Lagerbestands-Prüfung
  if (newQuantity > stockQuantity) {
    alert(`❌ الكمية المطلوبة غير متوفرة في المخزون. Verfügbar: ${stockQuantity}, Gewünscht: ${newQuantity}`);
    return;
  }
  
  // Einfache Preisberechnung
  const price = parseFloat(item.price) || parseFloat(product.sale_price) || 0;
  
  // Update item
  item.quantity = newQuantity;
  item.total = price * newQuantity;
  
  console.log('    - Used price:', price);
  console.log('    - Calculated total:', item.total);
  
  console.log('  Updated item:', item);
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
  console.log('🧾 loadInvoices() Starting...');
  try {
    console.log('📡 Fetching invoices from:', INVOICES_API);
    const res = await fetch(INVOICES_API);
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('📊 Invoices data received:', data);
    console.log('📊 Invoices count:', data.length);
    
    allInvoices = data;
    displayInvoices(data);
    console.log(`✅ تم تحميل ${data.length} فاتورة بنجاح`);
  } catch (error) {
    console.error('❌ فشل في تحميل الفواتير:', error);
    
    // Show empty state when disconnected
    const tbody = document.getElementById("invoicesTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <h3>🔌 لا يمكن تحميل الفواتير</h3>
              <p>جاري محاولة إعادة الاتصال...</p>
              <p><small>خطأ: ${error.message}</small></p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

function displayInvoices(invoices) {
  console.log('🧾 displayInvoices() Debug:');
  console.log('  Invoices received:', invoices.length);
  console.log('  Invoices data:', invoices);
  
  const tbody = document.getElementById("invoicesTableBody");
  
  if (!tbody) {
    console.log('❌ invoicesTableBody not found!');
    return;
  }
  
  if (invoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
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

  invoices.forEach((inv, index) => {
    console.log(`  📊 Processing invoice ${index + 1}:`, inv);
    
    const invoiceDate = inv.created_at ? new Date(inv.created_at).toLocaleString('ar-SA') : '-';
    const totalPrice = parseFloat(inv.total_price) || 0;
    const itemsCount = inv.items_count || 0;
    const categories = inv.categories || '-';
    
    console.log(`    Date: ${invoiceDate}, Price: ${totalPrice}, Items: ${itemsCount}`);
    
    rows += `
      <tr>
        <td><strong>${inv.invoice_number || 'N/A'}</strong></td>
        <td>${invoiceDate}</td>
        <td>${formatPrice(totalPrice)}</td>
        <td>${itemsCount} منتج</td>
        <td>${categories}</td>
        <td>
          <button class="btn-small btn-primary" onclick="viewInvoiceDetails(${inv.id})">📄 عرض</button>
          <button class="btn-small btn-danger" onclick="deleteInvoice(${inv.id})">🗑️ حذف</button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
  console.log('✅ Invoices displayed successfully');
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
              style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
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
  
  // Currency display will be initialized when needed
  
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

// =====================
// 🎯 GLOBAL VARIABLES
// =====================
let allSuppliers = [];
const SUPPLIERS_API = "http://localhost:3001/api/suppliers";

// Load suppliers
async function loadSuppliers() {
  try {
    const response = await fetch(SUPPLIERS_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    allSuppliers = await response.json();
    displaySuppliers(allSuppliers);
    updateSupplierSelect(); // Update dropdown when loading
    console.log('🏢 تم تحميل قائمة الشركات');
  } catch (error) {
    console.log('فشل في تحميل الشركات:', error);
    const tbody = document.getElementById("suppliersTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <h3>🔌 لا يمكن تحميل الشركات</h3>
              <p>جاري محاولة إعادة الاتصال...</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

// Display suppliers
function displaySuppliers(suppliers) {
  const tbody = document.getElementById("suppliersTableBody");
  
  if (suppliers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <h3>🏢 لا توجد شركات</h3>
            <p>ابدأ بإضافة الشركات والموردين</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let rows = "";
  suppliers.forEach(supplier => {
    rows += `
      <tr>
        <td><strong>${supplier.name || 'غير محدد'}</strong></td>
        <td>${supplier.phone || '-'}</td>
        <td>${supplier.email || '-'}</td>
        <td>${supplier.address || '-'}</td>
        <td>${supplier.productCount || 0} منتج</td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" onclick="editSupplier(${supplier.id})">✏️ تعديل</button>
            <button class="btn-delete" onclick="deleteSupplier(${supplier.id})">🗑️ حذف</button>
          </div>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rows;
}

// Show add supplier modal
function showAddSupplierModal() {
  document.getElementById('supplierModal').style.display = 'flex';
  clearSupplierForm();
}

// Close supplier modal
function closeSupplierModal() {
  document.getElementById('supplierModal').style.display = 'none';
  clearSupplierForm();
}

// Clear supplier form
function clearSupplierForm() {
  document.getElementById('supplierName').value = '';
  document.getElementById('supplierPhone').value = '';
  document.getElementById('supplierEmail').value = '';
  document.getElementById('supplierAddress').value = '';
}

// Save supplier
async function saveSupplier() {
  const name = document.getElementById('supplierName').value.trim();
  const phone = document.getElementById('supplierPhone').value.trim();
  const email = document.getElementById('supplierEmail').value.trim();
  const address = document.getElementById('supplierAddress').value.trim();

  if (!name) {
    alert('❌ يجب إدخال اسم الشركة');
    return;
  }

  // Save to database
  try {
    const response = await fetch(SUPPLIERS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: email,
        address: address
      })
    });
    
    if (!response.ok) {
      throw new Error('فشل في حفظ الشركة');
    }
    
    // Reload suppliers list
    await loadSuppliers();
    closeSupplierModal();
    
    alert('✅ تم إضافة الشركة بنجاح');
  } catch (error) {
    console.error('Error saving supplier:', error);
    alert('❌ فشل في حفظ الشركة: ' + error.message);
  }
}

// Edit supplier (placeholder)
function editSupplier(id) {
  alert('🔧 وظيفة التعديل قيد التطوير');
}

// Update supplier dropdown in products form
function updateSupplierSelect() {
  const supplierSelect = document.getElementById('supplier');
  if (!supplierSelect) return;
  
  // Clear existing options except the first two
  const currentValue = supplierSelect.value;
  supplierSelect.innerHTML = `
    <option value="">-- اختر الشركة --</option>
    <option value="غير مسجل">غير مسجل</option>
  `;
  
  // Add suppliers to dropdown
  allSuppliers.forEach(supplier => {
    const option = document.createElement('option');
    option.value = supplier.name;
    option.textContent = supplier.name;
    supplierSelect.appendChild(option);
  });
  
  // Restore previous selection if it still exists
  if (currentValue) {
    supplierSelect.value = currentValue;
  }
}

// ==================== CUSTOMERS MANAGEMENT ====================
let allCustomers = [];
const CUSTOMERS_API = "http://localhost:3001/api/customers";

// Load customers
async function loadCustomers() {
  try {
    const response = await fetch(CUSTOMERS_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    allCustomers = await response.json();
    displayCustomers(allCustomers);
    console.log('👥 تم تحميل قائمة الزبائن');
  } catch (error) {
    console.log('فشل في تحميل الزبائن:', error);
    const tbody = document.getElementById("customersTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <h3>🔌 لا يمكن تحميل الزبائن</h3>
              <p>جاري محاولة إعادة الاتصال...</p>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

// Display customers
function displayCustomers(customers) {
  const tbody = document.getElementById("customersTableBody");
  const countElement = document.getElementById("customerCount");
  
  if (!tbody) return;
  
  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <h3>👥 لا يوجد زبائن</h3>
            <p>أضف زبونك الأول باستخدام النموذج أعلاه</p>
          </div>
        </td>
      </tr>
    `;
    if (countElement) countElement.textContent = '0 زبون';
    return;
  }

  tbody.innerHTML = customers.map(customer => `
    <tr>
      <td><strong>${customer.name}</strong></td>
      <td>${customer.phone || '-'}</td>
      <td>${customer.email || '-'}</td>
      <td>${customer.address || '-'}</td>
      <td>${customer.invoice_count || 0}</td>
      <td>${customer.total_purchases ? parseFloat(customer.total_purchases).toLocaleString('ar-EG', {minimumFractionDigits: 2}) + ' ل.س' : '0 ل.س'}</td>
      <td>
        <button class="btn-small btn-secondary" onclick="editCustomer(${customer.id})">✏️ تعديل</button>
        <button class="btn-small btn-danger" onclick="deleteCustomer(${customer.id})">🗑️ حذف</button>
      </td>
    </tr>
  `).join('');

  if (countElement) countElement.textContent = `${customers.length} زبون`;
}

// Save customer
async function saveCustomer() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const email = document.getElementById('customerEmail').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  if (!name) {
    alert('❌ يجب إدخال اسم الزبون');
    return;
  }

  // Save to database
  try {
    const response = await fetch(CUSTOMERS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        phone: phone,
        email: email,
        address: address
      })
    });
    
    if (!response.ok) {
      throw new Error('فشل في حفظ الزبون');
    }
    
    // Reload customers list
    await loadCustomers();
    clearCustomerInputs();
    
    alert('✅ تم إضافة الزبون بنجاح');
  } catch (error) {
    console.error('Error saving customer:', error);
    alert('❌ فشل في حفظ الزبون: ' + error.message);
  }
}

// Clear customer form
function clearCustomerInputs() {
  document.getElementById('customerName').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('customerEmail').value = '';
  document.getElementById('customerAddress').value = '';
}

// Edit customer (placeholder)
function editCustomer(id) {
  alert('🔧 وظيفة التعديل قيد التطوير');
}

// Delete customer
async function deleteCustomer(id) {
  if (confirm('هل تريد حذف هذا الزبون؟')) {
    try {
      const response = await fetch(`${CUSTOMERS_API}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('فشل في حذف الزبون');
      }
      
      // Reload customers list
      await loadCustomers();
      alert('✅ تم حذف الزبون');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('❌ فشل في حذف الزبون: ' + error.message);
    }
  }
}

// Delete supplier
async function deleteSupplier(id) {
  if (confirm('هل تريد حذف هذه الشركة؟')) {
    try {
      const response = await fetch(`${SUPPLIERS_API}/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('فشل في حذف الشركة');
      }
      
      // Reload suppliers list
      await loadSuppliers();
      alert('✅ تم حذف الشركة');
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('❌ فشل في حذف الشركة: ' + error.message);
    }
  }
}
