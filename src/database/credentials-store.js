const Store = require('electron-store');

/**
 * Credentials Store - Secure storage for database credentials
 */

const credentialsStore = new Store({
  name: 'credentials',
  encryptionKey: 'dbx-boq-encryption-key'
});

/**
 * Save database credentials
 * @param {Object} credentials - Database credentials
 */
function saveCredentials(credentials) {
  credentialsStore.set('dbConfig', credentials);
}

/**
 * Get saved database credentials
 * @returns {Object|null} Database credentials or null
 */
function getCredentials() {
  return credentialsStore.get('dbConfig');
}

/**
 * Clear saved credentials
 */
function clearCredentials() {
  credentialsStore.delete('dbConfig');
}

/**
 * Check if credentials exist
 * @returns {boolean} True if credentials are saved
 */
function hasCredentials() {
  return credentialsStore.has('dbConfig');
}

module.exports = {
  saveCredentials,
  getCredentials,
  clearCredentials,
  hasCredentials
};
