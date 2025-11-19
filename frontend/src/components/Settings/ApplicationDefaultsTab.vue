<template>
  <div class="application-defaults-tab">
    <h5 class="mb-3">Application Defaults</h5>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <form v-else @submit.prevent="saveDefaults">
          <!-- Price Level -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Default Price Level</label>
              <input
                v-model.number="formData.defaultPriceLevel"
                type="number"
                class="form-control"
                min="1"
                max="10"
              />
              <small class="form-text text-muted">
                Default price level for catalogue items (1-10)
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Currency Symbol</label>
              <input
                v-model="formData.currencySymbol"
                type="text"
                class="form-control"
                maxlength="3"
              />
              <small class="form-text text-muted">
                Symbol used for currency display ($, £, €, etc.)
              </small>
            </div>
          </div>

          <!-- Document Folder -->
          <div class="mb-3">
            <label class="form-label">Default Document Folder</label>
            <input
              v-model="formData.defaultDocFolder"
              type="text"
              class="form-control"
              placeholder="C:\Path\To\Documents"
            />
            <small class="form-text text-muted">
              Default location for storing documents and exports
            </small>
          </div>

          <!-- Purchase Order Folder -->
          <div class="mb-3">
            <label class="form-label">Purchase Order Folder</label>
            <input
              v-model="formData.poFolder"
              type="text"
              class="form-control"
              placeholder="C:\Path\To\PurchaseOrders"
            />
            <small class="form-text text-muted">
              Location where purchase order PDFs are saved
            </small>
          </div>

          <!-- Display Options -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Decimal Places</label>
              <select v-model.number="formData.decimalPlaces" class="form-select">
                <option :value="0">0</option>
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="4">4</option>
              </select>
              <small class="form-text text-muted">
                Number of decimal places for prices
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Date Format</label>
              <select v-model="formData.dateFormat" class="form-select">
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
              <small class="form-text text-muted">
                Date display format throughout application
              </small>
            </div>
          </div>

          <!-- Default Tab -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Default Startup Tab</label>
              <select v-model="formData.defaultTab" class="form-select">
                <option value="jobs">Jobs</option>
                <option value="boq">Bill of Quantities</option>
                <option value="catalogue">Catalogue</option>
                <option value="purchase-orders">Purchase Orders</option>
              </select>
              <small class="form-text text-muted">
                Tab shown when application starts
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label d-block">Default Options</label>
              <div class="form-check mt-2">
                <input
                  v-model="formData.showArchivedByDefault"
                  class="form-check-input"
                  type="checkbox"
                  id="showArchived"
                />
                <label class="form-check-label" for="showArchived">
                  Show archived jobs by default
                </label>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="d-flex justify-content-end gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="loadDefaults"
              :disabled="saving"
            >
              <i class="bi bi-arrow-clockwise me-1"></i>
              Reset
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-lg me-1"></i>
              Save Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'ApplicationDefaultsTab',
  setup() {
    const api = useElectronAPI();

    const loading = ref(false);
    const saving = ref(false);

    const formData = ref({
      defaultPriceLevel: 1,
      defaultDocFolder: '',
      currencySymbol: '$',
      poFolder: '',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      showArchivedByDefault: false,
      defaultTab: 'jobs'
    });

    async function loadDefaults() {
      loading.value = true;
      try {
        const result = await api.settings.getApplicationDefaults();
        formData.value = { ...formData.value, ...result };
      } catch (error) {
        console.error('Error loading application defaults:', error);
        alert('Error loading application defaults: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function saveDefaults() {
      saving.value = true;
      try {
        await api.settings.updateApplicationDefaults(formData.value);
        alert('Application defaults saved successfully');
      } catch (error) {
        console.error('Error saving application defaults:', error);
        alert('Error saving application defaults: ' + error.message);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      loadDefaults();
    });

    return {
      loading,
      saving,
      formData,
      loadDefaults,
      saveDefaults
    };
  }
};
</script>

<style scoped>
.application-defaults-tab {
  max-width: 800px;
}
</style>
