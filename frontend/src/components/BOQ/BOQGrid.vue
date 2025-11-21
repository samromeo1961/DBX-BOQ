<template>
  <div class="boq-grid-wrapper h-100 p-2">
    <!-- Grid Header -->
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0">Bill Items</h6>
      <div class="d-flex gap-2">
        <button
          v-if="costCentre"
          class="btn btn-sm btn-primary"
          @click="showAssignSupplierModal = true"
          title="Assign Supplier to Load"
        >
          <i class="bi bi-truck"></i>
          Assign Supplier
        </button>
        <button
          v-if="selectedRows.length === 1"
          class="btn btn-sm btn-outline-secondary"
          @click="showDocumentsModal = true"
          title="Link documents to item"
        >
          <i class="bi bi-paperclip"></i>
          Documents
        </button>
        <button
          v-if="selectedRows.length > 0"
          class="btn btn-sm btn-danger"
          @click="deleteSelected"
          title="Delete selected items"
        >
          <i class="bi bi-trash"></i>
          Delete ({{ selectedRows.length }})
        </button>
      </div>
    </div>

    <!-- AG Grid -->
    <ag-grid-vue
      class="ag-theme-quartz"
      :columnDefs="columnDefs"
      :rowData="billItems"
      :defaultColDef="defaultColDef"
      :rowSelection="'multiple'"
      :suppressRowClickSelection="true"
      :enableRangeSelection="true"
      :getRowStyle="getRowStyle"
      @grid-ready="onGridReady"
      @cell-value-changed="onCellValueChanged"
      @cell-double-clicked="onCellDoubleClicked"
      @selection-changed="onSelectionChanged"
      style="height: calc(100% - 40px);"
    />

    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Assign Supplier Modal -->
    <AssignSupplierModal
      v-if="showAssignSupplierModal"
      :jobNo="jobNo"
      :costCentre="costCentre"
      :availableLoads="availableLoads"
      :selectedItems="selectedRows"
      @close="showAssignSupplierModal = false"
      @assigned="onSupplierAssigned"
    />

    <!-- Documents Modal -->
    <div v-if="showDocumentsModal && selectedRows.length === 1" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-paperclip me-2"></i>
              Item Documents - {{ selectedRows[0]?.ItemCode }}
            </h5>
            <button type="button" class="btn-close" @click="showDocumentsModal = false"></button>
          </div>
          <div class="modal-body">
            <DocumentLinkPanel
              entityType="BOQItem"
              :entityCode="selectedEntityCode"
              :entityLabel="selectedRows[0]?.Description || selectedRows[0]?.ItemCode"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDocumentsModal = false">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import AssignSupplierModal from './AssignSupplierModal.vue';
import DocumentLinkPanel from '@/components/Documents/DocumentLinkPanel.vue';

export default {
  name: 'BOQGrid',
  components: {
    AgGridVue,
    AssignSupplierModal,
    DocumentLinkPanel
  },
  props: {
    billItems: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    jobNo: String,
    costCentre: String,
    availableLoads: {
      type: Array,
      default: () => []
    }
  },
  emits: ['cellValueChanged', 'deleteItems', 'refresh', 'openWorkupModal'],
  setup(props, { emit }) {
    const gridApi = ref(null);
    const selectedRows = ref([]);
    const showAssignSupplierModal = ref(false);
    const showDocumentsModal = ref(false);

    // Computed entity code for document linking (BOQ item composite key)
    const selectedEntityCode = computed(() => {
      if (selectedRows.value.length !== 1) return '';
      const item = selectedRows.value[0];
      return `${props.jobNo}|${props.costCentre}|${item.BLoad || ''}|${item.LineNumber || ''}`;
    });

    const columnDefs = ref([
      {
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left',
        lockPosition: true
      },
      {
        field: 'ItemCode',
        headerName: 'Code',
        width: 150,
        editable: false,
        pinned: 'left'
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 1,
        editable: (params) => {
          // Only adhoc items (blank/null description) can have description edited
          if (!params.data) return false;
          const desc = params.data.Description;
          // Adhoc = null, undefined, or empty/whitespace string
          return desc === null || desc === undefined || (typeof desc === 'string' && desc.trim() === '');
        },
        // For adhoc items, show workup first line as editable value
        valueGetter: (params) => {
          if (!params.data) return '';
          const desc = params.data.Description;
          const isAdhoc = desc === null || desc === undefined || (typeof desc === 'string' && desc.trim() === '');
          if (isAdhoc) {
            // Return first line of workup for editing
            const workup = params.data.Workup || '';
            return workup.split('\n')[0]?.trim() || '';
          }
          return desc || '';
        },
        cellRenderer: (params) => {
          // Check if this is an adhoc item (null, undefined, or empty description)
          if (!params.data) return '';
          const desc = params.value;
          // Adhoc = null, undefined, or empty/whitespace string
          const isAdhoc = desc === null || desc === undefined || (typeof desc === 'string' && desc.trim() === '');

          if (isAdhoc) {
            // For adhoc items, show first line of workup as description
            const workup = params.data.Workup || '';
            const firstLine = workup.split('\n')[0]?.trim();

            if (firstLine) {
              return `<div style="display: flex; align-items: center; gap: 5px;">
                <i class="bi bi-file-text text-warning" title="Adhoc item - description from workup"></i>
                <span>${firstLine}</span>
              </div>`;
            }
            return `<div style="display: flex; align-items: center; gap: 5px;">
              <i class="bi bi-file-text text-warning" title="Adhoc item - click to add workup"></i>
              <span style="font-style: italic; color: #6c757d;">(adhoc - double-click to set description)</span>
            </div>`;
          }
          return desc || '';
        },
        minWidth: 200
      },
      {
        field: 'Quantity',
        headerName: 'Qty',
        width: 100,
        editable: true,
        type: 'numericColumn',
        valueParser: params => {
          const newValue = parseFloat(params.newValue);
          return isNaN(newValue) ? params.oldValue : newValue;
        },
        cellStyle: params => {
          return params.value > 0 ? null : { backgroundColor: '#fff3cd' };
        }
      },
      {
        field: 'Unit',
        headerName: 'Unit',
        width: 80,
        editable: false
      },
      {
        field: 'UnitPrice',
        headerName: 'Unit Price',
        width: 120,
        editable: true,
        type: 'numericColumn',
        valueFormatter: params => {
          return params.value !== null && params.value !== undefined
            ? `$${params.value.toFixed(2)}`
            : '';
        },
        valueParser: params => {
          const newValue = parseFloat(params.newValue.toString().replace('$', ''));
          return isNaN(newValue) ? params.oldValue : newValue;
        }
      },
      {
        field: 'LineTotal',
        headerName: 'Total',
        width: 120,
        editable: false,
        type: 'numericColumn',
        valueFormatter: params => {
          return params.value !== null && params.value !== undefined
            ? `$${params.value.toFixed(2)}`
            : '';
        },
        cellStyle: { fontWeight: '600' }
      },
      {
        field: 'Workup',
        headerName: 'Workup/Notes',
        width: 200,
        editable: false, // Disable inline editing, use modal instead
        cellRenderer: (params) => {
          const workup = params.value || '';
          const preview = workup.length > 30 ? workup.substring(0, 30) + '...' : workup;
          return `<div class="workup-cell" style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
            <i class="bi bi-pencil-square text-primary"></i>
            <span style="flex: 1;">${preview || '(click to add)'}</span>
          </div>`;
        },
        tooltipValueGetter: (params) => params.value || 'Double-click to edit workup'
      },
      {
        field: 'CostCentre',
        headerName: 'Cost Centre',
        width: 120,
        editable: false
      },
      {
        field: 'BLoad',
        headerName: 'Load',
        width: 80,
        editable: true,
        type: 'numericColumn',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: () => ({
          values: props.availableLoads
        })
      },
      {
        field: 'SupplierName',
        headerName: 'Supplier',
        width: 150,
        editable: false,
        cellStyle: params => {
          return params.value ? { backgroundColor: '#e7f3ff' } : null;
        }
      },
      {
        field: 'Recipe',
        headerName: 'Recipe',
        width: 80,
        editable: false,
        cellRenderer: params => {
          return params.value ? '<i class="bi bi-box-seam text-info"></i>' : '';
        }
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true,
      suppressKeyboardEvent: (params) => {
        // Allow Enter key to edit cell
        if (!params.editing && params.event.key === 'Enter') {
          return false;
        }
        return false;
      }
    });

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    // Watch for changes to billItems and refresh the grid
    watch(() => props.billItems, (newItems, oldItems) => {
      if (gridApi.value) {
        console.log('🔄 Refreshing grid with', props.billItems.length, 'items');
        // Use redrawRows to fully re-render rows (needed for custom cell renderers like Description showing Workup)
        gridApi.value.redrawRows();
      }
    }, { deep: true });

    function onCellValueChanged(event) {
      emit('cellValueChanged', event);
    }

    function onCellDoubleClicked(event) {
      // Open workup modal when Workup cell is double-clicked
      if (event.colDef.field === 'Workup') {
        emit('openWorkupModal', event.data);
      }
    }

    function onSelectionChanged() {
      if (gridApi.value) {
        selectedRows.value = gridApi.value.getSelectedRows();
      }
    }

    function deleteSelected() {
      if (selectedRows.value.length > 0) {
        emit('deleteItems', selectedRows.value);
      }
    }

    function onSupplierAssigned(data) {
      console.log(`✅ Supplier assigned to Load ${data.load}: ${data.rowsAffected} items updated`);
      // Emit refresh event to reload the grid data
      emit('refresh');
    }

    function getRowStyle(params) {
      // Apply orange text color to archived items
      if (params.data && params.data.Archived) {
        return {
          color: '#ff8c00' // Orange color for archived items
        };
      }

      // Apply subtle background color to adhoc items (null, undefined, or empty description)
      if (params.data) {
        const desc = params.data.Description;
        const isAdhoc = desc === null || desc === undefined || (typeof desc === 'string' && desc.trim() === '');

        if (isAdhoc) {
          return {
            backgroundColor: '#fffbf0' // Very light yellow background for adhoc items
          };
        }
      }

      return null;
    }

    return {
      gridApi,
      selectedRows,
      showAssignSupplierModal,
      showDocumentsModal,
      selectedEntityCode,
      columnDefs,
      defaultColDef,
      onGridReady,
      onCellValueChanged,
      onCellDoubleClicked,
      onSelectionChanged,
      deleteSelected,
      onSupplierAssigned,
      getRowStyle
    };
  }
};
</script>

<style scoped>
.boq-grid-wrapper {
  position: relative;
  background-color: #fff;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
</style>
