const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');
const path = require('path');
const fs = require('fs');

/**
 * Ensure the DBxDocuments table exists in the System database
 * Creates the table if it doesn't exist
 */
async function ensureDocumentsTable() {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database credentials found' };
    }

    const dbName = dbConfig.systemDatabase || dbConfig.database;
    console.log('Checking for DBxDocuments table in database:', dbName);

    // Check if table exists
    const checkTable = await pool.request().query(`
      SELECT TABLE_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'DBxDocuments'
        AND TABLE_SCHEMA = 'dbo'
    `);

    if (checkTable.recordset.length === 0) {
      console.log('Creating DBxDocuments table in', dbName);

      // Create table without USE statement (execute in current context)
      await pool.request().query(`
        CREATE TABLE [${dbName}].[dbo].[DBxDocuments] (
          [DocumentID] INT IDENTITY(1,1) PRIMARY KEY,
          [EntityType] VARCHAR(20) NOT NULL,
          [EntityCode] VARCHAR(50) NOT NULL,
          [DocumentType] VARCHAR(30) NOT NULL,
          [FileName] NVARCHAR(255) NOT NULL,
          [RelativePath] NVARCHAR(500) NOT NULL,
          [CloudURL] NVARCHAR(1000) NULL,
          [Description] NVARCHAR(500) NULL,
          [FileSize] BIGINT NULL,
          [MimeType] VARCHAR(100) NULL,
          [CreatedDate] DATETIME DEFAULT GETDATE(),
          [CreatedBy] NVARCHAR(100) NULL,
          [ModifiedDate] DATETIME NULL,
          [ModifiedBy] NVARCHAR(100) NULL,
          [IsDeleted] BIT DEFAULT 0,
          [DeletedDate] DATETIME NULL,
          [DeletedBy] NVARCHAR(100) NULL,
          [Tags] NVARCHAR(500) NULL,
          [Notes] NVARCHAR(MAX) NULL
        )
      `);

      // Create indexes separately
      await pool.request().query(`
        CREATE INDEX IX_DBxDocuments_Entity ON [${dbName}].[dbo].[DBxDocuments] (EntityType, EntityCode)
      `);
      await pool.request().query(`
        CREATE INDEX IX_DBxDocuments_Type ON [${dbName}].[dbo].[DBxDocuments] (DocumentType)
      `);
      await pool.request().query(`
        CREATE INDEX IX_DBxDocuments_Created ON [${dbName}].[dbo].[DBxDocuments] (CreatedDate)
      `);

      console.log('✓ DBxDocuments table created successfully in', dbName);
    } else {
      console.log('DBxDocuments table already exists in', dbName);
    }

    return { success: true };
  } catch (error) {
    console.error('Error ensuring DBxDocuments table:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get documents for a specific entity
 */
async function getDocuments(event, { entityType, entityCode }) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const result = await pool.request()
      .input('entityType', entityType)
      .input('entityCode', entityCode)
      .query(`
        SELECT *
        FROM [${dbName}].[dbo].[DBxDocuments]
        WHERE EntityType = @entityType
          AND EntityCode = @entityCode
          AND IsDeleted = 0
        ORDER BY CreatedDate DESC
      `);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('Error getting documents:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a new document record
 */
async function addDocument(event, documentData) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const {
      EntityType,
      EntityCode,
      DocumentType,
      FileName,
      RelativePath,
      CloudURL,
      Description,
      FileSize,
      MimeType,
      CreatedBy,
      Tags,
      Notes
    } = documentData;

    const result = await pool.request()
      .input('entityType', EntityType)
      .input('entityCode', EntityCode)
      .input('documentType', DocumentType)
      .input('fileName', FileName)
      .input('relativePath', RelativePath)
      .input('cloudURL', CloudURL || null)
      .input('description', Description || null)
      .input('fileSize', FileSize || null)
      .input('mimeType', MimeType || null)
      .input('createdBy', CreatedBy || null)
      .input('tags', Tags || null)
      .input('notes', Notes || null)
      .query(`
        INSERT INTO [${dbName}].[dbo].[DBxDocuments] (
          EntityType, EntityCode, DocumentType, FileName, RelativePath,
          CloudURL, Description, FileSize, MimeType, CreatedBy, Tags, Notes
        )
        OUTPUT INSERTED.DocumentID
        VALUES (
          @entityType, @entityCode, @documentType, @fileName, @relativePath,
          @cloudURL, @description, @fileSize, @mimeType, @createdBy, @tags, @notes
        )
      `);

    return {
      success: true,
      documentId: result.recordset[0].DocumentID,
      message: 'Document added successfully'
    };
  } catch (error) {
    console.error('Error adding document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a document record
 */
async function updateDocument(event, { documentId, updates }) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const {
      Description,
      Tags,
      Notes,
      ModifiedBy
    } = updates;

    await pool.request()
      .input('documentId', documentId)
      .input('description', Description || null)
      .input('tags', Tags || null)
      .input('notes', Notes || null)
      .input('modifiedBy', ModifiedBy || null)
      .query(`
        UPDATE [${dbName}].[dbo].[DBxDocuments]
        SET
          Description = @description,
          Tags = @tags,
          Notes = @notes,
          ModifiedDate = GETDATE(),
          ModifiedBy = @modifiedBy
        WHERE DocumentID = @documentId
      `);

    return { success: true, message: 'Document updated successfully' };
  } catch (error) {
    console.error('Error updating document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Soft delete a document record
 */
async function deleteDocument(event, { documentId, deletedBy }) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    await pool.request()
      .input('documentId', documentId)
      .input('deletedBy', deletedBy || null)
      .query(`
        UPDATE [${dbName}].[dbo].[DBxDocuments]
        SET
          IsDeleted = 1,
          DeletedDate = GETDATE(),
          DeletedBy = @deletedBy
        WHERE DocumentID = @documentId
      `);

    return { success: true, message: 'Document deleted successfully' };
  } catch (error) {
    console.error('Error deleting document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all documents of a specific type
 */
async function getDocumentsByType(event, { documentType }) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const result = await pool.request()
      .input('documentType', documentType)
      .query(`
        SELECT *
        FROM [${dbName}].[dbo].[DBxDocuments]
        WHERE DocumentType = @documentType
          AND IsDeleted = 0
        ORDER BY CreatedDate DESC
      `);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('Error getting documents by type:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Search documents
 */
async function searchDocuments(event, { searchTerm, entityType, documentType }) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    let query = `
      SELECT *
      FROM [${dbName}].[dbo].[DBxDocuments]
      WHERE IsDeleted = 0
    `;

    const request = pool.request();

    if (searchTerm) {
      query += ` AND (FileName LIKE @search OR Description LIKE @search OR Tags LIKE @search)`;
      request.input('search', `%${searchTerm}%`);
    }

    if (entityType) {
      query += ` AND EntityType = @entityType`;
      request.input('entityType', entityType);
    }

    if (documentType) {
      query += ` AND DocumentType = @documentType`;
      request.input('documentType', documentType);
    }

    query += ` ORDER BY CreatedDate DESC`;

    const result = await request.query(query);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('Error searching documents:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log a communication (email, order, etc.)
 */
async function logCommunication(event, commData) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const {
      EntityType,
      EntityCode,
      CommunicationType, // Email, Order, Quote, Invoice
      Subject,
      Recipients,
      Details,
      RelativePath, // Path to saved email/document if any
      CreatedBy
    } = commData;

    const result = await pool.request()
      .input('entityType', EntityType)
      .input('entityCode', EntityCode)
      .input('documentType', CommunicationType)
      .input('fileName', Subject || CommunicationType)
      .input('relativePath', RelativePath || '')
      .input('description', Recipients || null)
      .input('notes', Details || null)
      .input('createdBy', CreatedBy || null)
      .query(`
        INSERT INTO [${dbName}].[dbo].[DBxDocuments] (
          EntityType, EntityCode, DocumentType, FileName, RelativePath,
          Description, Notes, CreatedBy
        )
        OUTPUT INSERTED.DocumentID
        VALUES (
          @entityType, @entityCode, @documentType, @fileName, @relativePath,
          @description, @notes, @createdBy
        )
      `);

    return {
      success: true,
      documentId: result.recordset[0].DocumentID,
      message: 'Communication logged successfully'
    };
  } catch (error) {
    console.error('Error logging communication:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get documents for a job (convenience method)
 */
async function getDocumentsByJob(event, jobNo) {
  return getDocuments(event, { entityType: 'Job', entityCode: jobNo });
}

/**
 * Get documents for a BOQ item (convenience method)
 */
async function getDocumentsByBOQItem(event, { jobNo, costCentre, bLoad, lineNumber }) {
  // BOQ item code is a composite key
  const entityCode = `${jobNo}|${costCentre}|${bLoad}|${lineNumber}`;
  return getDocuments(event, { entityType: 'BOQItem', entityCode });
}

/**
 * Get documents for a Purchase Order (convenience method)
 */
async function getDocumentsByPurchaseOrder(event, { jobNo, orderNumber }) {
  const entityCode = `${jobNo}|${orderNumber}`;
  return getDocuments(event, { entityType: 'PurchaseOrder', entityCode });
}

/**
 * Link a file to an entity (Job, BOQ item, PurchaseOrder, etc.)
 */
async function linkDocument(event, linkData) {
  try {
    const pool = getPool();
    if (!pool) {
      return { success: false, error: 'Database not connected' };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      return { success: false, error: 'No database configuration found' };
    }

    await ensureDocumentsTable();

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const {
      entityType,
      entityCode,
      jobNo,
      costCentre,
      filePath,
      fileName,
      fileType,
      documentType,
      description,
      tags
    } = linkData;

    // Determine entity type and code
    let finalEntityType = entityType || 'Job';
    let finalEntityCode = entityCode || jobNo;
    let finalTags = tags || costCentre || null;

    // Get file stats if available
    let fileSize = null;
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
    } catch {}

    const result = await pool.request()
      .input('entityType', finalEntityType)
      .input('entityCode', finalEntityCode)
      .input('documentType', documentType || 'General')
      .input('fileName', fileName)
      .input('relativePath', filePath)
      .input('description', description || null)
      .input('fileSize', fileSize)
      .input('mimeType', fileType || null)
      .input('tags', finalTags)
      .query(`
        INSERT INTO [${dbName}].[dbo].[DBxDocuments] (
          EntityType, EntityCode, DocumentType, FileName, RelativePath,
          Description, FileSize, MimeType, Tags
        )
        OUTPUT INSERTED.*
        VALUES (
          @entityType, @entityCode, @documentType, @fileName, @relativePath,
          @description, @fileSize, @mimeType, @tags
        )
      `);

    return {
      success: true,
      document: result.recordset[0],
      message: 'Document linked successfully'
    };
  } catch (error) {
    console.error('Error linking document:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlink (soft delete) a document
 */
async function unlinkDocument(event, documentId) {
  return deleteDocument(event, { documentId, deletedBy: 'User' });
}

/**
 * Check if documents table exists
 */
async function checkTableExists() {
  try {
    const pool = getPool();
    if (!pool) return { success: false, exists: false };

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) return { success: false, exists: false };

    const dbName = dbConfig.systemDatabase || dbConfig.database;

    const result = await pool.request().query(`
      SELECT TABLE_NAME
      FROM [${dbName}].INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'DBxDocuments'
        AND TABLE_SCHEMA = 'dbo'
    `);

    return {
      success: true,
      exists: result.recordset.length > 0
    };
  } catch (error) {
    console.error('Error checking table exists:', error);
    return { success: false, exists: false, error: error.message };
  }
}

/**
 * Initialize the documents system (called on app startup)
 */
async function initializeDocuments() {
  try {
    const result = await ensureDocumentsTable();
    return result; // Already returns { success, error? }
  } catch (error) {
    console.error('Error initializing documents:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  ensureDocumentsTable,
  getDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
  getDocumentsByType,
  searchDocuments,
  logCommunication,
  checkTableExists,
  initializeDocuments,
  getDocumentsByJob,
  getDocumentsByBOQItem,
  getDocumentsByPurchaseOrder,
  linkDocument,
  unlinkDocument
};
