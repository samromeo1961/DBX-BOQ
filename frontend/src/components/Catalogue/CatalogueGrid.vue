<template>
  <div class="catalogue-grid h-100 p-2" @mouseup="handleTextSelection">
    <ag-grid-vue
      class="ag-theme-quartz"
      :columnDefs="columnDefs"
      :rowData="catalogueItems"
      :defaultColDef="defaultColDef"
      :rowSelection="'multiple'"
      :suppressRowClickSelection="true"
      :enableCellTextSelection="true"
      :getRowStyle="getRowStyle"
      @grid-ready="onGridReady"
      @selection-changed="onSelectionChanged"
      @cell-value-changed="$emit('cellValueChanged', $event)"
      @row-clicked="$emit('rowClicked', $event)"
      style="height: 100%;"
    />

    <!-- Context Menu for selected items -->
    <div v-if="selectedItems.length > 0" class="position-absolute bottom-0 start-50 translate-middle-x mb-3">
      <div class="btn-group shadow-lg" role="group">
        <button class="btn btn-sm btn-warning" @click="archiveSelected" title="Archive selected items">
          <i class="bi bi-archive"></i>
          Archive ({{ selectedItems.length }})
        </button>
        <button class="btn btn-sm btn-info" @click="unarchiveSelected" title="Unarchive selected items">
          <i class="bi bi-arrow-counterclockwise"></i>
          Unarchive ({{ selectedItems.length }})
        </button>
      </div>
    </div>

    <!-- Floating "Search Web" Button -->
    <div
      v-if="showSearchButton"
      class="web-search-button shadow-lg"
      :style="{ top: searchButtonPosition.y + 'px', left: searchButtonPosition.x + 'px' }"
    >
      <button class="btn btn-sm btn-primary" @click="searchWeb" title="Search selected text on the web (opens in external browser)">
        <i class="bi bi-search me-1"></i>
        Search Web
      </button>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';

export default {
  name: 'CatalogueGrid',
  components: {
    AgGridVue
  },
  props: {
    catalogueItems: Array,
    loading: Boolean,
    perCodes: Array,
    costCentres: Array,
    selectedItemCode: String
  },
  emits: ['cellValueChanged', 'deleteItems', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems', 'rowClicked'],
  setup(props, { emit }) {
    const gridApi = ref(null);
    const selectedItems = ref([]);

    const columnDefs = ref([
      {
        headerName: '',
        checkboxSelection: true, // Allow selection of all items including headings
        headerCheckboxSelection: true,
        width: 40,
        pinned: 'left',
        suppressSizeToFit: true,
        lockPosition: true
      },
      {
        field: 'PriceCode',
        headerName: 'Code',
        width: 120,
        pinned: 'left',
        suppressSizeToFit: true,
        editable: false,
        cellStyle: params => {
          // Selected item takes priority - yellow background
          if (params.data && params.data.PriceCode === props.selectedItemCode && !params.data.IsHeading) {
            return { fontWeight: 'bold', backgroundColor: '#fff3cd' };
          }
          // Heading items - blue background
          if (params.data && params.data.IsHeading) {
            return { fontWeight: 'bold', backgroundColor: '#e3f2fd' }; // Same blue as heading rows
          }
          // Default - gray background
          return { fontWeight: 'bold', backgroundColor: '#f8f9fa' };
        }
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 3,
        minWidth: 250,
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agTextCellEditor'
      },
      {
        field: 'CostCentre',
        headerName: 'CC',
        width: 80,
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: params => ({
          values: props.costCentres.map(cc => cc.Code)
        })
      },
      {
        field: 'Unit',
        headerName: 'Unit',
        width: 100,
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: params => ({
          values: props.perCodes.map(pc => pc.Printout)
        }),
        valueGetter: params => {
          // Display the Unit/Printout value
          return params.data.Unit;
        },
        cellStyle: params => {
          // Sub-headings: bold text only, no background color
          if (params.data && params.data.IsSubHeading) {
            return { fontWeight: 'bold' };
          }
          return null;
        }
      },
      {
        field: 'Price1',
        headerName: 'Price 1',
        width: 90,
        type: 'numericColumn',
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agNumberCellEditor',
        valueFormatter: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          return params.value != null ? `$${params.value.toFixed(2)}` : '';
        },
        valueParser: params => {
          return parseFloat(params.newValue) || 0;
        }
      },
      {
        field: 'Price2',
        headerName: 'Price 2',
        width: 90,
        type: 'numericColumn',
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agNumberCellEditor',
        valueFormatter: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          return params.value != null ? `$${params.value.toFixed(2)}` : '';
        }
      },
      {
        field: 'Price3',
        headerName: 'Price 3',
        width: 90,
        type: 'numericColumn',
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agNumberCellEditor',
        valueFormatter: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          return params.value != null ? `$${params.value.toFixed(2)}` : '';
        }
      },
      {
        field: 'Price4',
        headerName: 'Price 4',
        width: 90,
        type: 'numericColumn',
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agNumberCellEditor',
        valueFormatter: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          return params.value != null ? `$${params.value.toFixed(2)}` : '';
        }
      },
      {
        field: 'Price5',
        headerName: 'Price 5',
        width: 90,
        type: 'numericColumn',
        editable: params => !params.data.IsHeading && !params.data.IsSubHeading,
        cellEditor: 'agNumberCellEditor',
        valueFormatter: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          return params.value != null ? `$${params.value.toFixed(2)}` : '';
        }
      },
      {
        field: 'Recipe',
        headerName: 'Recipe',
        width: 90,
        editable: false,
        cellRenderer: params => {
          if (params.data && (params.data.IsHeading || params.data.IsSubHeading)) return '';
          if (params.value) {
            return '<button class="btn btn-sm btn-link recipe-btn p-0"><i class="bi bi-box-seam text-info"></i> Manage</button>';
          }
          return '';
        },
        onCellClicked: params => {
          if (params.value && params.event.target.closest('.recipe-btn')) {
            emit('manageRecipe', params.data.PriceCode);
          }
        }
      },
      {
        field: 'Archived',
        headerName: 'Archived',
        width: 90,
        editable: true, // Allow archiving of all items including headings
        cellRenderer: params => {
          return params.value ? '<i class="bi bi-check-square text-warning"></i>' : '<i class="bi bi-square"></i>';
        },
        cellEditor: 'agCheckboxCellEditor'
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderMenuButton: false
    });

    function onGridReady(params) {
      gridApi.value = params.api;
      params.api.sizeColumnsToFit();
    }

    function onSelectionChanged() {
      if (gridApi.value) {
        selectedItems.value = gridApi.value.getSelectedRows();
      }
    }

    function deleteSelected() {
      if (selectedItems.value.length > 0) {
        emit('deleteItems', selectedItems.value);
      }
    }

    function archiveSelected() {
      if (selectedItems.value.length > 0) {
        emit('archiveItems', selectedItems.value);
      }
    }

    function unarchiveSelected() {
      if (selectedItems.value.length > 0) {
        emit('unarchiveItems', selectedItems.value);
      }
    }

    function getRowStyle(params) {
      // Highlight the currently selected item in the slide-up panel (highest priority)
      if (params.data && params.data.PriceCode === props.selectedItemCode && !params.data.IsHeading) {
        return {
          backgroundColor: '#fff3cd', // Light yellow background for selected item
          fontWeight: 'bold',
          border: '2px solid #ffc107', // Golden border for selected item
          boxShadow: '0 0 8px rgba(255, 193, 7, 0.5)'
        };
      }

      // Main headings get highlighted background and bold text
      if (params.data && params.data.IsHeading) {
        return {
          backgroundColor: '#e3f2fd', // Light blue background for main headings
          fontWeight: 'bold'
        };
      }
      // Sub-headings get bold text only
      if (params.data && params.data.IsSubHeading) {
        return {
          fontWeight: 'bold'
        };
      }
      // Apply orange text color and italic style to archived items
      if (params.data && params.data.Archived) {
        return {
          color: '#ff8c00', // Orange color for archived items
          fontStyle: 'italic'
        };
      }
      return null;
    }

    // Watch for changes to catalogueItems and refresh the grid
    watch(() => props.catalogueItems, () => {
      if (gridApi.value) {
        gridApi.value.refreshCells({ force: true });
      }
    }, { deep: true });

    // Watch for changes to selectedItemCode and refresh row styles
    watch(() => props.selectedItemCode, () => {
      if (gridApi.value) {
        gridApi.value.redrawRows();
      }
    });

    function clearFilters() {
      if (gridApi.value) {
        gridApi.value.setFilterModel(null);
      }
    }

    // Web Search functionality
    const showSearchButton = ref(false);
    const selectedText = ref('');
    const searchButtonPosition = ref({ x: 0, y: 0 });

    function handleTextSelection(event) {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text && text.length > 0) {
        selectedText.value = text;

        // Position the button near the mouse cursor
        const rect = event.target.getBoundingClientRect();
        searchButtonPosition.value = {
          x: event.clientX - rect.left + 10,
          y: event.clientY - rect.top + 10
        };

        showSearchButton.value = true;
      } else {
        showSearchButton.value = false;
        selectedText.value = '';
      }
    }

    function searchWeb() {
      if (selectedText.value) {
        // Open Google search in external browser
        // Note: Most websites block iframe embedding due to X-Frame-Options security policy
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(selectedText.value)}`;
        window.open(searchUrl, '_blank');

        // Hide the search button
        showSearchButton.value = false;
        selectedText.value = '';

        // Clear text selection
        window.getSelection().removeAllRanges();
      }
    }

    return {
      columnDefs,
      defaultColDef,
      gridApi,
      selectedItems,
      onGridReady,
      onSelectionChanged,
      deleteSelected,
      archiveSelected,
      unarchiveSelected,
      getRowStyle,
      clearFilters,
      showSearchButton,
      selectedText,
      searchButtonPosition,
      handleTextSelection,
      searchWeb
    };
  }
};
</script>

<style scoped>
.catalogue-grid {
  position: relative;
}

.web-search-button {
  position: absolute;
  z-index: 1000;
  animation: fadeIn 0.2s ease-in;
}

.web-search-button button {
  white-space: nowrap;
  font-size: 0.875rem;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
