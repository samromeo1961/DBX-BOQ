<template>
  <div class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Recipe Management - {{ priceCode }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <!-- Loading State -->
          <div v-if="loading" class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>

          <!-- Main Content -->
          <div v-else>
            <!-- Main Item Info -->
            <div class="card mb-3 bg-light">
              <div class="card-body">
                <div class="row mb-2">
                  <div class="col-12">
                    <strong>Item Code:</strong> {{ priceCode }}
                  </div>
                </div>
                <div class="row">
                  <div class="col-12">
                    <strong>Description:</strong> {{ mainItemDescription || '(No description)' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Add Component Section -->
            <div class="mb-3">
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label small">Select Item to Add</label>
                  <div class="input-group input-group-sm">
                    <input
                      type="text"
                      v-model="searchTerm"
                      class="form-control"
                      placeholder="Search catalogue items..."
                      @input="searchCatalogue"
                    />
                    <button
                      v-if="searchTerm"
                      class="btn btn-outline-secondary"
                      type="button"
                      @click="clearSearch"
                      title="Clear search"
                    >
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                  <!-- Search Results Dropdown -->
                  <div v-if="searchResults.length > 0" class="search-results border mt-1 bg-white" style="max-height: 200px; overflow-y: auto; position: absolute; z-index: 1000; width: calc(50% - 16px);">
                    <div
                      v-for="item in searchResults"
                      :key="item.PriceCode"
                      class="search-result-item p-2 border-bottom cursor-pointer"
                      @click="selectItem(item)"
                      style="cursor: pointer;"
                    >
                      <strong>{{ item.PriceCode }}</strong> - {{ item.Description }}
                    </div>
                  </div>
                </div>
                <div class="col-md-3">
                  <label class="form-label small">Quantity</label>
                  <input
                    type="number"
                    v-model.number="newQuantity"
                    class="form-control form-control-sm"
                    step="0.001"
                    placeholder="Quantity"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label small">&nbsp;</label>
                  <button
                    class="btn btn-sm btn-primary w-100"
                    @click="addComponent"
                    :disabled="!selectedItem || !newQuantity"
                  >
                    <i class="bi bi-plus-lg"></i> Add Component
                  </button>
                </div>
              </div>
            </div>

            <!-- Recipe Components Grid -->
            <div class="recipe-grid" style="height: 400px;">
              <ag-grid-vue
                class="ag-theme-quartz"
                :columnDefs="columnDefs"
                :rowData="components"
                :defaultColDef="defaultColDef"
                :getRowStyle="getRowStyle"
                @grid-ready="onGridReady"
                @cell-value-changed="onCellValueChanged"
                style="height: 100%;"
              />
            </div>

            <!-- Summary -->
            <div class="mt-3 text-end text-muted small">
              <strong>Total Components:</strong> {{ components.length }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Close
          </button>
        </div>
      </div>
    </div>

    <!-- Formula Builder Modal -->
    <div v-if="showFormulaBuilder" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.6); z-index: 1060;">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-calculator me-2"></i>
              Formula Builder - {{ formulaBuilderData.subItem }}
            </h5>
            <button type="button" class="btn-close" @click="closeFormulaBuilder"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <strong>Sub-Item:</strong> {{ formulaBuilderData.subItem }} - {{ formulaBuilderData.description }}
            </div>
            <FormulaBuilder
              v-model="formulaBuilderData.formula"
              @validation-change="onFormulaValidation"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeFormulaBuilder">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveFormula"
              :disabled="!formulaIsValid"
            >
              <i class="bi bi-check-circle me-1"></i>
              Save Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import { calculateFormulaQuantity } from '@/utils/formulaCalculator';
import FormulaBuilder from './FormulaBuilder.vue';

export default {
  name: 'RecipeManagementModal',
  components: {
    AgGridVue,
    FormulaBuilder
  },
  props: {
    priceCode: String
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const api = useElectronAPI();
    const loading = ref(false);
    const components = ref([]);
    const mainItemDescription = ref('');
    const searchTerm = ref('');
    const searchResults = ref([]);
    const selectedItem = ref(null);
    const newQuantity = ref(1);
    const gridApi = ref(null);
    let searchTimeout = null;

    // Formula Builder state
    const showFormulaBuilder = ref(false);
    const formulaBuilderData = ref({
      subItem: '',
      description: '',
      formula: '',
      originalFormula: ''
    });
    const formulaIsValid = ref(true);

    // Define functions before columnDefs so they're available in onCellClicked
    async function deleteComponent(data) {
      if (!confirm(`Remove ${data.SubItem} from recipe?`)) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.catalogue.deleteRecipeComponent(
          props.priceCode,
          data.SubItem
        );

        if (result.success) {
          await loadRecipe();
          emit('saved');
        } else {
          alert('Error deleting component: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting component:', error);
        alert('Error deleting component: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function replaceComponent(oldData) {
      // For now, disable replace functionality - will implement proper modal later
      alert('Replace functionality: Please delete the old component and add a new one instead.\n\nThis feature will be enhanced in a future update to use a proper dialog.');
      return;

      /* TODO: Implement proper replace modal dialog
      const replacement = prompt(`Replace ${oldData.SubItem} with (enter new item code):`);
      if (!replacement || replacement.trim() === '') {
        return;
      }

      const quantity = parseFloat(prompt('Enter quantity for replacement item:', oldData.Quantity));
      if (isNaN(quantity) || quantity <= 0) {
        alert('Invalid quantity');
        return;
      }

      loading.value = true;
      try {
        // Delete old component
        await api.catalogue.deleteRecipeComponent(props.priceCode, oldData.SubItem);

        // Add new component
        const result = await api.catalogue.addRecipeComponent(
          props.priceCode,
          replacement.trim(),
          quantity
        );

        if (result.success) {
          await loadRecipe();
          emit('saved');
          alert(`Successfully replaced ${oldData.SubItem} with ${replacement.trim()}`);
        } else {
          alert('Error adding replacement: ' + result.message);
          // Try to re-add the old one
          await api.catalogue.addRecipeComponent(props.priceCode, oldData.SubItem, oldData.Quantity);
          await loadRecipe();
        }
      } catch (error) {
        console.error('Error replacing component:', error);
        alert('Error replacing component: ' + error.message);
        await loadRecipe();
      } finally {
        loading.value = false;
      }
      */
    }

    function openFormulaBuilder(data) {
      formulaBuilderData.value = {
        subItem: data.SubItem,
        description: data.Description || '',
        formula: data.Formula || '',
        originalFormula: data.Formula || ''
      };
      showFormulaBuilder.value = true;
      formulaIsValid.value = true;
    }

    const columnDefs = ref([
      {
        field: 'SubItem',
        headerName: 'Sub-Item Code',
        width: 150,
        editable: false,
        pinned: 'left',
        cellStyle: { fontWeight: 'bold', backgroundColor: '#f8f9fa' }
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200,
        editable: false
      },
      {
        field: 'Formula',
        headerName: 'Formula',
        width: 200,
        editable: true,
        cellEditor: 'agTextCellEditor',
        cellEditorParams: {
          maxLength: 200
        },
        cellStyle: { fontStyle: 'italic', color: '#666', backgroundColor: '#fffef0' },
        headerTooltip: 'Click to edit and test formulas'
      },
      {
        field: 'Quantity',
        headerName: 'Base Qty',
        width: 100,
        editable: true,
        type: 'numericColumn',
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          min: 0,
          precision: 3
        },
        valueFormatter: params => params.value ? params.value.toFixed(3) : '0.000',
        headerTooltip: 'Base quantity from recipe'
      },
      {
        field: 'CalculatedQty',
        headerName: 'Calc Qty',
        width: 100,
        editable: false,
        type: 'numericColumn',
        valueGetter: params => {
          if (!params.data) return null;

          // If formula exists and has brackets, calculate it
          if (params.data.Formula && params.data.Formula.includes('[')) {
            try {
              const calcQty = calculateFormulaQuantity(params.data.Formula, 1);
              // If calculation succeeded, return it; otherwise fallback to Base Qty
              return calcQty !== null ? calcQty : params.data.Quantity;
            } catch (e) {
              // On error, return Base Qty
              return params.data.Quantity;
            }
          }

          // For non-bracketed formulas or no formula, return Base Qty
          return params.data.Quantity;
        },
        valueFormatter: params => {
          if (params.value === null || params.value === undefined) return '';
          return params.value.toFixed(3);
        },
        headerTooltip: 'Calculated quantity when parent item qty = 1 (shows Base Qty for non-bracketed formulas)',
        cellStyle: params => {
          // Different styling if it's a calculated value vs base qty
          const hasFormula = params.data && params.data.Formula && params.data.Formula.includes('[');
          return {
            fontStyle: 'italic',
            color: hasFormula ? '#0066cc' : '#666',
            backgroundColor: hasFormula ? '#f0f8ff' : '#f9f9f9'
          };
        }
      },
      {
        field: 'Unit',
        headerName: 'Unit',
        width: 80,
        editable: false
      },
      {
        headerName: 'Actions',
        width: 200,
        cellRenderer: params => {
          return `
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-sm btn-info formula-btn" title="Formula Builder"><i class="bi bi-calculator"></i></button>
              <button class="btn btn-sm btn-warning replace-btn" title="Replace"><i class="bi bi-arrow-left-right"></i></button>
              <button class="btn btn-sm btn-danger delete-btn" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
          `;
        },
        onCellClicked: params => {
          if (params.event.target.closest('.delete-btn')) {
            deleteComponent(params.data);
          } else if (params.event.target.closest('.replace-btn')) {
            replaceComponent(params.data);
          } else if (params.event.target.closest('.formula-btn')) {
            openFormulaBuilder(params.data);
          }
        }
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      resizable: true
    });

    async function loadRecipe() {
      loading.value = true;
      try {
        // Load main item details
        const mainItemResult = await api.catalogue.getItem(props.priceCode, 1);
        console.log('📦 Recipe Modal - Main Item Result:', mainItemResult);
        if (mainItemResult.success && mainItemResult.data) {
          console.log('📦 Main Item Data:', mainItemResult.data);
          console.log('📦 Description value:', mainItemResult.data.Description);
          mainItemDescription.value = mainItemResult.data.Description || '';
          console.log('📦 Set mainItemDescription to:', mainItemDescription.value);
        }

        // Load recipe components
        const result = await api.catalogue.getRecipe(props.priceCode);
        console.log('📦 Recipe Components Result:', result);
        if (result.success) {
          components.value = result.data || [];
          console.log('📦 Components loaded:', components.value.length);
        } else {
          console.error('❌ Failed to load recipe components:', result.message);
          alert('Error loading recipe components: ' + result.message);
        }
      } catch (error) {
        console.error('❌ Error loading recipe:', error);
        alert('Error loading recipe: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function searchCatalogue() {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (searchTerm.value.length < 2) {
        searchResults.value = [];
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const result = await api.catalogue.getAllItems({
            searchTerm: searchTerm.value,
            showArchived: false
          });
          if (result.success) {
            // Filter out the current recipe item and items already in the recipe
            const existing = components.value.map(c => c.SubItem);
            searchResults.value = (result.data || [])
              .filter(item => item.PriceCode !== props.priceCode && !existing.includes(item.PriceCode))
              .slice(0, 10);
          }
        } catch (error) {
          console.error('Error searching catalogue:', error);
        }
      }, 300);
    }

    function selectItem(item) {
      selectedItem.value = item;
      searchTerm.value = `${item.PriceCode} - ${item.Description}`;
      searchResults.value = [];
    }

    function clearSearch() {
      searchTerm.value = '';
      searchResults.value = [];
      selectedItem.value = null;
    }

    async function addComponent() {
      if (!selectedItem.value || !newQuantity.value) {
        return;
      }

      loading.value = true;
      try {
        const result = await api.catalogue.addRecipeComponent(
          props.priceCode,
          selectedItem.value.PriceCode,
          newQuantity.value
        );

        if (result.success) {
          await loadRecipe();
          // Reset form
          searchTerm.value = '';
          selectedItem.value = null;
          newQuantity.value = 1;
          emit('saved');
        } else {
          alert('Error adding component: ' + result.message);
        }
      } catch (error) {
        console.error('Error adding component:', error);
        alert('Error adding component: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function onCellValueChanged(event) {
      const { data, colDef } = event;
      loading.value = true;
      try {
        // Check if formula was changed
        if (colDef.field === 'Formula') {
          // Update formula in database
          const result = await api.catalogue.updateRecipeFormula(
            props.priceCode,
            data.SubItem,
            data.Formula
          );

          if (!result.success) {
            alert('Error updating formula: ' + result.message);
          }

          // Always reload recipe to refresh calculated quantities
          await loadRecipe();
          emit('saved');
        } else {
          // Update quantity
          const result = await api.catalogue.updateRecipeComponent(
            props.priceCode,
            data.SubItem,
            data.Quantity
          );

          if (!result.success) {
            alert('Error updating quantity: ' + result.message);
            await loadRecipe();
          } else {
            emit('saved');
          }
        }
      } catch (error) {
        console.error('Error updating component:', error);
        await loadRecipe();
      } finally {
        loading.value = false;
      }
    }

    function getRowStyle(params) {
      // Apply orange text color and italic style to archived sub-items
      if (params.data && params.data.Archived) {
        return {
          color: '#ff8c00',
          fontStyle: 'italic'
        };
      }
      return null;
    }

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    function closeFormulaBuilder() {
      showFormulaBuilder.value = false;
      formulaBuilderData.value = {
        subItem: '',
        description: '',
        formula: '',
        originalFormula: ''
      };
    }

    function onFormulaValidation(validation) {
      formulaIsValid.value = validation.isValid;
    }

    async function saveFormula() {
      if (!formulaIsValid.value) {
        alert('Please fix formula errors before saving');
        return;
      }

      loading.value = true;
      try {
        const result = await api.catalogue.updateRecipeFormula(
          props.priceCode,
          formulaBuilderData.value.subItem,
          formulaBuilderData.value.formula
        );

        if (result.success) {
          await loadRecipe();
          emit('saved');
          closeFormulaBuilder();
        } else {
          alert('Error saving formula: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving formula:', error);
        alert('Error saving formula: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      loadRecipe();
    });

    return {
      loading,
      components,
      mainItemDescription,
      searchTerm,
      searchResults,
      selectedItem,
      newQuantity,
      columnDefs,
      defaultColDef,
      getRowStyle,
      searchCatalogue,
      selectItem,
      clearSearch,
      addComponent,
      onCellValueChanged,
      deleteComponent,
      replaceComponent,
      onGridReady,
      calculateFormulaQuantity,
      // Formula Builder
      showFormulaBuilder,
      formulaBuilderData,
      formulaIsValid,
      openFormulaBuilder,
      closeFormulaBuilder,
      onFormulaValidation,
      saveFormula
    };
  }
};
</script>

<style scoped>
.search-result-item:hover {
  background-color: #f8f9fa;
}

.recipe-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
}
</style>
