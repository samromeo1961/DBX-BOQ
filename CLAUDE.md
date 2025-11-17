# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DBx BOQ** is a standalone Electron + Vue.js desktop application for managing Bill of Quantities (BOQ) in Databuild construction estimating. The application connects to Databuild's SQL Server databases (System + Job databases) and provides interfaces for BOQ management, catalogue management, purchase orders, and job tracking.

**Tech Stack:**
- Backend: Electron (Node.js) with SQL Server (mssql)
- Frontend: Vue 3 (Composition API) + Vite
- UI: Bootstrap 5 + AG Grid Community
- Storage: electron-store for persistent settings

## Important Constraints

**CRITICAL - Database Table Modification:**
- **NEVER ALTER existing database table structures** - this would require manual changes to all user databases
- The application does NOT control the Databuild database schema
- Any new columns must be added conditionally with runtime checks (see `ensureSupplierColumn()` pattern in `src/ipc-handlers/boq.js:164-184`)
- Always check for column existence before using it in queries (see `src/ipc-handlers/boq.js:42-52` for example)

## Common Development Commands

### Development
```bash
# Start dev mode (frontend dev server + Electron with hot reload)
npm run dev

# Frontend runs on http://localhost:5173
# Changes to frontend reflect immediately (HMR)
# Backend changes (main.js, preload.js, src/) require restart

# Install dependencies (both root and frontend)
npm install
cd frontend && npm install
```

### Building
```bash
# Build frontend only
npm run build-frontend

# Build full Windows installer (.exe)
npm run build

# Create distributable package
npm run dist
```

### Testing
```bash
# Run formula parser tests
node src/utils/formulaParser.test.js

# No comprehensive test suite exists yet
```

## Architecture Overview

### Electron Multi-Process Architecture

**Main Process (`main.js`):**
- Window management (main window + settings window)
- Database connection initialization
- IPC handler registration
- Application menu setup
- Entry point: requires database config before showing main window

**Preload Script (`preload.js`):**
- Security bridge between main and renderer processes
- Exposes `window.electronAPI` to frontend via `contextBridge`
- All IPC communication goes through this layer
- NEVER allow direct `nodeIntegration` in renderer

**Renderer Process (`frontend/`):**
- Vue 3 SPA with Vue Router (hash mode)
- Four main tabs: Jobs, BOQ, Catalogue, Purchase Orders
- Uses `useElectronAPI()` composable to access backend

### Database Layer Architecture

**Two-Database Pattern:**
The application connects to TWO SQL Server databases simultaneously:

1. **System Database** (e.g., `CROWNESYS`):
   - `PriceList` - Catalogue items and recipes
   - `CostCentres` - Cost centre hierarchy
   - `Recipe` - Recipe sub-items/ingredients
   - `Prices` - Price history by date/level
   - `Supplier` - Supplier master data
   - `Contacts` - Clients and suppliers

2. **Job Database** (e.g., `CROWNEJOB`):
   - `Bill` - BOQ line items (the core table)
   - `Orders` - Purchase order headers
   - `Jobs` - Job master records

**Cross-Database Query Pattern:**
- Use `qualifyTable(tableName, dbConfig)` from `src/database/query-builder.js` to generate fully-qualified table names
- Example: `[CROWNESYS].[dbo].[PriceList]` and `[CROWNEJOB].[dbo].[Bill]`
- ALWAYS use qualified table names in JOIN queries across databases
- See `src/ipc-handlers/boq.js:66-98` for comprehensive example

**Connection Management:**
- Single connection pool to System DB with cross-database queries
- Connection established in `src/database/connection.js`
- Pool reused across all handlers
- Use `getPool()` to access existing connection

### IPC Handler Pattern

**Location:** `src/ipc-handlers/`

Each handler module exports functions that:
1. Receive `(event, params)` arguments
2. Get database pool via `getPool()`
3. Get config via `credStore.getCredentials()`
4. Use `qualifyTable()` for table names
5. Return `{ success, data/error }` objects

**Handler Registration (in `main.js`):**
```javascript
ipcMain.handle('boq:get-job-bill', boqHandlers.getJobBill);
ipcMain.handle('boq:add-item', boqHandlers.addItem);
```

**Frontend Usage (via preload.js):**
```javascript
const bill = await window.electronAPI.boq.getJobBill(jobNo, costCentre, bLoad);
```

### Frontend Architecture

**Component Structure:**
```
frontend/src/
├── components/
│   ├── BOQ/              # Bill of Quantities tab
│   ├── Catalogue/        # Catalogue management tab
│   ├── Jobs/             # Jobs management tab
│   ├── PurchaseOrders/   # Purchase Orders tab
│   └── common/           # Shared components (SearchableSelect, etc.)
├── composables/
│   └── useElectronAPI.js # Wrapper around window.electronAPI
├── router/               # Defined in main.js (Vue Router hash mode)
├── App.vue               # Root component with header, tabs, footer
└── main.js               # Vue app initialization
```

**Routing:**
- Uses Vue Router in hash mode (`createWebHashHistory`)
- Routes: `/jobs`, `/boq`, `/catalogue`, `/purchase-orders`
- Default route redirects to `/jobs`

**AG Grid Pattern:**
- Used for all data grids (BOQ, Catalogue, Jobs, PO)
- Theme: `ag-theme-quartz`
- Column definitions with editable cells
- Custom cell renderers and editors as needed

### Persistent Storage Pattern

**electron-store Pattern:**
Used for user preferences and settings that persist across sessions.

**Example:** `src/database/boq-options-store.js`
- Stores BOQ user preferences (view settings, defaults, last used values)
- Default values defined in store constructor
- Methods: `getOptions()`, `saveOptions()`, `updateOption()`, `resetOptions()`
- Accessed via IPC handlers: `boq-options:get`, `boq-options:save`, etc.

**Pattern to follow for new stores:**
1. Create new store file: `src/database/[feature]-store.js`
2. Define defaults in `new Store({ defaults: {...} })`
3. Export CRUD functions
4. Register IPC handlers in `main.js`
5. Expose in `preload.js`

**Settings Storage:**
- Main DB config: `electron-store` (default store)
- Credentials: `src/database/credentials-store.js` (encrypted)
- BOQ options: `src/database/boq-options-store.js`

## Key Implementation Patterns

### Adding New Database Columns (CRITICAL)

When adding optional columns to existing tables:

1. **Check column existence at runtime:**
```javascript
const checkColumn = await pool.request().query(`
  SELECT COLUMN_NAME
  FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'TableName'
    AND COLUMN_NAME = 'ColumnName'
    AND TABLE_SCHEMA = 'dbo'
`);
const hasColumn = checkColumn.recordset.length > 0;
```

2. **Conditionally add column if missing:**
```javascript
if (!hasColumn) {
  await pool.request().query(`
    ALTER TABLE [${dbName}].[dbo].[TableName]
    ADD [ColumnName] VARCHAR(50) NULL
  `);
}
```

3. **Build queries conditionally:**
```javascript
const selectFields = hasColumn
  ? 'b.ColumnName, other.Name'
  : 'NULL AS ColumnName, NULL AS Name';

const joins = hasColumn
  ? 'LEFT JOIN OtherTable ON ...'
  : '';
```

**See:** `src/ipc-handlers/boq.js` functions `ensureSupplierColumn()` and `getJobBill()`

### Recipe Explosion Pattern

Recipes in Databuild are hierarchical - a recipe item can explode into sub-items (ingredients).

**Key fields:**
- `PriceList.Recipe` (bit) - Is this item a recipe?
- `PriceList.RecipeIngredient` (bit) - Can this be used in recipes?
- `Recipe.MainItem` + `Recipe.SubItem` - Links main item to ingredients
- `Recipe.RecipeQty` - Quantity of sub-item per unit of main item
- `Recipe.RecipeFormula` - Optional formula for dynamic quantities

**Explosion logic:** See `src/ipc-handlers/boq.js:explodeRecipe()`
- Recursively explodes recipes into sub-items
- Calculates quantities using formulas if present
- Preserves cost centre and load associations
- Options: `removeParent`, `explodeRecipes` (recursive)

### Formula Evaluation Pattern

BOQ supports mathematical formulas in recipe quantities and calculations.

**Formula Parser:** `src/utils/enhancedFormulaParser.js`
- Supports basic math: `+`, `-`, `*`, `/`, `^` (power)
- Supports functions: `sqrt()`, `abs()`, `min()`, `max()`, etc.
- Variable substitution from context
- Uses `mathjs` library

**Usage:**
```javascript
const { enhancedFormulaParser } = require('./src/utils/enhancedFormulaParser');
const result = enhancedFormulaParser.parse('2 * qty + 10', { qty: 5 });
// result = 20
```

### Error Handling Pattern

**Backend (IPC Handlers):**
```javascript
async function handlerFunction(event, params) {
  try {
    const pool = getPool();
    if (!pool) throw new Error('Database not connected');

    // ... business logic

    return { success: true, data: result };
  } catch (error) {
    console.error('Handler error:', error);
    return { success: false, error: error.message };
  }
}
```

**Frontend:**
```javascript
try {
  const result = await api.boq.getJobBill(jobNo, cc, load);
  if (!result.success) {
    console.error('Error:', result.error);
    // Show user-friendly error
  }
  // Use result.data
} catch (error) {
  console.error('IPC error:', error);
}
```

## Database Schema Quick Reference

See `DATABUILD_DATABASE_SCHEMA.md` for comprehensive schema documentation.

**Key Tables:**

**Bill (Job DB):**
- Primary key: `JobNo`, `CostCentre`, `BLoad`, `LineNumber`
- Foreign keys: `ItemCode` → `PriceList.PriceCode`
- Fields: `Quantity`, `UnitPrice`, `XDescription` (workup notes)

**PriceList (System DB):**
- Primary key: `PriceCode`
- Fields: `Description`, `PerCode` (unit), `Recipe`, `RecipeIngredient`
- Links to `Prices` for price history

**CostCentres (System DB):**
- Hierarchical: `Tier` (1 = main sections, 2 = subsections)
- `SubGroup` - Links Tier 2 to Tier 1
- `SortOrder` - Display order

**Jobs (Job DB):**
- Primary key: `JobNo`
- Fields: `Name`, `Client`, `Estimator`, `Status`, `Archived`

## Common Tasks

### Adding a New Tab/Feature

1. Create handler in `src/ipc-handlers/[feature].js`
2. Register handlers in `main.js`: `ipcMain.handle('feature:action', handler.action)`
3. Expose in `preload.js`: Add to `contextBridge.exposeInMainWorld()`
4. Create Vue component in `frontend/src/components/[Feature]/`
5. Add route in `frontend/src/main.js`
6. Add nav link in `frontend/src/App.vue`

### Adding a New IPC Handler

1. **Backend:** Create function in appropriate `src/ipc-handlers/` file
2. **Main:** Register in `main.js`: `ipcMain.handle('namespace:action', handler)`
3. **Preload:** Expose in `preload.js` under appropriate namespace
4. **Frontend:** Call via `window.electronAPI.namespace.action()`

### Modifying Database Queries

1. Always use `qualifyTable(tableName, dbConfig)` for table names
2. Check for optional columns before using (see pattern above)
3. Use parameterized queries: `pool.request().input('param', type, value)`
4. Test with actual Databuild databases
5. Consider both System and Job database table locations

### Working with AG Grid

1. Define column definitions with `field`, `headerName`, `editable`, etc.
2. Use `cellRenderer` for custom display
3. Use `cellEditor` for custom editing
4. Handle `onCellValueChanged` for updates
5. Use grid API for operations: `gridApi.value.getSelectedRows()`
6. Apply theme: `class="ag-theme-quartz"`

## Development Environment

**Required:**
- Node.js 18+
- SQL Server with Databuild databases
- Windows 10+ (application is Windows-only)

**Database Setup:**
On first run, settings window prompts for:
- Server (hostname or `SERVER\INSTANCE`)
- System Database name (e.g., `CROWNESYS`)
- Job Database (auto-detected: replace `SYS` with `JOB`)
- SQL Server username and password

**Credentials stored:**
- `%APPDATA%\dbx-boq\config.json` (electron-store)
- `%APPDATA%\dbx-boq\credentials.json` (encrypted)

## File Structure Overview

```
dbx-BOQ/
├── main.js                 # Electron main process
├── preload.js             # IPC security bridge
├── settings.html          # Database config window
├── package.json           # Main dependencies
├── src/
│   ├── database/          # DB connection, query builder, stores
│   ├── ipc-handlers/      # Backend business logic
│   ├── services/          # Shared services (reports, templates)
│   └── utils/             # Utilities (formula parser, etc.)
├── frontend/
│   ├── src/
│   │   ├── components/    # Vue components by feature
│   │   ├── composables/   # Vue 3 composables
│   │   ├── assets/        # CSS, images, logos
│   │   ├── App.vue        # Root component
│   │   └── main.js        # Vue initialization
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite build config
├── assets/
│   └── icon.png           # Application icon
├── DATABUILD_DATABASE_SCHEMA.md  # Schema documentation
└── README.md              # Project overview
```

## Debugging

**Electron DevTools:**
- Automatically open in dev mode: `mainWindow.webContents.openDevTools()`
- View → Toggle Developer Tools in production

**Console Logging:**
- Main process: Logs to terminal running `npm run dev`
- Renderer process: Logs to Electron DevTools console
- SQL queries: Logged in main process console

**Database Connection Issues:**
- Check credentials in settings window
- Verify SQL Server allows TCP/IP connections
- For named instances: Use `SERVER\INSTANCE` format
- Check Windows Firewall settings

**Common Issues:**
- "Database not connected": Ensure connection established before querying
- Cross-database queries failing: Verify both databases exist and have correct names
- IPC not working: Check handler registration in main.js and exposure in preload.js

## Dependencies

**Main Process:**
- `electron` - Desktop app framework
- `mssql` - SQL Server connectivity
- `electron-store` - Persistent settings
- `handlebars` - Template rendering
- `jsreport-*` - PDF report generation
- `mathjs` - Formula evaluation

**Frontend:**
- `vue` - UI framework (v3, Composition API)
- `vue-router` - Client-side routing
- `ag-grid-community` - Data grids
- `bootstrap` - UI components
- `bootstrap-icons` - Icons

## References

- **Project Documentation:** See README.md for feature overview
- **Database Schema:** See DATABUILD_DATABASE_SCHEMA.md for complete schema
- **Development Plan:** See DBX-BOQ/DEVELOPMENT_PLAN.md for roadmap
- **Electron Docs:** https://www.electronjs.org/docs
- **Vue 3 Docs:** https://vuejs.org/guide
- **AG Grid Docs:** https://www.ag-grid.com/vue-data-grid
