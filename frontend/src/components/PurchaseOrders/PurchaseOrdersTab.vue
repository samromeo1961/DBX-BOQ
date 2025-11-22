<template>
  <div class="purchase-orders-tab h-100 d-flex flex-column">
    <!-- Header -->
    <div class="tab-header d-flex justify-content-between align-items-center p-3 border-bottom">
      <div class="d-flex align-items-center gap-3">
        <h4 class="mb-0">
          <i class="bi bi-receipt-cutoff me-2"></i>
          Purchase Orders
        </h4>
        <div v-if="selectedJob" class="badge bg-primary">
          Job {{ selectedJob.JobNo }}: {{ selectedJob.SiteStreet || selectedJob.JobName }}
        </div>
      </div>

      <div class="d-flex gap-2">
        <!-- Selection Controls -->
        <div v-if="selectedJob" class="btn-group me-2" role="group">
          <button
            class="btn btn-outline-primary btn-sm"
            @click="selectAll"
            :disabled="loading || orders.length === 0"
            title="Select All Orders">
            <i class="bi bi-check-square me-1"></i>
            Select All
          </button>
          <button
            class="btn btn-outline-secondary btn-sm"
            @click="deselectAll"
            :disabled="loading || selectedOrders.length === 0"
            title="Deselect All Orders">
            <i class="bi bi-square me-1"></i>
            Deselect All
          </button>
        </div>

        <!-- Nominated Suppliers Button -->
        <button
          class="btn btn-outline-warning"
          @click="showNominatedSuppliers = true"
          title="Manage Nominated Suppliers">
          <i class="bi bi-star me-1"></i>
          Suppliers
        </button>

        <!-- Template Gallery Button -->
        <button
          class="btn btn-outline-secondary"
          @click="showTemplateGallery = true"
          title="Manage Templates">
          <i class="bi bi-file-earmark-text me-1"></i>
          Templates
        </button>

        <!-- Assets Library Button -->
        <button
          class="btn btn-outline-info"
          @click="showAssetsLibrary = true"
          title="Manage Assets (Logos, CSS, Fonts)">
          <i class="bi bi-folder2-open me-1"></i>
          Assets
        </button>

        <!-- Partials Library Button -->
        <button
          class="btn btn-outline-success"
          @click="showPartialsLibrary = true"
          title="Manage Template Partials (Reusable Fragments)">
          <i class="bi bi-puzzle me-1"></i>
          Partials
        </button>

        <!-- Select Job Button -->
        <button
          class="btn btn-primary"
          @click="showJobSelector = true">
          <i class="bi bi-folder2-open me-1"></i>
          Select Job
        </button>

        <!-- Refresh Button -->
        <button
          class="btn btn-outline-secondary"
          @click="refreshOrders"
          :disabled="loading"
          title="Refresh Orders">
          <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Job Summary Bar -->
    <div v-if="selectedJob" class="job-summary p-3 border-bottom" :class="isDarkMode ? 'bg-dark' : 'bg-light'">
      <div class="row">
        <div class="col-md-3">
          <small class="text-muted">Client:</small>
          <div>{{ selectedJob.Client || 'N/A' }}</div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">Total Orders:</small>
          <div><strong>{{ orders.length }}</strong></div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">Logged:</small>
          <div class="text-primary">
            <strong>{{ loggedCount }}</strong>
          </div>
        </div>
        <div class="col-md-3">
          <small class="text-muted">To Order:</small>
          <div class="text-success">
            <strong>{{ toOrderCount }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- No Job Selected State -->
    <div v-if="!selectedJob" class="flex-fill d-flex align-items-center justify-content-center">
      <div class="text-center">
        <i class="bi bi-folder2-open" style="font-size: 4rem; color: #ccc;"></i>
        <h5 class="mt-3 text-muted">No Job Selected</h5>
        <p class="text-muted">Select a job to view and manage purchase orders</p>
        <button class="btn btn-primary" @click="showJobSelector = true">
          <i class="bi bi-folder2-open me-2"></i>
          Select Job
        </button>
      </div>
    </div>

    <!-- Orders Grid -->
    <div v-else class="flex-fill position-relative" ref="gridContainer" @click="handleGridClick">
      <!-- Loading Overlay -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>

      <!-- AG Grid -->
      <ag-grid-vue
        v-if="!loading"
        class="ag-theme-quartz purchase-orders-grid"
        :class="{ 'ag-theme-quartz-dark': isDarkMode }"
        style="width: 100%; height: 100%;"
        theme="legacy"
        :columnDefs="columnDefs"
        :rowData="gridRowData"
        :defaultColDef="defaultColDef"
        :getRowId="getRowId"
        :getRowHeight="getRowHeight"
        :isFullWidthRow="isFullWidthRow"
        :fullWidthCellRenderer="fullWidthCellRenderer"
        :pagination="false"
        :rowSelection="rowSelectionConfig"
        :enableCellTextSelection="true"
        :tooltipShowDelay="500"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-value-changed="onCellValueChanged"
      ></ag-grid-vue>
    </div>

    <!-- Action Bar -->
    <div v-if="selectedJob && !loading" class="action-bar p-3 border-top" :class="isDarkMode ? 'bg-dark' : 'bg-light'">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <span class="fw-bold" :class="selectedOrders.length > 0 ? 'text-primary' : 'text-muted'">
            <i class="bi bi-check-circle me-1"></i>
            {{ selectionSummary }}
          </span>
        </div>
        <div class="d-flex gap-2">
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="selectedOrders.length !== 1"
            @click="showDocumentsModal = true"
            title="View/attach invoices and documents">
            <i class="bi bi-paperclip me-1"></i>
            Documents
          </button>
          <button
            class="btn btn-sm btn-outline-secondary"
            :disabled="selectedOrders.length === 0"
            @click="previewSelected">
            <i class="bi bi-eye me-1"></i>
            Preview
          </button>
          <button
            class="btn btn-sm btn-outline-primary"
            :disabled="selectedOrders.length === 0"
            @click="saveAsPDFSelected">
            <i class="bi bi-file-pdf me-1"></i>
            Save as PDF
          </button>
          <button
            class="btn btn-sm btn-primary"
            :disabled="selectedOrders.length === 0"
            @click="printSelected">
            <i class="bi bi-printer me-1"></i>
            Print
          </button>
          <button
            class="btn btn-sm btn-success"
            :disabled="selectedOrders.length === 0"
            @click="emailSelected">
            <i class="bi bi-envelope me-1"></i>
            Email
          </button>
          <button
            class="btn btn-sm btn-info"
            :disabled="selectedOrders.length === 0"
            @click="markAsSent">
            <i class="bi bi-check-circle me-1"></i>
            Mark as Sent
          </button>
          <button
            class="btn btn-sm btn-danger"
            :disabled="selectedOrders.length === 0 || !hasOrderedOrders"
            @click="cancelSelectedOrders">
            <i class="bi bi-x-circle me-1"></i>
            Cancel Order
          </button>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <JobSelector
      v-if="showJobSelector"
      @job-selected="onJobSelected"
      @close="showJobSelector = false"
    />

    <TemplateGallery
      v-if="showTemplateGallery"
      @close="showTemplateGallery = false"
    />

    <OrderPreviewModal
      v-if="showOrderPreview"
      :orderNumber="previewOrderNumber"
      @close="showOrderPreview = false"
    />

    <OrderEditModal
      v-if="showOrderEdit"
      :orderNumber="editOrderNumber"
      @close="showOrderEdit = false"
      @saved="onOrderSaved"
    />

    <NominatedSuppliersModal
      v-if="showNominatedSuppliers"
      @close="showNominatedSuppliers = false"
      @updated="onSuppliersUpdated"
    />

    <AssetsLibrary
      v-if="showAssetsLibrary"
      @close="showAssetsLibrary = false"
    />

    <PartialsLibrary
      v-if="showPartialsLibrary"
      @close="showPartialsLibrary = false"
    />

    <!-- Cancellation Reason Modal -->
    <div v-if="showCancelModal" class="modal fade show d-block" tabindex="-1" @click.self="closeCancelModal">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-x-circle me-2"></i>
              Cancel Order{{ cancelModalOrdersCount > 1 ? 's' : '' }}
            </h5>
            <button type="button" class="btn-close" @click="closeCancelModal"></button>
          </div>
          <div class="modal-body">
            <p>
              You are about to cancel <strong>{{ cancelModalOrdersCount }}</strong> order{{ cancelModalOrdersCount > 1 ? 's' : '' }}.
            </p>
            <p>
              Each cancelled order will be marked as <span class="badge bg-danger">Cancelled</span> and a new
              <span class="badge bg-success">Draft</span> order will be created with the same items.
            </p>
            <div class="mb-3">
              <label for="cancelReason" class="form-label fw-bold">Cancellation Reason *</label>
              <textarea
                id="cancelReason"
                v-model="cancelReason"
                class="form-control"
                rows="3"
                placeholder="Enter reason for cancellation (e.g., Supplier cannot fulfill order)"
                required
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeCancelModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="confirmCancellation"
              :disabled="!cancelReason || cancelReason.trim() === ''">
              <i class="bi bi-x-circle me-1"></i>
              Confirm Cancellation
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showCancelModal" class="modal-backdrop fade show"></div>

    <!-- Documents Modal -->
    <div v-if="showDocumentsModal && selectedOrders.length === 1" class="modal fade show d-block" tabindex="-1" @click.self="showDocumentsModal = false">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-paperclip me-2"></i>
              Order Documents - {{ selectedOrders[0]?.OrderNumber }}
            </h5>
            <button type="button" class="btn-close" @click="showDocumentsModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <small class="text-muted">
                <strong>Supplier:</strong> {{ selectedOrders[0]?.SupplierName || 'N/A' }} |
                <strong>Status:</strong> {{ selectedOrders[0]?.Status }}
              </small>
            </div>
            <DocumentLinkPanel
              entityType="PurchaseOrder"
              :entityCode="selectedOrderEntityCode"
              :entityLabel="`PO ${selectedOrders[0]?.OrderNumber}`"
            />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDocumentsModal = false">Close</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showDocumentsModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { ref, computed, onMounted, inject } from 'vue';
import { AgGridVue } from 'ag-grid-vue3';
import { useElectronAPI } from '../../composables/useElectronAPI';
import JobSelector from './JobSelector.vue';
import TemplateGallery from './TemplateGallery.vue';
import OrderPreviewModal from './OrderPreviewModal.vue';
import OrderEditModal from './OrderEditModal.vue';
import NominatedSuppliersModal from './NominatedSuppliersModal.vue';
import SupplierCellEditor from './SupplierCellEditor.vue';
import AssetsLibrary from '../common/AssetsLibrary.vue';
import PartialsLibrary from '../common/PartialsLibrary.vue';
import DocumentLinkPanel from '@/components/Documents/DocumentLinkPanel.vue';

export default {
  name: 'PurchaseOrdersTab',
  components: {
    AgGridVue,
    JobSelector,
    TemplateGallery,
    OrderPreviewModal,
    OrderEditModal,
    NominatedSuppliersModal,
    SupplierCellEditor,
    AssetsLibrary,
    PartialsLibrary,
    DocumentLinkPanel
  },
  setup() {
    const api = useElectronAPI();
    const isDarkMode = inject('isDarkMode', ref(false));

    // State
    const selectedJob = ref(null);
    const orders = ref([]);
    const loading = ref(false);
    const gridApi = ref(null);
    const selectedOrders = ref([]);
    const gridContainer = ref(null);
    const suppliersByCostCentre = ref({}); // Map of cost centre -> nominated suppliers
    const expandedOrders = ref(new Set()); // Track which orders are expanded
    const orderLineItems = ref({}); // Cache of order line items { orderNumber: items[] }

    // Modal states
    const showJobSelector = ref(false);
    const showTemplateGallery = ref(false);
    const showOrderPreview = ref(false);
    const previewOrderNumber = ref('');
    const showOrderEdit = ref(false);
    const editOrderNumber = ref('');
    const showNominatedSuppliers = ref(false);
    const showAssetsLibrary = ref(false);
    const showPartialsLibrary = ref(false);
    const showCancelModal = ref(false);
    const cancelReason = ref('');
    const cancelModalOrdersCount = ref(0);
    const ordersToCancel = ref([]);
    const showDocumentsModal = ref(false);

    // Computed
    const selectedOrderEntityCode = computed(() => {
      if (selectedOrders.value.length !== 1 || !selectedJob.value) return '';
      const order = selectedOrders.value[0];
      return `${selectedJob.value.JobNo}|${order.OrderNumber}`;
    });
    const gridRowData = computed(() => {
      const rows = [];

      orders.value.forEach(order => {
        // Add the order row
        rows.push({ ...order, rowType: 'order' });

        // If order is expanded, add a detail row
        if (expandedOrders.value.has(order.OrderNumber)) {
          rows.push({
            rowType: 'detail',
            orderNumber: order.OrderNumber,
            items: orderLineItems.value[order.OrderNumber] || []
          });
        }
      });

      return rows;
    });

    const loggedCount = computed(() => {
      // Count orders that are truly logged (not Draft status)
      return orders.value.filter(o => o.Status !== 'Draft' && o.Status !== 'To Order').length;
    });

    const toOrderCount = computed(() => {
      // Count orders that are either "To Order" or "Draft" status
      return orders.value.filter(o => o.Status === 'To Order' || o.Status === 'Draft').length;
    });

    const hasOrderedOrders = computed(() => {
      return selectedOrders.value.some(o => o.Status === 'Ordered');
    });

    const selectedCostCentres = computed(() => {
      const costCentres = new Set(selectedOrders.value.map(o => o.CostCentre));
      return costCentres.size;
    });

    const selectedLoads = computed(() => {
      const loads = new Set(selectedOrders.value.map(o => `${o.CostCentre}-${o.BLoad}`));
      return loads.size;
    });

    const selectionSummary = computed(() => {
      if (selectedOrders.value.length === 0) {
        return 'No orders selected';
      }

      const parts = [];

      if (selectedCostCentres.value > 0) {
        parts.push(`${selectedCostCentres.value} cost centre${selectedCostCentres.value > 1 ? 's' : ''}`);
      }

      if (selectedLoads.value > 0) {
        parts.push(`${selectedLoads.value} load${selectedLoads.value > 1 ? 's' : ''}`);
      }

      parts.push(`${selectedOrders.value.length} order${selectedOrders.value.length > 1 ? 's' : ''}`);

      return parts.join(', ') + ' selected';
    });

    // AG Grid Configuration
    const defaultColDef = {
      sortable: true,
      filter: true,
      resizable: true,
      floatingFilter: true
    };

    const rowSelectionConfig = 'multiple';

    const isFullWidthRow = (params) => {
      return params.rowNode.data && params.rowNode.data.rowType === 'detail';
    };

    const fullWidthCellRenderer = (params) => {
      const items = params.data.items || [];

      if (items.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #999;">Loading line items...</div>';
      }

      // Build HTML table for line items
      const rows = items.map(item => {
        const qty = item.Quantity ? parseFloat(item.Quantity).toFixed(2) : '';
        const unitPrice = item.UnitPrice ? '$' + parseFloat(item.UnitPrice).toFixed(2) : '';
        const lineTotal = item.LineTotal ? '$' + parseFloat(item.LineTotal).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';

        return `<tr><td style="padding: 8px; border: 1px solid #ccc;">${item.ItemCode || ''}</td><td style="padding: 8px; border: 1px solid #ccc;">${item.Description || ''}</td><td style="padding: 8px; text-align: right; border: 1px solid #ccc;">${qty}</td><td style="padding: 8px; border: 1px solid #ccc;">${item.Unit || ''}</td><td style="padding: 8px; text-align: right; border: 1px solid #ccc;">${unitPrice}</td><td style="padding: 8px; text-align: right; border: 1px solid #ccc;">${lineTotal}</td><td style="padding: 8px; border: 1px solid #ccc;">${item.Workup || ''}</td></tr>`;
      }).join('');

      return `<div style="padding: 10px; background: #f5f5f5; width: 100%; box-sizing: border-box;"><table style="width: 100%; border-collapse: collapse;"><thead><tr style="background: #e0e0e0;"><th style="padding: 8px; text-align: left; border: 1px solid #ccc;">Item Code</th><th style="padding: 8px; text-align: left; border: 1px solid #ccc;">Description</th><th style="padding: 8px; text-align: right; border: 1px solid #ccc;">Quantity</th><th style="padding: 8px; text-align: left; border: 1px solid #ccc;">Unit</th><th style="padding: 8px; text-align: right; border: 1px solid #ccc;">Unit Price</th><th style="padding: 8px; text-align: right; border: 1px solid #ccc;">Line Total</th><th style="padding: 8px; text-align: left; border: 1px solid #ccc;">Workup</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    };

    const columnDefs = [
      {
        headerName: '',
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressHeaderMenuButton: true,
        filter: false,
        sortable: false,
        cellRenderer: (params) => {
          if (!params.data || params.data.rowType === 'detail') {
            return '';
          }

          const orderNumber = params.data.OrderNumber;
          const isExpanded = expandedOrders.value.has(orderNumber);
          const icon = isExpanded ? '−' : '+';

          return `<div style="display: flex; align-items: center; justify-content: center; height: 100%; cursor: pointer;" class="expand-button" data-order="${orderNumber}"><span style="font-size: 16px; font-weight: bold;">${icon}</span></div>`;
        }
      },
      {
        headerName: '',
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressHeaderMenuButton: true,
        filter: false,
        checkboxSelection: true,
        headerCheckboxSelection: true,
        sortable: false
      },
      {
        headerName: 'Status',
        field: 'Status',
        width: 140,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['Draft', 'Sent', 'Ordered', 'Cancelled']
        },
        cellRenderer: (params) => {
          const status = params.value || 'Draft';
          switch (status) {
            case 'Sent':
              return '<span class="badge bg-info"><i class="bi bi-send-fill me-1"></i>Sent</span>';
            case 'Ordered':
              return '<span class="badge bg-primary">Ordered</span>';
            case 'Cancelled':
              return '<span class="badge bg-danger">Cancelled</span>';
            case 'Draft':
            default:
              return '<span class="badge bg-success">Draft</span>';
          }
        },
        filter: 'agTextColumnFilter',
        filterParams: {
          valueFormatter: (params) => params.value || 'Draft'
        },
        tooltipValueGetter: (params) => {
          return 'Click to change status (Draft / Sent / Ordered / Cancelled)';
        }
      },
      {
        headerName: 'Order Number',
        field: 'OrderNumber',
        width: 150,
        pinned: 'left',
        cellRenderer: (params) => {
          return `<strong>${params.value}</strong>`;
        }
      },
      {
        headerName: 'Cost Centre',
        field: 'CostCentre',
        width: 120
      },
      {
        headerName: 'Cost Centre Name',
        field: 'CostCentreName',
        width: 200,
        flex: 1
      },
      {
        headerName: 'Load',
        field: 'BLoad',
        width: 80,
        type: 'numericColumn'
      },
      {
        headerName: 'Supplier',
        field: 'SupplierName',
        width: 250,
        editable: (params) => {
          // Allow editing for unlogged orders OR draft orders
          return params.data.IsLogged === 0 || params.data.Status === 'Draft';
        },
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: (params) => {
          // Get pre-loaded nominated suppliers for this order's cost centre
          const costCentre = params.data.CostCentre;
          const suppliers = suppliersByCostCentre.value[costCentre] || [];

          const values = suppliers.map(s => s.SupplierName);

          console.log(`Supplier dropdown for ${costCentre}:`, values);

          return {
            values: values
          };
        },
        cellRenderer: (params) => {
          if (!params.value) {
            return '<span class="text-muted fst-italic">Click to assign...</span>';
          }
          // Show star icon for preferred suppliers
          const isPreferred = params.data.IsPreferredSupplier === 1;
          const star = isPreferred ? '<i class="bi bi-star-fill text-warning me-1" title="Preferred Supplier"></i>' : '';
          return `${star}${params.value}`;
        },
        tooltipValueGetter: (params) => {
          if (params.data.IsLogged === 1) {
            return 'Logged orders cannot be edited';
          }
          return 'Click to select supplier (only nominated suppliers shown)';
        }
      },
      {
        headerName: 'Items',
        field: 'ItemCount',
        width: 100,
        type: 'numericColumn'
      },
      {
        headerName: 'Total',
        field: 'OrderTotal',
        width: 120,
        type: 'numericColumn',
        valueFormatter: (params) => {
          if (params.value === null || params.value === undefined) return '$0.00';
          return '$' + parseFloat(params.value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
      },
      {
        headerName: 'Order Date',
        field: 'OrderDate',
        width: 120,
        valueFormatter: (params) => {
          if (!params.value) return '';
          return new Date(params.value).toLocaleDateString('en-AU');
        }
      },
      {
        headerName: 'Actions',
        width: 150,
        pinned: 'right',
        cellRenderer: (params) => {
          return `
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-primary preview-btn" data-order="${params.data.OrderNumber}" title="Preview">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary edit-btn" data-order="${params.data.OrderNumber}" title="Edit">
                <i class="bi bi-pencil"></i>
              </button>
            </div>
          `;
        },
        suppressHeaderMenuButton: true,
        filter: false,
        sortable: false
      }
    ];

    // Methods
    const onGridReady = (params) => {
      gridApi.value = params.api;
      // Set popup parent to ensure dropdowns render on top
      if (gridContainer.value) {
        params.api.setGridOption('popupParent', document.body);
      }
    };

    const handleGridClick = async (e) => {
      // Handle expand button clicks
      if (e.target.closest('.expand-button')) {
        const orderNumber = e.target.closest('.expand-button').dataset.order;
        await toggleOrderExpansion(orderNumber);
        return;
      }

      // Handle action button clicks via event delegation
      if (e.target.closest('.preview-btn')) {
        const orderNumber = e.target.closest('.preview-btn').dataset.order;
        previewOrder(orderNumber);
      } else if (e.target.closest('.edit-btn')) {
        const orderNumber = e.target.closest('.edit-btn').dataset.order;
        editOrder(orderNumber);
      }
    };

    const onSelectionChanged = () => {
      if (gridApi.value) {
        selectedOrders.value = gridApi.value.getSelectedRows();
        console.log(`Selection changed: ${selectedOrders.value.length} orders selected`);
      }
    };

    const selectAll = () => {
      if (gridApi.value) {
        gridApi.value.selectAll();
        console.log('All orders selected');
      }
    };

    const deselectAll = () => {
      if (gridApi.value) {
        gridApi.value.deselectAll();
        console.log('All orders deselected');
      }
    };

    const onJobSelected = async (job) => {
      selectedJob.value = job;
      showJobSelector.value = false;

      // Save selected job to sessionStorage to persist across tab navigation
      sessionStorage.setItem('purchaseOrders_selectedJob', JSON.stringify(job));

      await loadOrders();
    };

    const loadOrders = async () => {
      if (!selectedJob.value) return;

      loading.value = true;
      try {
        const result = await api.purchaseOrders.getOrdersForJob(selectedJob.value.JobNo);

        if (result.success) {
          orders.value = result.orders;

          // Pre-load nominated suppliers for each unique cost centre
          const uniqueCostCentres = [...new Set(orders.value.map(o => o.CostCentre))];
          console.log('Loading suppliers for cost centres:', uniqueCostCentres);

          // Load suppliers for each cost centre in parallel
          const supplierPromises = uniqueCostCentres.map(async (costCentre) => {
            try {
              const suppResult = await api.purchaseOrders.getSuppliersForCostCentre(costCentre);
              if (suppResult.success) {
                return { costCentre, suppliers: suppResult.suppliers };
              }
            } catch (err) {
              console.error(`Error loading suppliers for ${costCentre}:`, err);
            }
            return { costCentre, suppliers: [] };
          });

          const supplierResults = await Promise.all(supplierPromises);

          // Build the map of cost centre -> suppliers
          const suppliersMap = {};
          supplierResults.forEach(({ costCentre, suppliers }) => {
            suppliersMap[costCentre] = suppliers;
            console.log(`Cost Centre ${costCentre}: ${suppliers.length} nominated suppliers`);
          });

          suppliersByCostCentre.value = suppliersMap;
        } else {
          console.error('Failed to load orders:', result.message);
          alert('Failed to load orders: ' + result.message);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
        alert('Error loading orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const refreshOrders = async () => {
      await loadOrders();
    };

    const previewOrder = (orderNumber) => {
      previewOrderNumber.value = orderNumber;
      showOrderPreview.value = true;
    };

    const previewSelected = () => {
      if (selectedOrders.value.length > 0) {
        const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);
        previewOrderNumber.value = orderNumbers;
        showOrderPreview.value = true;
      }
    };

    const editOrder = (orderNumber) => {
      editOrderNumber.value = orderNumber;
      showOrderEdit.value = true;
    };

    const onOrderSaved = async () => {
      // Reload orders to reflect the changes
      await loadOrders();
    };

    const onSuppliersUpdated = async () => {
      // Suppliers list has changed - reload suppliers for all cost centres
      console.log('Nominated suppliers updated - reloading supplier lists...');

      if (!selectedJob.value || orders.value.length === 0) {
        return;
      }

      try {
        // Get unique cost centres from current orders
        const uniqueCostCentres = [...new Set(orders.value.map(o => o.CostCentre))];

        // Reload suppliers for each cost centre
        const supplierPromises = uniqueCostCentres.map(async (costCentre) => {
          try {
            const suppResult = await api.purchaseOrders.getSuppliersForCostCentre(costCentre);
            if (suppResult.success) {
              return { costCentre, suppliers: suppResult.suppliers };
            }
          } catch (err) {
            console.error(`Error reloading suppliers for ${costCentre}:`, err);
          }
          return { costCentre, suppliers: [] };
        });

        const supplierResults = await Promise.all(supplierPromises);

        // Update the suppliers map
        const suppliersMap = {};
        supplierResults.forEach(({ costCentre, suppliers }) => {
          suppliersMap[costCentre] = suppliers;
          console.log(`✓ Cost Centre ${costCentre}: ${suppliers.length} nominated suppliers`);
        });

        suppliersByCostCentre.value = suppliersMap;
        console.log('✓ Supplier lists reloaded successfully');
      } catch (error) {
        console.error('Error reloading suppliers:', error);
      }
    };

    const printSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      const confirmed = confirm(
        `Print ${orderNumbers.length} purchase order(s)?\n\n` +
        orderNumbers.join('\n')
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        const settings = {
          silentPrint: false, // Show print dialog
          color: true,
          copies: 1
        };

        const result = await api.purchaseOrders.batchPrint(orderNumbers, settings);

        if (result.success) {
          alert(
            `Print Results:\n\n` +
            `Total: ${result.total}\n` +
            `Succeeded: ${result.succeeded}\n` +
            `Failed: ${result.failed}`
          );

          if (result.failed > 0) {
            const failures = result.results
              .filter(r => !r.success)
              .map(r => `${r.orderNumber}: ${r.error}`)
              .join('\n');
            console.error('Print failures:\n', failures);
          }
        } else {
          alert('Failed to print orders: ' + result.message);
        }
      } catch (error) {
        console.error('Error printing orders:', error);
        alert('Error printing orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const emailSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      try {
        loading.value = true;

        // Check if email is configured
        const isConfigured = await api.emailSettings.isConfigured();
        if (!isConfigured) {
          alert(
            'Email Configuration Required:\n\n' +
            'Please configure your email settings in Settings > Email / SMTP before using this feature.'
          );
          loading.value = false;
          return;
        }

        // Get email settings
        const emailSettings = await api.emailSettings.get();

        const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

        // Check that all selected orders have supplier emails (unless in test mode)
        if (!emailSettings.testMode) {
          const ordersWithoutEmail = selectedOrders.value.filter(o => !o.SupplierEmail);
          if (ordersWithoutEmail.length > 0) {
            alert(
              `The following orders cannot be emailed (no supplier email):\n\n` +
              ordersWithoutEmail.map(o => o.OrderNumber).join('\n')
            );
            loading.value = false;
            return;
          }
        }

        // Show confirmation with test mode warning if applicable
        let confirmMessage = `Email ${orderNumbers.length} purchase order(s)?\n\n`;

        if (emailSettings.testMode) {
          confirmMessage += `⚠️ TEST MODE ENABLED - All emails will be sent to: ${emailSettings.testEmail}\n\n`;
        } else {
          confirmMessage += selectedOrders.value.map(o => `${o.OrderNumber} → ${o.SupplierName} (${o.SupplierEmail})`).join('\n');
        }

        const confirmed = confirm(confirmMessage);

        if (!confirmed) {
          loading.value = false;
          return;
        }

        // Prepare batch email settings
        const settings = {
          emailSettings: emailSettings
        };

        const result = await api.purchaseOrders.batchEmail(orderNumbers, settings);

        if (result.success) {
          let message = `Email Results:\n\n` +
            `Total: ${result.total}\n` +
            `Succeeded: ${result.succeeded}\n` +
            `Failed: ${result.failed}`;

          if (emailSettings.testMode) {
            message += `\n\n⚠️ TEST MODE: All emails were sent to ${emailSettings.testEmail}`;
          }

          alert(message);

          if (result.failed > 0) {
            const failures = result.results
              .filter(r => !r.success)
              .map(r => `${r.orderNumber}: ${r.error}`)
              .join('\n');
            console.error('Email failures:\n', failures);
          }

          // Reload orders to reflect any status changes
          await loadOrders();
        } else {
          alert('Failed to email orders: ' + result.message);
        }
      } catch (error) {
        console.error('Error emailing orders:', error);
        alert('Error emailing orders: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const saveAsPDFSelected = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      const confirmed = confirm(
        `Save ${orderNumbers.length} purchase order(s) as PDF?\n\n` +
        orderNumbers.join('\n')
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        const settings = {
          format: 'A4',
          landscape: false,
          printBackground: true
        };

        // Backend handles folder picker dialog and saving
        const result = await api.purchaseOrders.batchSavePDF(orderNumbers, settings);

        if (result.cancelled) {
          return; // User cancelled folder picker
        }

        if (!result.success) {
          alert('Failed to save PDFs: ' + result.message);
          return;
        }

        // Auto-link saved PDFs to purchase orders
        if (result.saved > 0 && result.savedFiles && selectedJob.value) {
          let linkedCount = 0;
          for (const savedFile of result.savedFiles) {
            try {
              const linkResult = await api.documents.link({
                entityType: 'PurchaseOrder',
                entityCode: `${selectedJob.value.JobNo}|${savedFile.orderNumber}`,
                filePath: savedFile.filePath,
                fileName: savedFile.fileName,
                documentType: 'PurchaseOrder',
                description: `Saved PO PDF - ${new Date().toLocaleDateString('en-AU')}`
              });
              if (linkResult?.success) linkedCount++;
            } catch (linkErr) {
              console.error('Error auto-linking PDF:', linkErr);
            }
          }
          console.log(`Auto-linked ${linkedCount} PDFs to purchase orders`);
        }

        alert(
          `PDF Save Results:\n\n` +
          `Total: ${result.total}\n` +
          `Saved: ${result.saved}\n` +
          `Failed: ${result.failed}\n\n` +
          `Location: ${result.saveDir}` +
          (result.saved > 0 ? `\n\nPDFs have been auto-linked to their orders.` : '')
        );

        if (result.failed > 0 && result.errors.length > 0) {
          console.error('PDF save errors:\n', result.errors.join('\n'));
        }

      } catch (error) {
        console.error('Error saving PDFs:', error);
        alert('Error saving PDFs: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const markAsSent = async () => {
      if (selectedOrders.value.length === 0) {
        return;
      }

      const orderNumbers = selectedOrders.value.map(o => o.OrderNumber);

      // Check if any selected orders are already logged
      const alreadyLogged = selectedOrders.value.filter(o => o.IsLogged);
      if (alreadyLogged.length > 0) {
        const loggedNumbers = alreadyLogged.map(o => o.OrderNumber).join('\n');
        alert(
          `The following orders are already marked as sent:\n\n` +
          loggedNumbers +
          `\n\nThey will be skipped.`
        );
      }

      // Filter to only unlogged orders
      const unloggedOrders = selectedOrders.value.filter(o => !o.IsLogged);
      if (unloggedOrders.length === 0) {
        alert('All selected orders are already marked as sent.');
        return;
      }

      const confirmed = confirm(
        `Mark ${unloggedOrders.length} order(s) as sent?\n\n` +
        unloggedOrders.map(o => o.OrderNumber).join('\n') +
        '\n\nThis will create an entry in the Orders table.'
      );

      if (!confirmed) {
        return;
      }

      try {
        loading.value = true;

        const results = {
          succeeded: 0,
          failed: 0,
          errors: []
        };

        // Log each order individually
        for (const order of unloggedOrders) {
          try {
            const result = await api.purchaseOrders.logOrder(
              order.OrderNumber,
              order.SupplierCode,
              null, // delDate - can be set later
              'Marked as sent manually'
            );

            if (result.success) {
              results.succeeded++;
              // Update the IsLogged status in the grid
              const rowNode = gridApi.value.getRowNode(order.OrderNumber);
              if (rowNode) {
                rowNode.setDataValue('IsLogged', 1);
              }
            } else {
              results.failed++;
              results.errors.push(`${order.OrderNumber}: ${result.message}`);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`${order.OrderNumber}: ${error.message}`);
          }
        }

        // Show results
        let message = `Mark as Sent Results:\n\n` +
          `Total: ${unloggedOrders.length}\n` +
          `Succeeded: ${results.succeeded}\n` +
          `Failed: ${results.failed}`;

        if (results.failed > 0) {
          message += `\n\nErrors:\n${results.errors.join('\n')}`;
        }

        alert(message);

        // Reload orders to reflect changes
        if (results.succeeded > 0) {
          await loadOrders();
        }
      } catch (error) {
        console.error('Error marking orders as sent:', error);
        alert('Error marking orders as sent: ' + error.message);
      } finally {
        loading.value = false;
      }
    };

    const cancelSelectedOrders = () => {
      // Filter to only ordered orders
      const orderedOrders = selectedOrders.value.filter(o => o.Status === 'Ordered');

      if (orderedOrders.length === 0) {
        alert('Please select orders with "Ordered" status to cancel.');
        return;
      }

      // Show the modal for cancellation reason
      ordersToCancel.value = orderedOrders;
      cancelModalOrdersCount.value = orderedOrders.length;
      cancelReason.value = '';
      showCancelModal.value = true;
    };

    const closeCancelModal = () => {
      showCancelModal.value = false;
      cancelReason.value = '';
      ordersToCancel.value = [];
      cancelModalOrdersCount.value = 0;
    };

    const confirmCancellation = async () => {
      const reason = cancelReason.value.trim();

      if (!reason) {
        return;
      }

      // Close the modal
      showCancelModal.value = false;

      loading.value = true;

      try {
        const results = {
          succeeded: 0,
          failed: 0,
          errors: [],
          newOrders: []
        };

        // Process each ordered order
        for (const order of ordersToCancel.value) {
          try {
            console.log(`Cancelling order ${order.OrderNumber}...`);
            const result = await api.purchaseOrders.cancelOrder(order.OrderNumber, reason);

            if (result.success) {
              results.succeeded++;
              results.newOrders.push(result.newOrder);
              console.log(`✓ Order ${order.OrderNumber} cancelled. New draft order: ${result.newOrder}`);

              // Ask if user wants to send cancellation email
              const sendEmail = confirm(
                `Order ${order.OrderNumber} cancelled successfully.\n\n` +
                `New draft order created: ${result.newOrder}\n\n` +
                `Send cancellation email to supplier?`
              );

              if (sendEmail) {
                try {
                  const emailResult = await api.purchaseOrders.sendCancellationEmail(order.OrderNumber, {});

                  if (emailResult.success) {
                    console.log(`✓ Cancellation email sent for order ${order.OrderNumber}`);
                  } else {
                    console.error(`Failed to send cancellation email: ${emailResult.message}`);
                    alert(`Warning: Order cancelled but email failed: ${emailResult.message}`);
                  }
                } catch (emailError) {
                  console.error('Error sending cancellation email:', emailError);
                  alert(`Warning: Order cancelled but email failed: ${emailError.message}`);
                }
              }
            } else {
              results.failed++;
              results.errors.push(`${order.OrderNumber}: ${result.message || 'Unknown error'}`);
              console.error(`✗ Failed to cancel order ${order.OrderNumber}:`, result.message);
            }
          } catch (error) {
            results.failed++;
            results.errors.push(`${order.OrderNumber}: ${error.message}`);
            console.error(`✗ Error cancelling order ${order.OrderNumber}:`, error);
          }
        }

        // Show results
        let message = `Cancel Orders Results:\n\n` +
          `Total: ${ordersToCancel.value.length}\n` +
          `Succeeded: ${results.succeeded}\n` +
          `Failed: ${results.failed}`;

        if (results.newOrders.length > 0) {
          message += `\n\nNew Draft Orders Created:\n${results.newOrders.join('\n')}`;
        }

        if (results.failed > 0) {
          message += `\n\nErrors:\n${results.errors.join('\n')}`;
        }

        alert(message);

        // Reload orders to reflect changes
        if (results.succeeded > 0) {
          await loadOrders();
        }
      } catch (error) {
        console.error('Error cancelling orders:', error);
        alert('Error cancelling orders: ' + error.message);
      } finally {
        loading.value = false;
        // Clean up modal state
        cancelReason.value = '';
        ordersToCancel.value = [];
        cancelModalOrdersCount.value = 0;
      }
    };

    const onCellValueChanged = async (event) => {
      // Handle supplier assignment changes
      if (event.colDef.field === 'SupplierName') {
        const orderNumber = event.data.OrderNumber;
        const supplierName = event.newValue;
        const costCentre = event.data.CostCentre;

        if (!supplierName) {
          console.log('Supplier cleared for order:', orderNumber);
          return;
        }

        try {
          // Get pre-loaded nominated suppliers for this cost centre
          const suppliers = suppliersByCostCentre.value[costCentre] || [];

          // Find the supplier by name to get the code
          const supplier = suppliers.find(s => s.SupplierName === supplierName);

          if (!supplier) {
            console.error('Supplier not found in nominated suppliers list');
            // Revert the change
            event.node.setDataValue('SupplierName', event.oldValue);
            return;
          }

          // Update the order with the supplier code
          console.log(`Updating order ${orderNumber} with supplier: ${supplier.Supplier_Code} (${supplierName}), status: Draft`);
          const updateResult = await api.purchaseOrders.updateOrder(orderNumber, {
            supplier: supplier.Supplier_Code,
            status: 'Draft'  // Set status to Draft when supplier is assigned (can be changed later)
          });

          console.log('Update result:', updateResult);

          if (!updateResult.success) {
            console.error('Failed to assign supplier:', updateResult.message);
            alert(`Failed to assign supplier: ${updateResult.message}`);
            // Revert the change
            event.node.setDataValue('SupplierName', event.oldValue);
            return;
          }

          // Update the row data - only update fields that exist as columns
          event.node.setDataValue('Status', 'Draft'); // Set status to Draft when supplier is assigned

          console.log(`✓ Supplier assigned: ${supplierName} (${supplier.Supplier_Code}) to order ${orderNumber}, Status set to Draft`);

        } catch (error) {
          console.error('Error assigning supplier:', error);
          // Revert the change
          event.node.setDataValue('SupplierName', event.oldValue);
        }
      }

      // Handle status changes
      if (event.colDef.field === 'Status') {
        const orderNumber = event.data.OrderNumber;
        const newStatus = event.newValue;
        const oldStatus = event.oldValue;

        if (!newStatus || newStatus === oldStatus) {
          return;
        }

        try {
          // Update the order status in the database
          const updateResult = await api.purchaseOrders.updateOrder(orderNumber, {
            status: newStatus
          });

          if (!updateResult.success) {
            console.error('Failed to update status:', updateResult.message);
            // Revert the change
            event.node.setDataValue('Status', oldStatus);
            return;
          }

          console.log(`✓ Status updated: ${orderNumber} → ${newStatus}`);

        } catch (error) {
          console.error('Error updating status:', error);
          // Revert the change
          event.node.setDataValue('Status', oldStatus);
        }
      }
    };

    // Full-Width Row configuration (AG Grid Community)
    const getRowId = (params) => {
      if (params.data.rowType === 'detail') {
        return `detail-${params.data.orderNumber}`;
      }
      return params.data.OrderNumber;
    };

    const getRowHeight = (params) => {
      // Detail rows get dynamic height based on number of items
      if (params.data && params.data.rowType === 'detail') {
        const items = params.data.items || [];
        if (items.length === 0) {
          return 60; // Loading message height
        }
        // Header (40px) + padding (20px) + items (32px each)
        return 60 + (items.length * 32);
      }
      // Normal order rows
      return 42;
    };

    // Toggle order expansion
    const toggleOrderExpansion = async (orderNumber) => {
      const isExpanded = expandedOrders.value.has(orderNumber);

      if (isExpanded) {
        // Collapse
        expandedOrders.value.delete(orderNumber);
        expandedOrders.value = new Set(expandedOrders.value); // Trigger reactivity
      } else {
        // Expand - load line items if not already loaded
        if (!orderLineItems.value[orderNumber]) {
          console.log('Loading line items for:', orderNumber);
          const result = await api.purchaseOrders.getOrderLineItems(orderNumber);

          if (result.success) {
            console.log('Loaded items:', result.items);
            orderLineItems.value[orderNumber] = result.items;
          } else {
            console.error('Failed to load items:', result.message);
            orderLineItems.value[orderNumber] = [];
          }
        }

        expandedOrders.value.add(orderNumber);
        expandedOrders.value = new Set(expandedOrders.value); // Trigger reactivity
      }

      // Force grid refresh to render new detail rows
      if (gridApi.value) {
        gridApi.value.redrawRows();
      }
    };

    // Restore selected job from sessionStorage and auto-open job selector if needed
    onMounted(async () => {
      // Try to restore previously selected job from sessionStorage
      const savedJob = sessionStorage.getItem('purchaseOrders_selectedJob');
      if (savedJob) {
        try {
          selectedJob.value = JSON.parse(savedJob);
          // Load orders for the restored job
          await loadOrders();
        } catch (error) {
          console.error('Failed to restore selected job:', error);
          // If restore fails, open job selector
          showJobSelector.value = true;
        }
      } else {
        // No saved job, open job selector
        showJobSelector.value = true;
      }
    });

    return {
      isDarkMode,
      selectedJob,
      orders,
      loading,
      selectedOrders,
      gridContainer,
      showJobSelector,
      showTemplateGallery,
      showOrderPreview,
      previewOrderNumber,
      showOrderEdit,
      editOrderNumber,
      showNominatedSuppliers,
      showAssetsLibrary,
      showPartialsLibrary,
      showCancelModal,
      showDocumentsModal,
      selectedOrderEntityCode,
      cancelReason,
      cancelModalOrdersCount,
      loggedCount,
      toOrderCount,
      selectedCostCentres,
      selectedLoads,
      selectionSummary,
      defaultColDef,
      rowSelectionConfig,
      gridRowData,
      getRowId,
      getRowHeight,
      isFullWidthRow,
      fullWidthCellRenderer,
      columnDefs,
      onGridReady,
      handleGridClick,
      onSelectionChanged,
      onCellValueChanged,
      onJobSelected,
      refreshOrders,
      previewOrder,
      previewSelected,
      editOrder,
      onOrderSaved,
      onSuppliersUpdated,
      printSelected,
      saveAsPDFSelected,
      emailSelected,
      markAsSent,
      cancelSelectedOrders,
      closeCancelModal,
      confirmCancellation,
      hasOrderedOrders,
      selectAll,
      deselectAll
    };
  }
};
</script>

<style scoped>
.purchase-orders-tab {
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.job-summary {
  font-size: 0.9rem;
}

.action-bar {
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

/* Fix AG Grid cell editor dropdown z-index */
:deep(.ag-popup) {
  z-index: 9999 !important;
}

:deep(.ag-select-editor) {
  z-index: 9999 !important;
}

:deep(.ag-cell-editor) {
  z-index: 9999 !important;
}


/* Ensure grid doesn't clip the dropdown */
:deep(.ag-root-wrapper) {
  overflow: visible !important;
}

:deep(.ag-body-viewport) {
  overflow-x: auto !important;
  overflow-y: auto !important;
}
</style>
