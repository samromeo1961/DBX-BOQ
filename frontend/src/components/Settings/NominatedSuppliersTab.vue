<template>
  <div class="nominated-suppliers-tab">
    <div class="card">
      <div class="card-header bg-light">
        <h5 class="mb-0">
          <i class="bi bi-truck me-2"></i>
          Manage Nominated Suppliers by Cost Centre
        </h5>
        <small class="text-muted">
          Configure which suppliers can be used for each cost centre
        </small>
      </div>
      <div class="card-body">
        <!-- Cost Centre Selection -->
        <div class="row mb-4">
          <div class="col-md-6">
            <label class="form-label fw-bold">Select Cost Centre</label>
            <SearchableSelect
              :options="costCentreOptions"
              v-model="selectedCostCentre"
              placeholder="Search and select a cost centre..."
              @update:modelValue="loadNominatedSuppliers"
            />
          </div>
        </div>

        <!-- Nominated Suppliers List -->
        <div v-if="selectedCostCentre" class="row">
          <!-- Current Nominated Suppliers -->
          <div class="col-md-6">
            <div class="card border-primary">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                  <i class="bi bi-check-circle me-2"></i>
                  Nominated Suppliers
                  <span class="badge bg-light text-primary ms-2">{{ nominatedSuppliers.length }}</span>
                </h6>
              </div>
              <div class="card-body p-0">
                <div v-if="nominatedSuppliers.length === 0" class="p-4 text-center text-muted">
                  <i class="bi bi-inbox display-4 d-block mb-2"></i>
                  <p class="mb-0">No nominated suppliers for this cost centre</p>
                  <small>Add suppliers from the list on the right</small>
                </div>
                <div v-else class="list-group list-group-flush" style="max-height: 500px; overflow-y: auto;">
                  <div
                    v-for="supplier in nominatedSuppliers"
                    :key="supplier.Code"
                    class="list-group-item d-flex justify-content-between align-items-start"
                  >
                    <div class="flex-grow-1">
                      <div class="fw-bold">{{ supplier.Name }}</div>
                      <small class="text-muted">Code: {{ supplier.Code }}</small>
                    </div>
                    <button
                      class="btn btn-sm btn-outline-danger"
                      @click="removeSupplier(supplier.Code)"
                      :disabled="loading"
                    >
                      <i class="bi bi-trash me-1"></i>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Available Suppliers to Add -->
          <div class="col-md-6">
            <div class="card border-success">
              <div class="card-header bg-success text-white d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                  <i class="bi bi-plus-circle me-2"></i>
                  Add Suppliers
                </h6>
                <button
                  class="btn btn-sm btn-light"
                  @click="openNewSupplierModal"
                  :disabled="!selectedCostCentre"
                  title="Create a new supplier"
                >
                  <i class="bi bi-plus-lg me-1"></i>
                  New Supplier
                </button>
              </div>
              <div class="card-body">
                <!-- Filter and Search Row -->
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label fw-bold">Filter by Category</label>
                    <SearchableSelect
                      :options="categoryFilterOptions"
                      v-model="selectedCategory"
                      placeholder="All categories..."
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-bold">Search Suppliers</label>
                    <input
                      v-model="searchQuery"
                      type="text"
                      class="form-control"
                      placeholder="Search by code or name..."
                    />
                  </div>
                </div>

                <!-- Filtered Supplier List -->
                <div class="list-group" style="max-height: 400px; overflow-y: auto;">
                  <div
                    v-for="supplier in filteredAvailableSuppliers"
                    :key="supplier.Code"
                    class="list-group-item d-flex justify-content-between align-items-start"
                  >
                    <div class="flex-grow-1">
                      <div class="fw-bold">{{ supplier.Name }}</div>
                      <div>
                        <small class="badge bg-light text-muted border me-2">{{ supplier.GroupName || 'No Group' }}</small>
                        <small class="text-muted">Code: {{ supplier.Code }}</small>
                      </div>
                    </div>
                    <div class="btn-group">
                      <button
                        class="btn btn-sm btn-outline-primary"
                        @click="editSupplier(supplier.Code)"
                        :disabled="loading"
                        title="Edit supplier details"
                      >
                        <i class="bi bi-pencil"></i>
                      </button>
                      <button
                        class="btn btn-sm btn-success"
                        @click="addSupplier(supplier.Code)"
                        :disabled="loading || isAlreadyNominated(supplier.Code)"
                        title="Add to nominated list"
                      >
                        <i class="bi bi-plus-lg"></i>
                      </button>
                    </div>
                  </div>
                  <div v-if="filteredAvailableSuppliers.length === 0" class="text-center p-3 text-muted">
                    <i class="bi bi-search display-6 d-block mb-2"></i>
                    No suppliers found
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Help Text -->
        <div v-if="!selectedCostCentre" class="alert alert-info mt-3">
          <i class="bi bi-info-circle me-2"></i>
          <strong>About Nominated Suppliers:</strong>
          Nominated suppliers are the suppliers that can be selected when creating purchase orders for a specific cost centre.
          This helps control which suppliers are used for each trade/specialty.
        </div>
      </div>
    </div>

    <!-- New Supplier Modal -->
    <NewSupplierModal
      ref="newSupplierModalRef"
      :current-cost-centre="selectedCostCentre"
      @supplier-created="handleSupplierCreated"
    />

    <!-- Edit Supplier Modal -->
    <EditSupplierModal
      ref="editSupplierModalRef"
      @supplier-updated="handleSupplierUpdated"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import SearchableSelect from '@/components/common/SearchableSelect.vue';
import NewSupplierModal from './NewSupplierModal.vue';
import EditSupplierModal from './EditSupplierModal.vue';

export default {
  name: 'NominatedSuppliersTab',
  components: {
    SearchableSelect,
    NewSupplierModal,
    EditSupplierModal
  },
  setup() {
    const api = useElectronAPI();

    const costCentres = ref([]);
    const selectedCostCentre = ref('');
    const nominatedSuppliers = ref([]);
    const allSuppliers = ref([]);
    const supplierGroups = ref([]);
    const searchQuery = ref('');
    const selectedCategory = ref('');
    const loading = ref(false);
    const newSupplierModalRef = ref(null);
    const editSupplierModalRef = ref(null);

    // Computed: Cost centre options for SearchableSelect
    const costCentreOptions = computed(() => {
      return costCentres.value.map(cc => ({
        value: cc.Code,
        label: `${cc.Code} - ${cc.Name}`
      }));
    });

    // Computed: Category filter options
    const categoryFilterOptions = computed(() => {
      const options = [{ value: '', label: 'All Categories' }];
      supplierGroups.value.forEach(group => {
        options.push({
          value: group.Code,
          label: group.Name
        });
      });
      return options;
    });

    // Computed: Available suppliers (not already nominated)
    const availableSuppliers = computed(() => {
      const nominatedCodes = nominatedSuppliers.value.map(s => s.Code);
      return allSuppliers.value.filter(s => !nominatedCodes.includes(s.Code));
    });

    // Computed: Filtered available suppliers based on search and category
    const filteredAvailableSuppliers = computed(() => {
      let filtered = availableSuppliers.value;

      // Filter by category
      if (selectedCategory.value) {
        filtered = filtered.filter(s => s.GroupNumber === selectedCategory.value);
      }

      // Filter by search query
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(s =>
          s.Code.toLowerCase().includes(query) ||
          s.Name.toLowerCase().includes(query) ||
          (s.GroupName && s.GroupName.toLowerCase().includes(query))
        );
      }

      return filtered;
    });

    // Check if supplier is already nominated
    function isAlreadyNominated(supplierCode) {
      return nominatedSuppliers.value.some(s => s.Code === supplierCode);
    }

    // Load cost centres
    async function loadCostCentres() {
      try {
        console.log('🔍 Loading cost centres...');
        const result = await api.costCentres.getList();
        console.log('📊 Cost centres result:', result);

        if (result.success) {
          console.log('📋 Cost centres data:', result.data);
          console.log('📋 Total cost centres:', result.data.length);

          // Filter out recipe cost centres (10-99) and Ad Hoc (000)
          const filtered = result.data.filter(cc => {
            // Tier might be string or number
            const tier = parseInt(cc.Tier);
            const isValid = tier === 1 &&
              (cc.Code < '10' || cc.Code >= '100') &&
              cc.Code !== '000';
            if (!isValid) {
              console.log(`Excluding ${cc.Code} (Tier ${cc.Tier}, Name: ${cc.Name})`);
            }
            return isValid;
          });

          console.log('✅ Filtered cost centres:', filtered.length);
          costCentres.value = filtered;
        } else {
          console.error('❌ Failed to load cost centres:', result.message);
        }
      } catch (error) {
        console.error('❌ Error loading cost centres:', error);
      }
    }

    // Load all suppliers
    async function loadAllSuppliers() {
      try {
        const result = await api.purchaseOrders.getAllSuppliers();
        if (result.success && result.suppliers) {
          // Also fetch supplier groups to get group names
          const suppliersWithGroups = await Promise.all(
            result.suppliers.map(async (s) => {
              // Get group name from SupplierGroup table if needed
              return {
                Code: s.Supplier_Code,
                Name: s.SupplierName,
                GroupNumber: s.SuppGroup,
                GroupName: getGroupName(s.SuppGroup)
              };
            })
          );
          allSuppliers.value = suppliersWithGroups;
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    }

    // Load supplier groups from database
    async function loadSupplierGroups() {
      try {
        const result = await api.supplierGroups.getList();
        if (result.success && result.data) {
          supplierGroups.value = result.data;
        }
      } catch (error) {
        console.error('Error loading supplier groups:', error);
      }
    }

    // Helper to get group name from number
    function getGroupName(groupNumber) {
      const group = supplierGroups.value.find(g => g.Code === groupNumber);
      return group ? group.Name : 'Uncategorized';
    }

    // Load nominated suppliers for selected cost centre
    async function loadNominatedSuppliers() {
      if (!selectedCostCentre.value) {
        nominatedSuppliers.value = [];
        return;
      }

      // Clear search query when changing cost centres
      searchQuery.value = '';

      try {
        loading.value = true;
        console.log('🔍 Loading nominated suppliers for:', selectedCostCentre.value);
        const result = await api.purchaseOrders.getPreferredSuppliers(selectedCostCentre.value);
        console.log('📊 Nominated suppliers result:', result);

        if (result.success && result.suppliers) {
          console.log('📋 Nominated suppliers data:', result.suppliers);
          nominatedSuppliers.value = result.suppliers.map(s => ({
            Code: s.Code,
            Name: s.Name
          }));
          console.log('✅ Loaded', nominatedSuppliers.value.length, 'nominated suppliers');
        } else if (result.success) {
          // Success but no suppliers - empty list
          console.log('✅ No nominated suppliers for this cost centre');
          nominatedSuppliers.value = [];
        } else {
          console.error('❌ Failed to load nominated suppliers:', result.message);
          nominatedSuppliers.value = [];
        }
      } catch (error) {
        console.error('❌ Error loading nominated suppliers:', error);
        nominatedSuppliers.value = [];
      } finally {
        loading.value = false;
      }
    }

    // Add supplier to nominated list
    async function addSupplier(supplierCode) {
      if (!selectedCostCentre.value) return;

      try {
        loading.value = true;
        const result = await api.purchaseOrders.addNominatedSupplier(
          selectedCostCentre.value,
          supplierCode
        );

        if (result.success) {
          // Reload nominated suppliers
          await loadNominatedSuppliers();
        } else {
          alert('Error: ' + (result.message || 'Failed to add supplier'));
        }
      } catch (error) {
        console.error('Error adding supplier:', error);
        alert('Error adding supplier: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    // Remove supplier from nominated list
    async function removeSupplier(supplierCode) {
      if (!selectedCostCentre.value) return;

      if (!confirm(`Remove supplier ${supplierCode} from nominated list?`)) {
        return;
      }

      try {
        loading.value = true;
        const result = await api.purchaseOrders.removeNominatedSupplier(
          selectedCostCentre.value,
          supplierCode
        );

        if (result.success) {
          // Reload nominated suppliers
          await loadNominatedSuppliers();
        } else {
          alert('Error: ' + (result.message || 'Failed to remove supplier'));
        }
      } catch (error) {
        console.error('Error removing supplier:', error);
        alert('Error removing supplier: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    // Open new supplier modal
    function openNewSupplierModal() {
      if (newSupplierModalRef.value) {
        newSupplierModalRef.value.show();
      }
    }

    // Handle supplier created event
    async function handleSupplierCreated(event) {
      console.log('Supplier created:', event);

      try {
        // Reload all suppliers to include the new one
        await loadAllSuppliers();

        // If user wants to add to nominated list, do so
        if (event.addToNominated && selectedCostCentre.value) {
          loading.value = true;
          const result = await api.purchaseOrders.addNominatedSupplier(
            selectedCostCentre.value,
            event.code
          );

          if (result.success) {
            // Reload nominated suppliers
            await loadNominatedSuppliers();
            alert(`Supplier "${event.name}" created and added to nominated list!`);
          } else {
            alert(`Supplier "${event.name}" created, but failed to add to nominated list: ${result.message}`);
          }
        } else {
          alert(`Supplier "${event.name}" created successfully!`);
        }
      } catch (error) {
        console.error('Error handling supplier creation:', error);
        alert('Supplier created, but an error occurred: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    // Open edit supplier modal
    function editSupplier(supplierCode) {
      if (editSupplierModalRef.value) {
        editSupplierModalRef.value.show(supplierCode);
      }
    }

    // Handle supplier updated event
    async function handleSupplierUpdated(event) {
      console.log('Supplier updated:', event);

      try {
        // Reload all suppliers to reflect the changes
        await loadAllSuppliers();
        alert(`Supplier "${event.name}" updated successfully!`);
      } catch (error) {
        console.error('Error handling supplier update:', error);
        alert('Supplier updated, but an error occurred: ' + error.message);
      }
    }

    onMounted(async () => {
      await loadCostCentres();
      await loadSupplierGroups();
      await loadAllSuppliers();
    });

    return {
      costCentres,
      costCentreOptions,
      selectedCostCentre,
      nominatedSuppliers,
      allSuppliers,
      availableSuppliers,
      filteredAvailableSuppliers,
      categoryFilterOptions,
      searchQuery,
      selectedCategory,
      loading,
      newSupplierModalRef,
      editSupplierModalRef,
      loadNominatedSuppliers,
      addSupplier,
      removeSupplier,
      isAlreadyNominated,
      openNewSupplierModal,
      editSupplier,
      handleSupplierCreated,
      handleSupplierUpdated
    };
  }
};
</script>

<style scoped>
.list-group-item {
  transition: background-color 0.2s;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>
