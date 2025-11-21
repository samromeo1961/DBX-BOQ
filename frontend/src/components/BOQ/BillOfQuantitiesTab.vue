<template>
  <div class="boq-tab h-100 d-flex flex-column">
    <!-- BOQ Toolbar -->
    <BOQToolbar
      ref="toolbarRef"
      v-model:selectedJob="selectedJob"
      v-model:selectedPriceLevel="selectedPriceLevel"
      v-model:selectedLoad="selectedLoad"
      v-model:selectedCostCentre="selectedCostCentre"
      v-model:billDate="billDate"
      :catalogueVisible="catalogueSearchVisible"
      @refresh="loadBill"
      @toggleCatalogueSearch="catalogueSearchVisible = !catalogueSearchVisible"
      @jobSelected="onJobSelected"
    />

    <!-- Main Content Area -->
    <div :class="['boq-content', 'flex-grow-1', 'd-flex', catalogueLayoutHorizontal ? 'flex-column' : 'flex-row', 'overflow-hidden']">
      <!-- Top/Left Section: Cost Centre Panel + BOQ Grid -->
      <div :class="['boq-main-section', 'd-flex', 'overflow-hidden', { 'with-catalogue-horizontal': catalogueSearchVisible && catalogueLayoutHorizontal }, { 'with-catalogue-vertical': catalogueSearchVisible && !catalogueLayoutHorizontal }]">
        <!-- Cost Centre Panel (Left Sidebar) -->
        <CostCentrePanel
          ref="costCentrePanelRef"
          :selectedJob="selectedJob"
          v-model:selectedCostCentre="selectedCostCentre"
          :showAllOption="true"
        />

        <!-- BOQ Grid -->
        <div class="boq-grid-container flex-grow-1">
          <BOQGrid
            :billItems="billItems"
            :loading="loading"
            :jobNo="selectedJob"
            :costCentre="selectedCostCentre"
            :availableLoads="availableLoads"
            @cellValueChanged="onCellValueChanged"
            @deleteItems="onDeleteItems"
            @refresh="loadBill"
            @openWorkupModal="openWorkupModal"
          />
        </div>
      </div>

      <!-- Catalogue Search Panel (Horizontal Bottom or Vertical Right) -->
      <transition :name="catalogueLayoutHorizontal ? 'slide-vertical' : 'slide-horizontal'">
        <div
          v-if="catalogueSearchVisible"
          :class="catalogueLayoutHorizontal ? 'catalogue-search-panel-horizontal' : 'catalogue-search-panel-vertical'"
        >
          <BOQCatalogueSearch
            :costCentre="selectedCostCentre"
            :priceLevel="selectedPriceLevel"
            :billDate="billDate"
            :layoutHorizontal="catalogueLayoutHorizontal"
            @addItems="onAddItems"
            @close="catalogueSearchVisible = false"
            @toggleLayout="catalogueLayoutHorizontal = !catalogueLayoutHorizontal"
          />
        </div>
      </transition>
    </div>

    <!-- Status Bar -->
    <div class="status-bar bg-light border-top py-1 px-3 small">
      <div class="d-flex justify-content-between">
        <div>
          <span v-if="selectedJob" class="me-3">
            <strong>Job:</strong> {{ selectedJob }}
          </span>
          <span v-if="selectedCostCentre" class="me-3">
            <strong>Cost Centre:</strong> {{ selectedCostCentre }}
          </span>
          <span class="me-3">
            <strong>Items:</strong> {{ billItems.length }}
          </span>
        </div>
        <div>
          <strong>Total:</strong> ${{ billTotal.toFixed(2) }}
        </div>
      </div>
    </div>

    <!-- Workup Modal -->
    <WorkupModal
      :show="showWorkupModal"
      :itemData="selectedWorkupItem"
      @close="closeWorkupModal"
      @save="saveWorkup"
    />
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import BOQToolbar from './BOQToolbar.vue';
import BOQGrid from './BOQGrid.vue';
import BOQCatalogueSearch from './BOQCatalogueSearch.vue';
import CostCentrePanel from './CostCentrePanel.vue';
import WorkupModal from './WorkupModal.vue';

export default {
  name: 'BillOfQuantitiesTab',
  components: {
    BOQToolbar,
    BOQGrid,
    BOQCatalogueSearch,
    CostCentrePanel,
    WorkupModal
  },
  setup() {
    const api = useElectronAPI();

    // Component refs
    const toolbarRef = ref(null);
    const costCentrePanelRef = ref(null);

    // State
    const selectedJob = ref(null);
    const selectedPriceLevel = ref(1);
    const selectedLoad = ref(1);
    const selectedCostCentre = ref(null);
    const billDate = ref(new Date());
    const billItems = ref([]);
    const loading = ref(false);
    const catalogueSearchVisible = ref(false);
    const catalogueLayoutHorizontal = ref(true); // true = horizontal (bottom), false = vertical (right)
    const availableLoads = ref([]);
    const showWorkupModal = ref(false);
    const selectedWorkupItem = ref({});

    // Focus cost centre panel when job is selected
    function onJobSelected() {
      // Small delay to let the cost centre panel load
      setTimeout(() => {
        if (costCentrePanelRef.value && costCentrePanelRef.value.focusSearch) {
          costCentrePanelRef.value.focusSearch();
        }
      }, 100);
    }

    // Computed
    const billTotal = computed(() => {
      return billItems.value.reduce((sum, item) => sum + (item.LineTotal || 0), 0);
    });

    // Methods
    async function loadBill() {
      if (!selectedJob.value) {
        billItems.value = [];
        return;
      }

      console.log('📋 Loading bill for:', {
        job: selectedJob.value,
        costCentre: selectedCostCentre.value
      });

      loading.value = true;
      try {
        // Pass null for bLoad to show ALL items from ALL loads in the cost centre
        const result = await api.boq.getJobBill(
          selectedJob.value,
          selectedCostCentre.value,
          null
        );

        console.log('📦 Bill result:', result);

        if (result.success) {
          billItems.value = result.data;
          console.log(`✅ Loaded ${billItems.value.length} bill items`);
          if (billItems.value.length > 0) {
            console.log('First item:', billItems.value[0]);
            console.log('All item codes:', billItems.value.map(i => i.ItemCode));
          }
        } else {
          console.error('Failed to load bill:', result.message);
          billItems.value = [];
        }
      } catch (error) {
        console.error('Error loading bill:', error);
        billItems.value = [];
      } finally {
        loading.value = false;
      }
    }

    async function onCellValueChanged(event) {
      const { data, colDef, oldValue, newValue } = event;

      console.log('✏️ Cell value changed:', {
        field: colDef.field,
        itemCode: data.ItemCode,
        oldValue: oldValue,
        newValue: newValue
      });

      // Handle Description field edit for adhoc items
      // Description edits should save to XDescription (workup) as the first line
      // Check data.Description (catalogue description) to determine if adhoc
      if (colDef.field === 'Description') {
        const catalogueDesc = data.Description;
        const isAdhoc = catalogueDesc === null || catalogueDesc === undefined || (typeof catalogueDesc === 'string' && catalogueDesc.trim() === '');
        if (isAdhoc) {
          // Set the new value as the workup (it will become the first line / description)
          data.Workup = newValue;
          console.log(`📝 Adhoc description set to workup: ${newValue}`);
        }
      }

      // Check for zero price and prompt for manual entry if option enabled
      if (colDef.field === 'UnitPrice' && data.UnitPrice === 0) {
        try {
          const optionsResult = await api.boqOptions.get();
          if (optionsResult.success && optionsResult.options?.newItems?.zeroToManual) {
            const manualPrice = prompt(
              `The price for "${data.Description || data.ItemCode}" is $0.00.\n\n` +
              `Please enter a manual price:`,
              '0.00'
            );

            if (manualPrice !== null) {
              const parsedPrice = parseFloat(manualPrice);
              if (!isNaN(parsedPrice) && parsedPrice >= 0) {
                data.UnitPrice = parsedPrice;
                console.log(`✓ Manual price set to $${parsedPrice.toFixed(2)}`);
              } else {
                alert('Invalid price entered. Price will remain $0.00');
              }
            } else {
              // User cancelled - reload to revert
              loading.value = false;
              await loadBill();
              return;
            }
          }
        } catch (error) {
          console.error('Error checking BOQ options:', error);
          // Continue with update even if options check fails
        }
      }

      loading.value = true;
      try {
        const updateData = {
          JobNo: data.JobNo,
          CostCentre: data.CostCentre,
          BLoad: colDef.field === 'BLoad' ? oldValue : data.BLoad,
          LineNumber: data.LineNumber,
          Quantity: data.Quantity,
          UnitPrice: data.UnitPrice,
          XDescription: data.Workup
        };

        // Special handling for Load changes (BLoad is part of primary key)
        if (colDef.field === 'BLoad' && oldValue !== newValue) {
          updateData.newBLoad = parseInt(newValue);
          console.log(`🔄 Moving item from Load ${oldValue} to Load ${newValue}`);
        }

        console.log('Updating item with:', updateData);

        const result = await api.boq.updateItem(updateData);

        console.log('Update result:', result);

        if (!result.success) {
          console.error('Failed to update item:', result.message);
          // Reload to revert changes
          await loadBill();
        } else {
          console.log('✅ Item updated successfully');
          // Reload to get updated calculated values
          await loadBill();
        }
      } catch (error) {
        console.error('Error updating item:', error);
        await loadBill();
      } finally {
        loading.value = false;
      }
    }

    async function onAddItems(selectedItems) {
      if (!selectedJob.value) {
        alert('Please select a job first');
        return;
      }

      console.log('➕ Adding items to bill:', selectedItems);

      loading.value = true;
      try {
        // Get BOQ options for default values
        const optionsResult = await api.boqOptions.get();
        const options = optionsResult.success ? optionsResult.options : {};
        const defaultQuantity = options.newItems?.defaultQuantity || 1;

        for (const item of selectedItems) {
          console.log('Adding item:', {
            JobNo: selectedJob.value,
            ItemCode: item.PriceCode,
            CostCentre: selectedCostCentre.value || item.CostCentre,
            BLoad: selectedLoad.value,
            Quantity: defaultQuantity,
            UnitPrice: item.Price || 0,
            XDescription: item.Description
          });

          await api.boq.addItem({
            JobNo: selectedJob.value,
            ItemCode: item.PriceCode,
            CostCentre: selectedCostCentre.value || item.CostCentre,
            BLoad: selectedLoad.value,
            Quantity: defaultQuantity,
            UnitPrice: item.Price || 0,
            XDescription: item.Description || null
          });
        }

        // Reload bill
        await loadBill();
      } catch (error) {
        console.error('Error adding items:', error);
      } finally {
        loading.value = false;
      }
    }

    async function onDeleteItems(items) {
      if (!confirm(`Delete ${items.length} item(s)?`)) {
        return;
      }

      loading.value = true;
      try {
        for (const item of items) {
          await api.boq.deleteItem(
            item.JobNo,
            item.CostCentre,
            item.BLoad,
            item.LineNumber
          );
        }

        await loadBill();
      } catch (error) {
        console.error('Error deleting items:', error);
      } finally {
        loading.value = false;
      }
    }

    // Watchers
    // Note: Not watching selectedLoad since we display ALL loads in the grid
    // Skip initial watch during mount - we'll load manually after all values are set
    let isInitialized = false;
    watch([selectedJob, selectedCostCentre], () => {
      if (isInitialized) {
        console.log('🔄 Watch triggered - loading bill for:', selectedJob.value, selectedCostCentre.value);
        loadBill();
      }
    });

    // Save catalogue preferences
    async function saveCataloguePreferences() {
      try {
        const optionsResult = await api.boqOptions.get();
        const options = optionsResult.success ? optionsResult.options : {};

        await api.boqOptions.save({
          ...options,
          catalogue: {
            visible: catalogueSearchVisible.value,
            layoutHorizontal: catalogueLayoutHorizontal.value
          }
        });
      } catch (error) {
        console.error('Error saving catalogue preferences:', error);
      }
    }

    // Watch catalogue state and save preferences
    watch([catalogueSearchVisible, catalogueLayoutHorizontal], () => {
      saveCataloguePreferences();
    });

    // Initialize
    onMounted(async () => {
      // Load last used values and preferences from options
      const optionsResult = await api.boqOptions.get();
      if (optionsResult.success) {
        // Load last used values
        if (optionsResult.options.lastUsed) {
          const lastUsed = optionsResult.options.lastUsed;
          if (lastUsed.job) selectedJob.value = lastUsed.job;
          // Upgrade price level 0 to 1 (price level 0 doesn't exist)
          if (lastUsed.priceLevel !== undefined) {
            selectedPriceLevel.value = lastUsed.priceLevel === 0 ? 1 : lastUsed.priceLevel;
          }
          if (lastUsed.load) selectedLoad.value = lastUsed.load;
          if (lastUsed.costCentre) selectedCostCentre.value = lastUsed.costCentre;
        }

        // Load catalogue preferences
        if (optionsResult.options.catalogue) {
          if (optionsResult.options.catalogue.visible !== undefined) {
            catalogueSearchVisible.value = optionsResult.options.catalogue.visible;
          }
          if (optionsResult.options.catalogue.layoutHorizontal !== undefined) {
            catalogueLayoutHorizontal.value = optionsResult.options.catalogue.layoutHorizontal;
          }
        }

        // Load available loads from preferences
        const numberOfLoads = optionsResult.options.numberOfLoads || 10;
        availableLoads.value = Array.from({ length: numberOfLoads }, (_, i) => i + 1);
      } else {
        // Default to 10 loads
        availableLoads.value = Array.from({ length: 10 }, (_, i) => i + 1);
      }

      // Mark as initialized and load initial bill data
      isInitialized = true;
      if (selectedJob.value) {
        console.log('🚀 Initial load with job:', selectedJob.value, 'costCentre:', selectedCostCentre.value);
        loadBill();
      }

      // Focus job selector after a small delay
      setTimeout(() => {
        if (toolbarRef.value && toolbarRef.value.focusJobSelect) {
          toolbarRef.value.focusJobSelect();
        }
      }, 200);

      // Add F5 keyboard shortcut for refresh
      window.addEventListener('keydown', handleKeyDown);
    });

    // Cleanup keyboard listener
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeyDown);
    });

    // Handle keyboard shortcuts
    function handleKeyDown(event) {
      // F5 - Refresh
      if (event.key === 'F5') {
        event.preventDefault();
        loadBill();
      }
    }

    // Save lastUsed values when they change
    async function saveLastUsed() {
      try {
        const optionsResult = await api.boqOptions.get();
        const options = optionsResult.success ? optionsResult.options : {};

        await api.boqOptions.save({
          ...options,
          lastUsed: {
            job: selectedJob.value,
            priceLevel: selectedPriceLevel.value,
            load: selectedLoad.value,
            costCentre: selectedCostCentre.value
          }
        });
      } catch (error) {
        console.error('Error saving lastUsed:', error);
      }
    }

    // Watch for changes and save lastUsed
    watch([selectedJob, selectedCostCentre], () => {
      if (isInitialized) {
        saveLastUsed();
      }
    });

    // Workup Modal Handlers
    function openWorkupModal(itemData) {
      selectedWorkupItem.value = { ...itemData };
      showWorkupModal.value = true;
    }

    function closeWorkupModal() {
      showWorkupModal.value = false;
      selectedWorkupItem.value = {};
    }

    async function saveWorkup({ workup, firstLine, isAdhocItem }) {
      loading.value = true;
      try {
        const item = selectedWorkupItem.value;

        console.log('📝 Saving workup for item:', item);
        console.log('   LineNumber:', item.LineNumber);
        console.log('   ItemCode:', item.ItemCode);

        if (!item.LineNumber) {
          console.error('❌ No LineNumber - cannot update workup!');
          alert('Error: Item has no LineNumber. Cannot save workup.');
          loading.value = false;
          return;
        }

        // Update workup in database
        const updateData = {
          JobNo: item.JobNo,
          CostCentre: item.CostCentre,
          BLoad: item.BLoad,
          LineNumber: item.LineNumber,
          Quantity: item.Quantity,
          UnitPrice: item.UnitPrice,
          XDescription: workup
        };

        console.log('📤 Sending update:', updateData);

        const result = await api.boq.updateItem(updateData);

        if (!result.success) {
          console.error('Failed to update workup:', result.message);
          alert('Failed to save workup: ' + result.message);
          loading.value = false;
          return;
        }

        // NOTE: For adhoc items, we do NOT update the catalogue description.
        // Each bill line stores its own description in XDescription (workup).
        // The first line of the workup is displayed as the item description.
        // This allows multiple instances of the same adhoc item code to have
        // different descriptions in the bill.
        if (isAdhocItem && firstLine && firstLine.trim()) {
          console.log(`ℹ️ Adhoc item ${item.ItemCode} - description stored in workup, not catalogue`);
        }

        // Close modal and reload
        closeWorkupModal();
        await loadBill();
        console.log('✅ Workup saved successfully');
      } catch (error) {
        console.error('Error saving workup:', error);
        alert('Error saving workup: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    return {
      toolbarRef,
      costCentrePanelRef,
      selectedJob,
      selectedPriceLevel,
      selectedLoad,
      selectedCostCentre,
      billDate,
      billItems,
      loading,
      catalogueSearchVisible,
      catalogueLayoutHorizontal,
      availableLoads,
      billTotal,
      showWorkupModal,
      selectedWorkupItem,
      loadBill,
      onCellValueChanged,
      onAddItems,
      onDeleteItems,
      openWorkupModal,
      closeWorkupModal,
      saveWorkup,
      onJobSelected
    };
  }
};
</script>

<style scoped>
.boq-tab {
  background-color: #fff;
}

.boq-content {
  position: relative;
}

.boq-main-section {
  flex: 1;
  min-height: 0;
  min-width: 0;
  transition: flex 0.3s ease;
}

/* Horizontal layout (catalogue at bottom) */
.boq-main-section.with-catalogue-horizontal {
  flex: 0 0 50%;
}

/* Vertical layout (catalogue on right) */
.boq-main-section.with-catalogue-vertical {
  flex: 0 0 60%;
}

.boq-grid-container {
  flex: 1;
  min-width: 0;
}

/* Horizontal catalogue panel (bottom) */
.catalogue-search-panel-horizontal {
  flex: 0 0 50%;
  border-top: 2px solid #dee2e6;
  background-color: #f8f9fa;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Vertical catalogue panel (right sidebar) */
.catalogue-search-panel-vertical {
  flex: 0 0 40%;
  border-left: 2px solid #dee2e6;
  background-color: #f8f9fa;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 400px;
}

.status-bar {
  flex-shrink: 0;
}

/* Vertical slide transition (for horizontal layout) */
.slide-vertical-enter-active,
.slide-vertical-leave-active {
  transition: all 0.3s ease;
}

.slide-vertical-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-vertical-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Horizontal slide transition (for vertical layout) */
.slide-horizontal-enter-active,
.slide-horizontal-leave-active {
  transition: all 0.3s ease;
}

.slide-horizontal-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-horizontal-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
