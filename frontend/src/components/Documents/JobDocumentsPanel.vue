<template>
  <div class="job-documents-panel">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-folder2-open me-2"></i>
        Job Documents
        <span v-if="jobNo" class="badge bg-secondary ms-2">{{ jobNo }}</span>
      </h6>
      <div class="btn-group btn-group-sm">
        <button class="btn btn-outline-primary" @click="showUploadModal = true" :disabled="!jobNo">
          <i class="bi bi-upload me-1"></i>
          Upload
        </button>
        <button class="btn btn-outline-secondary" @click="openJobFolder" :disabled="!jobNo">
          <i class="bi bi-folder2 me-1"></i>
          Open Folder
        </button>
      </div>
    </div>

    <!-- No Job Selected -->
    <div v-if="!jobNo" class="text-center py-4 text-muted">
      <i class="bi bi-folder-x" style="font-size: 2rem;"></i>
      <p class="mt-2 mb-0">Select a job to view documents</p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="text-center py-4">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span class="ms-2 text-muted">Loading documents...</span>
    </div>

    <!-- Document List -->
    <div v-else>
      <!-- Linked Documents from Database -->
      <div v-if="linkedDocuments.length > 0" class="mb-3">
        <small class="text-muted fw-bold d-block mb-2">
          <i class="bi bi-link-45deg me-1"></i>
          Linked Documents ({{ linkedDocuments.length }})
        </small>
        <div class="list-group list-group-flush">
          <div
            v-for="doc in linkedDocuments"
            :key="doc.DocumentID"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2"
          >
            <div class="d-flex align-items-center">
              <i :class="getFileIcon(doc.FileType)" class="me-2"></i>
              <div>
                <div class="small fw-medium">{{ doc.FileName }}</div>
                <small class="text-muted">{{ doc.DocumentType }} | {{ formatDate(doc.UploadedAt) }}</small>
              </div>
            </div>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-sm" @click="openDocument(doc)" title="Open">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" @click="unlinkDocument(doc)" title="Unlink">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Files from Job Folder -->
      <div v-if="folderFiles.length > 0 || folderFolders.length > 0">
        <small class="text-muted fw-bold d-block mb-2">
          <i class="bi bi-folder me-1"></i>
          Job Folder ({{ folderFiles.length }} files)
        </small>

        <!-- Subfolders -->
        <div v-if="folderFolders.length > 0" class="mb-2">
          <div class="d-flex flex-wrap gap-2">
            <button
              v-for="folder in folderFolders"
              :key="folder.path"
              class="btn btn-outline-secondary btn-sm"
              @click="navigateToFolder(folder)"
            >
              <i class="bi bi-folder-fill text-warning me-1"></i>
              {{ folder.name }}
            </button>
          </div>
        </div>

        <!-- Files -->
        <div class="list-group list-group-flush" style="max-height: 300px; overflow-y: auto;">
          <div
            v-for="file in folderFiles"
            :key="file.path"
            class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2"
            @dblclick="openFile(file)"
          >
            <div class="d-flex align-items-center">
              <i :class="getFileIcon(file.extension)" class="me-2"></i>
              <div>
                <div class="small fw-medium text-truncate" style="max-width: 250px;">{{ file.name }}</div>
                <small class="text-muted">{{ formatSize(file.size) }}</small>
              </div>
            </div>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-primary btn-sm" @click="openFile(file)" title="Open">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-outline-success btn-sm" @click="linkFile(file)" title="Link to job">
                <i class="bi bi-link-45deg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="linkedDocuments.length === 0 && folderFiles.length === 0 && folderFolders.length === 0" class="text-center py-4 text-muted">
        <i class="bi bi-file-earmark-x" style="font-size: 2rem;"></i>
        <p class="mt-2 mb-0">No documents found for this job</p>
        <button class="btn btn-outline-primary btn-sm mt-2" @click="createJobFolder">
          <i class="bi bi-folder-plus me-1"></i>
          Create Job Folder
        </button>
      </div>
    </div>

    <!-- Upload Modal -->
    <div v-if="showUploadModal" class="modal fade show d-block" tabindex="-1" @click.self="showUploadModal = false">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-upload me-2"></i>
              Upload Document
            </h5>
            <button type="button" class="btn-close" @click="showUploadModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Document Type</label>
              <select class="form-select" v-model="uploadForm.documentType">
                <option value="General">General</option>
                <option value="Quote">Quote</option>
                <option value="Invoice">Invoice</option>
                <option value="Drawing">Drawing</option>
                <option value="Specification">Specification</option>
                <option value="Contract">Contract</option>
                <option value="Correspondence">Correspondence</option>
                <option value="Photo">Photo</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <input type="text" class="form-control" v-model="uploadForm.description" placeholder="Optional description">
            </div>
            <div class="mb-3">
              <label class="form-label">Select File</label>
              <button class="btn btn-outline-primary w-100" @click="selectFileToUpload">
                <i class="bi bi-file-earmark-plus me-2"></i>
                {{ uploadForm.selectedFile ? uploadForm.selectedFile.name : 'Choose File...' }}
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showUploadModal = false">Cancel</button>
            <button type="button" class="btn btn-primary" @click="uploadDocument" :disabled="!uploadForm.selectedFile || uploading">
              <span v-if="uploading" class="spinner-border spinner-border-sm me-1"></span>
              <i v-else class="bi bi-upload me-1"></i>
              Upload
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showUploadModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { ref, watch, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'JobDocumentsPanel',
  props: {
    jobNo: {
      type: String,
      default: ''
    },
    costCentre: {
      type: String,
      default: ''
    }
  },
  emits: ['document-linked', 'document-uploaded'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const loading = ref(false);
    const linkedDocuments = ref([]);
    const folderFiles = ref([]);
    const folderFolders = ref([]);
    const currentPath = ref('');
    const settings = ref(null);
    const showUploadModal = ref(false);
    const uploading = ref(false);
    const uploadForm = ref({
      documentType: 'General',
      description: '',
      selectedFile: null,
      selectedPath: ''
    });

    async function loadSettings() {
      try {
        settings.value = await api.documentSettings.get();
      } catch (err) {
        console.error('Error loading document settings:', err);
      }
    }

    async function loadDocuments() {
      if (!props.jobNo) {
        linkedDocuments.value = [];
        folderFiles.value = [];
        folderFolders.value = [];
        return;
      }

      loading.value = true;
      try {
        // Load linked documents from database
        const linkedResult = await api.documents.getByJob(props.jobNo);
        if (linkedResult.success) {
          // Map database fields to component expected fields
          linkedDocuments.value = (linkedResult.data || []).map(doc => ({
            ...doc,
            FilePath: doc.RelativePath,
            FileType: doc.MimeType,
            UploadedAt: doc.CreatedDate
          }));
        }

        // Load files from job folder
        await loadJobFolder();
      } catch (err) {
        console.error('Error loading documents:', err);
      } finally {
        loading.value = false;
      }
    }

    async function loadJobFolder() {
      if (!settings.value?.basePath) return;

      try {
        let folderPath = settings.value.basePath;

        // folderStructure is an object like { jobs: 'Jobs', suppliers: 'Suppliers' }
        const jobsFolder = settings.value.folderStructure?.jobs || 'Jobs';
        folderPath = `${folderPath}/${jobsFolder}/${props.jobNo}`;

        if (currentPath.value) {
          folderPath = `${folderPath}/${currentPath.value}`;
        }

        const result = await api.documentCache.listFiles(folderPath);
        if (result.success) {
          folderFolders.value = result.folders || [];
          folderFiles.value = result.files || [];
        } else {
          folderFolders.value = [];
          folderFiles.value = [];
        }
      } catch (err) {
        console.error('Error loading job folder:', err);
        folderFolders.value = [];
        folderFiles.value = [];
      }
    }

    function navigateToFolder(folder) {
      const relativePath = folder.path.split(props.jobNo).pop().replace(/^[/\\]/, '');
      currentPath.value = relativePath;
      loadJobFolder();
    }

    async function openJobFolder() {
      if (!settings.value?.basePath || !props.jobNo) return;

      const jobsFolder = settings.value.folderStructure?.jobs || 'Jobs';
      const folderPath = `${settings.value.basePath}/${jobsFolder}/${props.jobNo}`;

      await api.documentCache.showInFolder(folderPath);
    }

    async function createJobFolder() {
      if (!settings.value?.basePath || !props.jobNo) return;

      const jobsFolder = settings.value.folderStructure?.jobs || 'Jobs';
      const folderPath = `${settings.value.basePath}/${jobsFolder}/${props.jobNo}`;

      const result = await api.documentCache.createDirectory(folderPath);
      if (result.success) {
        await loadJobFolder();
        await api.documentCache.showInFolder(folderPath);
      } else {
        alert('Failed to create folder: ' + result.error);
      }
    }

    async function openFile(file) {
      await api.documentCache.openFile(file.path);
    }

    async function openDocument(doc) {
      await api.documentCache.openFile(doc.FilePath);
    }

    async function linkFile(file) {
      try {
        const result = await api.documents.link({
          jobNo: props.jobNo,
          costCentre: props.costCentre,
          filePath: file.path,
          fileName: file.name,
          fileType: file.extension,
          documentType: 'General'
        });

        if (result.success) {
          emit('document-linked', file);
          await loadDocuments();
        } else {
          alert('Failed to link document: ' + result.error);
        }
      } catch (err) {
        console.error('Error linking file:', err);
        alert('Failed to link document: ' + err.message);
      }
    }

    async function unlinkDocument(doc) {
      if (!confirm('Unlink this document from the job?')) return;

      try {
        const result = await api.documents.unlink(doc.DocumentID);
        if (result.success) {
          await loadDocuments();
        } else {
          alert('Failed to unlink document: ' + result.error);
        }
      } catch (err) {
        console.error('Error unlinking document:', err);
        alert('Failed to unlink document: ' + err.message);
      }
    }

    async function selectFileToUpload() {
      try {
        const result = await api.documentSettings.browseFile('');
        if (result) {
          uploadForm.value.selectedPath = result;
          uploadForm.value.selectedFile = { name: result.split(/[/\\]/).pop(), path: result };
        }
      } catch (err) {
        console.error('Error selecting file:', err);
      }
    }

    async function uploadDocument() {
      if (!uploadForm.value.selectedFile) return;

      uploading.value = true;
      try {
        // Copy file to job folder
        const jobsFolder = settings.value.folderStructure?.jobs || 'Jobs';
        const destFolder = `${settings.value.basePath}/${jobsFolder}/${props.jobNo}`;

        // Ensure folder exists
        await api.documentCache.createDirectory(destFolder);

        const destPath = `${destFolder}/${uploadForm.value.selectedFile.name}`;
        const copyResult = await api.documentCache.copyFile(uploadForm.value.selectedPath, destPath);

        if (copyResult.success) {
          // Link the document
          const ext = uploadForm.value.selectedFile.name.split('.').pop();
          await api.documents.link({
            jobNo: props.jobNo,
            costCentre: props.costCentre,
            filePath: destPath,
            fileName: uploadForm.value.selectedFile.name,
            fileType: ext,
            documentType: uploadForm.value.documentType,
            description: uploadForm.value.description
          });

          emit('document-uploaded');
          showUploadModal.value = false;
          uploadForm.value = { documentType: 'General', description: '', selectedFile: null, selectedPath: '' };
          await loadDocuments();
        } else {
          alert('Failed to copy file: ' + copyResult.error);
        }
      } catch (err) {
        console.error('Error uploading document:', err);
        alert('Failed to upload document: ' + err.message);
      } finally {
        uploading.value = false;
      }
    }

    function getFileIcon(ext) {
      const extension = (ext || '').toLowerCase();
      const iconMap = {
        pdf: 'bi bi-file-earmark-pdf text-danger',
        doc: 'bi bi-file-earmark-word text-primary',
        docx: 'bi bi-file-earmark-word text-primary',
        xls: 'bi bi-file-earmark-excel text-success',
        xlsx: 'bi bi-file-earmark-excel text-success',
        jpg: 'bi bi-file-earmark-image text-info',
        jpeg: 'bi bi-file-earmark-image text-info',
        png: 'bi bi-file-earmark-image text-info',
        dwg: 'bi bi-file-earmark-ruled text-secondary',
        default: 'bi bi-file-earmark'
      };
      return iconMap[extension] || iconMap.default;
    }

    function formatSize(bytes) {
      if (!bytes) return '-';
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    function formatDate(dateStr) {
      if (!dateStr) return '-';
      return new Date(dateStr).toLocaleDateString();
    }

    watch(() => props.jobNo, () => {
      currentPath.value = '';
      loadDocuments();
    });

    onMounted(async () => {
      await loadSettings();
      if (props.jobNo) {
        await loadDocuments();
      }
    });

    return {
      loading,
      linkedDocuments,
      folderFiles,
      folderFolders,
      showUploadModal,
      uploading,
      uploadForm,
      loadDocuments,
      navigateToFolder,
      openJobFolder,
      createJobFolder,
      openFile,
      openDocument,
      linkFile,
      unlinkDocument,
      selectFileToUpload,
      uploadDocument,
      getFileIcon,
      formatSize,
      formatDate
    };
  }
};
</script>

<style scoped>
.job-documents-panel {
  min-height: 200px;
}

.list-group-item {
  padding: 0.5rem 0.75rem;
}

.list-group-item:hover {
  background-color: #f8f9fa;
}
</style>
