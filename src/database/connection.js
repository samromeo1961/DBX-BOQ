const sql = require('mssql');

let dbPool = null;

/**
 * Connect to SQL Server database
 * @param {Object} dbConfig - Database configuration
 * @returns {Promise<Object>} Database pool
 */
async function connect(dbConfig) {
  try {
    if (dbPool && dbPool.connected) {
      console.log('✓ Using existing database connection');
      return dbPool;
    }

    // Parse server and instance name
    let serverName = dbConfig.server;
    let instanceName = undefined;

    if (dbConfig.server.includes('\\')) {
      const parts = dbConfig.server.split('\\');
      serverName = parts[0];
      instanceName = parts[1];
      console.log('Named instance detected:', { serverName, instanceName });
    }

    // Convert SQL Server shorthand to actual hostnames
    if (serverName === '.' || serverName === '(local)') {
      serverName = 'localhost';
      console.log('Converted server shorthand to localhost');
    }

    const sqlConfig = {
      server: serverName,
      database: dbConfig.systemDatabase || dbConfig.database,
      options: {
        encrypt: false,  // Disabled for local SQL Express instances
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: instanceName
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
      },
      connectionTimeout: 30000,  // Increased timeout for named instances
      requestTimeout: 30000
    };

    // Only add port for non-named instances or if explicitly specified
    if (dbConfig.port && dbConfig.port !== 1433 && !instanceName) {
      sqlConfig.port = dbConfig.port;
    }

    // Configure authentication
    console.log('=== CONNECT DEBUG ===');
    console.log('dbConfig.options:', dbConfig.options);
    console.log('trustedConnection value:', dbConfig.options?.trustedConnection);
    console.log('trustedConnection type:', typeof dbConfig.options?.trustedConnection);
    console.log('Has user:', !!dbConfig.user);
    console.log('Has password:', !!dbConfig.password);

    if (dbConfig.options?.trustedConnection === true) {
      // Windows Authentication
      // Don't specify user/password, let Windows handle authentication
      // The driver should use the current Windows user credentials
      console.log('✓ Using Windows Authentication');
      console.log('Server:', serverName);
      console.log('Instance:', instanceName || 'default');
      console.log('Database:', dbConfig.systemDatabase || dbConfig.database);
      console.log('Note: Using current Windows user credentials');
    } else {
      // SQL Server Authentication
      console.log('✓ Using SQL Server Authentication');
      if (!dbConfig.user || !dbConfig.password) {
        console.error('ERROR: Missing credentials for SQL Auth');
        throw new Error('Username and password are required for SQL Server Authentication');
      }
      sqlConfig.user = dbConfig.user;
      sqlConfig.password = dbConfig.password;
      console.log('User:', dbConfig.user);
    }

    dbPool = await sql.connect(sqlConfig);
    console.log('✓ Database connected successfully');
    console.log('  System DB:', dbConfig.systemDatabase || dbConfig.database);
    console.log('  Job DB:', getJobDatabaseName(dbConfig) || 'AUTO-DETECT');
    return dbPool;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Test database connection and validate Databuild schema
 * @param {Object} dbConfig - Database configuration
 * @returns {Promise<Object>} Result with success flag
 */
async function testConnection(dbConfig) {
  let testPool = null;
  try {
    // Parse server and instance name
    let serverName = dbConfig.server;
    let instanceName = undefined;

    if (dbConfig.server.includes('\\')) {
      const parts = dbConfig.server.split('\\');
      serverName = parts[0];
      instanceName = parts[1];
      console.log('Named instance detected:', { serverName, instanceName });
    }

    // Convert SQL Server shorthand to actual hostnames
    if (serverName === '.' || serverName === '(local)') {
      serverName = 'localhost';
      console.log('Converted server shorthand to localhost');
    }

    const sqlConfig = {
      server: serverName,
      database: dbConfig.systemDatabase || dbConfig.database,
      options: {
        encrypt: false,  // Disabled for local SQL Express instances
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: instanceName
      },
      connectionTimeout: 30000,  // Increased timeout for named instances
      requestTimeout: 30000
    };

    // Only add port for non-named instances or if explicitly specified
    if (dbConfig.port && dbConfig.port !== 1433 && !instanceName) {
      sqlConfig.port = dbConfig.port;
    }

    // Configure authentication
    console.log('=== TEST CONNECTION DEBUG ===');
    console.log('dbConfig.options:', dbConfig.options);
    console.log('trustedConnection value:', dbConfig.options?.trustedConnection);
    console.log('trustedConnection type:', typeof dbConfig.options?.trustedConnection);
    console.log('Has user:', !!dbConfig.user);
    console.log('Has password:', !!dbConfig.password);

    if (dbConfig.options?.trustedConnection === true) {
      // Windows Authentication
      // Don't specify user/password, let Windows handle authentication
      console.log('✓ Using Windows Authentication');
      console.log('Server:', serverName);
      console.log('Instance:', instanceName || 'default');
      console.log('Note: Using current Windows user credentials');
    } else {
      // SQL Server Authentication
      console.log('✓ Using SQL Server Authentication');
      if (!dbConfig.user || !dbConfig.password) {
        console.error('ERROR: Missing credentials for SQL Auth');
        return {
          success: false,
          message: 'Username and password are required for SQL Server Authentication'
        };
      }
      sqlConfig.user = dbConfig.user;
      sqlConfig.password = dbConfig.password;
    }

    testPool = await sql.connect(sqlConfig);

    // Validate System Database schema
    const systemResult = await testPool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME IN ('Supplier', 'PriceList', 'CostCentres', 'Recipe')
    `);

    const systemTables = systemResult.recordset.map(row => row.TABLE_NAME);

    // Check Job Database
    const jobDbName = getJobDatabaseName(dbConfig);
    let jobTables = [];
    let jobDatabaseExists = false;

    if (jobDbName) {
      try {
        const dbCheckResult = await testPool.request().query(`
          SELECT name FROM sys.databases WHERE name = '${jobDbName}'
        `);

        if (dbCheckResult.recordset.length > 0) {
          jobDatabaseExists = true;

          const jobResult = await testPool.request().query(`
            SELECT TABLE_NAME
            FROM [${jobDbName}].INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            AND TABLE_NAME IN ('Bill', 'Orders', 'Jobs')
          `);

          jobTables = jobResult.recordset.map(row => row.TABLE_NAME);
        }
      } catch (jobError) {
        console.warn('Job Database test failed:', jobError.message);
      }
    }

    await testPool.close();

    if (systemTables.length >= 3) {
      let message = 'Connection successful! Databuild System database validated.';

      if (jobDatabaseExists && jobTables.length >= 3) {
        message += ` Job database (${jobDbName}) also validated.`;
      } else if (jobDbName) {
        message += ` Note: Job database (${jobDbName}) not found or missing tables.`;
      }

      return {
        success: true,
        message,
        systemTables,
        jobTables,
        jobDatabaseName: jobDatabaseExists ? jobDbName : null,
        jobDatabaseAvailable: jobDatabaseExists && jobTables.length >= 3
      };
    } else {
      return {
        success: false,
        message: `Connected but missing required tables. Found: ${systemTables.join(', ')}`
      };
    }
  } catch (error) {
    if (testPool) {
      await testPool.close().catch(() => {});
    }
    return {
      success: false,
      message: `Connection failed: ${error.message}`
    };
  }
}

/**
 * Get the current database pool
 * @returns {Object|null} Database pool or null
 */
function getPool() {
  return dbPool;
}

/**
 * Get Job Database name from System Database name
 * Auto-detects by replacing 'SYS' with 'JOB'
 * @param {Object} dbConfig - Database configuration
 * @returns {string|null} Job database name
 */
function getJobDatabaseName(dbConfig) {
  if (dbConfig.jobDatabase) {
    return dbConfig.jobDatabase;
  }

  const systemDb = dbConfig.systemDatabase || dbConfig.database;
  if (!systemDb) {
    return null;
  }

  // Auto-detect: Replace 'SYS' with 'JOB'
  if (systemDb.toUpperCase().endsWith('SYS')) {
    return systemDb.substring(0, systemDb.length - 3) + 'JOB';
  } else if (systemDb.toUpperCase().includes('SYS')) {
    return systemDb.replace(/SYS/gi, 'JOB');
  }

  return null;
}

/**
 * Get System Database name
 * @param {Object} dbConfig - Database configuration
 * @returns {string|null} System database name
 */
function getSystemDatabaseName(dbConfig) {
  if (dbConfig) {
    return dbConfig.systemDatabase || dbConfig.database;
  }

  if (dbPool && dbPool.config && dbPool.config.database) {
    return dbPool.config.database;
  }

  return null;
}

/**
 * Close database connection
 */
async function close() {
  if (dbPool) {
    await sql.close();
    dbPool = null;
    console.log('✓ Database connection closed');
  }
}

module.exports = {
  connect,
  testConnection,
  getPool,
  getJobDatabaseName,
  getSystemDatabaseName,
  close
};
