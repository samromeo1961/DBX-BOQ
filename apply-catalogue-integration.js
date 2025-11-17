#!/usr/bin/env node
/**
 * Automated Catalogue Enhancements Integration Script
 *
 * This script automatically applies all necessary code changes for:
 * 1. Supplier Pricing
 * 2. Templates (Workup)
 * 3. Specifications
 *
 * IMPORTANT: Stop the Electron application before running this script!
 *
 * Usage: node apply-catalogue-integration.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Check if file is locked (app is running)
function checkFileLock(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r+');
    fs.closeSync(fd);
    return false; // Not locked
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      return true; // Locked
    }
    return false;
  }
}

// Backup file
function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

// Apply changes to main.js
function updateMainJs() {
  info('Updating main.js...');

  const mainJsPath = path.join(__dirname, 'main.js');

  if (checkFileLock(mainJsPath)) {
    error('main.js is locked. Please stop the Electron application first!');
    return false;
  }

  try {
    // Backup
    const backupPath = backupFile(mainJsPath);
    success(`Created backup: ${backupPath}`);

    let content = fs.readFileSync(mainJsPath, 'utf8');

    // 1. Add imports
    const importToFind = `const catalogueHandlers = require('./src/ipc-handlers/catalogue');`;
    const importToAdd = `const catalogueHandlers = require('./src/ipc-handlers/catalogue');
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
const catalogueTemplatesHandlers = require('./src/ipc-handlers/catalogue-templates');`;

    if (content.includes('supplier-prices')) {
      warning('Supplier prices import already exists, skipping...');
    } else {
      content = content.replace(importToFind, importToAdd);
      success('Added handler imports');
    }

    // 2. Add IPC handlers after catalogue handlers
    const handlersMarker = `ipcMain.handle('catalogue:delete-recipe-component', (event, mainItem, subItem) => catalogueHandlers.deleteRecipeComponent(mainItem, subItem));`;

    const handlersToAdd = `ipcMain.handle('catalogue:delete-recipe-component', (event, mainItem, subItem) => catalogueHandlers.deleteRecipeComponent(mainItem, subItem));

// ============================================================
// Supplier Prices IPC Handlers
// ============================================================
ipcMain.handle('supplier-prices:get', (event, itemCode) => supplierPricesHandlers.getSupplierPrices(itemCode));
ipcMain.handle('supplier-prices:add', (event, priceData) => supplierPricesHandlers.addSupplierPrice(priceData));
ipcMain.handle('supplier-prices:update', (event, priceData) => supplierPricesHandlers.updateSupplierPrice(priceData));
ipcMain.handle('supplier-prices:delete', (event, itemCode, supplier, reference) => supplierPricesHandlers.deleteSupplierPrice(itemCode, supplier, reference));
ipcMain.handle('supplier-prices:get-suppliers', () => supplierPricesHandlers.getSuppliers());

// ============================================================
// Catalogue Templates & Specifications IPC Handlers
// ============================================================
ipcMain.handle('catalogue-templates:get-template', (event, priceCode) => catalogueTemplatesHandlers.getTemplate(priceCode));
ipcMain.handle('catalogue-templates:update-template', (event, data) => catalogueTemplatesHandlers.updateTemplate(data));
ipcMain.handle('catalogue-templates:get-specification', (event, priceCode) => catalogueTemplatesHandlers.getSpecification(priceCode));
ipcMain.handle('catalogue-templates:update-specification', (event, data) => catalogueTemplatesHandlers.updateSpecification(data));`;

    if (content.includes('supplier-prices:get')) {
      warning('Supplier prices handlers already exist, skipping...');
    } else {
      content = content.replace(handlersMarker, handlersToAdd);
      success('Added IPC handlers');
    }

    fs.writeFileSync(mainJsPath, content, 'utf8');
    success('main.js updated successfully!');
    return true;

  } catch (err) {
    error(`Failed to update main.js: ${err.message}`);
    return false;
  }
}

// Apply changes to preload.js
function updatePreloadJs() {
  info('Updating preload.js...');

  const preloadJsPath = path.join(__dirname, 'preload.js');

  if (checkFileLock(preloadJsPath)) {
    error('preload.js is locked. Please stop the Electron application first!');
    return false;
  }

  try {
    // Backup
    const backupPath = backupFile(preloadJsPath);
    success(`Created backup: ${backupPath}`);

    let content = fs.readFileSync(preloadJsPath, 'utf8');

    // Find the catalogue section and add after it
    const catalogueMarker = `deleteRecipeComponent: (mainItem, subItem) => ipcRenderer.invoke('catalogue:delete-recipe-component', mainItem, subItem)
    },`;

    const apiToAdd = `deleteRecipeComponent: (mainItem, subItem) => ipcRenderer.invoke('catalogue:delete-recipe-component', mainItem, subItem)
    },

    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => ipcRenderer.invoke('supplier-prices:get', itemCode),
      add: (priceData) => ipcRenderer.invoke('supplier-prices:add', priceData),
      update: (priceData) => ipcRenderer.invoke('supplier-prices:update', priceData),
      delete: (itemCode, supplier, reference) => ipcRenderer.invoke('supplier-prices:delete', itemCode, supplier, reference),
      getSuppliers: () => ipcRenderer.invoke('supplier-prices:get-suppliers')
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) => ipcRenderer.invoke('catalogue-templates:get-template', priceCode),
      updateTemplate: (data) => ipcRenderer.invoke('catalogue-templates:update-template', data),
      getSpecification: (priceCode) => ipcRenderer.invoke('catalogue-templates:get-specification', priceCode),
      updateSpecification: (data) => ipcRenderer.invoke('catalogue-templates:update-specification', data)
    },`;

    if (content.includes('supplierPrices:')) {
      warning('Supplier prices API already exists, skipping...');
    } else {
      content = content.replace(catalogueMarker, apiToAdd);
      success('Added API exposure');
    }

    fs.writeFileSync(preloadJsPath, content, 'utf8');
    success('preload.js updated successfully!');
    return true;

  } catch (err) {
    error(`Failed to update preload.js: ${err.message}`);
    return false;
  }
}

// Apply changes to useElectronAPI.js
function updateUseElectronAPI() {
  info('Updating useElectronAPI.js...');

  const apiPath = path.join(__dirname, 'frontend', 'src', 'composables', 'useElectronAPI.js');

  try {
    // Backup
    const backupPath = backupFile(apiPath);
    success(`Created backup: ${backupPath}`);

    let content = fs.readFileSync(apiPath, 'utf8');

    // Find the catalogue section and add after it
    const catalogueMarker = `deleteRecipeComponent: (mainItem, subItem) => window.electronAPI?.catalogue.deleteRecipeComponent(mainItem, subItem)
    },`;

    const apiToAdd = `deleteRecipeComponent: (mainItem, subItem) => window.electronAPI?.catalogue.deleteRecipeComponent(mainItem, subItem)
    },

    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => window.electronAPI?.supplierPrices.get(itemCode),
      add: (priceData) => window.electronAPI?.supplierPrices.add(priceData),
      update: (priceData) => window.electronAPI?.supplierPrices.update(priceData),
      delete: (itemCode, supplier, reference) => window.electronAPI?.supplierPrices.delete(itemCode, supplier, reference),
      getSuppliers: () => window.electronAPI?.supplierPrices.getSuppliers()
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) => window.electronAPI?.catalogueTemplates.getTemplate(priceCode),
      updateTemplate: (data) => window.electronAPI?.catalogueTemplates.updateTemplate(data),
      getSpecification: (priceCode) => window.electronAPI?.catalogueTemplates.getSpecification(priceCode),
      updateSpecification: (data) => window.electronAPI?.catalogueTemplates.updateSpecification(data)
    },`;

    if (content.includes('supplierPrices:')) {
      warning('Supplier prices API already exists, skipping...');
    } else {
      content = content.replace(catalogueMarker, apiToAdd);
      success('Added API methods');
    }

    fs.writeFileSync(apiPath, content, 'utf8');
    success('useElectronAPI.js updated successfully!');
    return true;

  } catch (err) {
    error(`Failed to update useElectronAPI.js: ${err.message}`);
    return false;
  }
}

// Main execution
function main() {
  log('\n' + '='.repeat(60), 'bright');
  log('  Catalogue Enhancements Integration Script', 'bright');
  log('='.repeat(60) + '\n', 'bright');

  info('This script will automatically integrate:');
  console.log('  1. Supplier Pricing');
  console.log('  2. Templates (Workup)');
  console.log('  3. Specifications\n');

  warning('IMPORTANT: The Electron application MUST be stopped!\n');

  let success_count = 0;
  let total_count = 3;

  // Update files
  if (updateMainJs()) success_count++;
  console.log('');

  if (updatePreloadJs()) success_count++;
  console.log('');

  if (updateUseElectronAPI()) success_count++;
  console.log('');

  // Summary
  log('='.repeat(60), 'bright');
  log('  Integration Summary', 'bright');
  log('='.repeat(60), 'bright');

  if (success_count === total_count) {
    success(`✨ All ${total_count} files updated successfully!`);
    console.log('');
    info('Next steps:');
    console.log('  1. Review the changes in the updated files');
    console.log('  2. Check database schema (see CATALOGUE_ENHANCEMENTS_INTEGRATION.md)');
    console.log('  3. Integrate UI components into CatalogueTab.vue (manual step)');
    console.log('  4. Start the application and test');
    console.log('');
    info('Backup files created with .backup extension');
    console.log('');
  } else {
    error(`Only ${success_count}/${total_count} files updated successfully`);
    console.log('');
    warning('Please check the errors above and try again');
    console.log('');
  }

  log('='.repeat(60) + '\n', 'bright');
}

// Run
main();
