# DBx BOQ - Bill of Quantities System

**Standalone Electron + Vue.js application for Databuild construction estimating Bill of Quantities management.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-in_development-yellow)
![Platform](https://img.shields.io/badge/platform-windows-lightgrey)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **SQL Server** with Databuild database (System + Job databases)
- **Windows** 10 or later

### Installation

```bash
# 1. Navigate to project directory
cd C:\Dev\dbx-BOQ

# 2. Install main dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..
```

### Running in Development Mode

```bash
# Start the application (frontend dev server + Electron)
npm run dev
```

On first run, you'll be prompted to configure your database connection.

---

## 📁 Project Structure

```
dbx-BOQ/
├── main.js                    # Electron main process
├── preload.js                 # IPC bridge (security layer)
├── settings.html              # Database configuration window
├── package.json               # Main project config
├── src/
│   ├── database/              # Database layer
│   │   ├── connection.js      # SQL Server connection pool
│   │   ├── query-builder.js   # Cross-database query helpers
│   │   ├── credentials-store.js
│   │   └── boq-options-store.js
│   └── ipc-handlers/          # Backend business logic
│       └── boq.js             # BOQ operations
├── frontend/
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── index.html             # HTML entry point
│   └── src/
│       ├── main.js            # Vue app entry
│       ├── App.vue            # Root component
│       ├── router/            # Vue Router
│       ├── components/        # Vue components
│       │   └── BOQ/           # BOQ-specific components
│       ├── composables/       # Vue composables
│       └── assets/            # CSS, images
├── assets/
│   └── icon.png               # App icon
└── DATABUILD_DATABASE_SCHEMA.md  # Database documentation
```

---

## 🎯 Current Status - Phase 1 Complete ✅

### ✅ What's Built

**Backend Infrastructure:**
- ✅ Electron main process with window management
- ✅ Database connection layer (System + Job DB)
- ✅ Cross-database query builder
- ✅ IPC communication architecture
- ✅ BOQ IPC handlers (10 operations)
- ✅ BOQ options persistence (electron-store)
- ✅ Credentials store (secure storage)

**BOQ Operations Available:**
- ✅ `getJobBill()` - Load bill items for a job
- ✅ `addItem()` - Add items to bill
- ✅ `updateItem()` - Update quantities/prices
- ✅ `deleteItem()` - Delete bill items
- ✅ `getCostCentresWithBudgets()` - Get cost centres with budget indicators
- ✅ `repriceBill()` - Reprice based on price level/date
- ✅ `explodeRecipe()` - Explode recipes into sub-items
- ✅ `getLoads()` - Get available loads
- ✅ `createLoad()` - Create new loads
- ✅ `generateReport()` - Generate reports (placeholder)

### 🚧 What's Pending

**Frontend (Next Phase):**
- ⏳ Vue.js frontend setup
- ⏳ BOQ main component
- ⏳ BOQ toolbar (job/price/load selectors)
- ⏳ BOQ grid (AG Grid)
- ⏳ Catalogue search panel
- ⏳ Options modal
- ⏳ Reports generation

**Purchase Orders Integration:**
- ⏳ Copy PO module from Databuild-API-Vue
- ⏳ PO templates system
- ⏳ PDF generation (jsreport)
- ⏳ PO printing functionality

---

## 🔧 Technology Stack

### Backend (Electron Main Process)
- **Electron** ^32.0.0 - Desktop application framework
- **Node.js** - JavaScript runtime
- **mssql** ^11.0.0 - SQL Server connectivity
- **electron-store** ^8.2.0 - Persistent settings storage

### Frontend (Renderer Process)
- **Vue 3** ^3.4.0 - Progressive JavaScript framework (Composition API)
- **Vue Router** ^4.2.0 - Client-side routing
- **AG Grid Community** ^31.0.0 - High-performance data grid
- **Bootstrap 5** ^5.3.0 - UI framework
- **Bootstrap Icons** ^1.11.0 - Icon library
- **Vite** ^5.0.0 - Build tool and dev server

---

## 📊 Database Schema

The application connects to Databuild SQL Server databases:

### System Database (e.g., CROWNESYS)
- `PriceList` - Catalogue items and recipes
- `CostCentres` - Cost centre hierarchy
- `Prices` - Price history
- `PerCodes` - Units of measure
- `Recipe` - Recipe sub-items
- `Supplier` - Supplier master data
- `CCSuppliers` - Preferred suppliers per cost centre
- `Contacts` - Client/contact information

### Job Database (e.g., CROWNEJOB)
- `Bill` - BOQ line items
- `Orders` - Purchase order headers
- `OrderDetails` - Alternative item descriptions
- `Jobs` - Job master records

See `DATABUILD_DATABASE_SCHEMA.md` for complete schema documentation.

---

## 🛠️ Development

### Available Scripts

```bash
# Development mode (hot reload)
npm run dev

# Build frontend only
npm run build-frontend

# Build full application (Windows installer)
npm run build

# Create distributable package
npm run dist
```

### Development Workflow

1. **Frontend changes:**
   - Frontend runs on `http://localhost:5173` (Vite dev server)
   - Hot module replacement (HMR) enabled
   - Changes reflect immediately

2. **Backend changes:**
   - Restart Electron process (Ctrl+C and `npm run dev`)
   - Changes to `main.js`, `preload.js`, or `src/` require restart

---

## 📋 Next Steps

### Immediate Tasks

1. **Set up Frontend Structure** (Week 2)
   - Create Vue app entry point
   - Set up Vite configuration
   - Create main App.vue component
   - Add Vue Router

2. **Build BOQ UI** (Week 2-3)
   - BOQ main tab component
   - BOQ toolbar (job/price/load selectors)
   - BOQ grid with AG Grid
   - Catalogue search panel

3. **Incorporate Purchase Orders** (Week 4)
   - Copy PO handlers from Databuild-API-Vue
   - Integrate PO templates
   - Add PDF generation
   - Add PO printing

4. **Build Options Screen** (Week 4)
   - Options modal component
   - All configuration settings
   - Save/load functionality

---

## 🔒 Database Configuration

On first launch, configure your database connection:

- **Server:** SQL Server hostname or IP (e.g., `localhost` or `SERVER\INSTANCE`)
- **System Database:** System database name (e.g., `CROWNESYS`)
- **Job Database:** (Optional) Auto-detected by replacing SYS with JOB
- **Username:** SQL Server username
- **Password:** SQL Server password

Credentials are stored securely in:
`%APPDATA%\dbx-boq\credentials.json` (encrypted)

---

## 📝 Development Plan

Following the **17-week development plan** outlined in `DBX-BOQ/DEVELOPMENT_PLAN.md`:

- **✅ Phase 1 (Week 1):** Foundation setup - COMPLETE
- **🚧 Phase 2 (Week 2):** Basic UI components
- **⏳ Phase 3 (Week 3):** Catalogue integration
- **⏳ Phase 4 (Week 4):** Options screen
- **⏳ Phase 5 (Week 5):** Add/Edit items
- **⏳ Phase 6 (Week 6-7):** Price management
- **⏳ Phase 7 (Week 8):** Recipe explosion
- **⏳ Phase 8 (Week 9):** Load management
- **⏳ Phase 9 (Week 10):** Drag & drop
- **⏳ Phase 10 (Week 11):** Purchase orders
- **⏳ Phase 11-12 (Week 12-13):** Reports
- **⏳ Phase 13-15 (Week 14-16):** Advanced features
- **⏳ Phase 16 (Week 17):** Testing & deployment

---

## 🐛 Known Issues

- Frontend not yet implemented
- Purchase Orders module not yet integrated
- Settings window UI not created
- No error handling UI
- No logging system

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [Vue.js](https://vuejs.org/)
- Data grids by [AG Grid](https://www.ag-grid.com/)
- UI by [Bootstrap](https://getbootstrap.com/)

---

**Made for Databuild construction estimating users**

*DBx BOQ - Professional Bill of Quantities Management*
