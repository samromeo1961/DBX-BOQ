# Complete Integration Steps - DO THIS NOW

## Prerequisites
- ⚠️ **STOP THE APPLICATION COMPLETELY** (both Electron app and dev server)
- Close all VSCode/editor tabs for the files we'll modify

---

## Part 1: Backend Integration (5 minutes)

### Step 1.1: Update main.js

**File:** `C:/Dev/dbx-BOQ/main.js`

**Location:** After line 12 (after catalogueHandlers import)

**Add these two lines:**
```javascript
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
const catalogueTemplatesHandlers = require('./src/ipc-handlers/catalogue-templates');
```

So it looks like:
```javascript
const catalogueHandlers = require('./src/ipc-handlers/catalogue');
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
const catalogueTemplatesHandlers = require('./src/ipc-handlers/catalogue-templates');
const purchaseOrdersHandlers = require('./src/ipc-handlers/purchase-orders');
```

**Location:** After line 320 (after the catalogue IPC handlers)

**Add this block:**
```javascript
// ============================================================
// Supplier Prices IPC Handlers
// ============================================================
ipcMain.handle('supplier-prices:get', (event, itemCode) =>
  supplierPricesHandlers.getSupplierPrices(itemCode));
ipcMain.handle('supplier-prices:add', (event, priceData) =>
  supplierPricesHandlers.addSupplierPrice(priceData));
ipcMain.handle('supplier-prices:update', (event, priceData) =>
  supplierPricesHandlers.updateSupplierPrice(priceData));
ipcMain.handle('supplier-prices:delete', (event, itemCode, supplier, reference) =>
  supplierPricesHandlers.deleteSupplierPrice(itemCode, supplier, reference));
ipcMain.handle('supplier-prices:get-suppliers', () =>
  supplierPricesHandlers.getSuppliers());

// ============================================================
// Catalogue Templates & Specifications IPC Handlers
// ============================================================
ipcMain.handle('catalogue-templates:get-template', (event, priceCode) =>
  catalogueTemplatesHandlers.getTemplate(priceCode));
ipcMain.handle('catalogue-templates:update-template', (event, data) =>
  catalogueTemplatesHandlers.updateTemplate(data));
ipcMain.handle('catalogue-templates:get-specification', (event, priceCode) =>
  catalogueTemplatesHandlers.getSpecification(priceCode));
ipcMain.handle('catalogue-templates:update-specification', (event, data) =>
  catalogueTemplatesHandlers.updateSpecification(data));
```

### Step 1.2: Update preload.js

**File:** `C:/Dev/dbx-BOQ/preload.js`

**Location:** Find the catalogue section (around line 100), after `deleteRecipeComponent`

**Add this block:**
```javascript
    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => ipcRenderer.invoke('supplier-prices:get', itemCode),
      add: (priceData) => ipcRenderer.invoke('supplier-prices:add', priceData),
      update: (priceData) => ipcRenderer.invoke('supplier-prices:update', priceData),
      delete: (itemCode, supplier, reference) =>
        ipcRenderer.invoke('supplier-prices:delete', itemCode, supplier, reference),
      getSuppliers: () => ipcRenderer.invoke('supplier-prices:get-suppliers')
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) =>
        ipcRenderer.invoke('catalogue-templates:get-template', priceCode),
      updateTemplate: (data) =>
        ipcRenderer.invoke('catalogue-templates:update-template', data),
      getSpecification: (priceCode) =>
        ipcRenderer.invoke('catalogue-templates:get-specification', priceCode),
      updateSpecification: (data) =>
        ipcRenderer.invoke('catalogue-templates:update-specification', data)
    },
```

**⚠️ Important:** Make sure to add a **comma** after the closing brace of the previous section!

### Step 1.3: Update useElectronAPI.js

**File:** `C:/Dev/dbx-BOQ/frontend/src/composables/useElectronAPI.js`

**Location:** Find the catalogue section (around line 106), after `deleteRecipeComponent`

**Add this block:**
```javascript
    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => window.electronAPI?.supplierPrices.get(itemCode),
      add: (priceData) => window.electronAPI?.supplierPrices.add(priceData),
      update: (priceData) => window.electronAPI?.supplierPrices.update(priceData),
      delete: (itemCode, supplier, reference) =>
        window.electronAPI?.supplierPrices.delete(itemCode, supplier, reference),
      getSuppliers: () => window.electronAPI?.supplierPrices.getSuppliers()
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) =>
        window.electronAPI?.catalogueTemplates.getTemplate(priceCode),
      updateTemplate: (data) =>
        window.electronAPI?.catalogueTemplates.updateTemplate(data),
      getSpecification: (priceCode) =>
        window.electronAPI?.catalogueTemplates.getSpecification(priceCode),
      updateSpecification: (data) =>
        window.electronAPI?.catalogueTemplates.updateSpecification(data)
    },
```

**⚠️ Important:** Make sure to add a **comma** after the closing brace!

---

## Part 2: Frontend Integration (5 minutes)

### Step 2.1: Replace CatalogueTab.vue

**Run this in PowerShell:**
```powershell
cd C:\Dev\dbx-BOQ

# Backup original
Copy-Item "frontend\src\components\Catalogue\CatalogueTab.vue" "frontend\src\components\Catalogue\CatalogueTab.vue.backup"

# Replace with integrated version
Copy-Item "frontend\src\components\Catalogue\CatalogueTab-INTEGRATED.vue" "frontend\src\components\Catalogue\CatalogueTab.vue"
```

### Step 2.2: Update CatalogueGrid.vue

**File:** `C:/Dev/dbx-BOQ/frontend/src/components/Catalogue/CatalogueGrid.vue`

**Change 1 - Add to emits (line 49):**

Find:
```javascript
emits: ['cellValueChanged', 'deleteItems', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems'],
```

Replace with:
```javascript
emits: ['cellValueChanged', 'deleteItems', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems', 'rowClicked'],
```

**Change 2 - Add event listener (in template, around line 12):**

Find:
```vue
      @grid-ready="onGridReady"
      @selection-changed="onSelectionChanged"
      @cell-value-changed="$emit('cellValueChanged', $event)"
```

Add this line after:
```vue
      @row-clicked="$emit('rowClicked', $event)"
```

So it becomes:
```vue
      @grid-ready="onGridReady"
      @selection-changed="onSelectionChanged"
      @cell-value-changed="$emit('cellValueChanged', $event)"
      @row-clicked="$emit('rowClicked', $event)"
```

---

## Part 3: Database Schema (OPTIONAL but recommended)

### Check if Template/Specification columns exist

**Run this SQL query:**
```sql
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PriceList'
  AND COLUMN_NAME IN ('Template', 'Specification')
```

### If columns don't exist, add them:

**Use the provided SQL script:**
```powershell
# Edit database-migration-template-spec.sql
# Change "YourDatabaseName" to your actual database name
# Then run it in SQL Server Management Studio
```

---

## Part 4: Start and Test

### Start the application:
```bash
npm start
```

### Test checklist:

1. **Navigate to Catalogue Management**
2. **Click on any catalogue item row**
3. **✅ Bottom panel should appear** with three tabs:
   - Supplier Prices
   - Template
   - Specification

4. **Test Supplier Prices tab:**
   - Click "Add Supplier Price"
   - Select a supplier
   - Enter price and details
   - Save
   - Verify it appears in grid

5. **Test Template tab:**
   - Enter some template text
   - Click "Insert [HIDE]"
   - Add text after [HIDE]
   - Toggle preview
   - Save

6. **Test Specification tab:**
   - Enter specification text
   - Insert variables like [Project Name]
   - Verify variables are detected
   - Save

---

## Troubleshooting

### Panel doesn't appear:

1. **Check browser console (F12)** for errors
2. **Verify imports** in CatalogueTab.vue:
   ```javascript
   import SupplierPricesPanel from './SupplierPricesPanel.vue';
   import TemplateEditor from './TemplateEditor.vue';
   import SpecificationEditor from './SpecificationEditor.vue';
   ```

3. **Check if selectedItemCode is being set:**
   - Open DevTools Console
   - Click a row
   - Type: `$vm0.selectedItemCode`
   - Should show the item code

### "Cannot find module" errors:

**Verify these files exist:**
- `src/ipc-handlers/supplier-prices.js` ✅
- `src/ipc-handlers/catalogue-templates.js` ✅
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue` ✅
- `frontend/src/components/Catalogue/TemplateEditor.vue` ✅
- `frontend/src/components/Catalogue/SpecificationEditor.vue` ✅

### API errors in console:

**Check that backend integration was completed:**
- main.js has the imports and IPC handlers
- preload.js has the API exposure
- useElectronAPI.js has the API methods

---

## Quick Verification Commands

**Check if backend files exist:**
```powershell
Test-Path "C:\Dev\dbx-BOQ\src\ipc-handlers\supplier-prices.js"
Test-Path "C:\Dev\dbx-BOQ\src\ipc-handlers\catalogue-templates.js"
```

**Check if frontend files exist:**
```powershell
Test-Path "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\SupplierPricesPanel.vue"
Test-Path "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\TemplateEditor.vue"
Test-Path "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\SpecificationEditor.vue"
```

**All should return:** `True`

---

## Summary

✅ **Backend files created** (supplier-prices.js, catalogue-templates.js)
✅ **Frontend components created** (3 Vue components)
✅ **Integrated CatalogueTab created** (CatalogueTab-INTEGRATED.vue)
✅ **Integration guides created** (this file and others)

🔄 **Need to complete:**
1. Edit 3 backend files (main.js, preload.js, useElectronAPI.js)
2. Replace CatalogueTab.vue
3. Update CatalogueGrid.vue (2 small changes)
4. Start and test

**Estimated time:** 10-15 minutes

---

**Ready? Let's do this!** 🚀

Start with Part 1, then Part 2, then Part 4 (skip Part 3 for now if you're unsure about the database).
