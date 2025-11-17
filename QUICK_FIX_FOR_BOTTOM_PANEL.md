# Quick Fix: Enable Bottom Panel

The bottom panel isn't appearing because the grid doesn't emit row click events yet.

## Step 1: Stop the Development Server

Stop the `npm run dev` process completely (Ctrl+C).

## Step 2: Replace CatalogueTab.vue

Run this in PowerShell:

```powershell
# Backup original
Copy-Item "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\CatalogueTab.vue" "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\CatalogueTab.vue.backup"

# Replace with integrated version
Copy-Item "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\CatalogueTab-INTEGRATED.vue" "C:\Dev\dbx-BOQ\frontend\src\components\Catalogue\CatalogueTab.vue"
```

## Step 3: Update CatalogueGrid.vue

**File:** `frontend/src/components/Catalogue/CatalogueGrid.vue`

### 3.1 Add rowClicked to emits (line 49)

**Find:**
```javascript
  emits: ['cellValueChanged', 'deleteItems', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems'],
```

**Replace with:**
```javascript
  emits: ['cellValueChanged', 'deleteItems', 'duplicateItem', 'manageRecipe', 'archiveItems', 'unarchiveItems', 'rowClicked'],
```

### 3.2 Update onGridReady function (around line 217)

**Find:**
```javascript
    function onGridReady(params) {
      gridApi.value = params.api;
      params.api.sizeColumnsToFit();
    }
```

**Replace with:**
```javascript
    function onGridReady(params) {
      gridApi.value = params.api;
      params.api.sizeColumnsToFit();

      // Add row click listener
      params.api.addEventListener('rowClicked', (event) => {
        emit('rowClicked', event);
      });
    }
```

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Test

1. Navigate to Catalogue Management
2. **Click on any item row**
3. **Bottom panel should appear** with three tabs:
   - Supplier Prices
   - Template
   - Specification

## Alternative: Use AG Grid's built-in event

If the above doesn't work, try this approach instead:

**In the template section** (around line 12), add the row-clicked event:

**Find:**
```vue
      @grid-ready="onGridReady"
      @selection-changed="onSelectionChanged"
      @cell-value-changed="$emit('cellValueChanged', $event)"
```

**Replace with:**
```vue
      @grid-ready="onGridReady"
      @selection-changed="onSelectionChanged"
      @cell-value-changed="$emit('cellValueChanged', $event)"
      @row-clicked="$emit('rowClicked', $event)"
```

This directly forwards the AG Grid row-clicked event to the parent component.

---

## Troubleshooting

### Panel still doesn't appear:

1. **Check browser console** (F12) for errors
2. **Verify selectedItemCode** is being set:
   - Open DevTools
   - Click on a row
   - In console, type: `$vm0.selectedItemCode`
   - Should show the PriceCode

3. **Check component imports:**
   - Open CatalogueTab.vue
   - Verify these lines exist:
     ```javascript
     import SupplierPricesPanel from './SupplierPricesPanel.vue';
     import TemplateEditor from './TemplateEditor.vue';
     import SpecificationEditor from './SpecificationEditor.vue';
     ```

4. **Check if components are registered:**
   ```javascript
   components: {
     // ... other components ...
     SupplierPricesPanel,
     TemplateEditor,
     SpecificationEditor
   }
   ```

### If you see "Component not found" errors:

The component files should be at:
- `frontend/src/components/Catalogue/SupplierPricesPanel.vue`
- `frontend/src/components/Catalogue/TemplateEditor.vue`
- `frontend/src/components/Catalogue/SpecificationEditor.vue`

### Still not working?

Create a test by adding this to CatalogueTab.vue temporarily:

```vue
<!-- Add this right after the toolbar, before main content -->
<div class="alert alert-info m-2">
  <strong>Debug:</strong> Selected Item = {{ selectedItemCode || 'None' }}
</div>
```

Then click a row - you should see the item code appear. If it does, the panel integration is the issue. If it doesn't, the row click event isn't firing.
