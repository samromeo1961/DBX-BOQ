-- Check what columns exist in User_ table
-- Run this in SQL Server Management Studio or sqlcmd

SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM COMMON.INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'User_'
  AND TABLE_SCHEMA = 'dbo'
ORDER BY ORDINAL_POSITION;
