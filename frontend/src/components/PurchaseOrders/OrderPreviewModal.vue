<template>
  <div class="modal fade show d-block" tabindex="-1" @click.self="closeModal">
    <div class="modal-dialog modal-fullscreen">
      <div class="modal-content">
        <!-- Header -->
        <div class="modal-header compact-header">
          <h6 class="modal-title mb-0">
            <i class="bi bi-eye me-2"></i>
            Order Preview: {{ currentOrderNumber }}
            <span v-if="orderNumbers.length > 1" class="badge bg-secondary ms-2">
              {{ currentIndex + 1 }} of {{ orderNumbers.length }}
            </span>
          </h6>
          <div class="d-flex align-items-center gap-2">
            <!-- Navigation for multiple orders -->
            <div v-if="orderNumbers.length > 1" class="btn-group me-3">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="previousOrder"
                :disabled="currentIndex === 0 || loading">
                <i class="bi bi-chevron-left"></i>
                Previous
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                @click="nextOrder"
                :disabled="currentIndex === orderNumbers.length - 1 || loading">
                Next
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
        </div>

        <!-- Settings Bar -->
        <div class="settings-bar p-2 border-bottom bg-light">
          <div class="row g-2">
            <div class="col-md-3">
              <label class="form-label small">Template</label>
              <select v-model="settings.template" @change="saveTemplatePreference" class="form-select form-select-sm">
                <option v-for="template in templates" :key="template.id" :value="template.id">
                  {{ template.name }}
                </option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small">Price Display</label>
              <select v-model="settings.priceDisplay" @change="refreshPreview" class="form-select form-select-sm">
                <option value="all">Show All Prices</option>
                <option value="totalOnly">Total Only</option>
                <option value="none">No Prices</option>
                <option value="supplierOnly">Supplier Prices Only</option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small">GST Mode</label>
              <select v-model="settings.gstMode" @change="refreshPreview" class="form-select form-select-sm">
                <option value="none">No GST</option>
                <option value="perLine">GST Per Line</option>
                <option value="total">GST on Total</option>
              </select>
            </div>

            <div class="col-md-2">
              <label class="form-label small">Item Code</label>
              <select v-model="settings.codeDisplay" @change="refreshPreview" class="form-select form-select-sm">
                <option value="our">Our Code Only</option>
                <option value="supplier">Supplier Reference</option>
                <option value="both">Both Codes</option>
              </select>
            </div>

            <div class="col-md-3 d-flex align-items-end">
              <button class="btn btn-sm btn-outline-secondary me-2" @click="refreshPreview" :disabled="loading">
                <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Area -->
        <div class="modal-body p-0">
          <!-- Loading State -->
          <div v-if="loading" class="preview-loading">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 text-muted">Rendering preview...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="preview-loading">
            <i class="bi bi-exclamation-triangle text-danger" style="font-size: 3rem;"></i>
            <p class="mt-3 text-danger">{{ error }}</p>
            <button class="btn btn-primary" @click="loadPreview">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Retry
            </button>
          </div>

          <!-- Preview Frame -->
          <div v-else class="preview-container">
            <div class="preview-frame" v-html="previewHTML"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="print" :disabled="loading || !!error">
            <i class="bi bi-printer me-2"></i>
            Print
          </button>
          <button class="btn btn-primary" @click="savePDF" :disabled="loading || !!error">
            <i class="bi bi-file-pdf me-2"></i>
            Save as PDF
          </button>
          <button class="btn btn-success" @click="showEmailDialog" :disabled="loading || !!error">
            <i class="bi bi-envelope me-2"></i>
            Email
          </button>
          <button class="btn btn-outline-secondary" @click="closeModal">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script>
import { ref, onMounted, watch } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'OrderPreviewModal',
  props: {
    orderNumber: {
      type: [String, Array],
      required: true
    }
  },
  emits: ['close'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // Handle both single order number and array of order numbers
    const orderNumbers = ref(Array.isArray(props.orderNumber) ? props.orderNumber : [props.orderNumber]);
    const currentIndex = ref(0);
    const currentOrderNumber = ref(orderNumbers.value[0]);

    // State
    const previewHTML = ref('');
    const loading = ref(false);
    const error = ref('');
    const templates = ref([]);
    const settings = ref({
      template: 'classic-po',
      priceDisplay: 'all',
      gstMode: 'total',
      codeDisplay: 'our'
    });

    // Methods
    // Helper: Convert reactive settings to plain object for IPC serialization
    const getPlainSettings = () => ({
      template: settings.value.template,
      priceDisplay: settings.value.priceDisplay,
      gstMode: settings.value.gstMode,
      codeDisplay: settings.value.codeDisplay
    });

    const loadPreview = async () => {
      loading.value = true;
      error.value = '';

      try {
        const result = await api.purchaseOrders.renderPreview(
          currentOrderNumber.value,
          getPlainSettings()
        );

        if (result.success) {
          previewHTML.value = result.html;
        } else {
          error.value = result.message || 'Failed to render preview';
        }
      } catch (err) {
        console.error('Error loading preview:', err);
        error.value = err.message || 'Failed to load preview';
      } finally {
        loading.value = false;
      }
    };

    const refreshPreview = () => {
      loadPreview();
    };

    // Navigation methods
    const previousOrder = () => {
      if (currentIndex.value > 0) {
        currentIndex.value--;
        currentOrderNumber.value = orderNumbers.value[currentIndex.value];
        loadPreview();
      }
    };

    const nextOrder = () => {
      if (currentIndex.value < orderNumbers.value.length - 1) {
        currentIndex.value++;
        currentOrderNumber.value = orderNumbers.value[currentIndex.value];
        loadPreview();
      }
    };

    const print = async () => {
      loading.value = true;
      try {
        // Use batch print with single order
        const result = await api.purchaseOrders.batchPrint(
          [currentOrderNumber.value],
          getPlainSettings()
        );

        if (!result.success) {
          alert('Failed to print: ' + (result.message || 'Unknown error'));
        } else if (result.failed > 0) {
          alert('Failed to print: ' + result.results[0].error);
        }
        // If successful, print dialog was already shown by Electron
      } catch (err) {
        console.error('Error printing order:', err);
        alert('Error printing order: ' + err.message);
      } finally {
        loading.value = false;
      }
    };

    const savePDF = async () => {
      loading.value = true;
      try {
        // Use batch save PDF with single order
        const result = await api.purchaseOrders.batchSavePDF(
          [currentOrderNumber.value],
          getPlainSettings()
        );

        if (result.cancelled) {
          loading.value = false;
          return;
        }

        if (result.success && result.saved > 0) {
          alert('PDF saved successfully to: ' + result.saveDir);
        } else {
          alert('Failed to save PDF: ' + (result.message || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error saving PDF:', err);
        alert('Error saving PDF: ' + err.message);
      } finally {
        loading.value = false;
      }
    };

    const showEmailDialog = async () => {
      loading.value = true;
      try {
        // Check if email is configured
        const isConfigured = await api.emailSettings.isConfigured();
        if (!isConfigured) {
          alert(
            'Email Configuration Required:\n\n' +
            'Please configure your email settings in Settings > Email / SMTP before using this feature.'
          );
          loading.value = false;
          return;
        }

        // Get email settings
        const emailSettings = await api.emailSettings.get();

        // Get order details for supplier email
        const orderDetails = await api.purchaseOrders.getOrderDetails(currentOrderNumber.value);
        if (!orderDetails.success) {
          alert('Failed to get order details');
          loading.value = false;
          return;
        }

        const order = orderDetails.order;

        // Check supplier email (unless in test mode)
        if (!emailSettings.testMode && !order.SupplierEmail) {
          alert(
            `Cannot email order ${currentOrderNumber.value}:\n\n` +
            'The supplier has no email address configured.'
          );
          loading.value = false;
          return;
        }

        // Show confirmation
        let confirmMessage = `Email purchase order ${currentOrderNumber.value}?\n\n`;
        if (emailSettings.testMode) {
          confirmMessage += `⚠️ TEST MODE ENABLED - Email will be sent to: ${emailSettings.testEmail}`;
        } else {
          confirmMessage += `To: ${order.SupplierName} (${order.SupplierEmail})`;
        }

        const confirmed = confirm(confirmMessage);
        if (!confirmed) {
          loading.value = false;
          return;
        }

        // Send email using batch email with current order
        const settings = { emailSettings: emailSettings };
        const result = await api.purchaseOrders.batchEmail([currentOrderNumber.value], settings);

        if (result.success) {
          let message = 'Email sent successfully!';
          if (emailSettings.testMode) {
            message += `\n\n⚠️ TEST MODE: Email was sent to ${emailSettings.testEmail}`;
          }
          alert(message);
        } else {
          alert('Failed to send email: ' + result.message);
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert('Error sending email: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const loadTemplates = async () => {
      // Placeholder: Template management not yet implemented
      // Set default templates
      templates.value = [
        { id: 'classic-po', name: 'Classic PO' },
        { id: 'modern-po', name: 'Modern PO' },
        { id: 'detailed-po', name: 'Detailed PO' }
      ];
    };

    const loadSavedTemplate = async () => {
      // Placeholder: User preferences not yet implemented
      // Use default template
      settings.value.template = 'classic-po';
    };

    const saveTemplatePreference = async () => {
      // Placeholder: Save template preference
      // For now, just refresh the preview
      refreshPreview();
    };

    const closeModal = () => {
      emit('close');
    };

    // Watch for order number changes
    watch(() => props.orderNumber, () => {
      if (props.orderNumber) {
        loadPreview();
      }
    });

    // Lifecycle
    onMounted(async () => {
      await loadTemplates();
      await loadSavedTemplate();
      loadPreview();
    });

    return {
      orderNumbers,
      currentIndex,
      currentOrderNumber,
      previewHTML,
      loading,
      error,
      templates,
      settings,
      loadPreview,
      refreshPreview,
      previousOrder,
      nextOrder,
      print,
      savePDF,
      showEmailDialog,
      saveTemplatePreference,
      closeModal
    };
  }
};
</script>

<style scoped>
.modal {
  background: rgba(0, 0, 0, 0.5);
  z-index: 1050;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.modal-backdrop {
  z-index: 1040;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

/* Compact header with reduced padding */
.compact-header {
  padding: 0.5rem 1rem !important;
}

.compact-header .modal-title {
  font-size: 1rem;
  line-height: 1.2;
}

/* Compact settings bar */
.settings-bar {
  background-color: #f8f9fa !important;
}

.settings-bar .form-label {
  margin-bottom: 0.25rem;
}

/* Reduce modal body padding */
.modal-body {
  padding: 0 !important;
}

/* Compact footer */
.modal-footer {
  padding: 0.5rem 1rem !important;
  gap: 0.5rem;
}

.preview-loading {
  height: 75vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.preview-container {
  max-height: 75vh;
  overflow-y: auto;
  background: #e9ecef;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.preview-frame {
  background: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  max-width: 210mm; /* A4 width */
  flex-shrink: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
