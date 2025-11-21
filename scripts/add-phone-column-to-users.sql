-- ============================================================================
-- Add Phone Column to COMMON.User_ Table
-- ============================================================================
-- This script adds an optional Phone column to the User_ table.
-- The application will automatically detect and use this column.
--
-- BEFORE RUNNING:
-- 1. Make sure you're connected to the correct SQL Server
-- 2. Back up your database (recommended)
-- 3. Check if column already exists (run check-user-columns.sql first)
--
-- AFTER RUNNING:
-- - Phone field in Users management will save/load phone numbers
-- - Existing users will have NULL phone (which is fine)
-- - You can manually update phone numbers for existing users if needed
-- ============================================================================

USE COMMON;
GO

-- Check if Phone column already exists
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'User_'
      AND COLUMN_NAME = 'Phone'
)
BEGIN
    PRINT 'Adding Phone column to User_ table...';

    ALTER TABLE [dbo].[User_]
    ADD Phone NVARCHAR(20) NULL;

    PRINT '✓ Phone column added successfully!';
    PRINT 'The application will now save and load phone numbers.';
END
ELSE
BEGIN
    PRINT '⚠ Phone column already exists. No changes made.';
END
GO

-- Verify the column was added
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
  AND TABLE_NAME = 'User_'
  AND COLUMN_NAME = 'Phone';
GO

PRINT '';
PRINT '============================================================================';
PRINT 'Script completed. Check results above.';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '1. Restart your DBx BOQ app (if running)';
PRINT '2. Go to Settings → Users';
PRINT '3. Add or edit a user';
PRINT '4. Enter a phone number and save';
PRINT '5. Phone number should now be saved to the database!';
PRINT '============================================================================';
