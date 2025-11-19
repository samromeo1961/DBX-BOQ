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

        <!-- Import/Export Tab -->
        <ImportExportTab v-if="activeTab === 'import-export'" />

        <!-- PDF Settings Tab -->
        <PdfSettingsTab v-if="activeTab === 'pdf'" />

        <!-- UI Preferences Tab -->
        <UiPreferencesTab v-if="activeTab === 'ui'" />
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
import ImportExportTab from './ImportExportTab.vue';
import PdfSettingsTab from './PdfSettingsTab.vue';
import UiPreferencesTab from './UiPreferencesTab.vue';

export default {
  name: 'SettingsView',
  components: {
    CompaniesTab,
    UsersTab,
    ApplicationDefaultsTab,
    ImportExportTab,
    PdfSettingsTab,
    UiPreferencesTab
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
