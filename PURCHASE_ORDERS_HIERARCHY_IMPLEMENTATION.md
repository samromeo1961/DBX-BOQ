# Purchase Orders Hierarchy Implementation Plan

**Date:** 2025-11-20
**Status:** In Progress
**Phase:** Phase 1 - Order Management Tab

## Problem Statement

The Purchase Orders hierarchy is not working. The current implementation uses AG Grid row grouping, but the legacy Databuild system uses an expandable master-detail pattern.

## Legacy System Hierarchy (from Databuild Help Files)

Based on `Order Management.pdf` and `Print, email or batch orders.pdf`:

### Three-Level Hierarchy:

```
📁 JOB LEVEL
  Click + next to job → expands to show orders

  └─ 📋 COST CENTRE/LOAD LEVEL (Order Summary Rows)
       Click + next to order → expands to show items

       └─ 📦 ITEM LEVEL (Line Items)
            Individual catalogue items in the order
```

### Job Level Fields:
- Job: job number
- Client: client name
- Lock: lock symbol if job is locked
- LastCost: total cost from BOQ
- Ordered: amount logged for job
- Job Details: job address

### Cost Centre/Load Level (Order) Fields:
- Code: cost centre code
- Cost Centre: cost centre name
- VO: variation number
- Load: load number
- Supplier: supplier code
- Name: supplier name
- Amount: order amount
- Ordered: checkbox if logged (can be manually checked)
- % Supplied: percentage supplied
- Del Date: delivery date
- Order Date: date logged
- Order No: order number
- Format: format sent (Print, Email, SFTP)
- User: user who logged
- Attachments: file attachments
- Standard Notes: standard notes
- OvRuns: overrun cause code
- Invoiced: invoiced amount
- Authorised %: authorized percentage
- Balance: yet to be invoiced
- Request: approval requested checkbox
- Approved: approved checkbox
- Comments: comments

### Item Level Fields:
- Code: catalogue item code
- Description: item description
- Quantity: number of units
- Units: unit type
- UnitPrice: unit price
- Price: overall price for item

## Current Implementation Issues

### File: `frontend/src/components/PurchaseOrders/PurchaseOrdersTab.vue`

**Lines 429-447: Row Grouping Configuration**
```javascript
{
  headerName: 'Cost Centre',
  field: 'CostCentre',
  width: 120,
  rowGroup: true,  // ❌ WRONG - This groups/aggregates data
  hide: true,
  sort: 'asc'
},
{
  headerName: 'Load',
  field: 'BLoad',
  width: 80,
  rowGroup: true,  // ❌ WRONG - This groups/aggregates data
  hide: true,
  sort: 'asc'
}
```

**Lines 353-378: Auto Group Column**
```javascript
const autoGroupColumnDef = {
  headerName: 'Order Groups',
  minWidth: 300,
  // This is for grouped data, not master-detail
}
```

### What's Wrong:
1. **Row Grouping** aggregates data into groups - NOT what we want
2. **Master-Detail** shows child rows when parent expands - THIS is what we need
3. Each order (JobNo/CostCentre/Load) should be a separate row
4. Clicking + on an order row should show its line items

## Proposed Solution

### Step 1: Remove Row Grouping

Remove `rowGroup: true` from column definitions and remove `autoGroupColumnDef`.

### Step 2: Implement Master-Detail Pattern

**AG Grid Master-Detail Configuration:**
```javascript
// Add to grid options
masterDetail: true,
detailCellRendererParams: {
  detailGridOptions: {
    columnDefs: [
      { field: 'ItemCode', headerName: 'Code' },
      { field: 'Description', headerName: 'Description' },
      { field: 'Quantity', headerName: 'Quantity' },
      { field: 'Unit', headerName: 'Units' },
      { field: 'UnitPrice', headerName: 'Unit Price' },
      { field: 'LineTotal', headerName: 'Price' }
    ],
    defaultColDef: {
      flex: 1
    }
  },
  getDetailRowData: async (params) => {
    // Fetch line items for this order
    const result = await api.purchaseOrders.getOrderLineItems(params.data.OrderNumber);
    params.successCallback(result.items);
  }
}
```

### Step 3: Update Column Definitions

Match legacy system layout:
```javascript
const columnDefs = [
  {
    headerName: '',
    width: 50,
    cellRenderer: 'agGroupCellRenderer', // Shows +/- icon
    pinned: 'left'
  },
  { field: 'OrderNumber', headerName: 'Order Number', pinned: 'left' },
  { field: 'CostCentre', headerName: 'Cost Centre' },
  { field: 'CostCentreName', headerName: 'Cost Centre Name' },
  { field: 'BLoad', headerName: 'Load' },
  { field: 'SupplierName', headerName: 'Supplier' },
  { field: 'ItemCount', headerName: 'Items' },
  { field: 'OrderTotal', headerName: 'Total' },
  { field: 'OrderDate', headerName: 'Order Date' },
  { field: 'Status', headerName: 'Status' },
  // ... more columns
]
```

### Step 4: Update Data Structure

Backend already provides correct structure via `getOrdersForJob()`:
- Each row = one order (JobNo/CostCentre/Load combination)
- Line items fetched on-demand via `getOrderLineItems(orderNumber)`

## Implementation Steps

### 1. Update PurchaseOrdersTab.vue

**Remove:**
- `rowGroup: true` from CostCentre and BLoad columns
- `autoGroupColumnDef` configuration
- `groupDefaultExpanded` option
- `groupDisplayType` option

**Add:**
- `masterDetail: true`
- `detailCellRendererParams` with line items grid
- `cellRenderer: 'agGroupCellRenderer'` to first column
- `isRowMaster` function to determine which rows can expand

### 2. Update Column Definitions

Make columns visible and match legacy layout:
- CostCentre: make visible (currently hidden)
- BLoad: make visible (currently hidden)
- Reorder columns to match legacy system

### 3. Add Detail Row Data Handler

Create async function to fetch line items when row expands:
```javascript
const getDetailRowData = async (params) => {
  const orderNumber = params.data.OrderNumber;
  const result = await api.purchaseOrders.getOrderLineItems(orderNumber);
  if (result.success) {
    params.successCallback(result.items);
  } else {
    params.successCallback([]);
  }
}
```

### 4. Test Hierarchy

1. Select a job
2. Orders display as flat list (one row per order)
3. Click + icon on an order row
4. Verify line items display in detail grid
5. Click - icon to collapse

## Backend Support

### Already Implemented:

**File:** `src/ipc-handlers/purchase-orders.js`

**Line 127-329: getOrdersForJob()**
- Returns list of orders for a job
- Each order = JobNo/CostCentre/Load combination
- ✅ Correct structure for master-detail

**Line 334-391: getOrderLineItems()**
- Returns line items for a specific order
- Takes orderNumber (format: "JobNo/CostCentre.Load")
- ✅ Perfect for detail grid data

**No backend changes needed!**

## Visual Layout

### Current (WRONG):
```
[>] Cost Centre Group
    [>] Load Group
        Order Row 1
        Order Row 2
```

### Target (CORRECT):
```
[+] Order 1473/670.1 - Baths                          $819.00
[+] Order 1473/680.1 - Laundry Tub/Sinks             $303.00
[-] Order 1473/700.1 - Garage Doors                 $2,615.00
    └── Item: 11200150 - Wind Clarification...  $100.00
    └── Item: 11200250 - Structural Design...   $150.00
    └── Item: 11200300 - Structural Design...   $150.00
[+] Order 1473/720.1 - Waterproofing               $1,275.00
```

## Files to Modify

1. **frontend/src/components/PurchaseOrders/PurchaseOrdersTab.vue**
   - Lines 338-378: Remove auto group column def
   - Lines 380-531: Update column definitions
   - Lines 140-160: Update AG Grid configuration
   - Add master-detail configuration

2. **No backend changes required** ✅

## Testing Checklist

- [ ] Orders display as flat list (not grouped)
- [ ] Each row shows one order with all fields visible
- [ ] + icon appears in first column
- [ ] Clicking + expands to show line items
- [ ] Line items show: Code, Description, Quantity, Units, UnitPrice, Price
- [ ] Clicking - collapses the detail view
- [ ] Multiple orders can be expanded simultaneously
- [ ] Selection works with checkboxes
- [ ] Batch operations work with selected orders

## Reference Documents

- `c:\Users\User\OneDrive\Desktop\Order Management.pdf` - Pages 1-14
- `c:\Users\User\OneDrive\Desktop\Print, email or batch orders.pdf` - Pages 1-8
- Screenshot: `c:\Users\User\AppData\Local\Temp\SnagitTemp\2025-11-20_17-13-02.PNG`

## Current Status

- [x] Analyzed legacy documentation
- [x] Identified current implementation issues
- [x] Designed solution using AG Grid Master-Detail
- [ ] Implement master-detail configuration
- [ ] Update column definitions
- [ ] Test hierarchy expansion
- [ ] Verify all order management features still work

## Notes

- The job selection happens BEFORE this grid (via JobSelector modal)
- The grid shows orders for ONE selected job at a time
- The hierarchy is only 2 levels in the grid: Order → Items
- Job level selection is handled separately (not in this grid)
