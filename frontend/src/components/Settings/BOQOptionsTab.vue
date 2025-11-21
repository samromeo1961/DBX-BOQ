<template>
  <div class="boq-options-tab">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">BOQ Options</h5>
      <small class="text-muted">Configure Bill of Quantities preferences and behavior</small>
    </div>

    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <form v-else @submit.prevent="saveOptions">
      <!-- View Settings -->
      <div class="card mb-3">
        <div class="card-header">
          <i class="bi bi-eye me-2"></i>
          View Settings
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.view.showBudgetColumn"
                  class="form-check-input"
                  type="checkbox"
                  id="showBudgetColumn"
                />
                <label class="form-check-label" for="showBudgetColumn">
                  Show Budget Column
                </label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.view.showSubGroupGrid"
                  class="form-check-input"
                  type="checkbox"
                  id="showSubGroupGrid"
                />
                <label class="form-check-label" for="showSubGroupGrid">
                  Show Sub-Group Grid
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- New Items Settings -->
      <div class="card mb-3">
        <div class="card-header">
          <i class="bi bi-plus-circle me-2"></i>
          New Items Settings
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Default Price Level</label>
              <select v-model.number="formData.newItems.defaultPriceLevel" class="form-select">
                <option :value="0">Level 0 (Estimating Price)</option>
                <option :value="1">Level 1 (Regional Price)</option>
                <option :value="2">Level 2 (Sales Price)</option>
                <option :value="3">Level 3</option>
                <option :value="4">Level 4</option>
                <option :value="5">Level 5</option>
                <option :value="6">Level 6</option>
                <option :value="7">Level 7</option>
                <option :value="8">Level 8</option>
                <option :value="9">Level 9</option>
                <option :value="10">Level 10</option>
              </select>
              <small class="form-text text-muted">
                Default price level for new items added to BOQ
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Default Quantity</label>
              <input
                v-model.number="formData.newItems.defaultQuantity"
                type="number"
                class="form-control"
                min="0"
                step="0.01"
              />
              <small class="form-text text-muted">
                Default quantity for new items
              </small>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Insertion Point</label>
              <select v-model="formData.newItems.insertionPoint" class="form-select">
                <option value="before">Before Current</option>
                <option value="after">After Current</option>
                <option value="end">End of List</option>
              </select>
              <small class="form-text text-muted">
                Where to insert new items in the grid
              </small>
            </div>
            <div class="col-md-6">
              <div class="form-check mt-4">
                <input
                  v-model="formData.newItems.zeroToManual"
                  class="form-check-input"
                  type="checkbox"
                  id="zeroToManual"
                />
                <label class="form-check-label" for="zeroToManual">
                  Zero Price → Manual Entry
                </label>
                <small class="form-text text-muted d-block">
                  Prompt for manual price when item price is zero
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- General Options -->
      <div class="card mb-3">
        <div class="card-header">
          <i class="bi bi-gear me-2"></i>
          General Options
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.closeOtherFunctions"
                  class="form-check-input"
                  type="checkbox"
                  id="closeOtherFunctions"
                />
                <label class="form-check-label" for="closeOtherFunctions">
                  Close Other Functions
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.autoRepriceOnLoad"
                  class="form-check-input"
                  type="checkbox"
                  id="autoRepriceOnLoad"
                />
                <label class="form-check-label" for="autoRepriceOnLoad">
                  Auto Re-price on Load
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.autoHog"
                  class="form-check-input"
                  type="checkbox"
                  id="autoHog"
                />
                <label class="form-check-label" for="autoHog">
                  Auto HOG (Heads of Group)
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.blockEditLoggedOrders"
                  class="form-check-input"
                  type="checkbox"
                  id="blockEditLoggedOrders"
                />
                <label class="form-check-label" for="blockEditLoggedOrders">
                  Block Edit of Logged Orders
                </label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.supplierAreaPricing"
                  class="form-check-input"
                  type="checkbox"
                  id="supplierAreaPricing"
                />
                <label class="form-check-label" for="supplierAreaPricing">
                  Supplier Area Pricing
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.promptWholeCatalogue"
                  class="form-check-input"
                  type="checkbox"
                  id="promptWholeCatalogue"
                />
                <label class="form-check-label" for="promptWholeCatalogue">
                  Prompt for Whole Catalogue
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.lockPreferredSupplier"
                  class="form-check-input"
                  type="checkbox"
                  id="lockPreferredSupplier"
                />
                <label class="form-check-label" for="lockPreferredSupplier">
                  Lock Preferred Supplier
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.removeUnexplodedRecipes"
                  class="form-check-input"
                  type="checkbox"
                  id="removeUnexplodedRecipes"
                />
                <label class="form-check-label" for="removeUnexplodedRecipes">
                  Remove Unexploded Recipes
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.explodeZeroQtyRecipes"
                  class="form-check-input"
                  type="checkbox"
                  id="explodeZeroQtyRecipes"
                />
                <label class="form-check-label" for="explodeZeroQtyRecipes">
                  Explode Zero Quantity Recipes
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.general.retainCostCentre"
                  class="form-check-input"
                  type="checkbox"
                  id="retainCostCentre"
                />
                <label class="form-check-label" for="retainCostCentre">
                  Retain Cost Centre Selection
                </label>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Order Options -->
      <div class="card mb-3">
        <div class="card-header">
          <i class="bi bi-receipt me-2"></i>
          Order Options
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.orders.logOrders"
                  class="form-check-input"
                  type="checkbox"
                  id="logOrders"
                />
                <label class="form-check-label" for="logOrders">
                  Log Orders Automatically
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.orders.manualPricesOverride"
                  class="form-check-input"
                  type="checkbox"
                  id="manualPricesOverride"
                />
                <label class="form-check-label" for="manualPricesOverride">
                  Manual Prices Override
                </label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check mb-2">
                <input
                  v-model="formData.orders.forceOrderNumberFormat"
                  class="form-check-input"
                  type="checkbox"
                  id="forceOrderNumberFormat"
                />
                <label class="form-check-label" for="forceOrderNumberFormat">
                  Force Order Number Format
                </label>
              </div>
              <div class="form-check mb-2">
                <input
                  v-model="formData.orders.autoInsertTodaysDate"
                  class="form-check-input"
                  type="checkbox"
                  id="autoInsertTodaysDate"
                />
                <label class="form-check-label" for="autoInsertTodaysDate">
                  Auto-Insert Today's Date
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Display Settings -->
      <div class="card mb-3">
        <div class="card-header">
          <i class="bi bi-display me-2"></i>
          Order Display Settings
        </div>
        <div class="card-body">
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">GST Display</label>
              <select v-model="formData.orderDisplay.gstDisplay" class="form-select">
                <option value="none">None</option>
                <option value="perLine">Per Line</option>
                <option value="totalThenGst">Total Then GST</option>
              </select>
              <small class="form-text text-muted">
                How to display GST in purchase orders
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Item Reference</label>
              <select v-model="formData.orderDisplay.itemReference" class="form-select">
                <option value="none">None</option>
                <option value="ourCode">Our Code</option>
                <option value="supplierRef">Supplier Reference</option>
                <option value="both">Both</option>
                <option value="ourIfNoSupplier">Our Code if No Supplier Ref</option>
              </select>
              <small class="form-text text-muted">
                Which item codes to show
              </small>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Price Display</label>
              <select v-model="formData.orderDisplay.priceDisplay" class="form-select">
                <option value="supplierDefault">Supplier Default</option>
                <option value="all">All Prices</option>
                <option value="totalOnly">Total Only</option>
                <option value="none">None</option>
                <option value="supplierOnly">Supplier Prices Only</option>
              </select>
              <small class="form-text text-muted">
                What prices to display in orders
              </small>
            </div>
            <div class="col-md-6">
              <div class="form-check mt-4">
                <input
                  v-model="formData.orderDisplay.printPictures"
                  class="form-check-input"
                  type="checkbox"
                  id="printPictures"
                />
                <label class="form-check-label" for="printPictures">
                  Print Pictures on Orders
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="d-flex justify-content-end gap-2">
        <button
          type="button"
          class="btn btn-outline-secondary"
          @click="resetToDefaults"
          :disabled="saving"
        >
          <i class="bi bi-arrow-counterclockwise me-1"></i>
          Reset to Defaults
        </button>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
          <i v-else class="bi bi-check-lg me-1"></i>
          Save Options
        </button>
      </div>
    </form>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'BOQOptionsTab',
  setup() {
    const api = useElectronAPI();

    const loading = ref(false);
    const saving = ref(false);
    const formData = ref({
      view: {
        showBudgetColumn: true,
        showSubGroupGrid: false
      },
      newItems: {
        defaultPriceLevel: 0,
        zeroToManual: true,
        defaultQuantity: 1,
        insertionPoint: 'end'
      },
      general: {
        closeOtherFunctions: false,
        autoRepriceOnLoad: false,
        autoHog: false,
        blockEditLoggedOrders: true,
        supplierAreaPricing: false,
        promptWholeCatalogue: true,
        lockPreferredSupplier: false,
        removeUnexplodedRecipes: false,
        explodeZeroQtyRecipes: false,
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
        gstDisplay: 'totalThenGst',
        itemReference: 'both',
        priceDisplay: 'all',
        printPictures: false
      }
    });

    const loadOptions = async () => {
      loading.value = true;
      try {
        const result = await api.boqOptions.get();
        if (result.success && result.options) {
          // Only update the relevant sections, preserve lastUsed
          formData.value.view = result.options.view || formData.value.view;
          formData.value.newItems = result.options.newItems || formData.value.newItems;
          formData.value.general = result.options.general || formData.value.general;
          formData.value.orders = result.options.orders || formData.value.orders;
          formData.value.orderDisplay = result.options.orderDisplay || formData.value.orderDisplay;
        }
      } catch (error) {
        console.error('Failed to load BOQ options:', error);
        alert('Failed to load BOQ options: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const saveOptions = async () => {
      saving.value = true;
      try {
        // Get the current full options including lastUsed
        const currentResult = await api.boqOptions.get();
        const currentOptions = currentResult.success ? currentResult.options : {};

        // Convert reactive objects to plain objects for IPC serialization
        const optionsToSave = JSON.parse(JSON.stringify({
          ...currentOptions,
          view: formData.value.view,
          newItems: formData.value.newItems,
          general: formData.value.general,
          orders: formData.value.orders,
          orderDisplay: formData.value.orderDisplay
        }));

        const result = await api.boqOptions.save(optionsToSave);
        if (result.success) {
          alert('BOQ options saved successfully!');
        } else {
          alert('Failed to save BOQ options: ' + result.message);
        }
      } catch (error) {
        console.error('Failed to save BOQ options:', error);
        alert('Failed to save BOQ options: ' + error.message);
      } finally {
        saving.value = false;
      }
    };

    const resetToDefaults = async () => {
      if (!confirm('Are you sure you want to reset all BOQ options to defaults? This cannot be undone.')) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.boqOptions.reset();
        if (result.success) {
          await loadOptions();
          alert('BOQ options reset to defaults successfully!');
        } else {
          alert('Failed to reset BOQ options: ' + result.message);
        }
      } catch (error) {
        console.error('Failed to reset BOQ options:', error);
        alert('Failed to reset BOQ options: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      loadOptions();
    });

    return {
      loading,
      saving,
      formData,
      loadOptions,
      saveOptions,
      resetToDefaults
    };
  }
};
</script>

<style scoped>
.boq-options-tab {
  max-width: 1200px;
}

.card-header {
  background-color: #f8f9fa;
  font-weight: 600;
}
</style>
