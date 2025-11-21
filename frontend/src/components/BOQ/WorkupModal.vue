<template>
  <div v-if="show" class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5); z-index: 1055; position: fixed; top: 0; left: 0; width: 100%; height: 100%;">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-file-text me-2"></i>
            Edit Workup / Notes
          </h5>
          <button type="button" class="btn-close" @click="cancel"></button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Item Info -->
          <div class="mb-3 p-2 bg-light rounded">
            <div class="row">
              <div class="col-md-6">
                <strong>Item Code:</strong> {{ itemData.ItemCode }}
              </div>
              <div class="col-md-6">
                <strong>Current Description:</strong> {{ itemData.Description || '(blank - adhoc item)' }}
              </div>
            </div>
          </div>

          <!-- Workup Text Area -->
          <div class="mb-3">
            <label class="form-label fw-bold">Workup / Notes:</label>
            <textarea
              v-model="workupText"
              class="form-control font-monospace"
              rows="10"
              placeholder="Enter workup notes here...&#10;&#10;For adhoc items (blank description), the first line will become the item description."
              @input="updatePreview"
            ></textarea>
            <small class="form-text text-muted">
              {{ workupText.length }} characters
            </small>
          </div>

          <!-- Preview for Adhoc Items -->
          <div v-if="isAdhocItem" class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            <strong>Adhoc Item:</strong> First line will become description:
            <div class="mt-2 p-2 bg-white rounded border">
              <em>{{ firstLinePreview || '(empty)' }}</em>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cancel">
            <i class="bi bi-x-lg me-1"></i>
            Cancel
          </button>
          <button type="button" class="btn btn-primary" @click="save">
            <i class="bi bi-check-lg me-1"></i>
            Save Workup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';

export default {
  name: 'WorkupModal',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    itemData: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'save'],
  setup(props, { emit }) {
    const workupText = ref('');
    const firstLinePreview = ref('');

    // Check if this is an adhoc item (null, undefined, or empty description)
    const isAdhocItem = computed(() => {
      const desc = props.itemData.Description;
      return desc === null || desc === undefined || (typeof desc === 'string' && desc.trim() === '');
    });

    // Extract first line for preview
    const updatePreview = () => {
      const lines = workupText.value.split('\n');
      firstLinePreview.value = lines[0] || '';
    };

    // Watch for prop changes to update workup text
    watch(() => props.itemData, (newData) => {
      if (newData) {
        workupText.value = newData.Workup || '';
        updatePreview();
      }
    }, { immediate: true });

    const cancel = () => {
      emit('close');
    };

    const save = () => {
      emit('save', {
        workup: workupText.value,
        firstLine: firstLinePreview.value,
        isAdhocItem: isAdhocItem.value
      });
    };

    return {
      workupText,
      firstLinePreview,
      isAdhocItem,
      updatePreview,
      cancel,
      save
    };
  }
};
</script>

<style scoped>
.modal.show {
  display: block;
}

.modal-dialog {
  margin-top: 5vh;
}

textarea.font-monospace {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
}
</style>
