<template>
  <div class="modal fade show" style="display: block;" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-truck me-2"></i>
            Assign Supplier to Selected Items
          </h5>
          <button
            type="button"
            class="btn-close"
            @click="$emit('close')"
          ></button>
        </div>

        <div class="modal-body">
          <!-- Selected Items Info -->
          <div class="mb-3">
            <label class="form-label fw-bold">Selected Items</label>
            <div class="selected-items-list border rounded p-2" style="max-height: 150px; overflow-y: auto;">
              <div v-if="selectedItems.length === 0" class="text-muted text-center py-2">
                No items selected
              </div>
              <div v-else>
                <div v-for="(item, index) in selectedItems" :key="index" class="small mb-1">
                  <strong>{{ item.ItemCode || 'No Code' }}</strong> - {{ item.Description || 'No Description' }}
                  <span class="text-muted">(Load {{ item.BLoad }})</span>
                </div>
              </div>
            </div>
            <div class="form-text">
              {{ selectedItems.length }} item(s) selected
            </div>
          </div>

          <!-- Load Selector -->
          <div class="mb-3">
            <label class="form-label fw-bold">Move to Load</label>
            <select
              v-model.number="newLoad"
              class="form-select"
              @change="loadNominatedSuppliers"
              :disabled="selectedItems.length === 0"
            >
              <option :value="null">Keep current Load(s)</option>
              <option v-for="load in availableLoads" :key="load" :value="load">
                Load {{ load }}
              </option>
            </select>
            <div class="form-text">
              Select a load to move the selected items to (optional)
            </div>
          </div>

          <!-- Supplier Selector -->
          <div class="mb-3">
            <label class="form-label fw-bold">Supplier</label>
            <div v-if="loadingSuppliers" class="text-center p-3">
              <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading suppliers...</span>
              </div>
            </div>
            <select
              v-else
              v-model="selectedSupplier"
              class="form-select"
              :disabled="selectedItems.length === 0 || nominatedSuppliers.length === 0"
            >
              <option :value="null">No Supplier / Remove Supplier</option>
              <option
                v-for="supplier in nominatedSuppliers"
                :key="supplier.Code"
                :value="supplier.Code"
              >
                {{ supplier.Name }} ({{ supplier.Code }})
              </option>
            </select>
            <div v-if="nominatedSuppliers.length === 0" class="form-text text-warning">
              <i class="bi bi-exclamation-triangle me-1"></i>
              No nominated suppliers found for this cost centre
            </div>
          </div>

          <!-- Preview Info -->
          <div v-if="selectedItems.length > 0" class="alert alert-info small">
            <i class="bi bi-info-circle me-1"></i>
            This will:
            <ul class="mb-0 mt-1">
              <li v-if="newLoad">Move {{ selectedItems.length }} item(s) to <strong>Load {{ newLoad }}</strong></li>
              <li v-if="selectedSupplier">Assign supplier <strong>{{ selectedSupplier }}</strong> to the selected items</li>
              <li v-if="!newLoad && !selectedSupplier">No changes will be made</li>
            </ul>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="$emit('close')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="assignSupplier"
            :disabled="selectedItems.length === 0 || (!newLoad && selectedSupplier === null) || saving"
          >
            <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
            <i v-else class="bi bi-check-lg me-1"></i>
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'AssignSupplierModal',
  props: {
    jobNo: String,
    costCentre: String,
    availableLoads: {
      type: Array,
      default: () => []
    },
    selectedItems: {
      type: Array,
      default: () => []
    }
  },
  emits: ['close', 'assigned'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const newLoad = ref(null);
    const selectedSupplier = ref(null);
    const nominatedSuppliers = ref([]);
    const loadingSuppliers = ref(false);
    const saving = ref(false);

    async function loadNominatedSuppliers() {
      if (!props.costCentre) {
        nominatedSuppliers.value = [];
        return;
      }

      loadingSuppliers.value = true;
      try {
        const result = await api.boq.getNominatedSuppliers(props.costCentre);
        if (result.success) {
          nominatedSuppliers.value = result.data || [];
          console.log(`✅ Loaded ${nominatedSuppliers.value.length} nominated suppliers`);
        } else {
          console.error('Failed to load nominated suppliers:', result.message);
          nominatedSuppliers.value = [];
        }
      } catch (error) {
        console.error('Error loading nominated suppliers:', error);
        nominatedSuppliers.value = [];
      } finally {
        loadingSuppliers.value = false;
      }
    }

    async function assignSupplier() {
      if (props.selectedItems.length === 0) {
        alert('No items selected');
        return;
      }

      if (!newLoad.value && selectedSupplier.value === null) {
        alert('Please select a Load to move items to, or a Supplier to assign');
        return;
      }

      saving.value = true;
      try {
        let successCount = 0;
        let errorCount = 0;

        // Update each selected item
        for (const item of props.selectedItems) {
          try {
            const result = await api.boq.updateItem({
              JobNo: item.JobNo,
              CostCentre: item.CostCentre,
              BLoad: item.BLoad,
              LineNumber: item.LineNumber,
              // Update BLoad if newLoad is specified, otherwise keep current
              newBLoad: newLoad.value || item.BLoad,
              // Update Supplier
              Supplier: selectedSupplier.value,
              // Keep other fields the same
              Quantity: item.Quantity,
              UnitPrice: item.UnitPrice,
              XDescription: item.Workup
            });

            if (result.success) {
              successCount++;
            } else {
              console.error(`Failed to update item ${item.ItemCode}:`, result.message);
              errorCount++;
            }
          } catch (error) {
            console.error(`Error updating item ${item.ItemCode}:`, error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          console.log(`✅ Updated ${successCount} item(s)`);
          emit('assigned', {
            load: newLoad.value,
            supplier: selectedSupplier.value,
            rowsAffected: successCount
          });
          emit('close');
        }

        if (errorCount > 0) {
          alert(`${successCount} item(s) updated successfully, ${errorCount} failed`);
        }
      } catch (error) {
        console.error('Error assigning supplier:', error);
        alert('Error assigning supplier: ' + error.message);
      } finally {
        saving.value = false;
      }
    }

    onMounted(() => {
      loadNominatedSuppliers();
    });

    return {
      newLoad,
      selectedSupplier,
      nominatedSuppliers,
      loadingSuppliers,
      saving,
      loadNominatedSuppliers,
      assignSupplier
    };
  }
};
</script>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-dialog {
  max-width: 600px;
}

.form-label.fw-bold {
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.selected-items-list {
  background-color: #f8f9fa;
}
</style>
