<template>
  <div class="template-editor">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-file-text me-2"></i>
        Template (Workup Text)
        <span v-if="priceCode" class="text-muted small ms-2">({{ priceCode }})</span>
      </h6>
      <div class="d-flex gap-2">
        <div class="btn-group btn-group-sm">
          <button
            class="btn btn-outline-secondary"
            @click="showCopyTemplateModal = true"
            :disabled="!priceCode || loading"
            title="Copy template from another item"
          >
            <i class="bi bi-copy me-1"></i>
            Copy From...
          </button>
          <button
            class="btn btn-outline-info"
            @click="showSnippetsModal = true"
            :disabled="!priceCode || loading"
            title="Insert template snippet"
          >
            <i class="bi bi-puzzle me-1"></i>
            Snippets
          </button>
        </div>
        <div class="btn-group btn-group-sm">
          <button
            class="btn btn-outline-secondary"
            @click="insertHide"
            :disabled="!priceCode || loading"
            title="Insert [HIDE] marker"
          >
            <i class="bi bi-eye-slash me-1"></i>
            [HIDE]
          </button>
          <button
            class="btn btn-outline-primary dropdown-toggle"
            @click="showVariableDropdown = !showVariableDropdown"
            :disabled="!priceCode || loading"
            title="Insert variable"
          >
            <i class="bi bi-braces me-1"></i>
            Variable
          </button>
        </div>
        <button
          class="btn btn-primary btn-sm"
          @click="saveTemplate"
          :disabled="!priceCode || loading || !hasChanges"
        >
          <i class="bi bi-save me-1"></i>
          Save
        </button>
      </div>
    </div>

    <!-- Variable Dropdown Menu -->
    <div v-if="showVariableDropdown" class="variable-dropdown">
      <div class="list-group list-group-flush">
        <button
          v-for="variable in commonVariables"
          :key="variable.name"
          class="list-group-item list-group-item-action"
          @click="insertVariableFromList(variable)"
        >
          <strong>{{ variable.name }}</strong>
          <small class="d-block text-muted">{{ variable.description }}</small>
        </button>
        <button
          class="list-group-item list-group-item-action text-primary"
          @click="insertCustomVariable"
        >
          <i class="bi bi-plus-circle me-1"></i>
          Custom Variable...
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

    <!-- Copy Template Modal -->
    <div v-if="showCopyTemplateModal" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Copy Template from Another Item</h5>
            <button type="button" class="btn-close" @click="showCopyTemplateModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <input
                type="text"
                class="form-control"
                placeholder="Search catalogue items by code or description..."
                v-model="copyTemplateSearch"
              />
            </div>
            <div v-if="catalogueItems.length === 0" class="text-center p-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="text-muted mt-2">Loading catalogue items...</p>
            </div>
            <div v-else class="catalogue-items-list" style="max-height: 400px; overflow-y: auto;">
              <div
                v-for="item in filteredCatalogueItems"
                :key="item.PriceCode"
                class="list-group-item list-group-item-action"
                @click="copyTemplateFrom(item)"
                style="cursor: pointer;"
              >
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                      <strong>{{ item.PriceCode }}</strong>
                      <span v-if="item.Template && item.Template.trim()" class="badge bg-success ms-2">
                        <i class="bi bi-file-text"></i> Has Template
                      </span>
                      <span v-else class="badge bg-secondary ms-2">
                        <i class="bi bi-file-text"></i> No Template
                      </span>
                    </div>
                    <div class="small text-muted">{{ item.Description }}</div>
                    <div v-if="item.Template && item.Template.trim()" class="small text-info mt-1">
                      <i class="bi bi-eye me-1"></i>
                      {{ item.Template.substring(0, 100) }}{{ item.Template.length > 100 ? '...' : '' }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="filteredCatalogueItems.length === 0" class="text-center p-4 text-muted">
                No items found matching "{{ copyTemplateSearch }}"
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCopyTemplateModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Snippets Modal -->
    <div v-if="showSnippetsModal" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Template Snippets</h5>
            <button type="button" class="btn-close" @click="showSnippetsModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div
                v-for="snippet in templateSnippets"
                :key="snippet.name"
                class="col-md-6"
              >
                <div class="card h-100">
                  <div class="card-body">
                    <h6 class="card-title">
                      <i :class="snippet.icon" class="me-2"></i>
                      {{ snippet.name }}
                    </h6>
                    <p class="card-text small text-muted">{{ snippet.description }}</p>
                    <pre class="small bg-light p-2 rounded" style="max-height: 150px; overflow-y: auto;">{{ snippet.template }}</pre>
                    <button class="btn btn-sm btn-primary" @click="insertSnippet(snippet)">
                      <i class="bi bi-plus-circle me-1"></i>
                      Insert Snippet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showSnippetsModal = false">Close</button>
          </div>
        </div>
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
    const showVariableDropdown = ref(false);
    const showCopyTemplateModal = ref(false);
    const showSnippetsModal = ref(false);
    const copyTemplateSearch = ref('');
    const catalogueItems = ref([]);

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

    // Common variables for dropdown
    const commonVariables = ref([
      { name: 'Height', description: 'Height dimension in mm' },
      { name: 'Width', description: 'Width dimension in mm' },
      { name: 'Length', description: 'Length dimension in mm' },
      { name: 'Depth', description: 'Depth dimension in mm' },
      { name: 'Thickness', description: 'Thickness dimension in mm' },
      { name: 'Diameter', description: 'Diameter dimension in mm' },
      { name: 'Quantity', description: 'Number of units' },
      { name: 'Colour', description: 'Colour or finish' },
      { name: 'Material', description: 'Material specification' },
      { name: 'Grade', description: 'Material grade' },
      { name: 'Size', description: 'General size specification' },
      { name: 'Type', description: 'Type or variant' }
    ]);

    // Template snippets
    const templateSnippets = ref([
      {
        name: 'Dimensions Input',
        icon: 'bi bi-rulers',
        description: 'Standard dimension inputs',
        template: `Enter dimensions in Millimeters:

Height=
Width=
Length=`
      },
      {
        name: 'Material Specification',
        icon: 'bi bi-box',
        description: 'Material and grade specification',
        template: `Specify Material:

Material=
Grade=
Finish=`
      },
      {
        name: 'Quantity and Notes',
        icon: 'bi bi-list-ol',
        description: 'Quantity with estimator notes',
        template: `Quantity=

[HIDE]

Estimator Notes:
*
* `
      },
      {
        name: 'Brick/Block Details',
        icon: 'bi bi-grid-3x3',
        description: 'Standard brick/block dimensions',
        template: `Enter Brick Dimensions in Millimeters:

Height=
Length=
Course Count=

[HIDE]

Notes:
* Include for mortar joints
* Check bond pattern`
      },
      {
        name: 'Concrete Pour',
        icon: 'bi bi-triangle',
        description: 'Concrete specifications',
        template: `Concrete Specification:

Volume (m³)=
Grade=
Slump=

[HIDE]

Notes:
* Pump required for access
* Curing time: 28 days`
      },
      {
        name: 'Steel/Reinforcement',
        icon: 'bi bi-diagram-3',
        description: 'Steel reinforcement details',
        template: `Reinforcement Details:

Bar Size=
Spacing=
Length=

[HIDE]

Notes:
* Check cover requirements
* Lap lengths as per AS3600`
      }
    ]);

    // Filtered catalogue items (all items, searchable)
    const filteredCatalogueItems = computed(() => {
      if (!copyTemplateSearch.value) {
        return catalogueItems.value;
      }

      const query = copyTemplateSearch.value.toLowerCase();
      return catalogueItems.value.filter(item =>
        item.PriceCode.toLowerCase().includes(query) ||
        item.Description?.toLowerCase().includes(query)
      );
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

    // Load catalogue items for copy template feature
    async function loadCatalogueItems() {
      try {
        const result = await api.catalogue.getAllItems();
        if (result.success) {
          catalogueItems.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading catalogue items:', error);
      }
    }

    // Insert variable from dropdown list
    function insertVariableFromList(variable) {
      const textarea = templateTextarea.value;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = templateText.value.substring(0, cursorPos);
      const textAfter = templateText.value.substring(cursorPos);

      const variableText = `${variable.name}=`;
      templateText.value = textBefore + variableText + textAfter;

      showVariableDropdown.value = false;

      // Move cursor after the variable
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + variableText.length;
        textarea.focus();
      }, 0);
    }

    // Insert custom variable
    function insertCustomVariable() {
      showVariableDropdown.value = false;
      insertVariable(); // Call existing insertVariable function
    }

    // Copy template from another item
    function copyTemplateFrom(item) {
      if (confirm(`Copy template from ${item.PriceCode}?\n\nThis will replace your current template.`)) {
        templateText.value = item.Template || '';
        showCopyTemplateModal.value = false;
        copyTemplateSearch.value = '';
      }
    }

    // Insert snippet
    function insertSnippet(snippet) {
      const textarea = templateTextarea.value;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBefore = templateText.value.substring(0, cursorPos);
      const textAfter = templateText.value.substring(cursorPos);

      templateText.value = textBefore + snippet.template + textAfter;

      showSnippetsModal.value = false;

      // Move cursor to end of inserted snippet
      setTimeout(() => {
        const newPos = cursorPos + snippet.template.length;
        textarea.selectionStart = textarea.selectionEnd = newPos;
        textarea.focus();
      }, 0);
    }

    // Close variable dropdown when clicking outside
    function handleClickOutside(event) {
      if (showVariableDropdown.value && !event.target.closest('.variable-dropdown')) {
        showVariableDropdown.value = false;
      }
    }

    // Load template and catalogue items on mount
    if (props.priceCode) {
      loadTemplate();
    }
    loadCatalogueItems();

    // Add click outside listener
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    return {
      loading,
      templateText,
      templateTextarea,
      showPreview,
      showVariableDropdown,
      showCopyTemplateModal,
      showSnippetsModal,
      copyTemplateSearch,
      catalogueItems,
      hasChanges,
      hideIndex,
      visibleText,
      commonVariables,
      templateSnippets,
      filteredCatalogueItems,
      loadTemplate,
      saveTemplate,
      insertHide,
      insertVariable,
      insertVariableFromList,
      insertCustomVariable,
      copyTemplateFrom,
      insertSnippet,
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

.variable-dropdown {
  position: absolute;
  top: 70px;
  right: 15px;
  z-index: 1000;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  min-width: 300px;
  max-height: 400px;
  overflow-y: auto;
}

.variable-dropdown .list-group-item {
  cursor: pointer;
  border-left: none;
  border-right: none;
  border-radius: 0;
}

.variable-dropdown .list-group-item:first-child {
  border-top: none;
}

.variable-dropdown .list-group-item:last-child {
  border-bottom: none;
}

.variable-dropdown .list-group-item:hover {
  background-color: #f8f9fa;
}
</style>
