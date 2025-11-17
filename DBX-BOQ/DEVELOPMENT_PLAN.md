# Bill of Quantities (BOQ) System - Development Plan

## Executive Summary

This document outlines the phased development approach for the Bill of Quantities module, integrating with the Databuild SQL Server database using an Electron + Vue.js 3 architecture.

---

## Technology Stack

### Frontend
- **Vue.js 3** (Composition API) - Modern reactive framework
- **AG Grid Community** - Advanced data grid for BOQ table
- **Bootstrap 5** - UI framework for layout and components
- **Vite** - Build tool and dev server

### Backend
- **Electron** - Desktop application framework
- **mssql** - SQL Server database client
- **electron-store** - Persistent storage for user settings

### Database
- **System DB:** `CROWNESYS` (or configured name) - Master data
- **Job DB:** `CROWNEJOB` (or configured name) - Job-specific data

---

## Database Architecture Summary

### Key Tables Used

**System Database (CROWNESYS):**
- `PriceList` - Catalogue items and recipes
- `CostCentres` - Cost centre hierarchy (always filter Tier=1)
- `Prices` - Price history by PriceLevel and Date
- `PerCodes` - Units of measure (handle % specially)
- `Recipe` - Recipe sub-items (Main_Item -> Sub_Item)
- `Supplier` - Supplier master data
- `CCSuppliers` - Preferred suppliers per cost centre (critical constraint)
- `SuppliersPrices` - Supplier-specific pricing
- `Contacts` - Client/contact information
- `StandardNotes` - Reusable order notes
- `GlobalNotes` - Auto-applied order notes

**Job Database (CROWNEJOB):**
- `Jobs` - Job master records (links to Contacts via Job_No = Code)
- `Bill` - BOQ line items (JobNo + CostCentre + BLoad + LineNumber)
- `Orders` - Purchase order headers (OrderNumber = JobNo/CostCentre.BLoad)
- `OrderDetails` - Alternative item descriptions

---

## Development Phases

## PHASE 1: Project Setup & Infrastructure (Week 1)

### 1.1 Project Initialization
- [ ] Initialize Electron + Vue 3 project structure
- [ ] Install core dependencies (electron, vue, vite, mssql, ag-grid, bootstrap)
- [ ] Configure Vite for Electron development
- [ ] Set up development scripts (dev, build, dist)
- [ ] Configure electron-builder for packaging

**Deliverable:** Working Electron app shell with Vue dev server

### 1.2 Database Connection Layer
- [ ] Create `src/database/connection.js` module
- [ ] Implement connection pool management
- [ ] Auto-detect Job DB from System DB name (replace SYS with JOB)
- [ ] Add connection status monitoring
- [ ] Create connection configuration UI (modal/dialog)
- [ ] Store connection settings in electron-store

**Deliverable:** Functional database connection with config UI

**Files to Create:**
```
src/
├── database/
│   └── connection.js          # Connection pool management
├── ipc-handlers/
│   └── database.js            # Connection IPC handlers
frontend/
└── src/
    └── components/
        └── DatabaseConfig.vue  # Connection settings UI
```

### 1.3 IPC Communication Foundation
- [ ] Create `preload.js` with contextBridge setup
- [ ] Implement base IPC handler registration pattern
- [ ] Create `useElectronAPI.js` composable
- [ ] Add error handling wrapper for IPC calls
- [ ] Create loading state management utilities

**Deliverable:** Type-safe IPC communication layer

---

## PHASE 2: Core BOQ Screen Layout (Week 2)

### 2.1 Main BOQ Window Structure
- [ ] Create `BillOfQuantities.vue` main component
- [ ] Implement resizable screen layout (user adjustable)
- [ ] Create BOQ Toolbar component (top row)
- [ ] Implement screen size persistence (electron-store)
- [ ] Add perimeter spacing for proper resize behavior

**Layout Structure:**
```
┌─────────────────────────────────────────────────┐
│ BOQ Toolbar (Job, Price Level, Load, Date...)  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────────┬─────────────────────┐  │
│  │                    │                     │  │
│  │  BOQ Items Grid    │  Catalogue Search   │  │
│  │  (AG Grid)         │  Panel              │  │
│  │  (Bottom/Left)     │  (Right)            │  │
│  │                    │                     │  │
│  └────────────────────┴─────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 2.2 BOQ Toolbar Components
- [ ] Job selector dropdown (with search/filter)
- [ ] Price Level selector dropdown
- [ ] Load selector dropdown (multiple loads per cost centre)
- [ ] Bill Date picker (for repricing calculations)
- [ ] Cost Centre selector dropdown
- [ ] Catalogue search toggle button
- [ ] Options/Settings icon button
- [ ] Reports dropdown button
- [ ] Save/Refresh action buttons

**Database Queries Needed:**
```sql
-- Get all jobs with client names
SELECT j.Job_No, c.Name AS Client, j.Status
FROM Jobs j
LEFT JOIN [CROWNESYS].dbo.Contacts c ON j.Job_No = c.Code
WHERE j.Status != 'Archived'
ORDER BY j.Job_No DESC

-- Get price levels
SELECT DISTINCT PriceLevel FROM Prices ORDER BY PriceLevel

-- Get loads for job
SELECT DISTINCT BLoad FROM Bill WHERE JobNo = @JobNo ORDER BY BLoad
```

---

## PHASE 3: Options Screen (Week 3)

### 3.1 Options Panel UI
- [ ] Create `BOQOptions.vue` component (modal dialog)
- [ ] Implement tabbed/sectioned layout (RED headings)
- [ ] Add SAVE button with visual confirmation
- [ ] Load options from electron-store on startup
- [ ] Apply options to active BOQ screen

**Section Groups:**
1. **View Settings** (red heading)
2. **New Items Settings** (red heading)
3. **Options - General** (red heading)
4. **Options - Orders** (red heading)
5. **Order Display** (red heading)

### 3.2 View Settings
- [ ] Budget column display toggle
- [ ] Sub Group Grid display toggle
- [ ] Apply visibility changes to AG Grid columns

### 3.3 New Items Settings
- [ ] Default Price Level selector
- [ ] Zero Price -> Manual Price checkbox
- [ ] Default Quantity input field
- [ ] Default Line insertion point radio buttons (Before/After/End)

### 3.4 General Options
- [ ] Close other estimating functions checkbox
- [ ] Auto Save Budgets checkbox
- [ ] Auto reprice on load checkbox
- [ ] Auto Hog (job locking) checkbox
- [ ] Block Edits on Logged Orders checkbox
- [ ] Supplier Area Pricing checkbox
- [ ] Prompt whole catalogue checkbox
- [ ] Lock preferred supplier checkbox
- [ ] Remove unexploded recipes checkbox
- [ ] Explode Zero Qty recipes checkbox
- [ ] Save Snapshots interval input
- [ ] Retain Cost Centre checkbox

### 3.5 Order Options
- [ ] Order Logging checkbox
- [ ] Order checking criteria configuration
- [ ] Manual prices override supplier prices checkbox
- [ ] Force order number format checkbox
- [ ] Auto-insert today's date on order checkbox

### 3.6 Order Display Settings
- [ ] GST Display dropdown (No GST / Add per line / Total then GST)
- [ ] Item Reference dropdown (None / Our Code / Supplier Ref / Both / Our if no Supplier)
- [ ] Price Display dropdown (Supplier default / All / Total only / None / Supplier only)
- [ ] Print catalogue pictures checkbox

**Storage Schema:**
```javascript
{
  view: {
    showBudgetColumn: true,
    showSubGroupGrid: false
  },
  newItems: {
    defaultPriceLevel: 0,
    zeroToManual: true,
    defaultQuantity: 1,
    insertionPoint: 'end' // 'before' | 'after' | 'end'
  },
  general: {
    closeOtherFunctions: false,
    autoSaveBudgets: true,
    autoRepriceOnLoad: false,
    autoHog: false,
    blockEditLoggedOrders: true,
    supplierAreaPricing: false,
    promptWholeCatalogue: true,
    lockPreferredSupplier: false,
    removeUnexplodedRecipes: false,
    explodeZeroQtyRecipes: false,
    snapshotInterval: 0,
    retainCostCentre: true
  },
  orders: {
    logOrders: true,
    checkingCriteria: {},
    manualPricesOverride: true,
    forceOrderNumberFormat: true,
    autoInsertTodaysDate: true
  },
  orderDisplay: {
    gstDisplay: 'totalThenGst', // 'none' | 'perLine' | 'totalThenGst'
    itemReference: 'both', // 'none' | 'ourCode' | 'supplierRef' | 'both' | 'ourIfNoSupplier'
    priceDisplay: 'all', // 'supplierDefault' | 'all' | 'totalOnly' | 'none' | 'supplierOnly'
    printPictures: false
  }
}
```

---

## PHASE 4: Catalogue Search Panel (Week 4)

### 4.1 Catalogue Search UI
- [ ] Create `CatalogueSearch.vue` component
- [ ] Implement search/filter input with debounce
- [ ] Add Cost Centre filter dropdown
- [ ] Show "whole catalogue" vs "current cost centre" mode
- [ ] Create AG Grid for catalogue items
- [ ] Support multi-select of items
- [ ] Add "Add Selected Items" button

### 4.2 Catalogue Data Loading
- [ ] Create `src/ipc-handlers/catalogue.js`
- [ ] Query PriceList with latest prices
- [ ] Join CostCentres (Tier=1), PerCodes, Prices
- [ ] Filter archived items (Archived=0)
- [ ] Sort by Cost Centre SortOrder
- [ ] Handle Recipe indicator display

**SQL Query:**
```sql
SELECT
  PL.PriceCode,
  PL.Description,
  PL.CostCentre,
  CC.Name AS CostCentreName,
  CC.SubGroup,
  PC.Printout AS Unit,
  PL.Recipe,
  PL.RecipeIngredient,
  (SELECT TOP 1 Price FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = @PriceLevel
   ORDER BY Date DESC) AS Price,
  (SELECT TOP 1 Date FROM Prices
   WHERE PriceCode = PL.PriceCode AND PriceLevel = @PriceLevel
   ORDER BY Date DESC) AS PriceDate
FROM PriceList PL
LEFT JOIN CostCentres CC ON PL.CostCentre = CC.Code AND CC.Tier = 1
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE PL.Archived = 0
  AND (@CostCentre IS NULL OR PL.CostCentre = @CostCentre)
  AND (@SearchText IS NULL OR PL.Description LIKE '%' + @SearchText + '%' OR PL.PriceCode LIKE '%' + @SearchText + '%')
ORDER BY ISNULL(CC.SortOrder, 999999), PL.PriceCode
```

### 4.3 AG Grid Configuration
- [ ] Configure columns: Code, Description, Cost Centre, Unit, Price
- [ ] Enable row selection (multi-select with checkboxes)
- [ ] Add sorting and filtering
- [ ] Implement virtual scrolling for performance
- [ ] Add visual indicator for Recipe items

---

## PHASE 5: BOQ Items Grid (Week 5)

### 5.1 BOQ Grid Setup
- [ ] Create AG Grid for Bill items
- [ ] Configure editable columns (Quantity, Unit Price)
- [ ] Implement inline editing with validation
- [ ] Add calculated columns (Line Total, Budget)
- [ ] Handle percentage unit calculations (% = UnitPrice × Qty ÷ 100)

**Column Configuration:**
```javascript
columnDefs: [
  { field: 'ItemCode', headerName: 'Code', width: 150, editable: false },
  { field: 'Description', headerName: 'Description', flex: 1, editable: false },
  { field: 'Quantity', headerName: 'Qty', width: 100, editable: true, type: 'numericColumn' },
  { field: 'Unit', headerName: 'Unit', width: 80, editable: false },
  { field: 'UnitPrice', headerName: 'Unit Price', width: 120, editable: true, valueFormatter: currencyFormatter },
  {
    field: 'LineTotal',
    headerName: 'Total',
    width: 120,
    valueGetter: params => {
      const qty = params.data.Quantity || 0;
      const price = params.data.UnitPrice || 0;
      return params.data.Unit === '%' ? price * (qty / 100) : qty * price;
    },
    valueFormatter: currencyFormatter
  },
  { field: 'XDescription', headerName: 'Workup', width: 200, editable: true }
]
```

### 5.2 Load Bill Data
- [ ] Create `src/ipc-handlers/bill.js`
- [ ] Implement `getBillForJob` handler
- [ ] Query Bill table with joins to PriceList, PerCodes, CostCentres
- [ ] Filter by JobNo, CostCentre (if selected), BLoad
- [ ] Return items ordered by LineNumber

**SQL Query:**
```sql
SELECT
  b.JobNo,
  b.ItemCode,
  b.CostCentre,
  cc.Name AS CostCentreName,
  b.BLoad,
  b.LineNumber,
  b.Quantity,
  b.UnitPrice,
  b.XDescription AS Workup,
  pl.Description,
  pc.Printout AS Unit,
  CASE
    WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
    ELSE b.Quantity * b.UnitPrice
  END AS LineTotal
FROM [{jobDb}].dbo.Bill b
LEFT JOIN [{sysDb}].dbo.PriceList pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [{sysDb}].dbo.PerCodes pc ON pl.PerCode = pc.Code
LEFT JOIN [{sysDb}].dbo.CostCentres cc ON b.CostCentre = cc.Code AND cc.Tier = 1
WHERE b.JobNo = @JobNo
  AND (@CostCentre IS NULL OR b.CostCentre = @CostCentre)
  AND (@BLoad IS NULL OR b.BLoad = @BLoad)
  AND b.Quantity > 0
ORDER BY cc.SortOrder, b.CostCentre, b.LineNumber
```

### 5.3 Add Items to Bill
- [ ] Implement drag-and-drop from Catalogue to Bill grid
- [ ] Implement "Add Selected" button click handler
- [ ] Apply default quantity from options
- [ ] Apply default price level
- [ ] Apply insertion point logic (Before/After/End)
- [ ] Calculate next LineNumber
- [ ] Insert into Bill table
- [ ] Refresh grid

**Insert Logic:**
```javascript
// Determine LineNumber based on insertion point
let lineNumber;
if (insertionPoint === 'before' && currentRow) {
  lineNumber = currentRow.LineNumber;
  // Increment all subsequent line numbers
} else if (insertionPoint === 'after' && currentRow) {
  lineNumber = currentRow.LineNumber + 1;
  // Increment all subsequent line numbers
} else { // 'end'
  lineNumber = maxLineNumber + 1;
}

// Insert new Bill record
INSERT INTO Bill (JobNo, ItemCode, CostCentre, BLoad, LineNumber, Quantity, UnitPrice)
VALUES (@JobNo, @ItemCode, @CostCentre, @BLoad, @LineNumber, @DefaultQty, @Price)
```

### 5.4 Edit Bill Items
- [ ] Implement cell value change handler
- [ ] Validate quantity (must be > 0)
- [ ] Validate price (must be >= 0)
- [ ] Check if order is logged (block edits if "Block Edits on Logged Orders" enabled)
- [ ] Update Bill table
- [ ] Recalculate totals

---

## PHASE 6: Cost Centre Management (Week 6)

### 6.1 Cost Centre Display
- [ ] Load cost centres with Tier=1 filter
- [ ] Display in sorted order (SortOrder column)
- [ ] Show BOLD for cost centres with quantities entered
- [ ] Calculate budget totals per cost centre
- [ ] Show sub-groups if option enabled

**Bold Logic:**
```sql
-- Cost centres with quantities
SELECT DISTINCT b.CostCentre
FROM Bill b
WHERE b.JobNo = @JobNo AND b.Quantity > 0
```

### 6.2 Cost Centre Selector
- [ ] Create dropdown with grouped/hierarchical display
- [ ] Filter Bill grid by selected cost centre
- [ ] Retain selection if "Retain Cost Centre" option enabled
- [ ] Update catalogue filter to match selected cost centre (if not "whole catalogue" mode)

### 6.3 Budget Calculation
- [ ] Sum line totals per cost centre
- [ ] Display budget column if option enabled
- [ ] Handle percentage calculations correctly
- [ ] Update totals on quantity/price changes

---

## PHASE 7: Price Level Management (Week 7)

### 7.1 Price Level Selector
- [ ] Load available price levels from Prices table
- [ ] Display in dropdown (0=Base, 1+=Alternate)
- [ ] Apply default price level from options on load
- [ ] Reprice all items when price level changed

### 7.2 Repricing Logic
- [ ] Query Prices table for latest price at selected level and bill date
- [ ] Update UnitPrice in Bill table
- [ ] Handle items with no price (use Manual if "Zero to Manual" enabled)
- [ ] Show manual prices in RED (visual indicator)
- [ ] Recalculate all line totals

**Reprice Query:**
```sql
SELECT TOP 1 Price
FROM Prices
WHERE PriceCode = @ItemCode
  AND PriceLevel = @PriceLevel
  AND Date <= @BillDate
ORDER BY Date DESC
```

### 7.3 Manual Price Handling
- [ ] Allow manual entry of UnitPrice
- [ ] Mark manual prices visually (RED text)
- [ ] Store manual price flag (or detect by comparing to latest catalogue price)
- [ ] Apply "Zero to Manual" option logic
- [ ] Support "Manual prices override supplier prices" option

### 7.4 Bill Date Repricing
- [ ] Implement date picker for Bill Date
- [ ] Trigger automatic reprice when date changed (if "Auto reprice on load" enabled)
- [ ] Use date in price queries: `WHERE Date <= @BillDate`
- [ ] Show price date in tooltip/info

---

## PHASE 8: Recipe Explosion (Week 8)

### 8.1 Recipe Detection
- [ ] Query PriceList.Recipe flag
- [ ] Visual indicator in catalogue (icon/badge)
- [ ] Enable/disable explosion based on item type

### 8.2 Recipe Expansion Logic
- [ ] Query Recipe table for Main_Item = selected item
- [ ] Get all Sub_Item records
- [ ] Calculate quantities (apply Formula if exists)
- [ ] Insert sub-items into Bill
- [ ] Handle "Remove unexploded recipes" option (delete or zero quantity)
- [ ] Handle "Explode Zero Qty recipes" option

**Recipe Query:**
```sql
SELECT
  R.Sub_Item,
  R.Quantity,
  R.Formula,
  R.Cost_Centre,
  PL.Description,
  PL.PerCode,
  PC.Printout AS Unit
FROM Recipe R
INNER JOIN PriceList PL ON R.Sub_Item = PL.PriceCode
LEFT JOIN PerCodes PC ON PL.PerCode = PC.Code
WHERE R.Main_Item = @PriceCode
ORDER BY R.Counter
```

### 8.3 Recipe Explosion UI
- [ ] Add "Explode Recipe" button/action
- [ ] Show confirmation dialog with recipe contents
- [ ] Display sub-items before insertion
- [ ] Allow quantity multiplication (e.g., explode 5 units of recipe)
- [ ] Insert at appropriate line position

**Explosion Logic:**
```javascript
// For each sub-item in recipe:
const subItemQty = recipe.Quantity * parentQuantity;
const subItemPrice = getLatestPrice(recipe.Sub_Item, priceLevel);
const costCentre = recipe.Cost_Centre || parentCostCentre;

// Insert into Bill
await insertBillItem({
  JobNo,
  ItemCode: recipe.Sub_Item,
  CostCentre: costCentre,
  BLoad,
  LineNumber: nextLineNumber++,
  Quantity: subItemQty,
  UnitPrice: subItemPrice
});

// Handle parent item
if (options.removeUnexplodedRecipes) {
  await deleteBillItem(parentItemLineNumber);
} else {
  await updateBillItem(parentItemLineNumber, { Quantity: 0 });
}
```

---

## PHASE 9: Load Management (Week 9)

### 9.1 Load Selector
- [ ] Display loads per cost centre
- [ ] Create new load functionality
- [ ] Switch between loads
- [ ] Copy items between loads

### 9.2 Multiple Loads per Cost Centre
- [ ] Filter Bill items by BLoad
- [ ] Show load number in grid
- [ ] Manage line numbering per load
- [ ] Calculate totals per load

### 9.3 Load Operations
- [ ] Create new load (increment BLoad number)
- [ ] Copy items from one load to another
- [ ] Delete load (with confirmation)
- [ ] Merge loads

---

## PHASE 10: Drag & Drop Attribute Changes (Week 10)

### 10.1 Drag & Drop Infrastructure
- [ ] Implement drag source detection (first selected item)
- [ ] Track mouse cursor during drag (show dragster icon)
- [ ] Detect drop target (field/dropdown)
- [ ] Show confirmation dialog
- [ ] Apply attribute change to all selected items

### 10.2 Supported Attributes
- [ ] Unit of Measure (PerCode)
- [ ] Supplier Groups
- [ ] Job Types
- [ ] Cost Centre
- [ ] Other configurable attributes

### 10.3 Drag & Drop Logic
```javascript
// 1. User selects multiple items in grid
const selectedItems = gridApi.getSelectedRows();

// 2. User changes attribute on first item
const firstItem = selectedItems[0];
firstItem.Unit = 'm²'; // Example: change to square metres

// 3. User drags first item over Unit dropdown
onDragStart(event) {
  if (selectedItems.length > 1 && event.target === firstItem) {
    dragData = {
      sourceItem: firstItem,
      selectedItems: selectedItems,
      attribute: null
    };
    cursor.setIcon('dragster-red');
  }
}

onDragOver(event, fieldName) {
  if (dragData) {
    dragData.attribute = fieldName;
    event.preventDefault();
  }
}

onDrop(event) {
  const targetValue = dragData.sourceItem[dragData.attribute];

  showConfirmation({
    message: `Change ${dragData.attribute} to "${targetValue}" for ${selectedItems.length} items?`,
    onConfirm: async () => {
      for (const item of selectedItems) {
        await updateAttribute(item, dragData.attribute, targetValue);
      }
      refreshGrid();
    }
  });
}
```

### 10.4 Validation
- [ ] Ensure drag source is first selected item
- [ ] Validate target value is set on source item
- [ ] Confirm change affects multiple items
- [ ] Show error if constraints violated

---

## PHASE 11: Purchase Orders (Week 11)

### 11.1 Order Number Format
- [ ] Generate order number: `{JobNo}/{CostCentre}.{BLoad}`
- [ ] Validate format before logging
- [ ] Force format if "Force order number format" option enabled
- [ ] Handle manual entry (with validation)

### 11.2 Order Creation
- [ ] Select supplier for cost centre (from CCSuppliers only)
- [ ] Group items by cost centre and load
- [ ] Create Orders record
- [ ] Set OrderDate (auto today if option enabled)
- [ ] Log order if "Order Logging" enabled

**Critical Constraint:**
```sql
-- ONLY suppliers in CCSuppliers can be selected
SELECT s.Supplier_Code, s.SupplierName
FROM CCSuppliers cs
INNER JOIN Supplier s ON cs.Supplier = s.Supplier_Code
WHERE cs.CostCentre = @CostCentre
  AND s.Archived = 0
ORDER BY cs.SortOrder
```

### 11.3 Order Status
- [ ] Visual indicators: Blue (Logged), Green (To Order)
- [ ] Check Orders table existence for status
- [ ] Block edits on logged orders (if option enabled)
- [ ] Show order date

**Status Query:**
```sql
SELECT
  CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) AS OrderNumber,
  CASE WHEN o.OrderNumber IS NULL THEN 'To Order' ELSE 'Logged' END AS Status,
  o.OrderDate,
  o.Supplier,
  s.SupplierName
FROM Bill b
LEFT JOIN Orders o ON CONCAT(b.JobNo, '/', b.CostCentre, '.', b.BLoad) = o.OrderNumber
LEFT JOIN [{sysDb}].dbo.Supplier s ON o.Supplier = s.Supplier_Code
WHERE b.JobNo = @JobNo
GROUP BY b.JobNo, b.CostCentre, b.BLoad, o.OrderNumber, o.OrderDate, o.Supplier, s.SupplierName
```

### 11.4 Order Logging
- [ ] Insert record into Orders table
- [ ] Set Supplier, OrderDate, CCSortOrder
- [ ] Validate order checking criteria (if configured)
- [ ] Block order if budget exceeded (based on criteria)
- [ ] Mark order as logged (immutable)

### 11.5 Supplier Area Pricing
- [ ] Query SuppliersPrices table
- [ ] Filter by Supplier.Area
- [ ] Apply supplier-specific pricing
- [ ] Show supplier reference on orders

---

## PHASE 12: Order Display & Printing (Week 12)

### 12.1 GST Handling
- [ ] Implement "No GST" mode
- [ ] Implement "Add GST per line" mode (line totals include GST)
- [ ] Implement "Total then GST" mode (subtotal + GST at end)
- [ ] Calculate GST based on Supplier.GST flag

**GST Calculations:**
```javascript
// Mode: Total then GST (most common)
const subtotal = lineItems.reduce((sum, item) => sum + item.LineTotal, 0);
const gst = supplier.GST ? subtotal * 0.10 : 0;
const total = subtotal + gst;

// Mode: Add GST per line
lineItems.forEach(item => {
  item.GSTAmount = supplier.GST ? item.LineTotal * 0.10 : 0;
  item.LineTotalIncGST = item.LineTotal + item.GSTAmount;
});
```

### 12.2 Item Reference Display
- [ ] Query SuppliersPrices.Reference for supplier ref
- [ ] Display "Our Code" (PriceList.PriceCode)
- [ ] Display "Supplier Ref" (SuppliersPrices.Reference)
- [ ] Display "Both" (Our Code | Supplier Ref)
- [ ] Display "Our Code if no Supplier Ref"

### 12.3 Price Display Options
- [ ] Implement "Show all prices" (line prices + total)
- [ ] Implement "Total only" (no line prices, only grand total)
- [ ] Implement "No prices" (quantities only)
- [ ] Implement "Supplier prices only" (only if SuppliersPrices exists)

### 12.4 Order Print Template
- [ ] Create print/PDF template component
- [ ] Header: Job details, supplier details, order number, date
- [ ] Line items: Code, Description, Qty, Unit, Price, Total (based on options)
- [ ] Workup/XDescription (exclude if starts with [Hide])
- [ ] Notes: StandardNotes + GlobalNotes (where Active=1)
- [ ] Footer: Subtotal, GST, Total
- [ ] Print catalogue pictures (if option enabled)

**Order Template Structure:**
```
┌────────────────────────────────────────────────────────┐
│ PURCHASE ORDER                                         │
│ Order No: 001/CONC.1          Date: 16/11/2025        │
├────────────────────────────────────────────────────────┤
│ Job: 001 - 123 Main St, Sydney                        │
│ Supplier: ABC Concrete Pty Ltd                        │
│ Contact: John Smith  Ph: 02 1234 5678                 │
├────────────────────────────────────────────────────────┤
│ Code    │ Description      │ Qty │ Unit │ Price │ Total│
├─────────┼──────────────────┼─────┼──────┼───────┼──────┤
│ CONC01  │ 25MPa Concrete   │ 10  │ m³   │ 250   │ 2,500│
│ CONC02  │ 32MPa Concrete   │ 5   │ m³   │ 280   │ 1,400│
├────────────────────────────────────────────────────────┤
│ Notes:                                                 │
│ - Delivery required 7am sharp                          │
│ - Contact site manager: [job udf1]                     │
├────────────────────────────────────────────────────────┤
│                                      Subtotal: $3,900  │
│                                      GST (10%):  $390  │
│                                      TOTAL:    $4,290  │
└────────────────────────────────────────────────────────┘
```

### 12.5 StandardNotes & GlobalNotes
- [ ] Query StandardNotes table
- [ ] Query GlobalNotes where Active=1
- [ ] Replace UDF variables: [job udf1], [job udf2], etc.
- [ ] Append to order footer

**UDF Replacement:**
```javascript
function replaceUDFVariables(noteText, job) {
  let result = noteText;
  for (let i = 1; i <= 10; i++) {
    const udfValue = job[`UDF${i}`] || '';
    result = result.replace(new RegExp(`\\[job udf${i}\\]`, 'gi'), udfValue);
  }
  return result;
}
```

---

## PHASE 13: Reporting (Week 13)

### 13.1 Report Infrastructure
- [ ] Create report generation service
- [ ] Implement print/PDF export functionality
- [ ] Create report templates
- [ ] Add keyboard shortcuts (F6, F7, F8)

### 13.2 Single Cost Centre BOQ Report (F6)
- [ ] Filter Bill by selected Cost Centre
- [ ] Group items by line number
- [ ] Show quantities, prices, totals
- [ ] Include workup/XDescription
- [ ] Calculate cost centre total

### 13.3 Full BOQ Report (F7)
- [ ] Include all cost centres for job
- [ ] Group by cost centre (sorted by SortOrder)
- [ ] Show subtotals per cost centre
- [ ] Calculate grand total
- [ ] Page breaks between cost centres (optional)

### 13.4 Summary Report (F8)
- [ ] Aggregate by cost centre only
- [ ] Show cost centre totals
- [ ] No line item detail
- [ ] Budget vs Actual comparison (if applicable)
- [ ] Grand total

**Summary Query:**
```sql
SELECT
  b.CostCentre,
  cc.Name AS CostCentreName,
  COUNT(*) AS ItemCount,
  SUM(CASE
    WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
    ELSE b.Quantity * b.UnitPrice
  END) AS CostCentreTotal
FROM Bill b
LEFT JOIN [{sysDb}].dbo.CostCentres cc ON b.CostCentre = cc.Code AND cc.Tier = 1
LEFT JOIN [{sysDb}].dbo.PriceList pl ON b.ItemCode = pl.PriceCode
LEFT JOIN [{sysDb}].dbo.PerCodes pc ON pl.PerCode = pc.Code
WHERE b.JobNo = @JobNo AND b.Quantity > 0
GROUP BY b.CostCentre, cc.Name, cc.SortOrder
ORDER BY cc.SortOrder
```

### 13.5 Export Functionality
- [ ] Export to PDF
- [ ] Export to Excel/CSV
- [ ] Export to printer
- [ ] Email order functionality (optional)

---

## PHASE 14: Advanced Features (Week 14-15)

### 14.1 Auto Save & Snapshots
- [ ] Implement auto-save on changes (if option enabled)
- [ ] Create snapshot mechanism (periodic saves)
- [ ] Store snapshots with timestamp
- [ ] Restore from snapshot functionality

### 14.2 Job Locking (Auto Hog)
- [ ] Check if job is locked by another user
- [ ] Lock job when loaded (if Auto Hog enabled)
- [ ] Release lock on exit
- [ ] Show locked-by information
- [ ] Handle stale locks

### 14.3 Order Checking Criteria
- [ ] Define budget thresholds per cost centre
- [ ] Compare order total to budget
- [ ] Block order if over budget (with option to override)
- [ ] Show warnings before logging

### 14.4 Supplier Nomination
- [ ] Track nominated suppliers per load
- [ ] Add to CCSuppliers if "Lock preferred supplier" disabled
- [ ] Show preferred suppliers in order
- [ ] Maintain SortOrder

---

## PHASE 15: Testing & Polish (Week 16)

### 15.1 Unit Testing
- [ ] Test database queries with various scenarios
- [ ] Test calculations (especially % units)
- [ ] Test option combinations
- [ ] Test recipe explosion edge cases

### 15.2 Integration Testing
- [ ] Test full workflows (Job → BOQ → Order)
- [ ] Test multi-user scenarios (locking)
- [ ] Test with real Databuild database
- [ ] Test repricing with historical dates

### 15.3 UI/UX Polish
- [ ] Keyboard shortcuts (F6, F7, F8, etc.)
- [ ] Loading states and spinners
- [ ] Error messages and validation feedback
- [ ] Tooltips and help text
- [ ] Visual indicators (RED for manual prices, BOLD for cost centres with items)

### 15.4 Performance Optimization
- [ ] Optimize database queries (indexes)
- [ ] Implement virtual scrolling for large datasets
- [ ] Debounce user input
- [ ] Cache frequently accessed data
- [ ] Lazy load catalogue items

### 15.5 Documentation
- [ ] User manual/help documentation
- [ ] Developer documentation
- [ ] Database query reference
- [ ] Deployment guide

---

## PHASE 16: Deployment (Week 17)

### 16.1 Build & Package
- [ ] Configure electron-builder for Windows
- [ ] Create installer (NSIS)
- [ ] Include app icon and branding
- [ ] Code signing (if applicable)

### 16.2 Installation & Setup
- [ ] Database connection wizard
- [ ] Initial configuration
- [ ] Sample data (optional)
- [ ] License/activation (if applicable)

### 16.3 Distribution
- [ ] Create release notes
- [ ] Package installer
- [ ] Update mechanism (electron-updater)
- [ ] Support documentation

---

## Key Technical Considerations

### Database Constraints
1. **Always filter CostCentres.Tier = 1** in JOIN conditions
2. **Percentage units calculation:** LineTotal = UnitPrice × (Qty ÷ 100)
3. **CCSuppliers constraint:** Only suppliers in this table can be used
4. **Order number format:** Must be `{JobNo}/{CostCentre}.{BLoad}`
5. **Logged orders are immutable** - enforce in UI

### Performance
- Use AG Grid virtual scrolling for large datasets
- Implement debouncing on search inputs
- Cache static data (Cost Centres, Units, Suppliers)
- Use connection pooling (already in schema example)

### Data Integrity
- Validate before INSERT/UPDATE
- Handle NULL values appropriately
- Use transactions for multi-table operations
- Implement optimistic locking for concurrent edits

### User Experience
- Auto-save to prevent data loss
- Visual feedback for all actions
- Keyboard shortcuts for power users
- Responsive layout (resizable panels)
- Clear error messages

---

## Success Criteria

### Phase Completion
- [ ] All PHASE 1-16 tasks completed
- [ ] No critical bugs
- [ ] All requirements from spec implemented
- [ ] Performance acceptable (< 2s load time for 1000 items)

### User Acceptance
- [ ] Can create BOQ from catalogue items
- [ ] Can manage multiple loads per cost centre
- [ ] Can generate and print purchase orders
- [ ] Options screen controls all specified behaviors
- [ ] Reports generate correctly (F6/F7/F8)

### Technical Validation
- [ ] Database queries optimized and correct
- [ ] IPC communication stable
- [ ] No memory leaks
- [ ] Cross-database queries working
- [ ] All calculations accurate (especially % units)

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database schema changes | High | Document all assumptions, test with real DB |
| Performance with large datasets | Medium | Implement virtual scrolling, pagination |
| Complex option interactions | Medium | Unit test all option combinations |
| Recipe explosion edge cases | Low | Comprehensive test scenarios |
| Multi-user locking conflicts | Medium | Implement proper locking with timeouts |

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment** (PHASE 1)
3. **Create project repository** structure
4. **Begin PHASE 1 implementation**
5. **Weekly progress reviews** against plan

---

**Document Version:** 1.0
**Created:** November 16, 2025
**Status:** Ready for Implementation
