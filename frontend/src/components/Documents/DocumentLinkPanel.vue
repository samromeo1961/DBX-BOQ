<template>
  <div class="document-link-panel">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-paperclip me-2"></i>
        Linked Documents
        <span class="badge bg-secondary ms-2">{{ documents.length }}</span>
      </h6>
      <button class="btn btn-sm btn-primary" @click="showLinkModal = true">
        <i class="bi bi-link-45deg me-1"></i>Link File
      </button>
    </div>

    <!-- Documents List -->
    <div v-if="loading" class="text-center py-3">
      <div class="spinner-border spinner-border-sm" role="status"></div>
      <span class="ms-2">Loading documents...</span>
    </div>

    <div v-else-if="documents.length === 0" class="text-muted text-center py-3">
      <i class="bi bi-file-earmark-x fs-3 d-block mb-2"></i>
      No documents linked
    </div>

    <div v-else class="document-list">
      <div v-for="doc in documents" :key="doc.DocumentID" class="document-item d-flex align-items-center p-2 border-bottom">
        <i :class="getFileIcon(doc.FileName)" class="fs-5 me-2 text-muted"></i>
        <div class="flex-grow-1 overflow-hidden">
          <div class="text-truncate fw-medium" :title="doc.FileName">{{ doc.FileName }}</div>
          <small class="text-muted">
            {{ doc.DocumentType || 'General' }}
            <span v-if="doc.Description"> - {{ doc.Description }}</span>
          </small>
        </div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary" @click="openDocument(doc)" title="Open">
            <i class="bi bi-box-arrow-up-right"></i>
          </button>
          <button class="btn btn-outline-danger" @click="unlinkDocument(doc)" title="Unlink">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Link File Modal -->
    <div v-if="showLinkModal" class="modal show d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-link-45deg me-2"></i>Link Document
            </h5>
            <button type="button" class="btn-close" @click="closeLinkModal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Document Type</label>
              <select class="form-select" v-model="linkForm.documentType">
                <option value="General">General</option>
                <option value="Invoice">Invoice</option>
                <option value="Quote">Quote</option>
                <option value="Drawing">Drawing</option>
                <option value="Specification">Specification</option>
                <option value="Contract">Contract</option>
                <option value="Photo">Photo</option>
                <option value="Correspondence">Correspondence</option>
                <option value="Delivery">Delivery Docket</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <input type="text" class="form-control" v-model="linkForm.description" placeholder="Optional description">
            </div>
            <div class="mb-3">
              <label class="form-label">Select File</label>
              <button class="btn btn-outline-primary w-100" @click="selectFile">
                <i class="bi bi-file-earmark-plus me-2"></i>
                {{ linkForm.selectedFile ? linkForm.selectedFile.name : 'Choose File...' }}
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeLinkModal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="linkFile" :disabled="!linkForm.selectedFile || linking">
              <span v-if="linking" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-link-45deg me-1"></i>
              Link Document
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'DocumentLinkPanel',
  props: {
    entityType: {
      type: String,
      required: true,
      validator: (value) => ['BOQItem', 'PurchaseOrder', 'Job'].includes(value)
    },
    entityCode: {
      type: String,
      required: true
    },
    // For display purposes
    entityLabel: {
      type: String,
      default: ''
    }
  },
  emits: ['document-linked', 'document-unlinked'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const documents = ref([]);
    const loading = ref(false);
    const showLinkModal = ref(false);
    const linking = ref(false);

    const linkForm = ref({
      documentType: 'General',
      description: '',
      selectedFile: null,
      selectedPath: ''
    });

    async function loadDocuments() {
      if (!props.entityCode) return;

      loading.value = true;
      try {
        const result = await api.documents.get(props.entityType, props.entityCode);
        if (result?.success) {
          documents.value = result.data || [];
        }
      } catch (err) {
        console.error('Error loading documents:', err);
      } finally {
        loading.value = false;
      }
    }

    async function selectFile() {
      try {
        const result = await api.documentSettings.browseFile('');
        if (result) {
          linkForm.value.selectedPath = result;
          linkForm.value.selectedFile = {
            name: result.split(/[/\\]/).pop(),
            path: result
          };
        }
      } catch (err) {
        console.error('Error selecting file:', err);
      }
    }

    async function linkFile() {
      if (!linkForm.value.selectedFile) return;

      linking.value = true;
      try {
        const result = await api.documents.link({
          entityType: props.entityType,
          entityCode: props.entityCode,
          filePath: linkForm.value.selectedPath,
          fileName: linkForm.value.selectedFile.name,
          documentType: linkForm.value.documentType,
          description: linkForm.value.description
        });

        if (result?.success) {
          await loadDocuments();
          emit('document-linked', result.document);
          closeLinkModal();
        } else {
          alert('Failed to link document: ' + (result?.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error linking document:', err);
        alert('Failed to link document: ' + err.message);
      } finally {
        linking.value = false;
      }
    }

    async function unlinkDocument(doc) {
      if (!confirm(`Unlink "${doc.FileName}"?`)) return;

      try {
        const result = await api.documents.unlink(doc.DocumentID);
        if (result?.success) {
          await loadDocuments();
          emit('document-unlinked', doc);
        } else {
          alert('Failed to unlink document: ' + (result?.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error unlinking document:', err);
        alert('Failed to unlink document: ' + err.message);
      }
    }

    async function openDocument(doc) {
      try {
        if (doc.RelativePath) {
          await api.documentCache.openFile(doc.RelativePath);
        }
      } catch (err) {
        console.error('Error opening document:', err);
        alert('Failed to open document: ' + err.message);
      }
    }

    function closeLinkModal() {
      showLinkModal.value = false;
      linkForm.value = {
        documentType: 'General',
        description: '',
        selectedFile: null,
        selectedPath: ''
      };
    }

    function getFileIcon(fileName) {
      if (!fileName) return 'bi bi-file-earmark';
      const ext = fileName.split('.').pop()?.toLowerCase();
      const iconMap = {
        pdf: 'bi bi-file-earmark-pdf text-danger',
        doc: 'bi bi-file-earmark-word text-primary',
        docx: 'bi bi-file-earmark-word text-primary',
        xls: 'bi bi-file-earmark-excel text-success',
        xlsx: 'bi bi-file-earmark-excel text-success',
        jpg: 'bi bi-file-earmark-image text-info',
        jpeg: 'bi bi-file-earmark-image text-info',
        png: 'bi bi-file-earmark-image text-info',
        gif: 'bi bi-file-earmark-image text-info',
        zip: 'bi bi-file-earmark-zip text-warning',
        txt: 'bi bi-file-earmark-text',
        csv: 'bi bi-file-earmark-spreadsheet'
      };
      return iconMap[ext] || 'bi bi-file-earmark';
    }

    watch(() => props.entityCode, () => {
      loadDocuments();
    });

    onMounted(() => {
      loadDocuments();
    });

    return {
      documents,
      loading,
      showLinkModal,
      linking,
      linkForm,
      loadDocuments,
      selectFile,
      linkFile,
      unlinkDocument,
      openDocument,
      closeLinkModal,
      getFileIcon
    };
  }
};
</script>

<style scoped>
.document-link-panel {
  max-height: 300px;
  overflow-y: auto;
}

.document-list {
  max-height: 200px;
  overflow-y: auto;
}

.document-item:hover {
  background-color: var(--bs-light);
}

.document-item:last-child {
  border-bottom: none !important;
}
</style>
