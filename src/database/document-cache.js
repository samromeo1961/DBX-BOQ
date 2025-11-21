/**
 * SQLite-based cache for document file listings
 * Caches file/folder structure from shared drives for faster access
 */

const path = require('path');
const fs = require('fs');
const { app, shell } = require('electron');

let db = null;

/**
 * Initialize the SQLite database for document caching
 */
async function initializeCache() {
  try {
    // Use better-sqlite3 for synchronous operations
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'document-cache.db');

    db = new Database(dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS file_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        base_path TEXT NOT NULL,
        relative_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        is_directory INTEGER DEFAULT 0,
        file_size INTEGER DEFAULT 0,
        modified_date TEXT,
        entity_type TEXT,
        entity_code TEXT,
        document_type TEXT,
        cached_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(base_path, relative_path, file_name)
      );

      CREATE INDEX IF NOT EXISTS idx_file_cache_entity ON file_cache(entity_type, entity_code);
      CREATE INDEX IF NOT EXISTS idx_file_cache_path ON file_cache(base_path, relative_path);
      CREATE INDEX IF NOT EXISTS idx_file_cache_cached ON file_cache(cached_at);

      CREATE TABLE IF NOT EXISTS cache_metadata (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Document cache database initialized at:', dbPath);
    return { success: true };
  } catch (error) {
    console.error('Error initializing document cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Scan a directory and cache all files/folders
 */
function scanAndCacheDirectory(basePath, relativePath = '', entityType = null, entityCode = null, documentType = null) {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const fullPath = path.join(basePath, relativePath);
  const results = {
    scanned: 0,
    added: 0,
    updated: 0,
    errors: []
  };

  try {
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'Path does not exist', results };
    }

    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO file_cache
      (base_path, relative_path, file_name, is_directory, file_size, modified_date, entity_type, entity_code, document_type, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const scanDir = (dirPath, relPath) => {
      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          results.scanned++;
          const entryRelPath = relPath ? path.join(relPath, entry.name) : entry.name;
          const entryFullPath = path.join(dirPath, entry.name);

          try {
            const stats = fs.statSync(entryFullPath);

            // Parse entity info from path if not provided
            let parsedEntityType = entityType;
            let parsedEntityCode = entityCode;
            let parsedDocType = documentType;

            if (!parsedEntityType && relPath) {
              const pathParts = relPath.split(path.sep);
              if (pathParts.length >= 1) parsedEntityType = pathParts[0];
              if (pathParts.length >= 2) parsedEntityCode = pathParts[1];
              if (pathParts.length >= 3) parsedDocType = pathParts[2];
            }

            insertStmt.run(
              basePath,
              relPath || '',
              entry.name,
              entry.isDirectory() ? 1 : 0,
              stats.size,
              stats.mtime.toISOString(),
              parsedEntityType,
              parsedEntityCode,
              parsedDocType
            );
            results.added++;

            // Recursively scan subdirectories
            if (entry.isDirectory()) {
              scanDir(entryFullPath, entryRelPath);
            }
          } catch (err) {
            results.errors.push({ path: entryFullPath, error: err.message });
          }
        }
      } catch (err) {
        results.errors.push({ path: dirPath, error: err.message });
      }
    };

    // Start scanning
    scanDir(fullPath, relativePath);

    // Update metadata
    const updateMeta = db.prepare(`
      INSERT OR REPLACE INTO cache_metadata (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    updateMeta.run('last_scan_path', basePath);
    updateMeta.run('last_scan_time', new Date().toISOString());

    return { success: true, results };
  } catch (error) {
    console.error('Error scanning directory:', error);
    return { success: false, error: error.message, results };
  }
}

/**
 * Get cached files for an entity
 */
function getCachedFiles(entityType, entityCode, documentType = null) {
  if (!db) {
    return { success: false, error: 'Database not initialized', files: [] };
  }

  try {
    let query = `
      SELECT * FROM file_cache
      WHERE entity_type = ? AND entity_code = ?
    `;
    const params = [entityType, entityCode];

    if (documentType) {
      query += ' AND document_type = ?';
      params.push(documentType);
    }

    query += ' ORDER BY is_directory DESC, file_name ASC';

    const files = db.prepare(query).all(...params);
    return { success: true, files };
  } catch (error) {
    console.error('Error getting cached files:', error);
    return { success: false, error: error.message, files: [] };
  }
}

/**
 * Search cached files
 */
function searchCachedFiles(searchTerm, entityType = null) {
  if (!db) {
    return { success: false, error: 'Database not initialized', files: [] };
  }

  try {
    let query = `
      SELECT * FROM file_cache
      WHERE file_name LIKE ?
    `;
    const params = [`%${searchTerm}%`];

    if (entityType) {
      query += ' AND entity_type = ?';
      params.push(entityType);
    }

    query += ' ORDER BY cached_at DESC LIMIT 100';

    const files = db.prepare(query).all(...params);
    return { success: true, files };
  } catch (error) {
    console.error('Error searching cached files:', error);
    return { success: false, error: error.message, files: [] };
  }
}

/**
 * Get files in a specific path
 */
function getFilesInPath(basePath, relativePath) {
  if (!db) {
    return { success: false, error: 'Database not initialized', files: [] };
  }

  try {
    const files = db.prepare(`
      SELECT * FROM file_cache
      WHERE base_path = ? AND relative_path = ?
      ORDER BY is_directory DESC, file_name ASC
    `).all(basePath, relativePath);

    return { success: true, files };
  } catch (error) {
    console.error('Error getting files in path:', error);
    return { success: false, error: error.message, files: [] };
  }
}

/**
 * Clear cache for a specific base path
 */
function clearCache(basePath = null) {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    if (basePath) {
      db.prepare('DELETE FROM file_cache WHERE base_path = ?').run(basePath);
    } else {
      db.prepare('DELETE FROM file_cache').run();
    }
    return { success: true };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    const totalFiles = db.prepare('SELECT COUNT(*) as count FROM file_cache WHERE is_directory = 0').get();
    const totalDirs = db.prepare('SELECT COUNT(*) as count FROM file_cache WHERE is_directory = 1').get();
    const lastScan = db.prepare("SELECT value FROM cache_metadata WHERE key = 'last_scan_time'").get();
    const basePaths = db.prepare('SELECT DISTINCT base_path FROM file_cache').all();

    return {
      success: true,
      stats: {
        totalFiles: totalFiles?.count || 0,
        totalDirectories: totalDirs?.count || 0,
        lastScanTime: lastScan?.value || null,
        basePaths: basePaths.map(r => r.base_path)
      }
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if cache needs refresh (older than threshold)
 */
function needsRefresh(maxAgeMinutes = 60) {
  if (!db) return true;

  try {
    const lastScan = db.prepare("SELECT value FROM cache_metadata WHERE key = 'last_scan_time'").get();
    if (!lastScan?.value) return true;

    const lastScanTime = new Date(lastScan.value);
    const now = new Date();
    const ageMinutes = (now - lastScanTime) / (1000 * 60);

    return ageMinutes > maxAgeMinutes;
  } catch {
    return true;
  }
}

/**
 * Close the database connection
 */
function closeCache() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * List files directly from filesystem (live, not cached)
 * @param {string} dirPath - Full path to directory
 * @returns {Object} Object with folders and files arrays
 */
function listFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return { success: false, error: 'Directory does not exist', folders: [], files: [] };
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const folders = [];
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      try {
        const stats = fs.statSync(fullPath);

        if (entry.isDirectory()) {
          // Count items in folder
          let itemCount = 0;
          try {
            itemCount = fs.readdirSync(fullPath).length;
          } catch {}

          folders.push({
            name: entry.name,
            path: fullPath,
            isFolder: true,
            itemCount,
            modified: stats.mtime.toISOString()
          });
        } else {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          files.push({
            name: entry.name,
            path: fullPath,
            isFolder: false,
            extension: ext,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      } catch (err) {
        console.warn(`Could not stat ${fullPath}:`, err.message);
      }
    }

    // Sort folders and files alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, folders, files };
  } catch (error) {
    console.error('Error listing files:', error);
    return { success: false, error: error.message, folders: [], files: [] };
  }
}

/**
 * Open a file with the default application
 * @param {string} filePath - Full path to file
 */
async function openFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File does not exist' };
    }
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error('Error opening file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Show a file or folder in the system file explorer
 * @param {string} itemPath - Full path to file or folder
 */
function showInFolder(itemPath) {
  try {
    if (!fs.existsSync(itemPath)) {
      return { success: false, error: 'Path does not exist' };
    }

    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      // Open the folder directly
      shell.openPath(itemPath);
    } else {
      // Show file in its containing folder
      shell.showItemInFolder(itemPath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error showing in folder:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Copy a file to a destination
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination path
 */
function copyFile(sourcePath, destPath) {
  try {
    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    fs.copyFileSync(sourcePath, destPath);
    return { success: true, path: destPath };
  } catch (error) {
    console.error('Error copying file:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a directory
 * @param {string} dirPath - Path for new directory
 */
function createDirectory(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      return { success: true, message: 'Directory already exists' };
    }
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error('Error creating directory:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeCache,
  scanAndCacheDirectory,
  getCachedFiles,
  searchCachedFiles,
  getFilesInPath,
  clearCache,
  getCacheStats,
  needsRefresh,
  closeCache,
  listFiles,
  openFile,
  showInFolder,
  copyFile,
  createDirectory
};
