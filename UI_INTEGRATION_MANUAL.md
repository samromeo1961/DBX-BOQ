# UI Integration Manual - Catalogue Enhancements

This guide provides detailed, step-by-step instructions for integrating the new catalogue components into the UI.

## Prerequisites

✅ Backend integration completed (main.js, preload.js, useElectronAPI.js)
✅ Application stopped

---

## Part 1: Update CatalogueGrid.vue for Row Selection

**File:** `frontend/src/components/Catalogue/CatalogueGrid.vue`

### Step 1.1: Find the Setup Function

Locate the `setup()` function (should be around line 100-200).

### Step 1.2: Add Row Selection Event

Find where `defineEmits` is used or add it if it doesn't exist:

**Find:**
```javascript
const emit = defineEmits(['cellValueChanged', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems']);
```

**Replace with:**
```javascript
const emit = defineEmits(['cellValueChanged', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems', 'rowSelected']);
```

### Step 1.3: Add Row Click Handler

Add this function in the methods section:

```javascript
function onRowClicked(event) {
  emit('rowSelected', event.data);
}
```

### Step 1.4: Add to Grid Options

Find the `onGridReady` function and add the row click handler to the grid configuration:

```javascript
function onGridReady(params) {
  gridApi.value = params.api;
  gridColumnApi.value = params.columnApi;

  // Add row click listener
  params.api.addEventListener('rowClicked', onRowClicked);
}
```

---

## Part 2: Update CatalogueTab.vue for Tabbed Interface

**File:** `frontend/src/components/Catalogue/CatalogueTab.vue`

### Step 2.1: Add Imports

**Location:** After line 95 (after RecipeManagementModal import)

**Add:**
```javascript
import SupplierPricesPanel from './SupplierPricesPanel.vue';
import TemplateEditor from './TemplateEditor.vue';
import SpecificationEditor from './SpecificationEditor.vue';
```

### Step 2.2: Register Components

**Location:** Line 99-106 (components object)

**Find:**
```javascript
  components: {
    CatalogueToolbar,
    CatalogueGrid,
    CostCentrePanel,
    CatalogueItemModal,
    CatalogueImportModal,
    RecipeManagementModal
  },
```

**Replace with:**
```javascript
  components: {
    CatalogueToolbar,
    CatalogueGrid,
    CostCentrePanel,
    CatalogueItemModal,
    CatalogueImportModal,
    RecipeManagementModal,
    SupplierPricesPanel,
    TemplateEditor,
    SpecificationEditor
  },
```

### Step 2.3: Add State Variables

**Location:** Line 110-124 (in setup() function, state section)

**After the existing ref declarations, add:**
```javascript
    const selectedItemCode = ref(null);
    const activeTab = ref('prices'); // Default tab
```

### Step 2.4: Add Row Selection Handler

**Location:** Around line 340 (before the watchers section)

**Add this function:**
```javascript
    function onItemSelected(itemData) {
      if (itemData && itemData.PriceCode) {
        selectedItemCode.value = itemData.PriceCode;
        // Auto-open prices tab when item selected
        activeTab.value = 'prices';
      } else {
        selectedItemCode.value = null;
      }
    }
```

### Step 2.5: Update CatalogueGrid Component

**Location:** Lines 26-37 (CatalogueGrid component usage)

**Find:**
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
/>
```

**Replace with:**
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

### Step 2.6: Replace Grid Container with Tabbed Interface

**Location:** Lines 24-39 (the entire catalogue-grid-container div)

**Find:**
```vue
      <!-- Catalogue Grid (Center/Right) -->
      <div class="catalogue-grid-container flex-grow-1">
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
```

**Replace with:**
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
                type="button"
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
                type="button"
              >
                <i class="bi bi-file-text me-1"></i>
                Template
              </button>
            </li>
            <li class="nav-item">
              <button
                class="nav-link"
                :class="{ active: activeTab === 'specification' }"
                @click="activeTab = 'specification'"
                type="button"
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

### Step 2.7: Update Return Statement

**Location:** Around line 376-401 (return statement in setup())

**Find:**
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
      loadCatalogue,
      onCellValueChanged,
      onDeleteItems,
      onDuplicateItem,
      onSaveItem,
      onManageRecipe,
      exportCatalogue,
      onArchiveItems,
      onUnarchiveItems,
      clearGridFilters
    };
```

**Replace with:**
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
      selectedItemCode,         // Add
      activeTab,                // Add
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
      onItemSelected            // Add
    };
```

### Step 2.8: Add CSS Styles

**Location:** Around line 407-420 (end of file, in `<style scoped>` section)

**Add these styles:**
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
  height: 450px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.item-details-section .nav-tabs {
  border-bottom: 1px solid #dee2e6;
  padding: 0 1rem;
  background-color: #f8f9fa;
  flex-shrink: 0;
}

.item-details-section .nav-link {
  border: none;
  color: #6c757d;
  padding: 0.75rem 1rem;
  background: none;
  cursor: pointer;
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

---

## Part 3: Verification

After making all changes:

### 3.1 Check for Syntax Errors

Look for:
- Missing commas in object/array definitions
- Unclosed brackets `{`, `[`, `(`
- Unclosed strings `'` or `"`
- Proper indentation

### 3.2 Verify Imports

Make sure all three components are imported:
```javascript
import SupplierPricesPanel from './SupplierPricesPanel.vue';
import TemplateEditor from './TemplateEditor.vue';
import SpecificationEditor from './SpecificationEditor.vue';
```

### 3.3 Verify Component Registration

Make sure all three components are in the components object:
```javascript
components: {
  // ... existing components ...
  SupplierPricesPanel,
  TemplateEditor,
  SpecificationEditor
}
```

---

## Part 4: Testing After Integration

### 4.1 Start the Application

```bash
npm start
```

### 4.2 Test Supplier Pricing

1. Navigate to Catalogue Management
2. Click on any catalogue item row
3. Bottom panel should appear with "Supplier Prices" tab active
4. Click "Add Supplier Price"
5. Fill in the form and save
6. Verify it appears in the grid

### 4.3 Test Template Editor

1. Select a catalogue item
2. Click "Template" tab
3. Enter some template text
4. Click "Insert [HIDE]" button
5. Add text after [HIDE]
6. Enable preview - verify only text before [HIDE] is shown
7. Click "Save Template"

### 4.4 Test Specification Editor

1. Select a catalogue item
2. Click "Specification" tab
3. Enter specification text with `[Project Name]` variable
4. Verify variable is detected and shown in badges
5. Click "Save Specification"

---

## Troubleshooting

### Issue: Tabs don't appear when selecting item

**Check:**
- `selectedItemCode` is being set in `onItemSelected` function
- `onItemSelected` is in the return statement
- `@rowSelected="onItemSelected"` is on CatalogueGrid component
- CatalogueGrid.vue emits 'rowSelected' event

### Issue: Components not found

**Check:**
- Import paths are correct (./SupplierPricesPanel.vue, etc.)
- Components are registered in components object
- Component files exist in the correct location

### Issue: Styling looks wrong

**Check:**
- CSS styles were added to `<style scoped>` section
- No conflicting CSS from other components
- Bootstrap icons loaded (bi bi-truck, etc.)

### Issue: "window.electronAPI is undefined"

**Check:**
- Backend integration completed (main.js, preload.js, useElectronAPI.js)
- Application restarted after backend changes
- DevTools console for specific errors

---

## Quick Checklist

- [ ] CatalogueGrid.vue updated with rowSelected event
- [ ] CatalogueTab.vue: Components imported
- [ ] CatalogueTab.vue: Components registered
- [ ] CatalogueTab.vue: State variables added (selectedItemCode, activeTab)
- [ ] CatalogueTab.vue: onItemSelected function added
- [ ] CatalogueTab.vue: Grid component has @rowSelected event
- [ ] CatalogueTab.vue: Tabbed interface added
- [ ] CatalogueTab.vue: Return statement updated
- [ ] CatalogueTab.vue: CSS styles added
- [ ] No syntax errors in any file
- [ ] Application starts without errors
- [ ] Tabs appear when clicking item
- [ ] All three components load correctly

---

**Need help?** Check the console for errors and review the CATALOGUE_ENHANCEMENTS_INTEGRATION.md guide.
