<template>
  <div class="estimate-prices-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="flex-shrink-0" style="min-width: 300px;">
        <h6 class="mb-0">
          <i class="bi bi-currency-dollar me-2"></i>
          Estimate Prices
          <span v-if="itemCode" class="text-muted small ms-2">({{ itemCode }})</span>
        </h6>
        <div v-if="itemDescription" class="text-muted small mt-1">
          {{ itemDescription }}
        </div>
      </div>

      <div v-if="priceLevels.length > 0" class="flex-grow-1 mx-3" style="max-width: 300px;">
        <label class="form-label small mb-1">Filter by Level:</label>
        <select v-model="selectedLevelFilter" class="form-select form-select-sm">
          <option value="">All Levels</option>
          <option v-for="level in priceLevels" :key="level.value" :value="level.value">
            {{ level.label }}
          </option>
        </select>
      </div>

      <button
        class="btn btn-sm btn-primary flex-shrink-0"
        @click="openAddDialog"
        :disabled="!itemCode"
      >
        <i class="bi bi-plus-lg me-1"></i>
        Add Estimate Price
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
      Select a catalogue item to view estimate prices
    </div>

    <!-- Current Prices Summary -->
    <div v-else>
      <div class="card mb-3">
        <div class="card-header bg-light">
          <strong>Current Estimate Prices</strong>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-2" v-for="level in 5" :key="level">
              <div class="text-center p-2 border rounded">
                <div class="small text-muted">{{ getPriceLevelName(level) }}</div>
                <div class="fw-bold">{{ formatPrice(currentPrices[`Price${level}`]) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Price History Grid -->
      <div v-if="filteredPriceHistory.length > 0" class="mb-2">
        <strong>Price History</strong>
        <span class="text-muted small ms-2">
          (Showing {{ filteredPriceHistory.length }} of {{ priceHistory.length }} record(s))
        </span>
      </div>

      <div v-if="priceHistory.length === 0" class="alert alert-warning">
        <i class="bi bi-exclamation-triangle me-2"></i>
        No price history found for this item
      </div>

      <div v-else class="price-history-grid" style="height: 400px; width: 100%;">
        <ag-grid-vue
          class="ag-theme-quartz"
          :columnDefs="columnDefs"
          :rowData="filteredPriceHistory"
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
              {{ editMode ? 'Edit' : 'Add' }} Estimate Price
            </h5>
            <button type="button" class="btn-close" @click="closeDialog"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              <strong>Price Levels:</strong> Set different price levels for estimating, regional pricing, sales pricing, etc.
              The prices are stored in the Prices table with a date for historical tracking.
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Price Level *</label>
                <select v-model.number="formData.priceLevel" class="form-select" :disabled="editMode">
                  <option :value="1">Level 1 - {{ getPriceLevelName(1) }}</option>
                  <option :value="2">Level 2 - {{ getPriceLevelName(2) }}</option>
                  <option :value="3">Level 3 - {{ getPriceLevelName(3) }}</option>
                  <option :value="4">Level 4 - {{ getPriceLevelName(4) }}</option>
                  <option :value="5">Level 5 - {{ getPriceLevelName(5) }}</option>
                </select>
              </div>

              <div class="col-md-6">
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

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Valid From *</label>
                <input
                  type="date"
                  v-model="formData.validFrom"
                  class="form-control"
                  :disabled="editMode"
                  required
                />
                <div class="form-text small">Date when this price becomes effective</div>
              </div>

              <div class="col-md-6">
                <label class="form-label">Estimator</label>
                <input
                  type="text"
                  v-model="formData.estimator"
                  class="form-control"
                  placeholder="Optional"
                />
                <div class="form-text small">Who set this estimate price</div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Notes</label>
              <textarea
                v-model="formData.notes"
                class="form-control"
                rows="3"
                placeholder="Notes about this price change..."
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeDialog">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveEstimatePrice"
              :disabled="!formData.priceLevel || !formData.price || formData.price <= 0 || !formData.validFrom"
            >
              <i class="bi bi-check-lg me-1"></i>
              {{ editMode ? 'Update' : 'Add' }} Price
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

export default {
  name: 'EstimatePricesPanel',
  components: {
    AgGridVue
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
    const priceHistory = ref([]);
    const currentPrices = ref({
      Price1: 0,
      Price2: 0,
      Price3: 0,
      Price4: 0,
      Price5: 0
    });
    const selectedLevelFilter = ref('');
    const gridApi = ref(null);
    const showDialog = ref(false);
    const editMode = ref(false);
    const itemDescription = ref('');
    const formData = ref({
      priceLevel: 1,
      price: 0,
      validFrom: '',
      estimator: '',
      notes: ''
    });

    // Price level names (can be customized by user later)
    const priceLevels = ref([
      { value: 1, label: 'Level 1 - Estimating' },
      { value: 2, label: 'Level 2 - Regional' },
      { value: 3, label: 'Level 3 - Sales' },
      { value: 4, label: 'Level 4' },
      { value: 5, label: 'Level 5' }
    ]);

    function getPriceLevelName(level) {
      const found = priceLevels.value.find(pl => pl.value === level);
      return found ? found.label : `Level ${level}`;
    }

    // Filter price history by selected level
    const filteredPriceHistory = computed(() => {
      if (!selectedLevelFilter.value) {
        return priceHistory.value;
      }
      return priceHistory.value.filter(price =>
        price.PriceLevel === parseInt(selectedLevelFilter.value)
      );
    });

    const columnDefs = ref([
      {
        field: 'PriceLevel',
        headerName: 'Level',
        flex: 0.5,
        minWidth: 80,
        valueFormatter: params => getPriceLevelName(params.value)
      },
      {
        field: 'Price',
        headerName: 'Price',
        flex: 0.6,
        minWidth: 100,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : ''
      },
      {
        field: 'ValidFrom',
        headerName: 'Valid From',
        flex: 0.8,
        minWidth: 120,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
      },
      {
        field: 'Estimator',
        headerName: 'Estimator',
        flex: 0.8,
        minWidth: 120
      },
      {
        field: 'Notes',
        headerName: 'Notes',
        flex: 1.5,
        minWidth: 200
      },
      {
        field: 'CreatedDate',
        headerName: 'Created',
        flex: 0.8,
        minWidth: 120,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
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
            deleteEstimatePrice(params.data);
          } else if (params.event.target.closest('.edit-btn')) {
            editEstimatePrice(params.data);
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
        loadEstimatePrices();
        loadItemDescription();
      } else {
        priceHistory.value = [];
        currentPrices.value = {
          Price1: 0,
          Price2: 0,
          Price3: 0,
          Price4: 0,
          Price5: 0
        };
        itemDescription.value = '';
      }
    });

    async function loadEstimatePrices() {
      if (!props.itemCode) return;

      loading.value = true;
      try {
        const result = await api.catalogue.getEstimatePrices(props.itemCode);

        if (result.success) {
          priceHistory.value = result.data.history || [];
          currentPrices.value = result.data.current || {
            Price1: 0,
            Price2: 0,
            Price3: 0,
            Price4: 0,
            Price5: 0
          };
        } else {
          console.error('Failed to load estimate prices:', result.message);
          alert('Error loading estimate prices: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading estimate prices:', error);
        alert('Error loading estimate prices: ' + error.message);
      } finally {
        loading.value = false;
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
        priceLevel: 1,
        price: 0,
        validFrom: new Date().toISOString().split('T')[0],
        estimator: '',
        notes: ''
      };
      showDialog.value = true;
    }

    function editEstimatePrice(data) {
      editMode.value = true;
      formData.value = {
        originalPriceLevel: data.PriceLevel,
        originalValidFrom: data.ValidFrom ? new Date(data.ValidFrom).toISOString().split('T')[0] : '',
        priceLevel: data.PriceLevel,
        price: data.Price || 0,
        validFrom: data.ValidFrom ? new Date(data.ValidFrom).toISOString().split('T')[0] : '',
        estimator: data.Estimator || '',
        notes: data.Notes || ''
      };
      showDialog.value = true;
    }

    function closeDialog() {
      showDialog.value = false;
      formData.value = {
        priceLevel: 1,
        price: 0,
        validFrom: '',
        estimator: '',
        notes: ''
      };
    }

    async function saveEstimatePrice() {
      if (!formData.value.priceLevel || !formData.value.price || formData.value.price <= 0 || !formData.value.validFrom) {
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
          ? await api.catalogue.updateEstimatePrice(priceData)
          : await api.catalogue.addEstimatePrice(priceData);

        if (result.success) {
          await loadEstimatePrices();
          closeDialog();
          emit('updated');
        } else {
          alert('Error saving estimate price: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving estimate price:', error);
        alert('Error saving estimate price: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function deleteEstimatePrice(data) {
      if (!confirm(`Delete estimate price for ${getPriceLevelName(data.PriceLevel)} from ${new Date(data.ValidFrom).toLocaleDateString()}?`)) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.catalogue.deleteEstimatePrice(
          data.PriceCode,
          data.PriceLevel,
          data.ValidFrom
        );

        if (result.success) {
          await loadEstimatePrices();
          emit('updated');
        } else {
          alert('Error deleting estimate price: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting estimate price:', error);
        alert('Error deleting estimate price: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function formatPrice(value) {
      if (!value || value === 0) return '-';
      return `$${parseFloat(value).toFixed(2)}`;
    }

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    onMounted(() => {
      if (props.itemCode) {
        loadEstimatePrices();
        loadItemDescription();
      }
    });

    return {
      loading,
      priceHistory,
      currentPrices,
      selectedLevelFilter,
      filteredPriceHistory,
      priceLevels,
      columnDefs,
      defaultColDef,
      showDialog,
      editMode,
      formData,
      itemDescription,
      openAddDialog,
      editEstimatePrice,
      closeDialog,
      saveEstimatePrice,
      deleteEstimatePrice,
      onGridReady,
      getPriceLevelName,
      formatPrice
    };
  }
};
</script>

<style scoped>
.estimate-prices-panel {
  padding: 1rem;
}

.price-history-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
  min-height: 400px;
}

/* Ensure AG Grid is visible */
.price-history-grid :deep(.ag-root-wrapper) {
  border-radius: 4px;
}
</style>
