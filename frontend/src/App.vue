<template>
  <div id="app" class="d-flex flex-column h-100">
    <!-- Header -->
    <header class="bg-white border-bottom py-3 px-3 d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center">
        <img src="@/assets/logo.svg" alt="DBx BOQ Logo" class="app-logo" />
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="text-end">
          <h1 class="h4 mb-0 fw-bold text-dark">DBx BOQ</h1>
          <p class="mb-0 small text-muted">Bill of Quantities System</p>
        </div>
        <div>
          <div v-if="dbConnected" class="badge bg-success">
            <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>
            Connected
          </div>
          <div v-else class="badge bg-warning text-dark">
            <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>
            Not Connected
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="nav-tabs-container bg-light border-bottom">
      <ul class="nav nav-tabs">
        <li class="nav-item">
          <router-link to="/jobs" class="nav-link" active-class="active">
            <i class="bi bi-briefcase me-1"></i>
            Jobs
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/boq" class="nav-link" active-class="active">
            <i class="bi bi-calculator me-1"></i>
            Bill of Quantities
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/catalogue" class="nav-link" active-class="active">
            <i class="bi bi-journal-text me-1"></i>
            Catalogue
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/contacts" class="nav-link" active-class="active">
            <i class="bi bi-person-lines-fill me-1"></i>
            Contacts
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/suppliers" class="nav-link" active-class="active">
            <i class="bi bi-truck me-1"></i>
            Suppliers
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/purchase-orders" class="nav-link" active-class="active">
            <i class="bi bi-cart me-1"></i>
            Purchase Orders
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/templates" class="nav-link" active-class="active">
            <i class="bi bi-file-earmark-text me-1"></i>
            Templates
          </router-link>
        </li>
        <li class="nav-item ms-auto">
          <router-link to="/settings" class="nav-link" active-class="active">
            <i class="bi bi-gear me-1"></i>
            Settings
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Main Content -->
    <main class="flex-grow-1 overflow-hidden">
      <router-view />
    </main>

    <!-- Footer -->
    <footer class="bg-light border-top py-1 px-3 text-center small text-muted">
      DBx BOQ v1.0.0 | © 2025
    </footer>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'App',
  setup() {
    const api = useElectronAPI();
    const dbConnected = ref(false);

    // Check database connection on mount
    onMounted(async () => {
      try {
        const savedConfig = await api.db.getSavedConnection();
        dbConnected.value = !!savedConfig;
      } catch (error) {
        console.error('Failed to check database connection:', error);
        dbConnected.value = false;
      }
    });

    return {
      dbConnected
    };
  }
};
</script>

<style scoped>
header {
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.app-logo {
  height: 50px;
  width: auto;
  max-width: 200px;
  object-fit: contain;
}

.nav-tabs-container {
  flex-shrink: 0;
  padding: 0;
}

.nav-tabs {
  border-bottom: none;
  padding-left: 1rem;
  margin-bottom: 0;
}

.nav-link {
  color: #495057;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 0.75rem 1.25rem;
  transition: all 0.2s;
}

.nav-link:hover {
  color: #007bff;
  background-color: rgba(0, 123, 255, 0.1);
  border-bottom-color: #007bff;
}

.nav-link.active {
  color: #007bff;
  background-color: white;
  border-bottom-color: #007bff;
  font-weight: 600;
}

footer {
  flex-shrink: 0;
}
</style>
