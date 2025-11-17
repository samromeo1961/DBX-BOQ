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
      exportToCSV: (params) => window.electronAPI?.catalogue.exportCSV(params),
      // Recipe Management
      addRecipeComponent: (mainItem, subItem, quantity) => window.electronAPI?.catalogue.addRecipeComponent(mainItem, subItem, quantity),
      updateRecipeComponent: (mainItem, subItem, quantity) => window.electronAPI?.catalogue.updateRecipeComponent(mainItem, subItem, quantity),
      updateRecipeFormula: (mainItem, subItem, formula) => window.electronAPI?.catalogue.updateRecipeFormula(mainItem, subItem, formula),
      deleteRecipeComponent: (mainItem, subItem) => window.electronAPI?.catalogue.deleteRecipeComponent(mainItem, subItem)
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
      ensureStatusColumn: () => window.electronAPI?.purchaseOrders.ensureStatusColumn()
    },

    // Utility
    isElectron
  };
}
