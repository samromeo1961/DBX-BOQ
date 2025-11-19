-- Diagnostic SQL to check SuppliersPrices table in both databases
-- Run this in SQL Server Management Studio (SSMS)

PRINT '=== Checking CROWNESYS Database ==='

-- Check if table exists in CROWNESYS
SELECT 'Table in CROWNESYS:' AS Info, TABLE_NAME, TABLE_SCHEMA
FROM [CROWNESYS].INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'SuppliersPrices'

-- Check columns in CROWNESYS
SELECT 'Columns in CROWNESYS:' AS Info, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM [CROWNESYS].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SuppliersPrices'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '=== Checking CROWNEJOB Database ==='

-- Check if table exists in CROWNEJOB
SELECT 'Table in CROWNEJOB:' AS Info, TABLE_NAME, TABLE_SCHEMA
FROM [CROWNEJOB].INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'SuppliersPrices'

-- Check columns in CROWNEJOB
SELECT 'Columns in CROWNEJOB:' AS Info, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM [CROWNEJOB].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SuppliersPrices'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION

PRINT ''
PRINT '=== Checking which database connection pool is using ==='

SELECT 'Current Database:' AS Info, DB_NAME() AS DatabaseName

PRINT ''
PRINT '=== Checking all columns specifically ==='

-- Check for the specific optional columns
SELECT
  'CROWNESYS optional columns:' AS Info,
  COLUMN_NAME
FROM [CROWNESYS].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SuppliersPrices'
  AND TABLE_SCHEMA = 'dbo'
  AND COLUMN_NAME IN ('ValidFrom', 'Comments', 'PriceLevel', 'Area', 'LastUpdated')

SELECT
  'CROWNEJOB optional columns:' AS Info,
  COLUMN_NAME
FROM [CROWNEJOB].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'SuppliersPrices'
  AND TABLE_SCHEMA = 'dbo'
  AND COLUMN_NAME IN ('ValidFrom', 'Comments', 'PriceLevel', 'Area', 'LastUpdated')
