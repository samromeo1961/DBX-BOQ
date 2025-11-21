<template>
  <div class="catalogue-search h-100 d-flex flex-column">
    <!-- Header -->
    <div class="catalogue-header bg-white border-bottom p-3">
      <div class="d-flex justify-content-between align-items-center mb-2" style="min-width: 0;">
        <h6 class="mb-0" style="flex-shrink: 0;">Catalogue Search</h6>
        <div class="d-flex gap-1" style="flex-shrink: 0;">
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="$emit('toggleLayout')"
            :title="layoutHorizontal ? 'Switch to vertical layout' : 'Switch to horizontal layout'"
          >
            <i :class="layoutHorizontal ? 'bi bi-layout-sidebar-reverse' : 'bi bi-layout-split'"></i>
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            @click="$emit('close')"
            title="Close"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Search Input -->
      <div class="input-group input-group-sm mb-2" style="max-width: 100%;">
        <input
          type="text"
          v-model="searchTerm"
          @input="debouncedSearch"
          class="form-control"
          placeholder="Search catalogue..."
          style="flex: 1; min-width: 0;"
        />
        <button class="btn btn-outline-secondary" type="button" style="flex-shrink: 0;">
          <i class="bi bi-search"></i>
        </button>
      </div>

      <!-- Filters -->
      <div class="row g-2">
        <div class="col-12">
          <select
            v-model="filterCostCentre"
            @change="searchCatalogue"
            class="form-select form-select-sm"
          >
            <option :value="null">All Cost Centres</option>
            <option
              v-for="cc in costCentres"
              :key="cc.Code"
              :value="cc.Code"
            >
              {{ cc.Code }} - {{ cc.Name }}
            </option>
          </select>
        </div>
        <div class="col-6">
          <select
            :value="selectedLoad"
            @change="$emit('update:selectedLoad', $event.target.value ? parseInt($event.target.value) : null)"
            class="form-select form-select-sm"
            title="Load to assign when adding items"
          >
            <option :value="null">No Load</option>
            <option
              v-for="load in availableLoads"
              :key="load"
              :value="load"
            >
              Load {{ load }}
            </option>
          </select>
        </div>
        <div class="col-6">
          <select
            :value="selectedSupplier"
            @change="$emit('update:selectedSupplier', $event.target.value || null)"
            class="form-select form-select-sm"
            title="Supplier to assign when adding items"
          >
            <option :value="null">No Supplier</option>
            <option
              v-for="supplier in filteredSuppliers"
              :key="supplier.Code"
              :value="supplier.Code"
            >
              {{ supplier.Name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Catalogue Items Grid -->
    <div class="catalogue-body flex-grow-1 p-2">
      <ag-grid-vue
        class="ag-theme-quartz"
        :columnDefs="columnDefs"
        :rowData="catalogueItems"
        :defaultColDef="defaultColDef"
        :rowSelection="'multiple'"
        :suppressRowClickSelection="true"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @row-double-clicked="onRowDoubleClicked"
        style="height: 100%;"
      />
    </div>

    <!-- Footer -->
    <div class="catalogue-footer bg-white border-top p-2">
      <div class="d-flex justify-content-between align-items-center">
        <div class="small text-muted">
          {{ catalogueItems.length }} items
          <span v-if="selectedItems.length > 0">
            | {{ selectedItems.length }} selected
          </span>
        </div>
        <button
          class="btn btn-sm btn-primary"
          @click="addSelectedItems"
          :disabled="selectedItems.length === 0"
          title="Add selected items to bill"
        >
          <i class="bi bi-plus-lg"></i>
          Add Selected ({{ selectedItems.length }})
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'BOQCatalogueSearch',
  components: {
    AgGridVue
  },
  props: {
    costCentre: String,
    priceLevel: Number,
    billDate: Date,
    layoutHorizontal: Boolean,
    availableLoads: {
      type: Array,
      default: () => []
    },
    selectedLoad: {
      type: Number,
      default: null
    },
    suppliers: {
      type: Array,
      default: () => []
    },
    selectedSupplier: {
      type: String,
      default: null
    }
  },
  emits: ['addItems', 'close', 'toggleLayout', 'update:selectedLoad', 'update:selectedSupplier'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const searchTerm = ref('');
    const filterCostCentre = ref(props.costCentre);
    const catalogueItems = ref([]);
    const selectedItems = ref([]);
    const costCentres = ref([]);
    const nominatedSuppliers = ref([]);
    const gridApi = ref(null);
    let searchTimeout = null;

    // Computed: show nominated suppliers for specific CC, all suppliers for "All Cost Centres"
    const filteredSuppliers = computed(() => {
      if (!filterCostCentre.value) {
        // All Cost Centres - show full supplier list from props
        return props.suppliers;
      }
      // Specific cost centre - show nominated suppliers
      return nominatedSuppliers.value;
    });

    const columnDefs = ref([
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 40,
        pinned: 'left',
        suppressSizeToFit: true
      },
      {
        field: 'PriceCode',
        headerName: 'Code',
        width: 100,
        pinned: 'left',
        suppressSizeToFit: true
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 1,
        minWidth: 150
      },
      {
        field: 'CostCentre',
        headerName: 'CC',
        width: 60
      },
      {
        field: 'Unit',
        headerName: 'Unit',
        width: 60
      },
      {
        field: 'Price',
        headerName: 'Price',
        width: 90,
        type: 'numericColumn',
        valueFormatter: params => {
          return params.value !== null && params.value !== undefined
            ? `$${params.value.toFixed(2)}`
            : '';
        }
      },
      {
        field: 'Recipe',
        headerName: 'R',
        width: 40,
        cellRenderer: params => {
          return params.value ? '<i class="bi bi-box-seam text-info"></i>' : '';
        }
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true
    });

    async function searchCatalogue() {
      try {
        console.log('🔍 Searching catalogue with:', {
          searchTerm: searchTerm.value,
          costCentre: filterCostCentre.value,
          priceLevel: props.priceLevel
        });

        const result = await api.catalogue.getItems({
          searchTerm: searchTerm.value,
          costCentre: filterCostCentre.value,
          priceLevel: props.priceLevel,
          showArchived: false
        });

        console.log('📦 Catalogue result:', result);

        if (result.success) {
          catalogueItems.value = result.data || [];
          console.log(`✅ Loaded ${catalogueItems.value.length} catalogue items`);
          if (catalogueItems.value.length > 0) {
            console.log('First item:', catalogueItems.value[0]);
            console.log('First item fields:', {
              PriceCode: catalogueItems.value[0].PriceCode,
              Description: catalogueItems.value[0].Description,
              Price: catalogueItems.value[0].Price,
              CostCentre: catalogueItems.value[0].CostCentre,
              Unit: catalogueItems.value[0].Unit,
              Recipe: catalogueItems.value[0].Recipe
            });
          }
        } else {
          catalogueItems.value = [];
        }
      } catch (error) {
        console.error('Error searching catalogue:', error);
        catalogueItems.value = [];
      }
    }

    function debouncedSearch() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchCatalogue();
      }, 300);
    }

    async function loadCostCentres() {
      try {
        const result = await api.costCentres.getList();
        if (result.success) {
          costCentres.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
      }
    }

    async function loadNominatedSuppliers(costCentre) {
      if (!costCentre) {
        nominatedSuppliers.value = [];
        return;
      }
      try {
        const result = await api.boq.getNominatedSuppliers(costCentre);
        if (result.success) {
          nominatedSuppliers.value = result.data || [];
          console.log(`✅ Loaded ${nominatedSuppliers.value.length} nominated suppliers for CC ${costCentre}`);
        } else {
          nominatedSuppliers.value = [];
        }
      } catch (error) {
        console.error('Error loading nominated suppliers:', error);
        nominatedSuppliers.value = [];
      }
    }

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    function onSelectionChanged() {
      if (gridApi.value) {
        selectedItems.value = gridApi.value.getSelectedRows();
      }
    }

    function addSelectedItems() {
      if (selectedItems.value.length > 0) {
        emit('addItems', selectedItems.value);
        // Clear selection
        if (gridApi.value) {
          gridApi.value.deselectAll();
        }
      }
    }

    function onRowDoubleClicked(event) {
      // Add single item when double-clicked
      emit('addItems', [event.data]);
    }

    // Watch for cost centre changes from parent
    watch(() => props.costCentre, (newCostCentre) => {
      filterCostCentre.value = newCostCentre;
      searchCatalogue();
      loadNominatedSuppliers(newCostCentre);
    });

    // Watch for filter cost centre changes (user dropdown)
    watch(filterCostCentre, (newCostCentre) => {
      loadNominatedSuppliers(newCostCentre);
      // Clear selected supplier when cost centre changes if current supplier not in new list
      emit('update:selectedSupplier', null);
    });

    // Watch for price level changes from parent
    watch(() => props.priceLevel, () => {
      console.log('🔄 Price level changed to:', props.priceLevel);
      searchCatalogue();
    });

    onMounted(async () => {
      await loadCostCentres();
      await searchCatalogue();
    });

    return {
      searchTerm,
      filterCostCentre,
      catalogueItems,
      selectedItems,
      costCentres,
      filteredSuppliers,
      gridApi,
      columnDefs,
      defaultColDef,
      searchCatalogue,
      debouncedSearch,
      onGridReady,
      onSelectionChanged,
      addSelectedItems,
      onRowDoubleClicked
    };
  }
};
</script>

<style scoped>
.catalogue-search {
  background-color: #f8f9fa;
  overflow: hidden;
}

.catalogue-header {
  flex-shrink: 0;
  overflow: visible;
  min-width: 0;
}

.catalogue-body {
  overflow: hidden;
  min-width: 0;
}

.catalogue-footer {
  flex-shrink: 0;
  min-height: 45px;
  overflow: visible;
}

.catalogue-footer .d-flex {
  flex-wrap: nowrap;
  gap: 0.5rem;
}

.catalogue-footer button {
  flex-shrink: 0;
  white-space: nowrap;
}
</style>
