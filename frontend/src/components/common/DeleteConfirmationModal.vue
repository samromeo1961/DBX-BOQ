<template>
  <div v-if="show" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header bg-danger text-white">
          <h5 class="modal-title">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            Confirm Deletion
          </h5>
          <button type="button" class="btn-close btn-close-white" @click="cancel"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-octagon me-2"></i>
            <strong>Warning:</strong> This action cannot be undone!
          </div>

          <p class="mb-3">
            <strong>You are about to delete {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}:</strong>
          </p>

          <div v-if="items.length <= 10" class="mb-3">
            <ul class="list-group list-group-flush" style="max-height: 200px; overflow-y: auto;">
              <li v-for="item in items" :key="item.PriceCode" class="list-group-item">
                <strong>{{ item.PriceCode }}</strong> - {{ item.Description }}
              </li>
            </ul>
          </div>
          <div v-else class="mb-3">
            <p class="text-muted">{{ itemCount }} items selected</p>
          </div>

          <div v-if="errorMessages.length > 0" class="alert alert-warning">
            <p><strong>Some items cannot be deleted:</strong></p>
            <ul class="mb-0">
              <li v-for="(msg, index) in errorMessages" :key="index">{{ msg }}</li>
            </ul>
          </div>

          <div class="border border-warning bg-light p-3 rounded">
            <label class="form-label fw-bold">
              Type <span class="text-danger">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              class="form-control"
              v-model="confirmText"
              @keyup.enter="confirmDelete"
              placeholder="Type DELETE here"
              ref="confirmInput"
              :class="{ 'is-invalid': confirmText && confirmText !== 'DELETE' }"
            />
            <div v-if="confirmText && confirmText !== 'DELETE'" class="invalid-feedback">
              You must type exactly "DELETE" (case-sensitive)
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cancel">
            <i class="bi bi-x-circle me-1"></i>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-danger"
            @click="confirmDelete"
            :disabled="confirmText !== 'DELETE'"
          >
            <i class="bi bi-trash me-1"></i>
            Delete {{ itemCount }} {{ itemCount === 1 ? 'Item' : 'Items' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, nextTick } from 'vue';

export default {
  name: 'DeleteConfirmationModal',
  props: {
    show: {
      type: Boolean,
      required: true
    },
    items: {
      type: Array,
      required: true
    },
    errorMessages: {
      type: Array,
      default: () => []
    }
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const confirmText = ref('');
    const confirmInput = ref(null);
    const itemCount = ref(0);

    watch(() => props.show, (newVal) => {
      if (newVal) {
        confirmText.value = '';
        itemCount.value = props.items.length;
        nextTick(() => {
          confirmInput.value?.focus();
        });
      }
    });

    function confirmDelete() {
      if (confirmText.value === 'DELETE') {
        emit('confirm');
        confirmText.value = '';
      }
    }

    function cancel() {
      confirmText.value = '';
      emit('cancel');
    }

    return {
      confirmText,
      confirmInput,
      itemCount,
      confirmDelete,
      cancel
    };
  }
};
</script>

<style scoped>
.modal {
  display: block;
}
</style>
