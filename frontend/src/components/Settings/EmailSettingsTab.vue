<template>
  <div class="email-settings-tab">
    <div class="card">
      <div class="card-header">
        <h5 class="mb-0">
          <i class="bi bi-envelope-at me-2"></i>
          Email / SMTP Configuration
        </h5>
      </div>
      <div class="card-body">
        <p class="text-muted mb-4">
          Configure SMTP settings for sending purchase orders via email.
        </p>

        <!-- Test Mode -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="alert alert-info">
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="testMode"
                  v-model="settings.testMode"
                />
                <label class="form-check-label" for="testMode">
                  <strong>Test Mode</strong> - Send all emails to test address instead of suppliers
                </label>
              </div>
              <div v-if="settings.testMode" class="mt-2">
                <label for="testEmail" class="form-label small">Test Email Address</label>
                <input
                  type="email"
                  class="form-control form-control-sm"
                  id="testEmail"
                  v-model="settings.testEmail"
                  placeholder="test@example.com"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- SMTP Provider Presets -->
        <div class="row mb-3">
          <div class="col-12">
            <label class="form-label">Email Provider Preset</label>
            <div class="btn-group w-100" role="group">
              <button
                type="button"
                class="btn btn-outline-primary"
                :class="{ active: selectedProvider === 'gmail' }"
                @click="applyProviderPreset('gmail')"
              >
                <i class="bi bi-google"></i> Gmail
              </button>
              <button
                type="button"
                class="btn btn-outline-primary"
                :class="{ active: selectedProvider === 'outlook' }"
                @click="applyProviderPreset('outlook')"
              >
                <i class="bi bi-microsoft"></i> Outlook / Office 365
              </button>
              <button
                type="button"
                class="btn btn-outline-primary"
                :class="{ active: selectedProvider === 'yahoo' }"
                @click="applyProviderPreset('yahoo')"
              >
                <i class="bi bi-envelope"></i> Yahoo
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                :class="{ active: selectedProvider === 'custom' }"
                @click="applyProviderPreset('custom')"
              >
                <i class="bi bi-gear"></i> Custom
              </button>
            </div>
          </div>
        </div>

        <!-- SMTP Configuration -->
        <div class="row mb-3">
          <div class="col-md-8">
            <label for="smtpHost" class="form-label">SMTP Server *</label>
            <input
              type="text"
              class="form-control"
              id="smtpHost"
              v-model="settings.smtpHost"
              placeholder="smtp.gmail.com"
              required
              :disabled="selectedProvider !== 'custom'"
            />
            <small class="text-muted">e.g., smtp.gmail.com, smtp.office365.com</small>
          </div>
          <div class="col-md-4">
            <label for="smtpPort" class="form-label">Port *</label>
            <input
              type="number"
              class="form-control"
              id="smtpPort"
              v-model.number="settings.smtpPort"
              placeholder="587"
              required
              :disabled="selectedProvider !== 'custom'"
            />
            <small class="text-muted">Usually 587 or 465</small>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-12">
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                id="smtpSecure"
                v-model="settings.smtpSecure"
                :disabled="selectedProvider !== 'custom'"
              />
              <label class="form-check-label" for="smtpSecure">
                Use SSL/TLS (port 465)
              </label>
            </div>
            <small class="text-muted">Uncheck for STARTTLS (port 587)</small>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-md-6">
            <label for="smtpUser" class="form-label">SMTP Username *</label>
            <input
              type="text"
              class="form-control"
              id="smtpUser"
              v-model="settings.smtpUser"
              placeholder="your-email@gmail.com"
              required
            />
          </div>
          <div class="col-md-6">
            <label for="smtpPassword" class="form-label">SMTP Password *</label>
            <input
              type="password"
              class="form-control"
              id="smtpPassword"
              v-model="settings.smtpPassword"
              placeholder="••••••••"
              required
            />
            <small class="text-muted">For Gmail, use an App Password</small>
          </div>
        </div>

        <hr class="my-4" />

        <!-- Email Defaults -->
        <h6 class="mb-3">Email Defaults</h6>

        <div class="row mb-3">
          <div class="col-md-6">
            <label for="emailFrom" class="form-label">From Email Address</label>
            <input
              type="email"
              class="form-control"
              id="emailFrom"
              v-model="settings.emailFrom"
              placeholder="orders@company.com"
            />
          </div>
          <div class="col-md-6">
            <label for="emailFromName" class="form-label">From Name</label>
            <input
              type="text"
              class="form-control"
              id="emailFromName"
              v-model="settings.emailFromName"
              placeholder="Company Name"
            />
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-12">
            <label for="emailCC" class="form-label">CC Email Address(es)</label>
            <input
              type="text"
              class="form-control"
              id="emailCC"
              v-model="settings.emailCC"
              placeholder="manager@company.com (comma-separated for multiple)"
            />
            <small class="text-muted">Optional - leave empty if not needed</small>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-12">
            <label for="emailSubject" class="form-label">Email Subject Template</label>
            <input
              type="text"
              class="form-control"
              id="emailSubject"
              v-model="settings.emailSubject"
              placeholder="Purchase Order {{OrderNumber}}"
            />
            <small class="text-muted">Available variables: {{OrderNumber}}, {{JobName}}, {{JobNo}}</small>
          </div>
        </div>

        <div class="row mb-3">
          <div class="col-12">
            <label for="emailBody" class="form-label">Email Body Template</label>
            <textarea
              class="form-control font-monospace"
              id="emailBody"
              v-model="settings.emailBody"
              rows="8"
              placeholder="Email body..."
            ></textarea>
            <small class="text-muted">Available variables: {{SupplierName}}, {{OrderNumber}}, {{JobName}}, {{JobNo}}, {{CostCentreName}}</small>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="d-flex gap-2 mt-4">
          <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
            <i class="bi bi-save me-1"></i>
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>
          <button class="btn btn-success" @click="testConnection" :disabled="testing || !isConfigured">
            <i class="bi bi-envelope-check me-1"></i>
            {{ testing ? 'Testing...' : 'Test Email' }}
          </button>
          <button class="btn btn-outline-secondary" @click="resetSettings">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            Reset to Defaults
          </button>
        </div>

        <!-- Status Messages -->
        <div v-if="successMessage" class="alert alert-success mt-3">
          {{ successMessage }}
        </div>
        <div v-if="errorMessage" class="alert alert-danger mt-3">
          {{ errorMessage }}
        </div>
      </div>
    </div>

    <!-- Provider Setup Help -->
    <div class="card mt-3">
      <div class="card-header">
        <h6 class="mb-0">
          <i class="bi bi-info-circle me-2"></i>
          Email Provider Setup Instructions
        </h6>
      </div>
      <div class="card-body">
        <!-- Nav tabs -->
        <ul class="nav nav-tabs mb-3">
          <li class="nav-item">
            <a class="nav-link" :class="{ active: helpTab === 'gmail' }" href="javascript:void(0)" @click="helpTab = 'gmail'">
              <i class="bi bi-google"></i> Gmail
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" :class="{ active: helpTab === 'outlook' }" href="javascript:void(0)" @click="helpTab = 'outlook'">
              <i class="bi bi-microsoft"></i> Outlook / Office 365
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" :class="{ active: helpTab === 'yahoo' }" href="javascript:void(0)" @click="helpTab = 'yahoo'">
              <i class="bi bi-envelope"></i> Yahoo
            </a>
          </li>
        </ul>

        <!-- Gmail Instructions -->
        <div v-show="helpTab === 'gmail'">
          <h6>Gmail App Password Setup</h6>
          <ol class="mb-0">
            <li>Go to your <a href="https://myaccount.google.com" target="_blank">Google Account settings</a></li>
            <li>Enable 2-Step Verification if not already enabled</li>
            <li>Go to Security → 2-Step Verification → App passwords</li>
            <li>Select "Mail" and your device, then click "Generate"</li>
            <li>Use the generated 16-character password in the SMTP Password field above</li>
          </ol>
          <div class="alert alert-info mt-3 mb-0">
            <i class="bi bi-lightbulb"></i> <strong>Note:</strong> You must use an App Password, not your regular Gmail password.
          </div>
        </div>

        <!-- Outlook Instructions -->
        <div v-show="helpTab === 'outlook'">
          <h6>Microsoft Outlook / Office 365 Setup</h6>
          <p>For <strong>personal Outlook.com accounts</strong>:</p>
          <ol>
            <li>Go to <a href="https://account.microsoft.com/security" target="_blank">Microsoft Account Security</a></li>
            <li>Enable Two-step verification if not already enabled</li>
            <li>Go to "Advanced security options" → App passwords</li>
            <li>Create a new app password and use it in the SMTP Password field</li>
          </ol>
          <p class="mt-3">For <strong>Office 365 / Work accounts</strong>:</p>
          <ol>
            <li>Your organization may require specific authentication methods</li>
            <li>Contact your IT administrator for SMTP credentials</li>
            <li>Some organizations disable SMTP AUTH - check with IT</li>
            <li>Use your work email as both username and From address</li>
          </ol>
          <div class="alert alert-warning mt-3 mb-0">
            <i class="bi bi-exclamation-triangle"></i> <strong>Important:</strong> Microsoft is phasing out basic SMTP authentication. If you encounter issues, your organization may require OAuth 2.0 or a different method.
          </div>
        </div>

        <!-- Yahoo Instructions -->
        <div v-show="helpTab === 'yahoo'">
          <h6>Yahoo Mail App Password Setup</h6>
          <ol class="mb-0">
            <li>Go to your <a href="https://login.yahoo.com/myaccount/security" target="_blank">Yahoo Account Security</a></li>
            <li>Enable Two-step verification</li>
            <li>Click "Generate app password"</li>
            <li>Select "Other App" and enter "DBx BOQ"</li>
            <li>Use the generated password in the SMTP Password field</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useElectronAPI } from '../../composables/useElectronAPI';

export default {
  name: 'EmailSettingsTab',
  setup() {
    const api = useElectronAPI();

    // Provider presets
    const providerPresets = {
      gmail: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpSecure: false
      },
      outlook: {
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: false
      },
      yahoo: {
        smtpHost: 'smtp.mail.yahoo.com',
        smtpPort: 587,
        smtpSecure: false
      }
    };

    const settings = ref({
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: '',
      smtpPassword: '',
      emailFrom: '',
      emailFromName: '',
      emailCC: '',
      emailSubject: 'Purchase Order {{OrderNumber}}',
      emailBody: `Dear {{SupplierName}},

Please find attached Purchase Order {{OrderNumber}}.

Job: {{JobName}} ({{JobNo}})
Cost Centre: {{CostCentreName}}

Please confirm receipt and provide delivery timeframe.

Regards`,
      testMode: false,
      testEmail: 'sabromeo@gmail.com'
    });

    const selectedProvider = ref('gmail');
    const helpTab = ref('gmail');
    const saving = ref(false);
    const testing = ref(false);
    const successMessage = ref('');
    const errorMessage = ref('');

    // Detect provider from current settings
    const detectProvider = () => {
      const host = settings.value.smtpHost.toLowerCase();
      if (host.includes('gmail')) return 'gmail';
      if (host.includes('office365') || host.includes('outlook')) return 'outlook';
      if (host.includes('yahoo')) return 'yahoo';
      return 'custom';
    };

    // Apply provider preset
    const applyProviderPreset = (provider) => {
      selectedProvider.value = provider;
      helpTab.value = provider === 'custom' ? 'gmail' : provider;

      if (provider !== 'custom' && providerPresets[provider]) {
        const preset = providerPresets[provider];
        settings.value.smtpHost = preset.smtpHost;
        settings.value.smtpPort = preset.smtpPort;
        settings.value.smtpSecure = preset.smtpSecure;
      }
    };

    const isConfigured = computed(() => {
      return settings.value.smtpHost &&
             settings.value.smtpUser &&
             settings.value.smtpPassword;
    });

    const loadSettings = async () => {
      try {
        const result = await api.emailSettings.get();
        if (result) {
          Object.assign(settings.value, result);
          // Detect provider from loaded settings
          selectedProvider.value = detectProvider();
          helpTab.value = selectedProvider.value === 'custom' ? 'gmail' : selectedProvider.value;
        }
      } catch (error) {
        console.error('Failed to load email settings:', error);
      }
    };

    const saveSettings = async () => {
      saving.value = true;
      successMessage.value = '';
      errorMessage.value = '';

      try {
        // Convert reactive object to plain object for IPC
        const plainSettings = {
          smtpHost: settings.value.smtpHost,
          smtpPort: settings.value.smtpPort,
          smtpSecure: settings.value.smtpSecure,
          smtpUser: settings.value.smtpUser,
          smtpPassword: settings.value.smtpPassword,
          emailFrom: settings.value.emailFrom,
          emailFromName: settings.value.emailFromName,
          emailCC: settings.value.emailCC,
          emailSubject: settings.value.emailSubject,
          emailBody: settings.value.emailBody,
          testMode: settings.value.testMode,
          testEmail: settings.value.testEmail
        };

        await api.emailSettings.save(plainSettings);
        successMessage.value = 'Email settings saved successfully!';
        setTimeout(() => {
          successMessage.value = '';
        }, 3000);
      } catch (error) {
        errorMessage.value = 'Failed to save settings: ' + error.message;
      } finally {
        saving.value = false;
      }
    };

    const testConnection = async () => {
      testing.value = true;
      successMessage.value = '';
      errorMessage.value = '';

      try {
        const testEmail = settings.value.testMode ? settings.value.testEmail : settings.value.smtpUser;

        // Convert reactive object to plain object for IPC
        const plainSettings = {
          smtpHost: settings.value.smtpHost,
          smtpPort: settings.value.smtpPort,
          smtpSecure: settings.value.smtpSecure,
          smtpUser: settings.value.smtpUser,
          smtpPassword: settings.value.smtpPassword,
          emailFrom: settings.value.emailFrom,
          emailFromName: settings.value.emailFromName,
          emailCC: settings.value.emailCC,
          emailSubject: settings.value.emailSubject,
          emailBody: settings.value.emailBody,
          testMode: settings.value.testMode,
          testEmail: settings.value.testEmail
        };

        // Send test email using the backend
        const result = await api.email.sendTest(testEmail, plainSettings);

        if (result.success) {
          successMessage.value = `Test email sent successfully to ${result.to}! Check your inbox.`;
        } else {
          errorMessage.value = 'Test failed: ' + result.error;
        }
      } catch (error) {
        errorMessage.value = 'Test failed: ' + error.message;
      } finally {
        testing.value = false;
      }
    };

    const resetSettings = async () => {
      if (confirm('Reset email settings to defaults? This will clear all SMTP configuration.')) {
        try {
          await api.emailSettings.reset();
          await loadSettings();
          successMessage.value = 'Settings reset to defaults.';
        } catch (error) {
          errorMessage.value = 'Failed to reset settings: ' + error.message;
        }
      }
    };

    onMounted(() => {
      loadSettings();
    });

    return {
      settings,
      selectedProvider,
      helpTab,
      saving,
      testing,
      successMessage,
      errorMessage,
      isConfigured,
      applyProviderPreset,
      saveSettings,
      testConnection,
      resetSettings
    };
  }
};
</script>

<style scoped>
.email-settings-tab {
  max-width: 900px;
}

.font-monospace {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}
</style>
