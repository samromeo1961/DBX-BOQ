const { getPool } = require('../database/connection');
const credStore = require('../database/credentials-store');
const crypto = require('crypto');
const { qualifyTable } = require('../database/query-builder');
const Store = require('electron-store');

// Local electron-store for UI preferences only (not stored in database)
const localPrefsStore = new Store({
  name: 'local-preferences',
  defaults: {
    uiPreferences: {
      gridRowHeight: 'normal',
      fontSize: 'medium',
      defaultStartupTab: 'jobs',
      confirmDialogs: true
    }
  }
});

/**
 * Get COMMON database configuration
 */
function getCommonDbConfig() {
  const dbConfig = credStore.getCredentials();
  if (!dbConfig) {
    throw new Error('Database configuration not found');
  }

  // COMMON database typically follows naming pattern
  // If SystemDBase is CROWNESYS, COMMON is CROWNECOMMON
  const systemDb = dbConfig.systemDatabase;
  const commonDb = systemDb.replace(/SYS$/i, 'COMMON');

  return {
    server: dbConfig.server,
    database: commonDb,
    user: dbConfig.username,
    password: dbConfig.password,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };
}

/**
 * Encrypt password using AES-256
 */
function encryptPassword(password) {
  if (!password) return null;
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync('dbx-boq-secret-key', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt password
 */
function decryptPassword(encryptedPassword) {
  if (!encryptedPassword) return null;
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('dbx-boq-secret-key', 'salt', 32);
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Error decrypting password:', error);
    return null;
  }
}

// ============================================================
// Company Management
// ============================================================

/**
 * Get all companies from COMMON database
 */
async function getCompanies() {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    if (!dbConfig || !dbConfig.database) {
      throw new Error('Database configuration not found');
    }

    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const companyTable = qualifyTable('Company', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request().query(`
      SELECT
        CompanyNumber as id,
        Company as name,
        SystemDBase as systemDatabase,
        JobDBase as jobDatabase,
        ACN as abn,
        ATOAddress as address1,
        ATOAddress2 as address2,
        ATOCity as city,
        ATOState as state,
        ATOPostCode as postCode,
        ATOPhone as phone,
        ATOFax as fax,
        ATOEmail as email,
        ReportLogo as logoPath
      FROM ${companyTable}
      ORDER BY CompanyNumber
    `);

    return result.recordset;
  } catch (error) {
    console.error('Error getting companies:', error);
    throw error;
  }
}

/**
 * Get a specific company by ID
 */
async function getCompany(id) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const companyTable = qualifyTable('Company', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request()
      .input('companyNumber', id)
      .query(`
        SELECT
          CompanyNumber as id,
          Company as name,
          SystemDBase as systemDatabase,
          JobDBase as jobDatabase,
          ACN as abn,
          Address1 as address1,
          Address2 as address2,
          Address3 as address3,
          PostCode as postCode,
          Telephone as phone,
          Fax as fax,
          Email as email,
          ReportLogo as logoPath
        FROM ${companyTable}
        WHERE CompanyNumber = @companyNumber
      `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error getting company:', error);
    throw error;
  }
}

/**
 * Get current active company from local store
 */
async function getCurrentCompany() {
  try {
    const currentId = localPrefsStore.get('currentCompanyId');
    if (!currentId) return null;
    return await getCompany(currentId);
  } catch (error) {
    console.error('Error getting current company:', error);
    return null;
  }
}

/**
 * Add or update a company in COMMON database
 */
async function saveCompany(company) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const companyTable = qualifyTable('Company', { ...dbConfig, systemDatabase: commonDb });

    // Check if company exists
    const existingResult = await pool.request()
      .input('companyNumber', company.id || 0)
      .query(`
        SELECT CompanyNumber FROM ${companyTable}
        WHERE CompanyNumber = @companyNumber
      `);

    const exists = existingResult.recordset.length > 0;

    if (exists) {
      // Update existing company
      await pool.request()
        .input('companyNumber', company.id)
        .input('company', company.name)
        .input('systemDBase', company.systemDatabase)
        .input('jobDBase', company.jobDatabase)
        .input('acn', company.abn || null)
        .input('atoAddress', company.address1 || null)
        .input('atoAddress2', company.address2 || null)
        .input('atoCity', company.city || null)
        .input('atoState', company.state || null)
        .input('atoPostCode', company.postCode || null)
        .input('atoPhone', company.phone || null)
        .input('atoFax', company.fax || null)
        .input('atoEmail', company.email || null)
        .input('reportLogo', company.logoPath || null)
        .query(`
          UPDATE ${companyTable}
          SET
            Company = @company,
            SystemDBase = @systemDBase,
            JobDBase = @jobDBase,
            ACN = @acn,
            ATOAddress = @atoAddress,
            ATOAddress2 = @atoAddress2,
            ATOCity = @atoCity,
            ATOState = @atoState,
            ATOPostCode = @atoPostCode,
            ATOPhone = @atoPhone,
            ATOFax = @atoFax,
            ATOEmail = @atoEmail,
            ReportLogo = @reportLogo
          WHERE CompanyNumber = @companyNumber
        `);

      return await getCompany(company.id);
    } else {
      // Insert new company - get next available CompanyNumber
      const maxIdResult = await pool.request().query(`
        SELECT ISNULL(MAX(CompanyNumber), 0) + 1 as nextId
        FROM ${companyTable}
      `);

      const newId = maxIdResult.recordset[0].nextId;

      await pool.request()
        .input('companyNumber', newId)
        .input('company', company.name)
        .input('systemDBase', company.systemDatabase)
        .input('jobDBase', company.jobDatabase)
        .input('acn', company.abn || null)
        .input('atoAddress', company.address1 || null)
        .input('atoAddress2', company.address2 || null)
        .input('atoCity', company.city || null)
        .input('atoState', company.state || null)
        .input('atoPostCode', company.postCode || null)
        .input('atoPhone', company.phone || null)
        .input('atoFax', company.fax || null)
        .input('atoEmail', company.email || null)
        .input('reportLogo', company.logoPath || null)
        .query(`
          INSERT INTO ${companyTable} (
            CompanyNumber, Company, SystemDBase, JobDBase, ACN,
            ATOAddress, ATOAddress2, ATOCity, ATOState, ATOPostCode,
            ATOPhone, ATOFax, ATOEmail, ReportLogo
          ) VALUES (
            @companyNumber, @company, @systemDBase, @jobDBase, @acn,
            @atoAddress, @atoAddress2, @atoCity, @atoState, @atoPostCode,
            @atoPhone, @atoFax, @atoEmail, @reportLogo
          )
        `);

      // Set as current if it's the first company
      const companies = await getCompanies();
      if (companies.length === 1) {
        localPrefsStore.set('currentCompanyId', newId);
      }

      return await getCompany(newId);
    }
  } catch (error) {
    console.error('Error saving company:', error);
    throw error;
  }
}

/**
 * Delete a company from COMMON database
 */
async function deleteCompany(id) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const companyTable = qualifyTable('Company', { ...dbConfig, systemDatabase: commonDb });

    await pool.request()
      .input('companyNumber', id)
      .query(`
        DELETE FROM ${companyTable}
        WHERE CompanyNumber = @companyNumber
      `);

    // If deleted company was current, switch to first available
    if (localPrefsStore.get('currentCompanyId') === id) {
      const companies = await getCompanies();
      localPrefsStore.set('currentCompanyId', companies.length > 0 ? companies[0].id : null);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}

/**
 * Switch active company (updates local preferences and database connection)
 */
async function switchCompany(id) {
  try {
    const company = await getCompany(id);
    if (!company) {
      throw new Error('Company not found');
    }

    // Update local preference
    localPrefsStore.set('currentCompanyId', id);

    // Update database connection to use this company's databases
    const currentCreds = credStore.getCredentials();
    const newCreds = {
      ...currentCreds,
      systemDatabase: company.systemDatabase,
      jobDatabase: company.jobDatabase
    };

    credStore.saveCredentials(newCreds);

    // TODO: Reinitialize database connection with new databases
    // This requires reconnecting the pool in connection.js

    return company;
  } catch (error) {
    console.error('Error switching company:', error);
    throw error;
  }
}

// ============================================================
// User Management
// ============================================================

/**
 * Get all users from COMMON database
 */
async function getUsers() {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const userTable = qualifyTable('User_', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request().query(`
      SELECT
        UserID as username,
        UserName as fullName,
        Email as email,
        SecurityLevel as securityLevel,
        UsePassword as usePassword,
        BudLimit as budgetLimit,
        OrderLimit as orderLimit,
        VarLimit as variationLimit,
        ETSLimit as etsLimit,
        UserPermissions as permissions,
        CASE WHEN SecurityLevel > 0 THEN 1 ELSE 0 END as active
      FROM ${userTable}
      ORDER BY UserName
    `);

    // Don't return passwords
    return result.recordset;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

/**
 * Get a specific user by ID
 */
async function getUser(id) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const userTable = qualifyTable('User_', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request()
      .input('userId', id)
      .query(`
        SELECT
          UserID as username,
          UserName as fullName,
          Email as email,
          SecurityLevel as securityLevel,
          UsePassword as usePassword,
          BudLimit as budgetLimit,
          OrderLimit as orderLimit,
          VarLimit as variationLimit,
          ETSLimit as etsLimit,
          UserPermissions as permissions,
          CASE WHEN SecurityLevel > 0 THEN 1 ELSE 0 END as active
        FROM ${userTable}
        WHERE UserID = @userId
      `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

/**
 * Get current logged-in user from local store
 */
async function getCurrentUser() {
  try {
    const currentId = localPrefsStore.get('currentUserId');
    if (!currentId) return null;
    return await getUser(currentId);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Add or update a user in COMMON database
 */
async function saveUser(user) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const userTable = qualifyTable('User_', { ...dbConfig, systemDatabase: commonDb });

    console.log('saveUser called with:', {
      username: user.username,
      fullName: user.fullName,
      hasPassword: !!user.password,
      passwordLength: user.password?.length,
      active: user.active,
      securityLevel: user.securityLevel
    });

    // Password is stored as plain text (max 8 chars)
    let passwordToSave = null;
    if (user.password) {
      passwordToSave = user.password.substring(0, 8); // Limit to 8 characters
      console.log('Password will be saved (length:', passwordToSave.length, ')');
    }

    // Validate username (UserID) is max 8 characters
    if (user.username && user.username.length > 8) {
      throw new Error('Username (User ID) must be 8 characters or less');
    }

    // If user is inactive, set SecurityLevel to 0
    let securityLevel = user.securityLevel || 0;
    if (user.active === false) {
      securityLevel = 0;
    }

    // Check if user exists (use username as the ID for lookups)
    const existingResult = await pool.request()
      .input('userId', user.username || '')
      .query(`
        SELECT UserID FROM ${userTable}
        WHERE UserID = @userId
      `);

    const exists = existingResult.recordset.length > 0;

    if (exists) {
      // Update existing user
      const request = pool.request()
        .input('userId', user.username)
        .input('fullName', user.fullName || '')
        .input('email', user.email || null)
        .input('securityLevel', securityLevel)
        .input('usePassword', user.usePassword ? 1 : 0)
        .input('budLimit', user.budgetLimit || 0)
        .input('orderLimit', user.orderLimit || 0)
        .input('varLimit', user.variationLimit || 0)
        .input('etsLimit', user.etsLimit || 0)
        .input('permissions', user.permissions || null);

      let updateQuery = `
        UPDATE ${userTable}
        SET
          UserName = @fullName,
          Email = @email,
          SecurityLevel = @securityLevel,
          UsePassword = @usePassword,
          BudLimit = @budLimit,
          OrderLimit = @orderLimit,
          VarLimit = @varLimit,
          ETSLimit = @etsLimit,
          UserPermissions = @permissions
      `;

      // Only update password if provided
      if (passwordToSave) {
        request.input('password', passwordToSave);
        updateQuery += `, Password = @password`;
      }

      updateQuery += ` WHERE UserID = @userId`;

      await request.query(updateQuery);

      return await getUser(user.username);
    } else {
      // Insert new user - UserID (username) must be provided (nvarchar(8))
      if (!user.username) {
        throw new Error('Username (User ID) is required for new users');
      }

      await pool.request()
        .input('userId', user.username)
        .input('fullName', user.fullName || '')
        .input('email', user.email || null)
        .input('password', passwordToSave)
        .input('securityLevel', securityLevel)
        .input('usePassword', user.usePassword ? 1 : 0)
        .input('budLimit', user.budgetLimit || 0)
        .input('orderLimit', user.orderLimit || 0)
        .input('varLimit', user.variationLimit || 0)
        .input('etsLimit', user.etsLimit || 0)
        .input('permissions', user.permissions || null)
        .query(`
          INSERT INTO ${userTable} (
            UserID, UserName, Email, Password, SecurityLevel,
            UsePassword, BudLimit, OrderLimit, VarLimit, ETSLimit,
            UserPermissions
          ) VALUES (
            @userId, @fullName, @email, @password, @securityLevel,
            @usePassword, @budLimit, @orderLimit, @varLimit, @etsLimit,
            @permissions
          )
        `);

      return await getUser(user.username);
    }
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

/**
 * Delete a user from COMMON database
 */
async function deleteUser(id) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const userTable = qualifyTable('User_', { ...dbConfig, systemDatabase: commonDb });

    await pool.request()
      .input('userId', id)
      .query(`
        DELETE FROM ${userTable}
        WHERE UserID = @userId
      `);

    // If deleted user was current, logout
    if (localPrefsStore.get('currentUserId') === id) {
      localPrefsStore.set('currentUserId', null);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * Login user (verify credentials)
 */
async function loginUser(username, password) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const userTable = qualifyTable('User_', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request()
      .input('userName', username)
      .query(`
        SELECT
          UserID as id,
          UserName as username,
          Password as password,
          UsePassword as usePassword
        FROM ${userTable}
        WHERE UserName = @userName
      `);

    const user = result.recordset[0];

    if (!user) {
      throw new Error('User not found');
    }

    // If user has password protection enabled, verify it (plain text comparison)
    if (user.usePassword && user.password) {
      if (user.password !== password) {
        throw new Error('Invalid password');
      }
    }

    // Set as current user
    localPrefsStore.set('currentUserId', user.id);

    // Return full user details (without password)
    return await getUser(user.id);
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

/**
 * Logout current user
 */
async function logoutUser() {
  localPrefsStore.set('currentUserId', null);
  return { success: true };
}

// ============================================================
// Application Settings (from Settings table)
// ============================================================

/**
 * Get application defaults from Settings table
 */
async function getApplicationDefaults() {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const settingsTable = qualifyTable('Settings', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request().query(`
      SELECT TOP 1
        PriceLevels as defaultPriceLevel,
        DocFldr as defaultDocFolder,
        CurrencySymbol as currencySymbol,
        POFldr as poFolder
      FROM ${settingsTable}
    `);

    const settings = result.recordset[0] || {};

    return {
      defaultPriceLevel: settings.defaultPriceLevel || 1,
      defaultDocFolder: settings.defaultDocFolder || '',
      currencySymbol: settings.currencySymbol || '$',
      poFolder: settings.poFolder || '',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      showArchivedByDefault: false,
      defaultTab: 'jobs'
    };
  } catch (error) {
    console.error('Error getting application defaults:', error);
    return {
      defaultPriceLevel: 1,
      currencySymbol: '$',
      decimalPlaces: 2,
      dateFormat: 'DD/MM/YYYY',
      showArchivedByDefault: false,
      defaultTab: 'jobs'
    };
  }
}

/**
 * Update application defaults in Settings table
 */
async function updateApplicationDefaults(defaults) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const settingsTable = qualifyTable('Settings', { ...dbConfig, systemDatabase: commonDb });

    // Update only the fields we manage
    await pool.request()
      .input('priceLevels', defaults.defaultPriceLevel)
      .input('docFldr', defaults.defaultDocFolder || '')
      .input('currencySymbol', defaults.currencySymbol || '$')
      .input('poFldr', defaults.poFolder || '')
      .query(`
        UPDATE ${settingsTable}
        SET
          PriceLevels = @priceLevels,
          DocFldr = @docFldr,
          CurrencySymbol = @currencySymbol,
          POFldr = @poFldr
      `);

    return await getApplicationDefaults();
  } catch (error) {
    console.error('Error updating application defaults:', error);
    throw error;
  }
}

/**
 * Get import/export settings (from Settings table)
 */
async function getImportExportSettings() {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const settingsTable = qualifyTable('Settings', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request().query(`
      SELECT TOP 1
        DocFldr as defaultExportFolder
      FROM ${settingsTable}
    `);

    const settings = result.recordset[0] || {};

    return {
      csvDelimiter: ',',
      autoBackupBeforeImport: true,
      exportFileNaming: '{type}_{date}',
      defaultExportFolder: settings.defaultExportFolder || '',
      defaultTemplate: ''
    };
  } catch (error) {
    console.error('Error getting import/export settings:', error);
    return {
      csvDelimiter: ',',
      autoBackupBeforeImport: true,
      exportFileNaming: '{type}_{date}',
      defaultTemplate: ''
    };
  }
}

/**
 * Update import/export settings
 */
async function updateImportExportSettings(settings) {
  // Most import/export settings are UI-only, store locally
  const current = localPrefsStore.get('importExportSettings') || {};
  const updated = { ...current, ...settings };
  localPrefsStore.set('importExportSettings', updated);
  return updated;
}

/**
 * Get PDF settings (from Settings table)
 */
async function getPdfSettings() {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const settingsTable = qualifyTable('Settings', { ...dbConfig, systemDatabase: commonDb });

    const result = await pool.request().query(`
      SELECT TOP 1
        POFldr as poFolder
      FROM ${settingsTable}
    `);

    const settings = result.recordset[0] || {};

    return {
      pageSize: 'A4',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      showLogo: true,
      showWatermark: false,
      watermarkText: 'DRAFT',
      poFolder: settings.poFolder || ''
    };
  } catch (error) {
    console.error('Error getting PDF settings:', error);
    return {
      pageSize: 'A4',
      marginTop: 20,
      marginBottom: 20,
      marginLeft: 20,
      marginRight: 20,
      showLogo: true,
      showWatermark: false,
      watermarkText: 'DRAFT'
    };
  }
}

/**
 * Update PDF settings
 */
async function updatePdfSettings(settings) {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error('Database not connected');
    }

    const dbConfig = credStore.getCredentials();
    // COMMON database is typically just named "COMMON"
    const commonDb = 'COMMON';
    const settingsTable = qualifyTable('Settings', { ...dbConfig, systemDatabase: commonDb });

    // Update PO folder in database
    if (settings.poFolder !== undefined) {
      await pool.request()
        .input('poFldr', settings.poFolder)
        .query(`
          UPDATE ${settingsTable}
          SET POFldr = @poFldr
        `);
    }

    // Store other PDF settings locally
    const current = localPrefsStore.get('pdfSettings') || {};
    const updated = { ...current, ...settings };
    localPrefsStore.set('pdfSettings', updated);

    return updated;
  } catch (error) {
    console.error('Error updating PDF settings:', error);
    throw error;
  }
}

/**
 * Get UI preferences (local only)
 */
async function getUiPreferences() {
  return localPrefsStore.get('uiPreferences') || {
    gridRowHeight: 'normal',
    fontSize: 'medium',
    defaultStartupTab: 'jobs',
    confirmDialogs: true
  };
}

/**
 * Update UI preferences (local only)
 */
async function updateUiPreferences(preferences) {
  const current = localPrefsStore.get('uiPreferences') || {};
  const updated = { ...current, ...preferences };
  localPrefsStore.set('uiPreferences', updated);
  return updated;
}

/**
 * Get all settings
 */
async function getAllSettings() {
  try {
    const companies = await getCompanies();
    const users = await getUsers();
    const currentCompany = await getCurrentCompany();
    const currentUser = await getCurrentUser();
    const applicationDefaults = await getApplicationDefaults();
    const importExportSettings = await getImportExportSettings();
    const pdfSettings = await getPdfSettings();
    const uiPreferences = await getUiPreferences();

    return {
      companies,
      users,
      currentCompanyId: localPrefsStore.get('currentCompanyId'),
      currentUserId: localPrefsStore.get('currentUserId'),
      currentCompany,
      currentUser,
      applicationDefaults,
      importExportSettings,
      pdfSettings,
      uiPreferences
    };
  } catch (error) {
    console.error('Error getting all settings:', error);
    throw error;
  }
}

/**
 * Reset all settings to defaults
 */
async function resetAllSettings() {
  localPrefsStore.clear();
  return await getAllSettings();
}

module.exports = {
  // Company management
  getCompanies,
  getCompany,
  getCurrentCompany,
  saveCompany,
  deleteCompany,
  switchCompany,

  // User management
  getUsers,
  getUser,
  getCurrentUser,
  saveUser,
  deleteUser,
  loginUser,
  logoutUser,

  // Application settings
  getApplicationDefaults,
  updateApplicationDefaults,
  getImportExportSettings,
  updateImportExportSettings,
  getPdfSettings,
  updatePdfSettings,
  getUiPreferences,
  updateUiPreferences,
  getAllSettings,
  resetAllSettings
};
