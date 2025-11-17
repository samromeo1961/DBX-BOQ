const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Get catalogue items with filtering and price level support
 * @param {Object} params - Search parameters
 * @param {string} params.searchTerm - Search term for code/description
 * @param {string} params.costCentre - Filter by cost centre
 * @param {number} params.priceLevel - Price level (0-5)
 * @param {boolean} params.showArchived - Include archived items
 */
async function getCatalogueItems(params) {
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

    const {
      searchTerm = '',
      costCentre = null,
      priceLevel = 1,
      showArchived = false
    } = params;

    console.log('🔍 Catalogue: Searching with priceLevel =', priceLevel);

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const recipeTable = qualifyTable('Recipe', dbConfig);

    // Build the query with dynamic filtering
    let query = `
      SELECT
        pl.PriceCode,
        pl.Description,
        pl.CostCentre,
        cc.Name AS CostCentreName,
        pc.Printout AS Unit,
        COALESCE(p.Price, 0) AS Price,
        CASE WHEN r.PriceCode IS NOT NULL THEN 1 ELSE 0 END AS Recipe,
        pl.Archived
      FROM ${priceListTable} pl
      LEFT JOIN ${costCentresTable} cc ON pl.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN (
        SELECT PriceCode, Price
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
      ) p ON pl.PriceCode = p.PriceCode
      LEFT JOIN (
        SELECT DISTINCT Main_Item AS PriceCode
        FROM ${recipeTable}
      ) r ON pl.PriceCode = r.PriceCode
      WHERE 1=1
    `;

    // Add archived filter
    if (!showArchived) {
      query += ` AND pl.Archived = 0`;
    }

    // Add cost centre filter
    if (costCentre) {
      query += ` AND pl.CostCentre = @costCentre`;
    }

    // Add search term filter (code or description) - support multiple words in any order
    if (searchTerm && searchTerm.trim() !== '') {
      // Split search term into individual words
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);

      // Each word must appear in either PriceCode or Description
      words.forEach((word, index) => {
        query += ` AND (pl.PriceCode LIKE @searchPattern${index} OR pl.Description LIKE @searchPattern${index})`;
      });
    }

    // Order by cost centre and code
    query += `
      ORDER BY
        ISNULL(cc.SortOrder, 999999),
        pl.CostCentre,
        pl.PriceCode
    `;

    // Build the request
    const request = pool.request()
      .input('priceLevel', priceLevel);

    if (costCentre) {
      request.input('costCentre', costCentre);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      // Add each word as a separate parameter
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, index) => {
        const searchPattern = `%${word}%`;
        request.input(`searchPattern${index}`, searchPattern);
      });
    }

    const result = await request.query(query);

    console.log(`✅ Catalogue: Found ${result.recordset.length} items`);
    if (result.recordset.length > 0) {
      console.log('First 5 items with prices:');
      result.recordset.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.PriceCode} - ${item.Description} - Price: ${item.Price} - Unit: ${item.Unit}`);
      });
    }

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting catalogue items:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single catalogue item by price code
 * @param {string} priceCode - The price code
 * @param {number} priceLevel - Price level (1-5)
 */
async function getCatalogueItem(priceCode, priceLevel = 1) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: null
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found',
        data: null
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const recipeTable = qualifyTable('Recipe', dbConfig);

    const query = `
      SELECT
        pl.PriceCode,
        pl.Description,
        pl.CostCentre,
        cc.Name AS CostCentreName,
        pl.PerCode,
        pc.Printout AS Unit,
        COALESCE(p.Price, 0) AS Price,
        CASE WHEN r.PriceCode IS NOT NULL THEN 1 ELSE 0 END AS Recipe,
        pl.Archived
      FROM ${priceListTable} pl
      LEFT JOIN ${costCentresTable} cc ON pl.CostCentre = cc.Code AND cc.Tier = 1
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN (
        SELECT PriceCode, Price
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
      ) p ON pl.PriceCode = p.PriceCode
      LEFT JOIN (
        SELECT DISTINCT Main_Item AS PriceCode
        FROM ${recipeTable}
      ) r ON pl.PriceCode = r.PriceCode
      WHERE pl.PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .input('priceLevel', priceLevel)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Catalogue item not found',
        data: null
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting catalogue item:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

/**
 * Get recipe details for a price code
 * @param {string} priceCode - The price code of the recipe
 */
async function getRecipeDetails(priceCode) {
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

    const recipeTable = qualifyTable('Recipe', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    const query = `
      SELECT
        r.Main_Item AS PriceCode,
        r.Sub_Item AS SubItem,
        r.Quantity,
        r.Formula,
        pl.Description,
        pc.Printout AS Unit,
        pl.Archived
      FROM ${recipeTable} r
      LEFT JOIN ${priceListTable} pl ON r.Sub_Item = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      WHERE r.Main_Item = @priceCode
      ORDER BY r.Sub_Item
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting recipe details:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get all catalogue items with all 5 price levels for management
 * @param {Object} params - Filter parameters
 * @param {string} params.searchTerm - Search term for code/description
 * @param {string} params.costCentre - Filter by cost centre
 * @param {boolean} params.showArchived - Include archived items
 */
async function getAllCatalogueItems(params = {}) {
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

    const {
      searchTerm = '',
      costCentre = null,
      showArchived = false,
      recipesOnly = false
    } = params;

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const recipeTable = qualifyTable('Recipe', dbConfig);

    // Build the query to get all price levels
    let query = `
      SELECT
        pl.PriceCode,
        pl.Description,
        pl.CostCentre,
        pl.PerCode,
        pc.Printout AS Unit,
        pc.Display AS UnitDisplay,
        pc.Divisor,
        pc.Rounding,
        pc.CalculationRoutine,
        CASE WHEN pc.CalculationRoutine = 8 THEN 1 ELSE 0 END AS IsHeading,
        CASE WHEN pc.CalculationRoutine = 9 THEN 1 ELSE 0 END AS IsSubHeading,
        COALESCE(p1.Price, 0) AS Price1,
        COALESCE(p2.Price, 0) AS Price2,
        COALESCE(p3.Price, 0) AS Price3,
        COALESCE(p4.Price, 0) AS Price4,
        COALESCE(p5.Price, 0) AS Price5,
        CASE WHEN r.PriceCode IS NOT NULL THEN 1 ELSE 0 END AS Recipe,
        pl.Archived
      FROM ${priceListTable} pl
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN (SELECT PriceCode, Price FROM ${pricesTable} WHERE PriceLevel = 1) p1 ON pl.PriceCode = p1.PriceCode
      LEFT JOIN (SELECT PriceCode, Price FROM ${pricesTable} WHERE PriceLevel = 2) p2 ON pl.PriceCode = p2.PriceCode
      LEFT JOIN (SELECT PriceCode, Price FROM ${pricesTable} WHERE PriceLevel = 3) p3 ON pl.PriceCode = p3.PriceCode
      LEFT JOIN (SELECT PriceCode, Price FROM ${pricesTable} WHERE PriceLevel = 4) p4 ON pl.PriceCode = p4.PriceCode
      LEFT JOIN (SELECT PriceCode, Price FROM ${pricesTable} WHERE PriceLevel = 5) p5 ON pl.PriceCode = p5.PriceCode
      LEFT JOIN (
        SELECT DISTINCT Main_Item AS PriceCode
        FROM ${recipeTable}
      ) r ON pl.PriceCode = r.PriceCode
      WHERE 1=1
    `;

    // Add filters
    if (!showArchived) {
      query += ` AND pl.Archived = 0`;
    }

    if (costCentre) {
      query += ` AND pl.CostCentre = @costCentre`;
    }

    if (recipesOnly) {
      query += ` AND r.PriceCode IS NOT NULL`;
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, index) => {
        query += ` AND (pl.PriceCode LIKE @searchPattern${index} OR pl.Description LIKE @searchPattern${index})`;
      });
    }

    query += ` ORDER BY pl.CostCentre, pl.PriceCode`;

    const request = pool.request();

    if (costCentre) {
      request.input('costCentre', costCentre);
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, index) => {
        request.input(`searchPattern${index}`, `%${word}%`);
      });
    }

    const result = await request.query(query);

    console.log(`✅ Catalogue Management: Found ${result.recordset.length} items`);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting all catalogue items:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get list of PerCodes (units)
 */
async function getPerCodes() {
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

    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    const query = `
      SELECT
        Code,
        Display,
        Printout,
        Divisor,
        Rounding,
        CalculationRoutine,
        IsBold,
        Lcolor
      FROM ${perCodesTable}
      WHERE CalculationRoutine != 8
      ORDER BY Printout
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting PerCodes:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Update a catalogue item
 * @param {Object} item - Item data to update
 */
async function updateCatalogueItem(item) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found'
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    // Get PerCode from Unit (Printout)
    let perCode = item.PerCode;
    if (item.Unit && !item.PerCode) {
      const perCodeQuery = `SELECT Code FROM ${perCodesTable} WHERE Printout = @unit`;
      const perCodeResult = await pool.request()
        .input('unit', item.Unit)
        .query(perCodeQuery);

      if (perCodeResult.recordset.length > 0) {
        perCode = perCodeResult.recordset[0].Code;
      }
    }

    // Update PriceList
    const updatePriceListQuery = `
      UPDATE ${priceListTable}
      SET
        Description = @description,
        CostCentre = @costCentre,
        PerCode = @perCode,
        Archived = @archived
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', item.PriceCode)
      .input('description', item.Description)
      .input('costCentre', item.CostCentre)
      .input('perCode', perCode)
      .input('archived', item.Archived ? 1 : 0)
      .query(updatePriceListQuery);

    // Update prices for each level (1-5)
    for (let level = 1; level <= 5; level++) {
      const priceKey = `Price${level}`;
      if (item[priceKey] !== undefined) {
        const price = parseFloat(item[priceKey]) || 0;

        // Check if price record exists
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM ${pricesTable}
          WHERE PriceCode = @priceCode AND PriceLevel = @priceLevel
        `;

        const checkResult = await pool.request()
          .input('priceCode', item.PriceCode)
          .input('priceLevel', level)
          .query(checkQuery);

        if (checkResult.recordset[0].count > 0) {
          // Update existing
          const updatePriceQuery = `
            UPDATE ${pricesTable}
            SET Price = @price
            WHERE PriceCode = @priceCode AND PriceLevel = @priceLevel
          `;

          await pool.request()
            .input('priceCode', item.PriceCode)
            .input('priceLevel', level)
            .input('price', price)
            .query(updatePriceQuery);
        } else {
          // Insert new
          const insertPriceQuery = `
            INSERT INTO ${pricesTable} (PriceCode, PriceLevel, Price)
            VALUES (@priceCode, @priceLevel, @price)
          `;

          await pool.request()
            .input('priceCode', item.PriceCode)
            .input('priceLevel', level)
            .input('price', price)
            .query(insertPriceQuery);
        }
      }
    }

    console.log(`✅ Updated catalogue item: ${item.PriceCode}`);

    return {
      success: true,
      message: 'Item updated successfully'
    };

  } catch (error) {
    console.error('Error updating catalogue item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Add a new catalogue item
 * @param {Object} item - Item data to add
 */
async function addCatalogueItem(item) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found'
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    // Check if PriceCode already exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM ${priceListTable}
      WHERE PriceCode = @priceCode
    `;

    const checkResult = await pool.request()
      .input('priceCode', item.PriceCode)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return {
        success: false,
        message: 'Price code already exists'
      };
    }

    // Insert into PriceList
    const insertPriceListQuery = `
      INSERT INTO ${priceListTable} (PriceCode, Description, CostCentre, PerCode, Archived)
      VALUES (@priceCode, @description, @costCentre, @perCode, @archived)
    `;

    await pool.request()
      .input('priceCode', item.PriceCode)
      .input('description', item.Description)
      .input('costCentre', item.CostCentre)
      .input('perCode', item.PerCode)
      .input('archived', item.Archived ? 1 : 0)
      .query(insertPriceListQuery);

    // Insert prices for each level (1-5)
    for (let level = 1; level <= 5; level++) {
      const priceKey = `Price${level}`;
      const price = parseFloat(item[priceKey]) || 0;

      const insertPriceQuery = `
        INSERT INTO ${pricesTable} (PriceCode, PriceLevel, Price)
        VALUES (@priceCode, @priceLevel, @price)
      `;

      await pool.request()
        .input('priceCode', item.PriceCode)
        .input('priceLevel', level)
        .input('price', price)
        .query(insertPriceQuery);
    }

    console.log(`✅ Added new catalogue item: ${item.PriceCode}`);

    return {
      success: true,
      message: 'Item added successfully'
    };

  } catch (error) {
    console.error('Error adding catalogue item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete catalogue item(s)
 * @param {Array<string>} priceCodes - Array of price codes to delete
 */
async function deleteCatalogueItems(priceCodes) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found'
      };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const billItemsTable = qualifyTable('BillItems', dbConfig);
    const recipeTable = qualifyTable('Recipe', dbConfig);

    const results = [];

    for (const priceCode of priceCodes) {
      // Check if item is used in any bills
      const checkBillsQuery = `
        SELECT COUNT(*) as count
        FROM ${billItemsTable}
        WHERE PriceCode = @priceCode
      `;

      const billsResult = await pool.request()
        .input('priceCode', priceCode)
        .query(checkBillsQuery);

      if (billsResult.recordset[0].count > 0) {
        results.push({
          priceCode,
          success: false,
          message: 'Item is used in bills and cannot be deleted'
        });
        continue;
      }

      // Check if item is used in recipes
      const checkRecipeQuery = `
        SELECT COUNT(*) as count
        FROM ${recipeTable}
        WHERE Main_Item = @priceCode OR Sub_Item = @priceCode
      `;

      const recipeResult = await pool.request()
        .input('priceCode', priceCode)
        .query(checkRecipeQuery);

      if (recipeResult.recordset[0].count > 0) {
        results.push({
          priceCode,
          success: false,
          message: 'Item is used in recipes and cannot be deleted'
        });
        continue;
      }

      // Delete prices
      const deletePricesQuery = `
        DELETE FROM ${pricesTable}
        WHERE PriceCode = @priceCode
      `;

      await pool.request()
        .input('priceCode', priceCode)
        .query(deletePricesQuery);

      // Delete from PriceList
      const deletePriceListQuery = `
        DELETE FROM ${priceListTable}
        WHERE PriceCode = @priceCode
      `;

      await pool.request()
        .input('priceCode', priceCode)
        .query(deletePriceListQuery);

      console.log(`✅ Deleted catalogue item: ${priceCode}`);

      results.push({
        priceCode,
        success: true,
        message: 'Item deleted successfully'
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      message: `Deleted ${successCount} item(s). ${failCount} item(s) could not be deleted.`,
      results
    };

  } catch (error) {
    console.error('Error deleting catalogue items:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Export catalogue to CSV format
 * @param {Object} params - Filter parameters (same as getAllCatalogueItems)
 */
async function exportCatalogueToCSV(params = {}) {
  try {
    const result = await getAllCatalogueItems(params);

    if (!result.success) {
      return result;
    }

    // Convert to CSV format
    const headers = [
      'Price Code',
      'Description',
      'Cost Centre',
      'Unit',
      'Price Level 1',
      'Price Level 2',
      'Price Level 3',
      'Price Level 4',
      'Price Level 5',
      'Archived'
    ];

    const rows = result.data.map(item => [
      item.PriceCode,
      `"${(item.Description || '').replace(/"/g, '""')}"`, // Escape quotes
      item.CostCentre,
      item.Unit,
      item.Price1 || 0,
      item.Price2 || 0,
      item.Price3 || 0,
      item.Price4 || 0,
      item.Price5 || 0,
      item.Archived ? 'Yes' : 'No'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    console.log(`✅ Exported ${result.data.length} catalogue items to CSV`);

    return {
      success: true,
      data: csv,
      count: result.data.length
    };

  } catch (error) {
    console.error('Error exporting catalogue to CSV:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Add a recipe component
 * @param {string} mainItem - Main recipe item code
 * @param {string} subItem - Sub-item code to add
 * @param {number} quantity - Quantity of sub-item
 */
async function addRecipeComponent(mainItem, subItem, quantity) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const recipeTable = qualifyTable('Recipe', dbConfig);

    // Check if component already exists
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM ${recipeTable}
      WHERE Main_Item = @mainItem AND Sub_Item = @subItem
    `;

    const checkResult = await pool.request()
      .input('mainItem', mainItem)
      .input('subItem', subItem)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return { success: false, message: 'Component already exists in recipe' };
    }

    // Insert new component
    const insertQuery = `
      INSERT INTO ${recipeTable} (Main_Item, Sub_Item, Quantity)
      VALUES (@mainItem, @subItem, @quantity)
    `;

    await pool.request()
      .input('mainItem', mainItem)
      .input('subItem', subItem)
      .input('quantity', quantity)
      .query(insertQuery);

    console.log(`✅ Added recipe component: ${mainItem} -> ${subItem} (${quantity})`);

    return { success: true, message: 'Component added successfully' };

  } catch (error) {
    console.error('Error adding recipe component:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update a recipe component quantity
 * @param {string} mainItem - Main recipe item code
 * @param {string} subItem - Sub-item code
 * @param {number} quantity - New quantity
 */
async function updateRecipeComponent(mainItem, subItem, quantity) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const recipeTable = qualifyTable('Recipe', dbConfig);

    const updateQuery = `
      UPDATE ${recipeTable}
      SET Quantity = @quantity
      WHERE Main_Item = @mainItem AND Sub_Item = @subItem
    `;

    await pool.request()
      .input('mainItem', mainItem)
      .input('subItem', subItem)
      .input('quantity', quantity)
      .query(updateQuery);

    console.log(`✅ Updated recipe component: ${mainItem} -> ${subItem} (${quantity})`);

    return { success: true, message: 'Component updated successfully' };

  } catch (error) {
    console.error('Error updating recipe component:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update a recipe component formula
 * @param {string} mainItem - Main recipe item code
 * @param {string} subItem - Sub-item code
 * @param {string} formula - New formula value
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function updateRecipeFormula(mainItem, subItem, formula) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const recipeTable = qualifyTable('Recipe', dbConfig);

    const updateQuery = `
      UPDATE ${recipeTable}
      SET Formula = @formula
      WHERE Main_Item = @mainItem AND Sub_Item = @subItem
    `;

    await pool.request()
      .input('mainItem', mainItem)
      .input('subItem', subItem)
      .input('formula', formula || null)
      .query(updateQuery);

    console.log(`✅ Updated recipe formula: ${mainItem} -> ${subItem} => "${formula}"`);

    return { success: true, message: 'Formula updated successfully' };

  } catch (error) {
    console.error('Error updating recipe formula:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete a recipe component
 * @param {string} mainItem - Main recipe item code
 * @param {string} subItem - Sub-item code to delete
 */
async function deleteRecipeComponent(mainItem, subItem) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const recipeTable = qualifyTable('Recipe', dbConfig);

    const deleteQuery = `
      DELETE FROM ${recipeTable}
      WHERE Main_Item = @mainItem AND Sub_Item = @subItem
    `;

    await pool.request()
      .input('mainItem', mainItem)
      .input('subItem', subItem)
      .query(deleteQuery);

    console.log(`✅ Deleted recipe component: ${mainItem} -> ${subItem}`);

    return { success: true, message: 'Component deleted successfully' };

  } catch (error) {
    console.error('Error deleting recipe component:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getCatalogueItems,
  getCatalogueItem,
  getRecipeDetails,
  getAllCatalogueItems,
  getPerCodes,
  updateCatalogueItem,
  addCatalogueItem,
  deleteCatalogueItems,
  exportCatalogueToCSV,
  addRecipeComponent,
  updateRecipeComponent,
  updateRecipeFormula,
  deleteRecipeComponent
};
