const db = require('../database/db');

/**
 * Get all supplier groups
 */
async function getSupplierGroups(event) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const supplierGroupTable = db.tables.system.SupplierGroup();

    const query = `
      SELECT
        GroupNumber AS Code,
        GroupName AS Name,
        Lcolor
      FROM ${supplierGroupTable}
      ORDER BY GroupName
    `;

    console.log('Executing SupplierGroup query:', query);

    const result = await pool.request().query(query);

    console.log(`Query returned ${result.recordset.length} supplier groups`);
    if (result.recordset.length > 0) {
      console.log('First supplier group:', result.recordset[0]);
    }

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting supplier groups:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single supplier group by code
 */
async function getSupplierGroup(event, code) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierGroupTable = db.tables.system.SupplierGroup();

    const query = `
      SELECT
        GroupNumber AS Code,
        GroupName AS Name,
        Lcolor
      FROM ${supplierGroupTable}
      WHERE GroupNumber = @code
    `;

    const result = await pool.request()
      .input('code', code)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Supplier group not found'
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting supplier group:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Create a new supplier group
 */
async function createSupplierGroup(event, groupData) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierGroupTable = db.tables.system.SupplierGroup();

    // Get next available code
    const maxCodeResult = await pool.request().query(`
      SELECT ISNULL(MAX(GroupNumber), 0) as MaxCode
      FROM ${supplierGroupTable}
    `);

    const nextCode = maxCodeResult.recordset[0].MaxCode + 1;

    // Insert new group
    await pool.request()
      .input('code', nextCode)
      .input('name', groupData.Name)
      .input('lcolor', groupData.Lcolor || 0)
      .query(`
        INSERT INTO ${supplierGroupTable} (GroupNumber, GroupName, Lcolor)
        VALUES (@code, @name, @lcolor)
      `);

    return {
      success: true,
      message: 'Supplier group created successfully',
      data: { Code: nextCode, Name: groupData.Name, Lcolor: groupData.Lcolor || 0 }
    };

  } catch (error) {
    console.error('Error creating supplier group:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getSupplierGroups,
  getSupplierGroup,
  createSupplierGroup
};
