/**
 * Vue composable for accessing Electron IPC API
 * Wraps window.electronAPI exposed by preload.js
 */

export function useElectronAPI() {
  // Check if running in Electron environment
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  if (!isElectron) {
    console.warn('Electron API not available - running in browser mode');
  }

  return {
    // Database operations
    db: {
      testConnection: (dbConfig) => window.electronAPI?.db.testConnection(dbConfig),
      saveConnection: (dbConfig) => window.electronAPI?.db.saveConnection(dbConfig),
      getSavedConnection: () => window.electronAPI?.db.getSavedConnection(),
      clearSavedConnection: () => window.electronAPI?.db.clearSavedConnection()
    },

    // Bill of Quantities (BOQ)
    boq: {
      getJobBill: (jobNo, costCentre, bLoad) =>
        window.electronAPI?.boq.getJobBill(jobNo, costCentre, bLoad),
      addItem: (billItem) =>
        window.electronAPI?.boq.addItem(billItem),
      updateItem: (billItem) =>
        window.electronAPI?.boq.updateItem(billItem),
      deleteItem: (jobNo, costCentre, bLoad, lineNumber) =>
        window.electronAPI?.boq.deleteItem(jobNo, costCentre, bLoad, lineNumber),
      getCostCentresWithBudgets: (jobNo) =>
        window.electronAPI?.boq.getCostCentresWithBudgets(jobNo),
      repriceBill: (jobNo, priceLevel, billDate) =>
        window.electronAPI?.boq.repriceBill(jobNo, priceLevel, billDate),
      explodeRecipe: (jobNo, costCentre, bLoad, priceCode, quantity, options) =>
        window.electronAPI?.boq.explodeRecipe(jobNo, costCentre, bLoad, priceCode, quantity, options),
      getLoads: (jobNo, costCentre) =>
        window.electronAPI?.boq.getLoads(jobNo, costCentre),
      createLoad: (jobNo, costCentre) =>
        window.electronAPI?.boq.createLoad(jobNo, costCentre),
      generateReport: (reportType, jobNo, costCentre) =>
        window.electronAPI?.boq.generateReport(reportType, jobNo, costCentre),
      getNominatedSuppliers: (costCentre) =>
        window.electronAPI?.boq.getNominatedSuppliers(costCentre),
      assignSupplierToLoad: (jobNo, costCentre, bLoad, supplier) =>
        window.electronAPI?.boq.assignSupplierToLoad(jobNo, costCentre, bLoad, supplier)
    },

    // BOQ Options
    boqOptions: {
      get: () => window.electronAPI?.boqOptions.get(),
      save: (options) => window.electronAPI?.boqOptions.save(options),
      update: (key, value) => window.electronAPI?.boqOptions.update(key, value),
      reset: () => window.electronAPI?.boqOptions.reset(),
      getDefaults: () => window.electronAPI?.boqOptions.getDefaults(),
      saveLastUsed: (lastUsed) => window.electronAPI?.boqOptions.saveLastUsed(lastUsed)
    },

    // Import Templates
    importTemplates: {
      getAll: () => window.electronAPI?.importTemplates.getAll(),
      get: (id) => window.electronAPI?.importTemplates.get(id),
      save: (template) => window.electronAPI?.importTemplates.save(template),
      delete: (id) => window.electronAPI?.importTemplates.delete(id)
    },

    // Global Settings
    settings: {
      // Companies
      getCompanies: () => window.electronAPI?.settings.getCompanies(),
      getCompany: (id) => window.electronAPI?.settings.getCompany(id),
      getCurrentCompany: () => window.electronAPI?.settings.getCurrentCompany(),
      saveCompany: (company) => window.electronAPI?.settings.saveCompany(company),
      deleteCompany: (id) => window.electronAPI?.settings.deleteCompany(id),
      switchCompany: (id) => window.electronAPI?.settings.switchCompany(id),
      // Users
      getUsers: () => window.electronAPI?.settings.getUsers(),
      getUser: (id) => window.electronAPI?.settings.getUser(id),
      getCurrentUser: () => window.electronAPI?.settings.getCurrentUser(),
      saveUser: (user) => window.electronAPI?.settings.saveUser(user),
      deleteUser: (id) => window.electronAPI?.settings.deleteUser(id),
      loginUser: (username, password) => window.electronAPI?.settings.loginUser(username, password),
      logoutUser: () => window.electronAPI?.settings.logoutUser(),
      // Application Settings
      getApplicationDefaults: () => window.electronAPI?.settings.getApplicationDefaults(),
      updateApplicationDefaults: (defaults) => window.electronAPI?.settings.updateApplicationDefaults(defaults),
      getImportExportSettings: () => window.electronAPI?.settings.getImportExportSettings(),
      updateImportExportSettings: (settings) => window.electronAPI?.settings.updateImportExportSettings(settings),
      getPdfSettings: () => window.electronAPI?.settings.getPdfSettings(),
      updatePdfSettings: (settings) => window.electronAPI?.settings.updatePdfSettings(settings),
      getUiPreferences: () => window.electronAPI?.settings.getUiPreferences(),
      updateUiPreferences: (preferences) => window.electronAPI?.settings.updateUiPreferences(preferences),
      getAll: () => window.electronAPI?.settings.getAll(),
      resetAll: () => window.electronAPI?.settings.resetAll(),
      // API Keys
      getApiKeys: () => window.electronAPI?.settings.getApiKeys(),
      updateApiKeys: (keys) => window.electronAPI?.settings.updateApiKeys(keys)
    },

    // Jobs
    jobs: {
      getList: (showArchived = false) => window.electronAPI?.jobs.getList(showArchived),
      getJob: (jobNo) => window.electronAPI?.jobs.getJob(jobNo),
      createJob: (jobData) => window.electronAPI?.jobs.createJob(jobData),
      updateJob: (jobData) => window.electronAPI?.jobs.updateJob(jobData),
      deleteJob: (jobNo) => window.electronAPI?.jobs.deleteJob(jobNo),
      restoreJob: (jobNo) => window.electronAPI?.jobs.restoreJob(jobNo),
      getStatuses: () => window.electronAPI?.jobs.getStatuses(),
      getEstimators: () => window.electronAPI?.jobs.getEstimators(),
      getSupervisors: () => window.electronAPI?.jobs.getSupervisors()
    },

    // Cost Centres
    costCentres: {
      getList: () => window.electronAPI?.costCentres.getList(),
      getWithBudget: (jobNo) => window.electronAPI?.costCentres.getWithBudget(jobNo)
    },

    // Contacts
    contacts: {
      getList: (contactType) => window.electronAPI?.contacts.getList(contactType),
      getContact: (code) => window.electronAPI?.contacts.getContact(code),
      createContact: (contactData) => window.electronAPI?.contacts.createContact(contactData),
      updateContact: (contactData) => window.electronAPI?.contacts.updateContact(contactData),
      getGroups: () => window.electronAPI?.contacts.getGroups()
    },

    // Suppliers
    suppliers: {
      getList: (showArchived) => window.electronAPI?.suppliers.getList(showArchived),
      getSupplier: (code) => window.electronAPI?.suppliers.getSupplier(code),
      createSupplier: (supplierData) => window.electronAPI?.suppliers.createSupplier(supplierData),
      updateSupplier: (supplierData) => window.electronAPI?.suppliers.updateSupplier(supplierData),
      deleteSupplier: (code) => window.electronAPI?.suppliers.deleteSupplier(code),
      getOrderHistory: (code) => window.electronAPI?.suppliers.getOrderHistory(code),
      getPaymentStrategies: () => window.electronAPI?.suppliers.getPaymentStrategies()
    },

    // Contact Groups
    contactGroups: {
      getList: () => window.electronAPI?.contactGroups.getList(),
      getGroup: (code) => window.electronAPI?.contactGroups.getGroup(code),
      createGroup: (groupData) => window.electronAPI?.contactGroups.createGroup(groupData)
    },

    // Supplier Groups
    supplierGroups: {
      getList: () => window.electronAPI?.supplierGroups.getList(),
      getGroup: (code) => window.electronAPI?.supplierGroups.getGroup(code),
      createGroup: (groupData) => window.electronAPI?.supplierGroups.createGroup(groupData)
    },

    // ABN Lookup
    abnLookup: {
      lookup: (abn, guid) => window.electronAPI?.abnLookup.lookup(abn, guid),
      searchByName: (businessName, guid, options) => window.electronAPI?.abnLookup.searchByName(businessName, guid, options),
      verify: (abn, expectedData, guid) => window.electronAPI?.abnLookup.verify(abn, expectedData, guid)
    },

    // Australia Post Address
    ausPost: {
      searchAddresses: (query) => window.electronAPI?.ausPost.searchAddresses(query),
      validateAddress: (addressData) => window.electronAPI?.ausPost.validateAddress(addressData)
    },

    // Catalogue
    catalogue: {
      getItems: (params) => window.electronAPI?.catalogue.getItems(params),
      getItem: (priceCode, priceLevel) => window.electronAPI?.catalogue.getItem(priceCode, priceLevel),
      getRecipe: (priceCode) => window.electronAPI?.catalogue.getRecipe(priceCode),
      // Catalogue Management
      getAllItems: (params) => window.electronAPI?.catalogue.getAllItems(params),
      getPerCodes: () => window.electronAPI?.catalogue.getPerCodes(),
      updateItem: (item) => window.electronAPI?.catalogue.updateItem(item),
      addItem: (item) => window.electronAPI?.catalogue.addItem(item),
      deleteItems: (priceCodes) => window.electronAPI?.catalogue.deleteItems(priceCodes),
      getItemUsage: (priceCode) => window.electronAPI?.catalogue.getItemUsage(priceCode),
      exportToCSV: (params) => window.electronAPI?.catalogue.exportCSV(params),
      // Recipe Management
      addRecipeComponent: (mainItem, subItem, quantity) => window.electronAPI?.catalogue.addRecipeComponent(mainItem, subItem, quantity),
      updateRecipeComponent: (mainItem, subItem, quantity) => window.electronAPI?.catalogue.updateRecipeComponent(mainItem, subItem, quantity),
      updateRecipeFormula: (mainItem, subItem, formula) => window.electronAPI?.catalogue.updateRecipeFormula(mainItem, subItem, formula),
      deleteRecipeComponent: (mainItem, subItem) => window.electronAPI?.catalogue.deleteRecipeComponent(mainItem, subItem),
      // Estimate Prices
      getEstimatePrices: (priceCode) => window.electronAPI?.catalogue.getEstimatePrices(priceCode),
      addEstimatePrice: (data) => window.electronAPI?.catalogue.addEstimatePrice(data),
      updateEstimatePrice: (data) => window.electronAPI?.catalogue.updateEstimatePrice(data),
      deleteEstimatePrice: (priceCode, priceLevel, validFrom) => window.electronAPI?.catalogue.deleteEstimatePrice(priceCode, priceLevel, validFrom),
      // Bulk Price Changes
      getBulkPriceItems: (criteria) => window.electronAPI?.catalogue.getBulkPriceItems(criteria),
      applyBulkPriceChanges: (data) => window.electronAPI?.catalogue.applyBulkPriceChanges(data),
      // Import
      importItems: (data) => window.electronAPI?.catalogue.importItems(data)
    },

        // Supplier Prices
    supplierPrices: {
      get: (itemCode) => window.electronAPI?.supplierPrices.get(itemCode),
      add: (priceData) => window.electronAPI?.supplierPrices.add(priceData),
      update: (priceData) => window.electronAPI?.supplierPrices.update(priceData),
      delete: (itemCode, supplier, reference) =>
        window.electronAPI?.supplierPrices.delete(itemCode, supplier, reference),
      getSuppliers: () => window.electronAPI?.supplierPrices.getSuppliers()
    },

    // Catalogue Templates & Specifications
    catalogueTemplates: {
      getTemplate: (priceCode) =>
        window.electronAPI?.catalogueTemplates.getTemplate(priceCode),
      updateTemplate: (data) =>
        window.electronAPI?.catalogueTemplates.updateTemplate(data),
      getSpecification: (priceCode) =>
        window.electronAPI?.catalogueTemplates.getSpecification(priceCode),
      updateSpecification: (data) =>
        window.electronAPI?.catalogueTemplates.updateSpecification(data)
    },

    // Catalogue Images
    catalogueImages: {
      getImages: (priceCode) =>
        window.electronAPI?.catalogueImages.getImages(priceCode),
      addImage: (data) =>
        window.electronAPI?.catalogueImages.addImage(data),
      updateImage: (data) =>
        window.electronAPI?.catalogueImages.updateImage(data),
      deleteImage: (priceCode, index) =>
        window.electronAPI?.catalogueImages.deleteImage(priceCode, index),
      setPrimaryImage: (priceCode, index) =>
        window.electronAPI?.catalogueImages.setPrimaryImage(priceCode, index),
      copyImages: (sourceCode, targetCode) =>
        window.electronAPI?.catalogueImages.copyImages(sourceCode, targetCode),
      reorderImages: (priceCode, reorderedImages) =>
        window.electronAPI?.catalogueImages.reorderImages(priceCode, reorderedImages)
    },

    // Purchase Orders
    purchaseOrders: {
      getJobs: () => window.electronAPI?.purchaseOrders.getJobs(),
      getOrdersForJob: (jobNo) => window.electronAPI?.purchaseOrders.getOrdersForJob(jobNo),
      getOrderLineItems: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderLineItems(orderNumber),
      renderPreview: (orderNumber, settings) => window.electronAPI?.purchaseOrders.renderPreview(orderNumber, settings),
      renderPDF: (orderNumber, settings) => window.electronAPI?.purchaseOrders.renderPDF(orderNumber, settings),
      getOrderSummary: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderSummary(orderNumber),
      getCostCentres: () => window.electronAPI?.purchaseOrders.getCostCentres(),
      getJobsWithCounts: () => window.electronAPI?.purchaseOrders.getJobsWithCounts(),
      getJobsWithOrderCounts: () => window.electronAPI?.purchaseOrders.getJobsWithCounts(), // Alias for getJobsWithCounts
      getPreferredSuppliers: (costCentre) => window.electronAPI?.purchaseOrders.getPreferredSuppliers(costCentre),
      getSuppliersForCostCentre: (costCentre) => window.electronAPI?.purchaseOrders.getSuppliersForCostCentre(costCentre),
      updateOrder: (orderNumber, updates) => window.electronAPI?.purchaseOrders.updateOrder(orderNumber, updates),
      logOrder: (orderNumber, supplier, delDate, note) => window.electronAPI?.purchaseOrders.logOrder(orderNumber, supplier, delDate, note),
      getOrderDetails: (orderNumber) => window.electronAPI?.purchaseOrders.getOrderDetails(orderNumber),
      batchRenderPDF: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchRenderPDF(orderNumbers, settings),
      batchPrint: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchPrint(orderNumbers, settings),
      batchEmail: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchEmail(orderNumbers, settings),
      batchSavePDF: (orderNumbers, settings) => window.electronAPI?.purchaseOrders.batchSavePDF(orderNumbers, settings),
      getAllSuppliers: () => window.electronAPI?.purchaseOrders.getAllSuppliers(),
      addNominatedSupplier: (costCentre, supplierCode) => window.electronAPI?.purchaseOrders.addNominatedSupplier(costCentre, supplierCode),
      removeNominatedSupplier: (costCentre, supplierCode) => window.electronAPI?.purchaseOrders.removeNominatedSupplier(costCentre, supplierCode),
      ensureStatusColumn: () => window.electronAPI?.purchaseOrders.ensureStatusColumn(),
      cancelOrder: (orderNumber, reason) => window.electronAPI?.purchaseOrders.cancelOrder(orderNumber, reason),
      sendCancellationEmail: (orderNumber, settings) => window.electronAPI?.purchaseOrders.sendCancellationEmail(orderNumber, settings)
    },

    // Email Settings
    emailSettings: {
      get: () => window.electronAPI?.emailSettings.get(),
      save: (settings) => window.electronAPI?.emailSettings.save(settings),
      update: (key, value) => window.electronAPI?.emailSettings.update(key, value),
      reset: () => window.electronAPI?.emailSettings.reset(),
      getSMTPConfig: () => window.electronAPI?.emailSettings.getSMTPConfig(),
      isConfigured: () => window.electronAPI?.emailSettings.isConfigured()
    },

    // Email
    email: {
      sendTest: (to, settings) => window.electronAPI?.email.sendTest(to, settings),
      sendPurchaseOrder: (orderNumber, to, subject, body, attachments) =>
        window.electronAPI?.email.sendPurchaseOrder(orderNumber, to, subject, body, attachments),
      sendGeneral: (params) => window.electronAPI?.email.sendGeneral(params)
    },

    // Documents (shared MSSQL metadata)
    documents: {
      get: (entityType, entityCode) => window.electronAPI?.documents.get(entityType, entityCode),
      add: (documentData) => window.electronAPI?.documents.add(documentData),
      update: (documentId, updates) => window.electronAPI?.documents.update(documentId, updates),
      delete: (documentId, deletedBy) => window.electronAPI?.documents.delete(documentId, deletedBy),
      getByType: (documentType) => window.electronAPI?.documents.getByType(documentType),
      search: (searchTerm, entityType, documentType) =>
        window.electronAPI?.documents.search(searchTerm, entityType, documentType),
      logCommunication: (commData) => window.electronAPI?.documents.logCommunication(commData),
      checkTableExists: () => window.electronAPI?.documents.checkTableExists(),
      initialize: () => window.electronAPI?.documents.initialize(),
      getByJob: (jobNo) => window.electronAPI?.documents.getByJob(jobNo),
      getByBOQItem: (params) => window.electronAPI?.documents.getByBOQItem(params),
      getByPurchaseOrder: (params) => window.electronAPI?.documents.getByPurchaseOrder(params),
      link: (linkData) => window.electronAPI?.documents.link(linkData),
      unlink: (documentId) => window.electronAPI?.documents.unlink(documentId)
    },

    // Document Settings (local path configuration)
    documentSettings: {
      get: () => window.electronAPI?.documentSettings.get(),
      save: (settings) => window.electronAPI?.documentSettings.save(settings),
      getBasePath: () => window.electronAPI?.documentSettings.getBasePath(),
      setBasePath: (basePath) => window.electronAPI?.documentSettings.setBasePath(basePath),
      isConfigured: () => window.electronAPI?.documentSettings.isConfigured(),
      buildPath: (entityType, entityCode, documentType) =>
        window.electronAPI?.documentSettings.buildPath(entityType, entityCode, documentType),
      getFullPath: (relativePath) => window.electronAPI?.documentSettings.getFullPath(relativePath),
      ensureFolder: (entityType, entityCode, documentType) =>
        window.electronAPI?.documentSettings.ensureFolder(entityType, entityCode, documentType),
      validatePath: (pathToCheck) => window.electronAPI?.documentSettings.validatePath(pathToCheck),
      listFiles: (dirPath) => window.electronAPI?.documentSettings.listFiles(dirPath),
      reset: () => window.electronAPI?.documentSettings.reset(),
      browseFolder: (defaultPath) => window.electronAPI?.documentSettings.browseFolder(defaultPath),
      browseFile: (defaultPath, filters) => window.electronAPI?.documentSettings.browseFile(defaultPath, filters)
    },

    // Document Cache (SQLite file listing cache)
    documentCache: {
      initialize: () => window.electronAPI?.documentCache.initialize(),
      scan: (basePath, relativePath, entityType, entityCode, documentType) =>
        window.electronAPI?.documentCache.scan(basePath, relativePath, entityType, entityCode, documentType),
      getFiles: (entityType, entityCode, documentType) =>
        window.electronAPI?.documentCache.getFiles(entityType, entityCode, documentType),
      search: (searchTerm, entityType) =>
        window.electronAPI?.documentCache.search(searchTerm, entityType),
      getFilesInPath: (basePath, relativePath) =>
        window.electronAPI?.documentCache.getFilesInPath(basePath, relativePath),
      clear: (basePath) => window.electronAPI?.documentCache.clear(basePath),
      getStats: () => window.electronAPI?.documentCache.getStats(),
      needsRefresh: (maxAgeMinutes) => window.electronAPI?.documentCache.needsRefresh(maxAgeMinutes),
      listFiles: (dirPath) => window.electronAPI?.documentCache.listFiles(dirPath),
      openFile: (filePath) => window.electronAPI?.documentCache.openFile(filePath),
      showInFolder: (itemPath) => window.electronAPI?.documentCache.showInFolder(itemPath),
      copyFile: (sourcePath, destPath) => window.electronAPI?.documentCache.copyFile(sourcePath, destPath),
      createDirectory: (dirPath) => window.electronAPI?.documentCache.createDirectory(dirPath)
    },

    // Schema Migration (for DBA)
    schema: {
      checkStatus: () => window.electronAPI?.schema.checkStatus(),
      generateMigration: () => window.electronAPI?.schema.generateMigration(),
      generateFull: (systemDb, jobDb) => window.electronAPI?.schema.generateFull(systemDb, jobDb)
    },

    // Utility
    isElectron
  };
}
