<template>
  <div class="pdf-settings-tab">
    <h5 class="mb-3">PDF Settings</h5>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <form v-else @submit.prevent="saveSettings">
          <!-- Page Setup -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Page Size</label>
              <select v-model="formData.pageSize" class="form-select">
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Legal">Legal</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">PDF Output Folder</label>
              <input
                v-model="formData.poFolder"
                type="text"
                class="form-control"
                placeholder="C:\Path\To\PDFs"
              />
              <small class="form-text text-muted">
                Location where PDF files are saved
              </small>
            </div>
          </div>

          <!-- Margins -->
          <div class="mb-3">
            <label class="form-label">Page Margins (mm)</label>
            <div class="row">
              <div class="col-md-3">
                <label class="form-label small">Top</label>
                <input
                  v-model.number="formData.marginTop"
                  type="number"
                  class="form-control"
                  min="0"
                  max="100"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label small">Bottom</label>
                <input
                  v-model.number="formData.marginBottom"
                  type="number"
                  class="form-control"
                  min="0"
                  max="100"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label small">Left</label>
                <input
                  v-model.number="formData.marginLeft"
                  type="number"
                  class="form-control"
                  min="0"
                  max="100"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label small">Right</label>
                <input
                  v-model.number="formData.marginRight"
                  type="number"
                  class="form-control"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <!-- Display Options -->
          <div class="mb-3">
            <label class="form-label">Display Options</label>
            <div class="form-check">
              <input
                v-model="formData.showLogo"
                class="form-check-input"
                type="checkbox"
                id="showLogo"
              />
              <label class="form-check-label" for="showLogo">
                Show company logo on reports
              </label>
            </div>
            <div class="form-check">
              <input
                v-model="formData.showWatermark"
                class="form-check-input"
                type="checkbox"
                id="showWatermark"
              />
              <label class="form-check-label" for="showWatermark">
                Show watermark on reports
              </label>
            </div>
          </div>

          <!-- Watermark Text -->
          <div v-if="formData.showWatermark" class="mb-3">
            <label class="form-label">Watermark Text</label>
            <input
              v-model="formData.watermarkText"
              type="text"
              class="form-control"
              placeholder="DRAFT"
            />
            <small class="form-text text-muted">
              Text to display as watermark on PDF reports
            </small>
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
              Save Settings
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
  name: 'PdfSettingsTab',
  setup() {
    const api = useElectronAPI();

    const loading = ref(false);
    const saving = ref(false);

    const formData = ref({
      pageSize: 'A4',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      showLogo: true,
      showWatermark: false,
      watermarkText: 'DRAFT',
      poFolder: ''
    });

    async function loadSettings() {
      loading.value = true;
      try {
        const result = await api.settings.getPdfSettings();
        formData.value = { ...formData.value, ...result };
      } catch (error) {
        console.error('Error loading PDF settings:', error);
        alert('Error loading PDF settings: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function saveSettings() {
      saving.value = true;
      try {
        await api.settings.updatePdfSettings(formData.value);
        alert('PDF settings saved successfully');
      } catch (error) {
        console.error('Error saving PDF settings:', error);
        alert('Error saving PDF settings: ' + error.message);
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
.pdf-settings-tab {
  max-width: 800px;
}
</style>
