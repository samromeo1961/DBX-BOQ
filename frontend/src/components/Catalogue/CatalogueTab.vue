<template>
  <div class="catalogue-tab h-100 d-flex flex-column">
    <!-- Toolbar -->
    <CatalogueToolbar
      v-model:searchTerm="searchTerm"
      v-model:showArchived="showArchived"
      v-model:showRecipesOnly="showRecipesOnly"
      @add="showAddModal = true"
      @bulkPriceChange="() => { console.log('Bulk Price Change button clicked!'); showBulkPriceModal = true; console.log('showBulkPriceModal set to:', showBulkPriceModal); }"
      @import="showImportModal = true"
      @export="exportCatalogue"
      @refresh="loadCatalogue"
      @clearFilters="clearGridFilters"
    />

    <!-- Main Content Area -->
    <div class="catalogue-content flex-grow-1 d-flex overflow-hidden">
      <!-- Cost Centre Panel (Left Sidebar) -->
      <CostCentrePanel
        v-model:selectedCostCentre="selectedCostCentre"
        :showAllOption="true"
        :catalogueItems="catalogueItems"
      />

      <!-- Catalogue Grid and Details (Center/Right) -->
      <div class="catalogue-grid-container flex-grow-1">
        <!-- Main Grid -->
        <div class="catalogue-grid-section">
          <CatalogueGrid
            ref="catalogueGridRef"
            :catalogueItems="filteredItems"
            :loading="loading"
            :perCodes="perCodes"
            :costCentres="costCentres"
            :selectedItemCode="selectedItemCode"
            @cellValueChanged="onCellValueChanged"
            @duplicateItem="onDuplicateItem"
            @manageRecipe="onManageRecipe"
            @archiveItems="onArchiveItems"
            @unarchiveItems="onUnarchiveItems"
            @deleteItems="onDeleteItems"
            @rowClicked="onItemSelected"
          />
        </div>

        <!-- Item Details Tabs -->
        <Transition name="slide-up">
          <div v-if="selectedItemCode && !isPanelCollapsed" class="item-details-section border-top">
            <!-- Tab Navigation with Close Button -->
            <ul class="nav nav-tabs" role="tablist">
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'estimate' }"
                  @click="activeTab = 'estimate'"
                  type="button"
                >
                  <i class="bi bi-currency-dollar me-1"></i>
                  Estimate Prices
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'prices' }"
                  @click="activeTab = 'prices'"
                  type="button"
                >
                  <i class="bi bi-truck me-1"></i>
                  Supplier Prices
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'template' }"
                  @click="activeTab = 'template'"
                  type="button"
                >
                  <i class="bi bi-file-text me-1"></i>
                  Template
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'specification' }"
                  @click="activeTab = 'specification'"
                  type="button"
                >
                  <i class="bi bi-file-earmark-text me-1"></i>
                  Specification
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'images' }"
                  @click="activeTab = 'images'"
                  type="button"
                >
                  <i class="bi bi-images me-1"></i>
                  Images
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'usage' }"
                  @click="activeTab = 'usage'"
                  type="button"
                >
                  <i class="bi bi-diagram-3 me-1"></i>
                  Usage
                </button>
              </li>
              <li class="nav-item ms-auto">
                <button
                  class="nav-link text-danger"
                  @click="closePanel"
                  type="button"
                  title="Close panel"
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              </li>
            </ul>

          <!-- Tab Content -->
          <div class="tab-content">
            <div v-if="activeTab === 'estimate'" class="tab-pane active">
              <EstimatePricesPanel
                :itemCode="selectedItemCode"
                :isVisible="activeTab === 'estimate'"
                @updated="loadCatalogue"
              />
            </div>
            <div v-if="activeTab === 'prices'" class="tab-pane active">
              <SupplierPricesPanel
                :itemCode="selectedItemCode"
                :isVisible="activeTab === 'prices'"
                @updated="loadCatalogue"
              />
            </div>
            <div v-if="activeTab === 'template'" class="tab-pane active">
              <TemplateEditor
                :priceCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
            <div v-if="activeTab === 'specification'" class="tab-pane active">
              <SpecificationEditor
                :priceCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
            <div v-if="activeTab === 'images'" class="tab-pane active">
              <ImageGalleryPanel
                :priceCode="selectedItemCode"
                @updated="loadCatalogue"
              />
            </div>
            <div v-if="activeTab === 'usage'" class="tab-pane active">
              <UsagePanel
                :itemCode="selectedItemCode"
                :isVisible="activeTab === 'usage'"
              />
            </div>
          </div>
          </div>
        </Transition>

        <!-- Expand Button (shown when panel is collapsed but item is selected) -->
        <div v-if="selectedItemCode && isPanelCollapsed" class="expand-panel-bar border-top bg-light">
          <button
            class="btn btn-sm btn-link text-decoration-none w-100 py-2"
            @click="isPanelCollapsed = false"
          >
            <i class="bi bi-chevron-up me-2"></i>
            Show Details for {{ selectedItemCode }}
            <i class="bi bi-chevron-up ms-2"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    <div class="status-bar bg-light border-top py-1 px-3 small">
      <div class="d-flex justify-content-between">
        <div>
          <span v-if="selectedCostCentre" class="me-3">
            <strong>Cost Centre:</strong> {{ selectedCostCentre }}
          </span>
          <span class="me-3">
            <strong>Items:</strong> {{ filteredItems.length }} / {{ catalogueItems.length }}
          </span>
          <span v-if="selectedItemCode" class="me-3 text-primary">
            <strong>Selected:</strong> {{ selectedItemCode }}
          </span>
        </div>
        <div>
          <span v-if="showArchived" class="badge bg-warning text-dark">
            Showing Archived Items
          </span>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <CatalogueItemModal
      v-if="showAddModal"
      :item="editingItem"
      :perCodes="perCodes"
      :costCentres="costCentres"
      @close="showAddModal = false; editingItem = null"
      @save="onSaveItem"
    />

    <!-- Import Modal -->
    <CatalogueImportModal
      :show="showImportModal"
      @close="showImportModal = false"
      @imported="loadCatalogue"
    />

    <!-- Recipe Management Modal -->
    <RecipeManagementModal
      v-if="showRecipeModal"
      :priceCode="editingRecipePriceCode"
      @close="showRecipeModal = false; editingRecipePriceCode = null"
      @saved="loadCatalogue"
    />

    <!-- Bulk Price Change Modal -->
    <BulkPriceChangeModal
      :show="showBulkPriceModal"
      @close="showBulkPriceModal = false"
      @applied="loadCatalogue"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteConfirmationModal
      :show="showDeleteModal"
      :items="itemsToDelete"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import CatalogueToolbar from './CatalogueToolbar.vue';
import CatalogueGrid from './CatalogueGrid.vue';
import CostCentrePanel from '../BOQ/CostCentrePanel.vue';
import CatalogueItemModal from './CatalogueItemModal.vue';
import CatalogueImportModal from './CatalogueImportModal.vue';
import RecipeManagementModal from './RecipeManagementModal.vue';
import BulkPriceChangeModal from './BulkPriceChangeModal.vue';
import EstimatePricesPanel from './EstimatePricesPanel.vue';
import SupplierPricesPanel from './SupplierPricesPanel.vue';
import TemplateEditor from './TemplateEditor.vue';
import SpecificationEditor from './SpecificationEditor.vue';
import ImageGalleryPanel from './ImageGalleryPanel.vue';
import UsagePanel from './UsagePanel.vue';
import DeleteConfirmationModal from '../common/DeleteConfirmationModal.vue';

export default {
  name: 'CatalogueTab',
  components: {
    CatalogueToolbar,
    CatalogueGrid,
    CostCentrePanel,
    CatalogueItemModal,
    CatalogueImportModal,
    RecipeManagementModal,
    DeleteConfirmationModal,
    BulkPriceChangeModal,
    EstimatePricesPanel,
    SupplierPricesPanel,
    TemplateEditor,
    SpecificationEditor,
    ImageGalleryPanel,
    UsagePanel
  },
  setup() {
    const api = useElectronAPI();

    // State
    const catalogueItems = ref([]);
    const perCodes = ref([]);
    const costCentres = ref([]);
    const loading = ref(false);
    const searchTerm = ref('');
    const showArchived = ref(false);
    const showRecipesOnly = ref(false);
    const selectedCostCentre = ref(null);
    const showAddModal = ref(false);
    const showImportModal = ref(false);
    const showRecipeModal = ref(false);
    const showBulkPriceModal = ref(false);
    const showDeleteModal = ref(false);
    const itemsToDelete = ref([]);
    const editingItem = ref(null);
    const editingRecipePriceCode = ref(null);
    const catalogueGridRef = ref(null);
    const selectedItemCode = ref(null);
    const activeTab = ref('estimate');
    const isPanelCollapsed = ref(false);

    // Computed - Just pass through the items from backend (backend does all filtering)
    const filteredItems = computed(() => catalogueItems.value);

    // Methods
    async function loadCatalogue() {
      loading.value = true;
      try {
        const params = {
          showArchived: showArchived.value,
          searchTerm: searchTerm.value,
          costCentre: selectedCostCentre.value && selectedCostCentre.value !== 'ALL'
            ? selectedCostCentre.value
            : null,
          recipesOnly: showRecipesOnly.value
        };

        const result = await api.catalogue.getAllItems(params);
        if (result.success) {
          catalogueItems.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading catalogue:', error);
      } finally {
        loading.value = false;
      }
    }

    async function loadPerCodes() {
      try {
        const result = await api.catalogue.getPerCodes();
        if (result.success) {
          perCodes.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading per codes:', error);
      }
    }

    async function loadCostCentres() {
      try {
        const result = await api.costCentres.getList();
        if (result.success) {
          costCentres.value = result.data || [];
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
      }
    }

    async function onCellValueChanged(event) {
      const { data } = event;

      loading.value = true;
      try {
        const result = await api.catalogue.updateItem({
          PriceCode: data.PriceCode,
          Description: data.Description,
          CostCentre: data.CostCentre,
          PerCode: data.PerCode,
          Price1: data.Price1,
          Price2: data.Price2,
          Price3: data.Price3,
          Price4: data.Price4,
          Price5: data.Price5,
          Archived: data.Archived
        });

        if (!result.success) {
          console.error('Failed to update item:', result.message);
          await loadCatalogue(); // Reload to revert changes
        }
      } catch (error) {
        console.error('Error updating item:', error);
        await loadCatalogue();
      } finally {
        loading.value = false;
      }
    }

    async function onDeleteItems(items) {
      // Show the delete confirmation modal
      itemsToDelete.value = items;
      showDeleteModal.value = true;
    }

    async function confirmDelete() {
      showDeleteModal.value = false;
      loading.value = true;

      try {
        const priceCodes = itemsToDelete.value.map(item => item.PriceCode);
        const result = await api.catalogue.deleteItems(priceCodes);

        if (result.success) {
          const successCount = result.results?.filter(r => r.success).length || 0;
          const failCount = result.results?.filter(r => !r.success).length || 0;

          if (failCount > 0) {
            const failedItems = result.results.filter(r => !r.success);
            alert(`Deleted ${successCount} items. ${failCount} items could not be deleted:\n\n${failedItems.map(f => `${f.priceCode}: ${f.message}`).join('\n')}`);
          } else {
            alert(`Successfully deleted ${successCount} item(s)`);
          }
        } else {
          alert('Error deleting items: ' + result.message);
        }

        // Gracefully clear the UI
        // 1. Clear the selected item (close details panel)
        selectedItemCode.value = null;

        // 2. Reload catalogue data
        await loadCatalogue();

        // 3. Clear grid selection after reload
        if (catalogueGridRef.value && catalogueGridRef.value.gridApi) {
          catalogueGridRef.value.gridApi.deselectAll();
        }
      } catch (error) {
        console.error('Error deleting items:', error);
        alert('Error deleting items: ' + error.message);
      } finally {
        loading.value = false;
        itemsToDelete.value = [];
      }
    }

    async function onDuplicateItem(item) {
      editingItem.value = {
        ...item,
        PriceCode: '' // Clear code so user can enter new one
      };
      showAddModal.value = true;
    }

    async function onSaveItem(itemData) {
      loading.value = true;
      try {
        const result = await api.catalogue.addItem(itemData);
        if (result.success) {
          showAddModal.value = false;
          editingItem.value = null;
          await loadCatalogue();
        } else {
          alert('Error saving item: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Error saving item: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function onManageRecipe(priceCode) {
      editingRecipePriceCode.value = priceCode;
      showRecipeModal.value = true;
    }

    async function exportCatalogue() {
      try {
        const result = await api.catalogue.exportToCSV({
          costCentre: selectedCostCentre.value,
          showArchived: showArchived.value
        });
        if (result.success) {
          alert('Catalogue exported successfully to: ' + result.filePath);
        } else {
          alert('Error exporting catalogue: ' + result.message);
        }
      } catch (error) {
        console.error('Error exporting catalogue:', error);
        alert('Error exporting catalogue: ' + error.message);
      }
    }

    async function onArchiveItems(items) {
      if (!confirm(`Archive ${items.length} item(s)?`)) {
        return;
      }

      loading.value = true;
      try {
        for (const item of items) {
          await api.catalogue.updateItem({
            PriceCode: item.PriceCode,
            Description: item.Description,
            CostCentre: item.CostCentre,
            PerCode: item.PerCode,
            Price1: item.Price1,
            Price2: item.Price2,
            Price3: item.Price3,
            Price4: item.Price4,
            Price5: item.Price5,
            Archived: true
          });
        }
        await loadCatalogue();
      } catch (error) {
        console.error('Error archiving items:', error);
        alert('Error archiving items: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function onUnarchiveItems(items) {
      if (!confirm(`Unarchive ${items.length} item(s)?`)) {
        return;
      }

      loading.value = true;
      try {
        for (const item of items) {
          await api.catalogue.updateItem({
            PriceCode: item.PriceCode,
            Description: item.Description,
            CostCentre: item.CostCentre,
            PerCode: item.PerCode,
            Price1: item.Price1,
            Price2: item.Price2,
            Price3: item.Price3,
            Price4: item.Price4,
            Price5: item.Price5,
            Archived: false
          });
        }
        await loadCatalogue();
      } catch (error) {
        console.error('Error unarchiving items:', error);
        alert('Error unarchiving items: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function clearGridFilters() {
      if (catalogueGridRef.value) {
        catalogueGridRef.value.clearFilters();
      }
    }

    function onItemSelected(event) {
      if (event && event.data && event.data.PriceCode) {
        selectedItemCode.value = event.data.PriceCode;
        activeTab.value = 'estimate'; // Default to estimate prices tab
        isPanelCollapsed.value = false; // Expand panel when new item selected

        // Scroll the selected row to the top of the grid for better visibility
        if (catalogueGridRef.value && event.node) {
          // Get the grid API
          const gridApi = catalogueGridRef.value.gridApi;
          if (gridApi) {
            // Scroll to make the row visible at the top
            gridApi.ensureNodeVisible(event.node, 'top');
          }
        }
      } else {
        selectedItemCode.value = null;
      }
    }

    function closePanel() {
      isPanelCollapsed.value = true;
    }

    // Watchers
    watch(showArchived, () => {
      loadCatalogue();
    });

    watch(showRecipesOnly, () => {
      loadCatalogue();
    });

    watch(selectedCostCentre, () => {
      loadCatalogue();
    });

    // Debounced search - wait 300ms after user stops typing
    let searchTimeout = null;
    watch(searchTerm, () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      searchTimeout = setTimeout(() => {
        loadCatalogue();
      }, 300);
    });

    // Initialize
    onMounted(async () => {
      await Promise.all([
        loadCatalogue(),
        loadPerCodes(),
        loadCostCentres()
      ]);
    });

    return {
      catalogueItems,
      filteredItems,
      perCodes,
      costCentres,
      loading,
      searchTerm,
      showArchived,
      showRecipesOnly,
      selectedCostCentre,
      showAddModal,
      showImportModal,
      showRecipeModal,
      showBulkPriceModal,
      showDeleteModal,
      itemsToDelete,
      editingItem,
      editingRecipePriceCode,
      catalogueGridRef,
      selectedItemCode,
      activeTab,
      isPanelCollapsed,
      loadCatalogue,
      onCellValueChanged,
      onDeleteItems,
      confirmDelete,
      onDuplicateItem,
      onSaveItem,
      onManageRecipe,
      exportCatalogue,
      onArchiveItems,
      onUnarchiveItems,
      clearGridFilters,
      onItemSelected,
      closePanel
    };
  }
};
</script>

<style scoped>
.catalogue-tab {
  background-color: #fff;
}

.catalogue-content {
  position: relative;
}

.catalogue-grid-container {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.catalogue-grid-section {
  flex: 1;
  min-height: 300px;
  overflow: hidden;
}

.item-details-section {
  height: 600px; /* Increased from 450px for more space */
  display: flex;
  flex-direction: column;
  background-color: #fff;
}

.item-details-section .nav-tabs {
  border-bottom: 1px solid #dee2e6;
  padding: 0 1rem;
  background-color: #f8f9fa;
  flex-shrink: 0;
}

.item-details-section .nav-link {
  border: none;
  color: #6c757d;
  padding: 0.75rem 1rem;
  background: none;
  cursor: pointer;
}

.item-details-section .nav-link:hover {
  color: #0d6efd;
  border: none;
}

.item-details-section .nav-link.active {
  color: #0d6efd;
  background-color: #fff;
  border: none;
  border-bottom: 2px solid #0d6efd;
}

.item-details-section .tab-content {
  flex: 1;
  overflow: auto;
  min-height: 0; /* Fix for flexbox overflow */
  position: relative;
}

.item-details-section .tab-pane {
  display: block !important;
  height: auto;
  min-height: 300px;
  overflow-y: auto;
  padding: 1rem;
}

/* Slide-up animation */
.slide-up-enter-active {
  animation: slide-up 0.4s ease-out;
}

.slide-up-leave-active {
  animation: slide-up 0.3s ease-in reverse;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.expand-panel-bar {
  padding: 0;
  border-top: 2px solid #0d6efd;
}

.expand-panel-bar button {
  color: #0d6efd;
  font-weight: 500;
  transition: background-color 0.2s;
}

.expand-panel-bar button:hover {
  background-color: #e7f1ff;
}
</style>
