const https = require('https');
const { parseStringPromise } = require('xml2js');

/**
 * ABN Lookup Handler
 * Queries the Australian Business Register (ABR) for business details
 *
 * To use this service, you need to register for a free GUID at:
 * https://abr.business.gov.au/Tools/WebServices
 */

// Default GUID - users should replace this with their own registered GUID
const DEFAULT_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Clean ABN by removing spaces and non-numeric characters
 * @param {string} abn - ABN to clean
 * @returns {string} Cleaned ABN (11 digits)
 */
function cleanABN(abn) {
  if (!abn) return '';
  return abn.toString().replace(/[^\d]/g, '');
}

/**
 * Validate ABN format (11 digits)
 * @param {string} abn - ABN to validate
 * @returns {boolean} True if valid format
 */
function isValidABNFormat(abn) {
  const cleaned = cleanABN(abn);
  return cleaned.length === 11 && /^\d{11}$/.test(cleaned);
}

/**
 * Lookup ABN details from the Australian Business Register
 * @param {Object} event - IPC event
 * @param {string} abn - ABN to lookup
 * @param {string} guid - Optional registered GUID for ABR API
 * @returns {Promise<Object>} Result with business details
 */
async function lookupABN(event, abn, guid = null) {
  try {
    // Validate ABN format
    const cleanedABN = cleanABN(abn);
    if (!isValidABNFormat(cleanedABN)) {
      return {
        success: false,
        message: 'Invalid ABN format. ABN must be 11 digits.'
      };
    }

    // Use provided GUID or default
    const apiGuid = guid || DEFAULT_GUID;

    if (apiGuid === DEFAULT_GUID) {
      console.warn('Using default ABN Lookup GUID. Please register for your own GUID at https://abr.business.gov.au/Tools/WebServices');
    }

    // Build ABR API URL
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001?searchString=${cleanedABN}&includeHistoricalDetails=N&authenticationGuid=${apiGuid}`;

    console.log('Querying ABR for ABN:', cleanedABN);

    // Make HTTP request to ABR
    const xmlData = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });

    // Check if response looks like XML
    if (!xmlData.trim().startsWith('<')) {
      console.error('ABR API returned non-XML response:', xmlData.substring(0, 200));
      return {
        success: false,
        message: 'ABR API returned an unexpected response. This usually means:\n' +
                 '• Your ABN GUID is not activated yet (can take 24 hours after registration)\n' +
                 '• The GUID is invalid or expired\n' +
                 '• There is an ABR service issue\n\n' +
                 'Please check your GUID in Settings > API Keys.\n\n' +
                 'Response preview: ' + xmlData.substring(0, 100)
      };
    }

    // Parse XML response
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: false
    });

    // Check for API errors
    if (!result || !result.ABRPayloadSearchResults) {
      return {
        success: false,
        message: 'Invalid response from ABR service'
      };
    }

    const payload = result.ABRPayloadSearchResults;

    // Check for service errors
    if (payload.response && payload.response.exception) {
      const exception = payload.response.exception;
      return {
        success: false,
        message: `ABR Error: ${exception.exceptionDescription || 'Unknown error'}`
      };
    }

    // Check if ABN was found
    const businessEntity = payload.response?.businessEntity202001;
    if (!businessEntity) {
      return {
        success: false,
        message: 'ABN not found in the Australian Business Register'
      };
    }

    // Extract business details
    const abn201408 = businessEntity.ABN;
    const entityStatus = businessEntity.entityStatus;
    const mainName = businessEntity.mainName;
    const legalName = businessEntity.legalName;

    // Check if ABN is active
    const abnStatus = abn201408?.['$']?.status || 'Unknown';
    const isActive = abnStatus === 'Active';

    if (!isActive) {
      return {
        success: false,
        message: `ABN is ${abnStatus}. Only active ABNs can be looked up.`
      };
    }

    // Get entity type
    const entityTypeCode = businessEntity.entityType?.entityTypeCode || '';
    const entityTypeName = businessEntity.entityType?.entityDescription || '';

    // Get business name
    let businessName = '';
    if (mainName) {
      businessName = mainName.organisationName || '';
    } else if (legalName) {
      // For individuals, combine given name and family name
      const givenName = legalName.givenName || '';
      const familyName = legalName.familyName || '';
      businessName = `${givenName} ${familyName}`.trim();
    }

    // Get business address (main business physical address)
    let address = {};
    const physicalAddress = businessEntity.mainBusinessPhysicalAddress;
    if (physicalAddress) {
      address = {
        stateCode: physicalAddress.stateCode || '',
        postcode: physicalAddress.postcode || '',
        addressLine1: '',
        addressLine2: ''
      };

      // Construct address lines
      const parts = [];
      if (physicalAddress.addressDetails) {
        const details = physicalAddress.addressDetails;

        // Unit/Level details
        if (details.unitNumber) {
          parts.push(`Unit ${details.unitNumber}`);
        }
        if (details.levelNumber) {
          parts.push(`Level ${details.levelNumber}`);
        }

        // Street details
        const streetParts = [];
        if (details.streetNumber) streetParts.push(details.streetNumber);
        if (details.streetName) streetParts.push(details.streetName);
        if (details.streetType) streetParts.push(details.streetType);

        if (streetParts.length > 0) {
          parts.push(streetParts.join(' '));
        }
      }

      if (parts.length > 0) {
        address.addressLine1 = parts.join(', ');
      }

      // Suburb
      if (physicalAddress.localityName) {
        address.town = physicalAddress.localityName;
      }
    }

    // Get GST registration
    let gstRegistered = false;
    const gst = businessEntity.goodsAndServicesTax;
    if (gst && gst['$'] && gst['$'].status === 'Active') {
      gstRegistered = true;
    }

    // Return formatted result
    const businessDetails = {
      abn: cleanedABN,
      name: businessName,
      entityType: entityTypeName,
      entityTypeCode: entityTypeCode,
      abnStatus: abnStatus,
      gstRegistered: gstRegistered,
      address: address.addressLine1 || '',
      town: address.town || '',
      state: address.stateCode || '',
      postcode: address.postcode || ''
    };

    console.log('ABN Lookup successful:', businessDetails);

    return {
      success: true,
      data: businessDetails
    };

  } catch (error) {
    console.error('ABN Lookup error:', error);
    return {
      success: false,
      message: error.message || 'Failed to lookup ABN'
    };
  }
}

/**
 * Search for businesses by name
 * @param {Object} event - IPC event
 * @param {string} businessName - Business name to search
 * @param {string} guid - Optional registered GUID for ABR API
 * @param {Object} options - Optional search filters (postcode, state, etc.)
 * @returns {Promise<Object>} Result with list of matching businesses
 */
async function searchByBusinessName(event, businessName, guid = null, options = {}) {
  try {
    // Validate business name
    if (!businessName || businessName.trim().length < 3) {
      return {
        success: false,
        message: 'Business name must be at least 3 characters'
      };
    }

    // Use provided GUID or default
    const apiGuid = guid || DEFAULT_GUID;

    if (apiGuid === DEFAULT_GUID) {
      console.warn('Using default ABN Lookup GUID. Please register for your own GUID at https://abr.business.gov.au/Tools/WebServices');
    }

    // Build query parameters
    const params = new URLSearchParams({
      name: businessName.trim(),
      authenticationGuid: apiGuid
    });

    // Add optional filters
    if (options.postcode) {
      params.append('postcode', options.postcode);
    }

    // Default to searching both legal and trading names
    params.append('legalName', 'Y');
    params.append('tradingName', 'Y');

    // Build ABR API URL
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameSimpleProtocol?${params.toString()}`;

    console.log('Searching ABR for business name:', businessName);

    // Make HTTP request to ABR
    const xmlData = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });

    // Check if response looks like XML
    if (!xmlData.trim().startsWith('<')) {
      console.error('ABR API returned non-XML response:', xmlData.substring(0, 200));
      return {
        success: false,
        message: 'ABR API returned an unexpected response. This usually means:\n' +
                 '• Your ABN GUID is not activated yet (can take 24 hours after registration)\n' +
                 '• The GUID is invalid or expired\n' +
                 '• There is an ABR service issue\n\n' +
                 'Please check your GUID in Settings > API Keys.\n\n' +
                 'Response preview: ' + xmlData.substring(0, 100)
      };
    }

    // Parse XML response
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: false
    });

    // Check for API errors
    if (!result || !result.ABRPayloadSearchResults) {
      return {
        success: false,
        message: 'Invalid response from ABR service'
      };
    }

    const payload = result.ABRPayloadSearchResults;

    // Check for service errors
    if (payload.response && payload.response.exception) {
      const exception = payload.response.exception;
      return {
        success: false,
        message: `ABR Error: ${exception.exceptionDescription || 'Unknown error'}`
      };
    }

    // Extract search results
    const searchResultsList = payload.response?.searchResultsList;
    if (!searchResultsList) {
      return {
        success: true,
        data: [],
        message: 'No businesses found matching the search criteria'
      };
    }

    // Convert to array if single result
    let searchResults = searchResultsList.searchResultsRecord;
    if (!searchResults) {
      return {
        success: true,
        data: [],
        message: 'No businesses found matching the search criteria'
      };
    }

    if (!Array.isArray(searchResults)) {
      searchResults = [searchResults];
    }

    // Parse and format results
    const businesses = searchResults.map(record => {
      const abn = record.ABN?.identifierValue || '';
      const abnStatus = record.ABN?.identifierStatus || 'Unknown';
      const isActive = abnStatus === 'Active';

      // Get main name
      let mainName = '';
      if (record.mainName && record.mainName.organisationName) {
        mainName = record.mainName.organisationName;
      }

      // Get trading names
      let tradingNames = [];
      if (record.mainTradingName) {
        const tradingName = record.mainTradingName.organisationName;
        if (tradingName) {
          tradingNames.push(tradingName);
        }
      }
      if (record.otherTradingName) {
        let otherNames = record.otherTradingName;
        if (!Array.isArray(otherNames)) {
          otherNames = [otherNames];
        }
        otherNames.forEach(name => {
          if (name.organisationName) {
            tradingNames.push(name.organisationName);
          }
        });
      }

      // Get location
      const state = record.mainBusinessPhysicalAddress?.stateCode || '';
      const postcode = record.mainBusinessPhysicalAddress?.postcode || '';

      // Get GST status
      let gstRegistered = false;
      if (record.goodsAndServicesTax) {
        const gstStatus = record.goodsAndServicesTax['$']?.status;
        gstRegistered = gstStatus === 'Active';
      }

      return {
        abn: abn,
        abnStatus: abnStatus,
        isActive: isActive,
        name: mainName,
        tradingNames: tradingNames,
        state: state,
        postcode: postcode,
        gstRegistered: gstRegistered
      };
    });

    console.log(`Found ${businesses.length} businesses matching '${businessName}'`);

    return {
      success: true,
      data: businesses
    };

  } catch (error) {
    console.error('Business name search error:', error);
    return {
      success: false,
      message: error.message || 'Failed to search for business name'
    };
  }
}

/**
 * Verify ABN details against provided data
 * @param {Object} event - IPC event
 * @param {string} abn - ABN to verify
 * @param {Object} expectedData - Expected business data (name, gstRegistered)
 * @param {string} guid - Optional registered GUID for ABR API
 * @returns {Promise<Object>} Result with verification status
 */
async function verifyABN(event, abn, expectedData, guid = null) {
  try {
    // Lookup ABN details
    const lookupResult = await lookupABN(event, abn, guid);

    if (!lookupResult.success) {
      return lookupResult;
    }

    const abnData = lookupResult.data;
    const verifications = {};

    // Verify business name if provided
    if (expectedData.name) {
      const expectedName = expectedData.name.trim().toLowerCase();
      const actualName = abnData.name.trim().toLowerCase();
      verifications.nameMatch = expectedName === actualName;
      verifications.actualName = abnData.name;
      verifications.expectedName = expectedData.name;
    }

    // Verify GST status if provided
    if (expectedData.gstRegistered !== undefined) {
      verifications.gstMatch = abnData.gstRegistered === expectedData.gstRegistered;
      verifications.actualGstStatus = abnData.gstRegistered;
      verifications.expectedGstStatus = expectedData.gstRegistered;
    }

    // Overall verification status
    const allMatch = Object.keys(verifications)
      .filter(key => key.endsWith('Match'))
      .every(key => verifications[key]);

    return {
      success: true,
      data: {
        verified: allMatch,
        verifications: verifications,
        abnData: abnData
      }
    };

  } catch (error) {
    console.error('ABN verification error:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify ABN'
    };
  }
}

module.exports = {
  lookupABN,
  searchByBusinessName,
  verifyABN
};
