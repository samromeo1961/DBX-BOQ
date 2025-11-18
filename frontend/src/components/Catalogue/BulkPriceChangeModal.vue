<!--
  BulkPriceChangeModal.vue

  A 3-step wizard for applying bulk price changes to catalogue items.

  Features:
  - Step 1: Select items (by cost centre, search term, price levels)
  - Step 2: Configure change type (percentage, fixed amount, multiply, round, copy, set value)
  - Step 3: Preview changes before applying

  Supports two price types:
  - Estimate Prices: Updates the Prices table (5 price levels)
  - Supplier Prices: Updates the SuppliersPrices table (filtered by supplier)

  All changes create new price history records with effective date, estimator, and notes.
-->
<template>
  <div v-if="show" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);" @click.self="close">
    <div class="modal-dialog modal-xl" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-lightning-charge me-2"></i>
            Bulk Price Changes
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>

        <div class="modal-body">
          <!-- Step Indicator -->
          <div class="mb-4">
            <ul class="nav nav-pills">
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 1 }"
                  @click="step = 1"
                  :disabled="step < 1"
                >
                  1. Select Items
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 2 }"
                  @click="step = 2"
                  :disabled="step < 2"
                >
                  2. Configure Changes
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 3 }"
                  :disabled="step < 3"
                >
                  3. Preview & Apply
                </button>
              </li>
            </ul>
          </div>

          <!-- Step 1: Selection Criteria -->
          <div v-if="step === 1">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Select which items and price levels you want to update
            </div>

            <div class="mb-3">
              <label class="form-label">Price Type *</label>
              <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="priceType" id="priceTypeEstimate" value="estimate" v-model="criteria.priceType">
                <label class="btn btn-outline-primary" for="priceTypeEstimate">
                  <i class="bi bi-currency-dollar me-1"></i>
                  Estimate Prices
                </label>

                <input type="radio" class="btn-check" name="priceType" id="priceTypeSupplier" value="supplier" v-model="criteria.priceType">
                <label class="btn btn-outline-primary" for="priceTypeSupplier">
                  <i class="bi bi-truck me-1"></i>
                  Supplier Prices
                </label>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Cost Centre</label>
                <SearchableSelect
                  v-model="criteria.costCentre"
                  :options="costCentreOptions"
                  placeholder="All Cost Centres"
                  :allowEmpty="true"
                />
              </div>

              <div class="col-md-6">
                <label class="form-label">Search Term (optional)</label>
                <input
                  v-model="criteria.searchTerm"
                  type="text"
                  class="form-control"
                  placeholder="Filter by code or description..."
                />
              </div>
            </div>

            <!-- Supplier filter - only shown for Supplier Prices -->
            <div v-if="criteria.priceType === 'supplier'" class="row mb-3">
              <div class="col-md-12">
                <label class="form-label">
                  <i class="bi bi-truck me-1"></i>
                  Supplier Filter (optional)
                </label>
                <SearchableSelect
                  v-model="criteria.supplier"
                  :options="supplierOptions"
                  placeholder="All Suppliers"
                  :allowEmpty="true"
                />
                <small class="form-text text-muted">
                  Filter to show prices from a specific supplier only
                </small>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label d-block">Price Levels to Update</label>
              <div class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="selectAll"
                  :checked="allLevelsSelected"
                  @change="toggleAllLevels"
                />
                <label class="form-check-label" for="selectAll">
                  <strong>Select All</strong>
                </label>
              </div>
              <br>
              <div v-for="level in 5" :key="level" class="form-check form-check-inline">
                <input
                  class="form-check-input"
                  type="checkbox"
                  :id="`level${level}`"
                  v-model="criteria.priceLevels"
                  :value="level"
                />
                <label class="form-check-label" :for="`level${level}`">
                  Level {{ level }}
                </label>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="criteria.excludeZeroPrices"
                />
                <span class="form-check-label">Exclude items with zero/empty prices</span>
              </label>
            </div>

            <button
              class="btn btn-primary"
              @click="loadMatchingItems"
              :disabled="criteria.priceLevels.length === 0"
            >
              <i class="bi bi-search me-1"></i>
              Find Matching Items
            </button>

            <div v-if="matchingItems.length > 0" class="mt-3">
              <div class="alert alert-success">
                <i class="bi bi-check-circle me-2"></i>
                Found {{ matchingItems.length }} matching item(s)
              </div>
            </div>
          </div>

          <!-- Step 2: Configure Change -->
          <div v-if="step === 2">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Configure how you want to change the prices
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Change Type *</label>
                <select v-model="changeConfig.type" class="form-select">
                  <option value="percentage_increase">Percentage Increase</option>
                  <option value="percentage_decrease">Percentage Decrease</option>
                  <option value="fixed_increase">Fixed Amount Increase</option>
                  <option value="fixed_decrease">Fixed Amount Decrease</option>
                  <option value="multiply">Multiply by Factor</option>
                  <option value="round">Round to Nearest</option>
                  <option value="copy_level">Copy from Another Level</option>
                  <option value="set_value">Set to Specific Value</option>
                </select>
              </div>

              <div class="col-md-6">
                <label class="form-label">
                  {{ getValueLabel() }} *
                </label>
                <input
                  v-if="changeConfig.type !== 'copy_level'"
                  v-model.number="changeConfig.value"
                  type="number"
                  class="form-control"
                  :step="changeConfig.type.includes('percentage') ? '1' : '0.01'"
                  :min="0"
                  required
                />
                <select
                  v-else
                  v-model.number="changeConfig.sourceLeve"
                  class="form-select"
                >
                  <option value="">Select source level...</option>
                  <option v-for="level in 5" :key="level" :value="level">
                    Level {{ level }}
                  </option>
                </select>
              </div>
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Valid From Date *</label>
                <input
                  v-model="changeConfig.validFrom"
                  type="date"
                  class="form-control"
                  required
                />
              </div>

              <div class="col-md-6">
                <label class="form-label">Estimator (optional)</label>
                <input
                  v-model="changeConfig.estimator"
                  type="text"
                  class="form-control"
                  placeholder="Your name or initials"
                />
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Notes (optional)</label>
              <textarea
                v-model="changeConfig.notes"
                class="form-control"
                rows="2"
                placeholder="Reason for price change..."
              ></textarea>
            </div>

            <div class="mb-3">
              <label class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="changeConfig.roundResult"
                />
                <span class="form-check-label">Round result to 2 decimal places</span>
              </label>
            </div>
          </div>

          <!-- Step 3: Preview -->
          <div v-if="step === 3">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Preview Changes:</strong> Review the changes below before applying. This will add new price history records.
            </div>

            <div class="mb-3">
              <strong>Summary:</strong>
              <ul>
                <li>Items affected: {{ previewChanges.length }}</li>
                <li>Change type: {{ getChangeDescription() }}</li>
                <li>Valid from: {{ changeConfig.validFrom }}</li>
                <li v-if="changeConfig.estimator">Estimator: {{ changeConfig.estimator }}</li>
              </ul>
            </div>

            <div class="preview-grid" style="height: 400px; width: 100%;">
              <ag-grid-vue
                class="ag-theme-quartz"
                :columnDefs="previewColumnDefs"
                :rowData="previewChanges"
                :defaultColDef="previewDefaultColDef"
                style="height: 100%; width: 100%;"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="me-auto text-muted small" v-if="step === 3">
            <i class="bi bi-info-circle me-1"></i>
            Changes will be added as new price history records
          </div>

          <button type="button" class="btn btn-secondary" @click="close">
            Cancel
          </button>

          <button
            v-if="step > 1"
            type="button"
            class="btn btn-outline-secondary"
            @click="step--"
          >
            <i class="bi bi-arrow-left me-1"></i>
            Back
          </button>

          <button
            v-if="step === 1"
            type="button"
            class="btn btn-primary"
            @click="goToStep2"
            :disabled="matchingItems.length === 0"
          >
            Next: Configure Changes
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="step === 2"
            type="button"
            class="btn btn-primary"
            @click="generatePreview"
            :disabled="!isChangeConfigValid"
          >
            Next: Preview Changes
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="step === 3"
            type="button"
            class="btn btn-success"
            @click="applyChanges"
            :disabled="applying"
          >
            <span v-if="!applying">
              <i class="bi bi-check-lg me-1"></i>
              Apply Changes ({{ previewChanges.length }} items)
            </span>
            <span v-else>
              <span class="spinner-border spinner-border-sm me-1"></span>
              Applying...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import SearchableSelect from '../common/SearchableSelect.vue';

export default {
  name: 'BulkPriceChangeModal',
  components: {
    AgGridVue,
    SearchableSelect
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'applied'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const step = ref(1);
    const applying = ref(false);
    const costCentres = ref([]);
    const suppliers = ref([]);
    const matchingItems = ref([]);
    const previewChanges = ref([]);

    const criteria = ref({
      priceType: 'estimate',
      costCentre: '',
      searchTerm: '',
      priceLevels: [1],
      excludeZeroPrices: true,
      supplier: ''
    });

    const changeConfig = ref({
      type: 'percentage_increase',
      value: 0,
      sourceLevel: null,
      validFrom: new Date().toISOString().split('T')[0],
      estimator: '',
      notes: '',
      roundResult: true
    });

    const allLevelsSelected = computed(() => {
      return criteria.value.priceLevels.length === 5;
    });

    const isChangeConfigValid = computed(() => {
      if (!changeConfig.value.validFrom) return false;
      if (changeConfig.value.type === 'copy_level') {
        return changeConfig.value.sourceLevel !== null;
      }
      return changeConfig.value.value !== null && changeConfig.value.value !== '';
    });

    const costCentreOptions = computed(() => {
      return costCentres.value.map(cc => ({
        value: cc.Code,
        label: `${cc.Code} - ${cc.Name}`
      }));
    });

    const supplierOptions = computed(() => {
      return suppliers.value.map(s => ({
        value: s.Code,
        label: `${s.Code} - ${s.Name}`
      }));
    });

    function toggleAllLevels(event) {
      if (event.target.checked) {
        criteria.value.priceLevels = [1, 2, 3, 4, 5];
      } else {
        criteria.value.priceLevels = [];
      }
    }

    function getValueLabel() {
      const type = changeConfig.value.type;
      if (type.includes('percentage')) return 'Percentage (%)';
      if (type.includes('fixed')) return 'Amount ($)';
      if (type === 'multiply') return 'Multiplier';
      if (type === 'round') return 'Round to nearest ($)';
      if (type === 'copy_level') return 'Copy from Level';
      if (type === 'set_value') return 'New Price ($)';
      return 'Value';
    }

    function getChangeDescription() {
      const type = changeConfig.value.type;
      const value = changeConfig.value.value;

      switch (type) {
        case 'percentage_increase': return `Increase by ${value}%`;
        case 'percentage_decrease': return `Decrease by ${value}%`;
        case 'fixed_increase': return `Increase by $${value}`;
        case 'fixed_decrease': return `Decrease by $${value}`;
        case 'multiply': return `Multiply by ${value}`;
        case 'round': return `Round to nearest $${value}`;
        case 'copy_level': return `Copy from Level ${changeConfig.value.sourceLevel}`;
        case 'set_value': return `Set to $${value}`;
        default: return 'Unknown';
      }
    }

    async function loadCostCentres() {
      try {
        console.log('Loading cost centres for bulk price modal...');
        const result = await api.costCentres.getList();
        console.log('Cost centres result:', result);
        if (result.success) {
          // The backend already filters for Tier 1, so just use all returned data
          console.log('First cost centre:', result.data[0]);
          costCentres.value = result.data;
          console.log('Cost centres loaded:', costCentres.value.length);
        } else {
          console.error('Failed to load cost centres:', result.message);
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
      }
    }

    async function loadSuppliers() {
      try {
        console.log('Loading suppliers for bulk price modal...');
        const result = await api.supplierPrices.getSuppliers();
        console.log('Suppliers result:', result);
        if (result.success) {
          suppliers.value = result.data;
          console.log('Suppliers loaded:', suppliers.value.length);
        } else {
          console.error('Failed to load suppliers:', result.message);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    }

    async function loadMatchingItems() {
      try {
        // Convert to plain object to avoid IPC cloning errors
        const plainCriteria = {
          priceType: criteria.value.priceType,
          costCentre: criteria.value.costCentre,
          searchTerm: criteria.value.searchTerm,
          priceLevels: [...criteria.value.priceLevels],
          excludeZeroPrices: criteria.value.excludeZeroPrices,
          supplier: criteria.value.supplier
        };

        const result = await api.catalogue.getBulkPriceItems(plainCriteria);

        if (result.success) {
          matchingItems.value = result.data;
          if (matchingItems.value.length > 0) {
            setTimeout(() => {
              step.value = 2;
            }, 500);
          } else {
            alert('No matching items found with the current criteria.');
          }
        }
      } catch (error) {
        console.error('Error loading matching items:', error);
        alert('Error loading items: ' + error.message);
      }
    }

    function goToStep2() {
      step.value = 2;
    }

    function calculateNewPrice(currentPrice, level) {
      let newPrice = currentPrice;
      const { type, value, sourceLevel } = changeConfig.value;

      switch (type) {
        case 'percentage_increase':
          newPrice = currentPrice * (1 + value / 100);
          break;
        case 'percentage_decrease':
          newPrice = currentPrice * (1 - value / 100);
          break;
        case 'fixed_increase':
          newPrice = currentPrice + value;
          break;
        case 'fixed_decrease':
          newPrice = currentPrice - value;
          break;
        case 'multiply':
          newPrice = currentPrice * value;
          break;
        case 'round':
          newPrice = Math.round(currentPrice / value) * value;
          break;
        case 'set_value':
          newPrice = value;
          break;
        case 'copy_level':
          // Will be handled specially in generatePreview
          return null;
      }

      if (changeConfig.value.roundResult && type !== 'round') {
        newPrice = Math.round(newPrice * 100) / 100;
      }

      return Math.max(0, newPrice); // Don't allow negative prices
    }

    function generatePreview() {
      previewChanges.value = [];

      matchingItems.value.forEach(item => {
        criteria.value.priceLevels.forEach(level => {
          const priceKey = `Price${level}`;
          const currentPrice = item[priceKey] || 0;

          if (criteria.value.excludeZeroPrices && currentPrice === 0) {
            return;
          }

          let newPrice;
          if (changeConfig.value.type === 'copy_level') {
            const sourcePriceKey = `Price${changeConfig.value.sourceLevel}`;
            newPrice = item[sourcePriceKey] || 0;
          } else {
            newPrice = calculateNewPrice(currentPrice, level);
          }

          const change = newPrice - currentPrice;
          const changePercent = currentPrice !== 0 ? (change / currentPrice * 100) : 0;

          previewChanges.value.push({
            PriceCode: item.PriceCode,
            Description: item.Description,
            Level: level,
            CurrentPrice: currentPrice,
            NewPrice: newPrice,
            Change: change,
            ChangePercent: changePercent
          });
        });
      });

      step.value = 3;
    }

    async function applyChanges() {
      if (!confirm(`Apply price changes to ${previewChanges.value.length} items?`)) {
        return;
      }

      applying.value = true;

      try {
        // Convert to plain objects to avoid IPC cloning errors
        const plainChanges = previewChanges.value.map(change => ({
          PriceCode: change.PriceCode,
          Description: change.Description,
          Level: change.Level,
          CurrentPrice: change.CurrentPrice,
          NewPrice: change.NewPrice,
          Change: change.Change,
          ChangePercent: change.ChangePercent
        }));

        const plainData = {
          priceType: criteria.value.priceType,
          changes: plainChanges,
          validFrom: changeConfig.value.validFrom,
          estimator: changeConfig.value.estimator,
          notes: changeConfig.value.notes,
          supplier: criteria.value.supplier
        };

        const result = await api.catalogue.applyBulkPriceChanges(plainData);

        if (result.success) {
          alert(`Successfully updated prices for ${result.data.successCount} items!`);
          emit('applied');
          close();
        } else {
          alert('Error applying changes: ' + result.message);
        }
      } catch (error) {
        console.error('Error applying bulk changes:', error);
        alert('Error applying changes: ' + error.message);
      } finally {
        applying.value = false;
      }
    }

    function close() {
      step.value = 1;
      matchingItems.value = [];
      previewChanges.value = [];
      criteria.value = {
        priceType: 'estimate',
        costCentre: '',
        searchTerm: '',
        priceLevels: [1],
        excludeZeroPrices: true,
        supplier: ''
      };
      changeConfig.value = {
        type: 'percentage_increase',
        value: 0,
        sourceLevel: null,
        validFrom: new Date().toISOString().split('T')[0],
        estimator: '',
        notes: '',
        roundResult: true
      };
      emit('close');
    }

    const previewColumnDefs = ref([
      {
        field: 'PriceCode',
        headerName: 'Code',
        width: 100,
        pinned: 'left'
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 2,
        minWidth: 200
      },
      {
        field: 'Level',
        headerName: 'Level',
        width: 80
      },
      {
        field: 'CurrentPrice',
        headerName: 'Current Price',
        width: 120,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '$0.00'
      },
      {
        field: 'NewPrice',
        headerName: 'New Price',
        width: 120,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : '$0.00',
        cellStyle: { fontWeight: 'bold', color: '#0d6efd' }
      },
      {
        field: 'Change',
        headerName: 'Change ($)',
        width: 120,
        type: 'numericColumn',
        valueFormatter: params => {
          const value = params.value || 0;
          const sign = value >= 0 ? '+' : '';
          return `${sign}$${value.toFixed(2)}`;
        },
        cellStyle: params => ({
          color: params.value >= 0 ? '#198754' : '#dc3545',
          fontWeight: 'bold'
        })
      },
      {
        field: 'ChangePercent',
        headerName: 'Change (%)',
        width: 120,
        type: 'numericColumn',
        valueFormatter: params => {
          const value = params.value || 0;
          const sign = value >= 0 ? '+' : '';
          return `${sign}${value.toFixed(1)}%`;
        },
        cellStyle: params => ({
          color: params.value >= 0 ? '#198754' : '#dc3545'
        })
      }
    ]);

    const previewDefaultColDef = ref({
      sortable: true,
      resizable: true,
      filter: true
    });

    watch(() => props.show, (newValue) => {
      if (newValue) {
        console.log('Bulk Price Modal opened, loading data...');
        loadCostCentres();
        loadSuppliers();
      }
    }, { immediate: true });

    return {
      step,
      applying,
      costCentres,
      costCentreOptions,
      suppliers,
      supplierOptions,
      matchingItems,
      previewChanges,
      criteria,
      changeConfig,
      allLevelsSelected,
      isChangeConfigValid,
      previewColumnDefs,
      previewDefaultColDef,
      toggleAllLevels,
      getValueLabel,
      getChangeDescription,
      loadMatchingItems,
      goToStep2,
      generatePreview,
      applyChanges,
      close
    };
  }
};
</script>

<style scoped>
.preview-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.preview-grid :deep(.ag-root-wrapper) {
  border-radius: 4px;
}
</style>
