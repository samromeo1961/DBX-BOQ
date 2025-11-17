# Supplier Pricing Implementation - Integration Guide

## ✅ Completed

1. **Backend API** (`src/ipc-handlers/supplier-prices.js`) - Complete CRUD operations
2. **Vue Component** (`frontend/src/components/Catalogue/SupplierPricesPanel.vue`) - Full UI with AG Grid

## 🔧 Required Integration Steps

### Step 1: Stop the Electron Application
Stop the running application to edit files without conflicts.

### Step 2: Update `main.js`

**Location:** `C:/Dev/dbx-BOQ/main.js`

**Add import** (after line 12):
```javascript
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
```

**Add IPC handlers** (after line 320, after catalogue handlers):
```javascript
// ============================================================
// Supplier Prices IPC Handlers
// ============================================================
ipcMain.handle('supplier-prices:get', (event, itemCode) => supplierPricesHandlers.getSupplierPrices(itemCode));
ipcMain.handle('supplier-prices:add', (event, priceData) => supplierPricesHandlers.addSupplierPrice(priceData));
ipcMain.handle('supplier-prices:update', (event, priceData) => supplierPricesHandlers.updateSupplierPrice(priceData));
ipcMain.handle('supplier-prices:delete', (event, itemCode, supplier, reference) => supplierPricesHandlers.deleteSupplierPrice(itemCode, supplier, reference));
ipcMain.handle('supplier-prices:get-suppliers', () => supplierPricesHandlers.getSuppliers());
```

### Step 3: Update `preload.js`

**Location:** `C:/Dev/dbx-BOQ/preload.js`

**Add to API object** (in the contextBridge.exposeInMainWorld section):
```javascript
supplierPrices: {
  get: (itemCode) => ipcRenderer.invoke('supplier-prices:get', itemCode),
  add: (priceData) => ipcRenderer.invoke('supplier-prices:add', priceData),
  update: (priceData) => ipcRenderer.invoke('supplier-prices:update', priceData),
  delete: (itemCode, supplier, reference) => ipcRenderer.invoke('supplier-prices:delete', itemCode, supplier, reference),
  getSuppliers: () => ipcRenderer.invoke('supplier-prices:get-suppliers')
}
```

### Step 4: Update `frontend/src/composables/useElectronAPI.js`

**Add supplier prices methods** to the API object:
```javascript
supplierPrices: {
  async get(itemCode) {
    return window.api.supplierPrices.get(itemCode);
  },
  async add(priceData) {
    return window.api.supplierPrices.add(priceData);
  },
  async update(priceData) {
    return window.api.supplierPrices.update(priceData);
  },
  async delete(itemCode, supplier, reference) {
    return window.api.supplierPrices.delete(itemCode, supplier, reference);
  },
  async getSuppliers() {
    return window.api.supplierPrices.getSuppliers();
  }
}
```

### Step 5: Integrate into Catalogue Management UI

**Option A: Add to CatalogueTab.vue as a separate panel**

Import the component:
```javascript
import SupplierPricesPanel from './SupplierPricesPanel.vue';
```

Add to components:
```javascript
components: {
  SupplierPricesPanel
}
```

Add to template (below the main catalogue grid):
```vue
<SupplierPricesPanel
  :itemCode="selectedItemCode"
  @updated="refreshCatalogue"
/>
```

**Option B: Add as a tab in the catalogue management interface**

Create a new tab section with the Supplier Prices Panel.

## 📋 Features Implemented

### Backend API (`src/ipc-handlers/supplier-prices.js`)
- ✅ `getSupplierPrices(itemCode)` - Get all supplier prices for an item
- ✅ `addSupplierPrice(priceData)` - Add new supplier price
- ✅ `updateSupplierPrice(priceData)` - Update existing supplier price
- ✅ `deleteSupplierPrice(itemCode, supplier, reference)` - Delete supplier price
- ✅ `getSuppliers()` - Get list of active suppliers

### Frontend Component (`SupplierPricesPanel.vue`)
- ✅ AG Grid display with all supplier price fields
- ✅ Add new supplier price dialog
- ✅ Edit existing supplier price
- ✅ Delete supplier price with confirmation
- ✅ Supplier dropdown (auto-loaded from database)
- ✅ Date formatting for ValidFrom and LastUpdated
- ✅ Price formatting with currency
- ✅ Comments field for ambiguous references
- ✅ Price Level and Area support
- ✅ Loading states and error handling

### Database Fields Supported
- **ItemCode** - Catalogue item code
- **Supplier** - Supplier code (with name lookup)
- **Reference** - Supplier's SKU/GTIN
- **Price** - Supplier's price
- **ValidFrom** - Date from which price is valid
- **Comments** - For ambiguous references (e.g., "Brindle", "Roebuck")
- **PriceLevel** - Price level (0-5)
- **Area** - Area/region
- **LastUpdated** - Automatic timestamp

## 🎯 Legacy System Compatibility

This implementation matches the legacy Databuild system features:
- ✅ Multiple suppliers per item
- ✅ Multiple references per supplier (ambiguous references)
- ✅ Comments field for workup text matching
- ✅ Date-based pricing (ValidFrom)
- ✅ Price levels (0-5)
- ✅ Last Updated tracking
- ✅ GTIN/SKU support in Reference field

## 🧪 Testing Checklist

Once integrated, test the following:

1. **View Supplier Prices**
   - Select a catalogue item
   - Verify supplier prices grid loads
   - Check data formatting (dates, currency)

2. **Add Supplier Price**
   - Click "Add Supplier Price"
   - Select supplier from dropdown
   - Enter price and optional fields
   - Verify it appears in grid

3. **Edit Supplier Price**
   - Click Edit button on a row
   - Modify price or other fields
   - Verify changes are saved

4. **Delete Supplier Price**
   - Click Delete button
   - Confirm deletion
   - Verify row is removed

5. **Ambiguous References**
   - Add multiple prices for same item from same supplier
   - Use different Reference codes and Comments
   - Verify all show in grid

6. **Date Handling**
   - Set ValidFrom dates
   - Verify LastUpdated is automatic
   - Check date formatting in grid

## 📖 Next Steps After Integration

1. Consider adding import/export for supplier prices (CSV/Excel)
2. Add bulk update functionality
3. Implement workup text matching algorithm for ambiguous references
4. Add supplier price history view
5. Integration with purchase order generation

## 🐛 Troubleshooting

**If supplier prices don't load:**
- Check browser console for errors
- Verify IPC handlers are registered in main.js
- Check database connection
- Verify SuppliersPrices table exists and has data

**If suppliers dropdown is empty:**
- Check Supplier table has data
- Verify Archived = 0 filter
- Check browser console for API errors

**If edits don't save:**
- Check originalSupplier and originalReference are passed correctly
- Verify database write permissions
- Check for SQL errors in backend console

## 📁 Files Created/Modified

**New Files:**
- `src/ipc-handlers/supplier-prices.js` - Backend API
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue` - UI Component
- `SUPPLIER_PRICING_IMPLEMENTATION_COMPLETE.md` - This guide

**Files to Modify:**
- `main.js` - Add IPC handler registration
- `preload.js` - Add API exposure
- `frontend/src/composables/useElectronAPI.js` - Add API methods
- Catalogue UI component (CatalogueTab.vue or similar) - Add panel integration

---

**Implementation Status:** Backend Complete ✅ | Frontend Complete ✅ | Integration Pending ⏳
