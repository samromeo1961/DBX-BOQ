<template>
  <div class="database-schema-tab">
    <h5 class="mb-3">
      <i class="bi bi-database-gear me-2"></i>
      Database Schema Management
    </h5>
    <p class="text-muted mb-4">
      View required database modifications and generate SQL scripts for your DBA.
    </p>

    <!-- Schema Status -->
    <div class="card mb-4">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="bi bi-list-check me-2"></i>
          Schema Status
        </span>
        <button class="btn btn-sm btn-outline-primary" @click="checkStatus" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1"></i>
          {{ loading ? 'Checking...' : 'Refresh' }}
        </button>
      </div>
      <div class="card-body">
        <div v-if="!status" class="text-center text-muted py-3">
          Click Refresh to check schema status
        </div>
        <div v-else>
          <div class="mb-3">
            <span class="badge bg-primary me-2">System DB: {{ status.systemDatabase }}</span>
            <span class="badge bg-secondary">Job DB: {{ status.jobDatabase }}</span>
          </div>

          <div class="alert" :class="status.pendingCount > 0 ? 'alert-warning' : 'alert-success'">
            <i class="bi" :class="status.pendingCount > 0 ? 'bi-exclamation-triangle' : 'bi-check-circle'"></i>
            {{ status.pendingCount > 0
              ? `${status.pendingCount} schema changes pending`
              : 'Database schema is up to date' }}
          </div>

          <table class="table table-sm table-hover">
            <thead>
              <tr>
                <th style="width: 40px;"></th>
                <th>Object</th>
                <th>Database</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="change in status.changes" :key="change.name">
                <td>
                  <i v-if="change.exists" class="bi bi-check-circle-fill text-success"></i>
                  <i v-else class="bi bi-x-circle-fill text-warning"></i>
                </td>
                <td>
                  <code>{{ change.name }}</code>
                  <span class="badge bg-secondary ms-1">{{ change.type }}</span>
                </td>
                <td><small class="text-muted">{{ change.database }}</small></td>
                <td><small>{{ change.description }}</small></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Generate Migration Script -->
    <div class="card mb-4">
      <div class="card-header">
        <i class="bi bi-file-code me-2"></i>
        Generate Migration Script
      </div>
      <div class="card-body">
        <p class="text-muted small mb-3">
          Generate a SQL script containing only the changes needed for your database.
          Share this with your DBA to apply the required modifications.
        </p>

        <div class="d-flex gap-2 mb-3">
          <button class="btn btn-primary" @click="generateMigration" :disabled="generating">
            <i class="bi bi-file-earmark-code me-1"></i>
            {{ generating ? 'Generating...' : 'Generate Migration Script' }}
          </button>
          <button class="btn btn-outline-secondary" @click="generateFull" :disabled="generating">
            <i class="bi bi-file-earmark-text me-1"></i>
            Generate Full Schema Script
          </button>
        </div>

        <div v-if="script" class="mt-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <strong>Generated Script:</strong>
            <button class="btn btn-sm btn-outline-primary" @click="copyScript">
              <i class="bi bi-clipboard me-1"></i>
              Copy to Clipboard
            </button>
          </div>
          <div class="script-preview bg-dark text-light p-3 rounded" style="max-height: 400px; overflow-y: auto;">
            <pre class="mb-0"><code>{{ script }}</code></pre>
          </div>
          <div class="mt-2 small text-muted">
            <i class="bi bi-info-circle me-1"></i>
            Copy this script and run it in SQL Server Management Studio with DBA permissions.
          </div>
        </div>
      </div>
    </div>

    <!-- Instructions -->
    <div class="card">
      <div class="card-header">
        <i class="bi bi-info-circle me-2"></i>
        Instructions for DBA
      </div>
      <div class="card-body">
        <ol class="mb-0">
          <li class="mb-2">Click <strong>Refresh</strong> to see current schema status</li>
          <li class="mb-2">Click <strong>Generate Migration Script</strong> to create SQL for pending changes only</li>
          <li class="mb-2">Copy the script and run it in SSMS with <code>db_ddladmin</code> or higher permissions</li>
          <li class="mb-2">After running the script, click <strong>Refresh</strong> to verify all changes are applied</li>
        </ol>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'DatabaseSchemaTab',
  setup() {
    const api = useElectronAPI();
    const loading = ref(false);
    const generating = ref(false);
    const status = ref(null);
    const script = ref(null);

    async function checkStatus() {
      loading.value = true;
      try {
        const result = await api.schema.checkStatus();
        if (result.success) {
          status.value = result;
        } else {
          console.error('Error checking schema:', result.error);
        }
      } catch (error) {
        console.error('Error checking schema status:', error);
      } finally {
        loading.value = false;
      }
    }

    async function generateMigration() {
      generating.value = true;
      script.value = null;
      try {
        const result = await api.schema.generateMigration();
        if (result.success) {
          script.value = result.script;
        } else {
          console.error('Error generating migration:', result.error);
        }
      } catch (error) {
        console.error('Error generating migration script:', error);
      } finally {
        generating.value = false;
      }
    }

    async function generateFull() {
      generating.value = true;
      script.value = null;
      try {
        const systemDb = status.value?.systemDatabase || 'SYSTEMDB';
        const jobDb = status.value?.jobDatabase || 'JOBDB';
        const result = await api.schema.generateFull(systemDb, jobDb);
        script.value = result;
      } catch (error) {
        console.error('Error generating full script:', error);
      } finally {
        generating.value = false;
      }
    }

    function copyScript() {
      if (script.value) {
        navigator.clipboard.writeText(script.value);
        alert('Script copied to clipboard!');
      }
    }

    onMounted(() => {
      checkStatus();
    });

    return {
      loading,
      generating,
      status,
      script,
      checkStatus,
      generateMigration,
      generateFull,
      copyScript
    };
  }
};
</script>

<style scoped>
.database-schema-tab {
  max-width: 1000px;
}

.script-preview {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.script-preview pre {
  margin: 0;
  white-space: pre-wrap;
}
</style>
