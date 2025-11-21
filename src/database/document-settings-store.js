const Store = require('electron-store');
const path = require('path');
const fs = require('fs');

const store = new Store({
  name: 'document-settings',
  defaults: {
    // Base path for document storage (e.g., G:\Shared drives\DBx BOQ\)
    basePath: '',
    // Folder structure within base path
    folderStructure: {
      jobs: 'Jobs',
      suppliers: 'Suppliers',
      contacts: 'Contacts',
      customers: 'Customers',
      communications: 'Communications'
    },
    // Document type subfolders
    documentTypes: {
      quotes: 'Quotes',
      orders: 'Orders',
      invoices: 'Invoices',
      emails: 'Emails',
      photos: 'Photos',
      drawings: 'Drawings',
      contracts: 'Contracts',
      other: 'Other'
    },
    // Auto-create folders when adding documents
    autoCreateFolders: true,
    // Open files with default system application
    openWithSystemApp: true,
    // Cloud sync settings
    cloudSync: {
      enabled: false,
      provider: 'google-drive', // google-drive, onedrive, dropbox
      syncOnSave: true
    }
  }
});

/**
 * Get all document settings
 */
function getSettings() {
  return {
    basePath: store.get('basePath'),
    folderStructure: store.get('folderStructure'),
    documentTypes: store.get('documentTypes'),
    autoCreateFolders: store.get('autoCreateFolders'),
    openWithSystemApp: store.get('openWithSystemApp'),
    cloudSync: store.get('cloudSync')
  };
}

/**
 * Save all document settings
 */
function saveSettings(settings) {
  if (settings.basePath !== undefined) store.set('basePath', settings.basePath);
  if (settings.folderStructure) store.set('folderStructure', settings.folderStructure);
  if (settings.documentTypes) store.set('documentTypes', settings.documentTypes);
  if (settings.autoCreateFolders !== undefined) store.set('autoCreateFolders', settings.autoCreateFolders);
  if (settings.openWithSystemApp !== undefined) store.set('openWithSystemApp', settings.openWithSystemApp);
  if (settings.cloudSync) store.set('cloudSync', settings.cloudSync);
  return getSettings();
}

/**
 * Get the base path
 */
function getBasePath() {
  return store.get('basePath');
}

/**
 * Set the base path
 */
function setBasePath(basePath) {
  store.set('basePath', basePath);
  return basePath;
}

/**
 * Check if base path is configured and exists
 */
function isConfigured() {
  const basePath = store.get('basePath');
  if (!basePath) return false;

  try {
    return fs.existsSync(basePath);
  } catch {
    return false;
  }
}

/**
 * Build a relative path for an entity and document type
 * e.g., Jobs/1234/Quotes/
 */
function buildRelativePath(entityType, entityCode, documentType) {
  const folderStructure = store.get('folderStructure');
  const documentTypes = store.get('documentTypes');

  const entityFolder = folderStructure[entityType.toLowerCase()] || entityType;
  const typeFolder = documentTypes[documentType.toLowerCase()] || documentType;

  return path.join(entityFolder, String(entityCode), typeFolder);
}

/**
 * Build a full path combining base path and relative path
 */
function buildFullPath(relativePath) {
  const basePath = store.get('basePath');
  if (!basePath) return null;

  return path.join(basePath, relativePath);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
function ensureDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log('Created directory:', dirPath);
    }
    return true;
  } catch (error) {
    console.error('Error creating directory:', error);
    return false;
  }
}

/**
 * Ensure entity folder structure exists
 */
function ensureEntityFolder(entityType, entityCode, documentType) {
  const autoCreate = store.get('autoCreateFolders');
  if (!autoCreate) return true;

  const relativePath = buildRelativePath(entityType, entityCode, documentType);
  const fullPath = buildFullPath(relativePath);

  if (!fullPath) return false;

  return ensureDirectory(fullPath);
}

/**
 * Get the full path for a document
 */
function getDocumentFullPath(relativePath) {
  return buildFullPath(relativePath);
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
  store.clear();
  return getSettings();
}

/**
 * Validate a path exists and is accessible
 */
function validatePath(pathToCheck) {
  try {
    if (!pathToCheck) return { valid: false, error: 'Path is empty' };

    if (!fs.existsSync(pathToCheck)) {
      return { valid: false, error: 'Path does not exist' };
    }

    const stats = fs.statSync(pathToCheck);
    if (!stats.isDirectory()) {
      return { valid: false, error: 'Path is not a directory' };
    }

    // Try to access the directory
    fs.accessSync(pathToCheck, fs.constants.R_OK | fs.constants.W_OK);

    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * List files in a directory
 */
function listFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist', files: [] };
    }

    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    const fileList = files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(dirPath, file.name)
    }));

    return { success: true, files: fileList };
  } catch (error) {
    return { success: false, error: error.message, files: [] };
  }
}

module.exports = {
  getSettings,
  saveSettings,
  getBasePath,
  setBasePath,
  isConfigured,
  buildRelativePath,
  buildFullPath,
  ensureDirectory,
  ensureEntityFolder,
  getDocumentFullPath,
  resetSettings,
  validatePath,
  listFiles
};
