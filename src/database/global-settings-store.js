const Store = require('electron-store');
const crypto = require('crypto');

// Global settings store for multi-company and user management
const store = new Store({
  name: 'global-settings',
  defaults: {
    companies: [],
    users: [],
    currentCompanyId: null,
    currentUserId: null,
    applicationDefaults: {
      defaultPriceLevel: 1,
      defaultCostCentre: '',
      defaultUnit: '',
      currencySymbol: '$',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      showArchivedByDefault: false,
      defaultTab: 'jobs'
    },
    importExportSettings: {
      csvDelimiter: ',',
      autoBackupBeforeImport: true,
      exportFileNaming: '{type}_{date}',
      defaultTemplate: ''
    },
    pdfSettings: {
      pageSize: 'A4',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      showLogo: true,
      showWatermark: false,
      watermarkText: 'DRAFT'
    },
    uiPreferences: {
      gridRowHeight: 'normal',
      fontSize: 'medium',
      defaultStartupTab: 'jobs',
      confirmDialogs: true
    }
  }
});

/**
 * Encrypt password using AES-256
 */
function encryptPassword(password) {
  if (!password) return null;
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync('dbx-boq-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt password
 */
function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return null;
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('dbx-boq-secret-key', 'salt', 32);
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    return null;
  }
}

// ============================================================
// Company Management
// ============================================================

/**
 * Get all companies
 */
function getCompanies() {
  return store.get('companies', []);
}

/**
 * Get a specific company by ID
 */
function getCompany(id) {
  const companies = store.get('companies', []);
  return companies.find(c => c.id === id);
}

/**
 * Get current active company
 */
function getCurrentCompany() {
  const currentId = store.get('currentCompanyId');
  if (!currentId) return null;
  return getCompany(currentId);
}

/**
 * Add or update a company
 */
function saveCompany(company) {
  const companies = store.get('companies', []);

  // Generate ID if new company
  if (!company.id) {
    company.id = Date.now().toString();
    company.createdAt = new Date().toISOString();
  }

  company.updatedAt = new Date().toISOString();

  // Check if company exists
  const existingIndex = companies.findIndex(c => c.id === company.id);

  if (existingIndex >= 0) {
    companies[existingIndex] = company;
  } else {
    companies.push(company);
  }

  store.set('companies', companies);

  // If this is the first company, set it as current
  if (companies.length === 1) {
    store.set('currentCompanyId', company.id);
  }

  return company;
}

/**
 * Delete a company
 */
function deleteCompany(id) {
  const companies = store.get('companies', []);
  const filtered = companies.filter(c => c.id !== id);
  store.set('companies', filtered);

  // If deleted company was current, switch to first available
  if (store.get('currentCompanyId') === id) {
    store.set('currentCompanyId', filtered.length > 0 ? filtered[0].id : null);
  }

  return { success: true };
}

/**
 * Switch active company
 */
function switchCompany(id) {
  const company = getCompany(id);
  if (!company) {
    throw new Error('Company not found');
  }
  store.set('currentCompanyId', id);
  return company;
}

// ============================================================
// User Management
// ============================================================

/**
 * Get all users
 */
function getUsers() {
  return store.get('users', []);
}

/**
 * Get a specific user by ID
 */
function getUser(id) {
  const users = store.get('users', []);
  return users.find(u => u.id === id);
}

/**
 * Get current logged-in user
 */
function getCurrentUser() {
  const currentId = store.get('currentUserId');
  if (!currentId) return null;
  return getUser(currentId);
}

/**
 * Add or update a user
 */
function saveUser(user) {
  const users = store.get('users', []);

  // Generate ID if new user
  if (!user.id) {
    user.id = Date.now().toString();
    user.createdAt = new Date().toISOString();
  }

  user.updatedAt = new Date().toISOString();

  // Encrypt password if provided
  if (user.password) {
    user.encryptedPassword = encryptPassword(user.password);
    delete user.password; // Don't store plain password
  }

  // Check if user exists
  const existingIndex = users.findIndex(u => u.id === user.id);

  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }

  store.set('users', users);
  return user;
}

/**
 * Delete a user
 */
function deleteUser(id) {
  const users = store.get('users', []);
  const filtered = users.filter(u => u.id !== id);
  store.set('users', filtered);

  // If deleted user was current, logout
  if (store.get('currentUserId') === id) {
    store.set('currentUserId', null);
  }

  return { success: true };
}

/**
 * Login user (verify credentials)
 */
function loginUser(username, password) {
  const users = store.get('users', []);
  const user = users.find(u => u.username === username && u.active);

  if (!user) {
    throw new Error('User not found or inactive');
  }

  // If user has password, verify it
  if (user.encryptedPassword) {
    const decrypted = decryptPassword(user.encryptedPassword);
    if (decrypted !== password) {
      throw new Error('Invalid password');
    }
  }

  store.set('currentUserId', user.id);
  return user;
}

/**
 * Logout current user
 */
function logoutUser() {
  store.set('currentUserId', null);
  return { success: true };
}

// ============================================================
// Application Settings
// ============================================================

/**
 * Get application defaults
 */
function getApplicationDefaults() {
  return store.get('applicationDefaults', {});
}

/**
 * Update application defaults
 */
function updateApplicationDefaults(defaults) {
  const current = store.get('applicationDefaults', {});
  const updated = { ...current, ...defaults };
  store.set('applicationDefaults', updated);
  return updated;
}

/**
 * Get import/export settings
 */
function getImportExportSettings() {
  return store.get('importExportSettings', {});
}

/**
 * Update import/export settings
 */
function updateImportExportSettings(settings) {
  const current = store.get('importExportSettings', {});
  const updated = { ...current, ...settings };
  store.set('importExportSettings', updated);
  return updated;
}

/**
 * Get PDF settings
 */
function getPdfSettings() {
  return store.get('pdfSettings', {});
}

/**
 * Update PDF settings
 */
function updatePdfSettings(settings) {
  const current = store.get('pdfSettings', {});
  const updated = { ...current, ...settings };
  store.set('pdfSettings', updated);
  return updated;
}

/**
 * Get UI preferences
 */
function getUiPreferences() {
  return store.get('uiPreferences', {});
}

/**
 * Update UI preferences
 */
function updateUiPreferences(preferences) {
  const current = store.get('uiPreferences', {});
  const updated = { ...current, ...preferences };
  store.set('uiPreferences', updated);
  return updated;
}

/**
 * Get all settings
 */
function getAllSettings() {
  return {
    companies: getCompanies(),
    users: getUsers().map(u => ({ ...u, encryptedPassword: undefined })), // Don't expose encrypted passwords
    currentCompanyId: store.get('currentCompanyId'),
    currentUserId: store.get('currentUserId'),
    currentCompany: getCurrentCompany(),
    currentUser: getCurrentUser(),
    applicationDefaults: getApplicationDefaults(),
    importExportSettings: getImportExportSettings(),
    pdfSettings: getPdfSettings(),
    uiPreferences: getUiPreferences()
  };
}

/**
 * Reset all settings to defaults
 */
function resetAllSettings() {
  store.clear();
  return getAllSettings();
}

module.exports = {
  // Company management
  getCompanies,
  getCompany,
  getCurrentCompany,
  saveCompany,
  deleteCompany,
  switchCompany,

  // User management
  getUsers,
  getUser,
  getCurrentUser,
  saveUser,
  deleteUser,
  loginUser,
  logoutUser,

  // Application settings
  getApplicationDefaults,
  updateApplicationDefaults,
  getImportExportSettings,
  updateImportExportSettings,
  getPdfSettings,
  updatePdfSettings,
  getUiPreferences,
  updateUiPreferences,
  getAllSettings,
  resetAllSettings
};
