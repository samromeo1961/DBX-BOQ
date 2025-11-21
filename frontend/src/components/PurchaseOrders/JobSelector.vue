<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-folder2-open me-2"></i>
            Select Job
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>

        <!-- Search -->
        <div class="modal-body p-0">
          <div class="p-3 border-bottom bg-light">
            <div class="input-group">
              <span class="input-group-text">
                <i class="bi bi-search"></i>
              </span>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Search by job number, name, or client..."
                @input="filterJobs"
                @keydown.enter="onSearchEnter">
            </div>
          </div>

          <!-- Loading State -->
          <div v-if="loading" class="p-5 text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Loading jobs...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-5 text-center">
            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
            <p class="mt-3 text-danger">{{ error }}</p>
            <button class="btn btn-primary" @click="loadJobs">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Retry
            </button>
          </div>

          <!-- Empty State -->
          <div v-else-if="filteredJobs.length === 0" class="p-5 text-center">
            <i class="bi bi-folder-x text-muted" style="font-size: 3rem;"></i>
            <p class="mt-3 text-muted">
              {{ searchQuery ? 'No jobs match your search' : 'No jobs with orders found' }}
            </p>
          </div>

          <!-- Jobs List -->
          <div v-else style="height: 60vh;">
            <ag-grid-vue
              class="ag-theme-quartz"
              style="width: 100%; height: 100%;"
              :columnDefs="columnDefs"
              :rowData="filteredJobs"
              :defaultColDef="defaultColDef"
              :rowSelection="'single'"
              :rowHeight="40"
              :pagination="true"
              :paginationPageSize="20"
              :paginationPageSizeSelector="[10, 20, 50, 100]"
              @grid-ready="onGridReady"
              @selection-changed="onSelectionChanged"
              @row-double-clicked="onRowDoubleClicked"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="closeModal">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="!selectedJobNo"
            @click="confirmSelection">
            <i class="bi bi-check-lg me-2"></i>
            Select Job
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'JobSelector',
  components: {
    AgGridVue
  },
  emits: ['job-selected', 'close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const searchInputRef = ref(null);
    const gridApi = ref(null);
    const jobs = ref([]);
    const loading = ref(false);
    const error = ref('');
    const searchQuery = ref('');
    const selectedJobNo = ref('');

    // Computed
    const filteredJobs = computed(() => {
      if (!searchQuery.value) return jobs.value;

      const query = searchQuery.value.toLowerCase();
      return jobs.value.filter(job => {
        return (
          job.JobNo.toLowerCase().includes(query) ||
          job.JobName.toLowerCase().includes(query) ||
          (job.Client && job.Client.toLowerCase().includes(query))
        );
      });
    });

    // AG Grid Configuration
    const columnDefs = [
      {
        headerName: 'Job No',
        field: 'JobNo',
        width: 120,
        pinned: 'left',
        cellStyle: { fontWeight: 'bold' }
      },
      {
        headerName: 'Job Name',
        field: 'JobName',
        flex: 2,
        cellStyle: { color: '#0d6efd' }
      },
      {
        headerName: 'Client',
        field: 'Client',
        flex: 1
      },
      {
        headerName: 'Status',
        field: 'Status',
        width: 140,
        cellRenderer: (params) => {
          if (!params.value) return '';
          return `<span class="badge bg-secondary">${params.value}</span>`;
        }
      },
      {
        headerName: 'Orders',
        field: 'OrderCount',
        width: 100,
        type: 'numericColumn',
        cellRenderer: (params) => {
          return `<span class="badge bg-light text-dark">${params.value || 0}</span>`;
        }
      },
      {
        headerName: 'Logged',
        field: 'LoggedCount',
        width: 100,
        type: 'numericColumn',
        cellRenderer: (params) => {
          if (!params.value || params.value === 0) return '';
          return `<span class="text-primary"><i class="bi bi-check-circle me-1"></i>${params.value}</span>`;
        }
      }
    ];

    const defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true
    };

    // Methods
    const loadJobs = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.purchaseOrders.getJobsWithOrderCounts();

        if (result.success) {
          jobs.value = result.jobs;
        } else {
          error.value = result.message || 'Failed to load jobs';
        }
      } catch (err) {
        console.error('Error loading jobs:', err);
        error.value = err.message || 'Failed to load jobs';
      } finally {
        loading.value = false;
      }
    };

    const onGridReady = (params) => {
      gridApi.value = params.api;
    };

    const onSelectionChanged = () => {
      if (!gridApi.value) return;
      const selectedRows = gridApi.value.getSelectedRows();
      if (selectedRows.length > 0) {
        selectedJobNo.value = selectedRows[0].JobNo;
      } else {
        selectedJobNo.value = '';
      }
    };

    const onRowDoubleClicked = (event) => {
      // Double-click immediately selects and confirms the job
      const job = event.data;
      if (job) {
        emit('job-selected', job);
      }
    };

    const selectJob = (job) => {
      selectedJobNo.value = job.JobNo;
    };

    const confirmSelection = () => {
      const job = jobs.value.find(j => j.JobNo === selectedJobNo.value);
      if (job) {
        emit('job-selected', job);
      }
    };

    const closeModal = () => {
      emit('close');
    };

    const filterJobs = () => {
      // Triggered on search input - filteredJobs computed property handles the filtering
    };

    const onSearchEnter = () => {
      // If search filtered down to exactly one job, select it automatically
      if (filteredJobs.value.length === 1) {
        const job = filteredJobs.value[0];
        emit('job-selected', job);
      }
      // If multiple jobs, select the first one
      else if (filteredJobs.value.length > 1 && gridApi.value) {
        gridApi.value.getDisplayedRowAtIndex(0).setSelected(true);
        // Auto-scroll to first row
        gridApi.value.ensureIndexVisible(0);
      }
    };

    // Lifecycle
    onMounted(() => {
      loadJobs();

      // Auto-focus search field for quick searching
      setTimeout(() => {
        if (searchInputRef.value) {
          searchInputRef.value.focus();
        }
      }, 100);
    });

    return {
      searchInputRef,
      gridApi,
      jobs,
      loading,
      error,
      searchQuery,
      selectedJobNo,
      filteredJobs,
      columnDefs,
      defaultColDef,
      loadJobs,
      onGridReady,
      onSelectionChanged,
      onRowDoubleClicked,
      selectJob,
      confirmSelection,
      closeModal,
      filterJobs,
      onSearchEnter
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
}
</style>
