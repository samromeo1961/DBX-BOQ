<template>
  <div class="modal fade" id="newSupplierModal" tabindex="-1" aria-labelledby="newSupplierModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title" id="newSupplierModalLabel">
            <i class="bi bi-plus-circle me-2"></i>
            Create New Supplier
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="handleSubmit">
            <!-- Supplier Code and Name -->
            <div class="row mb-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">Supplier Code <span class="text-danger">*</span></label>
                <input
                  v-model="formData.Code"
                  type="text"
                  class="form-control"
                  placeholder="e.g., SUP001"
                  required
                  :disabled="saving"
                />
                <small class="text-muted">Unique identifier</small>
              </div>
              <div class="col-md-8">
                <label class="form-label fw-bold">Supplier Name <span class="text-danger">*</span></label>
                <div class="input-group">
                  <input
                    v-model="formData.Name"
                    type="text"
                    class="form-control"
                    placeholder="e.g., ABC Building Supplies"
                    required
                    :disabled="saving"
                  />
                  <button
                    type="button"
                    class="btn btn-outline-primary"
                    @click="searchSupplierWeb"
                    :disabled="!formData.Name.trim() || saving"
                    title="Search for this supplier on the web"
                  >
                    <i class="bi bi-search"></i>
                  </button>
                </div>
                <small class="text-muted">Click the search button to look up supplier details online</small>
              </div>
            </div>

            <!-- Supplier Group -->
            <div class="row mb-3">
              <div class="col-md-12">
                <label class="form-label fw-bold">Supplier Group</label>
                <SearchableSelect
                  :options="supplierGroupOptions"
                  v-model="formData.Group_"
                  placeholder="Search and select a supplier group..."
                  :disabled="saving"
                />
              </div>
            </div>

            <!-- Contact Information -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">Contact Person</label>
                <input
                  v-model="formData.Contact"
                  type="text"
                  class="form-control"
                  placeholder="e.g., John Smith"
                  :disabled="saving"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Email</label>
                <input
                  v-model="formData.Email"
                  type="email"
                  class="form-control"
                  placeholder="e.g., contact@supplier.com"
                  :disabled="saving"
                />
              </div>
            </div>

            <!-- Phone Numbers -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">Phone</label>
                <input
                  v-model="formData.Phone"
                  type="text"
                  class="form-control"
                  placeholder="e.g., (02) 1234 5678"
                  :disabled="saving"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label fw-bold">Mobile</label>
                <input
                  v-model="formData.Mobile"
                  type="text"
                  class="form-control"
                  placeholder="e.g., 0412 345 678"
                  :disabled="saving"
                />
              </div>
            </div>

            <!-- Address -->
            <div class="mb-3">
              <label class="form-label fw-bold">Address</label>
              <input
                v-model="formData.Address"
                type="text"
                class="form-control"
                placeholder="Street address"
                :disabled="saving"
              />
            </div>

            <!-- Town, State, Postcode -->
            <div class="row mb-3">
              <div class="col-md-5">
                <label class="form-label fw-bold">Town/City</label>
                <input
                  v-model="formData.Town"
                  type="text"
                  class="form-control"
                  placeholder="e.g., Sydney"
                  :disabled="saving"
                />
              </div>
              <div class="col-md-3">
                <label class="form-label fw-bold">State</label>
                <select v-model="formData.State" class="form-select" :disabled="saving">
                  <option value="">-- Select --</option>
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="SA">SA</option>
                  <option value="WA">WA</option>
                  <option value="TAS">TAS</option>
                  <option value="NT">NT</option>
                  <option value="ACT">ACT</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-bold">Postcode</label>
                <input
                  v-model="formData.PostCode"
                  type="text"
                  class="form-control"
                  placeholder="e.g., 2000"
                  :disabled="saving"
                />
              </div>
            </div>

            <!-- ABN -->
            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label fw-bold">ABN</label>
                <input
                  v-model="formData.ABN"
                  type="text"
                  class="form-control"
                  placeholder="e.g., 12 345 678 901"
                  :disabled="saving"
                />
              </div>
              <div class="col-md-6">
                <div class="form-check mt-4">
                  <input
                    v-model="formData.GST"
                    class="form-check-input"
                    type="checkbox"
                    id="gstCheck"
                    :disabled="saving"
                  />
                  <label class="form-check-label" for="gstCheck">
                    GST Registered
                  </label>
                </div>
              </div>
            </div>

            <!-- Add to Current Cost Centre -->
            <div v-if="currentCostCentre" class="alert alert-info">
              <div class="form-check">
                <input
                  v-model="addToNominated"
                  class="form-check-input"
                  type="checkbox"
                  id="addToNominatedCheck"
                  :disabled="saving"
                />
                <label class="form-check-label" for="addToNominatedCheck">
                  <strong>Add to nominated suppliers for {{ currentCostCentre }}</strong>
                </label>
              </div>
            </div>

            <!-- Error Message -->
            <div v-if="errorMessage" class="alert alert-danger">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {{ errorMessage }}
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="saving">
            Cancel
          </button>
          <button type="button" class="btn btn-success" @click="handleSubmit" :disabled="saving || !isValid">
            <span v-if="saving">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Creating...
            </span>
            <span v-else>
              <i class="bi bi-check-lg me-2"></i>
              Create Supplier
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import { Modal } from 'bootstrap';
import SearchableSelect from '@/components/common/SearchableSelect.vue';

export default {
  name: 'NewSupplierModal',
  components: {
    SearchableSelect
  },
  props: {
    currentCostCentre: {
      type: String,
      default: null
    }
  },
  emits: ['supplier-created'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const formData = ref({
      Code: '',
      Name: '',
      Contact: '',
      Email: '',
      Phone: '',
      Mobile: '',
      Address: '',
      Town: '',
      State: '',
      PostCode: '',
      ABN: '',
      Group_: null,
      GST: true,
      Archived: false,
      PreventOrders: false,
      PreventPosting: false
    });

    const addToNominated = ref(true);
    const saving = ref(false);
    const errorMessage = ref('');
    const supplierGroups = ref([]);

    const isValid = computed(() => {
      return formData.value.Code.trim() && formData.value.Name.trim();
    });

    const supplierGroupOptions = computed(() => {
      return supplierGroups.value.map(group => ({
        value: group.Code,
        label: group.Name
      }));
    });

    // Load supplier groups from database
    async function loadSupplierGroups() {
      try {
        const result = await api.supplierGroups.getList();
        if (result.success && result.data) {
          supplierGroups.value = result.data;
          console.log('Loaded supplier groups:', supplierGroups.value);
        } else {
          console.error('Failed to load supplier groups:', result.message);
        }
      } catch (error) {
        console.error('Error loading supplier groups:', error);
      }
    }

    function resetForm() {
      formData.value = {
        Code: '',
        Name: '',
        Contact: '',
        Email: '',
        Phone: '',
        Mobile: '',
        Address: '',
        Town: '',
        State: '',
        PostCode: '',
        ABN: '',
        Group_: null,
        GST: true,
        Archived: false,
        PreventOrders: false,
        PreventPosting: false
      };
      addToNominated.value = true;
      errorMessage.value = '';
    }

    async function handleSubmit() {
      if (!isValid.value || saving.value) return;

      try {
        saving.value = true;
        errorMessage.value = '';

        // Convert reactive proxy to plain object for IPC serialization
        const plainFormData = JSON.parse(JSON.stringify(formData.value));

        console.log('Creating supplier:', plainFormData);
        const result = await api.suppliers.createSupplier(plainFormData);

        if (result.success) {
          console.log('Supplier created successfully:', result.data);

          // Emit event with supplier code and whether to add to nominated
          emit('supplier-created', {
            code: formData.value.Code,
            name: formData.value.Name,
            addToNominated: addToNominated.value && props.currentCostCentre
          });

          // Close modal
          const modalElement = document.getElementById('newSupplierModal');
          const modalInstance = Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }

          // Reset form
          resetForm();
        } else {
          errorMessage.value = result.message || 'Failed to create supplier';
        }
      } catch (error) {
        console.error('Error creating supplier:', error);
        errorMessage.value = error.message || 'An error occurred while creating the supplier';
      } finally {
        saving.value = false;
      }
    }

    // Search for supplier on the web
    function searchSupplierWeb() {
      if (!formData.value.Name.trim()) return;

      // Construct Google search URL
      const searchQuery = encodeURIComponent(formData.value.Name + ' supplier Australia');
      const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

      // Open in default browser
      api.shell.openExternal(searchUrl);
    }

    // Expose reset function for parent component
    function show() {
      resetForm();
      const modalElement = document.getElementById('newSupplierModal');
      const modal = new Modal(modalElement);
      modal.show();
    }

    // Load supplier groups on mount
    onMounted(async () => {
      await loadSupplierGroups();
    });

    return {
      formData,
      addToNominated,
      saving,
      errorMessage,
      supplierGroupOptions,
      isValid,
      handleSubmit,
      resetForm,
      show,
      searchSupplierWeb
    };
  }
};
</script>

<style scoped>
.modal-body {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
