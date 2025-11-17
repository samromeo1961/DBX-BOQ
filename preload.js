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
    getGroups: () => ipcRenderer.invoke('contacts:get-groups')
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
    exportCSV: (params) => ipcRenderer.invoke('catalogue:export-csv', params),
    // Recipe Management
    addRecipeComponent: (mainItem, subItem, quantity) => ipcRenderer.invoke('catalogue:add-recipe-component', mainItem, subItem, quantity),
    updateRecipeComponent: (mainItem, subItem, quantity) => ipcRenderer.invoke('catalogue:update-recipe-component', mainItem, subItem, quantity),
    updateRecipeFormula: (mainItem, subItem, formula) => ipcRenderer.invoke('catalogue:update-recipe-formula', mainItem, subItem, formula),
    deleteRecipeComponent: (mainItem, subItem) => ipcRenderer.invoke('catalogue:delete-recipe-component', mainItem, subItem)
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
    ensureStatusColumn: () => ipcRenderer.invoke('po:ensure-status-column')
  }
});

console.log('DBx BOQ - Preload script loaded');
