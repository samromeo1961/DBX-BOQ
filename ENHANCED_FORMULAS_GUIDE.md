# Enhanced Formula System - Math.js Style

## 🎯 Overview

Your BOQ application now supports **clean, modern Math.js-style formulas** with **automatic custom variable detection and input fields**!

### ✅ What Changed

**Before (Databuild Syntax):**
```
LocalVariable wallHeight = [5]
LocalVariable length = [QTY * 2]
Quantity = [length * wallHeight]
```

**After (Math.js Syntax):**
```javascript
wallHeight = 2.4
length = QTY * 2
area = length * wallHeight
```

## 🚀 Key Features

### 1. **Clean Syntax**
- No more `LocalVariable` keyword
- No more brackets `[ ]` required
- Standard JavaScript/Math.js syntax
- Easy to read and understand

### 2. **Smart Variable Detection**
- System automatically detects **undefined variables**
- Creates **input fields** for them in the UI
- Users can set values before calculation
- Default values provided based on variable names

### 3. **Math.js Functions**
- All Math.js functions available: `round()`, `ceil()`, `floor()`, `sqrt()`, `abs()`, etc.
- Standard operators: `+`, `-`, `*`, `/`, `^`
- Comparisons: `>`, `<`, `>=`, `<=`, `==`

## 📝 Formula Syntax Guide

### Basic Expressions
```javascript
QTY                    // Parent quantity
QTY * 2                // Double quantity
QTY / 5.4              // Divide
QTY * 2.5 + 1          // Complex calculation
```

### Variable Assignment
```javascript
wallHeight = 2.4       // Assign a value (camelCase)
[Wall Height] = 2.4    // Assign a value (bracketed with spaces)
result = QTY * wallHeight
```

### Multi-Step Calculations
```javascript
length = QTY * 2
width = 3.6
area = length * width
area * 1.05            // 5% wastage
```

### Math.js Functions
```javascript
round(QTY / 5.4)                  // Round to nearest integer
ceil(QTY / 5.4)                   // Round up
floor(QTY / 5.4)                  // Round down
round(QTY * 2.5 / 1) * 1          // Round to nearest 1
round(QTY * 3.7 / 0.3) * 0.3      // Round to nearest 0.3
```

### Comments
```javascript
# This is a comment
wallHeight = 2.4       // Set wall height
QTY * wallHeight       // Calculate area
```

## 🎨 Custom Variables (Auto Input Fields)

When you use a variable that isn't defined, the system **automatically creates an input field**.

### Bracketed Variables (Variables with Spaces)

You can use **bracketed syntax** to create variables with spaces in their names:

```javascript
QTY * [Wall Height] * [Wall Length]
```

**Result:**
- System detects `Wall Height` and `Wall Length` are undefined
- Creates input fields labeled "Wall Height" and "Wall Length"
- User can enter values (e.g., Wall Height = 2.4, Wall Length = 3.6)
- Formula calculates: `1 * 2.4 * 3.6 = 8.64`

**Important:** Anything within `[ ]` is treated as a single variable name, including spaces.

### CamelCase Variables (Traditional)

You can also use traditional camelCase variable names:

```javascript
# Wall area calculation
QTY * wallHeight * wallLength
```

**Result:**
- System detects `wallHeight` and `wallLength` are undefined
- Creates input fields for both (displayed as "Wall Height" and "Wall Length")
- User can enter values (e.g., wallHeight = 2.4, wallLength = 3.6)
- Formula calculates: `1 * 2.4 * 3.6 = 8.64`

### Variable with Default Values:
```javascript
wallHeight = 2.4        // Default value
QTY * wallHeight
```

**Result:**
- `wallHeight` has default = 2.4
- User can override by changing the value in the input field
- If user sets wallHeight = 3.0, result changes automatically

## 🧪 Complete Examples

### Example 1: Simple Area Calculation
```javascript
wallHeight = 2.4
wallLength = 3.6
QTY * wallHeight * wallLength
```
**Variables Created:** wallHeight, wallLength
**With QTY=1:** Result = 8.64 m²

### Example 2: With Wastage Factor
```javascript
baseArea = QTY * 2.5
wastage = 1.1
baseArea * wastage
```
**Variables Created:** wastage
**With QTY=4:** Result = 11

### Example 3: Conditional Rounding
```javascript
# Plasterboard sheets
length = QTY * 2.7
sheets = ceil(length / 5.4)
sheets
```
**No custom variables (length is defined)**
**With QTY=3:** Result = 2 sheets

### Example 4: Complex Multi-Step
```javascript
# Calculate concrete volume
length = QTY * wallLength
width = wallWidth
depth = slabDepth
volume = length * width * depth
wastage = 1.05
volume * wastage
```
**Variables Created:** wallLength, wallWidth, slabDepth, wastage
**User sets values in UI**

### Example 5: Bracketed Variables with Spaces
```javascript
# Wall area with bracketed variables
[Wall Height] = 2.4
[Wall Length] = 3.6
area = [Wall Height] * [Wall Length]
QTY * area
```
**Variables Created:** Wall Height, Wall Length (with spaces!)
**With QTY=2:** Result = 17.28 m²

### Example 6: Mixed Bracketed and Regular Variables
```javascript
# Concrete calculation
length = QTY * 2
[Slab Depth] = 0.15
[Wastage Factor] = 1.1
volume = length * [Slab Depth]
volume * [Wastage Factor]
```
**Variables Created:** Slab Depth, Wastage Factor
**With QTY=10:** Result = 3.3 m³

## 🎯 How to Use in Recipe Management

1. **Open Recipe Management** for any catalogue item
2. **Click Calculator Icon** 🧮 next to a component
3. **Enter your formula** using Math.js syntax:
   ```javascript
   wallHeight = 2.4
   QTY * wallHeight
   ```
4. **See Custom Variables** section appear automatically
5. **Adjust variable values** in the input fields
6. **Watch live preview** update as you change values
7. **Save** - formula and Base Qty are stored

## 📊 Testing Your Formulas

Run the test suite to validate formulas:

```bash
node test-enhanced-formulas.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
   ENHANCED FORMULA SYSTEM - Math.js Style Tests
═══════════════════════════════════════════════════════

✅ All 8 tests passed!
```

## 🔄 Migration from Databuild

The system still supports old Databuild syntax, but new formulas should use Math.js style:

| Databuild | Math.js |
|-----------|---------|
| `LocalVariable height = [5]` | `height = 5` |
| `[QTY * 2]` | `QTY * 2` |
| `Quantity = [QTY * height]` | `QTY * height` |
| `[QTY*.018rnd1]` | `round(QTY * 0.018 / 1) * 1` |
| `OnlyIf [QTY > 5]` | *(use if statement or conditional)* |

## 📁 Files Created/Modified

**New Files:**
- `src/utils/enhancedFormulaParser.js` - Backend parser
- `frontend/src/utils/enhancedFormulaParser.js` - Frontend parser
- `test-enhanced-formulas.js` - Test suite

**Modified Files:**
- `frontend/src/components/Catalogue/FormulaBuilder.vue` - Added variable inputs UI

## 🎓 Quick Reference

### Available Variables
- `QTY` - Parent item quantity (always available)
- `Qty`, `qty` - Aliases for QTY
- Any custom variable you define (camelCase or bracketed)
- **Bracketed variables:** `[Variable Name]` - supports spaces in variable names

### Math.js Functions
- **Rounding:** `round()`, `ceil()`, `floor()`
- **Math:** `abs()`, `sqrt()`, `pow()`, `exp()`, `log()`
- **Trig:** `sin()`, `cos()`, `tan()`
- **Min/Max:** `min()`, `max()`
- **Constants:** `PI`, `E`

### Smart Variable Name Defaults
The system provides smart defaults based on variable names:
- `wallHeight`, `wallWidth`, `length` → 1.0
- `wastage`, `factor` → 1.05 (5%)
- `count`, `qty` → 1
- Others → 0

### Tips
- Use descriptive variable names (e.g., `wallHeight` not `h`)
- **Bracketed variables:** Use `[Wall Height]` when you want spaces in variable names
- **CamelCase variables:** Use `wallHeight` for traditional programming style (auto-formatted to "Wall Height")
- Add comments with `#` to explain complex formulas
- Test formulas with different QTY values before saving
- Mix bracketed and camelCase variables freely in the same formula

## 🎉 Benefits

✅ **Easier to Learn** - Standard JavaScript/Math.js syntax
✅ **Better Documentation** - Use official Math.js docs
✅ **User-Friendly** - Auto-generated input fields
✅ **Flexible** - Define or override variables
✅ **Powerful** - Full Math.js function library
✅ **Clean Code** - No proprietary syntax

---

**Next Steps:**
1. Try creating a formula in Recipe Management
2. Experiment with custom variables
3. Check the Formula Builder examples accordion
4. Refer to [Math.js Documentation](https://mathjs.org/docs/expressions/syntax.html)
