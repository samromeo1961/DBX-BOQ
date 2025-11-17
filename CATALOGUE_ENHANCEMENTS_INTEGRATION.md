# Catalogue Enhancements - Complete Integration Guide

## Overview

This guide covers integration of THREE major catalogue enhancements:

1. **Supplier Pricing** - Manage supplier prices with multiple references per item
2. **Templates (Workup)** - Template text loaded into BOQ workup area with [HIDE] support
3. **Specifications** - Job specification details with variable support

## IMPORTANT: Prerequisites

### 1. Stop the Electron Application
The application MUST be stopped before editing files.

### 2. Database Schema Requirements

The following database columns are required:

#### For Supplier Pricing (Already Exists ✅)
Table: `SuppliersPrices`
- ItemCode (varchar)
- Supplier (varchar)
- Reference (varchar)
- Price (decimal)
- ValidFrom (datetime)
- Comments (varchar)
- PriceLevel (int)
- Area (varchar)
- LastUpdated (datetime)

#### For Templates & Specifications (May Need Adding)
Table: `PriceList`
- `Template` (nvarchar/text) - **Check if exists**
- `Specification` (nvarchar/text) - **Check if exists**

**To check if columns exist:**
```sql
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PriceList'
  AND COLUMN_NAME IN ('Template', 'Specification')
```

**If columns don't exist, add them:**
```sql
ALTER TABLE PriceList
ADD Template NVARCHAR(MAX) NULL;

ALTER TABLE PriceList
ADD Specification NVARCHAR(MAX) NULL;
```

---

## Part 1: Supplier Pricing Integration

### Files Already Created ✅
- `src/ipc-handlers/supplier-prices.js` - Backend API
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue` - UI Component

### Step 1.1: Update main.js

**File:** `C:/Dev/dbx-BOQ/main.js`

**Add import** (after line 12):
```javascript
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
```

**Add IPC handlers** (after line 320, after catalogue handlers):
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
```

### Step 1.2: Update preload.js

**File:** `C:/Dev/dbx-BOQ/preload.js`

**Add to API object** (after catalogue section, before purchaseOrders):
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
```

### Step 1.3: Update useElectronAPI.js

**File:** `C:/Dev/dbx-BOQ/frontend/src/composables/useElectronAPI.js`

**Add to return object** (after catalogue section, before purchaseOrders):
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
```

---

## Part 2: Templates & Specifications Integration

### Files Already Created ✅
- `src/ipc-handlers/catalogue-templates.js` - Backend API
- `frontend/src/components/Catalogue/TemplateEditor.vue` - Template UI
- `frontend/src/components/Catalogue/SpecificationEditor.vue` - Specification UI

### Step 2.1: Update main.js

**File:** `C:/Dev/dbx-BOQ/main.js`

**Add import** (after supplier-prices import):
```javascript
const catalogueTemplatesHandlers = require('./src/ipc-handlers/catalogue-templates');
```

**Add IPC handlers** (after supplier-prices handlers):
```javascript
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

### Step 2.2: Update preload.js

**File:** `C:/Dev/dbx-BOQ/preload.js`

**Add to API object** (after supplier-prices section):
```javascript
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

### Step 2.3: Update useElectronAPI.js

**File:** `C:/Dev/dbx-BOQ/frontend/src/composables/useElectronAPI.js`

**Add to return object** (after supplier-prices section):
```javascript
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

---

## Part 3: UI Integration into CatalogueTab.vue

**File:** `C:/Dev/dbx-BOQ/frontend/src/components/Catalogue/CatalogueTab.vue`

### Step 3.1: Add Imports

Add to the import section (around line 90):
```javascript
import SupplierPricesPanel from './SupplierPricesPanel.vue';
import TemplateEditor from './TemplateEditor.vue';
import SpecificationEditor from './SpecificationEditor.vue';
```

### Step 3.2: Register Components

Add to components object (around line 99):
```javascript
  components: {
    CatalogueToolbar,
    CatalogueGrid,
    CostCentrePanel,
    CatalogueItemModal,
    CatalogueImportModal,
    RecipeManagementModal,
    SupplierPricesPanel,      // Add this
    TemplateEditor,           // Add this
    SpecificationEditor       // Add this
  },
```

### Step 3.3: Add State Management

Add to setup() state section (around line 110):
```javascript
    const selectedItemCode = ref(null);
    const activeTab = ref('details'); // 'details', 'prices', 'template', 'specification'
```

### Step 3.4: Add Item Selection Handler

Add to methods section (around line 130):
```javascript
    function onItemSelected(itemData) {
      if (itemData && itemData.PriceCode) {
        selectedItemCode.value = itemData.PriceCode;
      } else {
        selectedItemCode.value = null;
      }
    }
```

### Step 3.5: Update CatalogueGrid Component Usage

Modify the CatalogueGrid component (around line 26) to emit selection events:
```vue
<CatalogueGrid
  ref="catalogueGridRef"
  :catalogueItems="filteredItems"
  :loading="loading"
  :perCodes="perCodes"
  :costCentres="costCentres"
  @cellValueChanged="onCellValueChanged"
  @duplicateItem="onDuplicateItem"
  @manageRecipe="onManageRecipe"
  @archiveItems="onArchiveItems"
  @unarchiveItems="onUnarchiveItems"
  @rowSelected="onItemSelected"
/>
```

### Step 3.6: Add Tabbed Interface (Option A - Recommended)

Replace the catalogue-grid-container div (lines 25-38) with:
```vue
      <!-- Catalogue Grid and Details (Center/Right) -->
      <div class="catalogue-grid-container flex-grow-1">
        <!-- Main Grid -->
        <div class="catalogue-grid-section">
          <CatalogueGrid
            ref="catalogueGridRef"
            :catalogueItems="filteredItems"
            :loading="loading"
            :perCodes="perCodes"
            :costCentres="costCentres"
            @cellValueChanged="onCellValueChanged"
            @duplicateItem="onDuplicateItem"
            @manageRecipe="onManageRecipe"
            @archiveItems="onArchiveItems"
            @unarchiveItems="onUnarchiveItems"
            @rowSelected="onItemSelected"
          />
        </div>

        <!-- Item Details Tabs -->
        <div v-if="selectedItemCode" class="item-details-section border-top">
          <!-- Tab Navigation -->
          <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: activeTab === 'prices' }"
                @click="activeTab = 'prices'"
              >
                <i class="bi bi-truck me-1"></i>
                Supplier Prices
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: activeTab === 'template' }"
                @click="activeTab = 'template'"
              >
                <i class="bi bi-file-text me-1"></i>
                Template (Workup)
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: activeTab === 'specification' }"
                @click="activeTab = 'specification'"
              >
                <i class="bi bi-file-earmark-text me-1"></i>
                Specification
              </button>
            </li>
          </ul>

          <!-- Tab Content -->
          <div class="tab-content">
            <div v-show="activeTab === 'prices'" class="tab-pane">
              <SupplierPricesPanel
                :itemCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
            <div v-show="activeTab === 'template'" class="tab-pane">
              <TemplateEditor
                :itemCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
            <div v-show="activeTab === 'specification'" class="tab-pane">
              <SpecificationEditor
                :itemCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
          </div>
        </div>
      </div>
```

### Step 3.7: Add CSS Styles

Add to the `<style scoped>` section:
```css
.catalogue-grid-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.catalogue-grid-section {
  flex: 1;
  min-height: 300px;
  overflow: hidden;
}

.item-details-section {
  height: 400px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.item-details-section .nav-tabs {
  border-bottom: 1px solid #dee2e6;
  padding: 0 1rem;
  background-color: #f8f9fa;
}

.item-details-section .nav-link {
  border: none;
  color: #6c757d;
  padding: 0.75rem 1rem;
}

.item-details-section .nav-link:hover {
  color: #0d6efd;
  border: none;
}

.item-details-section .nav-link.active {
  color: #0d6efd;
  background-color: #fff;
  border: none;
  border-bottom: 2px solid #0d6efd;
}

.item-details-section .tab-content {
  flex: 1;
  overflow: hidden;
}

.item-details-section .tab-pane {
  height: 100%;
  overflow-y: auto;
}
```

### Step 3.8: Update Return Statement

Add to the return statement (around line 376):
```javascript
    return {
      catalogueItems,
      filteredItems,
      perCodes,
      costCentres,
      loading,
      searchTerm,
      showArchived,
      showRecipesOnly,
      selectedCostCentre,
      showAddModal,
      showImportModal,
      showRecipeModal,
      editingItem,
      editingRecipePriceCode,
      catalogueGridRef,
      selectedItemCode,         // Add this
      activeTab,                // Add this
      loadCatalogue,
      onCellValueChanged,
      onDeleteItems,
      onDuplicateItem,
      onSaveItem,
      onManageRecipe,
      exportCatalogue,
      onArchiveItems,
      onUnarchiveItems,
      clearGridFilters,
      onItemSelected            // Add this
    };
```

---

## Part 4: Update CatalogueGrid.vue for Row Selection

**File:** `C:/Dev/dbx-BOQ/frontend/src/components/Catalogue/CatalogueGrid.vue`

Add row selection event to emit when a row is clicked:

```javascript
// In the setup() function, add:
const emit = defineEmits(['cellValueChanged', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems', 'rowSelected']);

function onRowClicked(event) {
  emit('rowSelected', event.data);
}

// In the grid options, add:
const gridOptions = {
  ...existing options...,
  onRowClicked: onRowClicked
};
```

---

## Testing Checklist

### Supplier Pricing Tests
1. [ ] Select a catalogue item
2. [ ] Supplier Prices tab appears
3. [ ] Grid loads supplier prices
4. [ ] Add new supplier price
5. [ ] Edit existing price
6. [ ] Delete price
7. [ ] Price and date formatting correct

### Template (Workup) Tests
1. [ ] Select a catalogue item
2. [ ] Template tab appears
3. [ ] Load existing template
4. [ ] Insert [HIDE] marker
5. [ ] Insert variable placeholder
6. [ ] Save template
7. [ ] Preview shows text before [HIDE]
8. [ ] Changes detected indicator works

### Specification Tests
1. [ ] Select a catalogue item
2. [ ] Specification tab appears
3. [ ] Load existing specification
4. [ ] Insert variable
5. [ ] Detected variables shown correctly
6. [ ] Save specification
7. [ ] Common variables reference helpful

---

## Troubleshooting

### Database Connection Issues
**Error:** "Template column not available in database schema"

**Solution:** The Template/Specification columns don't exist in PriceList table. Run the ALTER TABLE statements from the Prerequisites section.

### Supplier Prices Don't Load
**Check:**
1. SuppliersPrices table exists
2. IPC handlers registered in main.js
3. API exposed in preload.js
4. No console errors in DevTools

### Templates/Specifications Won't Save
**Check:**
1. Database columns exist (Template, Specification)
2. User has write permissions
3. PriceCode exists in PriceList table
4. Check backend console for SQL errors

### UI Tabs Don't Appear
**Check:**
1. Components imported correctly
2. Components registered in CatalogueTab
3. selectedItemCode is being set when row is selected
4. CatalogueGrid emits rowSelected event

---

## Summary of New Files

**Backend:**
- `src/ipc-handlers/supplier-prices.js` (280 lines)
- `src/ipc-handlers/catalogue-templates.js` (250 lines)

**Frontend:**
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue` (465 lines)
- `frontend/src/components/Catalogue/TemplateEditor.vue` (350 lines)
- `frontend/src/components/Catalogue/SpecificationEditor.vue` (350 lines)

**Documentation:**
- `SUPPLIER_PRICING_IMPLEMENTATION_COMPLETE.md`
- `CATALOGUE_ENHANCEMENTS_INTEGRATION.md` (this file)

**Total New Code:** ~1,700 lines across 5 components + documentation

---

## Next Steps After Integration

1. Test all CRUD operations for each feature
2. Consider adding import/export for supplier prices
3. Implement "Load Current Template" functionality in BOQ
4. Create specification report generator
5. Add variable substitution engine for specifications
6. Consider adding template/specification templates library

---

**Ready to integrate?**

1. Stop the Electron application
2. Check/add database columns (Template, Specification)
3. Follow Parts 1-4 in order
4. Run the Testing Checklist
5. Report any issues

**Integration Time Estimate:** 30-45 minutes
