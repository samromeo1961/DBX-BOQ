# BOQ Module Integration Strategy

## Executive Summary

After comprehensive review of the **Databuild-API-Vue** project, I've determined that the Bill of Quantities (BOQ) module should be **integrated into the existing project** rather than built as a standalone application. This approach provides:

✅ **Immediate access** to existing database connection layer
✅ **Reuse of 90%+ existing infrastructure**
✅ **Consistent UI/UX** with current application
✅ **Faster development** (50-60% time savings)
✅ **Unified codebase** for easier maintenance

---

## Key Findings from Existing Project

### What Already Exists

| Component | Status | Reusability |
|-----------|--------|-------------|
| **Database Connection** | ✅ Complete | 100% - Already handles System + Job DB |
| **Cross-DB Query Builder** | ✅ Complete | 100% - `qualifyTable()`, `getJobDatabase()` |
| **IPC Architecture** | ✅ Complete | 100% - preload.js + handlers pattern established |
| **Jobs Handler** | ✅ Partial | 90% - Already queries Bill, Orders, OrderDetails |
| **Purchase Orders Module** | ✅ Complete | 80% - Already handles PO rendering, printing, PDF |
| **Catalogue Management** | ✅ Complete | 70% - Can be adapted for BOQ item selection |
| **AG Grid Integration** | ✅ Complete | 100% - Pattern established in multiple tabs |
| **electron-store** | ✅ Complete | 100% - Perfect for BOQ options storage |
| **Vue 3 + Composition API** | ✅ Complete | 100% - Consistent patterns |
| **Cost Centres Handler** | ✅ Complete | 100% - Already implemented |
| **Suppliers Handler** | ✅ Complete | 90% - CCSuppliers constraint already handled |

### What Needs to Be Built

| Component | Effort | Priority |
|-----------|--------|----------|
| **BOQ Tab Component** | Medium | High |
| **BOQ IPC Handler** | Medium | High |
| **BOQ Options Screen** | Medium | High |
| **BOQ Toolbar** | Low | High |
| **Recipe Explosion** | Medium | Medium |
| **Drag & Drop Attributes** | High | Low |
| **BOQ Reports (F6/F7/F8)** | Medium | Medium |
| **Load Management** | Low | Medium |
| **Auto-repricing Logic** | Medium | Medium |

---

## Integration Architecture

### File Structure (New Files to Add)

```
Databuild-API-Vue/                    [EXISTING PROJECT ROOT]
├── src/
│   └── ipc-handlers/
│       └── boq.js                    [NEW] BOQ operations handler
├── frontend/
│   └── src/
│       ├── components/
│       │   └── BOQ/                  [NEW FOLDER]
│       │       ├── BillOfQuantitiesTab.vue     [NEW] Main BOQ component
│       │       ├── BOQToolbar.vue              [NEW] Toolbar with job/price/load selectors
│       │       ├── BOQGrid.vue                 [NEW] AG Grid for bill items
│       │       ├── BOQCatalogueSearch.vue      [NEW] Catalogue search panel
│       │       ├── BOQOptionsModal.vue         [NEW] Options configuration modal
│       │       ├── RecipeExplosionModal.vue    [NEW] Recipe explosion dialog
│       │       └── BOQReports.vue              [NEW] Reports generation
│       └── router/
│           └── index.js              [MODIFY] Add BOQ route
└── App.vue                           [MODIFY] Add BOQ tab
```

### IPC API Extensions

**Add to `preload.js`:**
```javascript
// Bill of Quantities
boq: {
  getJobBill: (jobNo, costCentre, bLoad) => ipcRenderer.invoke('boq:get-job-bill', { jobNo, costCentre, bLoad }),
  addItem: (billItem) => ipcRenderer.invoke('boq:add-item', billItem),
  updateItem: (billItem) => ipcRenderer.invoke('boq:update-item', billItem),
  deleteItem: (jobNo, costCentre, bLoad, lineNumber) => ipcRenderer.invoke('boq:delete-item', { jobNo, costCentre, bLoad, lineNumber }),
  getCostCentresWithBudgets: (jobNo) => ipcRenderer.invoke('boq:get-cost-centres-with-budgets', { jobNo }),
  repriceBill: (jobNo, priceLevel, billDate) => ipcRenderer.invoke('boq:reprice-bill', { jobNo, priceLevel, billDate }),
  explodeRecipe: (jobNo, costCentre, bLoad, priceCode, quantity) => ipcRenderer.invoke('boq:explode-recipe', { jobNo, costCentre, bLoad, priceCode, quantity }),
  getLoads: (jobNo, costCentre) => ipcRenderer.invoke('boq:get-loads', { jobNo, costCentre }),
  createLoad: (jobNo, costCentre) => ipcRenderer.invoke('boq:create-load', { jobNo, costCentre }),
  generateReport: (reportType, jobNo, costCentre) => ipcRenderer.invoke('boq:generate-report', { reportType, jobNo, costCentre })
},

// BOQ Options (electron-store)
boqOptions: {
  get: () => ipcRenderer.invoke('boq-options:get'),
  save: (options) => ipcRenderer.invoke('boq-options:save', options),
  reset: () => ipcRenderer.invoke('boq-options:reset')
}
```

**Add to `useElectronAPI.js`:**
```javascript
// Bill of Quantities
boq: {
  getJobBill: (jobNo, costCentre, bLoad) => window.electronAPI?.boq.getJobBill(jobNo, costCentre, bLoad),
  addItem: (billItem) => window.electronAPI?.boq.addItem(billItem),
  updateItem: (billItem) => window.electronAPI?.boq.updateItem(billItem),
  deleteItem: (jobNo, costCentre, bLoad, lineNumber) => window.electronAPI?.boq.deleteItem(jobNo, costCentre, bLoad, lineNumber),
  getCostCentresWithBudgets: (jobNo) => window.electronAPI?.boq.getCostCentresWithBudgets(jobNo),
  repriceBill: (jobNo, priceLevel, billDate) => window.electronAPI?.boq.repriceBill(jobNo, priceLevel, billDate),
  explodeRecipe: (jobNo, costCentre, bLoad, priceCode, quantity) => window.electronAPI?.boq.explodeRecipe(jobNo, costCentre, bLoad, priceCode, quantity),
  getLoads: (jobNo, costCentre) => window.electronAPI?.boq.getLoads(jobNo, costCentre),
  createLoad: (jobNo, costCentre) => window.electronAPI?.boq.createLoad(jobNo, costCentre),
  generateReport: (reportType, jobNo, costCentre) => window.electronAPI?.boq.generateReport(reportType, jobNo, costCentre)
},

// BOQ Options
boqOptions: {
  get: () => window.electronAPI?.boqOptions.get(),
  save: (options) => window.electronAPI?.boqOptions.save(options),
  reset: () => window.electronAPI?.boqOptions.reset()
}
```

---

## Phase-by-Phase Implementation

## PHASE 1: Foundation Setup (Week 1)

### 1.1 Create BOQ IPC Handler

**File:** `src/ipc-handlers/boq.js`

```javascript
const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');

/**
 * Get Bill of Quantities for a job
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre?, bLoad? }
 */
async function getJobBill(event, params) {
  try {
    const { jobNo, costCentre, bLoad } = params;
    const pool = getPool();
    if (!pool) throw new Error('Database not connected');

    // Get dbConfig from credentials store
    const credStore = require('../database/credentials-store');
    const dbConfig = credStore.getCredentials();

    // Build fully-qualified table names
    const billTable = qualifyTable('Bill', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);

    const query = `
      SELECT
        b.JobNo,
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        b.BLoad,
        b.LineNumber,
        b.Quantity,
        b.UnitPrice,
        b.XDescription AS Workup,
        pl.Description,
        pc.Printout AS Unit,
        pl.Recipe,
        CASE
          WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
          ELSE b.Quantity * b.UnitPrice
        END AS LineTotal
      FROM ${billTable} b
      LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN ${costCentresTable} cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      WHERE b.JobNo = @jobNo
        AND (@costCentre IS NULL OR b.CostCentre = @costCentre)
        AND (@bLoad IS NULL OR b.BLoad = @bLoad)
        AND b.Quantity > 0
      ORDER BY cc.SortOrder, b.CostCentre, b.LineNumber
    `;

    const request = pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .input('bLoad', bLoad || null);

    const result = await request.query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };
  } catch (error) {
    console.error('Error getting job bill:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

// Export handler functions
module.exports = {
  getJobBill,
  addItem,
  updateItem,
  deleteItem,
  getCostCentresWithBudgets,
  repriceBill,
  explodeRecipe,
  getLoads,
  createLoad,
  generateReport
};
```

### 1.2 Register IPC Handlers

**File:** `main.js` (add to existing IPC registrations)

```javascript
// Import BOQ handler
const boqHandlers = require('./src/ipc-handlers/boq');

// Register BOQ IPC handlers (add with existing handlers)
ipcMain.handle('boq:get-job-bill', (event, params) => boqHandlers.getJobBill(event, params));
ipcMain.handle('boq:add-item', (event, billItem) => boqHandlers.addItem(event, billItem));
ipcMain.handle('boq:update-item', (event, billItem) => boqHandlers.updateItem(event, billItem));
ipcMain.handle('boq:delete-item', (event, params) => boqHandlers.deleteItem(event, params));
ipcMain.handle('boq:get-cost-centres-with-budgets', (event, params) => boqHandlers.getCostCentresWithBudgets(event, params));
ipcMain.handle('boq:reprice-bill', (event, params) => boqHandlers.repriceBill(event, params));
ipcMain.handle('boq:explode-recipe', (event, params) => boqHandlers.explodeRecipe(event, params));
ipcMain.handle('boq:get-loads', (event, params) => boqHandlers.getLoads(event, params));
ipcMain.handle('boq:create-load', (event, params) => boqHandlers.createLoad(event, params));
ipcMain.handle('boq:generate-report', (event, params) => boqHandlers.generateReport(event, params));
```

### 1.3 Create BOQ Options Store

**File:** `src/database/boq-options-store.js`

```javascript
const Store = require('electron-store');

const boqOptionsStore = new Store({
  name: 'boq-options',
  defaults: {
    view: {
      showBudgetColumn: true,
      showSubGroupGrid: false
    },
    newItems: {
      defaultPriceLevel: 0,
      zeroToManual: true,
      defaultQuantity: 1,
      insertionPoint: 'end' // 'before' | 'after' | 'end'
    },
    general: {
      closeOtherFunctions: false,
      autoSaveBudgets: true,
      autoRepriceOnLoad: false,
      autoHog: false,
      blockEditLoggedOrders: true,
      supplierAreaPricing: false,
      promptWholeCatalogue: true,
      lockPreferredSupplier: false,
      removeUnexplodedRecipes: false,
      explodeZeroQtyRecipes: false,
      snapshotInterval: 0,
      retainCostCentre: true
    },
    orders: {
      logOrders: true,
      checkingCriteria: {},
      manualPricesOverride: true,
      forceOrderNumberFormat: true,
      autoInsertTodaysDate: true
    },
    orderDisplay: {
      gstDisplay: 'totalThenGst', // 'none' | 'perLine' | 'totalThenGst'
      itemReference: 'both', // 'none' | 'ourCode' | 'supplierRef' | 'both' | 'ourIfNoSupplier'
      priceDisplay: 'all', // 'supplierDefault' | 'all' | 'totalOnly' | 'none' | 'supplierOnly'
      printPictures: false
    }
  }
});

function getOptions() {
  return {
    success: true,
    options: boqOptionsStore.store
  };
}

function saveOptions(options) {
  try {
    boqOptionsStore.store = options;
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

function resetOptions() {
  try {
    boqOptionsStore.clear();
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

module.exports = {
  getOptions,
  saveOptions,
  resetOptions
};
```

---

## PHASE 2: Basic BOQ Tab UI (Week 2)

### 2.1 Create Main BOQ Component

**File:** `frontend/src/components/BOQ/BillOfQuantitiesTab.vue`

```vue
<template>
  <div class="boq-tab h-100 d-flex flex-column">
    <!-- BOQ Toolbar -->
    <BOQToolbar
      v-model:selectedJob="selectedJob"
      v-model:selectedPriceLevel="selectedPriceLevel"
      v-model:selectedLoad="selectedLoad"
      v-model:selectedCostCentre="selectedCostCentre"
      v-model:billDate="billDate"
      @refresh="loadBill"
      @showOptions="showOptionsModal = true"
      @showReports="showReportsModal = true"
      @toggleCatalogueSearch="catalogueSearchVisible = !catalogueSearchVisible"
    />

    <!-- Main Content Area -->
    <div class="boq-content flex-grow-1 d-flex">
      <!-- BOQ Grid (Left/Bottom) -->
      <div :class="['boq-grid-container', { 'with-catalogue': catalogueSearchVisible }]">
        <BOQGrid
          :billItems="billItems"
          :loading="loading"
          @cellValueChanged="onCellValueChanged"
          @deleteItems="onDeleteItems"
        />
      </div>

      <!-- Catalogue Search Panel (Right) -->
      <transition name="slide">
        <div v-if="catalogueSearchVisible" class="catalogue-search-panel">
          <BOQCatalogueSearch
            :costCentre="selectedCostCentre"
            :priceLevel="selectedPriceLevel"
            :billDate="billDate"
            @addItems="onAddItems"
          />
        </div>
      </transition>
    </div>

    <!-- Options Modal -->
    <BOQOptionsModal
      v-model:show="showOptionsModal"
      :options="options"
      @save="onSaveOptions"
    />

    <!-- Reports Modal -->
    <BOQReports
      v-model:show="showReportsModal"
      :jobNo="selectedJob"
      :costCentre="selectedCostCentre"
    />
  </div>
</template>

<script>
import { ref, onMounted, watch, computed } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import BOQToolbar from './BOQToolbar.vue';
import BOQGrid from './BOQGrid.vue';
import BOQCatalogueSearch from './BOQCatalogueSearch.vue';
import BOQOptionsModal from './BOQOptionsModal.vue';
import BOQReports from './BOQReports.vue';

export default {
  name: 'BillOfQuantitiesTab',
  components: {
    BOQToolbar,
    BOQGrid,
    BOQCatalogueSearch,
    BOQOptionsModal,
    BOQReports
  },
  setup() {
    const api = useElectronAPI();

    // State
    const selectedJob = ref(null);
    const selectedPriceLevel = ref(0);
    const selectedLoad = ref(1);
    const selectedCostCentre = ref(null);
    const billDate = ref(new Date());
    const billItems = ref([]);
    const loading = ref(false);
    const catalogueSearchVisible = ref(false);
    const showOptionsModal = ref(false);
    const showReportsModal = ref(false);
    const options = ref({});

    // Load BOQ options
    async function loadOptions() {
      const result = await api.boqOptions.get();
      if (result.success) {
        options.value = result.options;
      }
    }

    // Load bill for selected job
    async function loadBill() {
      if (!selectedJob.value) {
        billItems.value = [];
        return;
      }

      loading.value = true;
      try {
        const result = await api.boq.getJobBill(
          selectedJob.value,
          selectedCostCentre.value,
          selectedLoad.value
        );

        if (result.success) {
          billItems.value = result.data;
        } else {
          console.error('Failed to load bill:', result.message);
        }
      } finally {
        loading.value = false;
      }
    }

    // Cell value changed handler
    async function onCellValueChanged(event) {
      const { data } = event;
      const result = await api.boq.updateItem(data);

      if (!result.success) {
        console.error('Failed to update item:', result.message);
        // Revert change by reloading
        await loadBill();
      }
    }

    // Add items from catalogue
    async function onAddItems(selectedItems) {
      for (const item of selectedItems) {
        const billItem = {
          JobNo: selectedJob.value,
          ItemCode: item.PriceCode,
          CostCentre: selectedCostCentre.value || item.CostCentre,
          BLoad: selectedLoad.value,
          Quantity: options.value.newItems.defaultQuantity,
          UnitPrice: item.Price
        };

        await api.boq.addItem(billItem);
      }

      // Reload bill
      await loadBill();
    }

    // Delete items
    async function onDeleteItems(items) {
      for (const item of items) {
        await api.boq.deleteItem(
          item.JobNo,
          item.CostCentre,
          item.BLoad,
          item.LineNumber
        );
      }

      await loadBill();
    }

    // Save options
    async function onSaveOptions(newOptions) {
      const result = await api.boqOptions.save(newOptions);
      if (result.success) {
        options.value = newOptions;
        showOptionsModal.value = false;
      }
    }

    // Watchers
    watch([selectedJob, selectedCostCentre, selectedLoad], () => {
      loadBill();
    });

    // Initialize
    onMounted(async () => {
      await loadOptions();
    });

    return {
      selectedJob,
      selectedPriceLevel,
      selectedLoad,
      selectedCostCentre,
      billDate,
      billItems,
      loading,
      catalogueSearchVisible,
      showOptionsModal,
      showReportsModal,
      options,
      loadBill,
      onCellValueChanged,
      onAddItems,
      onDeleteItems,
      onSaveOptions
    };
  }
};
</script>

<style scoped>
.boq-tab {
  padding: 0;
  height: 100%;
}

.boq-content {
  overflow: hidden;
}

.boq-grid-container {
  flex: 1;
  min-width: 0;
  transition: all 0.3s ease;
}

.boq-grid-container.with-catalogue {
  flex: 0 0 60%;
}

.catalogue-search-panel {
  flex: 0 0 40%;
  border-left: 1px solid #dee2e6;
  overflow-y: auto;
}

.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}
</style>
```

### 2.2 Add BOQ Route

**File:** `frontend/src/router/index.js` (modify existing)

```javascript
import BillOfQuantitiesTab from '../components/BOQ/BillOfQuantitiesTab.vue';

const routes = [
  // ... existing routes ...
  {
    path: '/boq',
    name: 'BillOfQuantities',
    component: BillOfQuantitiesTab
  }
];
```

### 2.3 Add BOQ Tab to App

**File:** `frontend/src/App.vue` (modify existing tabs)

```vue
<!-- Add BOQ tab button -->
<button
  @click="activeTab = 'boq'"
  :class="['nav-link', { active: activeTab === 'boq' }]"
>
  <i class="bi bi-receipt"></i> Bill of Quantities
</button>

<!-- Add BOQ tab content -->
<BillOfQuantitiesTab v-if="activeTab === 'boq'" />
```

---

## PHASE 3: BOQ Grid Component (Week 3)

**File:** `frontend/src/components/BOQ/BOQGrid.vue`

```vue
<template>
  <div class="boq-grid-wrapper h-100">
    <ag-grid-vue
      class="ag-theme-quartz h-100"
      :columnDefs="columnDefs"
      :rowData="billItems"
      :defaultColDef="defaultColDef"
      :rowSelection="'multiple'"
      :suppressRowClickSelection="true"
      :enableRangeSelection="true"
      @grid-ready="onGridReady"
      @cell-value-changed="onCellValueChanged"
    />
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

export default {
  name: 'BOQGrid',
  components: { AgGridVue },
  props: {
    billItems: Array,
    loading: Boolean
  },
  emits: ['cellValueChanged', 'deleteItems'],
  setup(props, { emit }) {
    const gridApi = ref(null);

    const columnDefs = ref([
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left'
      },
      {
        field: 'ItemCode',
        headerName: 'Code',
        width: 150,
        editable: false,
        pinned: 'left'
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 1,
        editable: false
      },
      {
        field: 'Quantity',
        headerName: 'Qty',
        width: 100,
        editable: true,
        type: 'numericColumn',
        valueParser: params => Number(params.newValue)
      },
      {
        field: 'Unit',
        headerName: 'Unit',
        width: 80,
        editable: false
      },
      {
        field: 'UnitPrice',
        headerName: 'Unit Price',
        width: 120,
        editable: true,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '',
        valueParser: params => Number(params.newValue)
      },
      {
        field: 'LineTotal',
        headerName: 'Total',
        width: 120,
        editable: false,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : ''
      },
      {
        field: 'Workup',
        headerName: 'Workup/Notes',
        width: 200,
        editable: true
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true
    });

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    function onCellValueChanged(event) {
      emit('cellValueChanged', event);
    }

    return {
      columnDefs,
      defaultColDef,
      onGridReady,
      onCellValueChanged
    };
  }
};
</script>

<style scoped>
.boq-grid-wrapper {
  padding: 10px;
}
</style>
```

---

## PHASE 4: BOQ Toolbar Component (Week 3)

**File:** `frontend/src/components/BOQ/BOQToolbar.vue`

```vue
<template>
  <div class="boq-toolbar bg-light border-bottom p-2">
    <div class="row g-2">
      <!-- Job Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Job</label>
        <select
          v-model="selectedJob"
          class="form-select form-select-sm"
          style="width: 200px;"
        >
          <option :value="null">Select Job...</option>
          <option v-for="job in jobs" :key="job.JobNo" :value="job.JobNo">
            {{ job.JobNo }} - {{ job.Address || 'No Address' }}
          </option>
        </select>
      </div>

      <!-- Price Level Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Price Level</label>
        <select
          v-model="selectedPriceLevel"
          class="form-select form-select-sm"
          style="width: 120px;"
        >
          <option :value="0">Base (0)</option>
          <option v-for="level in priceLevels" :key="level" :value="level">
            Level {{ level }}
          </option>
        </select>
      </div>

      <!-- Load Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Load</label>
        <select
          v-model="selectedLoad"
          class="form-select form-select-sm"
          style="width: 100px;"
        >
          <option v-for="load in loads" :key="load" :value="load">
            Load {{ load }}
          </option>
        </select>
      </div>

      <!-- Cost Centre Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Cost Centre</label>
        <select
          v-model="selectedCostCentre"
          class="form-select form-select-sm"
          style="width: 180px;"
        >
          <option :value="null">All Cost Centres</option>
          <option v-for="cc in costCentres" :key="cc.Code" :value="cc.Code">
            {{ cc.Code }} - {{ cc.Name }}
          </option>
        </select>
      </div>

      <!-- Bill Date -->
      <div class="col-auto">
        <label class="form-label small mb-1">Bill Date</label>
        <input
          type="date"
          v-model="billDateStr"
          class="form-control form-control-sm"
          style="width: 150px;"
        />
      </div>

      <!-- Actions -->
      <div class="col-auto ms-auto d-flex align-items-end gap-2">
        <button
          class="btn btn-sm btn-primary"
          @click="$emit('toggleCatalogueSearch')"
          title="Toggle Catalogue Search"
        >
          <i class="bi bi-search"></i>
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('refresh')"
          title="Refresh"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('showOptions')"
          title="Options"
        >
          <i class="bi bi-gear"></i>
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('showReports')"
          title="Reports"
        >
          <i class="bi bi-file-earmark-text"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'BOQToolbar',
  props: {
    selectedJob: String,
    selectedPriceLevel: Number,
    selectedLoad: Number,
    selectedCostCentre: String,
    billDate: Date
  },
  emits: [
    'update:selectedJob',
    'update:selectedPriceLevel',
    'update:selectedLoad',
    'update:selectedCostCentre',
    'update:billDate',
    'refresh',
    'showOptions',
    'showReports',
    'toggleCatalogueSearch'
  ],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const jobs = ref([]);
    const priceLevels = ref([1, 2, 3, 4, 5]);
    const loads = ref([1]);
    const costCentres = ref([]);

    const billDateStr = computed({
      get: () => props.billDate?.toISOString().split('T')[0],
      set: (val) => emit('update:billDate', new Date(val))
    });

    async function loadJobs() {
      const result = await api.jobs.getList();
      if (result.success) {
        jobs.value = result.data;
      }
    }

    async function loadCostCentres() {
      const result = await api.costCentres.getList({});
      if (result.success) {
        costCentres.value = result.data;
      }
    }

    onMounted(async () => {
      await loadJobs();
      await loadCostCentres();
    });

    return {
      jobs,
      priceLevels,
      loads,
      costCentres,
      billDateStr
    };
  }
};
</script>

<style scoped>
.boq-toolbar {
  padding: 10px;
}

.form-label {
  margin-bottom: 2px;
  font-size: 0.875rem;
}
</style>
```

---

## Reusable Existing Components

### Components to Reuse

1. **Catalogue Search** - Adapt `CatalogueTab_updated.vue` catalogue grid
2. **Purchase Orders** - Reuse existing PO rendering/printing
3. **Cost Centres** - Already has `costCentres.getList()`
4. **Suppliers** - Already has supplier dropdowns with CCSuppliers constraint
5. **AG Grid Patterns** - Copy column configuration patterns
6. **Modal Patterns** - Copy modal structure from existing components

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────┐
│  BillOfQuantitiesTab.vue (Main Component)                │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐       │
│  │ BOQToolbar │  │  BOQGrid   │  │ CatalogueSearch│      │
│  └─────┬──────┘  └─────┬──────┘  └───────┬──────┘       │
│        │               │                   │              │
│        │ Job/Price     │ Bill Items        │ Search Items │
│        └───────────────┴───────────────────┘              │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │ useElectronAPI.boq.*
                         │
┌────────────────────────▼──────────────────────────────────┐
│  preload.js (IPC Bridge)                                  │
│  window.electronAPI.boq.*                                 │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  src/ipc-handlers/boq.js                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ getJobBill() │  │  addItem()   │  │ updateItem() │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         └──────────────────┴──────────────────┘           │
└────────────────────────┬──────────────────────────────────┘
                         │ qualifyTable(tableName, dbConfig)
                         │
┌────────────────────────▼──────────────────────────────────┐
│  src/database/query-builder.js                            │
│  Generates: [CROWNEJOB].[dbo].[Bill]                      │
│            [CROWNESYS].[dbo].[PriceList]                  │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  src/database/connection.js                               │
│  SQL Server Connection Pool (mssql)                       │
└────────────────────────┬──────────────────────────────────┘
                         │
┌────────────────────────▼──────────────────────────────────┐
│  SQL Server                                                │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ CROWNESYS        │  │ CROWNEJOB        │              │
│  │ (System DB)      │  │ (Job DB)         │              │
│  │ - PriceList      │  │ - Bill           │              │
│  │ - CostCentres    │  │ - Orders         │              │
│  │ - Supplier       │  │ - OrderDetails   │              │
│  │ - PerCodes       │  │ - Jobs           │              │
│  └──────────────────┘  └──────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## Key Integration Points

### 1. Database Connection
**Status:** ✅ Already exists
**Location:** `src/database/connection.js`
**Action:** None - just use `getPool()`

### 2. Cross-Database Queries
**Status:** ✅ Already exists
**Location:** `src/database/query-builder.js`
**Action:** Use `qualifyTable()` for all queries

### 3. IPC Pattern
**Status:** ✅ Already exists
**Location:** `preload.js`, `main.js`
**Action:** Follow existing pattern for BOQ handlers

### 4. Vue Component Pattern
**Status:** ✅ Already exists
**Location:** `frontend/src/components/`
**Action:** Copy structure from CatalogueTab or RecipesTab

### 5. AG Grid Setup
**Status:** ✅ Already exists
**Location:** All `*Tab_updated.vue` components
**Action:** Copy AG Grid configuration

### 6. electron-store Pattern
**Status:** ✅ Already exists
**Location:** `src/database/*-store.js`
**Action:** Create `boq-options-store.js` following same pattern

---

## Development Timeline (Revised)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| **Phase 1:** Foundation | 3 days | BOQ IPC handler + Options store |
| **Phase 2:** Basic UI | 5 days | BOQ tab + toolbar + grid |
| **Phase 3:** Catalogue Integration | 3 days | Catalogue search panel |
| **Phase 4:** Options Screen | 4 days | Full options modal |
| **Phase 5:** Add/Edit Items | 3 days | Add items, inline editing |
| **Phase 6:** Price Management | 4 days | Price levels, repricing |
| **Phase 7:** Recipe Explosion | 5 days | Recipe explosion logic |
| **Phase 8:** Load Management | 2 days | Multiple loads per CC |
| **Phase 9:** Reports | 5 days | F6/F7/F8 reports |
| **Phase 10:** PO Integration | 3 days | Link to existing PO module |
| **Phase 11:** Drag & Drop | 5 days | Attribute change feature |
| **Phase 12:** Testing & Polish | 7 days | Bug fixes, UX improvements |

**Total:** ~7-8 weeks (vs 17 weeks standalone)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing features** | Use feature flags, test thoroughly, create git branch |
| **Database query conflicts** | Use `query-builder.js` consistently |
| **IPC handler collisions** | Use `boq:` prefix for all BOQ handlers |
| **Store data conflicts** | Separate `boq-options-store.js` file |
| **Performance degradation** | Profile AG Grid with large datasets, implement pagination |

---

## Testing Strategy

### Unit Testing
- Test `boq.js` handler functions independently
- Mock database with sample data
- Test percentage calculation logic

### Integration Testing
- Test IPC communication flow
- Test cross-database queries with real Databuild DB
- Test option persistence

### User Acceptance Testing
- Complete BOQ workflow (Job → Add Items → Price → Order)
- Test with different price levels and dates
- Verify calculations (especially % units)

---

## Next Steps

1. ✅ **Review this integration strategy**
2. **Create feature branch** in Databuild-API-Vue repo:
   ```bash
   cd C:\Dev\Databuild-API-Vue
   git checkout -b feature/boq-module
   ```
3. **Begin Phase 1** - Foundation setup
4. **Test with existing database** to validate queries
5. **Iterative development** with frequent commits

---

## Conclusion

Integrating the BOQ module into the existing **Databuild-API-Vue** project is the optimal approach. This strategy:

✅ **Leverages 90%+ existing infrastructure**
✅ **Reduces development time by ~50-60%**
✅ **Maintains consistency** with existing UI/UX
✅ **Ensures long-term maintainability**
✅ **Provides unified codebase** for all Databuild features

The existing project is well-architected, well-documented, and already handles all the complex database operations needed for BOQ. We simply need to add the BOQ-specific business logic and UI components.

---

**Document Version:** 1.0
**Created:** November 16, 2025
**Status:** Ready for Implementation
