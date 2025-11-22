<template>
  <div class="settings-view h-100 d-flex flex-column">
    <!-- Header -->
    <div class="settings-header bg-primary text-white p-3">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h4 class="mb-0">
              <i class="bi bi-gear-fill me-2"></i>
              Global Settings
            </h4>
            <small>Manage companies, users, and application preferences</small>
          </div>
          <div>
            <button class="btn btn-light btn-sm me-2" @click="loadSettings">
              <i class="bi bi-arrow-clockwise me-1"></i>
              Refresh
            </button>
            <button class="btn btn-outline-light btn-sm" @click="$router.push('/jobs')">
              <i class="bi bi-x-lg me-1"></i>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs Navigation -->
    <div class="settings-tabs bg-light border-bottom">
      <div class="container-fluid">
        <ul class="nav nav-tabs border-0" role="tablist">
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'companies' }"
              @click="activeTab = 'companies'"
              type="button"
            >
              <i class="bi bi-building me-1"></i>
              Companies
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'users' }"
              @click="activeTab = 'users'"
              type="button"
            >
              <i class="bi bi-people me-1"></i>
              Users
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'defaults' }"
              @click="activeTab = 'defaults'"
              type="button"
            >
              <i class="bi bi-sliders me-1"></i>
              Application Defaults
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'boq-options' }"
              @click="activeTab = 'boq-options'"
              type="button"
            >
              <i class="bi bi-list-check me-1"></i>
              BOQ Options
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'import-export' }"
              @click="activeTab = 'import-export'"
              type="button"
            >
              <i class="bi bi-arrow-left-right me-1"></i>
              Import/Export
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'pdf' }"
              @click="activeTab = 'pdf'"
              type="button"
            >
              <i class="bi bi-file-pdf me-1"></i>
              PDF Settings
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'ui' }"
              @click="activeTab = 'ui'"
              type="button"
            >
              <i class="bi bi-palette me-1"></i>
              UI Preferences
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'api-keys' }"
              @click="activeTab = 'api-keys'"
              type="button"
            >
              <i class="bi bi-key me-1"></i>
              API Keys
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'email' }"
              @click="activeTab = 'email'"
              type="button"
            >
              <i class="bi bi-envelope-at me-1"></i>
              Email / SMTP
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'nominated-suppliers' }"
              @click="activeTab = 'nominated-suppliers'"
              type="button"
            >
              <i class="bi bi-truck me-1"></i>
              Nominated Suppliers
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'documents' }"
              @click="activeTab = 'documents'"
              type="button"
            >
              <i class="bi bi-folder2-open me-1"></i>
              Documents
            </button>
          </li>
          <li class="nav-item">
            <button
              class="nav-link"
              :class="{ active: activeTab === 'database-schema' }"
              @click="activeTab = 'database-schema'"
              type="button"
            >
              <i class="bi bi-database-gear me-1"></i>
              DB Schema
            </button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Tab Content -->
    <div class="settings-content flex-grow-1 overflow-auto">
      <div class="container-fluid py-4">
        <!-- Companies Tab -->
        <CompaniesTab v-if="activeTab === 'companies'" @reload="loadSettings" />

        <!-- Users Tab -->
        <UsersTab v-if="activeTab === 'users'" @reload="loadSettings" />

        <!-- Application Defaults Tab -->
        <ApplicationDefaultsTab v-if="activeTab === 'defaults'" />

        <!-- BOQ Options Tab -->
        <BOQOptionsTab v-if="activeTab === 'boq-options'" />

        <!-- Import/Export Tab -->
        <ImportExportTab v-if="activeTab === 'import-export'" />

        <!-- PDF Settings Tab -->
        <PdfSettingsTab v-if="activeTab === 'pdf'" />

        <!-- UI Preferences Tab -->
        <UiPreferencesTab v-if="activeTab === 'ui'" />

        <!-- API Keys Tab -->
        <ApiKeysTab v-if="activeTab === 'api-keys'" />

        <!-- Email / SMTP Settings Tab -->
        <EmailSettingsTab v-if="activeTab === 'email'" />

        <!-- Nominated Suppliers Tab -->
        <NominatedSuppliersTab v-if="activeTab === 'nominated-suppliers'" />

        <!-- Documents Settings Tab -->
        <DocumentsSettingsTab v-if="activeTab === 'documents'" />

        <!-- Database Schema Tab -->
        <DatabaseSchemaTab v-if="activeTab === 'database-schema'" />
      </div>
    </div>

    <!-- Footer Status Bar -->
    <div class="settings-footer bg-light border-top py-2 px-3 small">
      <div class="container-fluid">
        <div class="row">
          <div class="col-md-6">
            <span v-if="currentCompany" class="text-muted">
              <strong>Current Company:</strong> {{ currentCompany.name || 'Not selected' }}
            </span>
          </div>
          <div class="col-md-6 text-end">
            <span v-if="currentUser" class="text-muted">
              <strong>Logged in as:</strong> {{ currentUser.fullName || currentUser.username }}
            </span>
            <span v-else class="text-muted">
              No user logged in
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import CompaniesTab from './CompaniesTab.vue';
import UsersTab from './UsersTab.vue';
import ApplicationDefaultsTab from './ApplicationDefaultsTab.vue';
import BOQOptionsTab from './BOQOptionsTab.vue';
import ImportExportTab from './ImportExportTab.vue';
import PdfSettingsTab from './PdfSettingsTab.vue';
import UiPreferencesTab from './UiPreferencesTab.vue';
import ApiKeysTab from './ApiKeysTab.vue';
import EmailSettingsTab from './EmailSettingsTab.vue';
import NominatedSuppliersTab from './NominatedSuppliersTab.vue';
import DocumentsSettingsTab from './DocumentsSettingsTab.vue';
import DatabaseSchemaTab from './DatabaseSchemaTab.vue';

export default {
  name: 'SettingsView',
  components: {
    CompaniesTab,
    UsersTab,
    ApplicationDefaultsTab,
    BOQOptionsTab,
    ImportExportTab,
    PdfSettingsTab,
    UiPreferencesTab,
    ApiKeysTab,
    EmailSettingsTab,
    NominatedSuppliersTab,
    DocumentsSettingsTab,
    DatabaseSchemaTab
  },
  setup() {
    const api = useElectronAPI();
    const activeTab = ref('companies');
    const currentCompany = ref(null);
    const currentUser = ref(null);

    async function loadSettings() {
      try {
        const settings = await api.settings.getAll();
        currentCompany.value = settings.currentCompany;
        currentUser.value = settings.currentUser;
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }

    onMounted(() => {
      loadSettings();
    });

    return {
      activeTab,
      currentCompany,
      currentUser,
      loadSettings
    };
  }
};
</script>

<style scoped>
.settings-view {
  background-color: #f8f9fa;
}

.settings-header {
  flex-shrink: 0;
}

.settings-tabs {
  flex-shrink: 0;
}

.settings-content {
  background-color: #fff;
}

.settings-footer {
  flex-shrink: 0;
}

.nav-tabs .nav-link {
  border: none;
  border-bottom: 3px solid transparent;
  color: #6c757d;
}

.nav-tabs .nav-link:hover {
  border-bottom-color: #dee2e6;
  color: #495057;
}

.nav-tabs .nav-link.active {
  border-bottom-color: #0d6efd;
  color: #0d6efd;
  font-weight: 500;
}
</style>
