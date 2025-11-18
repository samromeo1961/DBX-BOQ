const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Check for duplicate PriceCode entries in PriceList table
 */
async function checkDuplicatePriceCodes() {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found',
        data: []
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);

    // Check for duplicate PriceCodes in PriceList
    const query = `
      SELECT
        PriceCode,
        COUNT(*) as DuplicateCount,
        STRING_AGG(CAST(Description AS NVARCHAR(MAX)), ' | ') AS Descriptions
      FROM ${priceListTable}
      GROUP BY PriceCode
      HAVING COUNT(*) > 1
      ORDER BY DuplicateCount DESC
    `;

    const result = await pool.request().query(query);

    console.log(`🔍 Found ${result.recordset.length} duplicate PriceCodes in PriceList table`);

    if (result.recordset.length > 0) {
      console.log('Duplicates:');
      result.recordset.forEach(dup => {
        console.log(`  - ${dup.PriceCode}: ${dup.DuplicateCount} entries - ${dup.Descriptions}`);
      });
    }

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error checking duplicate price codes:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Check for duplicate Price entries (same PriceCode and PriceLevel)
 */
async function checkDuplicatePrices() {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found',
        data: []
      };
    }

    const pricesTable = qualifyTable('Prices', dbConfig);

    // Check for duplicate PriceCode+PriceLevel combinations
    const query = `
      SELECT
        PriceCode,
        PriceLevel,
        COUNT(*) as DuplicateCount,
        STRING_AGG(CAST(Price AS NVARCHAR(50)), ', ') AS Prices
      FROM ${pricesTable}
      GROUP BY PriceCode, PriceLevel
      HAVING COUNT(*) > 1
      ORDER BY DuplicateCount DESC
    `;

    const result = await pool.request().query(query);

    console.log(`🔍 Found ${result.recordset.length} duplicate Price entries (same PriceCode + PriceLevel)`);

    if (result.recordset.length > 0) {
      console.log('Duplicates:');
      result.recordset.slice(0, 10).forEach(dup => {
        console.log(`  - ${dup.PriceCode} Level ${dup.PriceLevel}: ${dup.DuplicateCount} entries - Prices: ${dup.Prices}`);
      });
    }

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error checking duplicate prices:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get specific item details to debug duplication
 */
async function debugItemDuplication(priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: {}
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found',
        data: {}
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    // Get all PriceList entries for this code
    const priceListQuery = `
      SELECT *
      FROM ${priceListTable}
      WHERE PriceCode = @priceCode
    `;

    const priceListResult = await pool.request()
      .input('priceCode', priceCode)
      .query(priceListQuery);

    // Get all Prices entries for this code
    const pricesQuery = `
      SELECT *
      FROM ${pricesTable}
      WHERE PriceCode = @priceCode
      ORDER BY PriceLevel
    `;

    const pricesResult = await pool.request()
      .input('priceCode', priceCode)
      .query(pricesQuery);

    console.log(`🔍 Debug info for ${priceCode}:`);
    console.log(`  PriceList entries: ${priceListResult.recordset.length}`);
    console.log(`  Prices entries: ${pricesResult.recordset.length}`);

    return {
      success: true,
      data: {
        priceCode,
        priceListEntries: priceListResult.recordset,
        pricesEntries: pricesResult.recordset
      }
    };

  } catch (error) {
    console.error('Error debugging item duplication:', error);
    return {
      success: false,
      message: error.message,
      data: {}
    };
  }
}

module.exports = {
  checkDuplicatePriceCodes,
  checkDuplicatePrices,
  debugItemDuplication
};
