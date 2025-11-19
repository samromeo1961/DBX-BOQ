-- Check if there's any data in SuppliersPrices table
-- Run this in SQL Server Management Studio (SSMS)

PRINT '=== Checking SuppliersPrices Data ==='

-- Count total records
SELECT 'Total Records:' AS Info, COUNT(*) AS Count
FROM [CROWNESYS].[dbo].[SuppliersPrices]

-- Show sample records
SELECT TOP 10
  ItemCode,
  Supplier,
  Reference,
  Price,
  Supp_Date,
  Comments,
  PriceLevel,
  Area
FROM [CROWNESYS].[dbo].[SuppliersPrices]
ORDER BY ItemCode, Supplier

-- Check if specific item has prices (replace 'YOUR_ITEM_CODE' with actual item code)
-- You can get an item code from the Catalogue tab
SELECT
  sp.ItemCode,
  sp.Supplier,
  s.SupplierName,
  sp.Reference,
  sp.Price,
  sp.Supp_Date,
  sp.Comments
FROM [CROWNESYS].[dbo].[SuppliersPrices] sp
LEFT JOIN [CROWNESYS].[dbo].[Supplier] s ON sp.Supplier = s.Supplier_Code
WHERE sp.ItemCode = 'YOUR_ITEM_CODE'  -- Replace with actual item code
ORDER BY s.SupplierName

-- Check for any NULL supplier codes (which would cause JOIN issues)
SELECT 'Records with NULL Supplier:' AS Info, COUNT(*) AS Count
FROM [CROWNESYS].[dbo].[SuppliersPrices]
WHERE Supplier IS NULL
