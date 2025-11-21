/**
 * Database Schema Migration Utility
 * Generates SQL scripts for all DBx BOQ database modifications
 * For use by Database Administrators to apply changes to production databases
 */

const { getPool } = require('./connection');
const credentialsStore = require('./credentials-store');

/**
 * Define all schema changes required by DBx BOQ
 */
const SCHEMA_CHANGES = [
  // ============================================================
  // NEW TABLES
  // ============================================================
  {
    type: 'table',
    name: 'DBxDocuments',
    database: 'system',
    description: 'Document management - stores metadata for linked documents',
    checkSql: (dbName) => `
      SELECT TABLE_NAME FROM [${dbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'DBxDocuments' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Table: DBxDocuments
-- Purpose: Document management - stores metadata for linked documents
-- ============================================================
CREATE TABLE [${dbName}].[dbo].[DBxDocuments] (
  [DocumentID] INT IDENTITY(1,1) PRIMARY KEY,
  [EntityType] VARCHAR(20) NOT NULL,        -- 'Job', 'Supplier', 'Contact', 'Customer'
  [EntityCode] VARCHAR(50) NOT NULL,        -- JobNo, SupplierCode, etc.
  [DocumentType] VARCHAR(30) NOT NULL,      -- 'Quote', 'Order', 'Invoice', 'Email', etc.
  [FileName] NVARCHAR(255) NOT NULL,
  [RelativePath] NVARCHAR(500) NOT NULL,    -- Path relative to base storage location
  [CloudURL] NVARCHAR(1000) NULL,
  [Description] NVARCHAR(500) NULL,
  [FileSize] BIGINT NULL,
  [MimeType] VARCHAR(100) NULL,
  [CreatedDate] DATETIME DEFAULT GETDATE(),
  [CreatedBy] NVARCHAR(100) NULL,
  [ModifiedDate] DATETIME NULL,
  [ModifiedBy] NVARCHAR(100) NULL,
  [IsDeleted] BIT DEFAULT 0,
  [DeletedDate] DATETIME NULL,
  [DeletedBy] NVARCHAR(100) NULL,
  [Tags] NVARCHAR(500) NULL,
  [Notes] NVARCHAR(MAX) NULL
);

CREATE INDEX IX_DBxDocuments_Entity ON [${dbName}].[dbo].[DBxDocuments] (EntityType, EntityCode);
CREATE INDEX IX_DBxDocuments_Type ON [${dbName}].[dbo].[DBxDocuments] (DocumentType);
CREATE INDEX IX_DBxDocuments_Created ON [${dbName}].[dbo].[DBxDocuments] (CreatedDate);
GO
`
  },

  // ============================================================
  // COLUMN ADDITIONS TO EXISTING TABLES
  // ============================================================
  {
    type: 'column',
    table: 'Bill',
    column: 'Supplier',
    database: 'job',
    description: 'Supplier assignment for BOQ line items',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Bill' AND COLUMN_NAME = 'Supplier' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: Bill.Supplier
-- Purpose: Supplier assignment for BOQ line items
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[Bill] ADD [Supplier] VARCHAR(20) NULL;
GO
`
  },
  {
    type: 'column',
    table: 'PriceList',
    column: 'Images',
    database: 'system',
    description: 'JSON storage for catalogue item images',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PriceList' AND COLUMN_NAME = 'Images' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: PriceList.Images
-- Purpose: JSON storage for catalogue item images
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[PriceList] ADD [Images] NVARCHAR(MAX) NULL;
GO
`
  },
  {
    type: 'column',
    table: 'SuppliersPrices',
    column: 'EffectiveDate',
    database: 'system',
    description: 'Effective date for supplier prices',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices' AND COLUMN_NAME = 'EffectiveDate' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: SuppliersPrices.EffectiveDate
-- Purpose: Effective date for supplier prices
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[SuppliersPrices] ADD [EffectiveDate] DATE NULL;
GO
`
  },
  {
    type: 'column',
    table: 'SuppliersPrices',
    column: 'ExpiryDate',
    database: 'system',
    description: 'Expiry date for supplier prices',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices' AND COLUMN_NAME = 'ExpiryDate' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: SuppliersPrices.ExpiryDate
-- Purpose: Expiry date for supplier prices
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[SuppliersPrices] ADD [ExpiryDate] DATE NULL;
GO
`
  },
  {
    type: 'column',
    table: 'SuppliersPrices',
    column: 'Notes',
    database: 'system',
    description: 'Notes for supplier prices',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices' AND COLUMN_NAME = 'Notes' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: SuppliersPrices.Notes
-- Purpose: Notes for supplier prices
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[SuppliersPrices] ADD [Notes] NVARCHAR(500) NULL;
GO
`
  },
  {
    type: 'column',
    table: 'Orders',
    column: 'Status',
    database: 'job',
    description: 'Order status tracking (Active, Cancelled, etc.)',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'Status' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: Orders.Status
-- Purpose: Order status tracking (Active, Cancelled, etc.)
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[Orders] ADD [Status] VARCHAR(20) NULL DEFAULT 'Active';
GO
`
  },
  {
    type: 'column',
    table: 'Orders',
    column: 'CancelledDate',
    database: 'job',
    description: 'Date when order was cancelled',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'CancelledDate' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: Orders.CancelledDate
-- Purpose: Date when order was cancelled
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[Orders] ADD [CancelledDate] DATETIME NULL;
GO
`
  },
  {
    type: 'column',
    table: 'Orders',
    column: 'CancelReason',
    database: 'job',
    description: 'Reason for order cancellation',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'CancelReason' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: Orders.CancelReason
-- Purpose: Reason for order cancellation
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[Orders] ADD [CancelReason] NVARCHAR(500) NULL;
GO
`
  },
  {
    type: 'column',
    table: 'Prices',
    column: 'EstimatePrice',
    database: 'system',
    description: 'Estimate price level for catalogue items',
    checkSql: (dbName) => `
      SELECT COLUMN_NAME FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices' AND COLUMN_NAME = 'EstimatePrice' AND TABLE_SCHEMA = 'dbo'
    `,
    createSql: (dbName) => `
-- ============================================================
-- Column: Prices.EstimatePrice
-- Purpose: Estimate price level for catalogue items
-- ============================================================
ALTER TABLE [${dbName}].[dbo].[Prices] ADD [EstimatePrice] MONEY NULL;
GO
`
  }
];

/**
 * Check which schema changes are needed
 */
async function checkSchemaStatus() {
  const pool = getPool();
  if (!pool) {
    return { success: false, error: 'Database not connected' };
  }

  const dbConfig = credentialsStore.getCredentials();
  if (!dbConfig) {
    return { success: false, error: 'No database credentials' };
  }

  const systemDb = dbConfig.systemDatabase || dbConfig.database;
  const jobDb = dbConfig.jobDatabase || dbConfig.database.replace('SYS', 'JOB');

  const results = [];

  for (const change of SCHEMA_CHANGES) {
    const dbName = change.database === 'system' ? systemDb : jobDb;

    try {
      const checkResult = await pool.request().query(change.checkSql(dbName));
      const exists = checkResult.recordset.length > 0;

      results.push({
        type: change.type,
        name: change.type === 'table' ? change.name : `${change.table}.${change.column}`,
        database: dbName,
        description: change.description,
        exists: exists,
        needed: !exists
      });
    } catch (error) {
      results.push({
        type: change.type,
        name: change.type === 'table' ? change.name : `${change.table}.${change.column}`,
        database: dbName,
        description: change.description,
        exists: false,
        needed: true,
        error: error.message
      });
    }
  }

  return {
    success: true,
    systemDatabase: systemDb,
    jobDatabase: jobDb,
    changes: results,
    pendingCount: results.filter(r => r.needed).length
  };
}

/**
 * Generate complete migration SQL script
 */
async function generateMigrationScript() {
  const dbConfig = credentialsStore.getCredentials();
  if (!dbConfig) {
    return { success: false, error: 'No database credentials' };
  }

  const systemDb = dbConfig.systemDatabase || dbConfig.database;
  const jobDb = dbConfig.jobDatabase || dbConfig.database.replace('SYS', 'JOB');

  const status = await checkSchemaStatus();
  if (!status.success) {
    return status;
  }

  let script = `-- ============================================================
-- DBx BOQ Database Migration Script
-- Generated: ${new Date().toISOString()}
-- System Database: ${systemDb}
-- Job Database: ${jobDb}
-- ============================================================
--
-- This script contains all database modifications required by DBx BOQ.
-- Run this script with appropriate permissions (db_ddladmin or higher).
--
-- Changes included:
`;

  // List all changes
  for (const change of status.changes) {
    const statusMark = change.exists ? '[EXISTS]' : '[NEEDED]';
    script += `--   ${statusMark} ${change.name} - ${change.description}\n`;
  }

  script += `--
-- ============================================================

`;

  // Generate SQL for needed changes only
  const pendingChanges = status.changes.filter(c => c.needed);

  if (pendingChanges.length === 0) {
    script += `-- No changes needed - database is up to date!\n`;
  } else {
    for (const change of SCHEMA_CHANGES) {
      const dbName = change.database === 'system' ? systemDb : jobDb;
      const statusItem = status.changes.find(c =>
        c.name === (change.type === 'table' ? change.name : `${change.table}.${change.column}`)
      );

      if (statusItem && statusItem.needed) {
        script += change.createSql(dbName);
        script += '\n';
      }
    }
  }

  script += `
-- ============================================================
-- End of Migration Script
-- ============================================================
`;

  return {
    success: true,
    script: script,
    systemDatabase: systemDb,
    jobDatabase: jobDb,
    totalChanges: SCHEMA_CHANGES.length,
    pendingChanges: pendingChanges.length,
    existingChanges: status.changes.filter(c => c.exists).length
  };
}

/**
 * Generate script for ALL changes (regardless of current state)
 * Useful for setting up a fresh database
 */
function generateFullScript(systemDb = 'SYSTEMDB', jobDb = 'JOBDB') {
  let script = `-- ============================================================
-- DBx BOQ Complete Database Schema Script
-- Generated: ${new Date().toISOString()}
--
-- Replace [SYSTEMDB] and [JOBDB] with your actual database names
-- System Database: ${systemDb}
-- Job Database: ${jobDb}
-- ============================================================

`;

  for (const change of SCHEMA_CHANGES) {
    const dbName = change.database === 'system' ? systemDb : jobDb;
    script += change.createSql(dbName);
    script += '\n';
  }

  script += `
-- ============================================================
-- End of Schema Script
-- ============================================================
`;

  return script;
}

module.exports = {
  SCHEMA_CHANGES,
  checkSchemaStatus,
  generateMigrationScript,
  generateFullScript
};
