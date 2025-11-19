<!--
  CatalogueImportModal.vue

  A 4-step wizard for importing catalogue items from CSV/Excel files.
  Based on the legacy Databuild SPLAT (Supplier Price List Automatic Transfer) system.

  Features:
  - Step 1: File upload and format configuration
  - Step 2: Column mapping with template support
  - Step 3: Data preview and item linking
  - Step 4: Review and execute import

  Supports:
  - CSV files with configurable separators
  - Excel files (.xlsx)
  - Template save/load for recurring imports
  - Auto-matching to existing catalogue items
  - Create new items or update existing ones
  - Import to PriceList, SuppliersPrices, or Prices tables
-->
<template>
  <div v-if="show" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);" @click.self="close">
    <div class="modal-dialog modal-xl" @click.stop>
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-upload me-2"></i>
            Import Catalogue
          </h5>
          <button type="button" class="btn-close" @click="close"></button>
        </div>

        <div class="modal-body">
          <!-- Step Indicator -->
          <div class="mb-4">
            <ul class="nav nav-pills">
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 1 }"
                  @click="step = 1"
                  :disabled="step < 1"
                >
                  1. Upload File
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 2 }"
                  @click="step = 2"
                  :disabled="step < 2"
                >
                  2. Map Columns
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 3 }"
                  @click="step = 3"
                  :disabled="step < 3"
                >
                  3. Link Items
                </button>
              </li>
              <li class="nav-item">
                <button
                  class="nav-link"
                  :class="{ active: step === 4 }"
                  :disabled="step < 4"
                >
                  4. Review & Import
                </button>
              </li>
            </ul>
          </div>

          <!-- Step 1: Upload File & Configure -->
          <div v-if="step === 1">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Upload a CSV or Excel file containing catalogue items or supplier prices
            </div>

            <!-- Import Type Selection -->
            <div class="mb-3">
              <label class="form-label">Import Type *</label>
              <div class="btn-group w-100" role="group">
                <input type="radio" class="btn-check" name="importType" id="typeSupplierPrices"
                       value="supplierPrices" v-model="importConfig.importType">
                <label class="btn btn-outline-primary" for="typeSupplierPrices">
                  <i class="bi bi-truck me-1"></i>
                  Supplier Prices
                </label>

                <input type="radio" class="btn-check" name="importType" id="typeCatalogueItems"
                       value="catalogueItems" v-model="importConfig.importType">
                <label class="btn btn-outline-primary" for="typeCatalogueItems">
                  <i class="bi bi-box-seam me-1"></i>
                  Catalogue Items
                </label>

                <input type="radio" class="btn-check" name="importType" id="typeEstimatePrices"
                       value="estimatePrices" v-model="importConfig.importType">
                <label class="btn btn-outline-primary" for="typeEstimatePrices">
                  <i class="bi bi-currency-dollar me-1"></i>
                  Estimate Prices
                </label>
              </div>
            </div>

            <!-- Supplier Selection (for Supplier Prices) -->
            <div v-if="importConfig.importType === 'supplierPrices'" class="mb-3">
              <label class="form-label">Supplier *</label>
              <SearchableSelect
                v-model="importConfig.supplier"
                :options="supplierOptions"
                placeholder="Select supplier..."
                :allowEmpty="false"
              />
            </div>

            <!-- Price Level Selection (for Estimate Prices) -->
            <div v-if="importConfig.importType === 'estimatePrices'" class="mb-3">
              <label class="form-label">Price Level *</label>
              <select v-model="importConfig.priceLevel" class="form-select">
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
                <option value="5">Level 5</option>
              </select>
            </div>

            <!-- File Upload -->
            <div class="mb-3">
              <label class="form-label">Select File *</label>
              <input
                type="file"
                class="form-control"
                @change="onFileSelected"
                accept=".csv,.xlsx,.xls"
                ref="fileInput"
              />
              <small class="form-text text-muted">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </small>
            </div>

            <div v-if="fileInfo.name" class="mb-3">
              <div class="card">
                <div class="card-body">
                  <h6 class="card-title">
                    <i class="bi bi-file-earmark-text me-2"></i>
                    {{ fileInfo.name }}
                  </h6>
                  <p class="card-text mb-1">
                    <small class="text-muted">
                      Size: {{ formatFileSize(fileInfo.size) }} |
                      Type: {{ fileInfo.type || 'Unknown' }}
                    </small>
                  </p>
                </div>
              </div>
            </div>

            <!-- CSV Configuration (only for CSV files) -->
            <div v-if="fileInfo.isCsv" class="mb-3">
              <label class="form-label">CSV Options</label>
              <div class="row g-2">
                <div class="col-md-4">
                  <label class="form-label small">Separator</label>
                  <select v-model="importConfig.separator" class="form-select form-select-sm">
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="|">Pipe (|)</option>
                    <option value="\t">Tab</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label small">Header Rows</label>
                  <input
                    type="number"
                    v-model.number="importConfig.headerRows"
                    class="form-control form-control-sm"
                    min="0"
                    max="10"
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label small">&nbsp;</label>
                  <div class="form-check">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      v-model="importConfig.stripQuotes"
                      id="stripQuotes"
                    />
                    <label class="form-check-label small" for="stripQuotes">
                      Strip Quotes
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <!-- Template Selection -->
            <div class="mb-3">
              <label class="form-label">Import Template (Optional)</label>
              <div class="input-group">
                <select v-model="selectedTemplate" class="form-select">
                  <option value="">-- No Template --</option>
                  <option v-for="template in savedTemplates" :key="template.id" :value="template.id">
                    {{ template.name }}
                  </option>
                </select>
                <button
                  class="btn btn-outline-secondary"
                  @click="loadTemplate"
                  :disabled="!selectedTemplate"
                >
                  <i class="bi bi-upload"></i>
                  Load
                </button>
              </div>
              <small class="form-text text-muted">
                Load a saved template to reuse column mappings
              </small>
            </div>

            <div v-if="fileInfo.name && filePreview.length > 0" class="mb-3">
              <label class="form-label">File Preview (First 5 rows)</label>
              <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
                <table class="table table-sm table-bordered">
                  <thead>
                    <tr>
                      <th v-for="(col, index) in filePreview[0]" :key="index">
                        Column {{ index + 1 }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in filePreview.slice(0, 5)" :key="rowIndex">
                      <td v-for="(cell, cellIndex) in row" :key="cellIndex">
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Step 2: Map Columns -->
          <div v-if="step === 2">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Map columns from your file to database fields
            </div>

            <div class="row mb-3">
              <div class="col-md-6">
                <label class="form-label">Template Name (to save mapping)</label>
                <input
                  type="text"
                  v-model="importConfig.templateName"
                  class="form-control"
                  placeholder="e.g., Supplier ABC Format"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label">Price Factor</label>
                <input
                  type="number"
                  v-model.number="importConfig.priceFactor"
                  class="form-control"
                  min="0"
                  step="0.01"
                  placeholder="1.0"
                />
                <small class="form-text text-muted">
                  Multiply all prices by this factor (e.g., 1.1 for 10% markup)
                </small>
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th>Database Field</th>
                    <th>File Column</th>
                    <th>Sample Data</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in importFields" :key="field.key">
                    <td>
                      <strong>{{ field.label }}</strong>
                      <span v-if="field.required" class="text-danger">*</span>
                      <br>
                      <small class="text-muted">{{ field.description }}</small>
                    </td>
                    <td>
                      <select v-model="columnMapping[field.key]" class="form-select form-select-sm">
                        <option value="">-- Not Mapped --</option>
                        <option v-for="(col, index) in fileColumns" :key="index" :value="index">
                          Column {{ index + 1 }}: {{ col }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <small v-if="columnMapping[field.key] !== ''">
                        {{ getSampleData(columnMapping[field.key]) }}
                      </small>
                      <small v-else class="text-muted">-</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Required fields:</strong> Reference and Description must be mapped
            </div>

            <!-- Default Values for Unmapped Fields -->
            <div class="card">
              <div class="card-header">
                <h6 class="mb-0">Default Values for Unmapped Fields</h6>
              </div>
              <div class="card-body">
                <div class="row g-3">
                  <!-- Valid From Date (for supplier prices and estimate prices) -->
                  <div v-if="importConfig.importType === 'supplierPrices' || importConfig.importType === 'estimatePrices'" class="col-md-6">
                    <label class="form-label">
                      Valid From Date
                      <span v-if="columnMapping.validFrom === ''" class="text-warning ms-1">
                        <i class="bi bi-exclamation-circle"></i>
                        (Not mapped - using default)
                      </span>
                    </label>
                    <input
                      type="date"
                      v-model="importConfig.validFrom"
                      class="form-control"
                      :class="{ 'border-warning': columnMapping.validFrom === '' }"
                    />
                    <small class="text-muted">
                      This date will be used for items without a mapped Valid From column
                    </small>
                  </div>

                  <!-- Default Cost Centre -->
                  <div class="col-md-6">
                    <label class="form-label">
                      Default Cost Centre
                      <span v-if="columnMapping.costCentre === ''" class="text-info ms-1">
                        <i class="bi bi-info-circle"></i>
                        (Optional)
                      </span>
                    </label>
                    <SearchableSelect
                      v-model="importConfig.defaultCostCentre"
                      :options="costCentreOptions"
                      placeholder="Select cost centre..."
                      :class="{ 'border-info': columnMapping.costCentre === '' }"
                    />
                    <small class="text-muted">
                      Used for items without a mapped Cost Centre column
                    </small>
                  </div>

                  <!-- Default Unit -->
                  <div class="col-md-6">
                    <label class="form-label">
                      Default Unit
                      <span v-if="columnMapping.units === ''" class="text-info ms-1">
                        <i class="bi bi-info-circle"></i>
                        (Optional)
                      </span>
                    </label>
                    <select
                      v-model="importConfig.defaultUnit"
                      class="form-select"
                      :class="{ 'border-info': columnMapping.units === '' }"
                    >
                      <option value="">-- None --</option>
                      <option v-for="unit in perCodes" :key="unit.Code" :value="unit.Printout">
                        {{ unit.Printout }}
                      </option>
                    </select>
                    <small class="text-muted">
                      Used for items without a mapped Unit column
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Link Items -->
          <div v-if="step === 3">
            <div class="alert alert-info">
              <i class="bi bi-info-circle me-2"></i>
              Review imported data and link to existing catalogue items
            </div>

            <div class="mb-3 d-flex justify-content-between align-items-center">
              <div>
                <strong>{{ importedData.length }} items loaded</strong>
                <span class="ms-2 text-muted">
                  ({{ linkedCount }} linked, {{ unlinkedCount }} unlinked)
                </span>
              </div>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" @click="autoMatchLinks">
                  <i class="bi bi-magic"></i>
                  Auto-Match
                </button>
                <button class="btn btn-outline-secondary" @click="shiftReferencesToLinks">
                  <i class="bi bi-arrow-right"></i>
                  Copy References to Links
                </button>
                <button class="btn btn-outline-danger" @click="clearAllLinks">
                  <i class="bi bi-x-circle"></i>
                  Clear All Links
                </button>
              </div>
            </div>

            <div class="import-grid" style="height: 500px; width: 100%;">
              <ag-grid-vue
                class="ag-theme-quartz"
                :columnDefs="linkingColumnDefs"
                :rowData="importedData"
                :defaultColDef="linkingDefaultColDef"
                :rowSelection="'multiple'"
                @grid-ready="onLinkingGridReady"
                @cell-value-changed="onLinkCellChanged"
                style="height: 100%; width: 100%;"
              />
            </div>
          </div>

          <!-- Step 4: Review & Import -->
          <div v-if="step === 4">
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Review Summary:</strong> Confirm the changes before importing
            </div>

            <div class="row mb-3">
              <div class="col-md-4">
                <div class="card text-center">
                  <div class="card-body">
                    <h3 class="text-primary">{{ newItemsCount }}</h3>
                    <p class="mb-0">New Items</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card text-center">
                  <div class="card-body">
                    <h3 class="text-info">{{ updateItemsCount }}</h3>
                    <p class="mb-0">Updates</p>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card text-center">
                  <div class="card-body">
                    <h3 class="text-danger">{{ unlinkedCount }}</h3>
                    <p class="mb-0">Unlinked (Skipped)</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Import Options</label>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="importConfig.createNewItems"
                  id="createNewItems"
                />
                <label class="form-check-label" for="createNewItems">
                  Create new catalogue items for unlinked references
                </label>
              </div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="importConfig.updateDescriptions"
                  id="updateDescriptions"
                />
                <label class="form-check-label" for="updateDescriptions">
                  Update descriptions for existing items
                </label>
              </div>
              <div class="form-check">
                <input
                  class="form-check-input"
                  type="checkbox"
                  v-model="importConfig.updatePrices"
                  id="updatePrices"
                />
                <label class="form-check-label" for="updatePrices">
                  Update prices for existing items
                </label>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Default Values</label>
              <div class="row g-2">
                <div class="col-md-4">
                  <label class="form-label small">Default Cost Centre</label>
                  <SearchableSelect
                    v-model="importConfig.defaultCostCentre"
                    :options="costCentreOptions"
                    placeholder="Select cost centre..."
                    :allowEmpty="true"
                  />
                </div>
                <div class="col-md-4">
                  <label class="form-label small">Default Unit</label>
                  <select v-model="importConfig.defaultUnit" class="form-select form-select-sm">
                    <option value="">-- None --</option>
                    <option v-for="unit in perCodes" :key="unit.Code" :value="unit.Code">
                      {{ unit.Printout }}
                    </option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label small">Valid From Date</label>
                  <input
                    type="date"
                    v-model="importConfig.validFrom"
                    class="form-control form-control-sm"
                  />
                </div>
              </div>
            </div>

            <div class="preview-grid" style="height: 350px; width: 100%;">
              <ag-grid-vue
                class="ag-theme-quartz"
                :columnDefs="reviewColumnDefs"
                :rowData="reviewData"
                :defaultColDef="reviewDefaultColDef"
                style="height: 100%; width: 100%;"
              />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="me-auto text-muted small" v-if="step === 4">
            <i class="bi bi-info-circle me-1"></i>
            {{ importedData.length }} items will be processed
          </div>

          <button type="button" class="btn btn-secondary" @click="close">
            Cancel
          </button>

          <button
            v-if="step > 1"
            type="button"
            class="btn btn-outline-secondary"
            @click="step--"
          >
            <i class="bi bi-arrow-left me-1"></i>
            Back
          </button>

          <button
            v-if="step === 1"
            type="button"
            class="btn btn-primary"
            @click="parseFile"
            :disabled="!canProceedFromStep1"
          >
            Next: Map Columns
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="step === 2"
            type="button"
            class="btn btn-primary"
            @click="processMapping"
            :disabled="!canProceedFromStep2"
          >
            Next: Link Items
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="step === 3"
            type="button"
            class="btn btn-primary"
            @click="prepareReview"
          >
            Next: Review & Import
            <i class="bi bi-arrow-right ms-1"></i>
          </button>

          <button
            v-if="step === 4"
            type="button"
            class="btn btn-success"
            @click="executeImport"
            :disabled="importing"
          >
            <span v-if="!importing">
              <i class="bi bi-check-lg me-1"></i>
              Import {{ importedData.length }} Items
            </span>
            <span v-else>
              <span class="spinner-border spinner-border-sm me-1"></span>
              Importing...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '@/composables/useElectronAPI';
import SearchableSelect from '../common/SearchableSelect.vue';
import * as XLSX from 'xlsx';

export default {
  name: 'CatalogueImportModal',
  components: {
    AgGridVue,
    SearchableSelect
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'imported'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    // State
    const step = ref(1);
    const importing = ref(false);
    const fileInput = ref(null);
    const suppliers = ref([]);
    const costCentres = ref([]);
    const perCodes = ref([]);
    const catalogueItems = ref([]);
    const savedTemplates = ref([]);
    const selectedTemplate = ref('');

    // File info
    const fileInfo = ref({
      name: '',
      size: 0,
      type: '',
      isCsv: false,
      isExcel: false
    });

    const filePreview = ref([]);
    const fileColumns = ref([]);
    const rawFileData = ref(null);

    // Import configuration
    const importConfig = ref({
      importType: 'supplierPrices',
      supplier: '',
      priceLevel: '1',
      separator: ',',
      headerRows: 1,
      stripQuotes: true,
      templateName: '',
      priceFactor: 1.0,
      createNewItems: true,
      updateDescriptions: false,
      updatePrices: true,
      defaultCostCentre: '',
      defaultUnit: '',
      validFrom: new Date().toISOString().split('T')[0]
    });

    // Column mapping (field key -> file column index)
    const columnMapping = ref({
      reference: '',
      description: '',
      amount: '',
      units: '',
      costCentre: '',
      validFrom: '',
      comments: '',
      area: ''
    });

    // Imported data after mapping
    const importedData = ref([]);

    // Grid API references
    const linkingGridApi = ref(null);

    // Computed properties
    const supplierOptions = computed(() => {
      return suppliers.value.map(s => ({
        value: s.Code,
        label: `${s.Code} - ${s.Name}`
      }));
    });

    const costCentreOptions = computed(() => {
      return costCentres.value.map(cc => ({
        value: cc.Code,
        label: `${cc.Code} - ${cc.Name}`
      }));
    });

    const canProceedFromStep1 = computed(() => {
      if (!fileInfo.value.name) return false;
      if (importConfig.value.importType === 'supplierPrices' && !importConfig.value.supplier) return false;
      return true;
    });

    const canProceedFromStep2 = computed(() => {
      return columnMapping.value.reference !== '' && columnMapping.value.description !== '';
    });

    const linkedCount = computed(() => {
      return importedData.value.filter(item => item.linkTo).length;
    });

    const unlinkedCount = computed(() => {
      return importedData.value.filter(item => !item.linkTo).length;
    });

    const newItemsCount = computed(() => {
      if (!importConfig.value.createNewItems) return 0;
      return unlinkedCount.value;
    });

    const updateItemsCount = computed(() => {
      return linkedCount.value;
    });

    const reviewData = computed(() => {
      return importedData.value.map(item => ({
        ...item,
        action: item.linkTo ? 'Update' : (importConfig.value.createNewItems ? 'Create' : 'Skip')
      }));
    });

    // Import fields based on import type
    const importFields = computed(() => {
      const baseFields = [
        { key: 'reference', label: 'Reference', description: 'Supplier item code or Databuild code', required: true },
        { key: 'description', label: 'Description', description: 'Item description', required: true }
      ];

      if (importConfig.value.importType === 'supplierPrices') {
        return [
          ...baseFields,
          { key: 'amount', label: 'Price', description: 'Supplier price', required: false },
          { key: 'units', label: 'Units', description: 'Unit of measure', required: false },
          { key: 'costCentre', label: 'Cost Centre', description: 'Cost centre code', required: false },
          { key: 'validFrom', label: 'Valid From', description: 'Price valid from date', required: false },
          { key: 'comments', label: 'Comments', description: 'Additional notes', required: false }
        ];
      } else if (importConfig.value.importType === 'catalogueItems') {
        return [
          ...baseFields,
          { key: 'costCentre', label: 'Cost Centre', description: 'Cost centre code', required: false },
          { key: 'units', label: 'Unit', description: 'Unit of measure code', required: false },
          { key: 'amount', label: 'Price', description: 'Default price', required: false }
        ];
      } else {
        // Estimate prices
        return [
          ...baseFields,
          { key: 'amount', label: 'Price', description: `Price for Level ${importConfig.value.priceLevel}`, required: false },
          { key: 'units', label: 'Unit', description: 'Unit of measure', required: false },
          { key: 'costCentre', label: 'Cost Centre', description: 'Cost centre code', required: false },
          { key: 'validFrom', label: 'Valid From', description: 'Price valid from date', required: false }
        ];
      }
    });

    // AG Grid column definitions
    const linkingColumnDefs = ref([
      {
        headerName: 'Supplier Ref',
        field: 'reference',
        width: 120,
        pinned: 'left'
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 2,
        minWidth: 200,
        editable: true
      },
      {
        headerName: 'Link To Catalogue Item',
        field: 'linkTo',
        width: 150,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: params => ({
          values: ['', ...catalogueItems.value.map(item => item.PriceCode)]
        }),
        cellStyle: params => {
          if (!params.value) {
            return { backgroundColor: '#fff3cd' }; // Warning yellow for unlinked
          }
          return null;
        },
        tooltipValueGetter: () => 'Select which Databuild catalogue item this supplier item should link to'
      },
      {
        headerName: 'DB Description',
        field: 'dbDescription',
        flex: 2,
        minWidth: 200
      },
      {
        headerName: 'Price',
        field: 'price',
        width: 100,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${params.value.toFixed(2)}` : ''
      },
      {
        headerName: 'Unit',
        field: 'unit',
        width: 80
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 100,
        cellRenderer: params => {
          if (params.data.linkTo) {
            return '<span class="badge bg-success">Linked</span>';
          } else {
            return '<span class="badge bg-warning text-dark">Unlinked</span>';
          }
        }
      }
    ]);

    const linkingDefaultColDef = ref({
      sortable: true,
      resizable: true,
      filter: true
    });

    const reviewColumnDefs = ref([
      {
        headerName: 'Action',
        field: 'action',
        width: 100,
        cellRenderer: params => {
          if (params.value === 'Create') {
            return '<span class="badge bg-success">Create</span>';
          } else if (params.value === 'Update') {
            return '<span class="badge bg-info">Update</span>';
          } else {
            return '<span class="badge bg-secondary">Skip</span>';
          }
        }
      },
      {
        headerName: 'Reference',
        field: 'reference',
        width: 120
      },
      {
        headerName: 'Description',
        field: 'description',
        flex: 2,
        minWidth: 200
      },
      {
        headerName: 'Link To',
        field: 'linkTo',
        width: 120
      },
      {
        headerName: 'Price',
        field: 'price',
        width: 100,
        type: 'numericColumn',
        valueFormatter: params => params.value ? `$${(params.value * importConfig.value.priceFactor).toFixed(2)}` : ''
      }
    ]);

    const reviewDefaultColDef = ref({
      sortable: true,
      resizable: true,
      filter: true
    });

    // Methods
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function onFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;

      fileInfo.value = {
        name: file.name,
        size: file.size,
        type: file.type,
        isCsv: file.name.toLowerCase().endsWith('.csv'),
        isExcel: file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
      };

      rawFileData.value = file;

      // Auto-preview first few rows
      previewFile(file);
    }

    async function previewFile(file) {
      try {
        if (fileInfo.value.isCsv) {
          const text = await file.text();
          const lines = text.split('\n').filter(line => line.trim());
          const separator = importConfig.value.separator;

          filePreview.value = lines.slice(importConfig.value.headerRows, importConfig.value.headerRows + 5).map(line => {
            return line.split(separator).map(cell =>
              importConfig.value.stripQuotes ? cell.replace(/^"|"$/g, '').trim() : cell.trim()
            );
          });

          // Extract column headers
          if (importConfig.value.headerRows > 0) {
            fileColumns.value = lines[importConfig.value.headerRows - 1].split(separator).map(cell =>
              importConfig.value.stripQuotes ? cell.replace(/^"|"$/g, '').trim() : cell.trim()
            );
          } else {
            fileColumns.value = filePreview.value[0].map((_, index) => `Column ${index + 1}`);
          }
        }
      } catch (error) {
        console.error('Error previewing file:', error);
        alert('Error reading file: ' + error.message);
      }
    }

    async function parseFile() {
      try {
        if (fileInfo.value.isCsv) {
          // Parse CSV file
          const text = await rawFileData.value.text();
          const lines = text.split('\n').filter(line => line.trim());
          const separator = importConfig.value.separator;

          // Extract column headers
          const headerLines = lines.slice(0, importConfig.value.headerRows);
          if (headerLines.length > 0) {
            fileColumns.value = headerLines[headerLines.length - 1]
              .split(separator)
              .map(cell => importConfig.value.stripQuotes ? cell.replace(/^"|"$/g, '').trim() : cell.trim());
          }

          // Extract data rows
          const dataLines = lines.slice(importConfig.value.headerRows);
          filePreview.value = dataLines.map(line => {
            return line.split(separator).map(cell =>
              importConfig.value.stripQuotes ? cell.replace(/^"|"$/g, '').trim() : cell.trim()
            );
          });

          step.value = 2;

        } else if (fileInfo.value.isExcel) {
          // Parse Excel file
          const arrayBuffer = await rawFileData.value.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });

          // Get the first worksheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON array (array of arrays)
          const data = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,  // Return array of arrays instead of objects
            raw: false,  // Format values as strings
            defval: ''   // Default value for empty cells
          });

          if (data.length === 0) {
            alert('Excel file is empty');
            return;
          }

          // Extract column headers from first row(s)
          const headerRowIndex = importConfig.value.headerRows - 1;
          if (headerRowIndex >= 0 && headerRowIndex < data.length) {
            fileColumns.value = data[headerRowIndex].map(cell => String(cell || '').trim());
          }

          // Extract data rows (skip header rows)
          filePreview.value = data.slice(importConfig.value.headerRows).map(row =>
            row.map(cell => String(cell || '').trim())
          );

          console.log(`Parsed Excel file: ${filePreview.value.length} rows, ${fileColumns.value.length} columns`);
          console.log('Column headers:', fileColumns.value);

          step.value = 2;
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file: ' + error.message);
      }
    }

    function getSampleData(columnIndex) {
      if (columnIndex === '' || !filePreview.value[0]) return '-';
      return filePreview.value[0][columnIndex] || '-';
    }

    async function processMapping() {
      try {
        importedData.value = filePreview.value.map((row, index) => {
          // Helper function to parse price - removes currency symbols and commas
          const parsePrice = (value) => {
            if (!value) return 0;
            // Remove currency symbols ($, £, €, etc.), commas, and spaces
            const cleaned = String(value).replace(/[$£€,\s]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };

          const item = {
            id: index,
            reference: row[columnMapping.value.reference] || '',
            description: row[columnMapping.value.description] || '',
            price: columnMapping.value.amount !== '' ? parsePrice(row[columnMapping.value.amount]) : 0,
            unit: columnMapping.value.units !== '' ? row[columnMapping.value.units] : '',
            costCentre: columnMapping.value.costCentre !== '' ? row[columnMapping.value.costCentre] : '',
            validFrom: columnMapping.value.validFrom !== '' ? row[columnMapping.value.validFrom] : importConfig.value.validFrom,
            comments: columnMapping.value.comments !== '' ? row[columnMapping.value.comments] : '',
            linkTo: '',
            dbDescription: '',
            status: 'unlinked'
          };
          return item;
        }).filter(item => item.reference && item.description);

        console.log('Processed data:', importedData.value);

        // Save template if template name is provided
        if (importConfig.value.templateName && importConfig.value.templateName.trim() !== '') {
          await saveTemplate();
        }

        step.value = 3;
      } catch (error) {
        console.error('Error processing mapping:', error);
        alert('Error processing data: ' + error.message);
      }
    }

    function autoMatchLinks() {
      let matchCount = 0;
      importedData.value.forEach(item => {
        // Try to match by reference
        const match = catalogueItems.value.find(cat => cat.PriceCode === item.reference);
        if (match) {
          item.linkTo = match.PriceCode;
          item.dbDescription = match.Description;
          item.status = 'linked';
          matchCount++;
        }
      });

      if (linkingGridApi.value) {
        linkingGridApi.value.refreshCells();
      }

      alert(`Auto-matched ${matchCount} items`);
    }

    function shiftReferencesToLinks() {
      importedData.value.forEach(item => {
        item.linkTo = item.reference;
        item.status = 'linked';
      });

      if (linkingGridApi.value) {
        linkingGridApi.value.refreshCells();
      }
    }

    function clearAllLinks() {
      if (!confirm('Clear all links?')) return;

      importedData.value.forEach(item => {
        item.linkTo = '';
        item.dbDescription = '';
        item.status = 'unlinked';
      });

      if (linkingGridApi.value) {
        linkingGridApi.value.refreshCells();
      }
    }

    function onLinkingGridReady(params) {
      linkingGridApi.value = params.api;
    }

    function onLinkCellChanged(event) {
      const item = event.data;
      if (event.colDef.field === 'linkTo' && event.newValue) {
        const match = catalogueItems.value.find(cat => cat.PriceCode === event.newValue);
        if (match) {
          item.dbDescription = match.Description;
          item.status = 'linked';
        }
      }
      if (linkingGridApi.value) {
        linkingGridApi.value.refreshCells({ rowNodes: [event.node] });
      }
    }

    function prepareReview() {
      step.value = 4;
    }

    async function executeImport() {
      if (!confirm(`Import ${importedData.value.length} items?`)) return;

      importing.value = true;

      try {
        // Prepare import data
        const importItems = importedData.value.filter(item => {
          if (item.linkTo) return true; // Always import linked items
          return importConfig.value.createNewItems; // Import unlinked only if creating new items
        }).map(item => ({
          reference: item.reference,
          description: item.description,
          linkTo: item.linkTo,
          price: item.price * importConfig.value.priceFactor,
          unit: item.unit || importConfig.value.defaultUnit,
          costCentre: item.costCentre || importConfig.value.defaultCostCentre,
          validFrom: item.validFrom || importConfig.value.validFrom,
          comments: item.comments
        }));

        const result = await api.catalogue.importItems({
          importType: importConfig.value.importType,
          supplier: importConfig.value.supplier,
          priceLevel: importConfig.value.priceLevel,
          items: importItems,
          createNewItems: importConfig.value.createNewItems,
          updateDescriptions: importConfig.value.updateDescriptions,
          updatePrices: importConfig.value.updatePrices
        });

        if (result.success) {
          alert(`Successfully imported ${result.data.successCount} items!`);
          emit('imported');
          close();
        } else {
          alert('Error importing items: ' + result.message);
        }
      } catch (error) {
        console.error('Error importing items:', error);
        alert('Error importing items: ' + error.message);
      } finally {
        importing.value = false;
      }
    }

    async function loadCostCentres() {
      try {
        const result = await api.costCentres.getList();
        if (result.success) {
          costCentres.value = result.data;
        }
      } catch (error) {
        console.error('Error loading cost centres:', error);
      }
    }

    async function loadPerCodes() {
      try {
        const result = await api.catalogue.getPerCodes();
        if (result.success) {
          perCodes.value = result.data;
        }
      } catch (error) {
        console.error('Error loading per codes:', error);
      }
    }

    async function loadSuppliers() {
      try {
        const result = await api.supplierPrices.getSuppliers();
        if (result.success) {
          suppliers.value = result.data;
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    }

    async function loadCatalogueItems() {
      try {
        const result = await api.catalogue.getAllItems({ showArchived: false });
        if (result.success) {
          catalogueItems.value = result.data;
        }
      } catch (error) {
        console.error('Error loading catalogue items:', error);
      }
    }

    async function loadSavedTemplates() {
      try {
        const templates = await api.importTemplates.getAll();
        savedTemplates.value = templates || [];
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    }

    async function loadTemplate() {
      if (!selectedTemplate.value) return;

      try {
        const template = await api.importTemplates.get(selectedTemplate.value);
        if (template) {
          // Load import config
          if (template.importType) importConfig.value.importType = template.importType;
          if (template.supplier) importConfig.value.supplier = template.supplier;
          if (template.priceLevel !== undefined) importConfig.value.priceLevel = template.priceLevel;
          if (template.priceFactor !== undefined) importConfig.value.priceFactor = template.priceFactor;
          if (template.defaultCostCentre) importConfig.value.defaultCostCentre = template.defaultCostCentre;
          if (template.defaultUnit) importConfig.value.defaultUnit = template.defaultUnit;
          if (template.validFrom) importConfig.value.validFrom = template.validFrom;

          // Load column mapping
          if (template.columnMapping) {
            Object.assign(columnMapping.value, template.columnMapping);
          }

          alert(`Template "${template.name}" loaded successfully!`);
        }
      } catch (error) {
        console.error('Error loading template:', error);
        alert('Error loading template: ' + error.message);
      }
    }

    async function saveTemplate() {
      if (!importConfig.value.templateName || importConfig.value.templateName.trim() === '') {
        return; // Don't save if no name provided
      }

      try {
        const template = {
          name: importConfig.value.templateName,
          importType: importConfig.value.importType,
          supplier: importConfig.value.supplier,
          priceLevel: importConfig.value.priceLevel,
          priceFactor: importConfig.value.priceFactor,
          defaultCostCentre: importConfig.value.defaultCostCentre,
          defaultUnit: importConfig.value.defaultUnit,
          validFrom: importConfig.value.validFrom,
          columnMapping: { ...columnMapping.value }
        };

        const saved = await api.importTemplates.save(template);
        if (saved) {
          await loadSavedTemplates(); // Reload template list
          alert(`Template "${template.name}" saved successfully!`);
          importConfig.value.templateName = ''; // Clear template name after saving
        }
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Error saving template: ' + error.message);
      }
    }

    function close() {
      step.value = 1;
      fileInfo.value = { name: '', size: 0, type: '', isCsv: false, isExcel: false };
      filePreview.value = [];
      importedData.value = [];
      columnMapping.value = {
        reference: '',
        description: '',
        amount: '',
        units: '',
        costCentre: '',
        validFrom: '',
        comments: '',
        area: ''
      };
      emit('close');
    }

    // Watch for modal open
    watch(() => props.show, (newValue) => {
      if (newValue) {
        loadCostCentres();
        loadPerCodes();
        loadSuppliers();
        loadCatalogueItems();
        loadSavedTemplates();
      }
    }, { immediate: true });

    return {
      step,
      importing,
      fileInput,
      suppliers,
      costCentres,
      perCodes,
      catalogueItems,
      savedTemplates,
      selectedTemplate,
      fileInfo,
      filePreview,
      fileColumns,
      importConfig,
      columnMapping,
      importedData,
      supplierOptions,
      costCentreOptions,
      canProceedFromStep1,
      canProceedFromStep2,
      linkedCount,
      unlinkedCount,
      newItemsCount,
      updateItemsCount,
      reviewData,
      importFields,
      linkingColumnDefs,
      linkingDefaultColDef,
      reviewColumnDefs,
      reviewDefaultColDef,
      formatFileSize,
      onFileSelected,
      parseFile,
      getSampleData,
      processMapping,
      autoMatchLinks,
      shiftReferencesToLinks,
      clearAllLinks,
      onLinkingGridReady,
      onLinkCellChanged,
      prepareReview,
      executeImport,
      loadTemplate,
      saveTemplate,
      loadSavedTemplates,
      close
    };
  }
};
</script>

<style scoped>
.import-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.preview-grid {
  border: 1px solid #dee2e6;
  border-radius: 4px;
  overflow: hidden;
}

.import-grid :deep(.ag-root-wrapper),
.preview-grid :deep(.ag-root-wrapper) {
  border-radius: 4px;
}
</style>
