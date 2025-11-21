/**
 * Centralized Database Module
 * Provides easy access to database connections, table names, and common operations
 */

const { getPool } = require('./connection');
const { qualifyTable } = require('./query-builder');
const credentialsStore = require('./credentials-store');

/**
 * Get database pool connection
 * @returns {Object|null} Database pool or null if not connected
 */
function getDb() {
  return getPool();
}

/**
 * Get database configuration
 * @returns {Object|null} Database config or null if not found
 */
function getConfig() {
  return credentialsStore.getCredentials();
}

/**
 * Get fully qualified table name
 * @param {string} tableName - Table name (e.g., 'Supplier', 'Bill', 'PriceList')
 * @param {string} [dbType='system'] - 'system' or 'job' database
 * @returns {string} Qualified table name (e.g., '[CROWNESYS].[dbo].[Supplier]')
 */
function table(tableName, dbType = 'system') {
  const config = getConfig();
  if (!config) {
    throw new Error('Database configuration not found');
  }

  // For backward compatibility, support passing full config object
  if (typeof dbType === 'object') {
    return qualifyTable(tableName, dbType);
  }

  // Determine which database to use
  let tableConfig;
  if (dbType === 'job') {
    // Use job database
    const systemDb = config.systemDatabase || config.database;
    const jobDb = config.jobDatabase || systemDb.replace('SYS', 'JOB');
    tableConfig = { ...config, database: jobDb };
  } else {
    // Use system database (default)
    tableConfig = config;
  }

  return qualifyTable(tableName, tableConfig);
}

/**
 * Common table references for easy access
 */
const tables = {
  // System Database Tables
  system: {
    Supplier: () => table('Supplier', 'system'),
    Contacts: () => table('Contacts', 'system'),
    PriceList: () => table('PriceList', 'system'),
    CostCentres: () => table('CostCentres', 'system'),
    Recipe: () => table('Recipe', 'system'),
    Prices: () => table('Prices', 'system'),
    SuppliersPrices: () => table('SuppliersPrices', 'system'),
    ContactGroup: () => table('ContactGroup', 'system'),
    SupplierGroup: () => table('SupplierGroup', 'system'),
    PayStrategy: () => table('PayStrategy', 'system')
  },

  // Job Database Tables
  job: {
    Bill: () => table('Bill', 'job'),
    Jobs: () => table('Jobs', 'job'),
    Orders: () => table('Orders', 'job')
  }
};

/**
 * Execute a query with automatic error handling
 * @param {string} query - SQL query
 * @param {Object} params - Query parameters { name: value, ... }
 * @returns {Promise<Object>} Result with { success, data, error }
 */
async function query(query, params = {}) {
  try {
    const pool = getDb();
    if (!pool) {
      return {
        success: false,
        error: 'Database not connected',
        data: null
      };
    }

    let request = pool.request();

    // Add parameters
    for (const [name, value] of Object.entries(params)) {
      request = request.input(name, value);
    }

    const result = await request.query(query);

    return {
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected,
      error: null
    };

  } catch (error) {
    console.error('Database query error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Execute a stored procedure
 * @param {string} procedureName - Stored procedure name
 * @param {Object} params - Parameters { name: { type, value }, ... }
 * @returns {Promise<Object>} Result with { success, data, error }
 */
async function execute(procedureName, params = {}) {
  try {
    const pool = getDb();
    if (!pool) {
      return {
        success: false,
        error: 'Database not connected',
        data: null
      };
    }

    let request = pool.request();

    // Add parameters with types
    for (const [name, param] of Object.entries(params)) {
      if (param.type) {
        request = request.input(name, param.type, param.value);
      } else {
        request = request.input(name, param);
      }
    }

    const result = await request.execute(procedureName);

    return {
      success: true,
      data: result.recordset,
      rowsAffected: result.rowsAffected,
      error: null
    };

  } catch (error) {
    console.error('Stored procedure error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Check if a column exists in a table
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @param {string} [dbType='system'] - 'system' or 'job'
 * @returns {Promise<boolean>} True if column exists
 */
async function columnExists(tableName, columnName, dbType = 'system') {
  try {
    const config = getConfig();
    if (!config) return false;

    const dbName = dbType === 'job'
      ? (config.jobDatabase || (config.systemDatabase || config.database).replace('SYS', 'JOB'))
      : (config.systemDatabase || config.database);

    const result = await query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
        AND COLUMN_NAME = @columnName
        AND TABLE_SCHEMA = 'dbo'
    `, {
      tableName,
      columnName
    });

    return result.success && result.data && result.data.length > 0;

  } catch (error) {
    console.error('Error checking column existence:', error);
    return false;
  }
}

/**
 * Get database names
 * @returns {Object} { system: string, job: string }
 */
function getDatabaseNames() {
  const config = getConfig();
  if (!config) {
    return { system: null, job: null };
  }

  const systemDb = config.systemDatabase || config.database;
  const jobDb = config.jobDatabase || systemDb.replace('SYS', 'JOB');

  return {
    system: systemDb,
    job: jobDb
  };
}

module.exports = {
  // Core functions
  getDb,
  getConfig,
  table,
  tables,

  // Query functions
  query,
  execute,

  // Utility functions
  columnExists,
  getDatabaseNames,

  // Backward compatibility
  getPool: getDb,
  qualifyTable: table
};
