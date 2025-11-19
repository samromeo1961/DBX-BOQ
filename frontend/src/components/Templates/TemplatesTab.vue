<template>
  <div class="templates-tab h-100 d-flex flex-column">
    <!-- Header -->
    <div class="tab-header d-flex justify-content-between align-items-center p-3 border-bottom bg-white">
      <h4 class="mb-0">
        <i class="bi bi-file-earmark-text me-2"></i>
        Template Management
      </h4>
      <div class="d-flex gap-2">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="refreshTemplates"
          :disabled="loading"
          title="Refresh Templates"
        >
          <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Template Type Tabs -->
    <nav class="template-types-nav bg-light border-bottom">
      <ul class="nav nav-tabs border-0 px-3">
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTemplateType === 'catalogue' }"
            @click.prevent="activeTemplateType = 'catalogue'"
            href="#"
          >
            <i class="bi bi-journal-text me-1"></i>
            Catalogue Templates
          </a>
        </li>
        <li class="nav-item">
          <a
            class="nav-link"
            :class="{ active: activeTemplateType === 'purchase-orders' }"
            @click.prevent="activeTemplateType = 'purchase-orders'"
            href="#"
          >
            <i class="bi bi-receipt-cutoff me-1"></i>
            Purchase Order Templates
          </a>
        </li>
      </ul>
    </nav>

    <!-- Content Area -->
    <div class="flex-fill overflow-auto">
      <!-- Catalogue Templates Section -->
      <div v-if="activeTemplateType === 'catalogue'" class="p-4">
        <div class="row">
          <div class="col-md-4">
            <div class="card">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                  <i class="bi bi-list me-2"></i>
                  Catalogue Items
                </h6>
              </div>
              <div class="card-body p-0">
                <div class="mb-3 p-3 pb-0">
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    placeholder="Search catalogue items..."
                    v-model="catalogueSearchQuery"
                  />
                </div>
                <div class="catalogue-items-list" style="max-height: 600px; overflow-y: auto;">
                  <div v-if="loadingCatalogue" class="text-center p-4">
                    <div class="spinner-border spinner-border-sm text-primary" role="status">
                      <span class="visually-hidden">Loading...</span>
                    </div>
                  </div>
                  <div
                    v-else
                    v-for="item in filteredCatalogueItems"
                    :key="item.PriceCode"
                    class="list-group-item list-group-item-action"
                    :class="{ 'active': selectedCatalogueItem?.PriceCode === item.PriceCode }"
                    @click="selectCatalogueItem(item)"
                    style="cursor: pointer;"
                  >
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <strong>{{ item.PriceCode }}</strong>
                        <div class="small text-muted">{{ item.Description }}</div>
                      </div>
                      <span v-if="item.Template" class="badge bg-success">
                        <i class="bi bi-file-text"></i>
                      </span>
                    </div>
                  </div>
                  <div v-if="filteredCatalogueItems.length === 0" class="text-center p-4 text-muted">
                    No catalogue items found
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-8">
            <div class="card">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">
                  <i class="bi bi-file-text me-2"></i>
                  Workup Template Editor
                  <span v-if="selectedCatalogueItem" class="ms-2 opacity-75">
                    ({{ selectedCatalogueItem.PriceCode }})
                  </span>
                </h6>
              </div>
              <div class="card-body">
                <TemplateEditor
                  v-if="selectedCatalogueItem"
                  :priceCode="selectedCatalogueItem.PriceCode"
                  @updated="onCatalogueTemplateUpdated"
                />
                <div v-else class="alert alert-info">
                  <i class="bi bi-info-circle me-2"></i>
                  Select a catalogue item to edit its workup template
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Purchase Order Templates Section -->
      <div v-if="activeTemplateType === 'purchase-orders'" class="p-4">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h6 class="mb-0">
                  <i class="bi bi-file-earmark-code me-2"></i>
                  HTML Templates for Purchase Orders & Reports
                </h6>
                <button
                  class="btn btn-sm btn-light"
                  @click="openTemplateGallery"
                >
                  <i class="bi bi-grid-3x3 me-1"></i>
                  Template Gallery
                </button>
              </div>
              <div class="card-body">
                <div class="alert alert-info">
                  <i class="bi bi-info-circle me-2"></i>
                  <strong>Purchase Order Templates</strong> are HTML-based templates used to generate
                  professional purchase orders and reports. Click "Template Gallery" to manage built-in
                  and custom templates.
                </div>

                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-body">
                        <h6 class="card-title">
                          <i class="bi bi-folder2 me-2 text-primary"></i>
                          Built-in Templates
                        </h6>
                        <p class="card-text small text-muted">
                          Professional templates included with DBx BOQ
                        </p>
                        <button class="btn btn-sm btn-outline-primary" @click="openTemplateGallery">
                          Browse Built-in Templates
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-body">
                        <h6 class="card-title">
                          <i class="bi bi-palette me-2 text-success"></i>
                          Custom Templates
                        </h6>
                        <p class="card-text small text-muted">
                          Create and manage your own custom templates
                        </p>
                        <button class="btn btn-sm btn-outline-success" @click="openTemplateGallery">
                          Manage Custom Templates
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-body">
                        <h6 class="card-title">
                          <i class="bi bi-folder2-open me-2 text-info"></i>
                          Assets Library
                        </h6>
                        <p class="card-text small text-muted">
                          Manage logos, CSS, fonts, and other assets
                        </p>
                        <button class="btn btn-sm btn-outline-info" @click="showAssetsLibrary = true">
                          Open Assets Library
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-body">
                        <h6 class="card-title">
                          <i class="bi bi-puzzle me-2 text-warning"></i>
                          Template Partials
                        </h6>
                        <p class="card-text small text-muted">
                          Reusable template fragments (headers, footers, etc.)
                        </p>
                        <button class="btn btn-sm btn-outline-warning" @click="showPartialsLibrary = true">
                          Open Partials Library
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Template Gallery Modal -->
    <TemplateGallery
      v-if="showTemplateGallery"
      @close="showTemplateGallery = false"
      @template-selected="onTemplateSelected"
    />

    <!-- Assets Library Modal -->
    <AssetsLibrary
      v-if="showAssetsLibrary"
      @close="showAssetsLibrary = false"
    />

    <!-- Partials Library Modal -->
    <PartialsLibrary
      v-if="showPartialsLibrary"
      @close="showPartialsLibrary = false"
    />
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import TemplateEditor from '../Catalogue/TemplateEditor.vue';
import TemplateGallery from '../PurchaseOrders/TemplateGallery.vue';
import AssetsLibrary from '../common/AssetsLibrary.vue';
import PartialsLibrary from '../common/PartialsLibrary.vue';

export default {
  name: 'TemplatesTab',
  components: {
    TemplateEditor,
    TemplateGallery,
    AssetsLibrary,
    PartialsLibrary
  },
  setup() {
    const api = useElectronAPI();
    const loading = ref(false);
    const loadingCatalogue = ref(false);
    const activeTemplateType = ref('catalogue');

    // Catalogue Templates
    const catalogueItems = ref([]);
    const selectedCatalogueItem = ref(null);
    const catalogueSearchQuery = ref('');

    // Purchase Order Templates
    const showTemplateGallery = ref(false);
    const showAssetsLibrary = ref(false);
    const showPartialsLibrary = ref(false);

    // Filtered catalogue items
    const filteredCatalogueItems = computed(() => {
      if (!catalogueSearchQuery.value) {
        return catalogueItems.value;
      }

      const query = catalogueSearchQuery.value.toLowerCase();
      return catalogueItems.value.filter(item => {
        return (
          item.PriceCode.toLowerCase().includes(query) ||
          item.Description?.toLowerCase().includes(query)
        );
      });
    });

    // Load catalogue items
    async function loadCatalogueItems() {
      loadingCatalogue.value = true;
      try {
        const result = await api.catalogue.getAllItems();
        if (result.success) {
          catalogueItems.value = result.data || [];
        } else {
          console.error('Failed to load catalogue items:', result.message);
        }
      } catch (error) {
        console.error('Error loading catalogue items:', error);
      } finally {
        loadingCatalogue.value = false;
      }
    }

    function selectCatalogueItem(item) {
      selectedCatalogueItem.value = item;
    }

    function onCatalogueTemplateUpdated() {
      // Reload the catalogue item to update the badge
      loadCatalogueItems();
    }

    function openTemplateGallery() {
      showTemplateGallery.value = true;
    }

    function onTemplateSelected(template) {
      console.log('Template selected:', template);
      showTemplateGallery.value = false;
    }

    function refreshTemplates() {
      if (activeTemplateType.value === 'catalogue') {
        loadCatalogueItems();
      }
    }

    // Load data on mount
    onMounted(() => {
      loadCatalogueItems();
    });

    return {
      loading,
      loadingCatalogue,
      activeTemplateType,
      catalogueItems,
      selectedCatalogueItem,
      catalogueSearchQuery,
      filteredCatalogueItems,
      showTemplateGallery,
      showAssetsLibrary,
      showPartialsLibrary,
      selectCatalogueItem,
      onCatalogueTemplateUpdated,
      openTemplateGallery,
      onTemplateSelected,
      refreshTemplates
    };
  }
};
</script>

<style scoped>
.templates-tab {
  background-color: #f8f9fa;
}

.tab-header {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.template-types-nav {
  flex-shrink: 0;
}

.template-types-nav .nav-link {
  color: #495057;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.75rem 1.25rem;
  transition: all 0.2s;
}

.template-types-nav .nav-link:hover {
  color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
  border-bottom-color: #007bff;
}

.template-types-nav .nav-link.active {
  color: #007bff;
  background-color: white;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.list-group-item {
  border-left: none;
  border-right: none;
  border-radius: 0;
}

.list-group-item:first-child {
  border-top: none;
}

.list-group-item.active {
  background-color: #007bff;
  border-color: #007bff;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spin {
  animation: spin 1s linear infinite;
}
</style>
