const API = "http://localhost:3001/api/products";
let allProducts = [];
let cart = [];
let isBackendAvailable = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// Backend Health Check
async function checkBackendHealth() {
  try {
    const response = await fetch(API, { 
      method: 'HEAD',
      timeout: 5000
    });
    isBackendAvailable = response.ok;
    return isBackendAvailable;
  } catch (error) {
    isBackendAvailable = false;
    return false;
  }
}

// Retry Logic for Network Requests
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { ...options, timeout: 10000 });
      if (response.ok) return response;
      
      if (response.status >= 500 && i < retries - 1) {
        showNotification(`⚠️ خطأ في الخادم، إعادة المحاولة (${i + 1}/${retries})...`, 'warning', 2000);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      
      showNotification(`⚠️ مشكلة في الاتصال، إعادة المحاولة (${i + 1}/${retries})...`, 'warning', 2000);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

// Input Validation and Sanitization
function validateQuantity(value, maxStock = 0) {
  const num = parseInt(value);
  
  if (isNaN(num) || num <= 0) {
    return { valid: false, message: '❌ يجب إدخال رقم صحيح موجب' };
  }
  
  if (num > 9999) {
    return { valid: false, message: '❌ الكمية كبيرة جداً (الحد الأقصى: 9999)' };
  }
  
  if (maxStock > 0 && num > maxStock) {
    return { valid: false, message: `❌ الكمية المتوفرة: ${maxStock}` };
  }
  
  return { valid: true, value: num };
}

function sanitizeInput(input) {
  return input.toString().trim().replace(/[<>"'&]/g, '');
}

// Currency Symbol Management
function updateCurrencySymbols() {
  const symbols = document.querySelectorAll('.currency-symbol');
  const currency = window.currentCurrency || { symbol: '₪' }; // Fallback
  
  symbols.forEach(el => {
    el.textContent = currency.symbol;
  });
}

// Periodic currency update
setInterval(updateCurrencySymbols, 30000); // Update every 30 seconds

// Notification System
function showNotification(message, type = 'info', duration = 3000) {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  notification.style.cssText = `
    background: ${colors[type]};
    color: white;
    padding: 12px 16px;
    border-radius: 6px;
    margin-bottom: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 300px;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
  `;
  
  notification.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

// Loading States
function showLoading(text = 'جاري التحميل...') {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');
  loadingText.textContent = text;
  overlay.style.display = 'flex';
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'none';
}

// Network Error Handler
function handleNetworkError(error, context = '') {
  console.error(`Network error ${context}:`, error);
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    showNotification('❌ لا يمكن الاتصال بالخادم. تحقق من اتصال الشبكة.', 'error', 5000);
  } else if (error.status >= 500) {
    showNotification('❌ خطأ في الخادم. يرجى المحاولة مرة أخرى.', 'error', 5000);
  } else if (error.status === 404) {
    showNotification('❌ المورد المطلوب غير موجود.', 'error', 4000);
  } else {
    showNotification(`❌ ${context}: ${error.message || 'حدث خطأ غير معروف'}`, 'error', 4000);
  }
}

// تحميل المنتجات عند بدء الصفحة
async function loadProducts() {
  if (!await checkBackendHealth()) {
    showNotification('❌ الخادم غير متاح. يعمل النظام في وضع عدم الاتصال.', 'error', 5000);
    displayProducts([]);
    return;
  }
  
  showLoading('جاري تحميل المنتجات...');
  try {
    const res = await fetchWithRetry(API);
    const data = await res.json();
    allProducts = data;
    displayProducts(data);
    showNotification('✅ تم تحميل المنتجات بنجاح', 'success');
  } catch (error) {
    handleNetworkError(error, 'خطأ في تحميل المنتجات');
    displayProducts([]);
  } finally {
    hideLoading();
  }
}

// عرض المنتجات
function displayProducts(products) {
  const grid = document.getElementById("productGrid");
  
  if (products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">
        <h4>لا توجد منتجات</h4>
        <p>أضف منتجات من صفحة إدارة المنتجات</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = products.map(product => `
    <div class="product-card" id="product-${product.id}">
      <div class="product-name">${product.name || 'غير محدد'}</div>
      <div class="product-price">${formatPrice(product.sale_price || 0)}</div>
      <div class="product-stock">المتوفر: ${product.quantity || 0}</div>
      <div class="quantity-selector">
        <button class="quantity-btn" onclick="changeQuantity(${product.id}, -1)">-</button>
        <input type="number" class="quantity-input" id="qty-${product.id}" value="1" min="1" max="${product.quantity || 0}">
        <button class="quantity-btn" onclick="changeQuantity(${product.id}, 1)">+</button>
      </div>
      <button class="add-to-cart-btn" onclick="addToCart(${product.id})">➕ إضافة للسلة</button>
    </div>
  `).join('');
}

// تغيير الكمية
function changeQuantity(productId, change) {
  const input = document.getElementById(`qty-${productId}`);
  const product = allProducts.find(p => p.id == productId);
  const currentQty = parseInt(input.value) || 1;
  const newQty = currentQty + change;
  const maxQty = product.quantity || 0;
  
  const validation = validateQuantity(newQty, maxQty);
  if (!validation.valid) {
    showNotification(validation.message, 'error', 2000);
    return;
  }
  
  input.value = validation.value;
}

// إضافة للسلة
function addToCart(productId) {
  if (!isBackendAvailable) {
    showNotification('❌ النظام يعمل في وضع عدم الاتصال', 'error');
    return;
  }
  
  const product = allProducts.find(p => p.id == productId);
  const quantityInput = document.getElementById(`qty-${productId}`);
  const quantityValue = sanitizeInput(quantityInput.value);
  
  const validation = validateQuantity(quantityValue, product.quantity || 0);
  if (!validation.valid) {
    showNotification(validation.message, 'error');
    return;
  }
  
  const quantity = validation.value;
  
  if (!product) {
    showNotification('❌ المنتج غير موجود', 'error');
    return;
  }
  
  // التحقق إذا المنتج موجود في السلة
  const existingItem = cart.find(item => item.product_id === productId);
  
  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    const totalValidation = validateQuantity(newQuantity, product.quantity || 0);
    if (!totalValidation.valid) {
      showNotification('❌ الكمية الإجمالية تتجاوز المتوفر في المخزون', 'error');
      return;
    }
    existingItem.quantity = newQuantity;
  } else {
    cart.push({
      product_id: productId,
      product_name: product.name,
      quantity: quantity,
      price: parseFloat(product.sale_price) || 0
    });
  }
  
  // تحديث الواجهة
  displayCart();
  
  // إعادة تعيين الكمية
  quantityInput.value = 1;
  
  // تأثير بصري
  const card = document.getElementById(`product-${productId}`);
  card.classList.add('selected');
  setTimeout(() => card.classList.remove('selected'), 300);
}

// عرض السلة
function displayCart() {
  const cartContent = document.getElementById("cartContent");
  const cartTotal = document.getElementById("cartTotal");
  const cartActions = document.getElementById("cartActions");
  
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
  
  let total = 0;
  const rows = cart.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;
    
    return `
      <tr>
        <td>${item.product_name}</td>
        <td>
          <input type="number" value="${item.quantity}" min="1" max="${item.quantity}" 
                 onchange="updateCartItem(${index}, this.value)" 
                 style="width: 60px; text-align: center; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
        </td>
        <td>${formatPrice(item.price)}</td>
        <td>${formatPrice(itemTotal)}</td>
        <td>
          <button onclick="removeFromCart(${index})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
  
  cartContent.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr>
          <th>المنتج</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>الإجمالي</th>
          <th>إجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  
  document.getElementById("totalAmount").textContent = formatPrice(total);
  cartTotal.style.display = "block";
  cartActions.style.display = "flex";
}

// تحديث كمية منتج في السلة
function updateCartItem(index, newQuantity) {
  const sanitizedQuantity = sanitizeInput(newQuantity);
  const validation = validateQuantity(sanitizedQuantity);
  
  if (!validation.valid) {
    showNotification(validation.message, 'error', 2000);
    displayCart();
    return;
  }
  
  const quantity = validation.value;
  const item = cart[index];
  
  const stockValidation = validateQuantity(quantity, item.available || 0);
  if (!stockValidation.valid) {
    showNotification(stockValidation.message, 'error');
    displayCart();
    return;
  }
  
  item.quantity = quantity;
  displayCart();
}

// حذف منتج من السلة
function removeFromCart(index) {
  const item = cart[index];
  cart.splice(index, 1);
  displayCart();
}

// تفريغ السلة
function clearCart() {
  if (cart.length === 0) {
    showNotification('السلة فارغة بالفعل', 'info');
    return;
  }
  
  if (confirm("هل تريد تفريغ السلة بالكامل؟")) {
    cart = [];
    displayCart();
    showNotification('✅ تم تفريغ السلة', 'success');
  }
}

// إتمام البيع
async function checkout() {
  if (!isBackendAvailable) {
    showNotification('❌ النظام يعمل في وضع عدم الاتصال', 'error');
    return;
  }
  
  if (cart.length === 0) {
    showNotification('❌ السلة فارغة', 'error');
    return;
  }
  
  // التحقق من المخزون مرة أخرى
  for (const item of cart) {
    const product = allProducts.find(p => p.id == item.product_id);
    if (item.quantity > (product.quantity || 0)) {
      showNotification(`❌ الكمية المطلوبة من ${sanitizeInput(item.product_name)} غير متوفرة في المخزون`, 'error');
      return;
    }
  }
  
  showLoading('جاري إتمام عملية البيع...');
  
  try {
    const response = await fetch('http://localhost:3001/api/sell-multiple', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      })
    });
    
    const data = await res.json();
    if (data.success) {
      // Warenkorb leeren
      cart = [];
      displayCart();
      await loadProducts();
      
      // Weiterleitung zur Rechnungsseite
      if (data.invoice_id) {
        window.location.href = `invoice-details.html?id=${data.invoice_id}`;
      } else {
        showNotification('✅ تم إتمام عملية البيع بنجاح', 'success');
      }
    } else {
      showNotification("❌ حدث خطأ: " + sanitizeInput(data.message), 'error');
    }
  } catch (error) {
    handleNetworkError(error, 'خطأ في إتمام البيع');
    isBackendAvailable = false;
  } finally {
    hideLoading();
  }
}

// تعليق البيع (حفظ السلة مؤقتاً)
function holdSale() {
  if (cart.length === 0) {
    showNotification('❌ السلة فارغة', 'error');
    return;
  }
  
  // حفظ السلة في localStorage
  localStorage.setItem('heldSale', JSON.stringify({
    cart: cart,
    date: new Date().toISOString()
  }));
  
  cart = [];
  displayCart();
  showNotification('✅ تم تعليق البيع بنجاح', 'success');
}

// استعادة البيع المعلق
function restoreHeldSale() {
  const heldSale = localStorage.getItem('heldSale');
  if (heldSale) {
    const data = JSON.parse(heldSale);
    cart = data.cart;
    displayCart();
    localStorage.removeItem('heldSale');
    showNotification('✅ تم استعادة البيع المعلق', 'success');
  }
}

// البحث عن المنتجات
function searchProducts() {
  const keyword = sanitizeInput(document.getElementById("searchBox").value.toLowerCase());
  
  if (!keyword) {
    displayProducts(allProducts);
    return;
  }
  
  const filtered = allProducts.filter(p =>
    (sanitizeInput(p.name || '').toLowerCase().includes(keyword) ||
     sanitizeInput(p.category || '').toLowerCase().includes(keyword))
  );
  
  displayProducts(filtered);
}

// اختصارات لوحة المفاتيح
document.addEventListener('keydown', function(e) {
  // F1 - إدارة المنتجات
  if (e.key === 'F1') {
    e.preventDefault();
    window.location.href = 'index.html';
  }
  // F2 - نقطة البيع
  if (e.key === 'F2') {
    e.preventDefault();
    window.location.href = 'pos.html';
  }
  // F3 - الفواتير
  if (e.key === 'F3') {
    e.preventDefault();
    window.location.href = 'invoices.html';
  }
  // F4 - تفريغ السلة
  if (e.key === 'F4') {
    e.preventDefault();
    clearCart();
  }
  // F5 - إتمام البيع
  if (e.key === 'F5') {
    e.preventDefault();
    checkout();
  }
  // Ctrl+H - تعليق البيع
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    holdSale();
  }
  // Ctrl+R - استعادة البيع
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    restoreHeldSale();
  }
});

// التحقق من وجود بيع معلق عند تحميل الصفحة
window.addEventListener('load', function() {
  const heldSale = localStorage.getItem('heldSale');
  if (heldSale) {
    if (confirm("📋 يوجد بيع معلق، هل تريد استعادته؟")) {
      restoreHeldSale();
    }
  }
});

// بدء التطبيق
async function initializeApp() {
  await checkBackendHealth();
  updateCurrencySymbols();
  loadProducts();
}

initializeApp();

// مستمع حدث تغيير العملة
window.addEventListener('currencyChanged', function(e) {
  console.log('💱 تم تغيير العملة:', e.detail.currency.name);
  // تحديث عرض المنتجات
  if (allProducts && allProducts.length > 0) {
    displayProducts(allProducts);
  }
  // تحديث السلة
  if (cart && cart.length > 0) {
    displayCart();
  }
  // تحديث جميع رموز العملة في الصفحة
  setTimeout(() => {
    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = e.detail.currency.symbol;
    });
  }, 0);
});
