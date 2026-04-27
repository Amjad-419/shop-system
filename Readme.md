# 🏪 Shop Management System

A comprehensive shop management system with product management, point-of-sale, and invoice generation.

## ✨ Features

### 📦 Product Management
- Add, Edit, Delete products
- Inventory management
- Price management
- Categorization

### 💰 Point-of-Sale (POS)
- Intuitive sales process
- Shopping cart functionality
- Real-time price calculation
- Quick product search

### 🧾 Invoice Management
- Automatic invoice generation
- Professional invoice layouts
- PDF export and printing
- Sequential invoice numbers (INV-00000001)

### 🎨 Modern UI/UX
- Responsive design
- Arabic language support
- Modern gradients and animations
- Real-time connection status
- Dark/Light mode ready

### 🗄️ Database
- MySQL database integration
- Optimized queries
- Transaction security
- Backup capable

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MySQL (v5.7+)
- npm

### Installation
```bash
# Clone repository
git clone https://github.com/Amjad-419/shop-system.git

# Change to project directory
cd shop-system

# Install dependencies
npm install

# Setup MySQL database
mysql -u root -p
source database-schema.sql

# Start server
node server.js
```

### Configuration
```javascript
// server.js - Database configuration
const db = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: '1234',
  database: 'shop'
});
```

## 📁 Project Structure

```
shop-system/
├── 📄 HTML Files
│   ├── index.html              # Homepage
│   ├── dashboard-standalone.html  # Main Dashboard
│   ├── pos.html               # Point-of-Sale
│   └── invoice-details.html    # Invoice Details
├── 📜 JavaScript Files
│   ├── server.js              # Backend Server
│   ├── dashboard.js           # Dashboard Logic
│   ├── pos.js                # POS Functionality
│   ├── app.js                # Product Management
│   ├── invoice-details.js     # Invoice Details
│   ├── invoices.js           # Invoice List
│   └── currency.js           # Currency Conversion
├── 🎨 Styling
│   └── style.css             # Modern CSS
├── 📊 Database
│   └── database-schema.sql    # Database Schema
└── 📦 Configuration
    ├── package.json          # Project Configuration
    └── .gitignore           # Git Ignore Rules
```

## 🔧 API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Add product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `POST /api/sell-multiple` - Sell multiple products

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoice/:id` - Get invoice details

## 💱 Currency

- **Default Currency:** Syrian Pound (SYP)
- **Formatting:** `formatPrice()` function
- **Conversion:** Automatic price calculation

## 🌐 Multi-language

- **Arabic:** Full support (RTL)
- **English:** Planned
- **German:** Planned

## 🖨️ Print Features

- **Invoices:** Professional PDF printing
- **Filename:** Automatic with invoice number
- **Layout:** A4 format, print optimized

## 📊 Statistics

- Total products
- Inventory value
- Low stock items
- Invoice count

## 🔒 Security

- Input sanitization
- SQL injection protection
- CORS configuration
- Validation

## 🐛 Known Issues

- No known issues

## 🤝 Contributing

1. Fork
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👨‍💻 Author

**Amjad-419**
- GitHub: [@Amjad-419](https://github.com/Amjad-419)
- Project: [Shop Management System](https://github.com/Amjad-419/shop-system)

## 🙏 Acknowledgments

- Node.js Community
- MySQL Team
- Open Source Contributors
