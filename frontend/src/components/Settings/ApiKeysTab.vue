<template>
  <div class="api-keys-tab">
    <div class="row">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header bg-primary text-white">
            <h5 class="mb-0">
              <i class="bi bi-key me-2"></i>
              API Keys Configuration
            </h5>
          </div>
          <div class="card-body">
            <p class="text-muted mb-4">
              Configure API keys for external services. These keys are stored securely and used for address lookups, ABN validation, and other integrations.
            </p>

            <form @submit.prevent="saveApiKeys">
              <!-- Google Maps API Key -->
              <div class="mb-4">
                <label for="googleMapsApiKey" class="form-label fw-bold">
                  <i class="bi bi-geo-alt me-1"></i>
                  Google Maps API Key
                </label>
                <div class="input-group mb-2">
                  <input
                    id="googleMapsApiKey"
                    v-model="apiKeys.googleMapsApiKey"
                    :type="showGoogleKey ? 'text' : 'password'"
                    class="form-control"
                    placeholder="Enter your Google Maps API key"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showGoogleKey = !showGoogleKey"
                    :title="showGoogleKey ? 'Hide key' : 'Show key'"
                  >
                    <i :class="showGoogleKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <small class="text-muted">
                  <strong>Required for:</strong> Google Maps address autocomplete in supplier forms
                  <br />
                  <strong>Get your key:</strong>
                  <a href="#" @click.prevent="openLink('https://console.cloud.google.com/google/maps-apis')" class="text-primary">
                    Google Cloud Console
                  </a>
                  (Enable "Places API" and "Maps JavaScript API")
                </small>
              </div>

              <!-- ABN Lookup GUID -->
              <div class="mb-4">
                <label for="abnLookupGuid" class="form-label fw-bold">
                  <i class="bi bi-building me-1"></i>
                  ABN Lookup GUID
                </label>
                <div class="input-group mb-2">
                  <input
                    id="abnLookupGuid"
                    v-model="apiKeys.abnLookupGuid"
                    :type="showAbnKey ? 'text' : 'password'"
                    class="form-control"
                    placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showAbnKey = !showAbnKey"
                    :title="showAbnKey ? 'Hide key' : 'Show key'"
                  >
                    <i :class="showAbnKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <small class="text-muted">
                  <strong>Required for:</strong> Australian Business Number (ABN) lookup in supplier forms
                  <br />
                  <strong>Get your GUID:</strong>
                  <a href="#" @click.prevent="openLink('https://abr.business.gov.au/Tools/WebServices')" class="text-primary">
                    ABR Web Services Registration
                  </a>
                  (Free registration)
                </small>
              </div>

              <!-- Australia Post API Key -->
              <div class="mb-4">
                <label for="ausPostApiKey" class="form-label fw-bold">
                  <i class="bi bi-mailbox me-1"></i>
                  Australia Post API Key
                </label>
                <div class="input-group mb-2">
                  <input
                    id="ausPostApiKey"
                    v-model="apiKeys.ausPostApiKey"
                    :type="showAusPostKey ? 'text' : 'password'"
                    class="form-control"
                    placeholder="Enter your Australia Post API key"
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    @click="showAusPostKey = !showAusPostKey"
                    :title="showAusPostKey ? 'Hide key' : 'Show key'"
                  >
                    <i :class="showAusPostKey ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                  </button>
                </div>
                <small class="text-muted">
                  <strong>Required for:</strong> Australia Post address validation and standardization
                  <br />
                  <strong>Get your key:</strong>
                  <a href="#" @click.prevent="openLink('https://developers.auspost.com.au/')" class="text-primary">
                    Australia Post Developer Portal
                  </a>
                  (Register for Postcode & Suburb Search API)
                </small>
              </div>

              <!-- Action Buttons -->
              <div class="d-flex gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="saving"
                >
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-check-circle me-2"></i>
                  Save API Keys
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="resetApiKeys"
                  :disabled="saving"
                >
                  <i class="bi bi-arrow-counterclockwise me-2"></i>
                  Reset
                </button>
                <button
                  type="button"
                  class="btn btn-outline-info"
                  @click="testConnections"
                  :disabled="testing || !hasAnyKey"
                >
                  <span v-if="testing" class="spinner-border spinner-border-sm me-2"></span>
                  <i v-else class="bi bi-plug me-2"></i>
                  Test Connections
                </button>
              </div>
            </form>

            <!-- Success/Error Messages -->
            <div v-if="successMessage" class="alert alert-success mt-3" role="alert">
              <i class="bi bi-check-circle-fill me-2"></i>
              {{ successMessage }}
            </div>
            <div v-if="errorMessage" class="alert alert-danger mt-3" role="alert">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              {{ errorMessage }}
            </div>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="alert alert-info mt-3">
          <h6 class="alert-heading">
            <i class="bi bi-shield-lock me-2"></i>
            Security Notice
          </h6>
          <p class="mb-0 small">
            API keys are stored locally in encrypted format. Never share your API keys with others.
            If you believe a key has been compromised, regenerate it immediately from the provider's portal.
          </p>
        </div>
      </div>

      <!-- Help Sidebar -->
      <div class="col-lg-4">
        <div class="card">
          <div class="card-header bg-light">
            <h6 class="mb-0">
              <i class="bi bi-info-circle me-2"></i>
              API Key Usage
            </h6>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <h6 class="text-primary">
                <i class="bi bi-geo-alt me-1"></i>
                Google Maps
              </h6>
              <ul class="small mb-0">
                <li>Address autocomplete in forms</li>
                <li>Automatic address parsing</li>
                <li>Location suggestions</li>
              </ul>
            </div>

            <div class="mb-3">
              <h6 class="text-primary">
                <i class="bi bi-building me-1"></i>
                ABN Lookup
              </h6>
              <ul class="small mb-0">
                <li>Business name verification</li>
                <li>GST registration status</li>
                <li>Business address lookup</li>
              </ul>
            </div>

            <div class="mb-0">
              <h6 class="text-primary">
                <i class="bi bi-mailbox me-1"></i>
                Australia Post
              </h6>
              <ul class="small mb-0">
                <li>Address validation</li>
                <li>Postcode verification</li>
                <li>Address standardization</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Quick Links -->
        <div class="card mt-3">
          <div class="card-header bg-light">
            <h6 class="mb-0">
              <i class="bi bi-link-45deg me-2"></i>
              Quick Links
            </h6>
          </div>
          <div class="list-group list-group-flush">
            <a href="#" @click.prevent="openLink('https://console.cloud.google.com/google/maps-apis')" class="list-group-item list-group-item-action">
              <i class="bi bi-box-arrow-up-right me-2"></i>
              Google Cloud Console
            </a>
            <a href="#" @click.prevent="openLink('https://abr.business.gov.au/Tools/WebServices')" class="list-group-item list-group-item-action">
              <i class="bi bi-box-arrow-up-right me-2"></i>
              ABR Web Services
            </a>
            <a href="#" @click.prevent="openLink('https://developers.auspost.com.au/')" class="list-group-item list-group-item-action">
              <i class="bi bi-box-arrow-up-right me-2"></i>
              Australia Post Developers
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

const api = useElectronAPI();

// State
const apiKeys = ref({
  googleMapsApiKey: '',
  abnLookupGuid: '',
  ausPostApiKey: ''
});

const showGoogleKey = ref(false);
const showAbnKey = ref(false);
const showAusPostKey = ref(false);
const saving = ref(false);
const testing = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

// Computed
const hasAnyKey = computed(() => {
  return !!(apiKeys.value.googleMapsApiKey || apiKeys.value.abnLookupGuid || apiKeys.value.ausPostApiKey);
});

// Methods
async function loadApiKeys() {
  try {
    const keys = await api.settings.getApiKeys();
    if (keys) {
      apiKeys.value = {
        googleMapsApiKey: keys.googleMapsApiKey || '',
        abnLookupGuid: keys.abnLookupGuid || '',
        ausPostApiKey: keys.ausPostApiKey || ''
      };
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    errorMessage.value = 'Failed to load API keys';
  }
}

async function saveApiKeys() {
  saving.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    // Convert reactive object to plain object for IPC
    const plainKeys = {
      googleMapsApiKey: apiKeys.value.googleMapsApiKey || '',
      abnLookupGuid: apiKeys.value.abnLookupGuid || '',
      ausPostApiKey: apiKeys.value.ausPostApiKey || ''
    };

    await api.settings.updateApiKeys(plainKeys);
    successMessage.value = 'API keys saved successfully!';
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  } catch (error) {
    console.error('Error saving API keys:', error);
    errorMessage.value = 'Failed to save API keys: ' + error.message;
  } finally {
    saving.value = false;
  }
}

async function resetApiKeys() {
  if (confirm('Are you sure you want to reset all API keys? This will reload the current values from storage.')) {
    await loadApiKeys();
    successMessage.value = 'API keys reset to saved values';
    setTimeout(() => {
      successMessage.value = '';
    }, 3000);
  }
}

async function testConnections() {
  testing.value = true;
  successMessage.value = '';
  errorMessage.value = '';

  try {
    const results = [];

    // Test Google Maps (simple check if key exists)
    if (apiKeys.value.googleMapsApiKey) {
      results.push('✓ Google Maps API key configured');
    }

    // Test ABN Lookup (simple check if GUID exists and has correct format)
    if (apiKeys.value.abnLookupGuid) {
      const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (guidPattern.test(apiKeys.value.abnLookupGuid)) {
        results.push('✓ ABN Lookup GUID configured (format valid)');
      } else {
        results.push('⚠ ABN Lookup GUID format appears invalid');
      }
    }

    // Test Australia Post (simple check if key exists)
    if (apiKeys.value.ausPostApiKey) {
      results.push('✓ Australia Post API key configured');
    }

    if (results.length > 0) {
      successMessage.value = results.join('\n');
    } else {
      errorMessage.value = 'No API keys configured';
    }
  } catch (error) {
    console.error('Error testing connections:', error);
    errorMessage.value = 'Error testing connections: ' + error.message;
  } finally {
    testing.value = false;
  }
}

function openLink(url) {
  window.open(url, '_blank');
}

// Load on mount
onMounted(() => {
  loadApiKeys();
});
</script>

<style scoped>
.api-keys-tab {
  max-width: 1400px;
}

.alert {
  white-space: pre-line;
}
</style>
