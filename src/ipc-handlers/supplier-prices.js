const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

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
  getSuppliers
};
