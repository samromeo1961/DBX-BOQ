<template>
  <div class="companies-tab">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Company Management</h5>
      <button class="btn btn-primary btn-sm" @click="showAddCompany">
        <i class="bi bi-plus-lg me-1"></i>
        Add Company
      </button>
    </div>

    <!-- Companies List -->
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <div v-else-if="companies.length === 0" class="text-center text-muted py-5">
          <i class="bi bi-building" style="font-size: 3rem;"></i>
          <p class="mt-3">No companies configured yet</p>
          <button class="btn btn-primary" @click="showAddCompany">
            Add Your First Company
          </button>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 50px;"></th>
                <th>Company Name</th>
                <th>System Database</th>
                <th>Job Database</th>
                <th>ABN</th>
                <th style="width: 120px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="company in companies"
                :key="company.id"
                :class="{ 'table-primary': company.id === currentCompanyId }"
              >
                <td class="text-center">
                  <i
                    v-if="company.id === currentCompanyId"
                    class="bi bi-check-circle-fill text-primary"
                    title="Active Company"
                  ></i>
                </td>
                <td>
                  <strong>{{ company.name }}</strong>
                  <span v-if="company.id === currentCompanyId" class="badge bg-primary ms-2">
                    Active
                  </span>
                </td>
                <td><code class="small">{{ company.systemDatabase }}</code></td>
                <td><code class="small">{{ company.jobDatabase }}</code></td>
                <td>{{ company.abn || '-' }}</td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button
                      v-if="company.id !== currentCompanyId"
                      class="btn btn-outline-primary"
                      @click="switchToCompany(company.id)"
                      title="Switch to this company"
                    >
                      <i class="bi bi-arrow-left-right"></i>
                    </button>
                    <button
                      class="btn btn-outline-secondary"
                      @click="editCompany(company)"
                      title="Edit company"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="confirmDeleteCompany(company)"
                      title="Delete company"
                      :disabled="company.id === currentCompanyId"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Company Edit Modal -->
    <div
      class="modal fade"
      :class="{ show: showModal }"
      :style="{ display: showModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editMode ? 'Edit Company' : 'Add Company' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveCompanyForm">
              <!-- Basic Information -->
              <div class="row mb-3">
                <div class="col-md-8">
                  <label class="form-label">Company Name <span class="text-danger">*</span></label>
                  <input
                    v-model="formData.name"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label">ABN</label>
                  <input
                    v-model="formData.abn"
                    type="text"
                    class="form-control"
                    placeholder="12 345 678 901"
                  />
                </div>
              </div>

              <!-- Database Configuration -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">
                    System Database <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="formData.systemDatabase"
                    type="text"
                    class="form-control"
                    placeholder="e.g., CROWNESYS"
                    required
                  />
                  <small class="form-text text-muted">
                    Database containing PriceList, Recipe, etc.
                  </small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">
                    Job Database <span class="text-danger">*</span>
                  </label>
                  <input
                    v-model="formData.jobDatabase"
                    type="text"
                    class="form-control"
                    placeholder="e.g., CROWNEJOB"
                    required
                  />
                  <small class="form-text text-muted">
                    Database containing Bill, Orders, Jobs
                  </small>
                </div>
              </div>

              <!-- Address Information -->
              <div class="mb-3">
                <label class="form-label">Address Line 1</label>
                <input v-model="formData.address1" type="text" class="form-control" />
              </div>

              <div class="mb-3">
                <label class="form-label">Address Line 2</label>
                <input v-model="formData.address2" type="text" class="form-control" />
              </div>

              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">City</label>
                  <input v-model="formData.city" type="text" class="form-control" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">State</label>
                  <input v-model="formData.state" type="text" class="form-control" maxlength="3" />
                </div>
                <div class="col-md-3">
                  <label class="form-label">Postcode</label>
                  <input v-model="formData.postCode" type="text" class="form-control" maxlength="4" />
                </div>
              </div>

              <!-- Contact Information -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Phone</label>
                  <input v-model="formData.phone" type="tel" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fax</label>
                  <input v-model="formData.fax" type="tel" class="form-control" />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input v-model="formData.email" type="email" class="form-control" />
              </div>

              <!-- Logo Path -->
              <div class="mb-3">
                <label class="form-label">Report Logo Path</label>
                <input
                  v-model="formData.logoPath"
                  type="text"
                  class="form-control"
                  placeholder="C:\Path\To\Logo.png"
                />
                <small class="form-text text-muted">
                  Path to company logo image file for reports
                </small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveCompanyForm"
              :disabled="saving"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ editMode ? 'Update Company' : 'Add Company' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div v-if="showModal" class="modal-backdrop fade show"></div>

    <!-- Delete Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showDeleteModal }"
      :style="{ display: showDeleteModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Delete</h5>
            <button type="button" class="btn-close btn-close-white" @click="showDeleteModal = false"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete <strong>{{ companyToDelete?.name }}</strong>?</p>
            <p class="text-danger mb-0">
              <i class="bi bi-exclamation-triangle me-1"></i>
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" @click="deleteCompany">
              Delete Company
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal Backdrop -->
    <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'CompaniesTab',
  emits: ['reload'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const companies = ref([]);
    const currentCompanyId = ref(null);
    const loading = ref(false);
    const saving = ref(false);
    const showModal = ref(false);
    const showDeleteModal = ref(false);
    const editMode = ref(false);
    const companyToDelete = ref(null);

    const formData = ref({
      id: null,
      name: '',
      systemDatabase: '',
      jobDatabase: '',
      abn: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postCode: '',
      phone: '',
      fax: '',
      email: '',
      logoPath: ''
    });

    async function loadCompanies() {
      loading.value = true;
      try {
        const result = await api.settings.getCompanies();
        companies.value = result;

        const currentCompany = await api.settings.getCurrentCompany();
        currentCompanyId.value = currentCompany?.id || null;
      } catch (error) {
        console.error('Error loading companies:', error);
        alert('Error loading companies: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function showAddCompany() {
      editMode.value = false;
      formData.value = {
        id: null,
        name: '',
        systemDatabase: '',
        jobDatabase: '',
        abn: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        postCode: '',
        phone: '',
        fax: '',
        email: '',
        logoPath: ''
      };
      showModal.value = true;
    }

    function editCompany(company) {
      editMode.value = true;
      formData.value = { ...company };
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
      editMode.value = false;
    }

    async function saveCompanyForm() {
      saving.value = true;
      try {
        // Convert reactive proxy to plain object for IPC serialization
        const plainData = JSON.parse(JSON.stringify(formData.value));
        await api.settings.saveCompany(plainData);
        await loadCompanies();
        closeModal();
        emit('reload');
      } catch (error) {
        console.error('Error saving company:', error);
        alert('Error saving company: ' + error.message);
      } finally {
        saving.value = false;
      }
    }

    async function switchToCompany(id) {
      try {
        await api.settings.switchCompany(id);
        await loadCompanies();
        emit('reload');
        alert('Switched to company. Please restart the application for changes to take effect.');
      } catch (error) {
        console.error('Error switching company:', error);
        alert('Error switching company: ' + error.message);
      }
    }

    function confirmDeleteCompany(company) {
      companyToDelete.value = company;
      showDeleteModal.value = true;
    }

    async function deleteCompany() {
      try {
        await api.settings.deleteCompany(companyToDelete.value.id);
        await loadCompanies();
        showDeleteModal.value = false;
        companyToDelete.value = null;
        emit('reload');
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('Error deleting company: ' + error.message);
      }
    }

    onMounted(() => {
      loadCompanies();
    });

    return {
      companies,
      currentCompanyId,
      loading,
      saving,
      showModal,
      showDeleteModal,
      editMode,
      formData,
      companyToDelete,
      showAddCompany,
      editCompany,
      closeModal,
      saveCompanyForm,
      switchToCompany,
      confirmDeleteCompany,
      deleteCompany
    };
  }
};
</script>

<style scoped>
.companies-tab {
  max-width: 1200px;
}

.table tbody tr {
  cursor: default;
}

.table tbody tr.table-primary {
  background-color: rgba(13, 110, 253, 0.1);
}

.modal.show {
  display: block;
}

.modal-backdrop {
  opacity: 0.5;
}

code {
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
