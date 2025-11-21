const https = require('https');
const globalSettingsStore = require('../database/global-settings-store');

/**
 * Australia Post Address Validation Handler
 * Uses Australia Post PAC (Postcode & Suburb Search) API
 *
 * API Documentation: https://developers.auspost.com.au/apis/pac/getting-started
 */

/**
 * Search for addresses using Australia Post API
 * @param {Object} event - IPC event
 * @param {string} query - Search query (address, suburb, or postcode)
 * @returns {Promise<Object>} Result with address suggestions
 */
async function searchAddresses(event, query) {
  try {
    if (!query || query.trim().length < 3) {
      return {
        success: false,
        message: 'Search query must be at least 3 characters'
      };
    }

    // Get API key from settings
    const apiKeys = globalSettingsStore.getApiKeys();
    const apiKey = apiKeys?.ausPostApiKey;

    if (!apiKey) {
      return {
        success: false,
        message: 'Australia Post API key not configured. Please add it in Settings > API Keys.'
      };
    }

    // Build API URL - using the Postcode & Suburb Search API
    // Note: There are multiple Australia Post APIs. This uses the free tier PAC API.
    const encodedQuery = encodeURIComponent(query.trim());
    const url = `https://digitalapi.auspost.com.au/postcode/search.json?q=${encodedQuery}&state=&excludePostBoxFlag=true`;

    console.log('Querying Australia Post API for:', query);

    // Make HTTP request
    const data = await makeHttpsRequest(url, {
      'AUTH-KEY': apiKey
    });

    // Parse JSON response
    const result = JSON.parse(data);

    if (!result || !result.localities) {
      return {
        success: false,
        message: 'No addresses found'
      };
    }

    // Format localities into address suggestions
    const suggestions = result.localities.locality.map(loc => ({
      locality: loc.location,
      state: loc.state,
      postcode: loc.postcode,
      category: loc.category,
      latitude: loc.latitude,
      longitude: loc.longitude,
      formattedAddress: `${loc.location}, ${loc.state} ${loc.postcode}`
    }));

    console.log(`Found ${suggestions.length} address suggestions`);

    return {
      success: true,
      data: suggestions
    };

  } catch (error) {
    console.error('Australia Post address search error:', error);
    return {
      success: false,
      message: error.message || 'Failed to search addresses'
    };
  }
}

/**
 * Validate a specific address using Australia Post
 * @param {Object} event - IPC event
 * @param {Object} addressData - Address components to validate
 * @returns {Promise<Object>} Validation result
 */
async function validateAddress(event, addressData) {
  try {
    const { address, suburb, state, postcode } = addressData;

    if (!suburb || !state || !postcode) {
      return {
        success: false,
        message: 'Suburb, state, and postcode are required for validation'
      };
    }

    // Get API key from settings
    const apiKeys = globalSettingsStore.getApiKeys();
    const apiKey = apiKeys?.ausPostApiKey;

    if (!apiKey) {
      return {
        success: false,
        message: 'Australia Post API key not configured'
      };
    }

    // Search for the postcode and suburb combination
    const searchQuery = `${suburb} ${state} ${postcode}`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://digitalapi.auspost.com.au/postcode/search.json?q=${encodedQuery}`;

    console.log('Validating address with Australia Post:', searchQuery);

    const data = await makeHttpsRequest(url, {
      'AUTH-KEY': apiKey
    });

    const result = JSON.parse(data);

    if (!result || !result.localities || !result.localities.locality) {
      return {
        success: false,
        message: 'Address not found in Australia Post database',
        valid: false
      };
    }

    // Check if the suburb/postcode combination exists
    const localities = Array.isArray(result.localities.locality)
      ? result.localities.locality
      : [result.localities.locality];

    const match = localities.find(loc =>
      loc.location.toLowerCase() === suburb.toLowerCase() &&
      loc.state.toUpperCase() === state.toUpperCase() &&
      loc.postcode === postcode
    );

    if (match) {
      return {
        success: true,
        valid: true,
        data: {
          locality: match.location,
          state: match.state,
          postcode: match.postcode,
          category: match.category,
          latitude: match.latitude,
          longitude: match.longitude,
          standardizedAddress: `${address || ''}, ${match.location}, ${match.state} ${match.postcode}`.trim()
        },
        message: 'Address validated successfully'
      };
    } else {
      // Suggest correct suburb/postcode if available
      const suggestion = localities[0];
      return {
        success: true,
        valid: false,
        data: {
          suggestion: {
            locality: suggestion.location,
            state: suggestion.state,
            postcode: suggestion.postcode,
            formattedAddress: `${suggestion.location}, ${suggestion.state} ${suggestion.postcode}`
          }
        },
        message: `Suburb/postcode mismatch. Did you mean: ${suggestion.location}, ${suggestion.state} ${suggestion.postcode}?`
      };
    }

  } catch (error) {
    console.error('Australia Post address validation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to validate address',
      valid: false
    };
  }
}

/**
 * Helper function to make HTTPS requests
 * @param {string} url - URL to request
 * @param {Object} headers - Request headers
 * @returns {Promise<string>} Response data
 */
function makeHttpsRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Accept': 'application/json',
        ...headers
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = {
  searchAddresses,
  validateAddress
};
