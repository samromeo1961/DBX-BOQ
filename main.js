const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import database connection
const db = require('./src/database/connection');

// Import IPC handlers
const boqHandlers = require('./src/ipc-handlers/boq');
const jobsHandlers = require('./src/ipc-handlers/jobs');
const costCentresHandlers = require('./src/ipc-handlers/cost-centres');
const catalogueHandlers = require('./src/ipc-handlers/catalogue');
const catalogueDiagnosticsHandlers = require('./src/ipc-handlers/catalogue-diagnostics');
const estimatePricesSchemaHandlers = require('./src/ipc-handlers/estimate-prices-schema');
const supplierPricesHandlers = require('./src/ipc-handlers/supplier-prices');
const catalogueTemplatesHandlers = require('./src/ipc-handlers/catalogue-templates');
const catalogueImagesHandlers = require('./src/ipc-handlers/catalogue-images');
const purchaseOrdersHandlers = require('./src/ipc-handlers/purchase-orders');
const contactsHandlers = require('./src/ipc-handlers/contacts');
const suppliersHandlers = require('./src/ipc-handlers/suppliers');
const contactGroupsHandlers = require('./src/ipc-handlers/contact-groups');
const supplierGroupsHandlers = require('./src/ipc-handlers/supplier-groups');
const abnLookupHandlers = require('./src/ipc-handlers/abn-lookup');
const ausPostHandlers = require('./src/ipc-handlers/auspost-address');
const boqOptionsStore = require('./src/database/boq-options-store');
const credentialsStore = require('./src/database/credentials-store');
const importTemplatesStore = require('./src/database/import-templates-store');
const emailSettingsStore = require('./src/database/email-settings-store');
const emailHandlers = require('./src/ipc-handlers/email');
const globalSettingsHandlers = require('./src/ipc-handlers/global-settings');
const globalSettingsStore = require('./src/database/global-settings-store');
const documentHandlers = require('./src/ipc-handlers/documents');
const documentSettingsStore = require('./src/database/document-settings-store');
const documentCache = require('./src/database/document-cache');
const schemaMigration = require('./src/database/schema-migration');

// Initialize electron-store for settings
const store = new Store();

let mainWindow = null;
let settingsWindow = null;

/**
 * Create the main BOQ window
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,  // Don't show until ready-to-show event
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: false
  });

  // Load frontend
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }

  // Maximize window when ready to show
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Create menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create the database settings window
 */
function createSettingsWindow() {
  settingsWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    // If settings closed without saving and no saved config, quit
    if (!mainWindow && !store.get('dbConfig')) {
      app.quit();
    }
  });
}

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Database Settings',
          click: () => {
            if (!settingsWindow) {
              createSettingsWindow();
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            // Show about dialog
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================
// App Events
// ============================================================

app.whenReady().then(async () => {
  // Check if database config exists
  const dbConfig = store.get('dbConfig');

  if (!dbConfig) {
    // No config - show settings window first
    createSettingsWindow();
  } else {
    // Config exists - connect to database and show main window
    try {
      await db.connect(dbConfig);

      // Ensure Supplier column exists in Bill table
      await boqHandlers.ensureSupplierColumn();

      // Ensure optional columns exist in SuppliersPrices table
      await supplierPricesHandlers.ensureSuppliersPricesColumns();

      // Ensure Images column exists in PriceList table
      await catalogueImagesHandlers.ensureImagesColumn();

      // Initialize documents table
      await documentHandlers.initializeDocuments();

      createMainWindow();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      createSettingsWindow();
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================================
// IPC Handlers - Database Connection
// ============================================================

ipcMain.handle('db:test-connection', async (event, dbConfig) => {
  return await db.testConnection(dbConfig);
});

ipcMain.handle('db:save-connection', async (event, dbConfig) => {
  try {
    console.log('=== Save Connection ===');
    console.log('Config received:', JSON.stringify({
      server: dbConfig.server,
      database: dbConfig.database,
      hasUser: !!dbConfig.user,
      hasPassword: !!dbConfig.password,
      options: dbConfig.options
    }, null, 2));

    // Save to electron-store
    store.set('dbConfig', dbConfig);

    // Also save to credentials store
    credentialsStore.saveCredentials(dbConfig);

    // Connect to database
    await db.connect(dbConfig);

    // Ensure Supplier column exists in Bill table
    await boqHandlers.ensureSupplierColumn();

    // Ensure optional columns exist in SuppliersPrices table
    await supplierPricesHandlers.ensureSuppliersPricesColumns();

    // Ensure Images column exists in PriceList table
    await catalogueImagesHandlers.ensureImagesColumn();

    // Ensure estimate price columns exist in Prices table
    await estimatePricesSchemaHandlers.ensureEstimatePriceColumns();

    // Initialize documents table
    await documentHandlers.initializeDocuments();

    // Run diagnostics to check for duplicate data
    console.log('\n=== Running Catalogue Diagnostics ===');
    const duplicatePriceCodesResult = await catalogueDiagnosticsHandlers.checkDuplicatePriceCodes();
    const duplicatePricesResult = await catalogueDiagnosticsHandlers.checkDuplicatePrices();
    if (duplicatePricesResult.success && duplicatePricesResult.count > 0) {
      console.log('⚠️  WARNING: Found duplicate Price entries! This will cause duplicate catalogue items in the grid.');
      console.log('   Please clean up duplicate Price records in the database.');
    }
    console.log('=== Diagnostics Complete ===\n');

    // Close settings window and open main window
    if (settingsWindow) {
      settingsWindow.close();
    }

    if (!mainWindow) {
      createMainWindow();
    }

    return { success: true };
  } catch (error) {
    console.error('Save connection error:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('db:get-saved-connection', () => {
  return store.get('dbConfig');
});

ipcMain.handle('db:clear-saved-connection', () => {
  store.delete('dbConfig');
  credentialsStore.clearCredentials();
  return { success: true };
});

// ============================================================
// IPC Handlers - BOQ Operations
// ============================================================

ipcMain.handle('boq:get-job-bill', boqHandlers.getJobBill);
ipcMain.handle('boq:add-item', boqHandlers.addItem);
ipcMain.handle('boq:update-item', boqHandlers.updateItem);
ipcMain.handle('boq:delete-item', boqHandlers.deleteItem);
ipcMain.handle('boq:get-cost-centres-with-budgets', boqHandlers.getCostCentresWithBudgets);
ipcMain.handle('boq:reprice-bill', boqHandlers.repriceBill);
ipcMain.handle('boq:explode-recipe', boqHandlers.explodeRecipe);
ipcMain.handle('boq:get-loads', boqHandlers.getLoads);
ipcMain.handle('boq:create-load', boqHandlers.createLoad);
ipcMain.handle('boq:generate-report', boqHandlers.generateReport);
ipcMain.handle('boq:get-nominated-suppliers', boqHandlers.getNominatedSuppliers);
ipcMain.handle('boq:assign-supplier-to-load', boqHandlers.assignSupplierToLoad);
ipcMain.handle('boq:ensure-supplier-column', boqHandlers.ensureSupplierColumn);

// ============================================================
// IPC Handlers - BOQ Options
// ============================================================

ipcMain.handle('boq-options:get', () => boqOptionsStore.getOptions());
ipcMain.handle('boq-options:save', (event, options) => boqOptionsStore.saveOptions(options));
ipcMain.handle('boq-options:update', (event, key, value) => boqOptionsStore.updateOption(key, value));
ipcMain.handle('boq-options:reset', () => boqOptionsStore.resetOptions());
ipcMain.handle('boq-options:get-defaults', () => boqOptionsStore.getDefaults());
ipcMain.handle('boq-options:save-last-used', (event, lastUsed) => boqOptionsStore.saveLastUsed(lastUsed));

// ============================================================
// IPC Handlers - Email Settings
// ============================================================

ipcMain.handle('email-settings:get', () => emailSettingsStore.getEmailSettings());
ipcMain.handle('email-settings:save', (event, settings) => emailSettingsStore.saveEmailSettings(settings));
ipcMain.handle('email-settings:update', (event, key, value) => emailSettingsStore.updateEmailSetting(key, value));
ipcMain.handle('email-settings:reset', () => emailSettingsStore.resetEmailSettings());
ipcMain.handle('email-settings:get-smtp-config', () => emailSettingsStore.getSMTPConfig());
ipcMain.handle('email-settings:is-configured', () => emailSettingsStore.isEmailConfigured());

// ============================================================
// IPC Handlers - Email
// ============================================================

ipcMain.handle('email:send-test', emailHandlers.sendTestEmail);
ipcMain.handle('email:send-purchase-order', emailHandlers.sendPurchaseOrder);
ipcMain.handle('email:send-general', emailHandlers.sendGeneral);

// Import Templates
ipcMain.handle('import-templates:get-all', () => importTemplatesStore.getTemplates());
ipcMain.handle('import-templates:get', (event, id) => importTemplatesStore.getTemplate(id));
ipcMain.handle('import-templates:save', (event, template) => importTemplatesStore.saveTemplate(template));
ipcMain.handle('import-templates:delete', (event, id) => importTemplatesStore.deleteTemplate(id));

// Global Settings - Companies
ipcMain.handle('settings:get-companies', () => globalSettingsHandlers.getCompanies());
ipcMain.handle('settings:get-company', (event, id) => globalSettingsHandlers.getCompany(id));
ipcMain.handle('settings:get-current-company', () => globalSettingsHandlers.getCurrentCompany());
ipcMain.handle('settings:save-company', (event, company) => globalSettingsHandlers.saveCompany(company));
ipcMain.handle('settings:delete-company', (event, id) => globalSettingsHandlers.deleteCompany(id));
ipcMain.handle('settings:switch-company', (event, id) => globalSettingsHandlers.switchCompany(id));

// Global Settings - Users
ipcMain.handle('settings:get-users', () => globalSettingsHandlers.getUsers());
ipcMain.handle('settings:get-user', (event, id) => globalSettingsHandlers.getUser(id));
ipcMain.handle('settings:get-current-user', () => globalSettingsHandlers.getCurrentUser());
ipcMain.handle('settings:save-user', (event, user) => globalSettingsHandlers.saveUser(user));
ipcMain.handle('settings:delete-user', (event, id) => globalSettingsHandlers.deleteUser(id));
ipcMain.handle('settings:login-user', (event, username, password) => globalSettingsHandlers.loginUser(username, password));
ipcMain.handle('settings:logout-user', () => globalSettingsHandlers.logoutUser());

// Global Settings - Application Settings
ipcMain.handle('settings:get-application-defaults', () => globalSettingsHandlers.getApplicationDefaults());
ipcMain.handle('settings:update-application-defaults', (event, defaults) => globalSettingsHandlers.updateApplicationDefaults(defaults));
ipcMain.handle('settings:get-import-export-settings', () => globalSettingsHandlers.getImportExportSettings());
ipcMain.handle('settings:update-import-export-settings', (event, settings) => globalSettingsHandlers.updateImportExportSettings(settings));
ipcMain.handle('settings:get-pdf-settings', () => globalSettingsHandlers.getPdfSettings());
ipcMain.handle('settings:update-pdf-settings', (event, settings) => globalSettingsHandlers.updatePdfSettings(settings));
ipcMain.handle('settings:get-ui-preferences', () => globalSettingsHandlers.getUiPreferences());
ipcMain.handle('settings:update-ui-preferences', (event, preferences) => globalSettingsHandlers.updateUiPreferences(preferences));
ipcMain.handle('settings:get-all', () => globalSettingsHandlers.getAllSettings());
ipcMain.handle('settings:reset-all', () => globalSettingsHandlers.resetAllSettings());

// API Keys
ipcMain.handle('settings:get-api-keys', () => globalSettingsStore.getApiKeys());
ipcMain.handle('settings:update-api-keys', (event, keys) => globalSettingsStore.updateApiKeys(keys));

// ============================================================
// IPC Handlers - Jobs (from Job database)
// ============================================================

ipcMain.handle('jobs:get-list', jobsHandlers.getJobsList);
ipcMain.handle('jobs:get-job', (event, jobNo) => jobsHandlers.getJob(jobNo));
ipcMain.handle('jobs:create-job', (event, jobData) => jobsHandlers.createJob(jobData));
ipcMain.handle('jobs:update-job', (event, jobData) => jobsHandlers.updateJob(jobData));
ipcMain.handle('jobs:delete-job', (event, jobNo) => jobsHandlers.deleteJob(jobNo));
ipcMain.handle('jobs:restore-job', (event, jobNo) => jobsHandlers.restoreJob(jobNo));
ipcMain.handle('jobs:get-statuses', jobsHandlers.getJobStatuses);
ipcMain.handle('jobs:get-estimators', jobsHandlers.getEstimators);
ipcMain.handle('jobs:get-supervisors', jobsHandlers.getSupervisors);

// ============================================================
// IPC Handlers - Cost Centres
// ============================================================

ipcMain.handle('cost-centres:get-list', costCentresHandlers.getCostCentresList);
ipcMain.handle('cost-centres:get-cost-centre', (event, code) => costCentresHandlers.getCostCentre(code));
ipcMain.handle('cost-centres:get-with-budget', (event, jobNo) => costCentresHandlers.getCostCentresWithBudget(jobNo));

// ============================================================
// IPC Handlers - Contacts
// ============================================================

ipcMain.handle('contacts:get-list', (event, contactType) => contactsHandlers.getContactsList(event, contactType));
ipcMain.handle('contacts:get-contact', (event, code) => contactsHandlers.getContact(code));
ipcMain.handle('contacts:create-contact', (event, contactData) => contactsHandlers.createContact(event, contactData));
ipcMain.handle('contacts:update-contact', (event, contactData) => contactsHandlers.updateContact(event, contactData));
ipcMain.handle('contacts:delete-contact', (event, code) => contactsHandlers.deleteContact(event, code));
ipcMain.handle('contacts:get-groups', contactsHandlers.getContactGroups);

// ============================================================
// IPC Handlers - Suppliers
// ============================================================

ipcMain.handle('suppliers:get-list', (event, showArchived) => suppliersHandlers.getSuppliersList(event, showArchived));
ipcMain.handle('suppliers:get-supplier', (event, code) => suppliersHandlers.getSupplier(event, code));
ipcMain.handle('suppliers:create-supplier', (event, supplierData) => suppliersHandlers.createSupplier(event, supplierData));
ipcMain.handle('suppliers:update-supplier', (event, supplierData) => suppliersHandlers.updateSupplier(event, supplierData));
ipcMain.handle('suppliers:delete-supplier', (event, code) => suppliersHandlers.deleteSupplier(event, code));
ipcMain.handle('suppliers:get-order-history', (event, code) => suppliersHandlers.getSupplierOrderHistory(event, code));
ipcMain.handle('suppliers:get-payment-strategies', suppliersHandlers.getPaymentStrategies);

// ============================================================
// IPC Handlers - Contact Groups
// ============================================================

ipcMain.handle('contact-groups:get-list', () => contactGroupsHandlers.getContactGroups());
ipcMain.handle('contact-groups:get-group', (event, code) => contactGroupsHandlers.getContactGroup(event, code));
ipcMain.handle('contact-groups:create-group', (event, groupData) => contactGroupsHandlers.createContactGroup(event, groupData));

// ============================================================
// IPC Handlers - Supplier Groups
// ============================================================

ipcMain.handle('supplier-groups:get-list', () => supplierGroupsHandlers.getSupplierGroups());
ipcMain.handle('supplier-groups:get-group', (event, code) => supplierGroupsHandlers.getSupplierGroup(event, code));
ipcMain.handle('supplier-groups:create-group', (event, groupData) => supplierGroupsHandlers.createSupplierGroup(event, groupData));

// ============================================================
// IPC Handlers - ABN Lookup
// ============================================================

ipcMain.handle('abn-lookup:lookup', (event, abn, guid) => abnLookupHandlers.lookupABN(event, abn, guid));
ipcMain.handle('abn-lookup:search-by-name', (event, businessName, guid, options) => abnLookupHandlers.searchByBusinessName(event, businessName, guid, options));
ipcMain.handle('abn-lookup:verify', (event, abn, expectedData, guid) => abnLookupHandlers.verifyABN(event, abn, expectedData, guid));

// ============================================================
// IPC Handlers - Australia Post Address
// ============================================================

ipcMain.handle('auspost:search-addresses', (event, query) => ausPostHandlers.searchAddresses(event, query));
ipcMain.handle('auspost:validate-address', (event, addressData) => ausPostHandlers.validateAddress(event, addressData));

// ============================================================
// IPC Handlers - Catalogue
// ============================================================

ipcMain.handle('catalogue:get-items', (event, params) => catalogueHandlers.getCatalogueItems(params));
ipcMain.handle('catalogue:get-item', (event, priceCode, priceLevel) => catalogueHandlers.getCatalogueItem(priceCode, priceLevel));
ipcMain.handle('catalogue:get-recipe', (event, priceCode) => catalogueHandlers.getRecipeDetails(priceCode));

// ============================================================
// Supplier Prices IPC Handlers
// ============================================================
ipcMain.handle('supplier-prices:get', (event, itemCode) =>
  supplierPricesHandlers.getSupplierPrices(itemCode));
ipcMain.handle('supplier-prices:add', (event, priceData) =>
  supplierPricesHandlers.addSupplierPrice(priceData));
ipcMain.handle('supplier-prices:update', (event, priceData) =>
  supplierPricesHandlers.updateSupplierPrice(priceData));
ipcMain.handle('supplier-prices:delete', (event, itemCode, supplier, reference) =>
  supplierPricesHandlers.deleteSupplierPrice(itemCode, supplier, reference));
ipcMain.handle('supplier-prices:get-suppliers', () =>
  supplierPricesHandlers.getSuppliers());

// ============================================================
// Catalogue Templates & Specifications IPC Handlers
// ============================================================
ipcMain.handle('catalogue-templates:get-template', (event, priceCode) =>
  catalogueTemplatesHandlers.getTemplate(priceCode));
ipcMain.handle('catalogue-templates:update-template', (event, data) =>
  catalogueTemplatesHandlers.updateTemplate(data));
ipcMain.handle('catalogue-templates:get-specification', (event, priceCode) =>
  catalogueTemplatesHandlers.getSpecification(priceCode));
ipcMain.handle('catalogue-templates:update-specification', (event, data) =>
  catalogueTemplatesHandlers.updateSpecification(data));

// ============================================================
// Catalogue Images IPC Handlers
// ============================================================
ipcMain.handle('catalogue-images:get-images', (event, priceCode) =>
  catalogueImagesHandlers.getImages(priceCode));
ipcMain.handle('catalogue-images:add-image', (event, data) =>
  catalogueImagesHandlers.addImage(data));
ipcMain.handle('catalogue-images:update-image', (event, data) =>
  catalogueImagesHandlers.updateImage(data));
ipcMain.handle('catalogue-images:delete-image', (event, priceCode, index) =>
  catalogueImagesHandlers.deleteImage(priceCode, index));
ipcMain.handle('catalogue-images:set-primary-image', (event, priceCode, index) =>
  catalogueImagesHandlers.setPrimaryImage(priceCode, index));
ipcMain.handle('catalogue-images:copy-images', (event, sourceCode, targetCode) =>
  catalogueImagesHandlers.copyImages(sourceCode, targetCode));
ipcMain.handle('catalogue-images:reorder-images', (event, priceCode, reorderedImages) =>
  catalogueImagesHandlers.reorderImages(priceCode, reorderedImages));

// Catalogue Management
ipcMain.handle('catalogue:get-all-items', (event, params) => catalogueHandlers.getAllCatalogueItems(params));
ipcMain.handle('catalogue:get-per-codes', () => catalogueHandlers.getPerCodes());
ipcMain.handle('catalogue:update-item', (event, item) => catalogueHandlers.updateCatalogueItem(item));
ipcMain.handle('catalogue:add-item', (event, item) => catalogueHandlers.addCatalogueItem(item));
ipcMain.handle('catalogue:delete-items', (event, priceCodes) => catalogueHandlers.deleteCatalogueItems(priceCodes));
ipcMain.handle('catalogue:get-item-usage', catalogueHandlers.getItemUsage);
ipcMain.handle('catalogue:export-csv', (event, params) => catalogueHandlers.exportCatalogueToCSV(params));
ipcMain.handle('catalogue:add-recipe-component', (event, mainItem, subItem, quantity) => catalogueHandlers.addRecipeComponent(mainItem, subItem, quantity));
ipcMain.handle('catalogue:update-recipe-component', (event, mainItem, subItem, quantity) => catalogueHandlers.updateRecipeComponent(mainItem, subItem, quantity));
ipcMain.handle('catalogue:update-recipe-formula', (event, mainItem, subItem, formula) => catalogueHandlers.updateRecipeFormula(mainItem, subItem, formula));
ipcMain.handle('catalogue:delete-recipe-component', (event, mainItem, subItem) => catalogueHandlers.deleteRecipeComponent(mainItem, subItem));

// Catalogue Diagnostics
ipcMain.handle('catalogue:check-duplicate-pricecodes', () => catalogueDiagnosticsHandlers.checkDuplicatePriceCodes());
ipcMain.handle('catalogue:check-duplicate-prices', () => catalogueDiagnosticsHandlers.checkDuplicatePrices());
ipcMain.handle('catalogue:debug-item-duplication', (event, priceCode) => catalogueDiagnosticsHandlers.debugItemDuplication(priceCode));

// Estimate Prices
ipcMain.handle('catalogue:get-estimate-prices', (event, priceCode) => catalogueHandlers.getEstimatePrices(priceCode));
ipcMain.handle('catalogue:add-estimate-price', (event, data) => catalogueHandlers.addEstimatePrice(data));
ipcMain.handle('catalogue:update-estimate-price', (event, data) => catalogueHandlers.updateEstimatePrice(data));
ipcMain.handle('catalogue:delete-estimate-price', (event, priceCode, priceLevel, validFrom) => catalogueHandlers.deleteEstimatePrice(priceCode, priceLevel, validFrom));

// Bulk Price Changes
ipcMain.handle('catalogue:get-bulk-price-items', (event, criteria) => catalogueHandlers.getBulkPriceItems(criteria));
ipcMain.handle('catalogue:apply-bulk-price-changes', (event, data) => catalogueHandlers.applyBulkPriceChanges(data));

// Import
ipcMain.handle('catalogue:import-items', (event, data) => catalogueHandlers.importItems(data));

// ============================================================
// IPC Handlers - Purchase Orders
// ============================================================

ipcMain.handle('po:get-jobs', purchaseOrdersHandlers.getJobs);
ipcMain.handle('po:get-orders-for-job', (event, jobNo) => purchaseOrdersHandlers.getOrdersForJob(event, jobNo));
ipcMain.handle('po:get-order-line-items', (event, orderNumber) => purchaseOrdersHandlers.getOrderLineItems(event, orderNumber));
ipcMain.handle('po:render-preview', (event, orderNumber, settings) => purchaseOrdersHandlers.renderOrderPreview(event, orderNumber, settings));
ipcMain.handle('po:render-pdf', (event, orderNumber, settings) => purchaseOrdersHandlers.renderOrderToPDF(event, orderNumber, settings));
ipcMain.handle('po:get-order-summary', (event, orderNumber) => purchaseOrdersHandlers.getOrderSummary(event, orderNumber));
ipcMain.handle('po:get-cost-centres', purchaseOrdersHandlers.getCostCentres);
ipcMain.handle('po:get-jobs-with-counts', purchaseOrdersHandlers.getJobsWithOrderCounts);
ipcMain.handle('po:get-preferred-suppliers', (event, costCentre) => purchaseOrdersHandlers.getPreferredSuppliers(event, costCentre));
ipcMain.handle('po:get-suppliers-for-cost-centre', (event, costCentre) => purchaseOrdersHandlers.getSuppliersForCostCentre(event, costCentre));
ipcMain.handle('po:update-order', (event, orderNumber, updates) => purchaseOrdersHandlers.updateOrder(event, orderNumber, updates));
ipcMain.handle('po:log-order', (event, orderNumber, supplier, delDate, note) => purchaseOrdersHandlers.logOrder(event, orderNumber, supplier, delDate, note));
ipcMain.handle('po:get-order-details', (event, orderNumber) => purchaseOrdersHandlers.getOrderDetails(event, orderNumber));
ipcMain.handle('po:batch-render-pdf', (event, orderNumbers, settings) => purchaseOrdersHandlers.batchRenderPDF(event, orderNumbers, settings));
ipcMain.handle('po:batch-print', (event, orderNumbers, settings) => purchaseOrdersHandlers.batchPrint(event, orderNumbers, settings));
ipcMain.handle('po:batch-email', (event, orderNumbers, settings) => purchaseOrdersHandlers.batchEmail(event, orderNumbers, settings));
ipcMain.handle('po:batch-save-pdf', (event, orderNumbers, settings) => purchaseOrdersHandlers.batchSavePDF(event, orderNumbers, settings));
ipcMain.handle('po:get-all-suppliers', purchaseOrdersHandlers.getAllSuppliers);
ipcMain.handle('po:add-nominated-supplier', (event, costCentre, supplierCode) => purchaseOrdersHandlers.addNominatedSupplier(event, costCentre, supplierCode));
ipcMain.handle('po:remove-nominated-supplier', (event, costCentre, supplierCode) => purchaseOrdersHandlers.removeNominatedSupplier(event, costCentre, supplierCode));
ipcMain.handle('po:ensure-status-column', purchaseOrdersHandlers.ensureStatusColumn);
ipcMain.handle('po:cancel-order', (event, orderNumber, reason) => purchaseOrdersHandlers.cancelOrder(event, orderNumber, reason));
ipcMain.handle('po:send-cancellation-email', (event, orderNumber, settings) => purchaseOrdersHandlers.sendCancellationEmail(event, orderNumber, settings));

// ============================================================
// IPC Handlers - Documents
// ============================================================

ipcMain.handle('documents:get', (event, params) => documentHandlers.getDocuments(event, params));
ipcMain.handle('documents:add', (event, documentData) => documentHandlers.addDocument(event, documentData));
ipcMain.handle('documents:update', (event, params) => documentHandlers.updateDocument(event, params));
ipcMain.handle('documents:delete', (event, params) => documentHandlers.deleteDocument(event, params));
ipcMain.handle('documents:get-by-type', (event, params) => documentHandlers.getDocumentsByType(event, params));
ipcMain.handle('documents:search', (event, params) => documentHandlers.searchDocuments(event, params));
ipcMain.handle('documents:log-communication', (event, commData) => documentHandlers.logCommunication(event, commData));
ipcMain.handle('documents:check-table-exists', documentHandlers.checkTableExists);
ipcMain.handle('documents:initialize', documentHandlers.initializeDocuments);
ipcMain.handle('documents:get-by-job', (event, jobNo) => documentHandlers.getDocumentsByJob(event, jobNo));
ipcMain.handle('documents:get-by-boq-item', (event, params) => documentHandlers.getDocumentsByBOQItem(event, params));
ipcMain.handle('documents:get-by-purchase-order', (event, params) => documentHandlers.getDocumentsByPurchaseOrder(event, params));
ipcMain.handle('documents:link', (event, linkData) => documentHandlers.linkDocument(event, linkData));
ipcMain.handle('documents:unlink', (event, documentId) => documentHandlers.unlinkDocument(event, documentId));

// ============================================================
// IPC Handlers - Document Settings (local path config)
// ============================================================

ipcMain.handle('document-settings:get', () => documentSettingsStore.getSettings());
ipcMain.handle('document-settings:save', (event, settings) => documentSettingsStore.saveSettings(settings));
ipcMain.handle('document-settings:get-base-path', () => documentSettingsStore.getBasePath());
ipcMain.handle('document-settings:set-base-path', (event, basePath) => documentSettingsStore.setBasePath(basePath));
ipcMain.handle('document-settings:is-configured', () => documentSettingsStore.isConfigured());
ipcMain.handle('document-settings:build-path', (event, entityType, entityCode, documentType) =>
  documentSettingsStore.buildRelativePath(entityType, entityCode, documentType));
ipcMain.handle('document-settings:get-full-path', (event, relativePath) =>
  documentSettingsStore.buildFullPath(relativePath));
ipcMain.handle('document-settings:ensure-folder', (event, entityType, entityCode, documentType) =>
  documentSettingsStore.ensureEntityFolder(entityType, entityCode, documentType));
ipcMain.handle('document-settings:validate-path', (event, pathToCheck) =>
  documentSettingsStore.validatePath(pathToCheck));
ipcMain.handle('document-settings:list-files', (event, dirPath) =>
  documentSettingsStore.listFiles(dirPath));
ipcMain.handle('document-settings:reset', () => documentSettingsStore.resetSettings());
ipcMain.handle('document-settings:browse-folder', async (event, defaultPath) => {
  const options = {
    properties: ['openDirectory'],
    title: 'Select Document Storage Folder'
  };
  // Set default path if provided and exists
  if (defaultPath) {
    options.defaultPath = defaultPath;
  }
  const result = await dialog.showOpenDialog(mainWindow, options);
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('document-settings:browse-file', async (event, defaultPath, filters) => {
  const options = {
    properties: ['openFile'],
    title: 'Select File'
  };
  if (defaultPath) {
    options.defaultPath = defaultPath;
  }
  if (filters) {
    options.filters = filters;
  } else {
    options.filters = [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx'] }
    ];
  }
  const result = await dialog.showOpenDialog(mainWindow, options);
  if (result.canceled) return null;
  return result.filePaths[0];
});

// ============================================================
// IPC Handlers - Document Cache (SQLite file listing cache)
// ============================================================

ipcMain.handle('document-cache:initialize', () => documentCache.initializeCache());
ipcMain.handle('document-cache:scan', (event, basePath, relativePath, entityType, entityCode, documentType) =>
  documentCache.scanAndCacheDirectory(basePath, relativePath, entityType, entityCode, documentType));
ipcMain.handle('document-cache:get-files', (event, entityType, entityCode, documentType) =>
  documentCache.getCachedFiles(entityType, entityCode, documentType));
ipcMain.handle('document-cache:search', (event, searchTerm, entityType) =>
  documentCache.searchCachedFiles(searchTerm, entityType));
ipcMain.handle('document-cache:get-files-in-path', (event, basePath, relativePath) =>
  documentCache.getFilesInPath(basePath, relativePath));
ipcMain.handle('document-cache:clear', (event, basePath) => documentCache.clearCache(basePath));
ipcMain.handle('document-cache:stats', () => documentCache.getCacheStats());
ipcMain.handle('document-cache:needs-refresh', (event, maxAgeMinutes) => documentCache.needsRefresh(maxAgeMinutes));
ipcMain.handle('document-cache:list-files', (event, dirPath) => documentCache.listFiles(dirPath));
ipcMain.handle('document-cache:open-file', (event, filePath) => documentCache.openFile(filePath));
ipcMain.handle('document-cache:show-in-folder', (event, itemPath) => documentCache.showInFolder(itemPath));
ipcMain.handle('document-cache:copy-file', (event, sourcePath, destPath) => documentCache.copyFile(sourcePath, destPath));
ipcMain.handle('document-cache:create-directory', (event, dirPath) => documentCache.createDirectory(dirPath));

// ============================================================
// IPC Handlers - Schema Migration (for DBA)
// ============================================================

ipcMain.handle('schema:check-status', () => schemaMigration.checkSchemaStatus());
ipcMain.handle('schema:generate-migration', () => schemaMigration.generateMigrationScript());
ipcMain.handle('schema:generate-full', (event, systemDb, jobDb) => schemaMigration.generateFullScript(systemDb, jobDb));

console.log('DBx BOQ - Electron main process initialized');
