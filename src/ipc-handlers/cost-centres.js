const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Get list of cost centres (Tier 1 only)
 * Business Rule: Only Tier 1 cost centres are displayed
 */
async function getCostCentresList() {
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

    const costCentresTable = qualifyTable('CostCentres', dbConfig);

    // Query to get Tier 1 cost centres only
    const query = `
      SELECT
        Code,
        Name,
        SubGroup,
        SortOrder,
        Tier
      FROM ${costCentresTable}
      WHERE Tier = 1
      ORDER BY ISNULL(SortOrder, 999999), Code
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting cost centres list:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single cost centre by code
 */
async function getCostCentre(code) {
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

    const costCentresTable = qualifyTable('CostCentres', dbConfig);

    const query = `
      SELECT
        Code,
        Name,
        SubGroup,
        SortOrder,
        Tier
      FROM ${costCentresTable}
      WHERE Code = @code AND Tier = 1
    `;

    const result = await pool.request()
      .input('code', code)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Cost centre not found',
        data: null
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting cost centre:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

/**
 * Get cost centres with budget information for a specific job
 * This is used to show which cost centres have items in the bill
 */
async function getCostCentresWithBudget(jobNo) {
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

    const costCentresTable = qualifyTable('CostCentres', dbConfig);
    const billTable = qualifyTable('Bill', dbConfig);

    // Query to get cost centres with budget totals
    const query = `
      SELECT
        cc.Code,
        cc.Name,
        cc.SubGroup,
        cc.SortOrder,
        COUNT(b.LineNumber) AS ItemCount,
        SUM(b.Quantity * b.UnitPrice) AS BudgetTotal
      FROM ${costCentresTable} cc
      LEFT JOIN ${billTable} b ON cc.Code = b.CostCentre AND b.JobNo = @jobNo
      WHERE cc.Tier = 1
      GROUP BY cc.Code, cc.Name, cc.SubGroup, cc.SortOrder
      ORDER BY ISNULL(cc.SortOrder, 999999), cc.Code
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting cost centres with budget:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

module.exports = {
  getCostCentresList,
  getCostCentre,
  getCostCentresWithBudget
};
