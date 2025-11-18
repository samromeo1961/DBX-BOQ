<template>
  <div class="catalogue-toolbar bg-light border-bottom p-2">
    <div class="row g-2 align-items-center">
      <!-- Search -->
      <div class="col-auto">
        <div class="input-group input-group-sm">
          <span class="input-group-text">
            <i class="bi bi-search"></i>
          </span>
          <input
            type="text"
            :value="searchTerm"
            @input="$emit('update:searchTerm', $event.target.value)"
            class="form-control"
            placeholder="Search code or description..."
            style="min-width: 300px;"
          />
        </div>
      </div>

      <!-- Show Archived -->
      <div class="col-auto">
        <div class="form-check form-check-sm">
          <input
            type="checkbox"
            :checked="showArchived"
            @change="$emit('update:showArchived', $event.target.checked)"
            class="form-check-input"
            id="showArchived"
          />
          <label class="form-check-label" for="showArchived">
            Show Archived
          </label>
        </div>
      </div>

      <!-- Show Recipes Only -->
      <div class="col-auto">
        <div class="form-check form-check-sm">
          <input
            type="checkbox"
            :checked="showRecipesOnly"
            @change="$emit('update:showRecipesOnly', $event.target.checked)"
            class="form-check-input"
            id="showRecipesOnly"
          />
          <label class="form-check-label" for="showRecipesOnly">
            <i class="bi bi-box-seam text-info"></i> Recipes Only
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="col-auto ms-auto d-flex gap-2">
        <button
          class="btn btn-sm btn-primary"
          @click="$emit('add')"
          title="Add New Item"
        >
          <i class="bi bi-plus-lg"></i>
          Add Item
        </button>
        <button
          class="btn btn-sm btn-warning"
          @click="$emit('bulkPriceChange')"
          title="Bulk Price Changes"
        >
          <i class="bi bi-lightning-charge"></i>
          Bulk Prices
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('import')"
          title="Import from CSV/Excel"
        >
          <i class="bi bi-upload"></i>
          Import
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('export')"
          title="Export to CSV"
        >
          <i class="bi bi-download"></i>
          Export
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('refresh')"
          title="Refresh"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          class="btn btn-sm btn-outline-secondary"
          @click="$emit('clearFilters')"
          title="Clear all grid filters"
        >
          <i class="bi bi-funnel"></i>
          Clear Filters
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CatalogueToolbar',
  props: {
    searchTerm: String,
    showArchived: Boolean,
    showRecipesOnly: Boolean
  },
  emits: ['update:searchTerm', 'update:showArchived', 'update:showRecipesOnly', 'add', 'bulkPriceChange', 'import', 'export', 'refresh', 'clearFilters']
};
</script>

<style scoped>
.catalogue-toolbar {
  flex-shrink: 0;
}
</style>
