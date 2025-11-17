<template>
  <div class="supplier-prices-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-truck me-2"></i>
        Supplier Prices
        <span v-if="itemCode" class="text-muted small ms-2">({{ itemCode }})</span>
      </h6>
      <button
        class="btn btn-sm btn-primary"
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
    <div v-else class="supplier-prices-grid" style="height: 400px;">
      <ag-grid-vue
        class="ag-theme-quartz"
        :columnDefs="columnDefs"
        :rowData="supplierPrices"
        :defaultColDef="defaultColDef"
        @grid-ready="onGridReady"
        style="height: 100%;"
      />
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
                <select
                  v-model="formData.supplier"
                  class="form-select"
                  :disabled="editMode"
                  required
                >
                  <option value="">Select Supplier...</option>
                  <option
                    v-for="supplier in suppliers"
                    :key="supplier.Code"
                    :value="supplier.Code"
                  >
                    {{ supplier.Name }} ({{ supplier.Code }})
                  </option>
                </select>
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
                  <option :value="0">Default</option>
                  <option :value="1">Level 1</option>
                  <option :value="2">Level 2</option>
                  <option :value="3">Level 3</option>
                  <option :value="4">Level 4</option>
                  <option :value="5">Level 5</option>
                </select>
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
import { ref, watch, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'SupplierPricesPanel',
  components: {
    AgGridVue
  },
  props: {
    itemCode: {
      type: String,
      default: null
    }
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const api = useElectronAPI();
    const loading = ref(false);
    const supplierPrices = ref([]);
    const suppliers = ref([]);
    const gridApi = ref(null);
    const showDialog = ref(false);
    const editMode = ref(false);
    const formData = ref({
      supplier: '',
      reference: '',
      price: 0,
      validFrom: '',
      comments: '',
      priceLevel: 0,
      area: ''
    });

    const columnDefs = ref([
      {
        field: 'Supplier',
        headerName: 'Supplier',
        width: 120,
        pinned: 'left'
      },
      {
        field: 'SupplierName',
        headerName: 'Supplier Name',
        flex: 1,
        minWidth: 200
      },
      {
        field: 'Reference',
        headerName: 'Reference (SKU)',
        width: 150
      },
      {
        field: 'Price',
        headerName: 'Price',
        width: 100,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : ''
      },
      {
        field: 'ValidFrom',
        headerName: 'Valid From',
        width: 120,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
      },
      {
        field: 'Comments',
        headerName: 'Comments',
        width: 150
      },
      {
        field: 'LastUpdated',
        headerName: 'Last Updated',
        width: 150,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleString();
        }
      },
      {
        headerName: 'Actions',
        width: 120,
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
      } else {
        supplierPrices.value = [];
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
      columnDefs,
      defaultColDef,
      showDialog,
      editMode,
      formData,
      openAddDialog,
      editSupplierPrice,
      closeDialog,
      saveSupplierPrice,
      deleteSupplierPrice,
      onGridReady
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
}
</style>
