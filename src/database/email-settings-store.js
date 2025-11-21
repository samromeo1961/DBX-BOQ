/**
 * Email Settings Store
 * Persists email/SMTP configuration for sending purchase orders
 */

const Store = require('electron-store');

const emailSettingsStore = new Store({
  name: 'email-settings',
  defaults: {
    // SMTP Configuration
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false, // true for 465, false for other ports
    smtpUser: '',
    smtpPassword: '', // Encrypted by electron-store

    // Email Defaults
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

    // Test Mode
    testMode: false,
    testEmail: 'sabromeo@gmail.com'
  },
  encryptionKey: 'dbx-boq-email-config'
});

/**
 * Get all email settings
 */
function getEmailSettings() {
  return emailSettingsStore.store;
}

/**
 * Save email settings
 */
function saveEmailSettings(settings) {
  Object.keys(settings).forEach(key => {
    emailSettingsStore.set(key, settings[key]);
  });
}

/**
 * Update a single email setting
 */
function updateEmailSetting(key, value) {
  emailSettingsStore.set(key, value);
}

/**
 * Reset email settings to defaults
 */
function resetEmailSettings() {
  emailSettingsStore.clear();
}

/**
 * Get SMTP configuration object for nodemailer
 */
function getSMTPConfig() {
  const settings = getEmailSettings();

  return {
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword
    }
  };
}

/**
 * Check if email is configured
 */
function isEmailConfigured() {
  const settings = getEmailSettings();
  return !!(settings.smtpHost && settings.smtpUser && settings.smtpPassword);
}

module.exports = {
  getEmailSettings,
  saveEmailSettings,
  updateEmailSetting,
  resetEmailSettings,
  getSMTPConfig,
  isEmailConfigured
};
