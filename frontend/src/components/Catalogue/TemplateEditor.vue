<template>
  <div class="template-editor">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-file-text me-2"></i>
        Template (Workup Text)
        <span v-if="priceCode" class="text-muted small ms-2">({{ priceCode }})</span>
      </h6>
      <div class="btn-group btn-group-sm">
        <button
          class="btn btn-outline-secondary"
          @click="insertHide"
          :disabled="!priceCode || loading"
          title="Insert [HIDE] marker"
        >
          <i class="bi bi-eye-slash me-1"></i>
          Insert [HIDE]
        </button>
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
          @click="saveTemplate"
          :disabled="!priceCode || loading || !hasChanges"
        >
          <i class="bi bi-save me-1"></i>
          Save Template
        </button>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info alert-sm mb-3">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Template Purpose:</strong> Text entered here is loaded into the workup area when this item is added to a Bill of Quantities.
      Add <code>[HIDE]</code> to hide subsequent text in BOQ reports and purchase orders (useful for estimator notes).
    </div>

    <!-- Empty State -->
    <div v-if="!priceCode" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Select a catalogue item to edit its template
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center p-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Template Editor -->
    <div v-else class="template-editor-container">
      <textarea
        ref="templateTextarea"
        v-model="templateText"
        class="form-control template-textarea"
        placeholder="Enter template text here...

Example:
Enter Brick Pier Dimensions in Millimeters:

Height=
Length=

[HIDE]

Note:
* Add all Pier Faces For Pier Length
* Include Rebate Depth to Pier Height"
        @input="onTemplateChange"
      ></textarea>

      <!-- Character Count -->
      <div class="template-footer mt-2 d-flex justify-content-between align-items-center">
        <small class="text-muted">
          Characters: {{ templateText.length }}
          <span v-if="hideIndex >= 0" class="ms-3">
            <i class="bi bi-eye-slash text-warning"></i>
            [HIDE] marker at position {{ hideIndex }}
          </span>
        </small>
        <small v-if="hasChanges" class="text-warning">
          <i class="bi bi-exclamation-circle me-1"></i>
          Unsaved changes
        </small>
      </div>

      <!-- Preview Mode Toggle -->
      <div class="mt-3">
        <div class="form-check">
          <input
            class="form-check-input"
            type="checkbox"
            id="showPreview"
            v-model="showPreview"
          />
          <label class="form-check-label" for="showPreview">
            Show Preview (how it appears in BOQ reports)
          </label>
        </div>
      </div>

      <!-- Preview Panel -->
      <div v-if="showPreview" class="template-preview mt-3">
        <h6 class="mb-2">
          <i class="bi bi-eye me-2"></i>
          Preview (Visible in BOQ Reports)
        </h6>
        <div class="preview-box">
          <pre class="mb-0">{{ visibleText }}</pre>
        </div>
        <small class="text-muted">
          <i class="bi bi-info-circle me-1"></i>
          Text after [HIDE] is hidden from reports but available to estimators
        </small>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'TemplateEditor',
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
    const templateText = ref('');
    const originalTemplate = ref('');
    const templateTextarea = ref(null);
    const showPreview = ref(false);

    // Computed
    const hasChanges = computed(() => {
      return templateText.value !== originalTemplate.value;
    });

    const hideIndex = computed(() => {
      return templateText.value.indexOf('[HIDE]');
    });

    const visibleText = computed(() => {
      if (hideIndex.value >= 0) {
        return templateText.value.substring(0, hideIndex.value).trim();
      }
      return templateText.value;
    });

    // Watch for item code changes
    watch(() => props.priceCode, (newValue) => {
      if (newValue) {
        loadTemplate();
      } else {
        templateText.value = '';
        originalTemplate.value = '';
      }
    });

    async function loadTemplate() {
      if (!props.priceCode) return;

      loading.value = true;
      try {
        const result = await api.catalogueTemplates.getTemplate(props.priceCode);
        if (result.success && result.data) {
          templateText.value = result.data.template || '';
          originalTemplate.value = result.data.template || '';

          if (result.warning) {
            console.warn(result.warning);
          }
        } else {
          console.error('Failed to load template:', result.message);
        }
      } catch (error) {
        console.error('Error loading template:', error);
      } finally {
        loading.value = false;
      }
    }

    async function saveTemplate() {
      if (!props.priceCode) return;

      loading.value = true;
      try {
        const result = await api.catalogueTemplates.updateTemplate({
          priceCode: props.priceCode,
          template: templateText.value
        });

        if (result.success) {
          originalTemplate.value = templateText.value;
          emit('updated');
          alert('Template saved successfully');
        } else {
          alert('Error saving template: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Error saving template: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function insertHide() {
      const textarea = templateTextarea.value;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = templateText.value.substring(0, cursorPos);
      const textAfter = templateText.value.substring(cursorPos);

      templateText.value = textBefore + '\n[HIDE]\n\n' + textAfter;

      // Move cursor after [HIDE]
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + 8;
        textarea.focus();
      }, 0);
    }

    function insertVariable() {
      const textarea = templateTextarea.value;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = templateText.value.substring(0, cursorPos);
      const textAfter = templateText.value.substring(cursorPos);

      // Insert variable placeholder
      const variablePlaceholder = '[Variable Name]=';
      templateText.value = textBefore + variablePlaceholder + textAfter;

      // Select the "Variable Name" text so user can type to replace it
      setTimeout(() => {
        textarea.selectionStart = cursorPos + 1;
        textarea.selectionEnd = cursorPos + 14; // Length of "Variable Name"
        textarea.focus();
      }, 0);
    }

    function onTemplateChange() {
      // Could add auto-save logic here if desired
    }

    // Load template on mount if priceCode is provided
    if (props.priceCode) {
      loadTemplate();
    }

    return {
      loading,
      templateText,
      templateTextarea,
      showPreview,
      hasChanges,
      hideIndex,
      visibleText,
      loadTemplate,
      saveTemplate,
      insertHide,
      insertVariable,
      onTemplateChange
    };
  }
};
</script>

<style scoped>
.template-editor {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-editor-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.template-textarea {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 400px;
  resize: vertical;
  white-space: pre;
}

.template-footer {
  padding: 0.5rem 0;
  border-top: 1px solid #dee2e6;
}

.template-preview {
  padding: 1rem;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.preview-box {
  background-color: white;
  padding: 1rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.preview-box pre {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.alert-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}
</style>
