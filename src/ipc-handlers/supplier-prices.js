const { getPool, getSystemDatabaseName } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Ensure SuppliersPrices table exists - DO NOT ALTER existing Databuild tables
 * The SuppliersPrices table is an existing Databuild table with columns:
 * - Supp_Date (use instead of ValidFrom)
 * - Comments, PriceLevel, Area (already exist)
 * - NO LastUpdated (don't add to existing table)
 */
async function ensureSuppliersPricesColumns() {
  try {
    const pool = getPool();
    if (!pool) return false;

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) return false;

    const systemDbName = getSystemDatabaseName(dbConfig);

    console.log(`🔍 Checking for SuppliersPrices table in database: ${systemDbName}`);

    // Check if table exists
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM [${systemDbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'SuppliersPrices'
        AND TABLE_SCHEMA = 'dbo'
    `);

    console.log(`📊 Table check result:`, checkTable.recordset);

    if (checkTable.recordset.length === 0) {
      console.log('⚠️  SuppliersPrices table does not exist in Databuild.');
      console.log('   This is an existing Databuild table - it should already exist.');
      console.log('   Please check your Databuild installation.');
      return false;
    }

    // Table exists - verify it has the expected Databuild columns
    console.log(`🔍 Verifying columns in [${systemDbName}].[dbo].[SuppliersPrices]`);

    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${systemDbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Supp_Date', 'Comments', 'PriceLevel', 'Area', 'ItemCode', 'Supplier', 'Price', 'Reference')
    `);

    const existingColumns = checkColumns.recordset.map(row => row.COLUMN_NAME);
    console.log(`📋 Databuild columns found:`, existingColumns);

    // Check for required columns
    const requiredColumns = ['ItemCode', 'Supplier', 'Price'];
    const missingRequired = requiredColumns.filter(col => !existingColumns.includes(col));

    if (missingRequired.length > 0) {
      console.error(`⚠️  Missing required columns: ${missingRequired.join(', ')}`);
      return false;
    }

    console.log(`✓ SuppliersPrices table verified with existing Databuild schema`);
    console.log(`  Note: Using Supp_Date column for date tracking (Databuild standard)`);

    return true;
  } catch (error) {
    console.error('Error checking SuppliersPrices table:', error);
    return false;
  }
}

/**
 * Get supplier prices for a catalogue item
 * @param {string} itemCode - Catalogue item code
 */
async function getSupplierPrices(itemCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected', data: [] };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found', data: [] };
    }

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);
    const supplierTable = qualifyTable('Supplier', dbConfig);

    const query = `
      SELECT
        sp.ItemCode,
        sp.Supplier,
        s.SupplierName,
        sp.Reference,
        sp.Price,
        sp.Supp_Date AS ValidFrom,
        sp.Comments,
        sp.PriceLevel,
        sp.Area
      FROM ${suppliersPricesTable} sp
      LEFT JOIN ${supplierTable} s ON sp.Supplier = s.Supplier_Code
      WHERE sp.ItemCode = @itemCode
      ORDER BY s.SupplierName, sp.Supp_Date DESC
    `;

    const result = await pool.request()
      .input('itemCode', itemCode)
      .query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting supplier prices:', error);
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * Auto-add supplier to nominated supplier list (NominatedSupplier) for item's cost centre
 * @param {string} itemCode - Catalogue item code
 * @param {string} supplierCode - Supplier code
 */
async function autoAddToNominatedSuppliers(itemCode, supplierCode) {
  console.log(`🔍 Auto-add to nominated suppliers: itemCode=${itemCode}, supplier=${supplierCode}`);

  try {
    const pool = getPool();
    if (!pool) {
      console.log('❌ No database pool available');
      return;
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      console.log('❌ No database credentials available');
      return;
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const nominatedSupplierTable = qualifyTable('NominatedSupplier', dbConfig);

    console.log(`📋 Tables: PriceList=${priceListTable}, NominatedSupplier=${nominatedSupplierTable}`);

    // Get the cost centre for this catalogue item
    const costCentreQuery = `
      SELECT CostCentre
      FROM ${priceListTable}
      WHERE PriceCode = @itemCode
    `;

    console.log(`🔍 Looking up cost centre for item ${itemCode}...`);
    const costCentreResult = await pool.request()
      .input('itemCode', itemCode)
      .query(costCentreQuery);

    console.log(`📊 Cost centre query result:`, costCentreResult.recordset);

    if (costCentreResult.recordset.length === 0 || !costCentreResult.recordset[0].CostCentre) {
      console.log(`⚠️  No cost centre found for item ${itemCode}, skipping nominated supplier auto-add`);
      return;
    }

    const costCentre = costCentreResult.recordset[0].CostCentre;
    console.log(`✓ Cost centre found: ${costCentre}`);

    // Check if supplier is already nominated for this cost centre
    const checkQuery = `
      SELECT CostCentre, Code
      FROM ${nominatedSupplierTable}
      WHERE CostCentre = @costCentre AND Code = @supplier
    `;

    console.log(`🔍 Checking if supplier ${supplierCode} already nominated for cost centre ${costCentre}...`);
    const checkResult = await pool.request()
      .input('costCentre', costCentre)
      .input('supplier', supplierCode)
      .query(checkQuery);

    console.log(`📊 Check result:`, checkResult.recordset);

    if (checkResult.recordset.length > 0) {
      console.log(`✓ Supplier ${supplierCode} already nominated for cost centre ${costCentre}`);
      return;
    }

    // Add supplier to nominated list (Counter is auto-generated IDENTITY column)
    const insertQuery = `
      INSERT INTO ${nominatedSupplierTable} (CCBank, Code, CostCentre)
      VALUES (@ccBank, @supplier, @costCentre)
    `;

    console.log(`💾 Inserting: CCBank=1, Code=${supplierCode}, CostCentre=${costCentre}`);

    await pool.request()
      .input('ccBank', 1)
      .input('supplier', supplierCode)
      .input('costCentre', costCentre)
      .query(insertQuery);

    console.log(`✅ Auto-added supplier ${supplierCode} to nominated list for cost centre ${costCentre}`);

  } catch (error) {
    console.error('❌ Error auto-adding to nominated suppliers:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Don't fail the main operation if this fails
  }
}

/**
 * Add a supplier price
 * @param {Object} priceData - Supplier price data
 */
async function addSupplierPrice(priceData) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);

    const {
      itemCode,
      supplier,
      reference,
      price,
      validFrom,
      comments,
      priceLevel,
      area
    } = priceData;

    const query = `
      INSERT INTO ${suppliersPricesTable}
        (ItemCode, Supplier, Reference, Price, Supp_Date, Comments, PriceLevel, Area)
      VALUES
        (@itemCode, @supplier, @reference, @price, @suppDate, @comments, @priceLevel, @area)
    `;

    await pool.request()
      .input('itemCode', itemCode)
      .input('supplier', supplier)
      .input('reference', reference || null)
      .input('price', price)
      .input('suppDate', validFrom || new Date())
      .input('comments', comments || null)
      .input('priceLevel', priceLevel || 0)
      .input('area', area || null)
      .query(query);

    console.log(`✅ Added supplier price: ${itemCode} -> ${supplier}`);

    // Auto-add supplier to nominated list for this item's cost centre
    await autoAddToNominatedSuppliers(itemCode, supplier);

    return { success: true, message: 'Supplier price added successfully' };

  } catch (error) {
    console.error('Error adding supplier price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update a supplier price
 * @param {Object} priceData - Supplier price data including original values
 */
async function updateSupplierPrice(priceData) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);

    const {
      itemCode,
      supplier,
      originalSupplier,
      originalReference,
      reference,
      price,
      validFrom,
      comments,
      priceLevel,
      area
    } = priceData;

    const query = `
      UPDATE ${suppliersPricesTable}
      SET
        Supplier = @supplier,
        Reference = @reference,
        Price = @price,
        Supp_Date = @suppDate,
        Comments = @comments,
        PriceLevel = @priceLevel,
        Area = @area
      WHERE ItemCode = @itemCode
        AND Supplier = @originalSupplier
        AND ISNULL(Reference, '') = ISNULL(@originalReference, '')
    `;

    const result = await pool.request()
      .input('itemCode', itemCode)
      .input('supplier', supplier)
      .input('originalSupplier', originalSupplier || supplier)
      .input('originalReference', originalReference || null)
      .input('reference', reference || null)
      .input('price', price)
      .input('suppDate', validFrom || new Date())
      .input('comments', comments || null)
      .input('priceLevel', priceLevel || 0)
      .input('area', area || null)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return { success: false, message: 'Supplier price not found' };
    }

    console.log(`✅ Updated supplier price: ${itemCode} -> ${supplier}`);

    return { success: true, message: 'Supplier price updated successfully' };

  } catch (error) {
    console.error('Error updating supplier price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete a supplier price
 * @param {string} itemCode - Catalogue item code
 * @param {string} supplier - Supplier code
 * @param {string} reference - Supplier reference (optional)
 */
async function deleteSupplierPrice(itemCode, supplier, reference = null) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);

    const query = `
      DELETE FROM ${suppliersPricesTable}
      WHERE ItemCode = @itemCode
        AND Supplier = @supplier
        AND ISNULL(Reference, '') = ISNULL(@reference, '')
    `;

    const result = await pool.request()
      .input('itemCode', itemCode)
      .input('supplier', supplier)
      .input('reference', reference || null)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return { success: false, message: 'Supplier price not found' };
    }

    console.log(`✅ Deleted supplier price: ${itemCode} -> ${supplier}`);

    return { success: true, message: 'Supplier price deleted successfully' };

  } catch (error) {
    console.error('Error deleting supplier price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get all suppliers
 */
async function getSuppliers() {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected', data: [] };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found', data: [] };
    }

    const supplierTable = qualifyTable('Supplier', dbConfig);

    const query = `
      SELECT Supplier_Code AS Code, SupplierName AS Name
      FROM ${supplierTable}
      WHERE Archived = 0
      ORDER BY SupplierName
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting suppliers:', error);
    return { success: false, message: error.message, data: [] };
  }
}

module.exports = {
  getSupplierPrices,
  addSupplierPrice,
  updateSupplierPrice,
  deleteSupplierPrice,
  getSuppliers,
  ensureSuppliersPricesColumns
};
