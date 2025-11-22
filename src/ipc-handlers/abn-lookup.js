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
      console.warn('WARNING: Using default ABN Lookup GUID. Please register at https://abr.business.gov.au/Tools/WebServices');
    }

    // Build ABR API URL
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/SearchByABNv202001?searchString=${cleanedABN}&includeHistoricalDetails=N&authenticationGuid=${apiGuid}`;

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
        console.error('ABN Lookup HTTP error:', err.message);
        reject(err);
      });
    });

    // Check if response looks like XML
    if (!xmlData.trim().startsWith('<')) {
      console.error('ABR API returned non-XML response');
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
      console.error('ABN Lookup: Invalid response structure');
      return {
        success: false,
        message: 'Invalid response from ABR service'
      };
    }

    const payload = result.ABRPayloadSearchResults;

    // Check for service errors
    if (payload.response && payload.response.exception) {
      const exception = payload.response.exception;
      console.error('ABN Lookup error:', exception.exceptionDescription);
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

    // Check if ABN is active - try multiple possible locations for status
    let abnStatus = 'Active'; // Default to Active if we can't determine

    // Try different possible locations for the status field
    if (abn201408?.['$']?.status) {
      abnStatus = abn201408['$'].status;
    } else if (entityStatus?.['$']?.entityStatusCode) {
      abnStatus = entityStatus['$'].entityStatusCode;
    } else if (entityStatus) {
      abnStatus = entityStatus;
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

    // Try multiple possible structures for GST status
    if (gst) {
      if (gst['$'] && gst['$'].status === 'Active') {
        gstRegistered = true;
      } else if (gst.status === 'Active') {
        gstRegistered = true;
      } else if (typeof gst === 'object' && gst.effectiveFrom) {
        // If GST object exists with effectiveFrom date, it's registered
        gstRegistered = true;
      }
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

    return {
      success: true,
      data: businessDetails
    };

  } catch (error) {
    console.error('ABN Lookup error:', error.message);
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
      console.warn('WARNING: Using default ABN Lookup GUID. Please register at https://abr.business.gov.au/Tools/WebServices');
    }

    // Build query parameters for Advanced search
    // Using ABRSearchByNameAdvancedSimpleProtocol2017

    // Determine which state(s) to search based on postcode
    const postcode = options.postcode || '';
    const stateFilters = {
      NSW: 'N', VIC: 'N', QLD: 'N', SA: 'N',
      WA: 'N', TAS: 'N', ACT: 'N', NT: 'N'
    };

    // If we have a specific postcode, enable only that state
    // Otherwise, search all states
    if (postcode) {
      const pc = parseInt(postcode);
      if (pc >= 2000 && pc <= 2999) stateFilters.NSW = 'Y';
      else if (pc >= 3000 && pc <= 3999) stateFilters.VIC = 'Y';
      else if (pc >= 4000 && pc <= 4999) stateFilters.QLD = 'Y';
      else if (pc >= 5000 && pc <= 5999) stateFilters.SA = 'Y';
      else if (pc >= 6000 && pc <= 6999) stateFilters.WA = 'Y';
      else if (pc >= 7000 && pc <= 7999) stateFilters.TAS = 'Y';
      else if (pc >= 800 && pc <= 899) stateFilters.NT = 'Y';
      else if (pc >= 200 && pc <= 299) stateFilters.ACT = 'Y';
      else if (pc >= 2600 && pc <= 2619) stateFilters.ACT = 'Y';
      else {
        // Unknown postcode range, search all states
        Object.keys(stateFilters).forEach(key => stateFilters[key] = 'Y');
      }
    } else {
      // No postcode provided, search all states
      Object.keys(stateFilters).forEach(key => stateFilters[key] = 'Y');
    }

    // Build params - API requires postcode, use default if not provided
    const params = new URLSearchParams({
      name: businessName.trim(),
      authenticationGuid: apiGuid,
      postcode: postcode || '2000',  // Default to Sydney if no postcode provided
      legalName: 'Y',
      businessName: 'Y',
      tradingName: 'Y',
      ...stateFilters,
      activeABNsOnly: 'Y',     // Only search active ABNs
      searchWidth: 'narrow',   // Start with narrow, can be widened if needed
      minimumScore: '50',      // Moderate threshold
      maxSearchResults: '100'
    });


    // Build ABR API URL - using the correct 2017 SimpleProtocol endpoint
    const url = `https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx/ABRSearchByNameAdvancedSimpleProtocol2017?${params.toString()}`;

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

      // Get GST status - try multiple possible structures
      let gstRegistered = false;
      const gst = record.goodsAndServicesTax;

      if (gst) {
        // Try different possible locations for GST status
        if (gst['$'] && gst['$'].status === 'Active') {
          gstRegistered = true;
        } else if (gst.status === 'Active') {
          gstRegistered = true;
        } else if (typeof gst === 'object' && gst.effectiveFrom) {
          // If GST object exists with effectiveFrom date, it's registered
          gstRegistered = true;
        }
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
