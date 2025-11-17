# Databuild Formula System - Math.js Implementation

## Overview
Successfully converted and enhanced the Databuild formula system to use Math.js with comprehensive testing and a visual formula builder interface.

## What Was Accomplished

### 1. ✅ Formula Parser Enhancements
**Files Updated:**
- `src/utils/formulaParser.js` (backend)
- `frontend/src/utils/formulaCalculator.js` (frontend)

**Improvements:**
- Fixed `rnd` (rounding) syntax to handle edge cases like `*.018rnd1`
- Added support for rounding with leading operators (`*`, `/`, `+`, `-`)
- Improved error handling and syntax validation
- Added special case handling for `[No Workup]` text markers

**Supported Formula Syntax:**
```
[QTY * 2]                          # Multiply by 2
[QTY * 2.5rnd1]                    # Multiply and round to nearest 1
[QTY * 0.018rnd1 / 5.4]            # Complex expression with rounding
LocalVariable length = [QTY * 2]   # Create variables
Quantity = [length * 1.5]          # Explicit quantity assignment
OnlyIf [QTY > 5]                   # Conditional inclusion
# Comment                          # Comments (suppress output)
```

### 2. ✅ Formula Testing & Validation System
**New Files Created:**
- `src/utils/formulaTester.js` - Comprehensive formula testing utility
- `test-formulas.js` - Test script for batch formula validation

**Features:**
- Automated testing of formulas with configurable parent quantities
- Detection of syntax errors (unmatched brackets, invalid operators, etc.)
- Comparison of expected vs actual results
- Detailed test reports in both JSON and text formats
- Support for parsing formula test data from text

**Test Results:**
- ✅ **98.3% success rate** (236/240 formulas passed)
- Only 4 failed formulas (3 with genuine syntax errors, 1 with invalid operator)
- Successfully identified and fixed major rounding syntax issues

### 3. ✅ Interactive Formula Builder UI
**New Component:**
- `frontend/src/components/Catalogue/FormulaBuilder.vue`

**Features:**
- Live formula validation and testing
- Real-time calculation preview with configurable test quantity
- Quick insert buttons for common formula patterns
- Comprehensive syntax guide with examples
- Visual feedback (green for valid, red for errors)
- Multi-line formula support
- Workup text preview

**Quick Insert Options:**
- `[QTY]`, `[QTY * ]`, `[QTY * 2]`, `[QTY / 2]`
- `rnd1`, `rnd0.3` (rounding increments)
- `LocalVariable`, `Quantity =`

### 4. ✅ Integration with Recipe Management
**Updated File:**
- `frontend/src/components/Catalogue/RecipeManagementModal.vue`

**New Features:**
- 🧮 Calculator icon button in Actions column
- Opens Formula Builder modal for each recipe component
- Auto-saves formula changes to database
- Real-time formula validation before saving
- Refreshes grid to show updated calculated quantities

## How to Use

### Testing Formulas (Backend)
```bash
node test-formulas.js
```

This will:
- Test all formulas from your provided list
- Generate `formula-test-results.json` with detailed results
- Generate `formula-test-report.txt` with formatted report

### Using the Formula Builder (Frontend)

1. **Open Recipe Management** for any catalogue item
2. **Click the calculator icon** 🧮 in the Actions column for any sub-item
3. **Build your formula** using:
   - Type directly in the textarea
   - Use Quick Insert buttons for common patterns
   - Test with different parent quantities
4. **Watch the live preview** - calculated result updates as you type
5. **Save** when formula is valid (green indicator)

## Formula Syntax Quick Reference

### Basic Math
```
[QTY]              → Same as parent quantity
[QTY * 2]          → Double
[QTY / 5.4]        → Divide
[QTY * 2.5 + 1]    → Multiply and add
```

### Rounding
```
[QTY * 2.5rnd1]      → Round to nearest 1
[QTY * 3.7rnd0.3]    → Round to nearest 0.3
[QTY * 0.018rnd1]    → Works with small numbers
```

### Advanced
```
LocalVariable area = [QTY * 2.5]
Quantity = [area * 1.05rnd1]
# 5% wastage applied
```

## Test Results Summary

### Passed Formulas (Examples)
```
✓ [(Qty/Qty)*1]/[Qty]                    → 1
✓ [(Qty/Qty)*4]/[Qty]                    → 4
✓ [Qty*1.0/5.4rnd0]/5.4                  → 0.034
✓ [qty*1.0Rnd1]/2.7                      → 0.370
✓ LocalVariable X = [QTY]\nQuantity = [] → (complex formulas)
```

### Failed Formulas (Syntax Errors)
```
✗ -[Qty*1.2.4/5.4rnd0]/5.4   → Invalid: consecutive decimals
✗ -[Qty*2.55.4rnd0]/5.4      → Invalid: consecutive decimals
✗ -[Qty*3.2.8/5.4rnd0]/5.4   → Invalid: consecutive decimals
✗ [qty/*1/5.4Rnd0]/5.4       → Invalid: operator sequence
```

## Files Structure

```
dbx-BOQ/
├── src/
│   └── utils/
│       ├── formulaParser.js           # Backend formula parser (enhanced)
│       └── formulaTester.js           # New: Testing utility
├── frontend/
│   └── src/
│       ├── components/
│       │   └── Catalogue/
│       │       ├── FormulaBuilder.vue           # New: Formula builder UI
│       │       └── RecipeManagementModal.vue    # Updated: Integration
│       └── utils/
│           └── formulaCalculator.js             # Frontend calculator (enhanced)
├── test-formulas.js                    # New: Test script
├── formula-test-results.json           # Generated: Test results
└── formula-test-report.txt             # Generated: Test report
```

## Next Steps (Optional Enhancements)

1. **Import/Export Formulas** - Batch import formulas from CSV/Excel
2. **Formula Library** - Save and reuse common formula patterns
3. **Advanced Validation** - Warn about potentially incorrect formulas
4. **Undo/Redo** - Formula editing history
5. **Formula Templates** - Pre-built formulas for common scenarios

## Notes

- All formulas are now validated using Math.js
- Rounding syntax (`rnd`) is fully supported
- Formula builder provides instant feedback
- 98.3% compatibility with existing Databuild formulas
- Database schema unchanged (per user requirements)
