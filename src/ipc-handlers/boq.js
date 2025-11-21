const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credStore = require('../database/credentials-store');

/**
 * BOQ (Bill of Quantities) IPC Handlers
 * Handles all BOQ operations including item management, pricing, and reporting
 */

/**
 * Get Bill of Quantities for a job
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre?, bLoad? }
 */
async function getJobBill(event, params) {
  try {
    const { jobNo, costCentre, bLoad } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    // Get database configuration
    const dbConfig = credStore.getCredentials();
    if (!dbConfig) {
      throw new Error('Database configuration not available');
    }

    // Build fully-qualified table names
    const billTable = qualifyTable('Bill', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);

    console.log('📊 BOQ: Loading bill for job:', jobNo, 'CC:', costCentre, 'Load:', bLoad);

    // Check if Supplier column exists in Bill table
    // Bill table is in the job database, not the system database
    const jobDbName = dbConfig.jobDatabase || 'CROWNEJOB';
    let hasSupplierColumn = false;
    try {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM [${jobDbName}].INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Bill'
          AND COLUMN_NAME = 'Supplier'
          AND TABLE_SCHEMA = 'dbo'
      `);
      hasSupplierColumn = checkColumn.recordset.length > 0;
    } catch (err) {
      console.log('⚠️  Could not check for Supplier column, assuming it does not exist');
    }

    // Add Contacts table for supplier names
    const contactsTable = qualifyTable('Contacts', dbConfig);

    // Build SELECT and JOIN clauses based on column availability
    const supplierFields = hasSupplierColumn
      ? 'b.Supplier,\n        s.Name AS SupplierName,'
      : 'NULL AS Supplier,\n        NULL AS SupplierName,';

    const supplierJoin = hasSupplierColumn
      ? `LEFT JOIN ${contactsTable} s ON b.Supplier = s.Code AND s.Supplier = 1`
      : '';

    const query = `
      SELECT
        b.JobNo,
        b.ItemCode,
        b.CostCentre,
        cc.Name AS CostCentreName,
        cc.SubGroup,
        b.BLoad,
        b.LineNumber,
        b.Quantity,
        b.UnitPrice,
        b.XDescription AS Workup,
        ${supplierFields}
        pl.Description,
        pc.Printout AS Unit,
        pl.Recipe,
        pl.RecipeIngredient,
        pl.Archived,
        -- Calculate line total (handle percentage units specially)
        CASE
          WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
          ELSE b.Quantity * b.UnitPrice
        END AS LineTotal
      FROM ${billTable} b
      LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
      LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
      LEFT JOIN ${costCentresTable} cc ON b.CostCentre = cc.Code AND cc.Tier = 1
      ${supplierJoin}
      WHERE b.JobNo = @jobNo
        AND (@costCentre IS NULL OR b.CostCentre = @costCentre)
        AND (@bLoad IS NULL OR b.BLoad = @bLoad)
      ORDER BY ISNULL(cc.SortOrder, 999999), b.CostCentre, b.BLoad, b.LineNumber
    `;

    const request = pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .input('bLoad', bLoad || null);

    const result = await request.query(query);

    console.log('✓ BOQ: Loaded', result.recordset.length, 'items');

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting job bill:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Add a new item to the bill
 * @param {Object} event - IPC event
 * @param {Object} billItem - { JobNo, ItemCode, CostCentre, BLoad, Quantity, UnitPrice, XDescription? }
 */
async function addItem(event, billItem) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('➕ BOQ: Adding item:', billItem.ItemCode, 'to job:', billItem.JobNo);

    // Check if Supplier column exists in Bill table
    // Bill table is in the job database, not the system database
    const jobDbName = dbConfig.jobDatabase || 'CROWNEJOB';
    let hasSupplierColumn = false;
    try {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM [${jobDbName}].INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Bill'
          AND COLUMN_NAME = 'Supplier'
          AND TABLE_SCHEMA = 'dbo'
      `);
      hasSupplierColumn = checkColumn.recordset.length > 0;
    } catch (err) {
      console.log('⚠️  Could not check for Supplier column, assuming it does not exist');
    }

    // Get next line number for this cost centre and load
    const maxLineQuery = `
      SELECT ISNULL(MAX(LineNumber), 0) AS MaxLine
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
    `;

    const maxLineResult = await pool.request()
      .input('jobNo', billItem.JobNo)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .query(maxLineQuery);

    const nextLineNumber = maxLineResult.recordset[0].MaxLine + 1;

    // Build INSERT query based on whether Supplier column exists
    const columns = hasSupplierColumn
      ? 'JobNo, ItemCode, CostCentre, BLoad, LineNumber, Quantity, UnitPrice, XDescription, Supplier'
      : 'JobNo, ItemCode, CostCentre, BLoad, LineNumber, Quantity, UnitPrice, XDescription';

    const values = hasSupplierColumn
      ? '@jobNo, @itemCode, @costCentre, @bLoad, @lineNumber, @quantity, @unitPrice, @xDescription, @supplier'
      : '@jobNo, @itemCode, @costCentre, @bLoad, @lineNumber, @quantity, @unitPrice, @xDescription';

    const insertQuery = `
      INSERT INTO ${billTable} (${columns})
      VALUES (${values})
    `;

    const request = pool.request()
      .input('jobNo', billItem.JobNo)
      .input('itemCode', billItem.ItemCode)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .input('lineNumber', nextLineNumber)
      .input('quantity', billItem.Quantity || 1)
      .input('unitPrice', billItem.UnitPrice || 0)
      .input('xDescription', billItem.XDescription || null);

    if (hasSupplierColumn) {
      request.input('supplier', billItem.Supplier || null);
    }

    await request.query(insertQuery);

    console.log('✓ BOQ: Item added successfully at line', nextLineNumber);

    return {
      success: true,
      lineNumber: nextLineNumber,
      message: 'Item added successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error adding item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update an existing bill item
 * @param {Object} event - IPC event
 * @param {Object} billItem - { JobNo, CostCentre, BLoad, LineNumber, newBLoad?, Quantity?, UnitPrice?, XDescription?, Supplier? }
 */
async function updateItem(event, billItem) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('✏️ BOQ: Updating item at line', billItem.LineNumber);

    // Check if Supplier column exists in Bill table
    // Bill table is in the job database, not the system database
    const jobDbName = dbConfig.jobDatabase || 'CROWNEJOB';
    let hasSupplierColumn = false;
    try {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM [${jobDbName}].INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Bill'
          AND COLUMN_NAME = 'Supplier'
          AND TABLE_SCHEMA = 'dbo'
      `);
      hasSupplierColumn = checkColumn.recordset.length > 0;
    } catch (err) {
      console.log('⚠️  Could not check for Supplier column, assuming it does not exist');
    }

    // Special handling if BLoad is being changed (moving item to different load)
    // Since BLoad is part of the primary key, we need to use DELETE + INSERT
    // Ensure both values are numbers for proper comparison
    const currentBLoad = parseInt(billItem.BLoad) || 0;
    const newBLoad = billItem.newBLoad !== undefined ? parseInt(billItem.newBLoad) : undefined;

    if (newBLoad !== undefined && newBLoad !== currentBLoad) {
      console.log(`🔄 BOQ: Moving item from Load ${currentBLoad} to Load ${newBLoad}`);

      // First, get the current record to preserve all fields
      const selectQuery = `
        SELECT *
        FROM ${billTable}
        WHERE JobNo = @jobNo
          AND CostCentre = @costCentre
          AND BLoad = @bLoad
          AND LineNumber = @lineNumber
      `;

      const selectResult = await pool.request()
        .input('jobNo', billItem.JobNo)
        .input('costCentre', billItem.CostCentre)
        .input('bLoad', billItem.BLoad)
        .input('lineNumber', billItem.LineNumber)
        .query(selectQuery);

      if (selectResult.recordset.length === 0) {
        throw new Error('Item not found');
      }

      const currentRecord = selectResult.recordset[0];

      // Delete the old record
      const deleteQuery = `
        DELETE FROM ${billTable}
        WHERE JobNo = @jobNo
          AND CostCentre = @costCentre
          AND BLoad = @bLoad
          AND LineNumber = @lineNumber
      `;

      await pool.request()
        .input('jobNo', billItem.JobNo)
        .input('costCentre', billItem.CostCentre)
        .input('bLoad', billItem.BLoad)
        .input('lineNumber', billItem.LineNumber)
        .query(deleteQuery);

      // Insert new record with updated BLoad and other fields
      const insertRequest = pool.request()
        .input('jobNo', billItem.JobNo)
        .input('costCentre', billItem.CostCentre)
        .input('newBLoad', newBLoad)
        .input('lineNumber', billItem.LineNumber)
        .input('itemCode', currentRecord.ItemCode)
        .input('quantity', billItem.Quantity !== undefined ? billItem.Quantity : currentRecord.Quantity)
        .input('unitPrice', billItem.UnitPrice !== undefined ? billItem.UnitPrice : currentRecord.UnitPrice)
        .input('xDescription', billItem.XDescription !== undefined ? billItem.XDescription : currentRecord.XDescription);

      let insertQuery;
      if (hasSupplierColumn) {
        insertRequest.input('supplier', billItem.Supplier !== undefined ? billItem.Supplier : currentRecord.Supplier);
        insertQuery = `
          INSERT INTO ${billTable} (JobNo, CostCentre, BLoad, LineNumber, ItemCode, Quantity, UnitPrice, XDescription, Supplier)
          VALUES (@jobNo, @costCentre, @newBLoad, @lineNumber, @itemCode, @quantity, @unitPrice, @xDescription, @supplier)
        `;
      } else {
        insertQuery = `
          INSERT INTO ${billTable} (JobNo, CostCentre, BLoad, LineNumber, ItemCode, Quantity, UnitPrice, XDescription)
          VALUES (@jobNo, @costCentre, @newBLoad, @lineNumber, @itemCode, @quantity, @unitPrice, @xDescription)
        `;
      }

      await insertRequest.query(insertQuery);

      console.log('✓ BOQ: Item moved to new load successfully');

      return {
        success: true,
        rowsAffected: 1,
        message: 'Item moved to new load successfully'
      };
    }

    // Standard update (not changing BLoad)
    const updates = [];
    const request = pool.request()
      .input('jobNo', billItem.JobNo)
      .input('costCentre', billItem.CostCentre)
      .input('bLoad', billItem.BLoad)
      .input('lineNumber', billItem.LineNumber);

    if (billItem.Quantity !== undefined) {
      updates.push('Quantity = @quantity');
      request.input('quantity', billItem.Quantity);
    }

    if (billItem.UnitPrice !== undefined) {
      updates.push('UnitPrice = @unitPrice');
      request.input('unitPrice', billItem.UnitPrice);
    }

    if (billItem.XDescription !== undefined) {
      updates.push('XDescription = @xDescription');
      request.input('xDescription', billItem.XDescription);
    }

    if (billItem.Supplier !== undefined && hasSupplierColumn) {
      updates.push('Supplier = @supplier');
      request.input('supplier', billItem.Supplier);
    }

    if (updates.length === 0) {
      return {
        success: true,
        message: 'No fields to update'
      };
    }

    const updateQuery = `
      UPDATE ${billTable}
      SET ${updates.join(', ')}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
        AND LineNumber = @lineNumber
    `;

    const result = await request.query(updateQuery);

    console.log('✓ BOQ: Item updated successfully');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: 'Item updated successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error updating item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete a bill item
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre, bLoad, lineNumber }
 */
async function deleteItem(event, params) {
  try {
    const { jobNo, costCentre, bLoad, lineNumber } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('🗑️ BOQ: Deleting item at line', lineNumber);

    const deleteQuery = `
      DELETE FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
        AND BLoad = @bLoad
        AND LineNumber = @lineNumber
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre)
      .input('bLoad', bLoad)
      .input('lineNumber', lineNumber)
      .query(deleteQuery);

    console.log('✓ BOQ: Item deleted successfully');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: 'Item deleted successfully'
    };
  } catch (error) {
    console.error('✗ BOQ: Error deleting item:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get cost centres with budget indicators
 * Returns cost centres marked BOLD if they have quantities
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo }
 */
async function getCostCentresWithBudgets(event, params) {
  try {
    const { jobNo } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);
    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const perCodesTable = qualifyTable('PerCodes', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);

    console.log('📋 BOQ: Getting cost centres with budgets for job:', jobNo);

    const query = `
      SELECT
        cc.Code,
        cc.Name,
        cc.SubGroup,
        cc.SortOrder,
        CASE WHEN b.ItemCount > 0 THEN 1 ELSE 0 END AS HasBudget,
        ISNULL(b.BudgetTotal, 0) AS BudgetTotal,
        ISNULL(b.ItemCount, 0) AS ItemCount
      FROM ${costCentresTable} cc
      LEFT JOIN (
        SELECT
          b.CostCentre,
          COUNT(*) AS ItemCount,
          SUM(
            CASE
              WHEN pc.Printout = '%' THEN b.UnitPrice * (b.Quantity / 100.0)
              ELSE b.Quantity * b.UnitPrice
            END
          ) AS BudgetTotal
        FROM ${billTable} b
        LEFT JOIN ${priceListTable} pl ON b.ItemCode = pl.PriceCode
        LEFT JOIN ${perCodesTable} pc ON pl.PerCode = pc.Code
        WHERE b.JobNo = @jobNo AND b.Quantity > 0
        GROUP BY b.CostCentre
      ) b ON cc.Code = b.CostCentre
      WHERE cc.Tier = 1
      ORDER BY cc.SortOrder, cc.Code
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(query);

    console.log('✓ BOQ: Found', result.recordset.length, 'cost centres');

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting cost centres with budgets:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Reprice bill items based on price level and date
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, priceLevel, billDate }
 */
async function repriceBill(event, params) {
  try {
    const { jobNo, priceLevel, billDate } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    console.log('💰 BOQ: Repricing job', jobNo, 'at price level', priceLevel, 'date:', billDate);

    // Update prices for all items in the bill
    const repriceQuery = `
      UPDATE b
      SET b.UnitPrice = ISNULL(p.Price, b.UnitPrice)
      FROM ${billTable} b
      LEFT JOIN (
        SELECT
          PriceCode,
          Price,
          ROW_NUMBER() OVER (PARTITION BY PriceCode ORDER BY Date DESC) AS RowNum
        FROM ${pricesTable}
        WHERE PriceLevel = @priceLevel
          AND Date <= @billDate
      ) p ON b.ItemCode = p.PriceCode AND p.RowNum = 1
      WHERE b.JobNo = @jobNo
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('priceLevel', priceLevel)
      .input('billDate', billDate)
      .query(repriceQuery);

    console.log('✓ BOQ: Repriced', result.rowsAffected[0], 'items');

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: `Repriced ${result.rowsAffected[0]} items`
    };
  } catch (error) {
    console.error('✗ BOQ: Error repricing bill:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Explode a recipe into its sub-items
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre, bLoad, priceCode, quantity, options }
 */
async function explodeRecipe(event, params) {
  try {
    const { jobNo, costCentre, bLoad, priceCode, quantity, options = {} } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const recipeTable = qualifyTable('Recipe', dbConfig);
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const pricesTable = qualifyTable('Prices', dbConfig);

    console.log('💥 BOQ: Exploding recipe', priceCode, 'qty:', quantity);

    // Get recipe sub-items
    const recipeQuery = `
      SELECT
        R.Sub_Item,
        R.Quantity,
        R.Cost_Centre,
        PL.Description,
        (
          SELECT TOP 1 Price
          FROM ${pricesTable}
          WHERE PriceCode = R.Sub_Item
            AND PriceLevel = @priceLevel
          ORDER BY Date DESC
        ) AS Price
      FROM ${recipeTable} R
      INNER JOIN ${priceListTable} PL ON R.Sub_Item = PL.PriceCode
      WHERE R.Main_Item = @priceCode
      ORDER BY R.Counter
    `;

    const recipeResult = await pool.request()
      .input('priceCode', priceCode)
      .input('priceLevel', options.priceLevel || 0)
      .query(recipeQuery);

    const subItems = recipeResult.recordset;

    if (subItems.length === 0) {
      return {
        success: false,
        message: 'No sub-items found for this recipe'
      };
    }

    console.log('📦 BOQ: Found', subItems.length, 'sub-items');

    // Add each sub-item to the bill
    let addedCount = 0;
    for (const subItem of subItems) {
      const subQuantity = subItem.Quantity * quantity;
      const subCostCentre = subItem.Cost_Centre || costCentre;

      // Skip if explodeZeroQtyRecipes is false and quantity is 0
      if (!options.explodeZeroQtyRecipes && subQuantity === 0) {
        continue;
      }

      await addItem(event, {
        JobNo: jobNo,
        ItemCode: subItem.Sub_Item,
        CostCentre: subCostCentre,
        BLoad: bLoad,
        Quantity: subQuantity,
        UnitPrice: subItem.Price || 0
      });

      addedCount++;
    }

    console.log('✓ BOQ: Exploded recipe - added', addedCount, 'sub-items');

    return {
      success: true,
      subItemsAdded: addedCount,
      message: `Recipe exploded - ${addedCount} sub-items added`
    };
  } catch (error) {
    console.error('✗ BOQ: Error exploding recipe:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get available loads for a job/cost centre
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre? }
 */
async function getLoads(event, params) {
  try {
    const { jobNo, costCentre } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    const query = `
      SELECT DISTINCT BLoad
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND (@costCentre IS NULL OR CostCentre = @costCentre)
      ORDER BY BLoad
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .query(query);

    const loads = result.recordset.map(row => row.BLoad);

    return {
      success: true,
      data: loads,
      count: loads.length
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting loads:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Create a new load for a job/cost centre
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre }
 */
async function createLoad(event, params) {
  try {
    const { jobNo, costCentre } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const billTable = qualifyTable('Bill', dbConfig);

    console.log('📦 BOQ: Creating new load for job', jobNo, 'CC:', costCentre);

    // Get max load number
    const maxLoadQuery = `
      SELECT ISNULL(MAX(BLoad), 0) AS MaxLoad
      FROM ${billTable}
      WHERE JobNo = @jobNo
        AND CostCentre = @costCentre
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('costCentre', costCentre)
      .query(maxLoadQuery);

    const newLoad = result.recordset[0].MaxLoad + 1;

    console.log('✓ BOQ: New load number:', newLoad);

    return {
      success: true,
      bLoad: newLoad,
      message: `Load ${newLoad} created`
    };
  } catch (error) {
    console.error('✗ BOQ: Error creating load:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Generate a BOQ report
 * @param {Object} event - IPC event
 * @param {Object} params - { reportType, jobNo, costCentre? }
 */
async function generateReport(event, params) {
  try {
    const { reportType, jobNo, costCentre } = params;

    console.log('📄 BOQ: Generating report type:', reportType, 'for job:', jobNo);

    // Different report types: 'single', 'full', 'summary'
    // This is a placeholder - full implementation will generate formatted reports

    return {
      success: true,
      reportType,
      message: 'Report generation not yet implemented'
    };
  } catch (error) {
    console.error('✗ BOQ: Error generating report:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get nominated suppliers for a cost centre
 * @param {Object} event - IPC event
 * @param {String} costCentre - Cost centre code
 */
async function getNominatedSuppliers(event, costCentre) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const nominatedTable = qualifyTable('NominatedSupplier', dbConfig);
    const supplierTable = qualifyTable('Supplier', dbConfig);

    console.log(`📋 BOQ: Getting nominated suppliers for cost centre ${costCentre}`);

    const query = `
      SELECT
        ns.Code,
        s.Supplier_Code,
        s.SupplierName AS Name,
        s.AccountEmail AS Email,
        s.AccountPhone AS Phone,
        ns.Counter AS SortOrder
      FROM ${nominatedTable} ns
      INNER JOIN ${supplierTable} s
        ON ns.Code = s.Supplier_Code
      WHERE ns.CostCentre = @costCentre
        AND s.Archived = 0
      ORDER BY ns.Counter, s.SupplierName
    `;

    const result = await pool.request()
      .input('costCentre', costCentre)
      .query(query);

    console.log(`✓ BOQ: Found ${result.recordset.length} nominated suppliers`);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('✗ BOQ: Error getting nominated suppliers:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Bulk assign supplier to all items in a load
 * @param {Object} event - IPC event
 * @param {Object} params - { jobNo, costCentre, bLoad, supplier }
 */
async function assignSupplierToLoad(event, params) {
  try {
    const { jobNo, costCentre, bLoad, supplier } = params;
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // Bill table is in the job database, not the system database
    const jobDbName = dbConfig.jobDatabase || 'CROWNEJOB';

    // Check if Supplier column exists in Bill table
    let hasSupplierColumn = false;
    try {
      const checkColumn = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM [${jobDbName}].INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'Bill'
          AND COLUMN_NAME = 'Supplier'
          AND TABLE_SCHEMA = 'dbo'
      `);
      hasSupplierColumn = checkColumn.recordset.length > 0;
    } catch (err) {
      console.log('⚠️  Could not check for Supplier column');
    }

    if (!hasSupplierColumn) {
      console.log('⚠️  BOQ: Supplier column does not exist - skipping supplier assignment');
      return {
        success: true,
        rowsAffected: 0,
        message: 'Supplier column not available - assignment skipped'
      };
    }

    const billTable = qualifyTable('Bill', dbConfig);

    console.log(`🏷️ BOQ: Assigning supplier ${supplier} to Load ${bLoad} in ${costCentre || 'ALL'}`);

    const updateQuery = `
      UPDATE ${billTable}
      SET Supplier = @supplier
      WHERE JobNo = @jobNo
        AND (@costCentre IS NULL OR CostCentre = @costCentre)
        AND BLoad = @bLoad
    `;

    const result = await pool.request()
      .input('supplier', supplier || null)
      .input('jobNo', jobNo)
      .input('costCentre', costCentre || null)
      .input('bLoad', bLoad)
      .query(updateQuery);

    console.log(`✓ BOQ: Updated ${result.rowsAffected[0]} items with supplier`);

    return {
      success: true,
      rowsAffected: result.rowsAffected[0],
      message: `Supplier assigned to ${result.rowsAffected[0]} item(s)`
    };
  } catch (error) {
    console.error('✗ BOQ: Error assigning supplier to load:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Ensure the Supplier column exists in the Bill table
 */
async function ensureSupplierColumn() {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credStore.getCredentials();
    // Bill table is in the job database, not the system database
    const jobDbName = dbConfig.jobDatabase || 'CROWNEJOB';

    console.log('🔧 Checking if Bill table and Supplier column exist...');
    console.log('📌 Job Database:', jobDbName);

    // First, check if the Bill table exists
    const checkTableQuery = `
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM [${jobDbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'Bill'
        AND TABLE_SCHEMA = 'dbo'
    `;
    console.log('🔍 Table check query:', checkTableQuery);

    const checkTable = await pool.request().query(checkTableQuery);
    console.log('📊 Table check result:', checkTable.recordset);

    if (checkTable.recordset.length === 0) {
      console.log('⚠️  Bill table does not exist - skipping Supplier column migration');
      return { success: true, message: 'Bill table does not exist - migration skipped' };
    }

    // Check if Supplier column exists
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${jobDbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Bill'
        AND COLUMN_NAME = 'Supplier'
        AND TABLE_SCHEMA = 'dbo'
    `);

    if (checkColumn.recordset.length === 0) {
      console.log('➕ Adding Supplier column to Bill table...');

      // Add the Supplier column
      const billTable = qualifyTable('Bill', dbConfig);
      await pool.request().query(`
        ALTER TABLE ${billTable}
        ADD Supplier VARCHAR(50) NULL
      `);

      console.log('✓ Supplier column added successfully');
      return { success: true, message: 'Supplier column added' };
    } else {
      console.log('✓ Supplier column already exists');
      return { success: true, message: 'Supplier column already exists' };
    }
  } catch (error) {
    console.error('✗ Error ensuring Supplier column:', error.message);
    // Don't fail the app startup if migration fails
    return { success: false, message: error.message };
  }
}

module.exports = {
  getJobBill,
  addItem,
  updateItem,
  deleteItem,
  getCostCentresWithBudgets,
  repriceBill,
  explodeRecipe,
  getLoads,
  createLoad,
  generateReport,
  getNominatedSuppliers,
  assignSupplierToLoad,
  ensureSupplierColumn
};
