# Supplier Prices Schema Fix

## Issue
The application was trying to add columns (`ValidFrom`, `LastUpdated`) to the existing Databuild `SuppliersPrices` table, which:
1. Already exists in the System database with a different schema
2. Should NOT be altered per project constraints (altering tables complicates deployment for users)

## Root Cause
The code was written assuming a custom table schema instead of using the existing Databuild table structure.

## Actual SuppliersPrices Schema (Databuild Standard)
The table exists in the System database (`CROWNESYS`) with these columns:

| Column | Type | Description |
|--------|------|-------------|
| `Counter` | int | Primary key (IDENTITY) |
| `ItemCode` | nvarchar(30) | Internal item code |
| `Supplier` | nvarchar(9) | Supplier code |
| `Reference` | nvarchar(30) | Supplier's reference/SKU |
| `Price` | money | Supplier's price |
| `Supp_Date` | datetime | **Price validity date (not ValidFrom)** |
| `Area` | nvarchar(24) | Geographic area |
| `PriceLevel` | int | Price level (0=default, 1-5) |
| `Comments` | nvarchar(255) | Notes (e.g., variant matching) |
| `UDF1-UDF5` | nvarchar(255) | User-defined fields |

**Key Differences:**
- Uses `Supp_Date` instead of `ValidFrom`
- Has NO `LastUpdated` column
- Has 5 user-defined fields (UDF1-UDF5)

## Actual Supplier Table Schema (Databuild Standard)

| Column | Type | Description |
|--------|------|-------------|
| `Supplier_Code` | nvarchar(8) | **Primary key (not 'Code')** |
| `SupplierName` | nvarchar(96) | **Supplier name (not 'Name')** |
| `Archived` | bit | Archive status |
| ... | ... | Other fields |

## Changes Made

### 1. `src/ipc-handlers/supplier-prices.js`

**Before:**
- Tried to create table if not exists
- Tried to add `ValidFrom` and `LastUpdated` columns
- Queries referenced non-existent columns

**After:**
- Verifies existing Databuild table exists (doesn't try to create it)
- Uses `Supp_Date` instead of `ValidFrom` in all queries
- Removed `LastUpdated` from all queries
- Added detailed logging for diagnostics

**Specific Changes:**
```sql
-- OLD (incorrect column names):
SELECT sp.ValidFrom, sp.LastUpdated, s.Name AS SupplierName
FROM SuppliersPrices sp
LEFT JOIN Supplier s ON sp.Supplier = s.Code
ORDER BY sp.ValidFrom DESC

-- NEW (correct Databuild column names):
SELECT sp.Supp_Date AS ValidFrom, s.SupplierName
FROM SuppliersPrices sp
LEFT JOIN Supplier s ON sp.Supplier = s.Supplier_Code
ORDER BY sp.Supp_Date DESC

-- OLD (incorrect):
INSERT INTO ... (ValidFrom, LastUpdated) VALUES (@validFrom, GETDATE())

-- NEW (correct):
INSERT INTO ... (Supp_Date) VALUES (@suppDate)

-- OLD (incorrect):
SELECT Code, Name FROM Supplier

-- NEW (correct):
SELECT Supplier_Code AS Code, SupplierName AS Name FROM Supplier
```

### 2. `frontend/src/components/Catalogue/SupplierPricesPanel.vue`

**Changes:**
- Removed `LastUpdated` column from AG Grid display
- Kept `ValidFrom` in UI (aliased from `Supp_Date` in backend query)
- Increased `Comments` column width from 150 to 200 pixels

### 3. `DATABUILD_DATABASE_SCHEMA.md`

**Changes:**
- Added `Comments` field documentation
- Added `UDF1-UDF5` fields documentation
- Added warning note: "This is an existing Databuild table - DO NOT ALTER the schema"
- Enhanced usage notes

## Testing

### Diagnostic SQL Script
Created `diagnostic-supplier-prices.sql` to verify table structure:
```sql
-- Check both databases for SuppliersPrices table
-- Verify columns exist
-- Check current database connection context
```

### Application Testing
1. Restart the application: `npm run dev`
2. Check console logs - should now show:
   ```
   🔍 Checking for SuppliersPrices table in database: CROWNESYS
   📊 Table check result: [...]
   🔍 Verifying columns in [CROWNESYS].[dbo].[SuppliersPrices]
   📋 Databuild columns found: [...]
   ✓ SuppliersPrices table verified with existing Databuild schema
   ```
3. No more errors about adding columns

## Impact
- **No database modifications required** - works with existing schema
- **No user action needed** - existing data remains intact
- **Maintains compatibility** with standard Databuild installations
- **Follows project constraints** - never alters existing Databuild tables

## Key Learnings
1. Always check if tables are part of the existing Databuild schema before creating/altering
2. Use SQL diagnostics to verify actual schema vs. expected schema
3. Alias column names in SELECT queries when UI expects different names
4. Document Databuild standard schemas to prevent future conflicts
