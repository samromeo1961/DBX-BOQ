-- Check User_ table structure to see if there's already a contact link field
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM COMMON.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'User_'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;

-- Check a sample user to see all fields
SELECT TOP 1 * FROM COMMON.[dbo].[User_];

-- Check Contacts table structure (for reference)
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM CROWNESYS.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Contacts'
  AND TABLE_SCHEMA = 'dbo'
  AND COLUMN_NAME IN ('Code', 'Name', 'Phone', 'Mobile', 'Email')
ORDER BY ORDINAL_POSITION;

-- Check sample contacts
SELECT TOP 5 Code, Name, Phone, Mobile, Email
FROM CROWNESYS.[dbo].[Contacts]
WHERE Group_ = 1  -- Assuming Group_ = 1 means individuals/contacts
ORDER BY Name;
