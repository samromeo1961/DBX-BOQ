<template>
  <div class="documents-settings-tab">
    <h5 class="mb-3">
      <i class="bi bi-folder2-open me-2"></i>
      Document Storage Settings
    </h5>
    <p class="text-muted mb-4">
      Configure where documents are stored. The base path should point to a shared location
      (e.g., Google Shared Drive, network drive) that all users can access.
    </p>

    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-folder me-2"></i>
        Base Storage Path
      </div>
      <div class="card-body">
        <div class="row mb-3">
          <div class="col-md-9">
            <label class="form-label">Document Storage Location</label>
            <div class="input-group">
              <input
                type="text"
                class="form-control"
                v-model="settings.basePath"
                placeholder="e.g., G:\Shared drives\DBx BOQ\"
              >
              <button class="btn btn-outline-secondary" type="button" @click="browsePath">
                <i class="bi bi-folder2-open"></i>
                Browse
              </button>
            </div>
            <div class="form-text">
              Enter the base path for document storage (Google Shared Drive, OneDrive, or network path)
            </div>
          </div>
          <div class="col-md-3 d-flex align-items-end">
            <button class="btn btn-primary w-100" @click="validateAndSave" :disabled="saving">
              <i class="bi bi-check-lg me-1"></i>
              {{ saving ? 'Saving...' : 'Save Path' }}
            </button>
          </div>
        </div>

        <!-- Path Validation Status -->
        <div v-if="validationResult" class="alert" :class="validationResult.valid ? 'alert-success' : 'alert-warning'">
          <i class="bi" :class="validationResult.valid ? 'bi-check-circle' : 'bi-exclamation-triangle'"></i>
          {{ validationResult.valid ? 'Path is valid and accessible' : validationResult.error }}
        </div>

        <!-- Quick Path Presets -->
        <div class="mt-3">
          <label class="form-label small text-muted">Quick Presets:</label>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" @click="setPreset('google')">
              <i class="bi bi-google me-1"></i>
              Google Drive
            </button>
            <button class="btn btn-outline-secondary" @click="setPreset('onedrive')">
              <i class="bi bi-microsoft me-1"></i>
              OneDrive
            </button>
            <button class="btn btn-outline-secondary" @click="setPreset('network')">
              <i class="bi bi-hdd-network me-1"></i>
              Network Drive
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-diagram-3 me-2"></i>
        Folder Structure
      </div>
      <div class="card-body">
        <p class="text-muted small mb-3">
          Configure the folder names for each entity type. Documents will be organized as:
          <code>BasePath/EntityFolder/EntityCode/DocumentType/</code>
        </p>

        <div class="row">
          <div class="col-md-6">
            <h6 class="text-muted mb-2">Entity Folders</h6>
            <div class="mb-2">
              <label class="form-label small">Jobs Folder</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.folderStructure.jobs">
            </div>
            <div class="mb-2">
              <label class="form-label small">Suppliers Folder</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.folderStructure.suppliers">
            </div>
            <div class="mb-2">
              <label class="form-label small">Contacts Folder</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.folderStructure.contacts">
            </div>
            <div class="mb-2">
              <label class="form-label small">Customers Folder</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.folderStructure.customers">
            </div>
          </div>
          <div class="col-md-6">
            <h6 class="text-muted mb-2">Document Type Subfolders</h6>
            <div class="mb-2">
              <label class="form-label small">Quotes</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.quotes">
            </div>
            <div class="mb-2">
              <label class="form-label small">Orders</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.orders">
            </div>
            <div class="mb-2">
              <label class="form-label small">Invoices</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.invoices">
            </div>
            <div class="mb-2">
              <label class="form-label small">Emails</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.emails">
            </div>
            <div class="mb-2">
              <label class="form-label small">Photos</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.photos">
            </div>
            <div class="mb-2">
              <label class="form-label small">Drawings</label>
              <input type="text" class="form-control form-control-sm" v-model="settings.documentTypes.drawings">
            </div>
          </div>
        </div>

        <div class="mt-3 text-end">
          <button class="btn btn-sm btn-outline-secondary me-2" @click="resetFolderStructure">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Reset to Defaults
          </button>
          <button class="btn btn-sm btn-primary" @click="saveFolderStructure">
            <i class="bi bi-check-lg me-1"></i>
            Save Structure
          </button>
        </div>
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-gear me-2"></i>
        Options
      </div>
      <div class="card-body">
        <div class="form-check mb-2">
          <input
            class="form-check-input"
            type="checkbox"
            id="autoCreateFolders"
            v-model="settings.autoCreateFolders"
            @change="saveOptions"
          >
          <label class="form-check-label" for="autoCreateFolders">
            Automatically create folders when adding documents
          </label>
        </div>
        <div class="form-check mb-2">
          <input
            class="form-check-input"
            type="checkbox"
            id="openWithSystemApp"
            v-model="settings.openWithSystemApp"
            @change="saveOptions"
          >
          <label class="form-check-label" for="openWithSystemApp">
            Open files with default system application
          </label>
        </div>
      </div>
    </div>

    <!-- Document Cache -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="bi bi-database me-2"></i>
          Document Cache
        </span>
        <span v-if="cacheStats" class="badge bg-secondary">
          {{ cacheStats.totalFiles }} files, {{ cacheStats.totalDirectories }} folders
        </span>
      </div>
      <div class="card-body">
        <p class="text-muted small mb-3">
          The document cache stores a local index of files from your shared drive for faster access.
          Scan the document folder to build or refresh the cache.
        </p>

        <div class="row mb-3">
          <div class="col-md-8">
            <div v-if="cacheStats?.lastScanTime" class="small text-muted">
              Last scanned: {{ formatDate(cacheStats.lastScanTime) }}
            </div>
            <div v-else class="small text-muted">
              Cache not yet built
            </div>
          </div>
          <div class="col-md-4 text-end">
            <button
              class="btn btn-sm btn-primary me-2"
              @click="scanDocuments"
              :disabled="scanning || !settings.basePath"
            >
              <i class="bi" :class="scanning ? 'bi-hourglass-split' : 'bi-arrow-repeat'"></i>
              {{ scanning ? 'Scanning...' : 'Scan Now' }}
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              @click="clearDocumentCache"
              :disabled="!cacheStats?.totalFiles"
            >
              <i class="bi bi-trash me-1"></i>
              Clear
            </button>
          </div>
        </div>

        <!-- Scan Progress -->
        <div v-if="scanResult" class="alert" :class="scanResult.success ? 'alert-success' : 'alert-warning'">
          <div v-if="scanResult.success">
            <i class="bi bi-check-circle me-1"></i>
            Scan complete: {{ scanResult.results?.scanned || 0 }} items scanned,
            {{ scanResult.results?.added || 0 }} cached
          </div>
          <div v-else>
            <i class="bi bi-exclamation-triangle me-1"></i>
            {{ scanResult.error }}
          </div>
        </div>

        <!-- Database Table Status -->
        <div class="mt-3 pt-3 border-top">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>MSSQL Documents Table:</strong>
              <span v-if="tableStatus === null" class="text-muted ms-2">Not checked</span>
              <span v-else-if="tableStatus" class="text-success ms-2">
                <i class="bi bi-check-circle"></i> Exists
              </span>
              <span v-else class="text-warning ms-2">
                <i class="bi bi-exclamation-triangle"></i> Not created
              </span>
            </div>
            <button class="btn btn-sm btn-outline-primary" @click="initializeTable" :disabled="initializingTable">
              <i class="bi bi-database-add me-1"></i>
              {{ initializingTable ? 'Creating...' : 'Initialize Table' }}
            </button>
          </div>
          <div v-if="tableError" class="alert alert-danger mt-2 small">{{ tableError }}</div>
        </div>
      </div>
    </div>

    <!-- File Browser -->
    <div class="card mb-4" v-if="settings.basePath">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="bi bi-folder-fill me-2"></i>
          Browse Documents
        </span>
        <button class="btn btn-sm btn-outline-secondary" @click="refreshFileList">
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>
      <div class="card-body p-0">
        <!-- Breadcrumb Navigation -->
        <nav class="p-2 bg-light border-bottom">
          <ol class="breadcrumb mb-0 small">
            <li class="breadcrumb-item">
              <a href="#" @click.prevent="navigateTo('')">
                <i class="bi bi-house-door me-1"></i>Root
              </a>
            </li>
            <li
              v-for="(part, index) in currentPathParts"
              :key="index"
              class="breadcrumb-item"
              :class="{ active: index === currentPathParts.length - 1 }"
            >
              <a v-if="index < currentPathParts.length - 1" href="#" @click.prevent="navigateToIndex(index)">
                {{ part }}
              </a>
              <span v-else>{{ part }}</span>
            </li>
          </ol>
        </nav>

        <!-- File List -->
        <div class="file-list" style="max-height: 300px; overflow-y: auto;">
          <div v-if="loadingFiles" class="text-center p-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
            Loading...
          </div>
          <div v-else-if="fileList.length === 0" class="text-center p-3 text-muted">
            <i class="bi bi-folder2-open"></i> No files or folders found
          </div>
          <table v-else class="table table-sm table-hover mb-0">
            <tbody>
              <tr
                v-for="file in fileList"
                :key="file.name"
                @dblclick="file.isDirectory ? navigateTo(file.path) : openFile(file)"
                class="cursor-pointer"
              >
                <td style="width: 30px;">
                  <i :class="file.isDirectory ? 'bi bi-folder-fill text-warning' : getFileIcon(file.name)"></i>
                </td>
                <td>{{ file.name }}</td>
                <td class="text-end text-muted small" style="width: 100px;">
                  {{ file.isDirectory ? '' : formatFileSize(file.size) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Path Preview -->
    <div class="card">
      <div class="card-header">
        <i class="bi bi-eye me-2"></i>
        Path Preview
      </div>
      <div class="card-body">
        <p class="text-muted small mb-2">Example paths that will be generated:</p>
        <div class="bg-light p-2 rounded small font-monospace">
          <div class="mb-1">
            <strong>Job Documents:</strong> {{ previewPath('jobs', '12345', 'quotes') }}
          </div>
          <div class="mb-1">
            <strong>Supplier Invoice:</strong> {{ previewPath('suppliers', 'BUNNINGS', 'invoices') }}
          </div>
          <div>
            <strong>Contact Email:</strong> {{ previewPath('contacts', 'JOHNDOE', 'emails') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, computed } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'DocumentsSettingsTab',
  setup() {
    const api = useElectronAPI();
    const saving = ref(false);
    const validationResult = ref(null);
    const scanning = ref(false);
    const scanResult = ref(null);
    const cacheStats = ref(null);
    const fileList = ref([]);
    const currentPath = ref('');
    const loadingFiles = ref(false);
    const tableStatus = ref(null);
    const tableError = ref(null);
    const initializingTable = ref(false);

    const currentPathParts = computed(() => {
      if (!currentPath.value) return [];
      return currentPath.value.split(/[/\\]/).filter(p => p);
    });

    const settings = reactive({
      basePath: '',
      folderStructure: {
        jobs: 'Jobs',
        suppliers: 'Suppliers',
        contacts: 'Contacts',
        customers: 'Customers',
        communications: 'Communications'
      },
      documentTypes: {
        quotes: 'Quotes',
        orders: 'Orders',
        invoices: 'Invoices',
        emails: 'Emails',
        photos: 'Photos',
        drawings: 'Drawings',
        contracts: 'Contracts',
        other: 'Other'
      },
      autoCreateFolders: true,
      openWithSystemApp: true
    });

    async function loadSettings() {
      try {
        const result = await api.documentSettings.get();
        if (result) {
          settings.basePath = result.basePath || '';
          if (result.folderStructure) {
            Object.assign(settings.folderStructure, result.folderStructure);
          }
          if (result.documentTypes) {
            Object.assign(settings.documentTypes, result.documentTypes);
          }
          settings.autoCreateFolders = result.autoCreateFolders ?? true;
          settings.openWithSystemApp = result.openWithSystemApp ?? true;
        }
      } catch (error) {
        console.error('Error loading document settings:', error);
      }
    }

    async function validateAndSave() {
      saving.value = true;
      validationResult.value = null;

      try {
        // Validate the path
        if (settings.basePath) {
          const result = await api.documentSettings.validatePath(settings.basePath);
          validationResult.value = result;

          if (result.valid) {
            await api.documentSettings.setBasePath(settings.basePath);
          }
        } else {
          await api.documentSettings.setBasePath('');
          validationResult.value = { valid: true };
        }
      } catch (error) {
        console.error('Error saving base path:', error);
        validationResult.value = { valid: false, error: error.message };
      } finally {
        saving.value = false;
      }
    }

    async function saveFolderStructure() {
      try {
        await api.documentSettings.save({
          folderStructure: { ...settings.folderStructure },
          documentTypes: { ...settings.documentTypes }
        });
        alert('Folder structure saved successfully');
      } catch (error) {
        console.error('Error saving folder structure:', error);
        alert('Error saving folder structure: ' + error.message);
      }
    }

    async function saveOptions() {
      try {
        await api.documentSettings.save({
          autoCreateFolders: settings.autoCreateFolders,
          openWithSystemApp: settings.openWithSystemApp
        });
      } catch (error) {
        console.error('Error saving options:', error);
      }
    }

    function resetFolderStructure() {
      settings.folderStructure = {
        jobs: 'Jobs',
        suppliers: 'Suppliers',
        contacts: 'Contacts',
        customers: 'Customers',
        communications: 'Communications'
      };
      settings.documentTypes = {
        quotes: 'Quotes',
        orders: 'Orders',
        invoices: 'Invoices',
        emails: 'Emails',
        photos: 'Photos',
        drawings: 'Drawings',
        contracts: 'Contracts',
        other: 'Other'
      };
    }

    function setPreset(type) {
      switch (type) {
        case 'google':
          settings.basePath = 'G:\\Shared drives\\DBx BOQ\\';
          break;
        case 'onedrive':
          settings.basePath = 'C:\\Users\\[Username]\\OneDrive\\DBx BOQ\\';
          break;
        case 'network':
          settings.basePath = '\\\\SERVER\\Share\\DBx BOQ\\';
          break;
      }
    }

    async function browsePath() {
      try {
        const selectedPath = await api.documentSettings.browseFolder(settings.basePath || undefined);
        if (selectedPath) {
          settings.basePath = selectedPath;
        }
      } catch (error) {
        console.error('Error browsing folder:', error);
      }
    }

    function previewPath(entityType, entityCode, documentType) {
      const entityFolder = settings.folderStructure[entityType] || entityType;
      const docFolder = settings.documentTypes[documentType] || documentType;
      const base = settings.basePath || '[Base Path Not Set]';
      return `${base}${entityFolder}\\${entityCode}\\${docFolder}\\`;
    }

    async function loadCacheStats() {
      try {
        await api.documentCache.initialize();
        const result = await api.documentCache.getStats();
        if (result.success) {
          cacheStats.value = result.stats;
        }
      } catch (error) {
        console.error('Error loading cache stats:', error);
      }
    }

    async function scanDocuments() {
      if (!settings.basePath) return;

      scanning.value = true;
      scanResult.value = null;

      try {
        await api.documentCache.initialize();
        const result = await api.documentCache.scan(settings.basePath, '', null, null, null);
        scanResult.value = result;
        await loadCacheStats();
      } catch (error) {
        console.error('Error scanning documents:', error);
        scanResult.value = { success: false, error: error.message };
      } finally {
        scanning.value = false;
      }
    }

    async function clearDocumentCache() {
      if (!confirm('Are you sure you want to clear the document cache?')) return;

      try {
        await api.documentCache.clear();
        scanResult.value = null;
        await loadCacheStats();
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }

    function formatDate(dateString) {
      if (!dateString) return '';
      return new Date(dateString).toLocaleString();
    }

    // File browser functions
    async function loadFileList(relativePath = '') {
      if (!settings.basePath) return;

      loadingFiles.value = true;
      try {
        const fullPath = relativePath
          ? `${settings.basePath}${relativePath}`
          : settings.basePath;

        const result = await api.documentSettings.listFiles(fullPath);
        if (result.success) {
          // Sort: folders first, then by name
          fileList.value = result.files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
        } else {
          console.error('Error listing files:', result.error);
          fileList.value = [];
        }
      } catch (error) {
        console.error('Error loading file list:', error);
        fileList.value = [];
      } finally {
        loadingFiles.value = false;
      }
    }

    function navigateTo(path) {
      // Extract relative path from full path
      if (path.startsWith(settings.basePath)) {
        currentPath.value = path.substring(settings.basePath.length);
      } else {
        currentPath.value = path;
      }
      loadFileList(currentPath.value);
    }

    function navigateToIndex(index) {
      const parts = currentPathParts.value.slice(0, index + 1);
      currentPath.value = parts.join('\\');
      loadFileList(currentPath.value);
    }

    function refreshFileList() {
      loadFileList(currentPath.value);
    }

    function openFile(file) {
      // Use shell.openPath in Electron to open file with default app
      if (settings.openWithSystemApp) {
        alert(`Would open: ${file.path}`);
        // TODO: Implement shell.openPath via IPC
      }
    }

    function getFileIcon(filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
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
        txt: 'bi bi-file-earmark-text',
        zip: 'bi bi-file-earmark-zip text-warning',
        rar: 'bi bi-file-earmark-zip text-warning'
      };
      return iconMap[ext] || 'bi bi-file-earmark';
    }

    function formatFileSize(bytes) {
      if (!bytes) return '';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    async function checkTableStatus() {
      try {
        const result = await api.documents.checkTableExists();
        tableStatus.value = result.exists;
      } catch (error) {
        console.error('Error checking table status:', error);
        tableStatus.value = false;
      }
    }

    async function initializeTable() {
      initializingTable.value = true;
      tableError.value = null;
      try {
        const result = await api.documents.initialize();
        if (result.success) {
          tableStatus.value = true;
          tableError.value = null;
        } else {
          tableError.value = result.error || 'Failed to create table';
        }
      } catch (error) {
        console.error('Error initializing table:', error);
        tableError.value = error.message;
      } finally {
        initializingTable.value = false;
      }
    }

    onMounted(() => {
      loadSettings();
      loadCacheStats();
      checkTableStatus();
    });

    // Watch for basePath changes to load file list
    const watchBasePath = () => {
      if (settings.basePath && validationResult.value?.valid) {
        loadFileList('');
      }
    };

    return {
      settings,
      saving,
      validationResult,
      scanning,
      scanResult,
      cacheStats,
      fileList,
      currentPath,
      currentPathParts,
      loadingFiles,
      validateAndSave,
      saveFolderStructure,
      saveOptions,
      resetFolderStructure,
      setPreset,
      browsePath,
      previewPath,
      scanDocuments,
      clearDocumentCache,
      formatDate,
      navigateTo,
      navigateToIndex,
      refreshFileList,
      openFile,
      getFileIcon,
      formatFileSize,
      tableStatus,
      tableError,
      initializingTable,
      initializeTable
    };
  }
};
</script>

<style scoped>
.documents-settings-tab {
  max-width: 900px;
}

.font-monospace {
  font-family: 'Consolas', 'Monaco', monospace;
}

.cursor-pointer {
  cursor: pointer;
}

.file-list table tr:hover {
  background-color: #f8f9fa;
}
</style>
