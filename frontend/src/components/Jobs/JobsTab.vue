<template>
  <div class="jobs-tab h-100 d-flex flex-column">
    <!-- Toolbar -->
    <div class="jobs-toolbar bg-light border-bottom p-2">
      <div class="d-flex justify-content-between align-items-center gap-3">
        <h6 class="mb-0 text-nowrap">Jobs Management</h6>

        <!-- Search Bar -->
        <div class="search-container flex-grow-1">
          <div class="input-group input-group-sm">
            <span class="input-group-text">
              <i class="bi bi-search"></i>
            </span>
            <input
              ref="searchInputRef"
              type="text"
              class="form-control"
              placeholder="Search jobs by number, name, client, address, suburb..."
              v-model="searchText"
              @input="onSearchTextChange"
            />
            <button
              v-if="searchText"
              class="btn btn-outline-secondary"
              type="button"
              @click="clearSearch"
              title="Clear search"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div class="d-flex gap-2 align-items-center">
          <div class="form-check form-switch mb-0">
            <input
              class="form-check-input"
              type="checkbox"
              id="showArchivedToggle"
              v-model="showArchived"
              @change="loadJobs"
            />
            <label class="form-check-label" for="showArchivedToggle">
              Show Archived
            </label>
          </div>
          <button
            v-if="isSelectedJobArchived"
            class="btn btn-sm btn-warning"
            @click="restoreSelectedJob"
            title="Restore archived job"
          >
            <i class="bi bi-arrow-counterclockwise"></i>
            Restore Job
          </button>
          <button
            class="btn btn-sm btn-outline-primary"
            @click="openDocumentsModal"
            :disabled="!selectedJob"
            title="View job documents"
          >
            <i class="bi bi-folder2-open"></i>
            Documents
          </button>
          <button
            class="btn btn-sm btn-success"
            @click="openCreateJobModal"
          >
            <i class="bi bi-plus-lg"></i>
            New Job
          </button>
          <button
            class="btn btn-sm btn-secondary"
            @click="loadJobs"
            title="Refresh"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Jobs Grid -->
    <div class="jobs-grid flex-grow-1 p-2">
      <ag-grid-vue
        class="ag-theme-quartz"
        :columnDefs="columnDefs"
        :rowData="jobs"
        :defaultColDef="defaultColDef"
        :rowSelection="'single'"
        :getRowClass="getRowClass"
        :rowHeight="36"
        :pagination="true"
        :paginationPageSize="50"
        :paginationPageSizeSelector="[25, 50, 100, 200]"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @row-double-clicked="onRowDoubleClicked"
        style="height: 100%;"
      />
    </div>

    <!-- Job Form Modal -->
    <div
      v-if="showModal"
      class="modal fade show"
      style="display: block;"
      tabindex="-1"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ isEditMode ? 'Edit Job' : 'Create New Job' }}</h5>
            <button
              type="button"
              class="btn-close"
              @click="closeModal"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveJob">
              <div class="row g-3">
                <!-- Left Column -->
                <div class="col-md-6">
                  <!-- Job Number -->
                  <div class="mb-3">
                    <label for="jobNo" class="form-label fw-bold">Job Number *</label>
                    <input
                      type="text"
                      class="form-control"
                      id="jobNo"
                      v-model="formData.jobNo"
                      :disabled="isEditMode"
                      required
                    />
                  </div>

                  <!-- Description/Job Name -->
                  <div class="mb-3">
                    <label for="description" class="form-label fw-bold">Job Name / Description *</label>
                    <input
                      type="text"
                      class="form-control"
                      id="description"
                      v-model="formData.description"
                      placeholder="Enter job description"
                      required
                    />
                  </div>

                  <!-- Site Street Address -->
                  <div class="mb-3">
                    <label for="siteStreet" class="form-label fw-bold">Site Street Address</label>
                    <input
                      type="text"
                      class="form-control"
                      id="siteStreet"
                      v-model="formData.siteStreet"
                      placeholder="Street address"
                    />
                  </div>

                  <!-- Town/City (Suburb) -->
                  <div class="mb-3">
                    <label for="siteSuburb" class="form-label fw-bold">Town/City (Suburb)</label>
                    <input
                      type="text"
                      class="form-control"
                      id="siteSuburb"
                      v-model="formData.siteSuburb"
                      placeholder="Suburb or city"
                    />
                  </div>

                  <!-- State and Postcode Row -->
                  <div class="row mb-3">
                    <div class="col-md-6">
                      <label for="siteState" class="form-label fw-bold">State</label>
                      <select
                        class="form-select"
                        id="siteState"
                        v-model="formData.siteState"
                      >
                        <option value="">Select State</option>
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
                    <div class="col-md-6">
                      <label for="jobPostCode" class="form-label fw-bold">Postcode</label>
                      <input
                        type="text"
                        class="form-control"
                        id="jobPostCode"
                        v-model="formData.jobPostCode"
                        placeholder="Postcode"
                        maxlength="4"
                      />
                    </div>
                  </div>

                  <!-- Start Date -->
                  <div class="mb-3">
                    <label for="startDate" class="form-label fw-bold">Start Date</label>
                    <input
                      type="date"
                      class="form-control"
                      id="startDate"
                      v-model="formData.jobDate"
                    />
                  </div>
                </div>

                <!-- Right Column -->
                <div class="col-md-6">
                  <!-- Client -->
                  <div class="mb-3">
                    <label for="debtor" class="form-label fw-bold">Client</label>
                    <div class="input-group position-relative">
                      <input
                        type="text"
                        class="form-control"
                        id="contactSearch"
                        v-model="contactSearchText"
                        @focus="showContactDropdown = true"
                        @input="filterContacts"
                        @blur="onContactSearchBlur"
                        placeholder="Search clients..."
                        autocomplete="off"
                      />
                      <button
                        v-if="contactSearchText"
                        type="button"
                        class="btn btn-outline-secondary"
                        @click="clearContactSearch"
                        title="Clear"
                      >
                        <i class="bi bi-x-lg"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-primary"
                        @click="openNewContactModal"
                        title="Add New Contact"
                      >
                        <i class="bi bi-plus-lg"></i>
                      </button>
                      <!-- Searchable dropdown -->
                      <div
                        v-if="showContactDropdown && filteredContacts.length > 0"
                        class="contact-dropdown border rounded mt-1 shadow-sm"
                      >
                        <div
                          v-for="contact in filteredContacts"
                          :key="contact.Code"
                          class="contact-dropdown-item p-2"
                          @click="selectContact(contact)"
                        >
                          <strong>{{ contact.Code }}</strong> - {{ contact.Name }}
                          <div v-if="contact.Phone" class="small text-muted">{{ contact.Phone }}</div>
                        </div>
                      </div>
                    </div>
                    <small v-if="selectedContactName" class="text-muted">
                      Selected: <strong>{{ formData.debtor }}</strong> - {{ selectedContactName }}
                    </small>
                  </div>

                  <!-- Status -->
                  <div class="mb-3">
                    <label for="status" class="form-label fw-bold">Status</label>
                    <select
                      class="form-select"
                      id="status"
                      v-model="formData.status"
                    >
                      <option value="">Select Status</option>
                      <option
                        v-for="status in jobStatuses"
                        :key="status.StatusNumber"
                        :value="status.StatusName"
                      >
                        {{ status.StatusName }}
                      </option>
                    </select>
                  </div>

                  <!-- Estimator -->
                  <div class="mb-3">
                    <label for="estimator" class="form-label fw-bold">Estimator</label>
                    <select
                      class="form-select"
                      id="estimator"
                      v-model="formData.estimator"
                    >
                      <option value="">Select Estimator</option>
                      <option
                        v-for="estimator in estimators"
                        :key="estimator"
                        :value="estimator"
                      >
                        {{ estimator }}
                      </option>
                    </select>
                  </div>

                  <!-- Supervisor -->
                  <div class="mb-3">
                    <label for="supervisor" class="form-label fw-bold">Supervisor</label>
                    <select
                      class="form-select"
                      id="supervisor"
                      v-model="formData.supervisor"
                    >
                      <option value="">Select Supervisor</option>
                      <option
                        v-for="supervisor in supervisors"
                        :key="supervisor"
                        :value="supervisor"
                      >
                        {{ supervisor }}
                      </option>
                    </select>
                  </div>

                  <!-- Full Site Address (Auto-generated) -->
                  <div class="mb-3">
                    <label for="siteAddress" class="form-label fw-bold">Full Site Address</label>
                    <input
                      type="text"
                      class="form-control"
                      id="siteAddress"
                      v-model="formData.siteAddress"
                      placeholder="Auto-generated from address fields above"
                      readonly
                    />
                    <small class="text-muted">This field is automatically populated</small>
                  </div>

                  <!-- Additional Info Section -->
                  <div class="border rounded p-3 bg-light">
                    <h6 class="mb-3">Additional Information</h6>
                    <div class="form-text small">
                      <div><strong>Created:</strong> {{ isEditMode ? new Date().toLocaleDateString() : 'New Job' }}</div>
                      <div class="mt-1"><strong>Last Modified:</strong> {{ isEditMode ? new Date().toLocaleDateString() : '-' }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Error Message -->
              <div v-if="errorMessage" class="alert alert-danger mt-3">
                {{ errorMessage }}
              </div>

              <!-- Success Message -->
              <div v-if="successMessage" class="alert alert-success mt-3">
                {{ successMessage }}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeModal"
              :disabled="saving"
            >
              Cancel
            </button>
            <button
              v-if="isEditMode"
              type="button"
              class="btn btn-danger me-auto"
              @click="deleteJob"
              :disabled="saving"
            >
              <i class="bi bi-trash"></i>
              Archive
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveJob"
              :disabled="saving"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
              {{ saving ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>

    <!-- New Contact Modal -->
    <div
      v-if="showContactModal"
      class="modal fade show"
      style="display: block; z-index: 1060;"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Contact</h5>
            <button
              type="button"
              class="btn-close"
              @click="closeContactModal"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveContact">
              <div class="row g-3">
                <!-- Contact Code -->
                <div class="col-md-6">
                  <label for="contactCode" class="form-label fw-bold">Contact Code *</label>
                  <input
                    type="text"
                    class="form-control"
                    id="contactCode"
                    v-model="contactFormData.code"
                    placeholder="Unique contact code"
                    required
                  />
                </div>

                <!-- Contact Name -->
                <div class="col-md-6">
                  <label for="contactName" class="form-label fw-bold">Contact Name *</label>
                  <input
                    type="text"
                    class="form-control"
                    id="contactName"
                    v-model="contactFormData.name"
                    placeholder="Full name"
                    required
                  />
                </div>

                <!-- Address -->
                <div class="col-12">
                  <label for="contactAddress" class="form-label fw-bold">Address</label>
                  <input
                    type="text"
                    class="form-control"
                    id="contactAddress"
                    v-model="contactFormData.address"
                    placeholder="Full address"
                  />
                </div>

                <!-- Phone -->
                <div class="col-md-6">
                  <label for="contactPhone" class="form-label fw-bold">Phone</label>
                  <input
                    type="tel"
                    class="form-control"
                    id="contactPhone"
                    v-model="contactFormData.phone"
                    placeholder="Phone number"
                  />
                </div>

                <!-- Email -->
                <div class="col-md-6">
                  <label for="contactEmail" class="form-label fw-bold">Email</label>
                  <input
                    type="email"
                    class="form-control"
                    id="contactEmail"
                    v-model="contactFormData.email"
                    placeholder="Email address"
                  />
                </div>

                <!-- Mobile -->
                <div class="col-md-6">
                  <label for="contactMobile" class="form-label fw-bold">Mobile</label>
                  <input
                    type="tel"
                    class="form-control"
                    id="contactMobile"
                    v-model="contactFormData.mobile"
                    placeholder="Mobile number"
                  />
                </div>

                <!-- State -->
                <div class="col-md-4">
                  <label for="contactState" class="form-label fw-bold">State</label>
                  <select
                    class="form-select"
                    id="contactState"
                    v-model="contactFormData.state"
                  >
                    <option value="">Select State</option>
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

                <!-- Postcode -->
                <div class="col-md-4">
                  <label for="contactPostcode" class="form-label fw-bold">Postcode</label>
                  <input
                    type="text"
                    class="form-control"
                    id="contactPostcode"
                    v-model="contactFormData.postcode"
                    placeholder="Postcode"
                    maxlength="8"
                  />
                </div>

                <!-- Contact Group -->
                <div class="col-md-4">
                  <label for="contactGroup" class="form-label fw-bold">Contact Group *</label>
                  <select
                    class="form-select"
                    id="contactGroup"
                    v-model="contactFormData.contactGroup"
                    required
                  >
                    <option value="">Select Group...</option>
                    <option
                      v-for="group in contactGroups"
                      :key="group.Code"
                      :value="group.Code"
                    >
                      {{ group.Name }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Error Message -->
              <div v-if="contactErrorMessage" class="alert alert-danger mt-3">
                {{ contactErrorMessage }}
              </div>

              <!-- Success Message -->
              <div v-if="contactSuccessMessage" class="alert alert-success mt-3">
                {{ contactSuccessMessage }}
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeContactModal"
              :disabled="savingContact"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveContact"
              :disabled="savingContact"
            >
              <span v-if="savingContact" class="spinner-border spinner-border-sm me-2"></span>
              {{ savingContact ? 'Saving...' : 'Save Contact' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showContactModal" class="modal-backdrop fade show" style="z-index: 1055;"></div>

    <!-- Documents Modal -->
    <div v-if="showDocumentsModal" class="modal fade show" style="display: block; z-index: 1060;" tabindex="-1" @click.self="showDocumentsModal = false">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-folder2-open me-2"></i>
              Documents - {{ selectedJob?.JobNo }}
            </h5>
            <button type="button" class="btn-close" @click="showDocumentsModal = false"></button>
          </div>
          <div class="modal-body">
            <JobDocumentsPanel
              v-if="selectedJob"
              :job-no="selectedJob.JobNo"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDocumentsModal = false">Close</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showDocumentsModal" class="modal-backdrop fade show" style="z-index: 1059;"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import JobDocumentsPanel from '@/components/Documents/JobDocumentsPanel.vue';

export default {
  name: 'JobsTab',
  components: {
    AgGridVue,
    JobDocumentsPanel
  },
  setup() {
    const api = useElectronAPI();
    const router = useRouter();

    const searchInputRef = ref(null);
    const jobs = ref([]);
    const jobStatuses = ref([]);
    const estimators = ref([]);
    const supervisors = ref([]);
    const gridApi = ref(null);
    const showModal = ref(false);
    const isEditMode = ref(false);
    const saving = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');
    const searchText = ref('');
    const showArchived = ref(false); // Toggle for showing archived jobs
    const selectedJob = ref(null); // Currently selected job in grid

    // Contact management
    const contacts = ref([]);
    const contactGroups = ref([]);
    const filteredContacts = ref([]);
    const contactSearchText = ref('');
    const showContactDropdown = ref(false);
    const showContactModal = ref(false);
    const showDocumentsModal = ref(false);
    const savingContact = ref(false);
    const contactErrorMessage = ref('');
    const contactSuccessMessage = ref('');
    const selectedContactName = ref('');

    const formData = ref({
      jobNo: '',
      description: '',
      jobDate: new Date().toISOString().split('T')[0],
      siteAddress: '',
      siteStreet: '',
      siteSuburb: '',
      siteState: '',
      jobPostCode: '',
      debtor: '',
      status: '',
      estimator: '',
      supervisor: ''
    });

    const contactFormData = ref({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      mobile: '',
      state: '',
      postcode: '',
      contactGroup: ''
    });

    // Check if selected job is archived
    const isSelectedJobArchived = computed(() => {
      return selectedJob.value && selectedJob.value.Archived === true;
    });

    const columnDefs = ref([
      {
        field: 'JobNo',
        headerName: 'Job No',
        width: 120,
        pinned: 'left'
      },
      {
        field: 'Description',
        headerName: 'Description',
        flex: 1,
        minWidth: 200
      },
      {
        field: 'JobDate',
        headerName: 'Job Date',
        width: 120,
        valueFormatter: params => {
          if (!params.value) return '';
          const date = new Date(params.value);
          return date.toLocaleDateString();
        }
      },
      {
        field: 'ClientName',
        headerName: 'Client',
        width: 200
      },
      {
        field: 'SiteAddress',
        headerName: 'Site Address',
        width: 250
      },
      {
        field: 'SiteSuburb',
        headerName: 'Suburb',
        width: 150
      },
      {
        field: 'ClientPhone',
        headerName: 'Phone',
        width: 130,
        cellRenderer: params => {
          if (!params.value) return '';
          const phone = params.value;
          return `<a href="tel:${phone}" class="phone-link" style="color: #0d6efd; text-decoration: none;">
            <i class="bi bi-telephone"></i> ${phone}
          </a>`;
        }
      }
    ]);

    const defaultColDef = ref({
      sortable: true,
      filter: true,
      resizable: true
    });

    // Function to apply CSS class to archived job rows
    const getRowClass = (params) => {
      if (params.data && params.data.Archived === true) {
        return 'archived-job-row';
      }
      return '';
    };

    async function loadJobs() {
      try {
        const result = await api.jobs.getList(showArchived.value);
        if (result.success) {
          jobs.value = result.data || [];
          // DIAGNOSTIC LOGGING
          console.log('✅ Jobs loaded successfully');
          console.log('📊 Total jobs received:', jobs.value.length);
          console.log('🔢 Job Numbers:', jobs.value.map(j => j.JobNo).join(', '));
          console.log('📋 First 5 jobs:', jobs.value.slice(0, 5));

          // Force AG Grid to refresh its data
          if (gridApi.value) {
            gridApi.value.refreshCells();
            console.log('🔄 Grid refreshed');
          }
        } else {
          console.error('Failed to load jobs:', result.message);
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
      }
    }

    function onGridReady(params) {
      gridApi.value = params.api;
    }

    function onRowDoubleClicked(event) {
      // Navigate to Purchase Orders tab
      router.push('/purchase-orders');
    }

    function onSelectionChanged() {
      const selectedRows = gridApi.value.getSelectedRows();
      selectedJob.value = selectedRows.length > 0 ? selectedRows[0] : null;
    }

    function openCreateJobModal() {
      isEditMode.value = false;
      formData.value = {
        jobNo: '',
        description: '',
        jobDate: new Date().toISOString().split('T')[0],
        siteAddress: '',
        siteStreet: '',
        siteSuburb: '',
        siteState: '',
        jobPostCode: '',
        debtor: '',
        status: '',
        estimator: '',
        supervisor: ''
      };
      errorMessage.value = '';
      successMessage.value = '';
      showModal.value = true;
    }

    function openEditJobModal(job) {
      isEditMode.value = true;
      formData.value = {
        jobNo: job.JobNo,
        description: job.Description || '',
        jobDate: job.JobDate ? new Date(job.JobDate).toISOString().split('T')[0] : '',
        siteAddress: job.SiteAddress || '',
        siteStreet: job.SiteStreet || '',
        siteSuburb: job.SiteSuburb || '',
        siteState: job.SiteState || '',
        jobPostCode: job.JobPostCode || '',
        debtor: job.ClientCode || '',
        status: job.Status || 'Active',
        estimator: job.Estimator || '',
        supervisor: job.Supervisor || ''
      };

      // Set contact search text for selected client
      if (job.ClientCode && job.ClientName) {
        contactSearchText.value = `${job.ClientCode} - ${job.ClientName}`;
        selectedContactName.value = job.ClientName;
      }

      errorMessage.value = '';
      successMessage.value = '';
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
      errorMessage.value = '';
      successMessage.value = '';
    }

    async function saveJob() {
      if (!formData.value.jobNo) {
        errorMessage.value = 'Job number is required';
        return;
      }

      saving.value = true;
      errorMessage.value = '';
      successMessage.value = '';

      try {
        // Create a plain object to avoid Vue reactivity issues with IPC
        const jobData = {
          jobNo: formData.value.jobNo,
          description: formData.value.description,
          jobDate: formData.value.jobDate,
          siteAddress: formData.value.siteAddress,
          siteStreet: formData.value.siteStreet,
          siteSuburb: formData.value.siteSuburb,
          siteState: formData.value.siteState,
          jobPostCode: formData.value.jobPostCode,
          debtor: formData.value.debtor,
          status: formData.value.status,
          estimator: formData.value.estimator,
          supervisor: formData.value.supervisor
        };

        let result;
        if (isEditMode.value) {
          result = await api.jobs.updateJob(jobData);
        } else {
          result = await api.jobs.createJob(jobData);
        }

        if (result.success) {
          successMessage.value = result.message || 'Job saved successfully';
          await loadJobs();

          setTimeout(() => {
            closeModal();
          }, 1000);
        } else {
          errorMessage.value = result.message || 'Failed to save job';
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error saving job';
      } finally {
        saving.value = false;
      }
    }

    async function deleteJob() {
      if (!confirm(`Are you sure you want to archive job ${formData.value.jobNo}?`)) {
        return;
      }

      saving.value = true;
      errorMessage.value = '';
      successMessage.value = '';

      try {
        const result = await api.jobs.deleteJob(formData.value.jobNo);

        if (result.success) {
          successMessage.value = result.message || 'Job archived successfully';
          await loadJobs();

          setTimeout(() => {
            closeModal();
          }, 1000);
        } else {
          errorMessage.value = result.message || 'Failed to archive job';
        }
      } catch (error) {
        errorMessage.value = error.message || 'Error archiving job';
      } finally {
        saving.value = false;
      }
    }

    async function restoreSelectedJob() {
      if (!selectedJob.value) {
        return;
      }

      if (!confirm(`Are you sure you want to restore job ${selectedJob.value.JobNo}?`)) {
        return;
      }

      try {
        const result = await api.jobs.restoreJob(selectedJob.value.JobNo);

        if (result.success) {
          console.log('✅ Job restored successfully');
          await loadJobs();
          selectedJob.value = null; // Clear selection after restore
        } else {
          console.error('Failed to restore job:', result.message);
          alert('Failed to restore job: ' + result.message);
        }
      } catch (error) {
        console.error('Error restoring job:', error);
        alert('Error restoring job: ' + error.message);
      }
    }

    async function loadContacts() {
      try {
        // Load only clients (ContactGroup = 'C')
        console.log('Loading contacts with filter: C');
        const result = await api.contacts.getList('C');
        console.log('Contacts API result:', result);
        if (result.success) {
          console.log('Contacts data:', result.data);
          console.log('First contact:', result.data[0]);
          contacts.value = result.data || [];
          filteredContacts.value = result.data || [];
        } else {
          console.error('Failed to load contacts:', result.message);
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
      }
    }

    async function loadContactGroups() {
      try {
        const result = await api.contacts.getGroups();
        if (result.success) {
          contactGroups.value = result.data || [];
        } else {
          console.error('Failed to load contact groups:', result.message);
        }
      } catch (error) {
        console.error('Error loading contact groups:', error);
      }
    }

    async function loadJobStatuses() {
      try {
        const result = await api.jobs.getStatuses();
        if (result.success) {
          jobStatuses.value = result.data || [];
        } else {
          console.error('Failed to load job statuses:', result.message);
        }
      } catch (error) {
        console.error('Error loading job statuses:', error);
      }
    }

    async function loadEstimators() {
      try {
        const result = await api.jobs.getEstimators();
        if (result.success) {
          estimators.value = result.data || [];
        } else {
          console.error('Failed to load estimators:', result.message);
        }
      } catch (error) {
        console.error('Error loading estimators:', error);
      }
    }

    async function loadSupervisors() {
      try {
        const result = await api.jobs.getSupervisors();
        if (result.success) {
          supervisors.value = result.data || [];
        } else {
          console.error('Failed to load supervisors:', result.message);
        }
      } catch (error) {
        console.error('Error loading supervisors:', error);
      }
    }

    function filterContacts() {
      const searchTerm = contactSearchText.value.toLowerCase();
      if (!searchTerm) {
        filteredContacts.value = contacts.value;
      } else {
        filteredContacts.value = contacts.value.filter(contact =>
          contact.Code.toLowerCase().includes(searchTerm) ||
          contact.Name.toLowerCase().includes(searchTerm) ||
          (contact.Phone && contact.Phone.includes(searchTerm))
        );
      }
      showContactDropdown.value = true;
    }

    function selectContact(contact) {
      formData.value.debtor = contact.Code;
      selectedContactName.value = contact.Name;
      contactSearchText.value = `${contact.Code} - ${contact.Name}`;
      showContactDropdown.value = false;
    }

    function clearContactSearch() {
      contactSearchText.value = '';
      formData.value.debtor = '';
      selectedContactName.value = '';
      showContactDropdown.value = false;
      filteredContacts.value = contacts.value;
    }

    function onContactSearchBlur() {
      // Delay hiding dropdown to allow click on dropdown items
      setTimeout(() => {
        showContactDropdown.value = false;
      }, 200);
    }

    function onContactSelected() {
      const selected = contacts.value.find(c => c.Code === formData.value.debtor);
      selectedContactName.value = selected ? selected.Name : '';
      if (selected) {
        contactSearchText.value = `${selected.Code} - ${selected.Name}`;
      }
    }

    function openNewContactModal() {
      contactFormData.value = {
        code: '',
        name: '',
        address: '',
        phone: '',
        email: '',
        mobile: '',
        state: '',
        postcode: '',
        contactGroup: ''
      };
      contactErrorMessage.value = '';
      contactSuccessMessage.value = '';
      showContactModal.value = true;
    }

    function closeContactModal() {
      showContactModal.value = false;
      contactErrorMessage.value = '';
      contactSuccessMessage.value = '';
    }

    function openDocumentsModal() {
      console.log('openDocumentsModal called, selectedJob:', selectedJob.value);
      if (selectedJob.value) {
        console.log('Opening documents modal for job:', selectedJob.value.JobNo);
        showDocumentsModal.value = true;
      } else {
        console.log('No job selected');
      }
    }

    async function saveContact() {
      if (!contactFormData.value.code || !contactFormData.value.name || !contactFormData.value.contactGroup) {
        contactErrorMessage.value = 'Contact code, name, and group are required';
        return;
      }

      savingContact.value = true;
      contactErrorMessage.value = '';
      contactSuccessMessage.value = '';

      try {
        // Create a plain object to avoid Vue reactivity issues with IPC
        const contactData = {
          code: contactFormData.value.code,
          name: contactFormData.value.name,
          address: contactFormData.value.address,
          phone: contactFormData.value.phone,
          email: contactFormData.value.email,
          mobile: contactFormData.value.mobile,
          state: contactFormData.value.state,
          postcode: contactFormData.value.postcode,
          contactGroup: contactFormData.value.contactGroup
        };

        const result = await api.contacts.createContact(contactData);

        if (result.success) {
          contactSuccessMessage.value = result.message || 'Contact created successfully';

          // Reload contacts list
          await loadContacts();

          // Auto-select the newly created contact in the job form
          formData.value.debtor = contactFormData.value.code;
          selectedContactName.value = contactFormData.value.name;

          setTimeout(() => {
            closeContactModal();
          }, 1000);
        } else {
          contactErrorMessage.value = result.message || 'Failed to create contact';
        }
      } catch (error) {
        contactErrorMessage.value = error.message || 'Error creating contact';
      } finally {
        savingContact.value = false;
      }
    }

    function onSearchTextChange() {
      if (gridApi.value) {
        gridApi.value.setGridOption('quickFilterText', searchText.value);
      }
    }

    function clearSearch() {
      searchText.value = '';
      onSearchTextChange();
    }

    onMounted(() => {
      loadJobs();
      loadContacts();
      loadContactGroups();
      loadJobStatuses();
      loadEstimators();
      loadSupervisors();

      // Auto-focus search field for quick searching
      setTimeout(() => {
        if (searchInputRef.value) {
          searchInputRef.value.focus();
        }
      }, 100);
    });

    // Auto-populate Full Site Address when address components change
    watch(
      () => [
        formData.value.siteStreet,
        formData.value.siteSuburb,
        formData.value.siteState,
        formData.value.jobPostCode
      ],
      () => {
        const parts = [];
        if (formData.value.siteStreet) parts.push(formData.value.siteStreet);
        if (formData.value.siteSuburb) parts.push(formData.value.siteSuburb);
        if (formData.value.siteState) parts.push(formData.value.siteState);
        if (formData.value.jobPostCode) parts.push(formData.value.jobPostCode);
        formData.value.siteAddress = parts.join(', ');
      }
    );

    return {
      searchInputRef,
      jobs,
      jobStatuses,
      estimators,
      supervisors,
      gridApi,
      columnDefs,
      defaultColDef,
      getRowClass,
      showModal,
      isEditMode,
      formData,
      saving,
      errorMessage,
      successMessage,
      searchText,
      showArchived,
      selectedJob,
      isSelectedJobArchived,
      contacts,
      contactGroups,
      filteredContacts,
      contactSearchText,
      showContactDropdown,
      showContactModal,
      showDocumentsModal,
      openDocumentsModal,
      contactFormData,
      savingContact,
      contactErrorMessage,
      contactSuccessMessage,
      selectedContactName,
      loadJobs,
      loadContacts,
      loadContactGroups,
      loadJobStatuses,
      loadEstimators,
      loadSupervisors,
      onGridReady,
      onSelectionChanged,
      onRowDoubleClicked,
      openCreateJobModal,
      closeModal,
      saveJob,
      deleteJob,
      restoreSelectedJob,
      onSearchTextChange,
      clearSearch,
      filterContacts,
      selectContact,
      onContactSelected,
      openNewContactModal,
      closeContactModal,
      saveContact,
      clearContactSearch,
      onContactSearchBlur
    };
  }
};
</script>

<style scoped>
.jobs-tab {
  background-color: #fff;
}

.jobs-toolbar {
  flex-shrink: 0;
}

.search-container {
  max-width: 500px;
  min-width: 300px;
}

.jobs-grid {
  overflow: hidden;
}

/* Archived job row styling */
:deep(.archived-job-row) {
  color: #ff8c00 !important;
  font-style: italic;
}

:deep(.archived-job-row:hover) {
  color: #ff8c00 !important;
}

/* Contact dropdown styling */
.contact-dropdown {
  position: absolute;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  background: white;
  width: 100%;
  left: 0;
  top: 100%;
}

.contact-dropdown-item {
  cursor: pointer;
  border-bottom: 1px solid #eee;
  transition: background-color 0.2s;
}

.contact-dropdown-item:hover {
  background-color: #f8f9fa;
}

.contact-dropdown-item:last-child {
  border-bottom: none;
}

/* Phone link styling */
:deep(.phone-link) {
  cursor: pointer;
  transition: all 0.2s;
}

:deep(.phone-link:hover) {
  text-decoration: underline !important;
  color: #0a58ca !important;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-backdrop {
  z-index: 1040;
}

.modal {
  z-index: 1050;
}
</style>
