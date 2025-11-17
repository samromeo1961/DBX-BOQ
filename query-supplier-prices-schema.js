/**
 * Query SuppliersPrices table schema
 * Run with: node query-supplier-prices-schema.js
 */

const { connect, getSystemDatabaseName, close } = require('./src/database/connection');
const credentialsStore = require('./src/database/credentials-store');

async function querySchema() {
  try {
    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      console.error('❌ No database credentials found');
      return;
    }

    const pool = await connect(dbConfig);
    const sysDbName = getSystemDatabaseName(dbConfig);

    console.log('\n📊 Querying SuppliersPrices table schema...\n');

    // Get column information
    const schemaQuery = `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM [${sysDbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices'
      ORDER BY ORDINAL_POSITION
    `;

    const result = await pool.request().query(schemaQuery);

    if (result.recordset.length === 0) {
      console.log('❌ SuppliersPrices table not found');
      return;
    }

    console.log('✅ SuppliersPrices Table Schema:');
    console.log('='.repeat(80));
    console.table(result.recordset);

    // Get sample data
    const sampleQuery = `
      SELECT TOP 5 *
      FROM [${sysDbName}].[dbo].[SuppliersPrices]
    `;

    const sampleResult = await pool.request().query(sampleQuery);

    console.log('\n📋 Sample Data (first 5 rows):');
    console.log('='.repeat(80));
    if (sampleResult.recordset.length > 0) {
      console.table(sampleResult.recordset);
    } else {
      console.log('No data found in table');
    }

    await close();
    console.log('\n✅ Query complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

querySchema();
