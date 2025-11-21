<template>
  <div class="document-browser">
    <!-- Toolbar -->
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div class="d-flex gap-2 align-items-center">
        <div class="input-group" style="width: 300px;">
          <span class="input-group-text"><i class="bi bi-search"></i></span>
          <input
            type="text"
            class="form-control"
            placeholder="Search documents..."
            v-model="searchQuery"
            @input="filterDocuments"
          >
        </div>
        <select class="form-select" style="width: 150px;" v-model="filterType" @change="filterDocuments">
          <option value="">All Types</option>
          <option value="pdf">PDF</option>
          <option value="doc">Word</option>
          <option value="xls">Excel</option>
          <option value="img">Images</option>
          <option value="dwg">CAD</option>
        </select>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" @click="refreshFiles" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i>
          Refresh
        </button>
        <button class="btn btn-outline-primary btn-sm" @click="openInExplorer" v-if="currentPath">
          <i class="bi bi-folder2-open me-1"></i>
          Open Folder
        </button>
      </div>
    </div>

    <!-- Breadcrumb Navigation -->
    <nav aria-label="breadcrumb" class="mb-3" v-if="breadcrumbs.length > 0">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <a href="#" @click.prevent="navigateTo('')">
            <i class="bi bi-house-door"></i> Root
          </a>
        </li>
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="index"
          class="breadcrumb-item"
          :class="{ active: index === breadcrumbs.length - 1 }"
        >
          <a v-if="index < breadcrumbs.length - 1" href="#" @click.prevent="navigateTo(crumb.path)">
            {{ crumb.name }}
          </a>
          <span v-else>{{ crumb.name }}</span>
        </li>
      </ol>
    </nav>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-2 text-muted">Loading documents...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredFiles.length === 0 && folders.length === 0" class="text-center py-5 text-muted">
      <i class="bi bi-folder-x" style="font-size: 3rem;"></i>
      <p class="mt-2">{{ searchQuery ? 'No documents match your search' : 'No documents found' }}</p>
    </div>

    <!-- File Browser -->
    <div v-else class="file-browser">
      <!-- Folders -->
      <div v-if="folders.length > 0" class="mb-3">
        <div class="row g-2">
          <div
            v-for="folder in folders"
            :key="folder.name"
            class="col-6 col-md-4 col-lg-3"
          >
            <div
              class="folder-item p-2 rounded border d-flex align-items-center"
              @dblclick="navigateTo(folder.path)"
              @click="selectItem(folder)"
              :class="{ 'bg-primary text-white': selectedItem?.path === folder.path }"
              role="button"
            >
              <i class="bi bi-folder-fill text-warning me-2" style="font-size: 1.5rem;"></i>
              <div class="text-truncate">
                <div class="fw-medium text-truncate">{{ folder.name }}</div>
                <small class="text-muted">{{ folder.itemCount }} items</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Files Table -->
      <div v-if="filteredFiles.length > 0" class="table-responsive">
        <table class="table table-hover table-sm">
          <thead class="table-light">
            <tr>
              <th style="width: 40px;"></th>
              <th @click="sortBy('name')" role="button">
                Name
                <i v-if="sortField === 'name'" :class="sortDir === 'asc' ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
              </th>
              <th style="width: 100px;" @click="sortBy('size')" role="button">
                Size
                <i v-if="sortField === 'size'" :class="sortDir === 'asc' ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
              </th>
              <th style="width: 150px;" @click="sortBy('modified')" role="button">
                Modified
                <i v-if="sortField === 'modified'" :class="sortDir === 'asc' ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
              </th>
              <th style="width: 120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="file in filteredFiles"
              :key="file.path"
              @click="selectItem(file)"
              @dblclick="openFile(file)"
              :class="{ 'table-primary': selectedItem?.path === file.path }"
              role="button"
            >
              <td>
                <i :class="getFileIcon(file.extension)" style="font-size: 1.2rem;"></i>
              </td>
              <td>
                <span class="text-truncate d-inline-block" style="max-width: 400px;">
                  {{ file.name }}
                </span>
                <span v-if="file.linked" class="badge bg-success ms-2">
                  <i class="bi bi-link-45deg"></i> Linked
                </span>
              </td>
              <td class="text-muted small">{{ formatSize(file.size) }}</td>
              <td class="text-muted small">{{ formatDate(file.modified) }}</td>
              <td>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary" @click.stop="openFile(file)" title="Open">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button class="btn btn-outline-secondary" @click.stop="showInFolder(file)" title="Show in folder">
                    <i class="bi bi-folder2"></i>
                  </button>
                  <button
                    v-if="showLinkButton"
                    class="btn btn-outline-success"
                    @click.stop="linkDocument(file)"
                    title="Link to item"
                  >
                    <i class="bi bi-link-45deg"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Selected File Preview Panel -->
    <div v-if="selectedItem && !selectedItem.isFolder" class="mt-3 p-3 bg-light rounded border">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h6 class="mb-1">
            <i :class="getFileIcon(selectedItem.extension)" class="me-2"></i>
            {{ selectedItem.name }}
          </h6>
          <small class="text-muted">
            {{ formatSize(selectedItem.size) }} | Modified: {{ formatDate(selectedItem.modified) }}
          </small>
        </div>
        <button class="btn btn-primary btn-sm" @click="openFile(selectedItem)">
          <i class="bi bi-box-arrow-up-right me-1"></i>
          Open
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'DocumentBrowser',
  props: {
    jobNo: {
      type: String,
      default: ''
    },
    costCentre: {
      type: String,
      default: ''
    },
    showLinkButton: {
      type: Boolean,
      default: false
    },
    basePath: {
      type: String,
      default: ''
    }
  },
  emits: ['file-selected', 'link-document'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const loading = ref(false);
    const error = ref('');
    const files = ref([]);
    const folders = ref([]);
    const currentPath = ref('');
    const searchQuery = ref('');
    const filterType = ref('');
    const selectedItem = ref(null);
    const sortField = ref('name');
    const sortDir = ref('asc');
    const settings = ref(null);

    // File type extensions mapping
    const fileTypeExtensions = {
      pdf: ['pdf'],
      doc: ['doc', 'docx', 'rtf', 'odt'],
      xls: ['xls', 'xlsx', 'csv'],
      img: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
      dwg: ['dwg', 'dxf', 'dwf']
    };

    const breadcrumbs = computed(() => {
      if (!currentPath.value) return [];
      const parts = currentPath.value.split(/[/\\]/).filter(p => p);
      let path = '';
      return parts.map(part => {
        path = path ? `${path}/${part}` : part;
        return { name: part, path };
      });
    });

    const filteredFiles = computed(() => {
      let result = [...files.value];

      // Search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(f => f.name.toLowerCase().includes(query));
      }

      // Type filter
      if (filterType.value && fileTypeExtensions[filterType.value]) {
        const exts = fileTypeExtensions[filterType.value];
        result = result.filter(f => exts.includes(f.extension?.toLowerCase()));
      }

      // Sort
      result.sort((a, b) => {
        let aVal = a[sortField.value];
        let bVal = b[sortField.value];

        if (sortField.value === 'name') {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortDir.value === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir.value === 'asc' ? 1 : -1;
        return 0;
      });

      return result;
    });

    async function loadSettings() {
      try {
        settings.value = await api.documentSettings.get();
      } catch (err) {
        console.error('Error loading document settings:', err);
      }
    }

    async function refreshFiles() {
      loading.value = true;
      error.value = '';

      try {
        // Get base path from props or settings
        let basePath = props.basePath;
        if (!basePath && settings.value?.basePath) {
          basePath = settings.value.basePath;
        }

        if (!basePath) {
          error.value = 'Document path not configured. Go to Settings > Documents to configure.';
          return;
        }

        // Build full path
        let fullPath = basePath;
        if (currentPath.value) {
          fullPath = `${basePath}/${currentPath.value}`;
        }

        // If job number provided, try to navigate to job folder
        if (props.jobNo && !currentPath.value && settings.value?.folderStructure) {
          const jobFolder = settings.value.folderStructure
            .replace('{JobNo}', props.jobNo)
            .replace('{CostCentre}', props.costCentre || '');
          fullPath = `${basePath}/${jobFolder}`;
          currentPath.value = jobFolder;
        }

        const result = await api.documentCache.listFiles(fullPath);

        if (result.success) {
          folders.value = result.folders || [];
          files.value = result.files || [];

          // Check for linked documents
          if (props.jobNo) {
            await checkLinkedDocuments();
          }
        } else {
          error.value = result.error || 'Failed to load documents';
        }
      } catch (err) {
        console.error('Error loading documents:', err);
        error.value = err.message || 'Failed to load documents';
      } finally {
        loading.value = false;
      }
    }

    async function checkLinkedDocuments() {
      try {
        const result = await api.documents.getByJob(props.jobNo);
        if (result.success && result.documents) {
          const linkedPaths = new Set(result.documents.map(d => d.FilePath));
          files.value = files.value.map(f => ({
            ...f,
            linked: linkedPaths.has(f.path)
          }));
        }
      } catch (err) {
        console.error('Error checking linked documents:', err);
      }
    }

    function navigateTo(path) {
      currentPath.value = path;
      selectedItem.value = null;
      refreshFiles();
    }

    function selectItem(item) {
      selectedItem.value = item;
      emit('file-selected', item);
    }

    async function openFile(file) {
      try {
        await api.documentCache.openFile(file.path);
      } catch (err) {
        console.error('Error opening file:', err);
        alert('Failed to open file: ' + err.message);
      }
    }

    async function showInFolder(file) {
      try {
        await api.documentCache.showInFolder(file.path);
      } catch (err) {
        console.error('Error showing in folder:', err);
      }
    }

    async function openInExplorer() {
      try {
        let basePath = props.basePath || settings.value?.basePath;
        if (currentPath.value) {
          basePath = `${basePath}/${currentPath.value}`;
        }
        await api.documentCache.showInFolder(basePath);
      } catch (err) {
        console.error('Error opening explorer:', err);
      }
    }

    function linkDocument(file) {
      emit('link-document', file);
    }

    function filterDocuments() {
      // Filtering is handled by computed property
    }

    function sortBy(field) {
      if (sortField.value === field) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortDir.value = 'asc';
      }
    }

    function getFileIcon(extension) {
      const ext = (extension || '').toLowerCase();
      const iconMap = {
        pdf: 'bi bi-file-earmark-pdf text-danger',
        doc: 'bi bi-file-earmark-word text-primary',
        docx: 'bi bi-file-earmark-word text-primary',
        xls: 'bi bi-file-earmark-excel text-success',
        xlsx: 'bi bi-file-earmark-excel text-success',
        csv: 'bi bi-file-earmark-spreadsheet text-success',
        jpg: 'bi bi-file-earmark-image text-info',
        jpeg: 'bi bi-file-earmark-image text-info',
        png: 'bi bi-file-earmark-image text-info',
        gif: 'bi bi-file-earmark-image text-info',
        dwg: 'bi bi-file-earmark-ruled text-secondary',
        dxf: 'bi bi-file-earmark-ruled text-secondary',
        zip: 'bi bi-file-earmark-zip text-warning',
        txt: 'bi bi-file-earmark-text',
        default: 'bi bi-file-earmark'
      };
      return iconMap[ext] || iconMap.default;
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
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Watch for job number changes
    watch(() => props.jobNo, () => {
      currentPath.value = '';
      refreshFiles();
    });

    onMounted(async () => {
      await loadSettings();
      await refreshFiles();
    });

    return {
      loading,
      error,
      files,
      folders,
      currentPath,
      searchQuery,
      filterType,
      selectedItem,
      sortField,
      sortDir,
      breadcrumbs,
      filteredFiles,
      refreshFiles,
      navigateTo,
      selectItem,
      openFile,
      showInFolder,
      openInExplorer,
      linkDocument,
      filterDocuments,
      sortBy,
      getFileIcon,
      formatSize,
      formatDate
    };
  }
};
</script>

<style scoped>
.document-browser {
  min-height: 300px;
}

.folder-item {
  cursor: pointer;
  transition: background-color 0.15s;
}

.folder-item:hover {
  background-color: #f8f9fa;
}

.folder-item.bg-primary:hover {
  background-color: #0b5ed7 !important;
}

.table tbody tr {
  cursor: pointer;
}

.breadcrumb {
  background-color: #f8f9fa;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}
</style>
