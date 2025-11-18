const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Ensure Picture column exists in PriceList table and is NVARCHAR(MAX)
 * This is called on app startup to add/update the column if needed
 */
async function ensureImagesColumn() {
  try {
    const pool = getPool();
    if (!pool) {
      console.log('⚠️  Database not connected - skipping Picture column check');
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const dbName = dbConfig.database;

    // Check if Picture column exists and get its data type
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM [${dbName}].INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PriceList'
        AND COLUMN_NAME = 'Picture'
        AND TABLE_SCHEMA = 'dbo'
    `);

    if (checkColumn.recordset.length === 0) {
      console.log('📝 Adding Picture column to PriceList table...');

      // Add Picture column to PriceList table with explicit database context
      await pool.request().query(`
        USE [${dbName}];
        ALTER TABLE [dbo].[PriceList]
        ADD [Picture] NVARCHAR(MAX) NULL;
      `);

      console.log('✅ Picture column added successfully to PriceList table');
    } else {
      const column = checkColumn.recordset[0];
      // Check if it's NVARCHAR(MAX) - CHARACTER_MAXIMUM_LENGTH will be -1 for MAX
      if (column.DATA_TYPE === 'nvarchar' && column.CHARACTER_MAXIMUM_LENGTH === -1) {
        console.log('✅ Picture column already exists with NVARCHAR(MAX)');
      } else {
        console.log(`⚠️  Picture column exists but is ${column.DATA_TYPE}(${column.CHARACTER_MAXIMUM_LENGTH || 'MAX'})`);
        console.log('');
        console.log('⚠️  WARNING: Picture column needs to be expanded to NVARCHAR(MAX)');
        console.log('   Current size is too small for storing multiple images.');
        console.log('');
        console.log('📝 To fix this, run the following SQL script as a database administrator:');
        console.log('   C:\\Dev\\dbx-BOQ\\database-scripts\\expand-picture-column.sql');
        console.log('');
        console.log('   Or run this SQL command manually:');
        console.log(`   USE [${dbName}];`);
        console.log(`   ALTER TABLE [dbo].[PriceList]`);
        console.log(`   ALTER COLUMN [Picture] NVARCHAR(MAX) NULL;`);
        console.log('');
        console.log('💡 Image Gallery will work with limited functionality until the column is expanded.');
        console.log('');
      }
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error ensuring Picture column:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Get images for a catalogue item
 * Images are stored as JSON in the Picture column
 * @param {string} priceCode - Catalogue item code
 */
async function getImages(priceCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected', data: [] };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found', data: [] };
    }

    const priceListTable = qualifyTable('PriceList', dbConfig);

    const query = `
      SELECT PriceCode, Description, Picture
      FROM ${priceListTable}
      WHERE PriceCode = @priceCode
    `;

    const result = await pool.request()
      .input('priceCode', priceCode)
      .query(query);

    if (result.recordset.length === 0) {
      return { success: false, message: 'Item not found', data: [] };
    }

    // Parse Picture JSON column (stores array of images)
    let images = [];
    if (result.recordset[0].Picture) {
      try {
        images = JSON.parse(result.recordset[0].Picture);
      } catch (parseError) {
        console.warn('⚠️  Failed to parse Picture JSON:', parseError);
        images = [];
      }
    }

    return {
      success: true,
      data: Array.isArray(images) ? images : []
    };

  } catch (error) {
    // If Picture column doesn't exist, return empty array
    if (error.message.includes('Invalid column name')) {
      console.warn('⚠️  Picture column not found in PriceList table');
      return {
        success: true,
        data: [],
        warning: 'Picture column not available in database schema'
      };
    }

    console.error('Error getting images:', error);
    return { success: false, message: error.message, data: [] };
  }
}

/**
 * Add an image to a catalogue item
 * @param {Object} data - { priceCode, type, url, caption, isPrimary }
 */
async function addImage(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const { priceCode, type, url, caption, isPrimary } = data;

    // Get current images
    const currentResult = await getImages(priceCode);
    if (!currentResult.success && !currentResult.warning) {
      return currentResult;
    }

    let images = currentResult.data || [];

    // If setting as primary, unset current primary
    if (isPrimary) {
      images = images.map(img => ({ ...img, isPrimary: false }));
    }

    // Add new image
    images.push({
      type: type || 'Product Photo',
      url,
      caption: caption || '',
      isPrimary: isPrimary || false,
      addedDate: new Date().toISOString()
    });

    // Save back to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('images', JSON.stringify(images))
      .query(query);

    console.log(`✅ Added image to ${priceCode}`);

    return { success: true, message: 'Image added successfully' };

  } catch (error) {
    if (error.message.includes('Invalid column name')) {
      return {
        success: false,
        message: 'Picture column not available in database schema. Please restart the application to add the Picture column automatically.'
      };
    }

    console.error('Error adding image:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Update an image
 * @param {Object} data - { priceCode, index, type, url, caption, isPrimary }
 */
async function updateImage(data) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    const { priceCode, index, type, url, caption, isPrimary } = data;

    // Get current images
    const currentResult = await getImages(priceCode);
    if (!currentResult.success) {
      return currentResult;
    }

    let images = currentResult.data || [];

    if (index < 0 || index >= images.length) {
      return { success: false, message: 'Image not found' };
    }

    // If setting as primary, unset current primary
    if (isPrimary) {
      images = images.map(img => ({ ...img, isPrimary: false }));
    }

    // Update image
    images[index] = {
      ...images[index],
      type: type || images[index].type,
      url: url || images[index].url,
      caption: caption !== undefined ? caption : images[index].caption,
      isPrimary: isPrimary !== undefined ? isPrimary : images[index].isPrimary,
      updatedDate: new Date().toISOString()
    };

    // Save back to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('images', JSON.stringify(images))
      .query(query);

    console.log(`✅ Updated image for ${priceCode}`);

    return { success: true, message: 'Image updated successfully' };

  } catch (error) {
    console.error('Error updating image:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Delete an image
 * @param {string} priceCode - Catalogue item code
 * @param {number} index - Image index to delete
 */
async function deleteImage(priceCode, index) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    // Get current images
    const currentResult = await getImages(priceCode);
    if (!currentResult.success) {
      return currentResult;
    }

    let images = currentResult.data || [];

    if (index < 0 || index >= images.length) {
      return { success: false, message: 'Image not found' };
    }

    // Remove image
    images.splice(index, 1);

    // If we deleted the primary image and there are others, set first as primary
    if (images.length > 0 && !images.some(img => img.isPrimary)) {
      images[0].isPrimary = true;
    }

    // Save back to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('images', JSON.stringify(images))
      .query(query);

    console.log(`✅ Deleted image from ${priceCode}`);

    return { success: true, message: 'Image deleted successfully' };

  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Set an image as primary
 * @param {string} priceCode - Catalogue item code
 * @param {number} index - Image index to set as primary
 */
async function setPrimaryImage(priceCode, index) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    // Get current images
    const currentResult = await getImages(priceCode);
    if (!currentResult.success) {
      return currentResult;
    }

    let images = currentResult.data || [];

    if (index < 0 || index >= images.length) {
      return { success: false, message: 'Image not found' };
    }

    // Set all as not primary, then set selected as primary
    images = images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index
    }));

    // Save back to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('images', JSON.stringify(images))
      .query(query);

    console.log(`✅ Set primary image for ${priceCode}`);

    return { success: true, message: 'Primary image set successfully' };

  } catch (error) {
    console.error('Error setting primary image:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Copy images from one item to another
 * @param {string} sourceCode - Source item code
 * @param {string} targetCode - Target item code
 */
async function copyImages(sourceCode, targetCode) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    // Get source images
    const sourceResult = await getImages(sourceCode);
    if (!sourceResult.success) {
      return sourceResult;
    }

    if (!sourceResult.data || sourceResult.data.length === 0) {
      return { success: false, message: 'Source item has no images to copy' };
    }

    // Get target images
    const targetResult = await getImages(targetCode);
    if (!targetResult.success && !targetResult.warning) {
      return targetResult;
    }

    let targetImages = targetResult.data || [];

    // Append source images to target (don't replace, append)
    // Mark all as non-primary first
    const newImages = sourceResult.data.map(img => ({
      ...img,
      isPrimary: false,
      copiedFrom: sourceCode,
      addedDate: new Date().toISOString()
    }));

    // If target has no images, make first copied image primary
    if (targetImages.length === 0 && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    targetImages = [...targetImages, ...newImages];

    // Save to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', targetCode)
      .input('images', JSON.stringify(targetImages))
      .query(query);

    console.log(`✅ Copied ${newImages.length} images from ${sourceCode} to ${targetCode}`);

    return {
      success: true,
      message: `Copied ${newImages.length} image(s) successfully`
    };

  } catch (error) {
    console.error('Error copying images:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Reorder images by saving the entire reordered array
 * @param {string} priceCode - Catalogue item code
 * @param {Array} reorderedImages - New images array in desired order
 */
async function reorderImages(priceCode, reorderedImages) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, message: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, message: 'No database configuration found' };
    }

    // Validate the images array
    if (!Array.isArray(reorderedImages)) {
      return { success: false, message: 'Invalid images data' };
    }

    // Save the reordered array to database
    const priceListTable = qualifyTable('PriceList', dbConfig);
    const query = `
      UPDATE ${priceListTable}
      SET Picture = @images
      WHERE PriceCode = @priceCode
    `;

    await pool.request()
      .input('priceCode', priceCode)
      .input('images', JSON.stringify(reorderedImages))
      .query(query);

    console.log(`✅ Reordered images for ${priceCode}`);

    return { success: true, message: 'Images reordered successfully' };

  } catch (error) {
    console.error('Error reordering images:', error);
    return { success: false, message: error.message };
  }
}

module.exports = {
  ensureImagesColumn,
  getImages,
  addImage,
  updateImage,
  deleteImage,
  setPrimaryImage,
  copyImages,
  reorderImages
};
