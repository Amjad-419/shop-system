// ==================== CURRENCY CONFIGURATION ====================
// نظام إدارة العملات مع التحويل بناءً على سعر الصرف

const CURRENCIES = {
  SYP: {
    code: 'SYP',
    name: 'ليرة سورية',
    symbol: 'ل.س',
    locale: 'ar-SY',
    rate: 1 // العملة الأساسية
  },
  USD: {
    code: 'USD',
    name: 'دولار أمريكي',
    symbol: '$',
    locale: 'en-US',
    rate: 14000 // سعر الصرف: 1 دولار = 14000 ليرة سورية (يمكن تعديله)
  }
};

// سعر الصرف الحالي (يمكن تحديثه)
let exchangeRate = parseFloat(localStorage.getItem('exchangeRate')) || 14000;

// العملة الافتراضية
let currentCurrency = localStorage.getItem('selectedCurrency') || 'SYP';

// العملة الأساسية للتخزين في قاعدة البيانات
const BASE_CURRENCY = 'SYP';

// الحصول على العملة الحالية
function getCurrentCurrency() {
  return CURRENCIES[currentCurrency] || CURRENCIES.SYP;
}

// تحديث سعر الصرف
function setExchangeRate(rate) {
  exchangeRate = parseFloat(rate);
  CURRENCIES.USD.rate = exchangeRate;
  localStorage.setItem('exchangeRate', exchangeRate);
  
  // إرسال حدث لتحديث الأسعار
  window.dispatchEvent(new CustomEvent('exchangeRateChanged', { 
    detail: { rate: exchangeRate } 
  }));
  
  console.log(`💱 تم تحديث سعر الصرف: 1 دولار = ${exchangeRate} ل.س`);
}

// تحويل السعر من العملة الأساسية إلى العملة المختارة
function convertPrice(price, fromCurrency = BASE_CURRENCY, toCurrency = null) {
  const targetCurrency = toCurrency || currentCurrency;
  const priceNum = parseFloat(price || 0);
  
  // إذا كانت العملة المستهدفة هي نفس العملة المصدر
  if (fromCurrency === targetCurrency) {
    return priceNum;
  }
  
  // تحويل من العملة الأساسية (ليرة سورية) إلى الدولار
  if (fromCurrency === 'SYP' && targetCurrency === 'USD') {
    return priceNum / exchangeRate;
  }
  
  // تحويل من الدولار إلى الليرة السورية
  if (fromCurrency === 'USD' && targetCurrency === 'SYP') {
    return priceNum * exchangeRate;
  }
  
  return priceNum;
}

// تغيير العملة
function setCurrency(currencyCode) {
  if (CURRENCIES[currencyCode]) {
    const oldCurrency = currentCurrency;
    currentCurrency = currencyCode;
    localStorage.setItem('selectedCurrency', currencyCode);
    
    // تحديث جميع عناصر العملة في الصفحة
    updateCurrencyDisplay();
    
    // إرسال حدث لتحديث الصفحة مع تحويل الأسعار
    window.dispatchEvent(new CustomEvent('currencyChanged', { 
      detail: { 
        currency: CURRENCIES[currencyCode],
        oldCurrency: oldCurrency,
        exchangeRate: exchangeRate
      } 
    }));
    
    return true;
  }
  return false;
}

// تنسيق السعر بالعملة المختارة مع التحويل
function formatPrice(price, showSymbol = true) {
  const currency = getCurrentCurrency();
  
  // تحويل السعر من العملة الأساسية (ليرة سورية) إلى العملة المختارة
  const convertedPrice = convertPrice(price, BASE_CURRENCY, currentCurrency);
  
  const formattedNumber = convertedPrice.toFixed(2);
  
  if (showSymbol) {
    // إذا كان الرمز قبل الرقم (مثل $)
    if (currency.code === 'USD') {
      return `${currency.symbol}${formattedNumber}`;
    }
    // إذا كان الرمز بعد الرقم (ل.س)
    return `${formattedNumber} ${currency.symbol}`;
  }
  
  return formattedNumber;
}

// تحديث عرض العملة في جميع عناصر الصفحة
function updateCurrencyDisplay() {
  const currency = getCurrentCurrency();
  
  // تحديث عناصر عرض العملة
  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = currency.symbol;
  });
  
  // تحديث حقل اختيار العملة إذا كان موجوداً
  const currencySelector = document.getElementById('currencySelector');
  if (currencySelector) {
    currencySelector.value = currentCurrency;
  }
  
  // تحديث عرض العملة الحالية
  const currentCurrencyDisplay = document.getElementById('currentCurrencyDisplay');
  if (currentCurrencyDisplay) {
    currentCurrencyDisplay.textContent = currency.name;
  }
}

// إنشاء قائمة منسدلة للعملات
function createCurrencySelector() {
  const currency = getCurrentCurrency();
  let options = '';
  
  for (const [code, curr] of Object.entries(CURRENCIES)) {
    const selected = code === currentCurrency ? 'selected' : '';
    options += `<option value="${code}" ${selected}>${curr.name} (${curr.symbol})</option>`;
  }
  
  return `
    <div class="currency-selector-container">
      <label for="currencySelector">💱 العملة:</label>
      <select id="currencySelector" onchange="handleCurrencyChange(this.value)" class="currency-select">
        ${options}
      </select>
      <div class="exchange-rate-container" style="margin-top: 10px;">
        <label for="exchangeRateInput" style="font-size: 12px; color: #666;">📊 سعر الصرف (1$ = ? ل.س):</label>
        <input type="number" id="exchangeRateInput" value="${exchangeRate}" 
               onchange="setExchangeRate(this.value)" 
               style="width: 100px; padding: 5px; border: 1px solid #ddd; border-radius: 5px; margin-right: 5px;">
        <span style="font-size: 12px; color: #666;">ل.س</span>
      </div>
    </div>
  `;
}

// معالجة تغيير العملة
function handleCurrencyChange(currencyCode) {
  if (setCurrency(currencyCode)) {
    const currency = getCurrentCurrency();
    console.log(`✅ تم تغيير العملة إلى: ${currency.name}`);
    
    // إظهار إشعار
    showCurrencyNotification(currency);
  }
}

// إظهار إشعار تغيير العملة
function showCurrencyNotification(currency) {
  // التحقق من وجود دالة إشعار مخصصة
  if (typeof showNotification === 'function') {
    showNotification(`✅ تم تغيير العملة إلى ${currency.name}`, 'success');
  } else {
    // إنشاء إشعار بسيط
    const notification = document.createElement('div');
    notification.className = 'currency-notification';
    notification.innerHTML = `✅ تم تغيير العملة إلى ${currency.name}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 3 ثواني
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// تحميل العملة المحفوظة عند بدء التطبيق
function initCurrency() {
  const savedCurrency = localStorage.getItem('selectedCurrency');
  if (savedCurrency && CURRENCIES[savedCurrency]) {
    currentCurrency = savedCurrency;
  }
  
  // تحديث سعر الصرف المحفوظ
  const savedRate = localStorage.getItem('exchangeRate');
  if (savedRate) {
    exchangeRate = parseFloat(savedRate);
    CURRENCIES.USD.rate = exchangeRate;
  }
  
  updateCurrencyDisplay();
  
  // تحديث حقل سعر الصرف إذا كان موجوداً
  const exchangeRateInput = document.getElementById('exchangeRateInput');
  if (exchangeRateInput) {
    exchangeRateInput.value = exchangeRate;
  }
}

// تشغيل التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initCurrency();
  // تحديث جميع رموز العملة في الصفحة عند التحميل
  setTimeout(() => {
    const currency = getCurrentCurrency();
    document.querySelectorAll('.currency-symbol').forEach(el => {
      el.textContent = currency.symbol;
    });
  }, 0);
});

// تصدير الدوال للاستخدام في ملفات أخرى
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURRENCIES,
    getCurrentCurrency,
    setCurrency,
    setExchangeRate,
    convertPrice,
    formatPrice,
    updateCurrencyDisplay,
    createCurrencySelector,
    handleCurrencyChange,
    exchangeRate,
    BASE_CURRENCY
  };
}
