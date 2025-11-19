<template>
  <div class="ui-preferences-tab">
    <h5 class="mb-3">UI Preferences</h5>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <form v-else @submit.prevent="saveSettings">
          <!-- Grid Settings -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Grid Row Height</label>
              <select v-model="formData.gridRowHeight" class="form-select">
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Comfortable</option>
              </select>
              <small class="form-text text-muted">
                Height of rows in data grids
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Font Size</label>
              <select v-model="formData.fontSize" class="form-select">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <small class="form-text text-muted">
                Base font size for application
              </small>
            </div>
          </div>

          <!-- Startup -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Default Startup Tab</label>
              <select v-model="formData.defaultStartupTab" class="form-select">
                <option value="jobs">Jobs</option>
                <option value="boq">Bill of Quantities</option>
                <option value="catalogue">Catalogue</option>
                <option value="purchase-orders">Purchase Orders</option>
              </select>
              <small class="form-text text-muted">
                Tab displayed when application starts
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label d-block">Dialog Options</label>
              <div class="form-check mt-2">
                <input
                  v-model="formData.confirmDialogs"
                  class="form-check-input"
                  type="checkbox"
                  id="confirmDialogs"
                />
                <label class="form-check-label" for="confirmDialogs">
                  Show confirmation dialogs
                </label>
              </div>
              <small class="form-text text-muted">
                Request confirmation for delete/destructive actions
              </small>
            </div>
          </div>

          <!-- Theme Preview -->
          <div class="mb-3">
            <label class="form-label">UI Preview</label>
            <div class="p-3 border rounded bg-light">
              <div :class="['preview', `font-${formData.fontSize}`]">
                <div :class="`grid-row-${formData.gridRowHeight}`" class="preview-grid">
                  <div class="preview-row">Sample Grid Row 1</div>
                  <div class="preview-row">Sample Grid Row 2</div>
                  <div class="preview-row">Sample Grid Row 3</div>
                </div>
                <p class="mt-2 mb-0">Sample text with {{ formData.fontSize }} font size</p>
              </div>
            </div>
          </div>

          <!-- Save Button -->
          <div class="d-flex justify-content-end gap-2">
            <button
              type="button"
              class="btn btn-outline-secondary"
              @click="loadSettings"
              :disabled="saving"
            >
              <i class="bi bi-arrow-clockwise me-1"></i>
              Reset
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-check-lg me-1"></i>
              Save Preferences
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
  name: 'UiPreferencesTab',
  setup() {
    const api = useElectronAPI();

    const loading = ref(false);
    const saving = ref(false);

    const formData = ref({
      gridRowHeight: 'normal',
      fontSize: 'medium',
      defaultStartupTab: 'jobs',
      confirmDialogs: true
    });

    async function loadSettings() {
      loading.value = true;
      try {
        const result = await api.settings.getUiPreferences();
        formData.value = { ...formData.value, ...result };
      } catch (error) {
        console.error('Error loading UI preferences:', error);
        alert('Error loading UI preferences: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function saveSettings() {
      saving.value = true;
      try {
        // Convert to plain object to avoid serialization issues
        const prefsToSave = {
          gridRowHeight: formData.value.gridRowHeight,
          fontSize: formData.value.fontSize,
          defaultStartupTab: formData.value.defaultStartupTab,
          confirmDialogs: formData.value.confirmDialogs
        };
        await api.settings.updateUiPreferences(prefsToSave);
        alert('UI preferences saved successfully');
      } catch (error) {
        console.error('Error saving UI preferences:', error);
        alert('Error saving UI preferences: ' + error.message);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      loadSettings();
    });

    return {
      loading,
      saving,
      formData,
      loadSettings,
      saveSettings
    };
  }
};
</script>

<style scoped>
.ui-preferences-tab {
  max-width: 800px;
}

.preview {
  transition: all 0.3s;
}

.font-small {
  font-size: 12px;
}

.font-medium {
  font-size: 14px;
}

.font-large {
  font-size: 16px;
}

.preview-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.preview-row {
  padding: 8px 12px;
  border-bottom: 1px solid #dee2e6;
  background-color: white;
}

.preview-row:last-child {
  border-bottom: none;
}

.grid-row-compact .preview-row {
  padding: 4px 8px;
}

.grid-row-normal .preview-row {
  padding: 8px 12px;
}

.grid-row-comfortable .preview-row {
  padding: 12px 16px;
}
</style>
