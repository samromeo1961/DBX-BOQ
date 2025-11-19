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
        SELECT PriceCode, MAX(Price) AS Price
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
        GROUP BY PriceCode
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
        SELECT PriceCode, MAX(Price) AS Price
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
        GROUP BY PriceCode
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
      LEFT JOIN (SELECT PriceCode, MAX(Price) AS Price FROM ${pricesTable} WHERE PriceLevel = 1 GROUP BY PriceCode) p1 ON pl.PriceCode = p1.PriceCode
      LEFT JOIN (SELECT PriceCode, MAX(Price) AS Price FROM ${pricesTable} WHERE PriceLevel = 2 GROUP BY PriceCode) p2 ON pl.PriceCode = p2.PriceCode
      LEFT JOIN (SELECT PriceCode, MAX(Price) AS Price FROM ${pricesTable} WHERE PriceLevel = 3 GROUP BY PriceCode) p3 ON pl.PriceCode = p3.PriceCode
      LEFT JOIN (SELECT PriceCode, MAX(Price) AS Price FROM ${pricesTable} WHERE PriceLevel = 4 GROUP BY PriceCode) p4 ON pl.PriceCode = p4.PriceCode
      LEFT JOIN (SELECT PriceCode, MAX(Price) AS Price FROM ${pricesTable} WHERE PriceLevel = 5 GROUP BY PriceCode) p5 ON pl.PriceCode = p5.PriceCode
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

/**
 * Get estimate prices for a catalogue item (current + history)
 * @param {string} priceCode - Catalogue item code
 */
async function getEstimatePrices(priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: { current: {}, history: [] }
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return {
        success: false,
        message: 'No database configuration found',
        data: { current: {}, history: [] }
      };
    }

    const pricesTable = qualifyTable('Prices', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);

    // Get current prices (most recent for each level)
    const currentQuery = `
      SELECT
        PriceCode,
        MAX(CASE WHEN PriceLevel = 1 THEN Price ELSE NULL END) AS Price1,
        MAX(CASE WHEN PriceLevel = 2 THEN Price ELSE NULL END) AS Price2,
        MAX(CASE WHEN PriceLevel = 3 THEN Price ELSE NULL END) AS Price3,
        MAX(CASE WHEN PriceLevel = 4 THEN Price ELSE NULL END) AS Price4,
        MAX(CASE WHEN PriceLevel = 5 THEN Price ELSE NULL END) AS Price5
      FROM (
        SELECT
          PriceCode,
          PriceLevel,
          Price,
          ROW_NUMBER() OVER (PARTITION BY PriceCode, PriceLevel ORDER BY Date DESC) AS rn
        FROM ${pricesTable}
        WHERE PriceCode = @priceCode
      ) AS LatestPrices
      WHERE rn = 1
      GROUP BY PriceCode
    `;

    const currentResult = await pool.request()
      .input('priceCode', priceCode)
      .query(currentQuery);

    const current = currentResult.recordset.length > 0
      ? currentResult.recordset[0]
      : { Price1: 0, Price2: 0, Price3: 0, Price4: 0, Price5: 0 };

    // Check if optional columns exist
    const dbName = dbConfig.database;
    const checkOptionalColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes', 'CreatedDate')
    `);

    const hasEstimator = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Estimator');
    const hasNotes = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Notes');
    const hasCreatedDate = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'CreatedDate');

    // Build query with optional columns
    const historyQuery = `
      SELECT
        p.PriceCode,
        p.PriceLevel,
        p.Price,
        p.Date AS ValidFrom
        ${hasEstimator ? ', p.Estimator' : ', NULL AS Estimator'}
        ${hasNotes ? ', p.Notes' : ', NULL AS Notes'}
        ${hasCreatedDate ? ', p.CreatedDate' : ', NULL AS CreatedDate'}
      FROM ${pricesTable} p
      WHERE p.PriceCode = @priceCode
      ORDER BY p.PriceLevel, p.Date DESC
    `;

    const historyResult = await pool.request()
      .input('priceCode', priceCode)
      .query(historyQuery);

    return {
      success: true,
      data: {
        current,
        history: historyResult.recordset
      }
    };

  } catch (error) {
    console.error('Error getting estimate prices:', error);
    return {
      success: false,
      message: error.message,
      data: { current: {}, history: [] }
    };
  }
}

/**
 * Add a new estimate price
 * @param {Object} data - { itemCode, priceLevel, price, effectiveDate, estimator, notes }
 */
async function addEstimatePrice(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const { itemCode, priceLevel, price, validFrom, estimator, notes } = data;

    const pricesTable = qualifyTable('Prices', dbConfig);
    const dbName = dbConfig.database;

    // Check if optional columns exist
    const checkOptionalColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes', 'CreatedDate')
    `);

    const hasEstimator = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Estimator');
    const hasNotes = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Notes');
    const hasCreatedDate = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'CreatedDate');

    // Check if a price already exists for this code/level/date
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM ${pricesTable}
      WHERE PriceCode = @itemCode
        AND PriceLevel = @priceLevel
        AND Date = @validFrom
    `;

    const checkResult = await pool.request()
      .input('itemCode', itemCode)
      .input('priceLevel', priceLevel)
      .input('validFrom', validFrom)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return {
        success: false,
        message: 'A price already exists for this level and date'
      };
    }

    // Build insert query based on available columns
    const columns = ['PriceCode', 'PriceLevel', 'Price', 'Date'];
    const values = ['@itemCode', '@priceLevel', '@price', '@validFrom'];
    const request = pool.request()
      .input('itemCode', itemCode)
      .input('priceLevel', priceLevel)
      .input('price', price)
      .input('validFrom', validFrom);

    if (hasEstimator) {
      columns.push('Estimator');
      values.push('@estimator');
      request.input('estimator', estimator || null);
    }

    if (hasNotes) {
      columns.push('Notes');
      values.push('@notes');
      request.input('notes', notes || null);
    }

    if (hasCreatedDate) {
      columns.push('CreatedDate');
      values.push('GETDATE()');
    }

    const insertQuery = `
      INSERT INTO ${pricesTable} (${columns.join(', ')})
      VALUES (${values.join(', ')})
    `;

    await request.query(insertQuery);

    console.log(`✅ Added estimate price for ${itemCode}, Level ${priceLevel}`);

    return { success: true, message: 'Estimate price added successfully' };

  } catch (error) {
    console.error('Error adding estimate price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update an estimate price
 * @param {Object} data - { itemCode, priceLevel, price, validFrom, estimator, notes, originalPriceLevel, originalValidFrom }
 */
async function updateEstimatePrice(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const {
      itemCode,
      priceLevel,
      price,
      validFrom,
      estimator,
      notes,
      originalPriceLevel,
      originalValidFrom
    } = data;

    const pricesTable = qualifyTable('Prices', dbConfig);
    const dbName = dbConfig.database;

    // Check if optional columns exist
    const checkOptionalColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes')
    `);

    const hasEstimator = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Estimator');
    const hasNotes = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Notes');

    // Build update query based on available columns
    const setClause = ['Price = @price'];
    const request = pool.request()
      .input('itemCode', itemCode)
      .input('price', price)
      .input('originalPriceLevel', originalPriceLevel)
      .input('originalValidFrom', originalValidFrom);

    if (hasEstimator) {
      setClause.push('Estimator = @estimator');
      request.input('estimator', estimator || null);
    }

    if (hasNotes) {
      setClause.push('Notes = @notes');
      request.input('notes', notes || null);
    }

    const updateQuery = `
      UPDATE ${pricesTable}
      SET ${setClause.join(', ')}
      WHERE PriceCode = @itemCode
        AND PriceLevel = @originalPriceLevel
        AND Date = @originalValidFrom
    `;

    await request.query(updateQuery);

    console.log(`✅ Updated estimate price for ${itemCode}, Level ${priceLevel}`);

    return { success: true, message: 'Estimate price updated successfully' };

  } catch (error) {
    console.error('Error updating estimate price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete an estimate price
 * @param {string} priceCode - Item code
 * @param {number} priceLevel - Price level
 * @param {string} validFrom - Valid from date
 */
async function deleteEstimatePrice(priceCode, priceLevel, validFrom) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const pricesTable = qualifyTable('Prices', dbConfig);

    const deleteQuery = `
      DELETE FROM ${pricesTable}
      WHERE PriceCode = @priceCode
        AND PriceLevel = @priceLevel
        AND Date = @validFrom
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('priceLevel', priceLevel)
      .input('validFrom', validFrom)
      .query(deleteQuery);

    console.log(`✅ Deleted estimate price for ${priceCode}, Level ${priceLevel}`);

    return { success: true, message: 'Estimate price deleted successfully' };

  } catch (error) {
    console.error('Error deleting estimate price:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get items matching bulk price change criteria with price data
 *
 * For estimate prices: Returns all 5 price levels from Prices table
 * For supplier prices: Returns average price across suppliers (filtered by supplier if specified)
 *
 * @param {Object} criteria - Search criteria
 * @param {string} criteria.priceType - 'estimate' or 'supplier'
 * @param {string} criteria.costCentre - Optional cost centre filter
 * @param {string} criteria.searchTerm - Optional search term (supports multi-word search)
 * @param {Array<number>} criteria.priceLevels - Price levels to include (1-5)
 * @param {boolean} criteria.excludeZeroPrices - Whether to exclude items with zero prices
 * @param {string} criteria.supplier - Optional supplier filter (only for supplier prices)
 *
 * @returns {Promise<{success: boolean, data: Array, message?: string}>}
 */
async function getBulkPriceItems(criteria) {
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
      priceType = 'estimate',
      costCentre = '',
      searchTerm = '',
      priceLevels = [],
      excludeZeroPrices = true,
      supplier = ''
    } = criteria;

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const supplierPricesTable = qualifyTable('SuppliersPrices', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    let query;

    if (priceType === 'supplier') {
      // For supplier prices, show average price per item (filtered by supplier if specified)
      const supplierFilter = supplier ? `WHERE Supplier = @supplier` : '';
      query = `
        SELECT
          pl.PriceCode,
          pl.Description,
          pl.CostCentre,
          cc.Name AS CostCentreName,
          pc.Printout AS Unit,
          sp.AvgPrice AS Price1,
          NULL AS Price2,
          NULL AS Price3,
          NULL AS Price4,
          NULL AS Price5
        FROM ${priceListTable} pl
        LEFT JOIN ${costCentresTable} cc ON pl.CostCentre = cc.Code AND cc.Tier = 1
        LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
        LEFT JOIN (
          SELECT ItemCode, AVG(Price) AS AvgPrice
          FROM ${supplierPricesTable}
          ${supplierFilter}
          GROUP BY ItemCode
        ) sp ON pl.PriceCode = sp.ItemCode
        WHERE pl.Archived = 0
      `;
    } else {
      // Build query to get all items with all 5 estimate price levels
      query = `
        SELECT
          pl.PriceCode,
          pl.Description,
          pl.CostCentre,
          cc.Name AS CostCentreName,
          pc.Printout AS Unit,
          p1.Price AS Price1,
          p2.Price AS Price2,
          p3.Price AS Price3,
          p4.Price AS Price4,
          p5.Price AS Price5
        FROM ${priceListTable} pl
        LEFT JOIN ${costCentresTable} cc ON pl.CostCentre = cc.Code AND cc.Tier = 1
        LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
        LEFT JOIN (
          SELECT PriceCode, MAX(Price) AS Price
          FROM ${pricesTable}
          WHERE PriceLevel = 1
          GROUP BY PriceCode
        ) p1 ON pl.PriceCode = p1.PriceCode
        LEFT JOIN (
          SELECT PriceCode, MAX(Price) AS Price
          FROM ${pricesTable}
          WHERE PriceLevel = 2
          GROUP BY PriceCode
        ) p2 ON pl.PriceCode = p2.PriceCode
        LEFT JOIN (
          SELECT PriceCode, MAX(Price) AS Price
          FROM ${pricesTable}
          WHERE PriceLevel = 3
          GROUP BY PriceCode
        ) p3 ON pl.PriceCode = p3.PriceCode
        LEFT JOIN (
          SELECT PriceCode, MAX(Price) AS Price
          FROM ${pricesTable}
          WHERE PriceLevel = 4
          GROUP BY PriceCode
        ) p4 ON pl.PriceCode = p4.PriceCode
        LEFT JOIN (
          SELECT PriceCode, MAX(Price) AS Price
          FROM ${pricesTable}
          WHERE PriceLevel = 5
          GROUP BY PriceCode
        ) p5 ON pl.PriceCode = p5.PriceCode
        WHERE pl.Archived = 0
      `;
    }

    const request = pool.request();

    // Add supplier parameter if filtering supplier prices
    if (priceType === 'supplier' && supplier) {
      request.input('supplier', supplier);
    }

    // Add cost centre filter
    if (costCentre) {
      query += ` AND pl.CostCentre = @costCentre`;
      request.input('costCentre', costCentre);
    }

    // Add search term filter
    if (searchTerm && searchTerm.trim() !== '') {
      const words = searchTerm.trim().split(/\s+/).filter(w => w.length > 0);
      words.forEach((word, index) => {
        query += ` AND (pl.PriceCode LIKE @searchPattern${index} OR pl.Description LIKE @searchPattern${index})`;
        request.input(`searchPattern${index}`, `%${word}%`);
      });
    }

    // Add filter to exclude zero prices for selected levels
    if (excludeZeroPrices && priceLevels.length > 0) {
      const priceConditions = priceLevels.map(level => `COALESCE(p${level}.Price, 0) > 0`).join(' OR ');
      query += ` AND (${priceConditions})`;
    }

    query += `
      ORDER BY
        ISNULL(cc.SortOrder, 999999),
        pl.CostCentre,
        pl.PriceCode
    `;

    const result = await request.query(query);

    console.log(`✅ Found ${result.recordset.length} items matching bulk change criteria`);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting bulk price items:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Apply bulk price changes by inserting/updating price records
 *
 * For estimate prices: Updates Prices table with new price history records
 * For supplier prices: Updates SuppliersPrices table for all matching suppliers
 *
 * NOTE: This function checks for existing price records on the same date and updates them
 * rather than creating duplicates. Optional columns (Estimator, Notes, CreatedDate) are
 * only included if they exist in the database schema.
 *
 * @param {Object} data - Price change data
 * @param {string} data.priceType - 'estimate' or 'supplier'
 * @param {Array<Object>} data.changes - Array of { PriceCode, Level, NewPrice, CurrentPrice }
 * @param {string} data.validFrom - Effective date for price changes
 * @param {string} data.estimator - Optional estimator name/initials
 * @param {string} data.notes - Optional notes about the price change
 *
 * @returns {Promise<{success: boolean, data?: {successCount: number, errorCount: number, errors: Array}, message?: string}>}
 */
async function applyBulkPriceChanges(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const { priceType = 'estimate', changes, validFrom, estimator, notes, supplier } = data;

    if (!changes || changes.length === 0) {
      return { success: false, message: 'No changes to apply' };
    }

    // Route to appropriate handler based on price type
    if (priceType === 'supplier') {
      return await applyBulkSupplierPriceChanges(data, pool, dbConfig);
    } else {
      return await applyBulkEstimatePriceChanges(data, pool, dbConfig);
    }

  } catch (error) {
    console.error('Error applying bulk price changes:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Apply bulk estimate price changes (Prices table)
 */
async function applyBulkEstimatePriceChanges(data, pool, dbConfig) {
  try {
    const { changes, validFrom, estimator, notes } = data;

    const pricesTable = qualifyTable('Prices', dbConfig);
    const dbName = dbConfig.database;

    // Check if optional columns exist
    const checkOptionalColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes', 'CreatedDate')
    `);

    const hasEstimator = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Estimator');
    const hasNotes = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Notes');
    const hasCreatedDate = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'CreatedDate');

    // Build column lists for INSERT
    const columns = ['PriceCode', 'PriceLevel', 'Price', 'Date'];
    if (hasEstimator) columns.push('Estimator');
    if (hasNotes) columns.push('Notes');
    if (hasCreatedDate) columns.push('CreatedDate');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each change
    for (const change of changes) {
      try {
        const { PriceCode, Level, NewPrice } = change;

        // Check if a price already exists for this code/level/date
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM ${pricesTable}
          WHERE PriceCode = @priceCode
            AND PriceLevel = @priceLevel
            AND Date = @validFrom
        `;

        const checkResult = await pool.request()
          .input('priceCode', PriceCode)
          .input('priceLevel', Level)
          .input('validFrom', validFrom)
          .query(checkQuery);

        if (checkResult.recordset[0].count > 0) {
          // Update existing price
          const setClause = ['Price = @price'];
          const request = pool.request()
            .input('priceCode', PriceCode)
            .input('priceLevel', Level)
            .input('validFrom', validFrom)
            .input('price', NewPrice);

          if (hasEstimator) {
            setClause.push('Estimator = @estimator');
            request.input('estimator', estimator || null);
          }

          if (hasNotes) {
            setClause.push('Notes = @notes');
            request.input('notes', notes || null);
          }

          const updateQuery = `
            UPDATE ${pricesTable}
            SET ${setClause.join(', ')}
            WHERE PriceCode = @priceCode
              AND PriceLevel = @priceLevel
              AND Date = @validFrom
          `;

          await request.query(updateQuery);
        } else {
          // Insert new price record
          const values = ['@priceCode', '@priceLevel', '@price', '@validFrom'];
          const request = pool.request()
            .input('priceCode', PriceCode)
            .input('priceLevel', Level)
            .input('price', NewPrice)
            .input('validFrom', validFrom);

          if (hasEstimator) {
            values.push('@estimator');
            request.input('estimator', estimator || null);
          }

          if (hasNotes) {
            values.push('@notes');
            request.input('notes', notes || null);
          }

          if (hasCreatedDate) {
            values.push('GETDATE()');
          }

          const insertQuery = `
            INSERT INTO ${pricesTable} (${columns.join(', ')})
            VALUES (${values.join(', ')})
          `;

          await request.query(insertQuery);
        }

        successCount++;

      } catch (error) {
        console.error(`Error updating price for ${change.PriceCode} Level ${change.Level}:`, error);
        errorCount++;
        errors.push({
          item: change.PriceCode,
          level: change.Level,
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk estimate price change complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: true,
      data: {
        successCount,
        errorCount,
        errors
      },
      message: errorCount > 0
        ? `Updated ${successCount} estimate prices with ${errorCount} errors`
        : `Successfully updated ${successCount} estimate prices`
    };

  } catch (error) {
    console.error('Error applying bulk estimate price changes:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Apply bulk supplier price changes (SuppliersPrices table)
 */
async function applyBulkSupplierPriceChanges(data, pool, dbConfig) {
  try {
    const { changes, validFrom, notes, supplier: supplierFilter } = data;

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each change
    for (const change of changes) {
      try {
        const { PriceCode, NewPrice } = change;

        // If a specific supplier was filtered, only update that supplier's prices
        // Otherwise, update all suppliers who have a price record for this item
        let updateQuery;
        const request = pool.request()
          .input('itemCode', PriceCode)
          .input('price', NewPrice)
          .input('suppDate', validFrom);

        if (notes) {
          request.input('comments', notes);
        }

        if (supplierFilter) {
          // Update only the specified supplier
          updateQuery = `
            UPDATE ${suppliersPricesTable}
            SET
              Price = @price,
              Supp_Date = @suppDate
              ${notes ? ', Comments = @comments' : ''}
            WHERE ItemCode = @itemCode
              AND Supplier = @supplier
          `;
          request.input('supplier', supplierFilter);
        } else {
          // Update all suppliers for this item
          updateQuery = `
            UPDATE ${suppliersPricesTable}
            SET
              Price = @price,
              Supp_Date = @suppDate
              ${notes ? ', Comments = @comments' : ''}
            WHERE ItemCode = @itemCode
          `;
        }

        const result = await request.query(updateQuery);

        if (result.rowsAffected[0] > 0) {
          successCount += result.rowsAffected[0];
          console.log(`✅ Updated ${result.rowsAffected[0]} supplier price(s) for ${PriceCode}`);
        } else {
          console.log(`⚠️  No supplier prices found to update for ${PriceCode}`);
        }

      } catch (error) {
        console.error(`Error updating supplier price for ${change.PriceCode}:`, error);
        errorCount++;
        errors.push({
          item: change.PriceCode,
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk supplier price change complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: true,
      data: {
        successCount,
        errorCount,
        errors
      },
      message: errorCount > 0
        ? `Updated ${successCount} supplier prices with ${errorCount} errors`
        : `Successfully updated ${successCount} supplier prices`
    };

  } catch (error) {
    console.error('Error applying bulk supplier price changes:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Import catalogue items from external file
 * @param {Object} data - Import data
 * @param {string} data.importType - 'supplierPrices' | 'catalogueItems' | 'estimatePrices'
 * @param {string} data.supplier - Supplier code (for supplierPrices)
 * @param {string} data.priceLevel - Price level 1-5 (for estimatePrices)
 * @param {Array<Object>} data.items - Array of items to import
 * @param {boolean} data.createNewItems - Whether to create new catalogue items
 * @param {boolean} data.updateDescriptions - Whether to update existing descriptions
 * @param {boolean} data.updatePrices - Whether to update existing prices
 */
async function importItems(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const {
      importType,
      supplier,
      priceLevel,
      items = [],
      createNewItems = true,
      updateDescriptions = false,
      updatePrices = true
    } = data;

    if (!items || items.length === 0) {
      return { success: false, message: 'No items to import' };
    }

    console.log(`🔄 Starting import: ${importType}, ${items.length} items`);

    // Route to appropriate import handler
    if (importType === 'supplierPrices') {
      return await importSupplierPrices(data, pool, dbConfig);
    } else if (importType === 'catalogueItems') {
      return await importCatalogueItems(data, pool, dbConfig);
    } else if (importType === 'estimatePrices') {
      return await importEstimatePrices(data, pool, dbConfig);
    } else {
      return { success: false, message: `Unknown import type: ${importType}` };
    }

  } catch (error) {
    console.error('Error importing items:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Import supplier prices to SuppliersPrices table
 */
async function importSupplierPrices(data, pool, dbConfig) {
  try {
    const { supplier, items, createNewItems, updatePrices } = data;

    if (!supplier) {
      return { success: false, message: 'Supplier is required for supplier price import' };
    }

    const suppliersPricesTable = qualifyTable('SuppliersPrices', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        const {
          reference,
          description,
          linkTo,
          price,
          unit,
          costCentre,
          validFrom,
          comments
        } = item;

        // Determine the catalogue item code (linkTo takes priority)
        const catalogueItemCode = linkTo || reference;

        if (!catalogueItemCode) {
          errors.push({ reference, error: 'No catalogue item code specified' });
          skippedCount++;
          continue;
        }

        // Check if the catalogue item exists in PriceList
        const checkCatalogueQuery = `
          SELECT COUNT(*) as count
          FROM ${priceListTable}
          WHERE PriceCode = @catalogueItemCode
        `;

        const catalogueCheck = await pool.request()
          .input('catalogueItemCode', catalogueItemCode)
          .query(checkCatalogueQuery);

        const catalogueExists = catalogueCheck.recordset[0].count > 0;

        // If catalogue item doesn't exist and we can't create new items, skip
        if (!catalogueExists && !createNewItems) {
          errors.push({ reference, error: 'Catalogue item not found and createNewItems is false' });
          skippedCount++;
          continue;
        }

        // Create catalogue item if needed
        if (!catalogueExists && createNewItems) {
          // Get PerCode from unit
          let perCode = null;
          if (unit) {
            const perCodeQuery = `SELECT Code FROM ${perCodesTable} WHERE Printout = @unit`;
            const perCodeResult = await pool.request()
              .input('unit', unit)
              .query(perCodeQuery);

            if (perCodeResult.recordset.length > 0) {
              perCode = perCodeResult.recordset[0].Code;
            }
          }

          const insertCatalogueQuery = `
            INSERT INTO ${priceListTable} (PriceCode, Description, CostCentre, PerCode, Archived)
            VALUES (@priceCode, @description, @costCentre, @perCode, 0)
          `;

          await pool.request()
            .input('priceCode', catalogueItemCode)
            .input('description', description || reference)
            .input('costCentre', costCentre || '')
            .input('perCode', perCode)
            .query(insertCatalogueQuery);

          createdCount++;
          console.log(`✅ Created catalogue item: ${catalogueItemCode}`);
        }

        // Check if supplier price record exists
        const checkSupplierPriceQuery = `
          SELECT COUNT(*) as count
          FROM ${suppliersPricesTable}
          WHERE Supplier = @supplier AND ItemCode = @itemCode
        `;

        const supplierPriceCheck = await pool.request()
          .input('supplier', supplier)
          .input('itemCode', catalogueItemCode)
          .query(checkSupplierPriceQuery);

        const supplierPriceExists = supplierPriceCheck.recordset[0].count > 0;

        if (supplierPriceExists) {
          // Update existing supplier price
          if (updatePrices) {
            const updateQuery = `
              UPDATE ${suppliersPricesTable}
              SET
                Price = @price,
                Supp_Date = @suppDate,
                Reference = @reference,
                Comments = @comments
              WHERE Supplier = @supplier AND ItemCode = @itemCode
            `;

            await pool.request()
              .input('supplier', supplier)
              .input('itemCode', catalogueItemCode)
              .input('price', price || 0)
              .input('suppDate', validFrom || new Date())
              .input('reference', reference || '')
              .input('comments', comments || '')
              .query(updateQuery);

            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          // Insert new supplier price
          const insertQuery = `
            INSERT INTO ${suppliersPricesTable} (Supplier, ItemCode, Price, Supp_Date, Reference, Comments)
            VALUES (@supplier, @itemCode, @price, @suppDate, @reference, @comments)
          `;

          await pool.request()
            .input('supplier', supplier)
            .input('itemCode', catalogueItemCode)
            .input('price', price || 0)
            .input('suppDate', validFrom || new Date())
            .input('reference', reference || '')
            .input('comments', comments || '')
            .query(insertQuery);

          successCount++;
        }

      } catch (error) {
        console.error(`Error importing supplier price for ${item.reference}:`, error);
        errors.push({
          reference: item.reference,
          error: error.message
        });
      }
    }

    const totalSuccess = successCount + updatedCount + createdCount;

    console.log(`✅ Supplier price import complete: ${totalSuccess} success, ${errors.length} errors`);

    return {
      success: true,
      data: {
        successCount: totalSuccess,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors
      },
      message: errors.length > 0
        ? `Imported ${totalSuccess} supplier prices with ${errors.length} errors`
        : `Successfully imported ${totalSuccess} supplier prices`
    };

  } catch (error) {
    console.error('Error importing supplier prices:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Import catalogue items to PriceList table
 */
async function importCatalogueItems(data, pool, dbConfig) {
  try {
    const { items, createNewItems, updateDescriptions, updatePrices } = data;

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);

    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        const {
          reference,
          description,
          unit,
          costCentre,
          price
        } = item;

        if (!reference) {
          errors.push({ reference: 'N/A', error: 'No price code specified' });
          skippedCount++;
          continue;
        }

        // Get PerCode from unit
        let perCode = null;
        if (unit) {
          const perCodeQuery = `SELECT Code FROM ${perCodesTable} WHERE Printout = @unit`;
          const perCodeResult = await pool.request()
            .input('unit', unit)
            .query(perCodeQuery);

          if (perCodeResult.recordset.length > 0) {
            perCode = perCodeResult.recordset[0].Code;
          }
        }

        // Check if item exists
        const checkQuery = `
          SELECT COUNT(*) as count
          FROM ${priceListTable}
          WHERE PriceCode = @priceCode
        `;

        const checkResult = await pool.request()
          .input('priceCode', reference)
          .query(checkQuery);

        const itemExists = checkResult.recordset[0].count > 0;

        if (itemExists) {
          // Update existing item
          if (updateDescriptions) {
            const updateQuery = `
              UPDATE ${priceListTable}
              SET
                Description = @description,
                CostCentre = @costCentre,
                PerCode = @perCode
              WHERE PriceCode = @priceCode
            `;

            await pool.request()
              .input('priceCode', reference)
              .input('description', description || reference)
              .input('costCentre', costCentre || '')
              .input('perCode', perCode)
              .query(updateQuery);

            updatedCount++;
          }

          // Update price if specified and updatePrices is true
          if (price != null && updatePrices) {
            // Check if Price1 exists
            const checkPriceQuery = `
              SELECT COUNT(*) as count
              FROM ${pricesTable}
              WHERE PriceCode = @priceCode AND PriceLevel = 1
            `;

            const priceCheck = await pool.request()
              .input('priceCode', reference)
              .query(checkPriceQuery);

            if (priceCheck.recordset[0].count > 0) {
              // Update
              await pool.request()
                .input('priceCode', reference)
                .input('price', price)
                .query(`UPDATE ${pricesTable} SET Price = @price WHERE PriceCode = @priceCode AND PriceLevel = 1`);
            } else {
              // Insert
              await pool.request()
                .input('priceCode', reference)
                .input('price', price)
                .query(`INSERT INTO ${pricesTable} (PriceCode, PriceLevel, Price) VALUES (@priceCode, 1, @price)`);
            }
          }

          if (!updateDescriptions) {
            skippedCount++;
          }

        } else if (createNewItems) {
          // Create new item
          const insertQuery = `
            INSERT INTO ${priceListTable} (PriceCode, Description, CostCentre, PerCode, Archived)
            VALUES (@priceCode, @description, @costCentre, @perCode, 0)
          `;

          await pool.request()
            .input('priceCode', reference)
            .input('description', description || reference)
            .input('costCentre', costCentre || '')
            .input('perCode', perCode)
            .query(insertQuery);

          createdCount++;

          // Insert price if specified
          if (price != null) {
            await pool.request()
              .input('priceCode', reference)
              .input('price', price)
              .query(`INSERT INTO ${pricesTable} (PriceCode, PriceLevel, Price) VALUES (@priceCode, 1, @price)`);
          }

          console.log(`✅ Created catalogue item: ${reference}`);
        } else {
          skippedCount++;
        }

        successCount++;

      } catch (error) {
        console.error(`Error importing catalogue item ${item.reference}:`, error);
        errors.push({
          reference: item.reference,
          error: error.message
        });
      }
    }

    console.log(`✅ Catalogue item import complete: ${successCount} success, ${errors.length} errors`);

    return {
      success: true,
      data: {
        successCount,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors
      },
      message: errors.length > 0
        ? `Imported ${successCount} catalogue items with ${errors.length} errors`
        : `Successfully imported ${successCount} catalogue items`
    };

  } catch (error) {
    console.error('Error importing catalogue items:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Import estimate prices to Prices table
 */
async function importEstimatePrices(data, pool, dbConfig) {
  try {
    const { items, priceLevel, createNewItems, updatePrices } = data;

    if (!priceLevel) {
      return { success: false, message: 'Price level is required for estimate price import' };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const dbName = dbConfig.database;

    // Check if optional columns exist in Prices table
    const checkOptionalColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Prices'
        AND TABLE_SCHEMA = 'dbo'
        AND COLUMN_NAME IN ('Estimator', 'Notes', 'CreatedDate')
    `);

    const hasEstimator = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Estimator');
    const hasNotes = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'Notes');
    const hasCreatedDate = checkOptionalColumns.recordset.some(c => c.COLUMN_NAME === 'CreatedDate');

    let successCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of items) {
      try {
        const {
          reference,
          description,
          linkTo,
          price,
          unit,
          costCentre,
          validFrom,
          comments
        } = item;

        // Determine the catalogue item code (linkTo takes priority)
        const catalogueItemCode = linkTo || reference;

        if (!catalogueItemCode) {
          errors.push({ reference, error: 'No catalogue item code specified' });
          skippedCount++;
          continue;
        }

        // Check if the catalogue item exists
        const checkCatalogueQuery = `
          SELECT COUNT(*) as count
          FROM ${priceListTable}
          WHERE PriceCode = @catalogueItemCode
        `;

        const catalogueCheck = await pool.request()
          .input('catalogueItemCode', catalogueItemCode)
          .query(checkCatalogueQuery);

        const catalogueExists = catalogueCheck.recordset[0].count > 0;

        // Create catalogue item if needed
        if (!catalogueExists && createNewItems) {
          // Get PerCode from unit
          let perCode = null;
          if (unit) {
            const perCodeQuery = `SELECT Code FROM ${perCodesTable} WHERE Printout = @unit`;
            const perCodeResult = await pool.request()
              .input('unit', unit)
              .query(perCodeQuery);

            if (perCodeResult.recordset.length > 0) {
              perCode = perCodeResult.recordset[0].Code;
            }
          }

          const insertCatalogueQuery = `
            INSERT INTO ${priceListTable} (PriceCode, Description, CostCentre, PerCode, Archived)
            VALUES (@priceCode, @description, @costCentre, @perCode, 0)
          `;

          await pool.request()
            .input('priceCode', catalogueItemCode)
            .input('description', description || reference)
            .input('costCentre', costCentre || '')
            .input('perCode', perCode)
            .query(insertCatalogueQuery);

          createdCount++;
          console.log(`✅ Created catalogue item: ${catalogueItemCode}`);
        } else if (!catalogueExists) {
          errors.push({ reference, error: 'Catalogue item not found and createNewItems is false' });
          skippedCount++;
          continue;
        }

        // Check if price record exists for this level and date
        const effectiveDate = validFrom || new Date().toISOString().split('T')[0];
        const checkPriceQuery = `
          SELECT COUNT(*) as count
          FROM ${pricesTable}
          WHERE PriceCode = @priceCode
            AND PriceLevel = @priceLevel
            AND Date = @validFrom
        `;

        const priceCheck = await pool.request()
          .input('priceCode', catalogueItemCode)
          .input('priceLevel', parseInt(priceLevel))
          .input('validFrom', effectiveDate)
          .query(checkPriceQuery);

        const priceExists = priceCheck.recordset[0].count > 0;

        if (priceExists && updatePrices) {
          // Update existing price
          const setClause = ['Price = @price'];
          const request = pool.request()
            .input('priceCode', catalogueItemCode)
            .input('priceLevel', parseInt(priceLevel))
            .input('validFrom', effectiveDate)
            .input('price', price || 0);

          if (hasNotes && comments) {
            setClause.push('Notes = @notes');
            request.input('notes', comments);
          }

          const updateQuery = `
            UPDATE ${pricesTable}
            SET ${setClause.join(', ')}
            WHERE PriceCode = @priceCode
              AND PriceLevel = @priceLevel
              AND Date = @validFrom
          `;

          await request.query(updateQuery);
          updatedCount++;

        } else if (!priceExists) {
          // Insert new price
          const columns = ['PriceCode', 'PriceLevel', 'Price', 'Date'];
          const values = ['@priceCode', '@priceLevel', '@price', '@validFrom'];
          const request = pool.request()
            .input('priceCode', catalogueItemCode)
            .input('priceLevel', parseInt(priceLevel))
            .input('price', price || 0)
            .input('validFrom', effectiveDate);

          if (hasNotes && comments) {
            columns.push('Notes');
            values.push('@notes');
            request.input('notes', comments);
          }

          if (hasCreatedDate) {
            columns.push('CreatedDate');
            values.push('GETDATE()');
          }

          const insertQuery = `
            INSERT INTO ${pricesTable} (${columns.join(', ')})
            VALUES (${values.join(', ')})
          `;

          await request.query(insertQuery);
          successCount++;

        } else {
          skippedCount++;
        }

      } catch (error) {
        console.error(`Error importing estimate price for ${item.reference}:`, error);
        errors.push({
          reference: item.reference,
          error: error.message
        });
      }
    }

    const totalSuccess = successCount + updatedCount + createdCount;

    console.log(`✅ Estimate price import complete: ${totalSuccess} success, ${errors.length} errors`);

    return {
      success: true,
      data: {
        successCount: totalSuccess,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
        errors
      },
      message: errors.length > 0
        ? `Imported ${totalSuccess} estimate prices with ${errors.length} errors`
        : `Successfully imported ${totalSuccess} estimate prices`
    };

  } catch (error) {
    console.error('Error importing estimate prices:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get item usage - where the item is used in recipes, BOQ, and purchase orders
 * @param {Object} event - IPC event
 * @param {string} priceCode - Item code to check usage for
 */
async function getItemUsage(event, priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      throw new Error('No database configuration found');
    }

    const recipeTable = qualifyTable('Recipe', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const billTable = qualifyTable('Bill', dbConfig);
    const orderDetailsTable = qualifyTable('OrderDetails', dbConfig);

    // 1. Find where this item is used as an ingredient in recipes
    const recipeUsageQuery = `
      SELECT
        R.Main_Item AS RecipeCode,
        PL.Description AS RecipeName,
        R.Quantity,
        R.Formula
      FROM ${recipeTable} R
      INNER JOIN ${priceListTable} PL ON R.Main_Item = PL.PriceCode
      WHERE R.Sub_Item = @priceCode
      ORDER BY PL.Description
    `;

    const recipeUsageResult = await pool.request()
      .input('priceCode', priceCode)
      .query(recipeUsageQuery);

    // 2. Find where this item is used in Bill of Quantities
    const boqUsageQuery = `
      SELECT
        B.JobNo,
        B.CostCentre,
        B.BLoad,
        B.LineNumber,
        B.Quantity,
        B.UnitPrice
      FROM ${billTable} B
      WHERE B.ItemCode = @priceCode
      ORDER BY B.JobNo, B.CostCentre, B.BLoad, B.LineNumber
    `;

    const boqUsageResult = await pool.request()
      .input('priceCode', priceCode)
      .query(boqUsageQuery);

    // 3. Find where this item is in purchase orders
    const poUsageQuery = `
      SELECT
        OD.JobNo,
        OD.CostCentre,
        OD.BLoad,
        OD.Counter,
        OD.Description,
        OD.Quantity,
        OD.QtyReceived,
        OD.LinePrice,
        OD.Invoice
      FROM ${orderDetailsTable} OD
      WHERE OD.Code = @priceCode
      ORDER BY OD.JobNo, OD.CostCentre, OD.BLoad, OD.Counter
    `;

    const poUsageResult = await pool.request()
      .input('priceCode', priceCode)
      .query(poUsageQuery);

    return {
      success: true,
      data: {
        recipes: recipeUsageResult.recordset || [],
        boq: boqUsageResult.recordset || [],
        purchaseOrders: poUsageResult.recordset || []
      }
    };
  } catch (error) {
    console.error('Error getting item usage:', error);
    return {
      success: false,
      error: error.message
    };
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
  deleteRecipeComponent,
  getEstimatePrices,
  addEstimatePrice,
  updateEstimatePrice,
  deleteEstimatePrice,
  getBulkPriceItems,
  applyBulkPriceChanges,
  importItems,
  getItemUsage
};
