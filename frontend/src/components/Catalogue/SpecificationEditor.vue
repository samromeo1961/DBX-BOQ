<template>
  <div class="specification-editor">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-file-earmark-text me-2"></i>
        Specification
        <span v-if="priceCode" class="text-muted small ms-2">({{ priceCode }})</span>
      </h6>
      <div class="btn-group btn-group-sm">
        <button
          class="btn btn-outline-primary"
          @click="insertVariable"
          :disabled="!priceCode || loading"
          title="Insert variable placeholder"
        >
          <i class="bi bi-braces me-1"></i>
          Insert Variable
        </button>
        <button
          class="btn btn-primary"
          @click="saveSpecification"
          :disabled="!priceCode || loading || !hasChanges"
        >
          <i class="bi bi-save me-1"></i>
          Save Specification
        </button>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info alert-sm mb-3">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Specification Purpose:</strong> Job specification details stored here. When generating specification reports,
      only content for items in the Bill of Quantities will be displayed. Use variables to automate report generation.
    </div>

    <!-- Empty State -->
    <div v-if="!priceCode" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Select a catalogue item to edit its specification
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center p-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Specification Editor -->
    <div v-else class="specification-editor-container">
      <textarea
        ref="specificationTextarea"
        v-model="specificationText"
        class="form-control specification-textarea"
        placeholder="Enter specification text here...

Example:
SPEC A

SPECIFICATIONS OF WORKS TO BE PERFORMED AND MATERIALS TO BE USED IN THE CONSTRUCTION OF:
PROPOSED PROJECT:     [Project Name]
                      LOT ([Lot Number] + STREET), (SUBURB), FOR:

BUILDER: [Builder Name]

BUILDING DESIGNERS - ENGINEERS ADDRESS:
[Address Line 1]
[Address Line 2]                                   [Phone Number]

WARNING: IT IS IMPORTANT THAT BOTH THE OWNER/S AND BUILDER READ THESE SPECIFICATIONS CAREFULLY..."
        @input="onSpecificationChange"
      ></textarea>

      <!-- Character Count -->
      <div class="specification-footer mt-2 d-flex justify-content-between align-items-center">
        <small class="text-muted">
          Characters: {{ specificationText.length }}
          <span v-if="variableCount > 0" class="ms-3">
            <i class="bi bi-braces text-info"></i>
            {{ variableCount }} variable(s) detected
          </span>
        </small>
        <small v-if="hasChanges" class="text-warning">
          <i class="bi bi-exclamation-circle me-1"></i>
          Unsaved changes
        </small>
      </div>

      <!-- Variables Info -->
      <div v-if="detectedVariables.length > 0" class="mt-3">
        <div class="card">
          <div class="card-header py-2">
            <i class="bi bi-list-check me-2"></i>
            Detected Variables
          </div>
          <div class="card-body p-2">
            <div class="d-flex flex-wrap gap-2">
              <span
                v-for="variable in detectedVariables"
                :key="variable"
                class="badge bg-info"
              >
                {{ variable }}
              </span>
            </div>
            <small class="text-muted mt-2 d-block">
              <i class="bi bi-info-circle me-1"></i>
              These variables will be populated with job-specific data when generating reports
            </small>
          </div>
        </div>
      </div>

      <!-- Common Variables Helper -->
      <div class="mt-3">
        <button
          class="btn btn-sm btn-outline-secondary"
          @click="toggleCommonVariables"
        >
          <i class="bi bi-question-circle me-1"></i>
          Common Variables Reference
        </button>
      </div>

      <div v-if="showCommonVariables" class="mt-2 card">
        <div class="card-body p-3">
          <h6 class="card-title">Common Variables</h6>
          <div class="row">
            <div class="col-md-6">
              <ul class="list-unstyled small">
                <li><code>[Project Name]</code> - Project/job name</li>
                <li><code>[Lot Number]</code> - Lot number</li>
                <li><code>[Street]</code> - Street address</li>
                <li><code>[Suburb]</code> - Suburb</li>
                <li><code>[Builder Name]</code> - Builder name</li>
              </ul>
            </div>
            <div class="col-md-6">
              <ul class="list-unstyled small">
                <li><code>[Address Line 1]</code> - Address line 1</li>
                <li><code>[Address Line 2]</code> - Address line 2</li>
                <li><code>[Phone Number]</code> - Contact phone</li>
                <li><code>[Date]</code> - Current date</li>
                <li><code>[Estimator]</code> - Estimator name</li>
              </ul>
            </div>
          </div>
          <small class="text-muted">
            Click on any variable above to insert it at cursor position
          </small>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'SpecificationEditor',
  props: {
    priceCode: {
      type: String,
      default: null
    }
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const api = useElectronAPI();
    const loading = ref(false);
    const specificationText = ref('');
    const originalSpecification = ref('');
    const specificationTextarea = ref(null);
    const showCommonVariables = ref(false);

    // Computed
    const hasChanges = computed(() => {
      return specificationText.value !== originalSpecification.value;
    });

    const detectedVariables = computed(() => {
      const regex = /\[([^\]]+)\]/g;
      const matches = [];
      let match;

      while ((match = regex.exec(specificationText.value)) !== null) {
        const variable = match[0]; // Include the brackets
        if (!matches.includes(variable)) {
          matches.push(variable);
        }
      }

      return matches.sort();
    });

    const variableCount = computed(() => {
      return detectedVariables.value.length;
    });

    // Watch for item code changes
    watch(() => props.priceCode, (newValue) => {
      if (newValue) {
        loadSpecification();
      } else {
        specificationText.value = '';
        originalSpecification.value = '';
      }
    });

    async function loadSpecification() {
      if (!props.priceCode) return;

      loading.value = true;
      try {
        const result = await api.catalogueTemplates.getSpecification(props.priceCode);
        if (result.success && result.data) {
          specificationText.value = result.data.specification || '';
          originalSpecification.value = result.data.specification || '';

          if (result.warning) {
            console.warn(result.warning);
          }
        } else {
          console.error('Failed to load specification:', result.message);
        }
      } catch (error) {
        console.error('Error loading specification:', error);
      } finally {
        loading.value = false;
      }
    }

    async function saveSpecification() {
      if (!props.priceCode) return;

      loading.value = true;
      try {
        const result = await api.catalogueTemplates.updateSpecification({
          priceCode: props.priceCode,
          specification: specificationText.value
        });

        if (result.success) {
          originalSpecification.value = specificationText.value;
          emit('updated');
          alert('Specification saved successfully');
        } else {
          alert('Error saving specification: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving specification:', error);
        alert('Error saving specification: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function insertVariable() {
      const textarea = specificationTextarea.value;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = specificationText.value.substring(0, cursorPos);
      const textAfter = specificationText.value.substring(cursorPos);

      // Insert variable placeholder
      const variablePlaceholder = '[Variable Name]';
      specificationText.value = textBefore + variablePlaceholder + textAfter;

      // Select the "Variable Name" text so user can type to replace it
      setTimeout(() => {
        textarea.selectionStart = cursorPos + 1;
        textarea.selectionEnd = cursorPos + 14; // Length of "Variable Name"
        textarea.focus();
      }, 0);
    }

    function toggleCommonVariables() {
      showCommonVariables.value = !showCommonVariables.value;
    }

    function onSpecificationChange() {
      // Could add auto-save logic here if desired
    }

    // Load specification on mount if priceCode is provided
    if (props.priceCode) {
      loadSpecification();
    }

    return {
      loading,
      specificationText,
      specificationTextarea,
      showCommonVariables,
      hasChanges,
      detectedVariables,
      variableCount,
      loadSpecification,
      saveSpecification,
      insertVariable,
      toggleCommonVariables,
      onSpecificationChange
    };
  }
};
</script>

<style scoped>
.specification-editor {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.specification-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.specification-textarea {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 500px;
  resize: vertical;
  white-space: pre;
}

.specification-footer {
  padding: 0.5rem 0;
  border-top: 1px solid #dee2e6;
}

.alert-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
