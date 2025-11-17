<template>
  <div class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ item ? 'Edit Item' : 'Add New Item' }}</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="save">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Price Code *</label>
                <input
                  type="text"
                  v-model="formData.PriceCode"
                  class="form-control"
                  :disabled="!!item"
                  required
                />
              </div>
              <div class="col-md-6">
                <label class="form-label">Cost Centre *</label>
                <select v-model="formData.CostCentre" class="form-select" required>
                  <option value="">Select...</option>
                  <option v-for="cc in costCentres" :key="cc.Code" :value="cc.Code">
                    {{ cc.Code }} - {{ cc.Name }}
                  </option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Description *</label>
                <textarea
                  v-model="formData.Description"
                  class="form-control"
                  rows="2"
                  required
                ></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label">Unit *</label>
                <select v-model="formData.PerCode" class="form-select" required>
                  <option value="">Select...</option>
                  <option v-for="pc in perCodes" :key="pc.Code" :value="pc.Code">
                    {{ pc.Display }}
                  </option>
                </select>
              </div>
              <div class="col-md-6">
                <div class="form-check mt-4">
                  <input
                    type="checkbox"
                    v-model="formData.Archived"
                    class="form-check-input"
                    id="archivedCheck"
                  />
                  <label class="form-check-label" for="archivedCheck">
                    Archived
                  </label>
                </div>
              </div>
              <div class="col-12">
                <h6 class="border-bottom pb-2">Prices</h6>
              </div>
              <div class="col-md-4">
                <label class="form-label">Price Level 1</label>
                <input
                  type="number"
                  step="0.01"
                  v-model.number="formData.Price1"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Price Level 2</label>
                <input
                  type="number"
                  step="0.01"
                  v-model.number="formData.Price2"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Price Level 3</label>
                <input
                  type="number"
                  step="0.01"
                  v-model.number="formData.Price3"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Price Level 4</label>
                <input
                  type="number"
                  step="0.01"
                  v-model.number="formData.Price4"
                  class="form-control"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">Price Level 5</label>
                <input
                  type="number"
                  step="0.01"
                  v-model.number="formData.Price5"
                  class="form-control"
                />
              </div>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="save">
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';

export default {
  name: 'CatalogueItemModal',
  props: {
    item: Object,
    perCodes: Array,
    costCentres: Array
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const formData = ref({
      PriceCode: '',
      Description: '',
      CostCentre: '',
      PerCode: '',
      Price1: 0,
      Price2: 0,
      Price3: 0,
      Price4: 0,
      Price5: 0,
      Archived: false
    });

    // Initialize form data if editing
    watch(() => props.item, (newItem) => {
      if (newItem) {
        formData.value = { ...newItem };
      }
    }, { immediate: true });

    function save() {
      emit('save', formData.value);
    }

    return {
      formData,
      save
    };
  }
};
</script>
