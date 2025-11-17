# Apply Supplier Pricing Integration

## IMPORTANT: Stop the Application First!

Before applying these changes, you MUST stop the running Electron application. The file watchers prevent modifications while the app is running.

## Integration Steps

Follow these steps in order:

### Step 1: Update main.js

**File:** `C:/Dev/dbx-BOQ/main.js`

**1.1 Add the import** (after line 12, after other handler imports):
```javascript
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
```

**1.2 Add IPC handlers** (after line 320, after catalogue handlers):
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

---

### Step 2: Update preload.js

**File:** `C:/Dev/dbx-BOQ/preload.js`

**Add to the API object** (around line 101, after catalogue section, before purchaseOrders):
```javascript
    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => ipcRenderer.invoke('supplier-prices:get', itemCode),
      add: (priceData) => ipcRenderer.invoke('supplier-prices:add', priceData),
      update: (priceData) => ipcRenderer.invoke('supplier-prices:update', priceData),
      delete: (itemCode, supplier, reference) => ipcRenderer.invoke('supplier-prices:delete', itemCode, supplier, reference),
      getSuppliers: () => ipcRenderer.invoke('supplier-prices:get-suppliers')
    },
```

---

### Step 3: Update useElectronAPI.js

**File:** `C:/Dev/dbx-BOQ/frontend/src/composables/useElectronAPI.js`

**Add to the return object** (after line 106, after catalogue section, before purchaseOrders):
```javascript
    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => window.electronAPI?.supplierPrices.get(itemCode),
      add: (priceData) => window.electronAPI?.supplierPrices.add(priceData),
      update: (priceData) => window.electronAPI?.supplierPrices.update(priceData),
      delete: (itemCode, supplier, reference) => window.electronAPI?.supplierPrices.delete(itemCode, supplier, reference),
      getSuppliers: () => window.electronAPI?.supplierPrices.getSuppliers()
    },
```

---

### Step 4: Integrate into Catalogue UI

You need to find your Catalogue management component. It's likely one of these:
- `frontend/src/components/Catalogue/CatalogueTab.vue`
- `frontend/src/components/Catalogue/CatalogueManagement.vue`
- `frontend/src/views/Catalogue.vue`

Once you locate it:

**4.1 Import the component:**
```javascript
import SupplierPricesPanel from './SupplierPricesPanel.vue';
```

**4.2 Register the component:**
```javascript
components: {
  SupplierPricesPanel
  // ... other components
}
```

**4.3 Add to template:**

Option A - As a panel below the main grid:
```vue
<SupplierPricesPanel
  :itemCode="selectedItemCode"
  @updated="refreshCatalogue"
/>
```

Option B - As a tab in a tab interface:
```vue
<v-tab-item>
  <SupplierPricesPanel
    :itemCode="selectedItemCode"
    @updated="refreshCatalogue"
  />
</v-tab-item>
```

**Note:** You'll need to pass the currently selected catalogue item's code to the `:itemCode` prop.

---

## Verification Checklist

After applying all changes and restarting the application:

1. **Backend Check:**
   - [ ] No console errors on startup
   - [ ] IPC handlers registered successfully

2. **UI Integration Check:**
   - [ ] Supplier Prices panel appears in Catalogue UI
   - [ ] Panel shows "Select a catalogue item" message when nothing selected

3. **Functional Tests:**
   - [ ] Select a catalogue item → Supplier prices grid loads
   - [ ] Click "Add Supplier Price" → Dialog opens
   - [ ] Select supplier from dropdown → Dropdown populated
   - [ ] Add a new supplier price → Saves and appears in grid
   - [ ] Edit existing price → Updates correctly
   - [ ] Delete price → Removes from grid after confirmation
   - [ ] Date formatting displays correctly
   - [ ] Price formatting displays with $ symbol

---

## Files Already Created ✅

The following files are already in place and ready:

1. ✅ `src/ipc-handlers/supplier-prices.js` - Backend API (280 lines)
2. ✅ `frontend/src/components/Catalogue/SupplierPricesPanel.vue` - UI Component (465 lines)
3. ✅ `SUPPLIER_PRICING_IMPLEMENTATION_COMPLETE.md` - Full documentation

---

## Troubleshooting

### If supplier prices don't load:
1. Check browser console for errors
2. Verify IPC handlers are registered in main.js (check console on startup)
3. Test database connection
4. Verify SuppliersPrices table exists

### If suppliers dropdown is empty:
1. Check Supplier table has data with Archived = 0
2. Check browser console for API errors
3. Test: Open DevTools → Console → Run: `window.electronAPI.supplierPrices.getSuppliers()`

### If edits don't save:
1. Check that originalSupplier and originalReference are passed correctly
2. Verify database write permissions
3. Check backend console for SQL errors

---

## Need Help Finding the Catalogue UI Component?

Run this command to locate it:
```powershell
Get-ChildItem -Path "C:\Dev\dbx-BOQ\frontend\src" -Recurse -Include "*.vue" | Select-String "catalogue" -List | Select-Object Path
```

Look for files with names like:
- CatalogueTab.vue
- CatalogueManagement.vue
- CataloguePanel.vue
- Catalogue.vue (in views folder)

---

**Ready to integrate?** Stop the application and follow Steps 1-4 above!
