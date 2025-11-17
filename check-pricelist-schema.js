// Temporary script to check PriceList table schema
const { getPool } = require('./src/database/connection');
const credentialsStore = require('./src/database/credentials-store');

async function checkSchema() {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('❌ Database not connected');
      return;
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      console.log('❌ No database configuration found');
      return;
    }

    const tableName = dbConfig.useSysDatabase ?
      `[${dbConfig.sysDatabaseName}].[dbo].[PriceList]` :
      `[dbo].[PriceList]`;

    const query = `
      SELECT
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PriceList'
      ORDER BY ORDINAL_POSITION
    `;

    console.log('📋 Checking PriceList table schema...\n');
    const result = await pool.request().query(query);

    console.log('Columns in PriceList table:');
    console.log('='.repeat(80));
    result.recordset.forEach(col => {
      console.log(`${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('='.repeat(80));
    console.log(`\nTotal columns: ${result.recordset.length}`);

    // Check specifically for Template and Specification fields
    const hasTemplate = result.recordset.some(col => col.COLUMN_NAME.toLowerCase().includes('template'));
    const hasSpecification = result.recordset.some(col => col.COLUMN_NAME.toLowerCase().includes('spec'));
    const hasWorkup = result.recordset.some(col => col.COLUMN_NAME.toLowerCase().includes('workup'));

    console.log('\n🔍 Looking for specific fields:');
    console.log(`   Template field: ${hasTemplate ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   Specification field: ${hasSpecification ? '✅ FOUND' : '❌ NOT FOUND'}`);
    console.log(`   Workup field: ${hasWorkup ? '✅ FOUND' : '❌ NOT FOUND'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
