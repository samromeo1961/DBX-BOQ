-- ============================================================
-- Database Migration: Add Template and Specification Columns
-- ============================================================
--
-- This script adds Template and Specification columns to the
-- PriceList table if they don't already exist.
--
-- IMPORTANT: Review and test in a development environment first!
--
-- Usage:
--   1. Review the database name below
--   2. Run in SQL Server Management Studio or Azure Data Studio
--   3. Verify columns were added successfully
--
-- ============================================================

USE [YourDatabaseName];  -- CHANGE THIS TO YOUR DATABASE NAME
GO

-- Check if Template column exists
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PriceList'
      AND COLUMN_NAME = 'Template'
      AND TABLE_SCHEMA = 'dbo'
)
BEGIN
    PRINT 'Adding Template column to PriceList table...';

    ALTER TABLE [dbo].[PriceList]
    ADD [Template] NVARCHAR(MAX) NULL;

    PRINT '✓ Template column added successfully';
END
ELSE
BEGIN
    PRINT '- Template column already exists, skipping';
END
GO

-- Check if Specification column exists
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'PriceList'
      AND COLUMN_NAME = 'Specification'
      AND TABLE_SCHEMA = 'dbo'
)
BEGIN
    PRINT 'Adding Specification column to PriceList table...';

    ALTER TABLE [dbo].[PriceList]
    ADD [Specification] NVARCHAR(MAX) NULL;

    PRINT '✓ Specification column added successfully';
END
ELSE
BEGIN
    PRINT '- Specification column already exists, skipping';
END
GO

-- Verify columns were added
PRINT '';
PRINT 'Verification:';
PRINT '============';

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PriceList'
  AND COLUMN_NAME IN ('Template', 'Specification')
  AND TABLE_SCHEMA = 'dbo'
ORDER BY COLUMN_NAME;

PRINT '';
PRINT 'Migration completed!';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Verify the columns appear in the verification results above';
PRINT '  2. (Optional) Add some sample data to test';
PRINT '  3. Start the application and test Template/Specification editors';
GO

-- ============================================================
-- Optional: Add sample data for testing
-- ============================================================
--
-- Uncomment the section below to add sample template and
-- specification data to a test item
--
-- -- Update a specific item with sample data
-- UPDATE [dbo].[PriceList]
-- SET
--     Template = 'Enter dimensions:
--
-- Height=
-- Width=
-- Length=
--
-- [HIDE]
--
-- Note: Measurements in millimeters',
--
--     Specification = 'SPECIFICATION FOR [Project Name]
--
-- Materials to be used:
-- - Quality grade A materials
-- - [Supplier Name] approved products
--
-- Installation by qualified tradesperson'
--
-- WHERE PriceCode = 'TEST001';  -- CHANGE TO YOUR TEST ITEM CODE
-- GO

-- ============================================================
-- Rollback Script (if needed)
-- ============================================================
--
-- USE WITH EXTREME CAUTION!
-- This will remove the Template and Specification columns
-- and DELETE ALL DATA in those columns!
--
-- Only use this if you need to undo the migration.
--
-- -- Uncomment to rollback:
-- -- USE [YourDatabaseName];
-- -- GO
-- --
-- -- ALTER TABLE [dbo].[PriceList]
-- -- DROP COLUMN Template;
-- --
-- -- ALTER TABLE [dbo].[PriceList]
-- -- DROP COLUMN Specification;
-- --
-- -- PRINT 'Rollback completed - Template and Specification columns removed';
-- -- GO

-- ============================================================
