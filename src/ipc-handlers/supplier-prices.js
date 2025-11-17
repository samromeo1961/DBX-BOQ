const { getPool, getSystemDatabaseName } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Ensure SuppliersPrices table exists with all required columns
 */
async function ensureSuppliersPricesColumns() {
  try {
    const pool = getPool();
    if (!pool) return false;

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) return false;

    const systemDbName = getSystemDatabaseName(dbConfig);

    // Check if table exists
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM [${systemDbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'SuppliersPrices'
        AND TABLE_SCHEMA = 'dbo'
    `);

    if (checkTable.recordset.length === 0) {
      // Table doesn't exist - create it
      console.log('📦 Creating SuppliersPrices table...');

      try {
        await pool.request().query(`
          CREATE TABLE [${systemDbName}].[dbo].[SuppliersPrices] (
            [ItemCode] VARCHAR(50) NOT NULL,
            [Supplier] VARCHAR(50) NOT NULL,
            [Reference] VARCHAR(100) NULL,
            [Price] DECIMAL(18, 2) NOT NULL DEFAULT 0,
            [ValidFrom] DATETIME NULL,
            [Comments] VARCHAR(255) NULL,
            [PriceLevel] INT NULL DEFAULT 0,
            [Area] VARCHAR(50) NULL,
            [LastUpdated] DATETIME NULL DEFAULT GETDATE(),
            CONSTRAINT [PK_SuppliersPrices] PRIMARY KEY CLUSTERED
            (
              [ItemCode] ASC,
              [Supplier] ASC
            )
          );

          CREATE NONCLUSTERED INDEX [IX_SuppliersPrices_Reference]
          ON [${systemDbName}].[dbo].[SuppliersPrices] ([Reference])
          WHERE [Reference] IS NOT NULL;
        `);
        console.log('✅ SuppliersPrices table created successfully');
        return true;
      } catch (createErr) {
        console.error('⚠️  Failed to create SuppliersPrices table:', createErr.message);
        return false;
      }
    }

    // Table exists - check for optional columns
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${systemDbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SuppliersPrices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('ValidFrom', 'Comments', 'PriceLevel', 'Area', 'LastUpdated')
    `);

    const existingColumns = checkColumns.recordset.map(row => row.COLUMN_NAME);
    const columnsToAdd = [];

    // Define columns that should exist
    const optionalColumns = {
      'ValidFrom': 'DATETIME NULL',
      'Comments': 'VARCHAR(255) NULL',
      'PriceLevel': 'INT NULL DEFAULT 0',
      'Area': 'VARCHAR(50) NULL',
      'LastUpdated': 'DATETIME NULL DEFAULT GETDATE()'
    };

    // Check which columns need to be added
    for (const [columnName, columnDef] of Object.entries(optionalColumns)) {
      if (!existingColumns.includes(columnName)) {
        columnsToAdd.push({ name: columnName, def: columnDef });
      }
    }

    // Add missing columns
    if (columnsToAdd.length > 0) {
      console.log(`Adding ${columnsToAdd.length} optional columns to SuppliersPrices table...`);

      for (const col of columnsToAdd) {
        try {
          await pool.request().query(`
            ALTER TABLE [${systemDbName}].[dbo].[SuppliersPrices]
            ADD [${col.name}] ${col.def}
          `);
          console.log(`✅ Added column: SuppliersPrices.${col.name}`);
        } catch (err) {
          console.error(`⚠️  Failed to add column ${col.name}:`, err.message);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring SuppliersPrices table:', error);
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
        s.Name AS SupplierName,
        sp.Reference,
        sp.Price,
        sp.ValidFrom,
        sp.Comments,
        sp.PriceLevel,
        sp.Area,
        sp.LastUpdated
      FROM ${suppliersPricesTable} sp
      LEFT JOIN ${supplierTable} s ON sp.Supplier = s.Code
      WHERE sp.ItemCode = @itemCode
      ORDER BY s.Name, sp.ValidFrom DESC
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
        (ItemCode, Supplier, Reference, Price, ValidFrom, Comments, PriceLevel, Area, LastUpdated)
      VALUES
        (@itemCode, @supplier, @reference, @price, @validFrom, @comments, @priceLevel, @area, GETDATE())
    `;

    await pool.request()
      .input('itemCode', itemCode)
      .input('supplier', supplier)
      .input('reference', reference || null)
      .input('price', price)
      .input('validFrom', validFrom || new Date())
      .input('comments', comments || null)
      .input('priceLevel', priceLevel || 0)
      .input('area', area || null)
      .query(query);

    console.log(`✅ Added supplier price: ${itemCode} -> ${supplier}`);

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
        ValidFrom = @validFrom,
        Comments = @comments,
        PriceLevel = @priceLevel,
        Area = @area,
        LastUpdated = GETDATE()
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
      .input('validFrom', validFrom || new Date())
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
      SELECT Code, Name
      FROM ${supplierTable}
      WHERE Archived = 0
      ORDER BY Name
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
