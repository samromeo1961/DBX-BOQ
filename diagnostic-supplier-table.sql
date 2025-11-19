-- Diagnostic SQL to check Supplier table structure
-- Run this in SQL Server Management Studio (SSMS)

PRINT '=== Checking Supplier Table Structure ==='

-- Check columns in Supplier table
SELECT
  'Supplier columns:' AS Info,
  COLUMN_NAME,
  DATA_TYPE,
  CHARACTER_MAXIMUM_LENGTH,
  IS_NULLABLE
FROM [CROWNESYS].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Supplier'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION

-- Check a sample of data
SELECT TOP 5
  Supplier_Code,
  SupplierName,
  Archived
FROM [CROWNESYS].[dbo].[Supplier]
ORDER BY SupplierName
