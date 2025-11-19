<template>
  <div class="usage-panel p-3">
    <div v-if="loading" class="text-center py-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="text-muted mt-2">Loading usage data...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>
      {{ error }}
    </div>

    <div v-else>
      <!-- Summary Card -->
      <div class="card mb-3">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">
            <i class="bi bi-diagram-3 me-2"></i>
            Usage Summary for {{ itemCode }}
          </h6>
        </div>
        <div class="card-body">
          <div class="row text-center">
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="mb-0 text-primary">{{ usageData.recipes?.length || 0 }}</h5>
                <small class="text-muted">Recipes</small>
              </div>
            </div>
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="mb-0 text-success">{{ usageData.boq?.length || 0 }}</h5>
                <small class="text-muted">BOQ Items</small>
              </div>
            </div>
            <div class="col-4">
              <div class="border rounded p-2">
                <h5 class="mb-0 text-warning">{{ usageData.purchaseOrders?.length || 0 }}</h5>
                <small class="text-muted">Purchase Orders</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Used in Recipes -->
      <div v-if="usageData.recipes?.length > 0" class="card mb-3">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-box-seam me-2 text-primary"></i>
            Used as Ingredient in Recipes ({{ usageData.recipes.length }})
          </h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th>Recipe Code</th>
                  <th>Recipe Name</th>
                  <th>Quantity</th>
                  <th>Formula</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="recipe in usageData.recipes" :key="recipe.RecipeCode">
                  <td class="font-monospace">{{ recipe.RecipeCode }}</td>
                  <td>{{ recipe.RecipeName }}</td>
                  <td class="text-end">{{ recipe.Quantity }}</td>
                  <td>
                    <span v-if="recipe.Formula" class="font-monospace text-muted small">
                      {{ recipe.Formula }}
                    </span>
                    <span v-else class="text-muted">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Used in BOQ -->
      <div v-if="usageData.boq?.length > 0" class="card mb-3">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-file-earmark-spreadsheet me-2 text-success"></i>
            Used in Bill of Quantities ({{ usageData.boq.length }})
          </h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th>Job No</th>
                  <th>CC</th>
                  <th>Load</th>
                  <th>Line</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in usageData.boq" :key="index">
                  <td class="font-monospace">{{ item.JobNo }}</td>
                  <td>{{ item.CostCentre }}</td>
                  <td class="text-center">{{ item.BLoad }}</td>
                  <td class="text-center">{{ item.LineNumber }}</td>
                  <td class="text-end">{{ formatNumber(item.Quantity) }}</td>
                  <td class="text-end">{{ formatCurrency(item.UnitPrice) }}</td>
                  <td class="text-end fw-bold">{{ formatCurrency(item.Quantity * item.UnitPrice) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Used in Purchase Orders -->
      <div v-if="usageData.purchaseOrders?.length > 0" class="card mb-3">
        <div class="card-header">
          <h6 class="mb-0">
            <i class="bi bi-cart-check me-2 text-warning"></i>
            Used in Purchase Orders ({{ usageData.purchaseOrders.length }})
          </h6>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive" style="max-height: 300px; overflow-y: auto;">
            <table class="table table-sm table-hover mb-0">
              <thead class="table-light sticky-top">
                <tr>
                  <th>Job No</th>
                  <th>CC</th>
                  <th>Load</th>
                  <th>Line</th>
                  <th>Description</th>
                  <th>Qty Ordered</th>
                  <th>Qty Received</th>
                  <th>Line Price</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(order, index) in usageData.purchaseOrders" :key="index">
                  <td class="font-monospace">{{ order.JobNo }}</td>
                  <td>{{ order.CostCentre }}</td>
                  <td class="text-center">{{ order.BLoad }}</td>
                  <td class="text-center">{{ order.Counter }}</td>
                  <td>{{ order.Description }}</td>
                  <td class="text-end">{{ formatNumber(order.Quantity) }}</td>
                  <td class="text-end">{{ formatNumber(order.QtyReceived) }}</td>
                  <td class="text-end">{{ formatCurrency(order.LinePrice) }}</td>
                  <td>{{ order.Invoice || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- No Usage Found -->
      <div v-if="!usageData.recipes?.length && !usageData.boq?.length && !usageData.purchaseOrders?.length" class="alert alert-info">
        <i class="bi bi-info-circle me-2"></i>
        This item is not currently used in any recipes, BOQ, or purchase orders.
        <p class="mb-0 mt-2 small text-muted">
          This item can be safely deleted if it's no longer needed in the catalogue.
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'UsagePanel',
  props: {
    itemCode: {
      type: String,
      required: true
    },
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const api = useElectronAPI();
    const loading = ref(false);
    const error = ref(null);
    const usageData = ref({
      recipes: [],
      boq: [],
      purchaseOrders: []
    });

    async function loadUsage() {
      if (!props.itemCode || !props.isVisible) return;

      loading.value = true;
      error.value = null;

      try {
        const result = await api.catalogue.getItemUsage(props.itemCode);
        if (result.success) {
          usageData.value = result.data;
        } else {
          error.value = result.error || 'Failed to load usage data';
        }
      } catch (err) {
        console.error('Error loading usage:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    }

    // Watch for changes to itemCode or visibility
    watch(() => [props.itemCode, props.isVisible], () => {
      loadUsage();
    }, { immediate: true });

    function formatNumber(value) {
      if (value == null) return '-';
      return parseFloat(value).toFixed(2);
    }

    function formatCurrency(value) {
      if (value == null) return '-';
      return `$${parseFloat(value).toFixed(2)}`;
    }

    function formatDate(date) {
      if (!date) return '-';
      return new Date(date).toLocaleDateString();
    }

    return {
      loading,
      error,
      usageData,
      formatNumber,
      formatCurrency,
      formatDate
    };
  }
};
</script>

<style scoped>
.usage-panel {
  background-color: #f8f9fa;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
}

.sticky-top {
  position: sticky;
  top: 0;
  z-index: 10;
}

.table {
  font-size: 0.875rem;
}

.font-monospace {
  font-family: 'Courier New', monospace;
}
</style>
