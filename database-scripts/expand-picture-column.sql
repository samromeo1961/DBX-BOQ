-- ============================================================
-- Expand Picture Column in PriceList Table
-- ============================================================
-- This script expands the Picture column from NVARCHAR(255)
-- to NVARCHAR(MAX) to support multiple images per catalogue item
--
-- Run this as a database administrator (sa or db_owner)
-- ============================================================

USE [CROWNESYS];
GO

-- Check current column size
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PriceList'
  AND COLUMN_NAME = 'Picture'
  AND TABLE_SCHEMA = 'dbo';
GO

-- Expand Picture column to NVARCHAR(MAX)
ALTER TABLE [dbo].[PriceList]
ALTER COLUMN [Picture] NVARCHAR(MAX) NULL;
GO

-- Verify the change
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PriceList'
  AND COLUMN_NAME = 'Picture'
  AND TABLE_SCHEMA = 'dbo';
GO

-- Grant ALTER permission to dbx_user (if needed for future changes)
-- Uncomment the line below if you want dbx_user to be able to alter the table structure
-- GRANT ALTER ON [dbo].[PriceList] TO [dbx_user];
-- GO

PRINT '✅ Picture column successfully expanded to NVARCHAR(MAX)';
PRINT '✅ The column can now store unlimited images as JSON';
GO
