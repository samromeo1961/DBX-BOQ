const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Get template (workup) for a catalogue item
 * @param {string} priceCode - Catalogue item code
 */
async function getTemplate(priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected', data: null };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found', data: null };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);

    // Try to get Template field - if it doesn't exist, the query will fail
    // and we'll handle it in the catch block
    const query = `
      SELECT
        PriceCode,
        Description,
        Template
      FROM ${priceListTable}
      WHERE PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .query(query);

    if (result.recordset.length === 0) {
      return { success: false, message: 'Item not found', data: null };
    }

    return {
      success: true,
      data: {
        priceCode: result.recordset[0].PriceCode,
        description: result.recordset[0].Description,
        template: result.recordset[0].Template || ''
      }
    };

  } catch (error) {
    // If Template column doesn't exist, return empty template
    if (error.message.includes('Invalid column name')) {
      console.warn('⚠️  Template column not found in PriceList table');
      return {
        success: true,
        data: { priceCode, template: '' },
        warning: 'Template column not available in database schema'
      };
    }

    console.error('Error getting template:', error);
    return { success: false, message: error.message, data: null };
  }
}

/**
 * Update template (workup) for a catalogue item
 * @param {Object} data - { priceCode, template }
 */
async function updateTemplate(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const { priceCode, template } = data;

    const query = `
      UPDATE ${priceListTable}
      SET Template = @template
      WHERE PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .input('template', template || '')
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return { success: false, message: 'Item not found' };
    }

    console.log(`✅ Updated template for ${priceCode}`);

    return { success: true, message: 'Template updated successfully' };

  } catch (error) {
    if (error.message.includes('Invalid column name')) {
      return {
        success: false,
        message: 'Template column not available in database schema. Please add the Template column to the PriceList table.'
      };
    }

    console.error('Error updating template:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get specification for a catalogue item
 * @param {string} priceCode - Catalogue item code
 */
async function getSpecification(priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected', data: null };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found', data: null };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);

    const query = `
      SELECT
        PriceCode,
        Description,
        Specification
      FROM ${priceListTable}
      WHERE PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .query(query);

    if (result.recordset.length === 0) {
      return { success: false, message: 'Item not found', data: null };
    }

    return {
      success: true,
      data: {
        priceCode: result.recordset[0].PriceCode,
        description: result.recordset[0].Description,
        specification: result.recordset[0].Specification || ''
      }
    };

  } catch (error) {
    if (error.message.includes('Invalid column name')) {
      console.warn('⚠️  Specification column not found in PriceList table');
      return {
        success: true,
        data: { priceCode, specification: '' },
        warning: 'Specification column not available in database schema'
      };
    }

    console.error('Error getting specification:', error);
    return { success: false, message: error.message, data: null };
  }
}

/**
 * Update specification for a catalogue item
 * @param {Object} data - { priceCode, specification }
 */
async function updateSpecification(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);
    const { priceCode, specification } = data;

    const query = `
      UPDATE ${priceListTable}
      SET Specification = @specification
      WHERE PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .input('specification', specification || '')
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return { success: false, message: 'Item not found' };
    }

    console.log(`✅ Updated specification for ${priceCode}`);

    return { success: true, message: 'Specification updated successfully' };

  } catch (error) {
    if (error.message.includes('Invalid column name')) {
      return {
        success: false,
        message: 'Specification column not available in database schema. Please add the Specification column to the PriceList table.'
      };
    }

    console.error('Error updating specification:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  getTemplate,
  updateTemplate,
  getSpecification,
  updateSpecification
};
