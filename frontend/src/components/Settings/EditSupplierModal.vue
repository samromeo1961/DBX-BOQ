<template>
  <div class="modal fade" id="editSupplierModal" tabindex="-1" aria-labelledby="editSupplierModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title" id="editSupplierModalLabel">
            <i class="bi bi-pencil me-2"></i>
            Edit Supplier
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div v-if="loading" class="text-center p-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading supplier details...</p>
          </div>

          <form v-else @submit.prevent="handleSubmit">
            <!-- Supplier Code (Read-only) and Name -->
            <div class="row mb-3">
              <div class="col-md-4">
                <label class="form-label fw-bold">Supplier Code</label>
                <input
                  v-model="formData.Code"
                  type="text"
                  class="form-control"
                  readonly
                  disabled
                />
                <small class="text-muted">Cannot be changed</small>
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
                    id="gstCheckEdit"
                    :disabled="saving"
                  />
                  <label class="form-check-label" for="gstCheckEdit">
                    GST Registered
                  </label>
                </div>
              </div>
            </div>

            <!-- Status Options -->
            <div class="row mb-3">
              <div class="col-md-12">
                <label class="form-label fw-bold">Status Options</label>
                <div class="form-check">
                  <input
                    v-model="formData.Archived"
                    class="form-check-input"
                    type="checkbox"
                    id="archivedCheck"
                    :disabled="saving"
                  />
                  <label class="form-check-label" for="archivedCheck">
                    Archived (hidden from lists)
                  </label>
                </div>
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
          <button type="button" class="btn btn-primary" @click="handleSubmit" :disabled="saving || loading || !isValid">
            <span v-if="saving">
              <span class="spinner-border spinner-border-sm me-2"></span>
              Saving...
            </span>
            <span v-else>
              <i class="bi bi-check-lg me-2"></i>
              Save Changes
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
  name: 'EditSupplierModal',
  components: {
    SearchableSelect
  },
  emits: ['supplier-updated'],
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

    const loading = ref(false);
    const saving = ref(false);
    const errorMessage = ref('');
    const supplierGroups = ref([]);

    const isValid = computed(() => {
      return formData.value.Code && formData.value.Name.trim();
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
        }
      } catch (error) {
        console.error('Error loading supplier groups:', error);
      }
    }

    // Load supplier details
    async function loadSupplier(supplierCode) {
      try {
        loading.value = true;
        errorMessage.value = '';

        const result = await api.suppliers.getSupplier(supplierCode);
        if (result.success && result.data) {
          // Map the data to formData
          formData.value = {
            Code: result.data.Code,
            Name: result.data.Name || '',
            Contact: result.data.Contact || '',
            Email: result.data.Email || '',
            Phone: result.data.Phone || '',
            Mobile: result.data.Mobile || '',
            Address: result.data.Address || '',
            Town: result.data.Town || '',
            State: result.data.State || '',
            PostCode: result.data.PostCode || '',
            ABN: result.data.ABN || '',
            Group_: result.data.Group_ || null,
            GST: result.data.GST ? true : false,
            Archived: result.data.Archived ? true : false,
            PreventOrders: result.data.PreventOrders ? true : false,
            PreventPosting: result.data.PreventPosting ? true : false
          };
        } else {
          errorMessage.value = result.message || 'Failed to load supplier';
        }
      } catch (error) {
        console.error('Error loading supplier:', error);
        errorMessage.value = error.message || 'An error occurred while loading the supplier';
      } finally {
        loading.value = false;
      }
    }

    async function handleSubmit() {
      if (!isValid.value || saving.value || loading.value) return;

      try {
        saving.value = true;
        errorMessage.value = '';

        // Convert reactive proxy to plain object for IPC serialization
        const plainFormData = JSON.parse(JSON.stringify(formData.value));

        console.log('Updating supplier:', plainFormData);
        const result = await api.suppliers.updateSupplier(plainFormData);

        if (result.success) {
          console.log('Supplier updated successfully');

          // Emit event
          emit('supplier-updated', {
            code: formData.value.Code,
            name: formData.value.Name
          });

          // Close modal
          const modalElement = document.getElementById('editSupplierModal');
          const modalInstance = Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
          }
        } else {
          errorMessage.value = result.message || 'Failed to update supplier';
        }
      } catch (error) {
        console.error('Error updating supplier:', error);
        errorMessage.value = error.message || 'An error occurred while updating the supplier';
      } finally {
        saving.value = false;
      }
    }

    // Search for supplier on the web
    function searchSupplierWeb() {
      if (!formData.value.Name.trim()) return;

      const searchQuery = encodeURIComponent(formData.value.Name + ' supplier Australia');
      const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

      api.shell.openExternal(searchUrl);
    }

    // Show modal and load supplier
    async function show(supplierCode) {
      errorMessage.value = '';
      const modalElement = document.getElementById('editSupplierModal');
      const modal = new Modal(modalElement);
      modal.show();

      await loadSupplier(supplierCode);
    }

    // Load supplier groups on mount
    onMounted(async () => {
      await loadSupplierGroups();
    });

    return {
      formData,
      loading,
      saving,
      errorMessage,
      supplierGroupOptions,
      isValid,
      handleSubmit,
      searchSupplierWeb,
      show
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
