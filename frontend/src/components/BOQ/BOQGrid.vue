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
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import AssignSupplierModal from './AssignSupplierModal.vue';

export default {
  name: 'BOQGrid',
  components: {
    AgGridVue,
    AssignSupplierModal
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
  emits: ['cellValueChanged', 'deleteItems', 'refresh'],
  setup(props, { emit }) {
    const gridApi = ref(null);
    const selectedRows = ref([]);
    const showAssignSupplierModal = ref(false);

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
        editable: false,
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
        editable: true,
        cellEditor: 'agLargeTextCellEditor',
        cellEditorParams: {
          maxLength: 1000,
          rows: 3,
          cols: 50
        }
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
        editable: false,
        type: 'numericColumn'
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
    watch(() => props.billItems, () => {
      if (gridApi.value) {
        console.log('🔄 Refreshing grid with', props.billItems.length, 'items');
        gridApi.value.refreshCells({ force: true });
      }
    }, { deep: true });

    function onCellValueChanged(event) {
      emit('cellValueChanged', event);
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
      return null;
    }

    return {
      gridApi,
      selectedRows,
      showAssignSupplierModal,
      columnDefs,
      defaultColDef,
      onGridReady,
      onCellValueChanged,
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
