const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Ensure the Archived and GST columns exist in the Contacts table
 * Checks if columns exist and adds them if missing (runtime check pattern)
 */
async function ensureArchivedColumn() {
  try {
    const pool = getPool();
    if (!pool) return false;

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) return false;

    const dbName = dbConfig.systemDatabase || dbConfig.database; // System database

    // Check if Archived and GST columns exist
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Contacts'
        AND COLUMN_NAME IN ('Archived', 'GST')
        AND TABLE_SCHEMA = 'dbo'
    `);

    const columnNames = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasArchived = columnNames.includes('Archived');
    const hasGST = columnNames.includes('GST');

    // Add Archived column if missing
    if (!hasArchived) {
      console.log('Adding Archived column to Contacts table...');
      try {
        await pool.request().query(`
          USE [${dbName}];
          ALTER TABLE [dbo].[Contacts]
          ADD [Archived] BIT NULL DEFAULT 0;
        `);
        console.log('✓ Archived column added successfully');
      } catch (err) {
        console.warn('Could not add Archived column (may lack permissions):', err.message);
      }
    }

    // Add GST column if missing
    if (!hasGST) {
      console.log('Adding GST column to Contacts table...');
      try {
        await pool.request().query(`
          USE [${dbName}];
          ALTER TABLE [dbo].[Contacts]
          ADD [GST] BIT NULL DEFAULT 0;
        `);
        console.log('✓ GST column added successfully');
      } catch (err) {
        console.warn('Could not add GST column (may lack permissions):', err.message);
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring Contacts columns:', error);
    return false;
  }
}

/**
 * Get list of contacts, optionally filtered by contact group
 * @param {string} contactGroup - Optional filter: ContactGroup code for filtering by Group_
 */
async function getContactsList(event, contactGroup = null) {
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

    const contactsTable = qualifyTable('Contacts', dbConfig);
    console.log('Contacts table name:', contactsTable);

    // Ensure Archived column exists
    await ensureArchivedColumn();

    // Check if Archived and GST columns exist
    const dbName = dbConfig.systemDatabase || dbConfig.database;
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Contacts'
        AND COLUMN_NAME IN ('Archived', 'GST')
        AND TABLE_SCHEMA = 'dbo'
    `);

    const columnNames = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasArchived = columnNames.includes('Archived');
    const hasGST = columnNames.includes('GST');

    console.log('Contacts columns check:', { hasArchived, hasGST });

    // Build query with conditional fields
    const archivedField = hasArchived ? 'Archived' : 'CAST(0 AS BIT) AS Archived';
    const gstField = hasGST ? 'GST' : 'CAST(0 AS BIT) AS GST';

    let query = `
      SELECT
        Code,
        Name,
        Contact,
        Dear,
        Address,
        City AS Town,
        State,
        Postcode AS PostCode,
        Phone,
        Email,
        Mobile,
        Fax,
        Group_,
        Debtor,
        Supplier,
        ${archivedField},
        ${gstField}
      FROM ${contactsTable}
    `;

    // Filter by Group_ = 1 and Supplier = 0 if 'C' is passed (clients only)
    if (contactGroup === 'C') {
      query += ` WHERE Group_ = 1 AND Supplier = 0`;
    }
    // Filter by Supplier flag if 'S' is passed (suppliers only)
    else if (contactGroup === 'S') {
      query += ` WHERE Supplier = 1`;
    }
    // Filter to show only non-supplier contacts (for Contacts tab)
    else if (contactGroup === 'CONTACTS') {
      query += ` WHERE Supplier = 0 ORDER BY Contact`;
      // Return early since we have our own ORDER BY
      console.log('Executing CONTACTS query:', query);
      const result = await pool.request().query(query);
      console.log('CONTACTS query returned', result.recordset.length, 'records');
      return {
        success: true,
        data: result.recordset,
        count: result.recordset.length
      };
    }
    // Filter by Group_ if a number is passed
    else if (contactGroup && !isNaN(contactGroup)) {
      query += ` WHERE Group_ = @contactGroup AND Supplier = 0`;
    }

    query += ` ORDER BY Name`;

    console.log('Executing query:', query);

    const request = pool.request();
    if (contactGroup && !isNaN(contactGroup)) {
      request.input('contactGroup', parseInt(contactGroup));
    }

    const result = await request.query(query);
    console.log('Query returned', result.recordset.length, 'records');
    if (result.recordset.length > 0) {
      console.log('First record:', result.recordset[0]);
    }

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting contacts list:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single contact by code
 */
async function getContact(code) {
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

    const contactsTable = qualifyTable('Contacts', dbConfig);

    // Check if Archived and GST columns exist
    const dbName = dbConfig.systemDatabase || dbConfig.database;
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Contacts'
        AND COLUMN_NAME IN ('Archived', 'GST')
        AND TABLE_SCHEMA = 'dbo'
    `);

    const columnNames = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasArchived = columnNames.includes('Archived');
    const hasGST = columnNames.includes('GST');

    // Build query with conditional fields
    const archivedField = hasArchived ? 'Archived' : 'CAST(0 AS BIT) AS Archived';
    const gstField = hasGST ? 'GST' : 'CAST(0 AS BIT) AS GST';

    const query = `
      SELECT
        Code,
        Name,
        Contact,
        Dear,
        Address,
        City AS Town,
        State,
        Postcode AS PostCode,
        Phone,
        Email,
        Mobile,
        Fax,
        Group_,
        Debtor,
        Supplier,
        ${archivedField},
        ${gstField}
      FROM ${contactsTable}
      WHERE Code = @code
    `;

    const result = await pool.request()
      .input('code', code)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Contact not found',
        data: null
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting contact:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

/**
 * Get list of contact groups
 */
async function getContactGroups() {
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

    // ContactGroup table is in CROWNESYS
    const contactGroupTable = qualifyTable('ContactGroup', dbConfig);

    const query = `
      SELECT
        Code,
        Name
      FROM ${contactGroupTable}
      ORDER BY Name
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting contact groups:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Create a new contact
 */
async function createContact(event, contactData) {
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

    const contactsTable = qualifyTable('Contacts', dbConfig);

    // Ensure Archived and GST columns exist
    await ensureArchivedColumn();

    // Check if Archived and GST columns exist
    const dbName = dbConfig.systemDatabase || dbConfig.database;
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Contacts'
        AND COLUMN_NAME IN ('Archived', 'GST')
        AND TABLE_SCHEMA = 'dbo'
    `);

    const columnNames = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasArchived = columnNames.includes('Archived');
    const hasGST = columnNames.includes('GST');

    const {
      Code,
      Name,
      Contact,
      Dear,
      Address,
      Town,      // Frontend uses Town
      City,      // Database uses City
      State,
      PostCode,  // Frontend uses PostCode
      Postcode,  // Database uses Postcode
      Phone,
      Email,
      Mobile,
      Fax,
      Group_,
      Debtor,
      Supplier,
      Archived,
      GST
    } = contactData;

    // Map frontend field names to database field names
    const cityValue = Town || City || null;
    const postcodeValue = PostCode || Postcode || null;

    // Validate required fields
    if (!Code || !Name) {
      return {
        success: false,
        message: 'Contact code and name are required'
      };
    }

    // Check if contact code already exists
    const checkQuery = `
      SELECT Code
      FROM ${contactsTable}
      WHERE Code = @code
    `;

    const checkResult = await pool.request()
      .input('code', Code)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        message: 'Contact code already exists'
      };
    }

    // Build INSERT query with conditional Archived and GST fields
    const archivedColumn = hasArchived ? ', Archived' : '';
    const archivedValue = hasArchived ? ', @archived' : '';
    const gstColumn = hasGST ? ', GST' : '';
    const gstValue = hasGST ? ', @gst' : '';

    const insertQuery = `
      INSERT INTO ${contactsTable} (
        Code,
        Name,
        Contact,
        Dear,
        Address,
        City,
        State,
        Postcode,
        Phone,
        Email,
        Mobile,
        Fax,
        Group_,
        Debtor,
        Supplier${archivedColumn}${gstColumn}
      )
      VALUES (
        @code,
        @name,
        @contact,
        @dear,
        @address,
        @city,
        @state,
        @postcode,
        @phone,
        @email,
        @mobile,
        @fax,
        @group,
        @debtor,
        @supplier${archivedValue}${gstValue}
      )
    `;

    const request = pool.request()
      .input('code', Code)
      .input('name', Name)
      .input('contact', Contact || null)
      .input('dear', Dear || null)
      .input('address', Address || null)
      .input('city', cityValue)
      .input('state', State || null)
      .input('postcode', postcodeValue)
      .input('phone', Phone || null)
      .input('email', Email || null)
      .input('mobile', Mobile || null)
      .input('fax', Fax || null)
      .input('group', Group_ || 1)
      .input('debtor', Debtor ? 1 : 0)
      .input('supplier', Supplier ? 1 : 0);

    if (hasArchived) {
      request.input('archived', Archived ? 1 : 0);
    }
    if (hasGST) {
      request.input('gst', GST ? 1 : 0);
    }

    await request.query(insertQuery);

    return {
      success: true,
      message: 'Contact created successfully',
      data: { Code, Name }
    };

  } catch (error) {
    console.error('Error creating contact:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update an existing contact
 */
async function updateContact(event, contactData) {
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

    const contactsTable = qualifyTable('Contacts', dbConfig);

    // Ensure Archived and GST columns exist
    await ensureArchivedColumn();

    // Check if Archived and GST columns exist
    const dbName = dbConfig.systemDatabase || dbConfig.database;
    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Contacts'
        AND COLUMN_NAME IN ('Archived', 'GST')
        AND TABLE_SCHEMA = 'dbo'
    `);

    const columnNames = checkColumns.recordset.map(r => r.COLUMN_NAME);
    const hasArchived = columnNames.includes('Archived');
    const hasGST = columnNames.includes('GST');

    const {
      Code,
      Name,
      Contact,
      Dear,
      Address,
      Town,      // Frontend uses Town
      City,      // Database uses City
      State,
      PostCode,  // Frontend uses PostCode
      Postcode,  // Database uses Postcode
      Phone,
      Email,
      Mobile,
      Fax,
      Group_,
      Debtor,
      Supplier,
      Archived,
      GST
    } = contactData;

    // Map frontend field names to database field names
    const cityValue = Town || City || null;
    const postcodeValue = PostCode || Postcode || null;

    if (!Code) {
      return {
        success: false,
        message: 'Contact code is required'
      };
    }

    // Check if contact exists
    const checkQuery = `
      SELECT Code
      FROM ${contactsTable}
      WHERE Code = @code
    `;

    const checkResult = await pool.request()
      .input('code', Code)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Contact not found'
      };
    }

    // Build UPDATE query with conditional Archived and GST fields
    const archivedField = hasArchived ? ', Archived = @archived' : '';
    const gstField = hasGST ? ', GST = @gst' : '';

    const updateQuery = `
      UPDATE ${contactsTable}
      SET
        Name = @name,
        Contact = @contact,
        Dear = @dear,
        Address = @address,
        City = @city,
        State = @state,
        Postcode = @postcode,
        Phone = @phone,
        Email = @email,
        Mobile = @mobile,
        Fax = @fax,
        Group_ = @group,
        Debtor = @debtor,
        Supplier = @supplier${archivedField}${gstField}
      WHERE Code = @code
    `;

    const request = pool.request()
      .input('code', Code)
      .input('name', Name || null)
      .input('contact', Contact || null)
      .input('dear', Dear || null)
      .input('address', Address || null)
      .input('city', cityValue)
      .input('state', State || null)
      .input('postcode', postcodeValue)
      .input('phone', Phone || null)
      .input('email', Email || null)
      .input('mobile', Mobile || null)
      .input('fax', Fax || null)
      .input('group', Group_ || 1)
      .input('debtor', Debtor ? 1 : 0)
      .input('supplier', Supplier ? 1 : 0);

    if (hasArchived) {
      request.input('archived', Archived ? 1 : 0);
    }
    if (hasGST) {
      request.input('gst', GST ? 1 : 0);
    }

    await request.query(updateQuery);

    return {
      success: true,
      message: 'Contact updated successfully'
    };

  } catch (error) {
    console.error('Error updating contact:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete a contact
 */
async function deleteContact(event, code) {
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

    const contactsTable = qualifyTable('Contacts', dbConfig);

    if (!code) {
      return {
        success: false,
        message: 'Contact code is required'
      };
    }

    // Check if contact exists
    const checkQuery = `
      SELECT Code
      FROM ${contactsTable}
      WHERE Code = @code
    `;

    const checkResult = await pool.request()
      .input('code', code)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Contact not found'
      };
    }

    // Delete contact
    const deleteQuery = `
      DELETE FROM ${contactsTable}
      WHERE Code = @code
    `;

    await pool.request()
      .input('code', code)
      .query(deleteQuery);

    return {
      success: true,
      message: 'Contact deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting contact:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  getContactsList,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  getContactGroups
};
