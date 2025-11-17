<template>
  <div class="boq-toolbar bg-light border-bottom p-2">
    <div class="row g-2 align-items-end">
      <!-- Job Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Job</label>
        <select
          :value="selectedJob"
          @change="$emit('update:selectedJob', $event.target.value)"
          class="form-select form-select-sm"
          style="min-width: 200px;"
          tabindex="1"
        >
          <option :value="null">Select Job...</option>
          <option v-for="job in jobs" :key="job.JobNo" :value="job.JobNo">
            {{ job.JobNo }}{{ job.Description ? ' - ' + job.Description : '' }}
          </option>
        </select>
      </div>

      <!-- Price Level Selector -->
      <div class="col-auto">
        <label class="form-label small mb-1">Price Level</label>
        <select
          :value="selectedPriceLevel"
          @change="$emit('update:selectedPriceLevel', parseInt($event.target.value))"
          class="form-select form-select-sm"
          style="width: 120px;"
          tabindex="3"
        >
          <option v-for="level in [1, 2, 3, 4, 5]" :key="level" :value="level">
            Level {{ level }}
          </option>
        </select>
      </div>

      <!-- Bill Date -->
      <div class="col-auto">
        <label class="form-label small mb-1">Bill Date</label>
        <input
          type="date"
          :value="billDateStr"
          @change="$emit('update:billDate', new Date($event.target.value))"
          class="form-control form-control-sm"
          style="width: 150px;"
          tabindex="4"
        />
      </div>

      <!-- Actions -->
      <div class="col-auto ms-auto d-flex gap-2">
        <button
          :class="['btn', 'btn-sm', catalogueVisible ? 'btn-primary' : 'btn-outline-primary']"
          @click="$emit('toggleCatalogueSearch')"
          title="Toggle Catalogue Search"
          tabindex="5"
        >
          <i class="bi bi-search"></i>
          Catalogue
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="$emit('refresh')"
          title="Refresh"
          tabindex="6"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
        <button
          class="btn btn-sm btn-secondary"
          @click="showOptionsModal = true"
          title="Options"
          tabindex="7"
        >
          <i class="bi bi-gear"></i>
        </button>
      </div>
    </div>

    <!-- Preferences Modal -->
    <BOQPreferencesModal
      v-if="showOptionsModal"
      @close="showOptionsModal = false"
      @save="onPreferencesSaved"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import BOQPreferencesModal from './BOQPreferencesModal.vue';

export default {
  name: 'BOQToolbar',
  components: {
    BOQPreferencesModal
  },
  props: {
    selectedJob: String,
    selectedPriceLevel: Number,
    selectedCostCentre: String,
    billDate: Date,
    catalogueVisible: Boolean
  },
  emits: [
    'update:selectedJob',
    'update:selectedPriceLevel',
    'update:selectedCostCentre',
    'update:billDate',
    'refresh',
    'toggleCatalogueSearch'
  ],
  setup(props) {
    const api = useElectronAPI();

    const jobs = ref([]);
    const costCentres = ref([]);
    const showOptionsModal = ref(false);

    const billDateStr = computed(() => {
      if (!props.billDate) return '';
      return props.billDate.toISOString().split('T')[0];
    });

    async function loadJobs() {
      try {
        // Load only active jobs (exclude archived)
        console.log('📋 Loading jobs (archived: false)...');
        const result = await api.jobs.getList(false);
        if (result.success) {
          jobs.value = result.data || [];
          console.log(`✅ Loaded ${jobs.value.length} jobs`);
          console.log('Job statuses:', jobs.value.map(j => `${j.JobNo}: ${j.Status}`).slice(0, 5));
        }
      } catch (error) {
        console.error('Error loading jobs:', error);
        jobs.value = [];
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
        costCentres.value = [];
      }
    }

    onMounted(async () => {
      await Promise.all([
        loadJobs(),
        loadCostCentres()
      ]);
    });

    return {
      jobs,
      costCentres,
      showOptionsModal,
      billDateStr
    };
  }
};
</script>

<style scoped>
.boq-toolbar {
  flex-shrink: 0;
}

.form-label {
  margin-bottom: 2px;
  font-weight: 500;
}

.btn {
  white-space: nowrap;
}
</style>
