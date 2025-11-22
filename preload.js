const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Safely exposes IPC functions to renderer
 * Uses contextBridge for security
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // Database connection
  db: {
    testConnection: (dbConfig) => ipcRenderer.invoke('db:test-connection', dbConfig),
    saveConnection: (dbConfig) => ipcRenderer.invoke('db:save-connection', dbConfig),
    getSavedConnection: () => ipcRenderer.invoke('db:get-saved-connection'),
    clearSavedConnection: () => ipcRenderer.invoke('db:clear-saved-connection')
  },

  // Bill of Quantities (BOQ)
  boq: {
    getJobBill: (jobNo, costCentre, bLoad) =>
      ipcRenderer.invoke('boq:get-job-bill', { jobNo, costCentre, bLoad }),
    addItem: (billItem) =>
      ipcRenderer.invoke('boq:add-item', billItem),
    updateItem: (billItem) =>
      ipcRenderer.invoke('boq:update-item', billItem),
    deleteItem: (jobNo, costCentre, bLoad, lineNumber) =>
      ipcRenderer.invoke('boq:delete-item', { jobNo, costCentre, bLoad, lineNumber }),
    getCostCentresWithBudgets: (jobNo) =>
      ipcRenderer.invoke('boq:get-cost-centres-with-budgets', { jobNo }),
    repriceBill: (jobNo, priceLevel, billDate) =>
      ipcRenderer.invoke('boq:reprice-bill', { jobNo, priceLevel, billDate }),
    explodeRecipe: (jobNo, costCentre, bLoad, priceCode, quantity, options) =>
      ipcRenderer.invoke('boq:explode-recipe', { jobNo, costCentre, bLoad, priceCode, quantity, options }),
    getLoads: (jobNo, costCentre) =>
      ipcRenderer.invoke('boq:get-loads', { jobNo, costCentre }),
    createLoad: (jobNo, costCentre) =>
      ipcRenderer.invoke('boq:create-load', { jobNo, costCentre }),
    generateReport: (reportType, jobNo, costCentre) =>
      ipcRenderer.invoke('boq:generate-report', { reportType, jobNo, costCentre }),
    getNominatedSuppliers: (costCentre) =>
      ipcRenderer.invoke('boq:get-nominated-suppliers', costCentre),
    assignSupplierToLoad: (jobNo, costCentre, bLoad, supplier) =>
      ipcRenderer.invoke('boq:assign-supplier-to-load', { jobNo, costCentre, bLoad, supplier })
  },

  // BOQ Options
  boqOptions: {
    get: () => ipcRenderer.invoke('boq-options:get'),
    save: (options) => ipcRenderer.invoke('boq-options:save', options),
    update: (key, value) => ipcRenderer.invoke('boq-options:update', key, value),
    reset: () => ipcRenderer.invoke('boq-options:reset'),
    getDefaults: () => ipcRenderer.invoke('boq-options:get-defaults'),
    saveLastUsed: (lastUsed) => ipcRenderer.invoke('boq-options:save-last-used', lastUsed)
  },

  // Import Templates
  importTemplates: {
    getAll: () => ipcRenderer.invoke('import-templates:get-all'),
    get: (id) => ipcRenderer.invoke('import-templates:get', id),
    save: (template) => ipcRenderer.invoke('import-templates:save', template),
    delete: (id) => ipcRenderer.invoke('import-templates:delete', id)
  },

  // Global Settings
  settings: {
    // Companies
    getCompanies: () => ipcRenderer.invoke('settings:get-companies'),
    getCompany: (id) => ipcRenderer.invoke('settings:get-company', id),
    getCurrentCompany: () => ipcRenderer.invoke('settings:get-current-company'),
    saveCompany: (company) => ipcRenderer.invoke('settings:save-company', company),
    deleteCompany: (id) => ipcRenderer.invoke('settings:delete-company', id),
    switchCompany: (id) => ipcRenderer.invoke('settings:switch-company', id),
    // Users
    getUsers: () => ipcRenderer.invoke('settings:get-users'),
    getUser: (id) => ipcRenderer.invoke('settings:get-user', id),
    getCurrentUser: () => ipcRenderer.invoke('settings:get-current-user'),
    saveUser: (user) => ipcRenderer.invoke('settings:save-user', user),
    deleteUser: (id) => ipcRenderer.invoke('settings:delete-user', id),
    loginUser: (username, password) => ipcRenderer.invoke('settings:login-user', username, password),
    logoutUser: () => ipcRenderer.invoke('settings:logout-user'),
    // Application Settings
    getApplicationDefaults: () => ipcRenderer.invoke('settings:get-application-defaults'),
    updateApplicationDefaults: (defaults) => ipcRenderer.invoke('settings:update-application-defaults', defaults),
    getImportExportSettings: () => ipcRenderer.invoke('settings:get-import-export-settings'),
    updateImportExportSettings: (settings) => ipcRenderer.invoke('settings:update-import-export-settings', settings),
    getPdfSettings: () => ipcRenderer.invoke('settings:get-pdf-settings'),
    updatePdfSettings: (settings) => ipcRenderer.invoke('settings:update-pdf-settings', settings),
    getUiPreferences: () => ipcRenderer.invoke('settings:get-ui-preferences'),
    updateUiPreferences: (preferences) => ipcRenderer.invoke('settings:update-ui-preferences', preferences),
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    resetAll: () => ipcRenderer.invoke('settings:reset-all'),
    // API Keys
    getApiKeys: () => ipcRenderer.invoke('settings:get-api-keys'),
    updateApiKeys: (keys) => ipcRenderer.invoke('settings:update-api-keys', keys)
  },

  // Jobs
  jobs: {
    getList: (showArchived = false) => ipcRenderer.invoke('jobs:get-list', showArchived),
    getJob: (jobNo) => ipcRenderer.invoke('jobs:get-job', jobNo),
    createJob: (jobData) => ipcRenderer.invoke('jobs:create-job', jobData),
    updateJob: (jobData) => ipcRenderer.invoke('jobs:update-job', jobData),
    deleteJob: (jobNo) => ipcRenderer.invoke('jobs:delete-job', jobNo),
    restoreJob: (jobNo) => ipcRenderer.invoke('jobs:restore-job', jobNo),
    getStatuses: () => ipcRenderer.invoke('jobs:get-statuses'),
    getEstimators: () => ipcRenderer.invoke('jobs:get-estimators'),
    getSupervisors: () => ipcRenderer.invoke('jobs:get-supervisors')
  },

  // Cost Centres
  costCentres: {
    getList: () => ipcRenderer.invoke('cost-centres:get-list'),
    getCostCentre: (code) => ipcRenderer.invoke('cost-centres:get-cost-centre', code),
    getWithBudget: (jobNo) => ipcRenderer.invoke('cost-centres:get-with-budget', jobNo)
  },

  // Contacts
  contacts: {
    getList: (contactType) => ipcRenderer.invoke('contacts:get-list', contactType),
    getContact: (code) => ipcRenderer.invoke('contacts:get-contact', code),
    createContact: (contactData) => ipcRenderer.invoke('contacts:create-contact', contactData),
    updateContact: (contactData) => ipcRenderer.invoke('contacts:update-contact', contactData),
    deleteContact: (code) => ipcRenderer.invoke('contacts:delete-contact', code),
    getGroups: () => ipcRenderer.invoke('contacts:get-groups')
  },

  // Suppliers
  suppliers: {
    getList: (showArchived) => ipcRenderer.invoke('suppliers:get-list', showArchived),
    getSupplier: (code) => ipcRenderer.invoke('suppliers:get-supplier', code),
    createSupplier: (supplierData) => ipcRenderer.invoke('suppliers:create-supplier', supplierData),
    updateSupplier: (supplierData) => ipcRenderer.invoke('suppliers:update-supplier', supplierData),
    deleteSupplier: (code) => ipcRenderer.invoke('suppliers:delete-supplier', code),
    getOrderHistory: (code) => ipcRenderer.invoke('suppliers:get-order-history', code),
    getPaymentStrategies: () => ipcRenderer.invoke('suppliers:get-payment-strategies')
  },

  // Contact Groups
  contactGroups: {
    getList: () => ipcRenderer.invoke('contact-groups:get-list'),
    getGroup: (code) => ipcRenderer.invoke('contact-groups:get-group', code),
    createGroup: (groupData) => ipcRenderer.invoke('contact-groups:create-group', groupData)
  },

  // Supplier Groups
  supplierGroups: {
    getList: () => ipcRenderer.invoke('supplier-groups:get-list'),
    getGroup: (code) => ipcRenderer.invoke('supplier-groups:get-group', code),
    createGroup: (groupData) => ipcRenderer.invoke('supplier-groups:create-group', groupData)
  },

  // ABN Lookup
  abnLookup: {
    lookup: (abn, guid) => ipcRenderer.invoke('abn-lookup:lookup', abn, guid),
    searchByName: (businessName, guid, options) => ipcRenderer.invoke('abn-lookup:search-by-name', businessName, guid, options),
    verify: (abn, expectedData, guid) => ipcRenderer.invoke('abn-lookup:verify', abn, expectedData, guid)
  },

  // Australia Post Address
  ausPost: {
    searchAddresses: (query) => ipcRenderer.invoke('auspost:search-addresses', query),
    validateAddress: (addressData) => ipcRenderer.invoke('auspost:validate-address', addressData)
  },

  // Catalogue
  catalogue: {
    getItems: (params) => ipcRenderer.invoke('catalogue:get-items', params),
    getItem: (priceCode, priceLevel) => ipcRenderer.invoke('catalogue:get-item', priceCode, priceLevel),
    getRecipe: (priceCode) => ipcRenderer.invoke('catalogue:get-recipe', priceCode),
    // Catalogue Management
    getAllItems: (params) => ipcRenderer.invoke('catalogue:get-all-items', params),
    getPerCodes: () => ipcRenderer.invoke('catalogue:get-per-codes'),
    updateItem: (item) => ipcRenderer.invoke('catalogue:update-item', item),
    addItem: (item) => ipcRenderer.invoke('catalogue:add-item', item),
    deleteItems: (priceCodes) => ipcRenderer.invoke('catalogue:delete-items', priceCodes),
    getItemUsage: (priceCode) => ipcRenderer.invoke('catalogue:get-item-usage', priceCode),
    exportCSV: (params) => ipcRenderer.invoke('catalogue:export-csv', params),
    // Recipe Management
    addRecipeComponent: (mainItem, subItem, quantity) => ipcRenderer.invoke('catalogue:add-recipe-component', mainItem, subItem, quantity),
    updateRecipeComponent: (mainItem, subItem, quantity) => ipcRenderer.invoke('catalogue:update-recipe-component', mainItem, subItem, quantity),
    updateRecipeFormula: (mainItem, subItem, formula) => ipcRenderer.invoke('catalogue:update-recipe-formula', mainItem, subItem, formula),
    deleteRecipeComponent: (mainItem, subItem) => ipcRenderer.invoke('catalogue:delete-recipe-component', mainItem, subItem),
    // Diagnostics
    checkDuplicatePriceCodes: () => ipcRenderer.invoke('catalogue:check-duplicate-pricecodes'),
    checkDuplicatePrices: () => ipcRenderer.invoke('catalogue:check-duplicate-prices'),
    debugItemDuplication: (priceCode) => ipcRenderer.invoke('catalogue:debug-item-duplication', priceCode),
    // Estimate Prices
    getEstimatePrices: (priceCode) => ipcRenderer.invoke('catalogue:get-estimate-prices', priceCode),
    addEstimatePrice: (data) => ipcRenderer.invoke('catalogue:add-estimate-price', data),
    updateEstimatePrice: (data) => ipcRenderer.invoke('catalogue:update-estimate-price', data),
    deleteEstimatePrice: (priceCode, priceLevel, validFrom) => ipcRenderer.invoke('catalogue:delete-estimate-price', priceCode, priceLevel, validFrom),
    // Bulk Price Changes
    getBulkPriceItems: (criteria) => ipcRenderer.invoke('catalogue:get-bulk-price-items', criteria),
    applyBulkPriceChanges: (data) => ipcRenderer.invoke('catalogue:apply-bulk-price-changes', data),
    // Import
    importItems: (data) => ipcRenderer.invoke('catalogue:import-items', data)
  },

    // Supplier Prices
    supplierPrices: {
      get: (itemCode) => ipcRenderer.invoke('supplier-prices:get', itemCode),
      add: (priceData) => ipcRenderer.invoke('supplier-prices:add', priceData),
      update: (priceData) => ipcRenderer.invoke('supplier-prices:update', priceData),
      delete: (itemCode, supplier, reference) =>
        ipcRenderer.invoke('supplier-prices:delete', itemCode, supplier, reference),
      getSuppliers: () => ipcRenderer.invoke('supplier-prices:get-suppliers')
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) =>
        ipcRenderer.invoke('catalogue-templates:get-template', priceCode),
      updateTemplate: (data) =>
        ipcRenderer.invoke('catalogue-templates:update-template', data),
      getSpecification: (priceCode) =>
        ipcRenderer.invoke('catalogue-templates:get-specification', priceCode),
      updateSpecification: (data) =>
        ipcRenderer.invoke('catalogue-templates:update-specification', data)
    },

    // Catalogue Images
    catalogueImages: {
      getImages: (priceCode) =>
        ipcRenderer.invoke('catalogue-images:get-images', priceCode),
      addImage: (data) =>
        ipcRenderer.invoke('catalogue-images:add-image', data),
      updateImage: (data) =>
        ipcRenderer.invoke('catalogue-images:update-image', data),
      deleteImage: (priceCode, index) =>
        ipcRenderer.invoke('catalogue-images:delete-image', priceCode, index),
      setPrimaryImage: (priceCode, index) =>
        ipcRenderer.invoke('catalogue-images:set-primary-image', priceCode, index),
      copyImages: (sourceCode, targetCode) =>
        ipcRenderer.invoke('catalogue-images:copy-images', sourceCode, targetCode),
      reorderImages: (priceCode, reorderedImages) =>
        ipcRenderer.invoke('catalogue-images:reorder-images', priceCode, reorderedImages)
    },

  // Purchase Orders
  purchaseOrders: {
    getJobs: () => ipcRenderer.invoke('po:get-jobs'),
    getOrdersForJob: (jobNo) => ipcRenderer.invoke('po:get-orders-for-job', jobNo),
    getOrderLineItems: (orderNumber) => ipcRenderer.invoke('po:get-order-line-items', orderNumber),
    renderPreview: (orderNumber, settings) => ipcRenderer.invoke('po:render-preview', orderNumber, settings),
    renderPDF: (orderNumber, settings) => ipcRenderer.invoke('po:render-pdf', orderNumber, settings),
    getOrderSummary: (orderNumber) => ipcRenderer.invoke('po:get-order-summary', orderNumber),
    getCostCentres: () => ipcRenderer.invoke('po:get-cost-centres'),
    getJobsWithCounts: () => ipcRenderer.invoke('po:get-jobs-with-counts'),
    getPreferredSuppliers: (costCentre) => ipcRenderer.invoke('po:get-preferred-suppliers', costCentre),
    getSuppliersForCostCentre: (costCentre) => ipcRenderer.invoke('po:get-suppliers-for-cost-centre', costCentre),
    updateOrder: (orderNumber, updates) => ipcRenderer.invoke('po:update-order', orderNumber, updates),
    logOrder: (orderNumber, supplier, delDate, note) => ipcRenderer.invoke('po:log-order', orderNumber, supplier, delDate, note),
    getOrderDetails: (orderNumber) => ipcRenderer.invoke('po:get-order-details', orderNumber),
    batchRenderPDF: (orderNumbers, settings) => ipcRenderer.invoke('po:batch-render-pdf', orderNumbers, settings),
    batchPrint: (orderNumbers, settings) => ipcRenderer.invoke('po:batch-print', orderNumbers, settings),
    batchEmail: (orderNumbers, settings) => ipcRenderer.invoke('po:batch-email', orderNumbers, settings),
    batchSavePDF: (orderNumbers, settings) => ipcRenderer.invoke('po:batch-save-pdf', orderNumbers, settings),
    getAllSuppliers: () => ipcRenderer.invoke('po:get-all-suppliers'),
    addNominatedSupplier: (costCentre, supplierCode) => ipcRenderer.invoke('po:add-nominated-supplier', costCentre, supplierCode),
    removeNominatedSupplier: (costCentre, supplierCode) => ipcRenderer.invoke('po:remove-nominated-supplier', costCentre, supplierCode),
    ensureStatusColumn: () => ipcRenderer.invoke('po:ensure-status-column'),
    cancelOrder: (orderNumber, reason) => ipcRenderer.invoke('po:cancel-order', orderNumber, reason),
    sendCancellationEmail: (orderNumber, settings) => ipcRenderer.invoke('po:send-cancellation-email', orderNumber, settings)
  },

  // Email Settings
  emailSettings: {
    get: () => ipcRenderer.invoke('email-settings:get'),
    save: (settings) => ipcRenderer.invoke('email-settings:save', settings),
    update: (key, value) => ipcRenderer.invoke('email-settings:update', key, value),
    reset: () => ipcRenderer.invoke('email-settings:reset'),
    getSMTPConfig: () => ipcRenderer.invoke('email-settings:get-smtp-config'),
    isConfigured: () => ipcRenderer.invoke('email-settings:is-configured')
  },

  // Email
  email: {
    sendTest: (to, settings) => ipcRenderer.invoke('email:send-test', { to, settings }),
    sendPurchaseOrder: (orderNumber, to, subject, body, attachments) =>
      ipcRenderer.invoke('email:send-purchase-order', { orderNumber, to, subject, body, attachments }),
    sendGeneral: (params) => ipcRenderer.invoke('email:send-general', params)
  },

  // Documents (shared MSSQL metadata)
  documents: {
    get: (entityType, entityCode) => ipcRenderer.invoke('documents:get', { entityType, entityCode }),
    add: (documentData) => ipcRenderer.invoke('documents:add', documentData),
    update: (documentId, updates) => ipcRenderer.invoke('documents:update', { documentId, updates }),
    delete: (documentId, deletedBy) => ipcRenderer.invoke('documents:delete', { documentId, deletedBy }),
    getByType: (documentType) => ipcRenderer.invoke('documents:get-by-type', { documentType }),
    search: (searchTerm, entityType, documentType) =>
      ipcRenderer.invoke('documents:search', { searchTerm, entityType, documentType }),
    logCommunication: (commData) => ipcRenderer.invoke('documents:log-communication', commData),
    checkTableExists: () => ipcRenderer.invoke('documents:check-table-exists'),
    initialize: () => ipcRenderer.invoke('documents:initialize'),
    getByJob: (jobNo) => ipcRenderer.invoke('documents:get-by-job', jobNo),
    getByBOQItem: (params) => ipcRenderer.invoke('documents:get-by-boq-item', params),
    getByPurchaseOrder: (params) => ipcRenderer.invoke('documents:get-by-purchase-order', params),
    link: (linkData) => ipcRenderer.invoke('documents:link', linkData),
    unlink: (documentId) => ipcRenderer.invoke('documents:unlink', documentId)
  },

  // Document Settings (local path configuration)
  documentSettings: {
    get: () => ipcRenderer.invoke('document-settings:get'),
    save: (settings) => ipcRenderer.invoke('document-settings:save', settings),
    getBasePath: () => ipcRenderer.invoke('document-settings:get-base-path'),
    setBasePath: (basePath) => ipcRenderer.invoke('document-settings:set-base-path', basePath),
    isConfigured: () => ipcRenderer.invoke('document-settings:is-configured'),
    buildPath: (entityType, entityCode, documentType) =>
      ipcRenderer.invoke('document-settings:build-path', entityType, entityCode, documentType),
    getFullPath: (relativePath) => ipcRenderer.invoke('document-settings:get-full-path', relativePath),
    ensureFolder: (entityType, entityCode, documentType) =>
      ipcRenderer.invoke('document-settings:ensure-folder', entityType, entityCode, documentType),
    validatePath: (pathToCheck) => ipcRenderer.invoke('document-settings:validate-path', pathToCheck),
    listFiles: (dirPath) => ipcRenderer.invoke('document-settings:list-files', dirPath),
    reset: () => ipcRenderer.invoke('document-settings:reset'),
    browseFolder: (defaultPath) => ipcRenderer.invoke('document-settings:browse-folder', defaultPath),
    browseFile: (defaultPath, filters) => ipcRenderer.invoke('document-settings:browse-file', defaultPath, filters)
  },

  // Document Cache (SQLite file listing cache)
  documentCache: {
    initialize: () => ipcRenderer.invoke('document-cache:initialize'),
    scan: (basePath, relativePath, entityType, entityCode, documentType) =>
      ipcRenderer.invoke('document-cache:scan', basePath, relativePath, entityType, entityCode, documentType),
    getFiles: (entityType, entityCode, documentType) =>
      ipcRenderer.invoke('document-cache:get-files', entityType, entityCode, documentType),
    search: (searchTerm, entityType) =>
      ipcRenderer.invoke('document-cache:search', searchTerm, entityType),
    getFilesInPath: (basePath, relativePath) =>
      ipcRenderer.invoke('document-cache:get-files-in-path', basePath, relativePath),
    clear: (basePath) => ipcRenderer.invoke('document-cache:clear', basePath),
    getStats: () => ipcRenderer.invoke('document-cache:stats'),
    needsRefresh: (maxAgeMinutes) => ipcRenderer.invoke('document-cache:needs-refresh', maxAgeMinutes),
    listFiles: (dirPath) => ipcRenderer.invoke('document-cache:list-files', dirPath),
    openFile: (filePath) => ipcRenderer.invoke('document-cache:open-file', filePath),
    showInFolder: (itemPath) => ipcRenderer.invoke('document-cache:show-in-folder', itemPath),
    copyFile: (sourcePath, destPath) => ipcRenderer.invoke('document-cache:copy-file', sourcePath, destPath),
    createDirectory: (dirPath) => ipcRenderer.invoke('document-cache:create-directory', dirPath)
  },

  // Schema Migration (for DBA)
  schema: {
    checkStatus: () => ipcRenderer.invoke('schema:check-status'),
    generateMigration: () => ipcRenderer.invoke('schema:generate-migration'),
    generateFull: (systemDb, jobDb) => ipcRenderer.invoke('schema:generate-full', systemDb, jobDb)
  },

  // Shell functions (open external URLs, etc.)
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
  }
});

console.log('DBx BOQ - Preload script loaded');
