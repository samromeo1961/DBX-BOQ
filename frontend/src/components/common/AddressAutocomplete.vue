<template>
  <div class="address-autocomplete">
    <label v-if="label" class="form-label">{{ label }}</label>
    <div class="input-group">
      <input
        ref="autocompleteInput"
        type="text"
        class="form-control"
        :placeholder="ausPostMode ? 'Type suburb name (e.g., Sydney, Parramatta)...' : placeholder"
        :disabled="disabled || (!googleMapsAvailable && !ausPostAvailable)"
        v-model="searchValue"
        @keydown.enter.prevent="handleEnterKey"
        @keyup="handleSearchKeyup"
      />
      <button
        v-if="searchValue && ausPostMode"
        class="btn btn-outline-primary"
        type="button"
        @click="searchAusPost"
        :disabled="searching"
        title="Search Australia Post"
      >
        <span v-if="searching" class="spinner-border spinner-border-sm"></span>
        <i v-else class="bi bi-search"></i>
      </button>
      <button
        v-if="searchValue"
        class="btn btn-outline-secondary"
        type="button"
        @click="clearSearch"
        title="Clear search"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <!-- Service mode toggle -->
    <div v-if="googleMapsAvailable && ausPostAvailable" class="mt-2 mb-1">
      <div class="btn-group btn-group-sm" role="group">
        <input type="radio" class="btn-check" id="mode-google" :value="false" v-model="ausPostMode" />
        <label class="btn btn-outline-primary" for="mode-google">
          <i class="bi bi-google"></i> Google Maps
        </label>
        <input type="radio" class="btn-check" id="mode-auspost" :value="true" v-model="ausPostMode" />
        <label class="btn btn-outline-primary" for="mode-auspost">
          <i class="bi bi-mailbox"></i> Australia Post
        </label>
      </div>
    </div>

    <!-- Australia Post results -->
    <div v-if="ausPostResults.length > 0" class="list-group mt-2 shadow-sm">
      <button
        v-for="(result, index) in ausPostResults"
        :key="index"
        type="button"
        class="list-group-item list-group-item-action"
        @click="selectAusPostResult(result)"
      >
        <div class="d-flex w-100 justify-content-between">
          <strong>{{ result.locality }}</strong>
          <small class="text-muted">{{ result.postcode }}</small>
        </div>
        <small class="text-muted">{{ result.state }}</small>
      </button>
    </div>

    <small v-if="!googleMapsAvailable && !ausPostAvailable" class="text-warning">
      <i class="bi bi-exclamation-triangle"></i>
      No address lookup service configured. Please add API keys in Settings > API Keys.
    </small>
    <small v-else-if="ausPostMode" class="text-info">
      <i class="bi bi-info-circle"></i>
      <strong>Australia Post:</strong> Type a suburb name (e.g., "Sydney", "Parramatta") and press Enter or click Search.
      Not case-sensitive. Only finds suburbs/postcodes, not street addresses.
    </small>
    <small v-else-if="hint" class="text-muted">{{ hint }}</small>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineEmits, defineProps } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

const props = defineProps({
  label: {
    type: String,
    default: 'Search Address'
  },
  placeholder: {
    type: String,
    default: 'Start typing an address...'
  },
  hint: {
    type: String,
    default: 'Select an address to auto-fill details'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  countryCode: {
    type: String,
    default: 'au' // Default to Australia
  }
});

const emit = defineEmits(['addressSelected', 'addressCleared']);

const api = useElectronAPI();
const autocompleteInput = ref(null);
const searchValue = ref('');
const autocomplete = ref(null);
const googleMapsAvailable = ref(false);
const ausPostAvailable = ref(false);
const googleMapsApiKey = ref('');
const ausPostMode = ref(false);
const ausPostResults = ref([]);
const searching = ref(false);

/**
 * Load Google Maps script dynamically
 */
function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve);
      existingScript.addEventListener('error', reject);
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', resolve);
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Places Autocomplete
 */
async function initAutocomplete() {
  try {
    // Get API keys from settings
    const apiKeys = await api.settings.getApiKeys();
    googleMapsApiKey.value = apiKeys?.googleMapsApiKey || '';
    const ausPostApiKey = apiKeys?.ausPostApiKey || '';

    // Check which services are available
    googleMapsAvailable.value = !!googleMapsApiKey.value;
    ausPostAvailable.value = !!ausPostApiKey;

    // Default to Australia Post if available and Google Maps isn't
    if (ausPostAvailable.value && !googleMapsAvailable.value) {
      ausPostMode.value = true;
      console.log('Using Australia Post for address lookup');
      return; // Don't load Google Maps at all
    }

    // If no API keys configured at all, return
    if (!googleMapsApiKey.value && !ausPostApiKey) {
      console.warn('No address lookup services configured');
      return;
    }

    // Only load Google Maps if available and has a valid key
    if (googleMapsAvailable.value && googleMapsApiKey.value && googleMapsApiKey.value.length > 10) {
      // Load Google Maps script
      await loadGoogleMapsScript(googleMapsApiKey.value);

      if (!autocompleteInput.value) {
        console.error('Autocomplete input ref not available');
        return;
      }

      // Initialize autocomplete
      const options = {
        componentRestrictions: { country: props.countryCode },
        fields: ['address_components', 'formatted_address', 'geometry', 'name']
      };

      autocomplete.value = new google.maps.places.Autocomplete(
        autocompleteInput.value,
        options
      );

      // Listen for place selection
      autocomplete.value.addListener('place_changed', handlePlaceChanged);
    }

  } catch (error) {
    console.error('Error initializing address autocomplete:', error);
  }
}

/**
 * Parse address components from Google Places result
 */
function parseAddressComponents(addressComponents) {
  const components = {
    streetNumber: '',
    route: '',
    locality: '',
    state: '',
    postcode: '',
    country: ''
  };

  addressComponents.forEach(component => {
    const types = component.types;

    if (types.includes('street_number')) {
      components.streetNumber = component.long_name;
    }
    if (types.includes('route')) {
      components.route = component.long_name;
    }
    if (types.includes('locality')) {
      components.locality = component.long_name;
    }
    if (types.includes('administrative_area_level_1')) {
      components.state = component.short_name; // e.g., "NSW"
    }
    if (types.includes('postal_code')) {
      components.postcode = component.long_name;
    }
    if (types.includes('country')) {
      components.country = component.short_name;
    }
  });

  return components;
}

/**
 * Handle place selection from autocomplete
 */
function handlePlaceChanged() {
  const place = autocomplete.value.getPlace();

  if (!place.address_components) {
    console.warn('No address components available');
    return;
  }

  // Parse address components
  const components = parseAddressComponents(place.address_components);

  // Build address line from street number and route
  const addressLine = [components.streetNumber, components.route]
    .filter(Boolean)
    .join(' ');

  // Emit parsed address
  const parsedAddress = {
    fullAddress: place.formatted_address || '',
    address: addressLine,
    town: components.locality,
    state: components.state,
    postcode: components.postcode,
    country: components.country,
    name: place.name || ''
  };

  emit('addressSelected', parsedAddress);
}

/**
 * Handle Enter key press
 */
function handleEnterKey(event) {
  // Prevent form submission
  event.preventDefault();

  // Trigger search if in Australia Post mode
  if (ausPostMode.value && searchValue.value) {
    searchAusPost();
  }
}

/**
 * Handle keyup events for Australia Post search
 */
function handleSearchKeyup(event) {
  // Clear results when typing in Australia Post mode
  if (ausPostMode.value && ausPostResults.value.length > 0) {
    ausPostResults.value = [];
  }
}

/**
 * Search Australia Post for addresses
 */
async function searchAusPost() {
  if (!searchValue.value || searchValue.value.length < 3) {
    return;
  }

  searching.value = true;
  ausPostResults.value = [];

  try {
    const result = await api.ausPost.searchAddresses(searchValue.value);

    if (result.success && result.data) {
      ausPostResults.value = result.data;
    } else {
      console.warn('Australia Post search failed:', result.message);
    }
  } catch (error) {
    console.error('Australia Post search error:', error);
  } finally {
    searching.value = false;
  }
}

/**
 * Select an Australia Post result
 */
function selectAusPostResult(result) {
  // Parse Australia Post result into standard format
  const parsedAddress = {
    fullAddress: result.formattedAddress,
    address: '', // Australia Post doesn't provide street address
    town: result.locality,
    state: result.state,
    postcode: result.postcode,
    country: 'AU',
    name: result.locality
  };

  // Clear results and search
  ausPostResults.value = [];
  searchValue.value = '';

  emit('addressSelected', parsedAddress);
}

/**
 * Clear search input
 */
function clearSearch() {
  searchValue.value = '';
  ausPostResults.value = [];
  emit('addressCleared');
}

// Initialize on mount
onMounted(() => {
  initAutocomplete();
});
</script>

<style scoped>
.address-autocomplete {
  margin-bottom: 1rem;
}

/* Override Google's autocomplete dropdown z-index if needed */
:deep(.pac-container) {
  z-index: 10000;
}
</style>
