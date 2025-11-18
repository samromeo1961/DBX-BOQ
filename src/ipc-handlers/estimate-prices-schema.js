const { getPool } = require('../database/connection');
const credentialsStore = require('../database/credentials-store');

/**
 * Ensure optional columns exist in Prices table for estimate price tracking
 * This is called on app startup to add columns if needed
 */
async function ensureEstimatePriceColumns() {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('⚠️  Database not connected - skipping Prices column check');
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const dbName = dbConfig.database;

    console.log('🔍 Checking for Prices table columns...');

    // Check which columns exist (Date already exists in Databuild schema)
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes', 'CreatedDate')
    `);

    const existingColumns = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const columnsToAdd = [];

    // Note: Date column already exists in Databuild schema
    // Check Estimator
    if (!existingColumns.includes('Estimator')) {
      columnsToAdd.push({
        name: 'Estimator',
        definition: '[Estimator] NVARCHAR(100) NULL'
      });
    }

    // Check Notes
    if (!existingColumns.includes('Notes')) {
      columnsToAdd.push({
        name: 'Notes',
        definition: '[Notes] NVARCHAR(MAX) NULL'
      });
    }

    // Check CreatedDate
    if (!existingColumns.includes('CreatedDate')) {
      columnsToAdd.push({
        name: 'CreatedDate',
        definition: '[CreatedDate] DATETIME NULL'
      });
    }

    // Add missing columns
    if (columnsToAdd.length > 0) {
      console.log(`📝 Adding ${columnsToAdd.length} column(s) to Prices table...`);

      for (const column of columnsToAdd) {
        try {
          await pool.request().query(`
            USE [${dbName}];
            ALTER TABLE [dbo].[Prices]
            ADD ${column.definition};
          `);
          console.log(`  ✅ Added ${column.name} column`);
        } catch (error) {
          console.error(`  ❌ Error adding ${column.name} column:`, error.message);
        }
      }

      console.log('✅ Prices table columns updated for estimate price tracking');
    } else {
      console.log('✅ Prices table already has all required columns');
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error ensuring Prices table columns:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  ensureEstimatePriceColumns
};
