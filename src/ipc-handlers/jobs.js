const { getPool } = require('../database/connection');
const { qualifyTable } = require('../database/query-builder');
const credentialsStore = require('../database/credentials-store');

/**
 * Get list of jobs with client information
 * @param {Event} event - IPC event
 * @param {boolean} showArchived - Whether to include archived jobs (default: false)
 */
async function getJobsList(event, showArchived = false) {
  try {
    console.log('=== GET JOBS LIST ===');
    console.log('Show Archived:', showArchived);

    const pool = getPool();
    if (!pool) {
      console.log('ERROR: Database not connected');
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      console.log('ERROR: No database configuration found');
      return {
        success: false,
        message: 'No database configuration found',
        data: []
      };
    }

    const jobsTable = qualifyTable('Jobs', dbConfig);
    const contactsTable = qualifyTable('Contacts', dbConfig);
    console.log('Jobs table:', jobsTable);
    console.log('Contacts table:', contactsTable);

    // Build WHERE clause based on showArchived flag
    // Archived field: 0 = Active, 1 = Archived
    // CCBank: Only show jobs where CCBank = 1
    const whereClause = showArchived
      ? 'WHERE j.CCBank = 1'
      : 'WHERE j.Archived = 0 AND j.CCBank = 1';

    // Query to get jobs with client information
    const query = `
      SELECT
        j.Job_No AS JobNo,
        j.DebtorName AS Description,
        j.StartDate AS JobDate,
        j.Site_Address AS SiteAddress,
        j.SiteStreet,
        j.SiteSuburb,
        j.SiteState,
        j.JobPostCode,
        j.Debtor AS ClientCode,
        j.DebtorName AS ClientName,
        j.Status,
        j.Archived,
        j.CCBank,
        j.Estimator,
        j.Supervisor,
        j.CCSupervisor,
        c.Phone AS ClientPhone
      FROM ${jobsTable} j
      LEFT JOIN ${contactsTable} c ON j.Debtor = c.Code
      ${whereClause}
      ORDER BY j.Job_No DESC
    `;

    console.log('Executing query:', query);
    const result = await pool.request().query(query);
    console.log('Query returned', result.recordset.length, 'jobs');
    if (result.recordset.length > 0) {
      console.log('First job:', result.recordset[0]);
      console.log('Last job:', result.recordset[result.recordset.length - 1]);
    }

    return {
      success: true,
      data: result.recordset,
      count: result.recordset.length
    };

  } catch (error) {
    console.error('Error getting jobs list:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single job by job number
 */
async function getJob(jobNo) {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);
    const contactsTable = qualifyTable('Contacts', dbConfig);

    const query = `
      SELECT
        j.Job_No AS JobNo,
        j.DebtorName AS Description,
        j.StartDate AS JobDate,
        j.Site_Address AS SiteAddress,
        j.SiteStreet,
        j.SiteSuburb,
        j.SiteState,
        j.JobPostCode,
        j.Debtor AS ClientCode,
        j.DebtorName AS ClientName,
        j.Status,
        j.Archived,
        j.CCBank,
        j.Estimator,
        j.Supervisor,
        j.CCSupervisor,
        c.Phone AS ClientPhone
      FROM ${jobsTable} j
      LEFT JOIN ${contactsTable} c ON j.Debtor = c.Code
      WHERE j.Job_No = @jobNo
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Job not found',
        data: null
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting job:', error);
    return {
      success: false,
      message: error.message,
      data: null
    };
  }
}

/**
 * Create a new job
 */
async function createJob(jobData) {
  try {
    console.log('=== CREATE JOB ===');
    console.log('Received job data:', JSON.stringify(jobData, null, 2));

    const pool = getPool();
    if (!pool) {
      console.log('ERROR: Database not connected');
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const dbConfig = credentialsStore.getCredentials();
    if (!dbConfig) {
      console.log('ERROR: No database configuration found');
      return {
        success: false,
        message: 'No database configuration found'
      };
    }

    const jobsTable = qualifyTable('Jobs', dbConfig);
    console.log('Jobs table:', jobsTable);

    const {
      jobNo,
      description,
      jobDate,
      siteAddress,
      siteStreet,
      siteSuburb,
      siteState,
      jobPostCode,
      debtor,
      status,
      estimator,
      supervisor
    } = jobData;

    // Validate required fields
    if (!jobNo) {
      return {
        success: false,
        message: 'Job number is required'
      };
    }

    // Check if job number already exists
    const checkQuery = `
      SELECT Job_No
      FROM ${jobsTable}
      WHERE Job_No = @jobNo
    `;

    const checkResult = await pool.request()
      .input('jobNo', jobNo)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        message: 'Job number already exists'
      };
    }

    // Insert new job
    const insertQuery = `
      INSERT INTO ${jobsTable} (
        Job_No,
        DebtorName,
        StartDate,
        Site_Address,
        SiteStreet,
        SiteSuburb,
        SiteState,
        JobPostCode,
        Debtor,
        Status,
        Estimator,
        Supervisor
      )
      VALUES (
        @jobNo,
        @description,
        @jobDate,
        @siteAddress,
        @siteStreet,
        @siteSuburb,
        @siteState,
        @jobPostCode,
        @debtor,
        @status,
        @estimator,
        @supervisor
      )
    `;

    console.log('Executing INSERT query...');
    console.log('Query:', insertQuery);
    console.log('Parameters:', {
      jobNo,
      description,
      jobDate,
      siteAddress,
      siteStreet,
      siteSuburb,
      siteState,
      jobPostCode,
      debtor,
      status: status || 'Active',
      estimator,
      supervisor
    });

    const result = await pool.request()
      .input('jobNo', jobNo)
      .input('description', description || null)
      .input('jobDate', jobDate ? new Date(jobDate) : new Date())
      .input('siteAddress', siteAddress || null)
      .input('siteStreet', siteStreet || null)
      .input('siteSuburb', siteSuburb || null)
      .input('siteState', siteState || null)
      .input('jobPostCode', jobPostCode || null)
      .input('debtor', debtor || null)
      .input('status', status || 'Active')
      .input('estimator', estimator || null)
      .input('supervisor', supervisor || null)
      .query(insertQuery);

    console.log('INSERT result:', result);
    console.log('Rows affected:', result.rowsAffected);
    console.log('✓ Job created successfully');

    return {
      success: true,
      message: 'Job created successfully',
      data: { jobNo }
    };

  } catch (error) {
    console.error('Error creating job:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update an existing job
 */
async function updateJob(jobData) {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);

    const {
      jobNo,
      description,
      jobDate,
      siteAddress,
      siteStreet,
      siteSuburb,
      siteState,
      jobPostCode,
      debtor,
      status,
      estimator,
      supervisor
    } = jobData;

    if (!jobNo) {
      return {
        success: false,
        message: 'Job number is required'
      };
    }

    // Check if job exists
    const checkQuery = `
      SELECT Job_No
      FROM ${jobsTable}
      WHERE Job_No = @jobNo
    `;

    const checkResult = await pool.request()
      .input('jobNo', jobNo)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Job not found'
      };
    }

    // Update job
    const updateQuery = `
      UPDATE ${jobsTable}
      SET
        DebtorName = @description,
        StartDate = @jobDate,
        Site_Address = @siteAddress,
        SiteStreet = @siteStreet,
        SiteSuburb = @siteSuburb,
        SiteState = @siteState,
        JobPostCode = @jobPostCode,
        Debtor = @debtor,
        Status = @status,
        Estimator = @estimator,
        Supervisor = @supervisor
      WHERE Job_No = @jobNo
    `;

    await pool.request()
      .input('jobNo', jobNo)
      .input('description', description || null)
      .input('jobDate', jobDate ? new Date(jobDate) : new Date())
      .input('siteAddress', siteAddress || null)
      .input('siteStreet', siteStreet || null)
      .input('siteSuburb', siteSuburb || null)
      .input('siteState', siteState || null)
      .input('jobPostCode', jobPostCode || null)
      .input('debtor', debtor || null)
      .input('status', status || null)
      .input('estimator', estimator || null)
      .input('supervisor', supervisor || null)
      .query(updateQuery);

    return {
      success: true,
      message: 'Job updated successfully'
    };

  } catch (error) {
    console.error('Error updating job:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete a job (soft delete by setting Archived = 1)
 */
async function deleteJob(jobNo) {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);

    if (!jobNo) {
      return {
        success: false,
        message: 'Job number is required'
      };
    }

    // Soft delete (archive) the job by setting Archived = 1
    const deleteQuery = `
      UPDATE ${jobsTable}
      SET Archived = 1
      WHERE Job_No = @jobNo
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(deleteQuery);

    if (result.rowsAffected[0] === 0) {
      return {
        success: false,
        message: 'Job not found'
      };
    }

    return {
      success: true,
      message: 'Job archived successfully'
    };

  } catch (error) {
    console.error('Error deleting job:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Restore an archived job
 */
async function restoreJob(jobNo) {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);

    if (!jobNo) {
      return {
        success: false,
        message: 'Job number is required'
      };
    }

    const restoreQuery = `
      UPDATE ${jobsTable}
      SET Archived = 0
      WHERE Job_No = @jobNo
    `;

    const result = await pool.request()
      .input('jobNo', jobNo)
      .query(restoreQuery);

    if (result.rowsAffected[0] === 0) {
      return {
        success: false,
        message: 'Job not found'
      };
    }

    return {
      success: true,
      message: 'Job restored successfully'
    };

  } catch (error) {
    console.error('Error restoring job:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get list of distinct estimators from jobs
 */
async function getEstimators() {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);

    const query = `
      SELECT DISTINCT Estimator
      FROM ${jobsTable}
      WHERE Estimator IS NOT NULL AND Estimator != ''
      ORDER BY Estimator
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset.map(r => r.Estimator)
    };

  } catch (error) {
    console.error('Error getting estimators:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get list of distinct supervisors from jobs
 */
async function getSupervisors() {
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

    const jobsTable = qualifyTable('Jobs', dbConfig);

    const query = `
      SELECT DISTINCT Supervisor
      FROM ${jobsTable}
      WHERE Supervisor IS NOT NULL AND Supervisor != ''
      ORDER BY Supervisor
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset.map(r => r.Supervisor)
    };

  } catch (error) {
    console.error('Error getting supervisors:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get list of job statuses
 */
async function getJobStatuses() {
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

    const jobStatusTable = qualifyTable('JobStatus', dbConfig);

    const query = `
      SELECT
        StatusNumber,
        StatusName,
        Lcolor
      FROM ${jobStatusTable}
      ORDER BY StatusNumber
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting job statuses:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

module.exports = {
  getJobsList,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  restoreJob,
  getJobStatuses,
  getEstimators,
  getSupervisors
};
