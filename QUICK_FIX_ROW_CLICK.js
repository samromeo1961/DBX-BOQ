// Quick Fix for Row Click Event
// Add this to CatalogueGrid.vue

// In the setup() function, add this handler:
function handleRowClick(event) {
  console.log('Row clicked:', event);
  emit('rowClicked', event);
}

// In the onGridReady function, add this event listener:
function onGridReady(params) {
  gridApi.value = params.api;
  params.api.sizeColumnsToFit();

  // Add direct event listener
  params.api.addEventListener('rowClicked', (event) => {
    console.log('AG Grid row clicked event:', event);
    emit('rowClicked', event);
  });
}

// Make sure to add handleRowClick to the return statement:
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
  handleRowClick  // ADD THIS
};
