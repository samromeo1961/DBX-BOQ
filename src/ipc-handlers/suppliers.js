const db = require('../database/db');

/**
 * Get list of suppliers from Supplier table
 * @param {boolean} showArchived - Include archived suppliers
 */
async function getSuppliersList(event, showArchived = false) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const supplierTable = db.tables.system.Supplier();

    // Build query based on archived filter
    let whereClause = '';
    if (!showArchived) {
      whereClause = 'WHERE Archived = 0';
    }

    const query = `
      SELECT
        Supplier_Code AS Code,
        SupplierName AS Name,
        AccountContact AS Contact,
        AccountDear AS Dear,
        AccountAddress AS Address,
        AccountCity AS Town,
        AccountState AS State,
        AccountPostcode AS PostCode,
        AccountPhone AS Phone,
        AccountEmail AS Email,
        AccountMobile AS Mobile,
        AccountFax AS Fax,
        GST,
        Archived,
        PreventOrders,
        PreventPosting,
        ACN AS ABN,
        SuppGroup AS Group_,
        BankAcName,
        BankAcNo,
        BSB,
        -- Insurance & Compliance fields
        WCompPolicy,
        WComp1,
        WComp2,
        WComp3,
        WCompComments,
        Tax_File_No,
        Variation_Certificate,
        ReportableSC,
        PPS,
        PPS_Dec,
        PPS_Tax,
        SCFirstName,
        SCSecName,
        SCSurname,
        SCTName,
        SCType,
        ChargeOutRate,
        SiteDays,
        Retention,
        PayStrategy,
        PayDeductions,
        SD1,
        SD2,
        SD3,
        SD4,
        SD5,
        UDF1,
        UDF2,
        UDF3,
        UDF4,
        UDF5,
        UDF6,
        UDF7,
        UDF8,
        UDF9,
        UDF10
      FROM ${supplierTable}
      ${whereClause}
      ORDER BY SupplierName
    `;

    console.log('Executing Supplier query:', query);

    const result = await pool.request().query(query);

    console.log(`Query returned ${result.recordset.length} suppliers`);
    if (result.recordset.length > 0) {
      console.log('First supplier:', result.recordset[0]);
    }

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting suppliers list:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get a single supplier by code
 */
async function getSupplier(event, code) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierTable = db.tables.system.Supplier();

    const query = `
      SELECT
        Supplier_Code AS Code,
        SupplierName AS Name,
        AccountContact AS Contact,
        AccountDear AS Dear,
        AccountAddress AS Address,
        AccountCity AS Town,
        AccountState AS State,
        AccountPostcode AS PostCode,
        AccountPhone AS Phone,
        AccountEmail AS Email,
        AccountMobile AS Mobile,
        AccountFax AS Fax,
        GST,
        Archived,
        PreventOrders,
        PreventPosting,
        ACN AS ABN,
        SuppGroup AS Group_,
        BankAcName,
        BankAcNo,
        BSB,
        -- Insurance & Compliance fields
        WCompPolicy,
        WComp1,
        WComp2,
        WComp3,
        WCompComments,
        Tax_File_No,
        Variation_Certificate,
        ReportableSC,
        PPS,
        PPS_Dec,
        PPS_Tax,
        SCFirstName,
        SCSecName,
        SCSurname,
        SCTName,
        SCType,
        ChargeOutRate,
        SiteDays,
        Retention,
        PayStrategy,
        PayDeductions,
        SD1,
        SD2,
        SD3,
        SD4,
        SD5,
        UDF1,
        UDF2,
        UDF3,
        UDF4,
        UDF5,
        UDF6,
        UDF7,
        UDF8,
        UDF9,
        UDF10
      FROM ${supplierTable}
      WHERE Supplier_Code = @code
    `;

    const result = await pool.request()
      .input('code', code)
      .query(query);

    if (result.recordset.length === 0) {
      return {
        success: false,
        message: 'Supplier not found'
      };
    }

    return {
      success: true,
      data: result.recordset[0]
    };

  } catch (error) {
    console.error('Error getting supplier:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Create a new supplier
 */
async function createSupplier(event, supplierData) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierTable = db.tables.system.Supplier();

    const {
      Code,
      Name,
      Contact,
      Dear,
      Address,
      Town,
      State,
      PostCode,
      Phone,
      Email,
      Mobile,
      Fax,
      GST,
      Archived,
      PreventOrders,
      PreventPosting,
      ABN,
      Group_,
      // Insurance & Compliance
      WCompPolicy,
      WComp1,
      WComp2,
      WComp3,
      WCompComments,
      Tax_File_No,
      Variation_Certificate,
      ReportableSC,
      PPS,
      PPS_Dec,
      PPS_Tax,
      SCFirstName,
      SCSecName,
      SCSurname,
      SCTName,
      SCType,
      ChargeOutRate,
      SiteDays,
      Retention,
      PayStrategy,
      PayDeductions,
      SD1,
      SD2,
      SD3,
      SD4,
      SD5,
      UDF1,
      UDF2,
      UDF3,
      UDF4,
      UDF5,
      UDF6,
      UDF7,
      UDF8,
      UDF9,
      UDF10
    } = supplierData;

    if (!Code || !Name) {
      return {
        success: false,
        message: 'Supplier code and name are required'
      };
    }

    // Check if supplier code already exists
    const checkQuery = `
      SELECT Supplier_Code
      FROM ${supplierTable}
      WHERE Supplier_Code = @code
    `;

    const checkResult = await pool.request()
      .input('code', Code)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      return {
        success: false,
        message: 'Supplier code already exists'
      };
    }

    const insertQuery = `
      INSERT INTO ${supplierTable} (
        Supplier_Code, SupplierName, AccountContact, AccountDear, AccountAddress,
        AccountCity, AccountState, AccountPostcode, AccountPhone, AccountEmail,
        AccountMobile, AccountFax, GST, Archived, PreventOrders, PreventPosting,
        ACN, SuppGroup,
        WCompPolicy, WComp1, WComp2, WComp3, WCompComments,
        Tax_File_No, Variation_Certificate, ReportableSC, PPS, PPS_Dec, PPS_Tax,
        SCFirstName, SCSecName, SCSurname, SCTName, SCType,
        ChargeOutRate, SiteDays, Retention,
        PayStrategy, PayDeductions, SD1, SD2, SD3, SD4, SD5,
        UDF1, UDF2, UDF3, UDF4, UDF5, UDF6, UDF7, UDF8, UDF9, UDF10
      )
      VALUES (
        @code, @name, @contact, @dear, @address, @town, @state, @postcode,
        @phone, @email, @mobile, @fax, @gst, @archived, @preventOrders, @preventPosting,
        @abn, @group,
        @wcompPolicy, @wcomp1, @wcomp2, @wcomp3, @wcompComments,
        @taxFileNo, @variationCert, @reportableSC, @pps, @ppsDec, @ppsTax,
        @scFirstName, @scSecName, @scSurname, @scTName, @scType,
        @chargeOutRate, @siteDays, @retention,
        @payStrategy, @payDeductions, @sd1, @sd2, @sd3, @sd4, @sd5,
        @udf1, @udf2, @udf3, @udf4, @udf5, @udf6, @udf7, @udf8, @udf9, @udf10
      )
    `;

    await pool.request()
      .input('code', Code)
      .input('name', Name || null)
      .input('contact', Contact || null)
      .input('dear', Dear || null)
      .input('address', Address || null)
      .input('town', Town || null)
      .input('state', State || null)
      .input('postcode', PostCode || null)
      .input('phone', Phone || null)
      .input('email', Email || null)
      .input('mobile', Mobile || null)
      .input('fax', Fax || null)
      .input('gst', GST ? 1 : 0)
      .input('archived', Archived ? 1 : 0)
      .input('preventOrders', PreventOrders ? 1 : 0)
      .input('preventPosting', PreventPosting ? 1 : 0)
      .input('abn', ABN || null)
      .input('group', Group_ || null)
      .input('wcompPolicy', WCompPolicy || null)
      .input('wcomp1', WComp1 ? 1 : 0)
      .input('wcomp2', WComp2 ? 1 : 0)
      .input('wcomp3', WComp3 ? 1 : 0)
      .input('wcompComments', WCompComments || null)
      .input('taxFileNo', Tax_File_No || null)
      .input('variationCert', Variation_Certificate || null)
      .input('reportableSC', ReportableSC ? 1 : 0)
      .input('pps', PPS ? 1 : 0)
      .input('ppsDec', PPS_Dec || null)
      .input('ppsTax', PPS_Tax || null)
      .input('scFirstName', SCFirstName || null)
      .input('scSecName', SCSecName || null)
      .input('scSurname', SCSurname || null)
      .input('scTName', SCTName || null)
      .input('scType', SCType || null)
      .input('chargeOutRate', ChargeOutRate || null)
      .input('siteDays', SiteDays || null)
      .input('retention', Retention || null)
      .input('payStrategy', PayStrategy || null)
      .input('payDeductions', PayDeductions || null)
      .input('sd1', SD1 || null)
      .input('sd2', SD2 || null)
      .input('sd3', SD3 || null)
      .input('sd4', SD4 || null)
      .input('sd5', SD5 || null)
      .input('udf1', UDF1 || null)
      .input('udf2', UDF2 || null)
      .input('udf3', UDF3 || null)
      .input('udf4', UDF4 || null)
      .input('udf5', UDF5 || null)
      .input('udf6', UDF6 || null)
      .input('udf7', UDF7 || null)
      .input('udf8', UDF8 || null)
      .input('udf9', UDF9 || null)
      .input('udf10', UDF10 || null)
      .query(insertQuery);

    return {
      success: true,
      message: 'Supplier created successfully',
      data: { Code, Name }
    };

  } catch (error) {
    console.error('Error creating supplier:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Update an existing supplier
 */
async function updateSupplier(event, supplierData) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierTable = db.tables.system.Supplier();

    const {
      Code,
      Name,
      Contact,
      Dear,
      Address,
      Town,
      State,
      PostCode,
      Phone,
      Email,
      Mobile,
      Fax,
      GST,
      Archived,
      PreventOrders,
      PreventPosting,
      ABN,
      Group_,
      // Insurance & Compliance
      WCompPolicy,
      WComp1,
      WComp2,
      WComp3,
      WCompComments,
      Tax_File_No,
      Variation_Certificate,
      ReportableSC,
      PPS,
      PPS_Dec,
      PPS_Tax,
      SCFirstName,
      SCSecName,
      SCSurname,
      SCTName,
      SCType,
      ChargeOutRate,
      SiteDays,
      Retention,
      PayStrategy,
      PayDeductions,
      SD1,
      SD2,
      SD3,
      SD4,
      SD5,
      UDF1,
      UDF2,
      UDF3,
      UDF4,
      UDF5,
      UDF6,
      UDF7,
      UDF8,
      UDF9,
      UDF10
    } = supplierData;

    if (!Code) {
      return {
        success: false,
        message: 'Supplier code is required'
      };
    }

    const updateQuery = `
      UPDATE ${supplierTable}
      SET
        SupplierName = @name,
        AccountContact = @contact,
        AccountDear = @dear,
        AccountAddress = @address,
        AccountCity = @town,
        AccountState = @state,
        AccountPostcode = @postcode,
        AccountPhone = @phone,
        AccountEmail = @email,
        AccountMobile = @mobile,
        AccountFax = @fax,
        GST = @gst,
        Archived = @archived,
        PreventOrders = @preventOrders,
        PreventPosting = @preventPosting,
        ACN = @abn,
        SuppGroup = @group,
        WCompPolicy = @wcompPolicy,
        WComp1 = @wcomp1,
        WComp2 = @wcomp2,
        WComp3 = @wcomp3,
        WCompComments = @wcompComments,
        Tax_File_No = @taxFileNo,
        Variation_Certificate = @variationCert,
        ReportableSC = @reportableSC,
        PPS = @pps,
        PPS_Dec = @ppsDec,
        PPS_Tax = @ppsTax,
        SCFirstName = @scFirstName,
        SCSecName = @scSecName,
        SCSurname = @scSurname,
        SCTName = @scTName,
        SCType = @scType,
        ChargeOutRate = @chargeOutRate,
        SiteDays = @siteDays,
        Retention = @retention,
        PayStrategy = @payStrategy,
        PayDeductions = @payDeductions,
        SD1 = @sd1,
        SD2 = @sd2,
        SD3 = @sd3,
        SD4 = @sd4,
        SD5 = @sd5,
        UDF1 = @udf1,
        UDF2 = @udf2,
        UDF3 = @udf3,
        UDF4 = @udf4,
        UDF5 = @udf5,
        UDF6 = @udf6,
        UDF7 = @udf7,
        UDF8 = @udf8,
        UDF9 = @udf9,
        UDF10 = @udf10
      WHERE Supplier_Code = @code
    `;

    const result = await pool.request()
      .input('code', Code)
      .input('name', Name || null)
      .input('contact', Contact || null)
      .input('dear', Dear || null)
      .input('address', Address || null)
      .input('town', Town || null)
      .input('state', State || null)
      .input('postcode', PostCode || null)
      .input('phone', Phone || null)
      .input('email', Email || null)
      .input('mobile', Mobile || null)
      .input('fax', Fax || null)
      .input('gst', GST ? 1 : 0)
      .input('archived', Archived ? 1 : 0)
      .input('preventOrders', PreventOrders ? 1 : 0)
      .input('preventPosting', PreventPosting ? 1 : 0)
      .input('abn', ABN || null)
      .input('group', Group_ || null)
      .input('wcompPolicy', WCompPolicy || null)
      .input('wcomp1', WComp1 ? 1 : 0)
      .input('wcomp2', WComp2 ? 1 : 0)
      .input('wcomp3', WComp3 ? 1 : 0)
      .input('wcompComments', WCompComments || null)
      .input('taxFileNo', Tax_File_No || null)
      .input('variationCert', Variation_Certificate || null)
      .input('reportableSC', ReportableSC ? 1 : 0)
      .input('pps', PPS ? 1 : 0)
      .input('ppsDec', PPS_Dec || null)
      .input('ppsTax', PPS_Tax || null)
      .input('scFirstName', SCFirstName || null)
      .input('scSecName', SCSecName || null)
      .input('scSurname', SCSurname || null)
      .input('scTName', SCTName || null)
      .input('scType', SCType || null)
      .input('chargeOutRate', ChargeOutRate || null)
      .input('siteDays', SiteDays || null)
      .input('retention', Retention || null)
      .input('payStrategy', PayStrategy || null)
      .input('payDeductions', PayDeductions || null)
      .input('sd1', SD1 || null)
      .input('sd2', SD2 || null)
      .input('sd3', SD3 || null)
      .input('sd4', SD4 || null)
      .input('sd5', SD5 || null)
      .input('udf1', UDF1 || null)
      .input('udf2', UDF2 || null)
      .input('udf3', UDF3 || null)
      .input('udf4', UDF4 || null)
      .input('udf5', UDF5 || null)
      .input('udf6', UDF6 || null)
      .input('udf7', UDF7 || null)
      .input('udf8', UDF8 || null)
      .input('udf9', UDF9 || null)
      .input('udf10', UDF10 || null)
      .query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return {
        success: false,
        message: 'Supplier not found'
      };
    }

    return {
      success: true,
      message: 'Supplier updated successfully'
    };

  } catch (error) {
    console.error('Error updating supplier:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Delete a supplier (hard delete)
 */
async function deleteSupplier(event, code) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected'
      };
    }

    const supplierTable = db.tables.system.Supplier();

    if (!code) {
      return {
        success: false,
        message: 'Supplier code is required'
      };
    }

    // Check if supplier exists
    const checkQuery = `
      SELECT Supplier_Code
      FROM ${supplierTable}
      WHERE Supplier_Code = @code
    `;

    const checkResult = await pool.request()
      .input('code', code)
      .query(checkQuery);

    if (checkResult.recordset.length === 0) {
      return {
        success: false,
        message: 'Supplier not found'
      };
    }

    // Delete the supplier
    const deleteQuery = `
      DELETE FROM ${supplierTable}
      WHERE Supplier_Code = @code
    `;

    await pool.request()
      .input('code', code)
      .query(deleteQuery);

    return {
      success: true,
      message: 'Supplier deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting supplier:', error);

    // Check if error is due to foreign key constraint
    if (error.message && error.message.includes('REFERENCE constraint')) {
      return {
        success: false,
        message: 'Cannot delete supplier: Supplier is referenced in other records (purchase orders, etc.). Consider archiving instead.'
      };
    }

    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Get order history for a supplier
 */
async function getSupplierOrderHistory(event, supplierCode) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const ordersTable = db.tables.job.Orders();

    const query = `
      SELECT
        OrderNumber,
        Job,
        CostCentre,
        OrderDate,
        OrderValue,
        Ordered,
        Invoiced,
        InvoiceNumber,
        OK2Pay,
        OK2PayDate,
        PercCompleted,
        PercSupplied,
        Authorised,
        Rejected
      FROM ${ordersTable}
      WHERE Supplier = @supplierCode
      ORDER BY OrderDate DESC
    `;

    console.log('Fetching order history for supplier:', supplierCode);

    const result = await pool.request()
      .input('supplierCode', supplierCode)
      .query(query);

    console.log(`Found ${result.recordset.length} orders for supplier ${supplierCode}`);

    return {
      success: true,
      data: result.recordset
    };

  } catch (error) {
    console.error('Error getting supplier order history:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

/**
 * Get all payment strategies from database
 */
async function getPaymentStrategies(event) {
  try {
    const pool = db.getDb();
    if (!pool) {
      return {
        success: false,
        message: 'Database not connected',
        data: []
      };
    }

    const payStrategyTable = db.tables.system.PayStrategy();

    const query = `
      SELECT
        StrategyNo,
        ShortName,
        Days,
        Weeks,
        Months,
        NextMonth,
        NextWeek,
        DayOfWeek
      FROM ${payStrategyTable}
      ORDER BY StrategyNo
    `;

    const result = await pool.request().query(query);

    return {
      success: true,
      data: result.recordset
    };
  } catch (error) {
    console.error('Error getting payment strategies:', error);
    return {
      success: false,
      message: error.message,
      data: []
    };
  }
}

module.exports = {
  getSuppliersList,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierOrderHistory,
  getPaymentStrategies
};
