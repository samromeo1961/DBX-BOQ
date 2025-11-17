<template>
  <div class="modal fade show" style="display: block;" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-gear me-2"></i>
            BOQ Preferences
          </h5>
          <button
            type="button"
            class="btn-close"
            @click="$emit('close')"
          ></button>
        </div>

        <div class="modal-body">
          <!-- Number of Loads -->
          <div class="mb-4">
            <label class="form-label fw-bold">Number of Loads</label>
            <p class="small text-muted mb-2">
              Set the default number of loads available in the Load dropdown
            </p>
            <input
              type="number"
              class="form-control"
              v-model.number="localPreferences.numberOfLoads"
              min="1"
              max="99"
              @input="validateLoads"
            />
            <div class="form-text">
              Range: 1-99 loads (Default: 10)
            </div>
          </div>

          <!-- Default Quantity for New Items -->
          <div class="mb-4">
            <label class="form-label fw-bold">Default Quantity for New Items</label>
            <p class="small text-muted mb-2">
              Default quantity when adding items from catalogue
            </p>
            <input
              type="number"
              class="form-control"
              v-model.number="localPreferences.defaultQuantity"
              min="0"
              step="0.01"
            />
            <div class="form-text">
              Default: 1
            </div>
          </div>

          <!-- Auto-save changes -->
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              id="autoSaveCheck"
              v-model="localPreferences.autoSave"
            />
            <label class="form-check-label" for="autoSaveCheck">
              Auto-save changes
            </label>
            <div class="form-text">
              Automatically save changes when you edit cells
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="savePreferences"
          >
            <i class="bi bi-check-lg me-1"></i>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'BOQPreferencesModal',
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const localPreferences = ref({
      numberOfLoads: 10,
      defaultQuantity: 1,
      autoSave: true
    });

    function validateLoads() {
      if (localPreferences.value.numberOfLoads < 1) {
        localPreferences.value.numberOfLoads = 1;
      } else if (localPreferences.value.numberOfLoads > 99) {
        localPreferences.value.numberOfLoads = 99;
      }
    }

    async function loadPreferences() {
      try {
        const result = await api.boqOptions.get();
        if (result.success && result.options) {
          if (result.options.numberOfLoads !== undefined) {
            localPreferences.value.numberOfLoads = result.options.numberOfLoads;
          }
          if (result.options.newItems) {
            localPreferences.value.defaultQuantity = result.options.newItems.defaultQuantity || 1;
          }
          if (result.options.autoSave !== undefined) {
            localPreferences.value.autoSave = result.options.autoSave;
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    async function savePreferences() {
      try {
        const options = {
          numberOfLoads: localPreferences.value.numberOfLoads,
          newItems: {
            defaultQuantity: localPreferences.value.defaultQuantity
          },
          autoSave: localPreferences.value.autoSave
        };

        const result = await api.boqOptions.save(options);
        if (result.success) {
          console.log('✅ Preferences saved');
          emit('save', localPreferences.value);
          emit('close');
        } else {
          alert('Failed to save preferences: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        alert('Error saving preferences: ' + error.message);
      }
    }

    onMounted(() => {
      loadPreferences();
    });

    return {
      localPreferences,
      validateLoads,
      savePreferences
    };
  }
};
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 500px;
}

.form-label.fw-bold {
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.form-text {
  font-size: 0.85rem;
}
</style>
