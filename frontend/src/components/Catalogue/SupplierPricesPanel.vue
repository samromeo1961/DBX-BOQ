<template>
  <div class="supplier-prices-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="flex-shrink-0" style="min-width: 300px;">
        <h6 class="mb-0">
          <i class="bi bi-truck me-2"></i>
          Supplier Prices
          <span v-if="itemCode" class="text-muted small ms-2">({{ itemCode }})</span>
        </h6>
        <div v-if="itemDescription" class="text-muted small mt-1">
          {{ itemDescription }}
        </div>
      </div>

      <div v-if="supplierPrices.length > 0" class="flex-grow-1 mx-3" style="max-width: 400px;">
        <label class="form-label small mb-1">Filter by Supplier:</label>
        <SearchableSelect
          v-model="selectedSupplierFilter"
          :options="supplierFilterOptions"
          placeholder="All Suppliers"
          labelKey="label"
          valueKey="value"
          :showClearOption="true"
          clearLabel="Show All Suppliers"
        />
      </div>

      <button
        class="btn btn-sm btn-primary flex-shrink-0"
        @click="openAddDialog"
        :disabled="!itemCode"
      >
        <i class="bi bi-plus-lg me-1"></i>
        Add Supplier Price
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center p-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!itemCode" class="alert alert-info">
      <i class="bi bi-info-circle me-2"></i>
      Select a catalogue item to view supplier prices
    </div>

    <!-- Supplier Prices Grid -->
    <div v-else>
      <div v-if="supplierPrices.length > 0" class="mb-2 text-end small text-muted">
        Showing {{ filteredSupplierPrices.length }} of {{ supplierPrices.length }} price(s)
      </div>

      <div v-if="supplierPrices.length === 0" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No supplier prices found for this item
      </div>

      <div v-else class="supplier-prices-grid" style="height: 400px; width: 100%;">
        <ag-grid-vue
          class="ag-theme-quartz"
          :columnDefs="columnDefs"
          :rowData="filteredSupplierPrices"
          :defaultColDef="defaultColDef"
          @grid-ready="onGridReady"
          style="height: 100%; width: 100%;"
        />
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <div v-if="showDialog" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editMode ? 'Edit' : 'Add' }} Supplier Price
            </h5>
            <button type="button" class="btn-close" @click="closeDialog"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Supplier *</label>
                <SearchableSelect
                  v-model="formData.supplier"
                  :options="supplierOptions"
                  :disabled="editMode"
                  placeholder="Search suppliers..."
                  labelKey="label"
                  valueKey="value"
                />
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label">Price *</label>
                <input
                  type="number"
                  v-model.number="formData.price"
                  class="form-control"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Reference (SKU)</label>
                <input
                  type="text"
                  v-model="formData.reference"
                  class="form-control"
                  :disabled="editMode"
                  placeholder="Supplier's item code/SKU"
                />
                <div class="form-text small">Supplier's product code or GTIN</div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label">Valid From</label>
                <input
                  type="date"
                  v-model="formData.validFrom"
                  class="form-control"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Comments</label>
              <input
                type="text"
                v-model="formData.comments"
                class="form-control"
                placeholder="e.g., Brindle, Roebuck (for ambiguous references)"
              />
              <div class="form-text small">Used to match with workup text for variants</div>
            </div>

            <div class="row">
              <div class="col-md-6 mb-3">
                <label class="form-label">Price Level</label>
                <select v-model.number="formData.priceLevel" class="form-select form-select-sm">
                  <option :value="0">0 - Default (Base Price)</option>
                  <option :value="1">1 - Price Level 1</option>
                  <option :value="2">2 - Price Level 2</option>
                  <option :value="3">3 - Price Level 3</option>
                  <option :value="4">4 - Price Level 4</option>
                  <option :value="5">5 - Price Level 5</option>
                </select>
                <div class="form-text small">Default (0) = base/standard pricing. Levels 1-5 for custom pricing tiers.</div>
              </div>

              <div class="col-md-6 mb-3">
                <label class="form-label">Area</label>
                <input
                  type="text"
                  v-model="formData.area"
                  class="form-control form-control-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeDialog">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveSupplierPrice"
              :disabled="!formData.supplier || !formData.price || formData.price <= 0"
            >
              <i class="bi bi-check-lg me-1"></i>
              {{ editMode ? 'Update' : 'Add' }} Supplier Price
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import SearchableSelect from '../common/SearchableSelect.vue';

export default {
  name: 'SupplierPricesPanel',
  components: {
    AgGridVue,
    SearchableSelect
  },
  props: {
    itemCode: {
      type: String,
      default: null
    },
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const api = useElectronAPI();
    const loading = ref(false);
    const supplierPrices = ref([]);
    const suppliers = ref([]);
    const selectedSupplierFilter = ref('');
    const gridApi = ref(null);
    const showDialog = ref(false);
    const editMode = ref(false);
    const itemDescription = ref('');
    const formData = ref({
      supplier: '',
      reference: '',
      price: 0,
      validFrom: '',
      comments: '',
      priceLevel: 0,
      area: ''
    });

    // Format suppliers for SearchableSelect (Add/Edit dialog)
    const supplierOptions = computed(() => {
      return suppliers.value.map(supplier => ({
        value: supplier.Code,
        label: `${supplier.Name} (${supplier.Code})`
      }));
    });

    // Format unique suppliers from current prices for filter dropdown
    const supplierFilterOptions = computed(() => {
      const uniqueSuppliers = new Map();

      supplierPrices.value.forEach(price => {
        if (price.Supplier && !uniqueSuppliers.has(price.Supplier)) {
          uniqueSuppliers.set(price.Supplier, {
            value: price.Supplier,
            label: price.SupplierName
              ? `${price.SupplierName} (${price.Supplier})`
              : price.Supplier
          });
        }
      });

      return Array.from(uniqueSuppliers.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );
    });

    // Filter supplier prices based on selected supplier
    const filteredSupplierPrices = computed(() => {
      if (!selectedSupplierFilter.value) {
        return supplierPrices.value;
      }

      return supplierPrices.value.filter(price =>
        price.Supplier === selectedSupplierFilter.value
      );
    });

    const columnDefs = ref([
      {
        field: 'Supplier',
        headerName: 'Supplier',
        flex: 0.8,
        minWidth: 100
      },
      {
        field: 'SupplierName',
        headerName: 'Supplier Name',
        flex: 2,
        minWidth: 150
      },
      {
        field: 'Reference',
        headerName: 'Reference (SKU)',
        flex: 1,
        minWidth: 120
      },
      {
        field: 'Price',
        headerName: 'Price',
        flex: 0.6,
        minWidth: 90,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : ''
      },
      {
        field: 'ValidFrom',
        headerName: 'Valid From',
        flex: 0.8,
        minWidth: 100,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
      },
      {
        field: 'Comments',
        headerName: 'Comments',
        flex: 1.5,
        minWidth: 150
      },
      {
        headerName: 'Actions',
        flex: 0.6,
        minWidth: 100,
        suppressSizeToFit: true,
        cellRenderer: () => {
          return `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-sm btn-warning edit-btn" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-danger delete-btn" title="Delete">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          `;
        },
        onCellClicked: params => {
          if (params.event.target.closest('.delete-btn')) {
            deleteSupplierPrice(params.data);
          } else if (params.event.target.closest('.edit-btn')) {
            editSupplierPrice(params.data);
          }
        }
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      resizable: true,
      filter: true
    });

    // Watch for item code changes
    watch(() => props.itemCode, (newValue) => {
      if (newValue) {
        loadSupplierPrices();
        loadItemDescription();
      } else {
        supplierPrices.value = [];
        itemDescription.value = '';
      }
    });


    async function loadSupplierPrices() {
      if (!props.itemCode) return;

      loading.value = true;
      try {
        const result = await api.supplierPrices.get(props.itemCode);

        if (result.success) {
          supplierPrices.value = result.data || [];
        } else {
          console.error('Failed to load supplier prices:', result.message);
          alert('Error loading supplier prices: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading supplier prices:', error);
        alert('Error loading supplier prices: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function loadSuppliers() {
      try {
        const result = await api.supplierPrices.getSuppliers();
        if (result.success) {
          suppliers.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    }

    async function loadItemDescription() {
      if (!props.itemCode) return;

      try {
        const result = await api.catalogue.getItem(props.itemCode, 0);
        if (result.success && result.data) {
          itemDescription.value = result.data.Description || '';
        }
      } catch (error) {
        console.error('Error loading item description:', error);
        itemDescription.value = '';
      }
    }

    function openAddDialog() {
      editMode.value = false;
      formData.value = {
        supplier: '',
        reference: '',
        price: 0,
        validFrom: new Date().toISOString().split('T')[0],
        comments: '',
        priceLevel: 0,
        area: ''
      };
      showDialog.value = true;
    }

    function editSupplierPrice(data) {
      editMode.value = true;
      formData.value = {
        originalSupplier: data.Supplier,
        originalReference: data.Reference,
        supplier: data.Supplier,
        reference: data.Reference || '',
        price: data.Price || 0,
        validFrom: data.ValidFrom ? new Date(data.ValidFrom).toISOString().split('T')[0] : '',
        comments: data.Comments || '',
        priceLevel: data.PriceLevel || 0,
        area: data.Area || ''
      };
      showDialog.value = true;
    }

    function closeDialog() {
      showDialog.value = false;
      formData.value = {
        supplier: '',
        reference: '',
        price: 0,
        validFrom: '',
        comments: '',
        priceLevel: 0,
        area: ''
      };
    }

    async function saveSupplierPrice() {
      if (!formData.value.supplier || !formData.value.price || formData.value.price <= 0) {
        alert('Please fill in all required fields');
        return;
      }

      loading.value = true;
      try {
        const priceData = {
          itemCode: props.itemCode,
          ...formData.value
        };

        const result = editMode.value
          ? await api.supplierPrices.update(priceData)
          : await api.supplierPrices.add(priceData);

        if (result.success) {
          await loadSupplierPrices();
          closeDialog();
          emit('updated');
        } else {
          alert('Error saving supplier price: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving supplier price:', error);
        alert('Error saving supplier price: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function deleteSupplierPrice(data) {
      if (!confirm(`Delete supplier price from ${data.SupplierName}?`)) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.supplierPrices.delete(
          data.ItemCode,
          data.Supplier,
          data.Reference
        );

        if (result.success) {
          await loadSupplierPrices();
          emit('updated');
        } else {
          alert('Error deleting supplier price: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting supplier price:', error);
        alert('Error deleting supplier price: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    onMounted(() => {
      loadSuppliers();
      if (props.itemCode) {
        loadSupplierPrices();
      }
    });

    return {
      loading,
      supplierPrices,
      suppliers,
      supplierOptions,
      selectedSupplierFilter,
      supplierFilterOptions,
      filteredSupplierPrices,
      columnDefs,
      defaultColDef,
      showDialog,
      editMode,
      formData,
      itemDescription,
      openAddDialog,
      editSupplierPrice,
      closeDialog,
      saveSupplierPrice,
      deleteSupplierPrice,
      onGridReady,
      loadItemDescription
    };
  }
};
</script>

<style scoped>
.supplier-prices-panel {
  padding: 1rem;
}

.supplier-prices-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
  min-height: 400px;
}

/* Ensure AG Grid is visible */
.supplier-prices-grid :deep(.ag-root-wrapper) {
  border-radius: 4px;
}
</style>
