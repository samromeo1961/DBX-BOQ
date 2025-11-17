const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

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

    let query = `
      SELECT
        Code,
        Name,
        Address,
        Phone,
        Email,
        Mobile,
        Group_,
        Debtor,
        Supplier
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

    const query = `
      SELECT
        Code,
        Name,
        Address,
        Phone,
        Email,
        Mobile,
        Group_,
        Debtor,
        Supplier
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
async function createContact(contactData) {
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

    const {
      code,
      name,
      address,
      phone,
      email,
      mobile,
      state,
      postcode,
      contactGroup
    } = contactData;

    // Validate required fields
    if (!code || !name) {
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
      .input('code', code)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        message: 'Contact code already exists'
      };
    }

    // Insert new contact
    const insertQuery = `
      INSERT INTO ${contactsTable} (
        Code,
        Name,
        Address,
        Phone,
        Email,
        Mobile,
        State,
        Postcode,
        Group_,
        Debtor,
        Supplier
      )
      VALUES (
        @code,
        @name,
        @address,
        @phone,
        @email,
        @mobile,
        @state,
        @postcode,
        @group,
        1,
        0
      )
    `;

    await pool.request()
      .input('code', code)
      .input('name', name)
      .input('address', address || null)
      .input('phone', phone || null)
      .input('email', email || null)
      .input('mobile', mobile || null)
      .input('state', state || null)
      .input('postcode', postcode || null)
      .input('group', contactGroup ? parseInt(contactGroup) : null)
      .query(insertQuery);

    return {
      success: true,
      message: 'Contact created successfully',
      data: { code, name }
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
async function updateContact(contactData) {
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

    const {
      code,
      name,
      address,
      phone,
      email
    } = contactData;

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

    // Update contact
    const updateQuery = `
      UPDATE ${contactsTable}
      SET
        Name = @name,
        Address = @address,
        Phone = @phone,
        Email = @email
      WHERE Code = @code
    `;

    await pool.request()
      .input('code', code)
      .input('name', name || null)
      .input('address', address || null)
      .input('phone', phone || null)
      .input('email', email || null)
      .query(updateQuery);

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

module.exports = {
  getContactsList,
  getContact,
  createContact,
  updateContact,
  getContactGroups
};
