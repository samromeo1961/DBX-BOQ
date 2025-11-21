-- ============================================================================
-- Add ContactCode Column to COMMON.User_ Table
-- ============================================================================
-- This links users to contacts in the Contacts table, allowing us to
-- retrieve phone numbers, mobile numbers, and emails from the Contacts table.
--
-- BENEFITS:
-- - No data duplication (phone/mobile already in Contacts)
-- - One place to update contact information
-- - Can link users to existing contacts
-- - Get both Phone AND Mobile numbers
--
-- BEFORE RUNNING:
-- 1. Back up your database (recommended)
-- 2. Make sure you're connected to the correct SQL Server
-- ============================================================================

USE COMMON;
GO

-- Check if ContactCode column already exists
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = 'User_'
      AND COLUMN_NAME = 'ContactCode'
)
BEGIN
    PRINT 'Adding ContactCode column to User_ table...';

    ALTER TABLE [dbo].[User_]
    ADD ContactCode NVARCHAR(8) NULL;

    PRINT '✓ ContactCode column added successfully!';
    PRINT '';
    PRINT 'This column links users to the Contacts table.';
    PRINT 'The application will now lookup phone/mobile/email from Contacts.';
END
ELSE
BEGIN
    PRINT '⚠ ContactCode column already exists. No changes made.';
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
  AND COLUMN_NAME = 'ContactCode';
GO

-- Show example: how to link a user to a contact
PRINT '';
PRINT '============================================================================';
PRINT 'EXAMPLE: How to link a user to a contact';
PRINT '============================================================================';
PRINT '';
PRINT '-- Update user to link to contact:';
PRINT 'UPDATE COMMON.[dbo].[User_]';
PRINT 'SET ContactCode = ''JSMITH''  -- Contact code from Contacts table';
PRINT 'WHERE UserID = ''JOHN'';      -- User ID';
PRINT '';
PRINT '-- View user with contact info:';
PRINT 'SELECT';
PRINT '    u.UserID,';
PRINT '    u.UserName,';
PRINT '    u.Email as UserEmail,';
PRINT '    u.ContactCode,';
PRINT '    c.Name as ContactName,';
PRINT '    c.Phone,';
PRINT '    c.Mobile,';
PRINT '    c.Email as ContactEmail';
PRINT 'FROM COMMON.[dbo].[User_] u';
PRINT 'LEFT JOIN CROWNESYS.[dbo].[Contacts] c ON u.ContactCode = c.Code';
PRINT 'WHERE u.UserID = ''JOHN'';';
PRINT '';
PRINT '============================================================================';
PRINT 'Script completed.';
PRINT '';
PRINT 'NEXT STEPS:';
PRINT '1. Application code will be updated to JOIN with Contacts table';
PRINT '2. UI will show contact selector when adding/editing users';
PRINT '3. Phone and Mobile numbers will come from Contacts table';
PRINT '============================================================================';
