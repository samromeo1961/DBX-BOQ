# Supplier Prices Grid Visibility Fix

## Issue
The AG Grid component in the SupplierPricesPanel was loading data successfully (confirmed by console logs showing 3 supplier prices), but **the grid was not visible** on screen.

## Root Cause
AG Grid error message revealed the problem:
```
AG Grid: tried to call sizeColumnsToFit() but the grid is coming back with zero width,
maybe the grid is not visible yet on the screen?
```

**Why this happened:**
1. The SupplierPricesPanel is inside a tab that uses `v-show="activeTab === 'prices'"`
2. When the component mounts, the tab may be hidden (display: none)
3. AG Grid initializes while the container has zero width
4. Even after the tab becomes visible, the grid doesn't know to resize itself

## Solution

### 1. Added `isVisible` prop to SupplierPricesPanel
```vue
props: {
  itemCode: { type: String, default: null },
  isVisible: { type: Boolean, default: true }  // NEW
}
```

### 2. Watch for visibility changes and resize grid
```javascript
// Watch for when the tab becomes visible
watch(() => props.isVisible, (visible) => {
  if (visible && supplierPrices.value.length > 0) {
    setTimeout(() => {
      gridApi.value.sizeColumnsToFit();
    }, 100);
  }
});
```

### 3. Pass visibility state from CatalogueTab
```vue
<SupplierPricesPanel
  :itemCode="selectedItemCode"
  :isVisible="activeTab === 'prices'"  <!-- NEW -->
  @updated="loadCatalogue"
/>
```

### 4. Additional improvements
- Added debug message showing count of loaded prices
- Added warning when no prices found for an item
- Added auto-resize when data loads
- Added visual indicators and better logging

## How It Works Now

1. **Item selected** → `selectedItemCode` updates → SupplierPricesPanel loads data
2. **Data loads** → Console shows: "SupplierPricesPanel: Loaded 3 supplier prices"
3. **Grid initializes** → May have zero width if tab is hidden
4. **User clicks "Supplier Prices" tab** → `activeTab` changes to 'prices'
5. **isVisible prop becomes true** → Watcher triggers
6. **Grid resizes** → `sizeColumnsToFit()` called with proper width
7. **Grid becomes visible** ✓

## Testing
The grid should now:
- Show data when you click the "Supplier Prices" tab
- Auto-resize columns to fit
- Display count: "3 supplier price(s) for 005 008"
- Show warning if no prices exist

## Files Changed
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue`
  - Added `isVisible` prop
  - Added watchers for visibility and data changes
  - Added manual resize function
  - Added debug info and warnings

- `frontend/src/components/Catalogue/CatalogueTab.vue`
  - Pass `isVisible` prop based on active tab
