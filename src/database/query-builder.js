const { getJobDatabaseName } = require('./connection');

/**
 * Query Builder - Helper functions for cross-database queries
 */

const TABLE_DATABASE_MAP = {
  // System Database Tables
  'PriceList': 'system',
  'CostCentres': 'system',
  'Recipe': 'system',
  'Prices': 'system',
  'PerCodes': 'system',
  'Supplier': 'system',
  'SupplierGroup': 'system',
  'Contacts': 'system',
  'CCSuppliers': 'system',
  'SuppliersPrices': 'system',
  'StandardNotes': 'system',
  'GlobalNotes': 'system',

  // Job Database Tables
  'Bill': 'job',
  'Orders': 'job',
  'OrderDetails': 'job',
  'Jobs': 'job',
  'JobStatus': 'job'
};

/**
 * Get System Database name
 * @param {Object} dbConfig - Database configuration
 * @returns {string} System database name
 */
function getSystemDatabase(dbConfig) {
  return dbConfig.systemDatabase || dbConfig.database;
}

/**
 * Get Job Database name
 * @param {Object} dbConfig - Database configuration
 * @returns {string|null} Job database name
 */
function getJobDatabase(dbConfig) {
  return getJobDatabaseName(dbConfig);
}

/**
 * Qualify a table name with its database
 * Generates: [DatabaseName].[dbo].[TableName]
 * @param {string} tableName - Table name
 * @param {Object} dbConfig - Database configuration
 * @returns {string} Fully-qualified table name
 */
function qualifyTable(tableName, dbConfig) {
  const databaseType = TABLE_DATABASE_MAP[tableName] || 'system';

  let databaseName;

  if (databaseType === 'job') {
    databaseName = getJobDatabase(dbConfig);
    if (!databaseName) {
      throw new Error(`Job Database not configured. Cannot qualify table: ${tableName}`);
    }
  } else {
    databaseName = getSystemDatabase(dbConfig);
    if (!databaseName) {
      throw new Error(`System Database not configured. Cannot qualify table: ${tableName}`);
    }
  }

  return `[${databaseName}].[dbo].[${tableName}]`;
}

/**
 * Check if Job Database is available
 * @param {Object} dbConfig - Database configuration
 * @returns {boolean} True if Job Database is configured
 */
function isJobDatabaseAvailable(dbConfig) {
  return !!getJobDatabase(dbConfig);
}

module.exports = {
  qualifyTable,
  getSystemDatabase,
  getJobDatabase,
  isJobDatabaseAvailable,
  TABLE_DATABASE_MAP
};
