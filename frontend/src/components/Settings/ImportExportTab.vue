<template>
  <div class="import-export-tab">
    <h5 class="mb-3">Import/Export Settings</h5>

    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <form v-else @submit.prevent="saveSettings">
          <!-- CSV Settings -->
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">CSV Delimiter</label>
              <select v-model="formData.csvDelimiter" class="form-select">
                <option value=",">, (Comma)</option>
                <option value=";">; (Semicolon)</option>
                <option value="\t">Tab</option>
                <option value="|">| (Pipe)</option>
              </select>
              <small class="form-text text-muted">
                Delimiter character for CSV files
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label">Export Folder</label>
              <input
                v-model="formData.defaultExportFolder"
                type="text"
                class="form-control"
                placeholder="C:\Path\To\Exports"
              />
              <small class="form-text text-muted">
                Default folder for exports
              </small>
            </div>
          </div>

          <!-- File Naming -->
          <div class="mb-3">
            <label class="form-label">Export File Naming Pattern</label>
            <input
              v-model="formData.exportFileNaming"
              type="text"
              class="form-control"
              placeholder="{type}_{date}"
            />
            <small class="form-text text-muted">
              Pattern for export filenames. Use {type} for export type, {date} for current date
            </small>
          </div>

          <!-- Options -->
          <div class="mb-3">
            <label class="form-label">Import Options</label>
            <div class="form-check">
              <input
                v-model="formData.autoBackupBeforeImport"
                class="form-check-input"
                type="checkbox"
                id="autoBackup"
              />
              <label class="form-check-label" for="autoBackup">
                Automatically backup database before importing
              </label>
            </div>
            <small class="form-text text-muted">
              Creates a backup before any import operation for safety
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
  name: 'ImportExportTab',
  setup() {
    const api = useElectronAPI();

    const loading = ref(false);
    const saving = ref(false);

    const formData = ref({
      csvDelimiter: ',',
      autoBackupBeforeImport: true,
      exportFileNaming: '{type}_{date}',
      defaultExportFolder: '',
      defaultTemplate: ''
    });

    async function loadSettings() {
      loading.value = true;
      try {
        const result = await api.settings.getImportExportSettings();
        formData.value = { ...formData.value, ...result };
      } catch (error) {
        console.error('Error loading import/export settings:', error);
        alert('Error loading import/export settings: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function saveSettings() {
      saving.value = true;
      try {
        await api.settings.updateImportExportSettings(formData.value);
        alert('Import/Export settings saved successfully');
      } catch (error) {
        console.error('Error saving import/export settings:', error);
        alert('Error saving import/export settings: ' + error.message);
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
.import-export-tab {
  max-width: 800px;
}
</style>
