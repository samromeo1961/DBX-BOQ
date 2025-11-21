const { getPool } = require('../database/connection');
const credStore = require('../database/credentials-store');
const { qualifyTable } = require('../database/query-builder');

/**
 * Get all contact groups
 */
async function getContactGroups(event) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const sysDbName = dbConfig.systemDatabase;

    const contactGroupTable = qualifyTable('ContactGroup', { ...dbConfig, database: sysDbName });

    const result = await pool.request().query(`
      SELECT
        Code,
        Name,
        Lcolor
      FROM ${contactGroupTable}
      ORDER BY Name
    `);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting contact groups:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get a single contact group by code
 */
async function getContactGroup(event, code) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const sysDbName = dbConfig.systemDatabase;

    const contactGroupTable = qualifyTable('ContactGroup', { ...dbConfig, database: sysDbName });

    const result = await pool.request()
      .input('code', code)
      .query(`
        SELECT
          Code,
          Name,
          Lcolor
        FROM ${contactGroupTable}
        WHERE Code = @code
      `);

    if (result.recordset.length === 0) {
      return {
        success: false,
        error: 'Contact group not found'
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting contact group:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create a new contact group
 */
async function createContactGroup(event, groupData) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    const sysDbName = dbConfig.systemDatabase;

    const contactGroupTable = qualifyTable('ContactGroup', { ...dbConfig, database: sysDbName });

    // Get next available code
    const maxCodeResult = await pool.request().query(`
      SELECT ISNULL(MAX(Code), 0) as MaxCode
      FROM ${contactGroupTable}
    `);

    const nextCode = maxCodeResult.recordset[0].MaxCode + 1;

    // Insert new group
    await pool.request()
      .input('code', nextCode)
      .input('name', groupData.Name)
      .input('lcolor', groupData.Lcolor || 0)
      .query(`
        INSERT INTO ${contactGroupTable} (Code, Name, Lcolor)
        VALUES (@code, @name, @lcolor)
      `);

    return {
      success: true,
      data: { Code: nextCode, Name: groupData.Name, Lcolor: groupData.Lcolor || 0 }
    };

  } catch (error) {
    console.error('Error creating contact group:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getContactGroups,
  getContactGroup,
  createContactGroup
};
