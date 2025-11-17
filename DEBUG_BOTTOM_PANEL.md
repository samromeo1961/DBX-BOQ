# Debug: Why Bottom Panel Isn't Appearing

## Step 1: Add Console Logging

**File:** `frontend/src/components/Catalogue/CatalogueTab.vue`

**In the `onItemSelected` function (around line 349), add console logging:**

```javascript
function onItemSelected(event) {
  console.log('🔵 onItemSelected called!', event); // ADD THIS

  if (event && event.data && event.data.PriceCode) {
    console.log('✅ Setting selectedItemCode to:', event.data.PriceCode); // ADD THIS
    selectedItemCode.value = event.data.PriceCode;
    activeTab.value = 'prices';
  } else {
    console.log('❌ No PriceCode found in event', event); // ADD THIS
    selectedItemCode.value = null;
  }
}
```

## Step 2: Test in Browser

1. **Open DevTools** (F12)
2. **Go to Console tab**
3. **Click on a catalogue item row**
4. **Check what appears in console**

### Expected Results:

**If you see:**
```
🔵 onItemSelected called! {data: {PriceCode: "...", ...}}
✅ Setting selectedItemCode to: BRICK.COMMON
```
→ Event is firing correctly, issue is elsewhere

**If you see:**
```
🔵 onItemSelected called! undefined
❌ No PriceCode found in event
```
→ Event is firing but data structure is wrong

**If you see NOTHING:**
→ Event isn't firing at all from CatalogueGrid

---

## Step 3: Add Grid Event Debugging

If Step 2 shows nothing, add this to CatalogueGrid.vue:

**File:** `frontend/src/components/Catalogue/CatalogueGrid.vue`

**Replace line 15:**

```vue
@row-clicked="$emit('rowClicked', $event)"
```

**With:**
```vue
@row-clicked="handleRowClick($event)"
```

**Then add this function in the setup() (around line 220):**

```javascript
function handleRowClick(event) {
  console.log('🟢 Grid row clicked!', event);
  console.log('🟢 Event data:', event.data);
  emit('rowClicked', event);
}
```

**And add to return statement:**
```javascript
return {
  // ... existing returns ...
  handleRowClick  // ADD THIS
};
```

---

## Step 4: Alternative Event Names

AG Grid might use different event names. Try these alternatives:

**In CatalogueGrid.vue template, try changing line 15 to ONE of these:**

```vue
<!-- Option 1: rowClicked (camelCase) -->
@rowClicked="$emit('rowClicked', $event)"

<!-- Option 2: row-clicked (kebab-case) - CURRENT -->
@row-clicked="$emit('rowClicked', $event)"

<!-- Option 3: cellClicked -->
@cellClicked="$emit('rowClicked', $event)"

<!-- Option 4: cell-clicked -->
@cell-clicked="$emit('rowClicked', $event)"
```

---

## Step 5: Manual Test of Panel Visibility

Add this temporary button to test if the panel shows correctly:

**In CatalogueTab.vue, add after the toolbar (around line 13):**

```vue
<!-- DEBUG: Manual test button -->
<div class="p-2 bg-warning">
  <button @click="selectedItemCode = 'TEST123'" class="btn btn-sm btn-primary">
    Test Show Panel
  </button>
  <span class="ms-2">selectedItemCode: {{ selectedItemCode }}</span>
</div>
```

Click the "Test Show Panel" button - if the panel appears, it confirms:
- ✅ The panel component works
- ✅ The CSS is correct
- ❌ Only the row click event isn't working

---

## Step 6: Check AG Grid Version

AG Grid Vue3 event names changed between versions. Check your package.json:

```bash
grep "ag-grid" package.json
```

If using AG Grid v31+, the event might be `onRowClicked` not `@row-clicked`.

**Try this in CatalogueGrid.vue:**

```vue
<ag-grid-vue
  class="ag-theme-quartz"
  :columnDefs="columnDefs"
  :rowData="catalogueItems"
  :defaultColDef="defaultColDef"
  :rowSelection="'multiple'"
  :suppressRowClickSelection="true"
  :enableCellTextSelection="true"
  :getRowStyle="getRowStyle"
  @grid-ready="onGridReady"
  @selection-changed="onSelectionChanged"
  @cell-value-changed="$emit('cellValueChanged', $event)"
  @row-clicked="handleRowClick"
  @cell-clicked="handleRowClick"
  style="height: 100%;"
/>
```

Add both events to catch whichever one fires!

---

## Step 7: Direct Event Handler (Nuclear Option)

If nothing else works, add the event listener directly in onGridReady:

**File:** `CatalogueGrid.vue`

**Find the onGridReady function (around line 217):**

```javascript
function onGridReady(params) {
  gridApi.value = params.api;
  params.api.sizeColumnsToFit();

  // ADD THIS:
  params.api.addEventListener('rowClicked', (event) => {
    console.log('🟣 Direct event listener fired!', event);
    emit('rowClicked', event);
  });
}
```

---

## Quick Diagnostic Checklist

Run these checks in browser console while on Catalogue page:

```javascript
// 1. Check if selectedItemCode exists
$vm0.selectedItemCode

// 2. Check if activeTab exists
$vm0.activeTab

// 3. Manually set selectedItemCode
$vm0.selectedItemCode = 'TEST123'
// Panel should appear!

// 4. Check if SupplierPricesPanel component is loaded
document.querySelector('.item-details-section')
// Should return the panel element or null
```

---

## Expected Flow:

```
User clicks row
    ↓
AG Grid fires row-clicked event
    ↓
CatalogueGrid catches it → $emit('rowClicked', event)
    ↓
CatalogueTab catches it → @rowClicked="onItemSelected"
    ↓
onItemSelected runs → selectedItemCode.value = event.data.PriceCode
    ↓
v-if="selectedItemCode" becomes true
    ↓
Panel appears! 🎉
```

---

## Report Back

After running Steps 1-2, tell me what you see in the console. That will tell us exactly where the issue is!
