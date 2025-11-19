# Supplier Prices Panel - Improvements

## Changes Made

### 1. Searchable Supplier Dropdown
**Before:** Standard `<select>` dropdown requiring exact scrolling
**After:** SearchableSelect component with "any word in any order" matching

**Benefits:**
- Type "smith john" to find "John Smith & Associates"
- Type "nastasi" to find "Nastasi & Associates Consulting Engineers"
- Search matches any word in the supplier name/code
- Much faster than scrolling through long lists

### 2. Enhanced SearchableSelect Component
Updated `frontend/src/components/common/SearchableSelect.vue`:

**Search Algorithm:**
```javascript
// Split search into individual words
const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);

// Match if ALL words are found in the label (in any order)
return searchWords.every(word => label.includes(word));
```

**Examples:**
- "john smith" matches "Smith, John & Associates"
- "consulting nastasi" matches "Nastasi & Associates Consulting Engineers"
- "struct nsw" matches "Structerre Surveying (NSW)"

**New Features:**
- Added `disabled` prop support
- Works with edit mode (disables supplier selection when editing)

### 3. Clarified Price Level Options
**Before:**
```
Default
Level 1
Level 2
...
```

**After:**
```
0 - Default (Base Price)
1 - Price Level 1
2 - Price Level 2
3 - Price Level 3
4 - Price Level 4
5 - Price Level 5
```

**Added help text:** "Default (0) = base/standard pricing. Levels 1-5 for custom pricing tiers."

**Explanation:**
- **Level 0 (Default):** Standard/base pricing for the supplier
- **Levels 1-5:** Custom pricing tiers (e.g., volume discounts, regional pricing, time-based rates)

## Files Modified

1. **`frontend/src/components/common/SearchableSelect.vue`**
   - Enhanced search algorithm for "any word in any order"
   - Added `disabled` prop

2. **`frontend/src/components/Catalogue/SupplierPricesPanel.vue`**
   - Replaced standard select with SearchableSelect for Supplier dropdown
   - Added `supplierOptions` computed property
   - Clarified Price Level labels and added help text
   - Imported and registered SearchableSelect component

## Usage

### For Users:
1. Click "Add Supplier Price" button
2. Click the Supplier field
3. Start typing any part of the supplier name
   - Type "john" to find suppliers with "John" anywhere in the name
   - Type "survey" to find all surveying companies
   - Type "nastasi eng" to find "Nastasi & Associates Consulting Engineers"

### Global Impact:
The SearchableSelect improvements apply to **ALL dropdowns** using this component throughout the application, including:
- Cost Centre selection
- Job selection
- Any other searchable dropdown

## Testing

1. **Open Add Supplier Price dialog**
2. **Test search:**
   - Type "nastasi" → Should show "Nastasi & Associates Consulting Engineers"
   - Type "struct nsw" → Should show "Structerre Surveying (NSW)"
   - Type "survey" → Should show all surveying companies
3. **Test Price Level:** Verify labels show "0 - Default (Base Price)" etc.
4. **Test disabled:** Edit existing price → Supplier dropdown should be disabled
