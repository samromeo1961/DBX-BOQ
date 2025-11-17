<template>
  <div class="cost-centre-panel h-100 d-flex flex-column bg-light border-end">
    <!-- Header -->
    <div class="panel-header p-3 border-bottom bg-white">
      <h6 class="mb-2">Cost Centres</h6>

      <!-- Search Box -->
      <div class="input-group input-group-sm">
        <span class="input-group-text">
          <i class="bi bi-search"></i>
        </span>
        <input
          type="text"
          class="form-control"
          placeholder="Search cost centres..."
          v-model="searchText"
          tabindex="2"
        />
        <button
          v-if="searchText"
          class="btn btn-outline-secondary"
          type="button"
          @click="searchText = ''"
          title="Clear search"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Cost Centre List -->
    <div class="cost-centre-list flex-grow-1 overflow-auto">
      <div v-if="loading" class="text-center p-3">
        <div class="spinner-border spinner-border-sm" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <div v-else-if="filteredCostCentres.length === 0" class="text-center p-3 text-muted small">
        {{ searchText ? 'No cost centres found' : 'No cost centres available' }}
      </div>

      <div v-else class="list-group list-group-flush">
        <button
          v-for="cc in filteredCostCentres"
          :key="cc.Code"
          type="button"
          :class="[
            'list-group-item',
            'list-group-item-action',
            'text-start',
            'border-start-0',
            'border-end-0',
            { 'active': selectedCostCentre === cc.Code },
            { 'has-data': cc.ItemCount > 0 }
          ]"
          @click="selectCostCentre(cc.Code)"
          :title="`${cc.Code} - ${cc.Name}${cc.ItemCount > 0 ? ' (' + cc.ItemCount + ' items)' : ''}`"
        >
          <div class="d-flex justify-content-between align-items-center">
            <div class="flex-grow-1 text-truncate" :class="{ 'fw-bold': cc.ItemCount > 0 }">
              <span class="code">{{ cc.Code }}</span>
              <span class="separator">-</span>
              <span class="name">{{ cc.Name }}</span>
            </div>
            <div v-if="cc.ItemCount > 0" class="ms-2 flex-shrink-0">
              <span class="badge bg-primary rounded-pill">{{ cc.ItemCount }}</span>
            </div>
          </div>
        </button>

        <!-- "All Cost Centres" option at the top -->
        <button
          v-if="showAllOption"
          type="button"
          :class="[
            'list-group-item',
            'list-group-item-action',
            'text-start',
            'border-start-0',
            'border-end-0',
            'fw-bold',
            { 'active': selectedCostCentre === null }
          ]"
          @click="selectCostCentre(null)"
          style="order: -1;"
        >
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <i class="bi bi-list-ul me-2"></i>
              All Cost Centres
            </div>
            <span v-if="totalItemCount > 0" class="badge bg-secondary rounded-pill">
              {{ totalItemCount }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'CostCentrePanel',
  props: {
    selectedJob: String,
    selectedCostCentre: String,
    showAllOption: {
      type: Boolean,
      default: false
    },
    catalogueItems: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:selectedCostCentre'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const costCentres = ref([]);
    const loading = ref(false);
    const searchText = ref('');

    // Computed
    const filteredCostCentres = computed(() => {
      let filtered = costCentres.value;

      // Filter by search text
      if (searchText.value) {
        const search = searchText.value.toLowerCase();
        filtered = filtered.filter(cc =>
          cc.Code.toLowerCase().includes(search) ||
          cc.Name.toLowerCase().includes(search)
        );
      }

      return filtered;
    });

    const totalItemCount = computed(() => {
      return costCentres.value.reduce((sum, cc) => sum + (cc.ItemCount || 0), 0);
    });

    // Methods
    async function loadCostCentres() {
      loading.value = true;
      try {
        let result;

        if (props.selectedJob) {
          // BOQ Mode: Load cost centres with budget for specific job
          result = await api.costCentres.getWithBudget(props.selectedJob);
        } else {
          // Catalogue Mode: Load all cost centres
          result = await api.costCentres.getList();
        }

        if (result.success) {
          let centres = result.data || [];

          // In catalogue mode, calculate ItemCount from catalogueItems prop
          if (!props.selectedJob && props.catalogueItems && props.catalogueItems.length > 0) {
            // Count items per cost centre
            const itemCounts = props.catalogueItems.reduce((acc, item) => {
              if (item.CostCentre) {
                acc[item.CostCentre] = (acc[item.CostCentre] || 0) + 1;
              }
              return acc;
            }, {});

            // Update cost centres with item counts
            centres = centres.map(cc => ({
              ...cc,
              ItemCount: itemCounts[cc.Code] || 0
            }));

            // Filter to only show cost centres with items
            centres = centres.filter(cc => cc.ItemCount > 0);
          }

          costCentres.value = centres;
          console.log('✅ Cost centres loaded:', costCentres.value.length);
        } else {
          console.error('Failed to load cost centres:', result.message);
          costCentres.value = [];
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
        costCentres.value = [];
      } finally {
        loading.value = false;
      }
    }

    function selectCostCentre(code) {
      emit('update:selectedCostCentre', code);
    }

    // Watchers
    watch(() => props.selectedJob, () => {
      loadCostCentres();
    }, { immediate: true });

    // Watch for changes to catalogueItems in catalogue mode
    watch(() => props.catalogueItems, () => {
      if (!props.selectedJob) {
        loadCostCentres();
      }
    }, { deep: true });

    return {
      costCentres,
      loading,
      searchText,
      showAllOption: props.showAllOption,
      filteredCostCentres,
      totalItemCount,
      selectCostCentre
    };
  }
};
</script>

<style scoped>
.cost-centre-panel {
  width: 280px;
  flex-shrink: 0;
}

.panel-header {
  flex-shrink: 0;
}

.cost-centre-list {
  position: relative;
}

.list-group-item {
  border-radius: 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.list-group-item:hover:not(.active) {
  background-color: #f8f9fa;
}

.list-group-item.active {
  background-color: #0d6efd;
  border-color: #0d6efd;
  color: white;
}

.list-group-item.active .text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
}

.list-group-item.active .badge {
  background-color: rgba(255, 255, 255, 0.3) !important;
  color: white !important;
}

.has-data {
  border-left: 3px solid #0d6efd !important;
}

.fw-bold {
  font-weight: 600 !important;
}

h6 {
  margin-bottom: 0;
  font-weight: 600;
}

.code {
  font-weight: inherit;
}

.separator {
  margin: 0 0.5rem;
  color: #6c757d;
}

.name {
  color: #6c757d;
  font-size: 0.9em;
}

.list-group-item.active .name,
.list-group-item.active .separator {
  color: rgba(255, 255, 255, 0.8);
}
</style>
