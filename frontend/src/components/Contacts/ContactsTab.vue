<template>
  <div class="contacts-tab">
    <div class="container-fluid">
      <!-- Header -->
      <div class="row mb-3">
        <div class="col-md-8">
          <h4>Contacts Management</h4>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-primary" @click="openAddModal">
            <i class="bi bi-plus-circle"></i> Add Contact
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="row mb-3">
        <div class="col-md-4">
          <input
            v-model="searchTerm"
            type="text"
            class="form-control"
            placeholder="Search contacts (all words, any order)..."
          />
          <small class="text-muted">Searches name, code, phone, email, town</small>
        </div>
        <div class="col-md-3">
          <select v-model="filterGroup" class="form-select">
            <option value="">All Groups</option>
            <option v-for="group in contactGroups" :key="group.value" :value="group.value">
              {{ group.label }}
            </option>
          </select>
        </div>
        <div class="col-md-2">
          <div class="form-check mt-2">
            <input
              v-model="showSuppliersOnly"
              class="form-check-input"
              type="checkbox"
              id="suppliersOnly"
            />
            <label class="form-check-label" for="suppliersOnly">
              Suppliers Only
            </label>
          </div>
        </div>
        <div class="col-md-2">
          <div class="form-check mt-2">
            <input
              v-model="showDebtorsOnly"
              class="form-check-input"
              type="checkbox"
              id="debtorsOnly"
            />
            <label class="form-check-label" for="debtorsOnly">
              Debtors Only
            </label>
          </div>
        </div>
        <div class="col-md-1 text-end">
          <button class="btn btn-outline-secondary" @click="clearFilters" title="Clear filters">
            <i class="bi bi-x-circle"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading contacts...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> {{ error }}
      </div>

      <!-- Contacts Table -->
      <div v-else class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-dark">
            <tr>
              <th @click="sortBy('Code')" style="cursor: pointer">
                Code <i :class="getSortIcon('Code')"></i>
              </th>
              <th @click="sortBy('Contact')" style="cursor: pointer">
                Contact Name <i :class="getSortIcon('Contact')"></i>
              </th>
              <th>Full Address</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Mobile</th>
              <th>Group</th>
              <th>Type</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredContacts.length === 0">
              <td colspan="9" class="text-center text-muted py-4">
                No contacts found. Click "Add Contact" to create one.
              </td>
            </tr>
            <tr
              v-for="contact in filteredContacts"
              :key="contact.Code"
              @dblclick="openEditModal(contact)"
              style="cursor: pointer"
              :title="'Double-click to edit ' + contact.Contact"
            >
              <td><strong>{{ contact.Code }}</strong></td>
              <td>{{ contact.Contact || '-' }}</td>
              <td>
                <div v-if="getFullAddress(contact)">
                  {{ getFullAddress(contact) }}
                  <a
                    :href="getGoogleMapsUrl(contact)"
                    target="_blank"
                    class="ms-2 text-decoration-none small"
                    title="Open in Google Maps"
                    @click.stop
                  >
                    <i class="bi bi-geo-alt-fill text-primary"></i> Maps
                  </a>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span v-if="contact.Email">
                  <a
                    href="javascript:void(0)"
                    class="text-decoration-none"
                    @click.stop="openEmailModal(contact)"
                    title="Compose email"
                  >
                    <i class="bi bi-envelope me-1"></i>{{ contact.Email }}
                  </a>
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <a v-if="contact.Phone" :href="`tel:${contact.Phone}`" class="text-decoration-none" @click.stop>
                  <i class="bi bi-telephone"></i> {{ contact.Phone }}
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <a v-if="contact.Mobile" :href="`tel:${contact.Mobile}`" class="text-decoration-none" @click.stop>
                  <i class="bi bi-phone"></i> {{ contact.Mobile }}
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>{{ getGroupLabel(contact.Group_) }}</td>
              <td>
                <span v-if="contact.Supplier" class="badge bg-info me-1">Supplier</span>
                <span v-if="contact.Debtor" class="badge bg-warning">Debtor</span>
                <span v-if="!contact.Supplier && !contact.Debtor" class="text-muted">-</span>
              </td>
              <td class="text-end">
                <button
                  class="btn btn-sm btn-outline-primary me-1"
                  @click.stop="openEditModal(contact)"
                  title="Edit contact"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click.stop="confirmDelete(contact)"
                  title="Delete contact"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Results Count -->
      <div v-if="!loading && !error" class="row mt-2">
        <div class="col-md-12 text-muted">
          Showing {{ filteredContacts.length }} of {{ contacts.length }} contacts
        </div>
      </div>
    </div>

    <!-- Add/Edit Contact Modal -->
    <div
      class="modal fade"
      :class="{ show: showModal }"
      :style="{ display: showModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ isEditMode ? 'Edit Contact' : 'Add Contact' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <!-- Tabs -->
            <ul class="nav nav-tabs mb-3">
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'details' }"
                  @click="activeTab = 'details'"
                  href="javascript:void(0)"
                >
                  <i class="bi bi-person"></i> Details
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'address' }"
                  @click="activeTab = 'address'"
                  href="javascript:void(0)"
                >
                  <i class="bi bi-geo-alt"></i> Address
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'contact' }"
                  @click="activeTab = 'contact'"
                  href="javascript:void(0)"
                >
                  <i class="bi bi-telephone"></i> Contact Info
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'classification' }"
                  @click="activeTab = 'classification'"
                  href="javascript:void(0)"
                >
                  <i class="bi bi-tags"></i> Classification
                </a>
              </li>
            </ul>

            <form @submit.prevent="saveContact" novalidate>
              <!-- Details Tab -->
              <div v-show="activeTab === 'details'">
                <!-- Code and Name -->
                <div class="row mb-3">
                  <div class="col-md-3">
                    <label class="form-label">Code <span class="text-danger">*</span></label>
                    <input
                      v-model="formData.Code"
                      type="text"
                      class="form-control"
                      maxlength="8"
                      :disabled="isEditMode"
                      required
                    />
                    <small class="text-muted">Max 8 characters</small>
                  </div>
                  <div class="col-md-9">
                    <label class="form-label">
                      Name <span class="text-danger">*</span>
                      <button
                        type="button"
                        class="btn btn-sm btn-link p-0 ms-2"
                        @click="toggleABNSearch"
                        title="Search ABR by business name"
                      >
                        <i class="bi bi-search"></i> Search ABR
                      </button>
                    </label>
                    <input
                      v-model="formData.Name"
                      type="text"
                      class="form-control"
                      maxlength="100"
                      required
                    />
                  </div>
                </div>

                <!-- ABN Search Panel -->
                <div v-if="showABNSearch" class="row mb-3">
                  <div class="col-md-12">
                    <div class="card bg-light">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <h6 class="mb-0"><i class="bi bi-search"></i> Search Australian Business Register</h6>
                          <button type="button" class="btn btn-sm btn-outline-secondary" @click="showABNSearch = false">
                            <i class="bi bi-x-lg"></i>
                          </button>
                        </div>
                        <div class="input-group mb-2">
                          <input
                            v-model="abnSearchQuery"
                            @keydown.enter.prevent="searchABN"
                            type="text"
                            class="form-control"
                            placeholder="Enter business name (min 3 characters)..."
                            :disabled="searchingABN"
                          />
                          <button
                            class="btn btn-primary"
                            type="button"
                            @click="searchABN"
                            :disabled="!abnSearchQuery || abnSearchQuery.length < 3 || searchingABN"
                          >
                            <span v-if="searchingABN" class="spinner-border spinner-border-sm me-1"></span>
                            <i v-else class="bi bi-search me-1"></i>
                            Search
                          </button>
                        </div>

                        <!-- Search Results -->
                        <div v-if="abnResults.length > 0" class="list-group mt-2" style="max-height: 200px; overflow-y: auto;">
                          <button
                            v-for="(business, index) in abnResults"
                            :key="index"
                            type="button"
                            class="list-group-item list-group-item-action"
                            @click="selectABNResult(business)"
                          >
                            <div class="d-flex justify-content-between">
                              <strong>{{ business.name }}</strong>
                              <span>
                                <span v-if="business.gstRegistered" class="badge bg-success">GST</span>
                                <span class="badge bg-secondary ms-1">{{ business.state }}</span>
                              </span>
                            </div>
                            <small>ABN: {{ business.abn }}</small>
                          </button>
                        </div>
                        <div v-if="abnSearchError" class="alert alert-warning mt-2 mb-0">{{ abnSearchError }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Contact Person and Dear -->
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Contact Person</label>
                    <input
                      v-model="formData.Contact"
                      type="text"
                      class="form-control"
                      maxlength="50"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Dear (Salutation)</label>
                    <input
                      v-model="formData.Dear"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="e.g., John, Mr Smith"
                    />
                  </div>
                </div>
              </div>

              <!-- Address Tab -->
              <div v-show="activeTab === 'address'">
                <!-- Paste Full Address -->
                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">
                      <i class="bi bi-clipboard"></i> Paste Full Address
                      <small class="text-muted ms-2">(e.g., "1 Powdrill Rd, Prestons NSW 2170")</small>
                    </label>
                    <div class="input-group">
                      <input
                        v-model="pasteAddressInput"
                        type="text"
                        class="form-control"
                        placeholder="Paste a full address here to auto-fill fields below..."
                        @paste="onAddressPaste"
                        @keydown.enter.prevent="parseAndFillAddress"
                      />
                      <button
                        type="button"
                        class="btn btn-outline-primary"
                        @click="parseAndFillAddress"
                        :disabled="!pasteAddressInput"
                        title="Parse and fill address fields"
                      >
                        <i class="bi bi-arrow-down-circle"></i> Fill
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline-secondary"
                        @click="pasteAddressInput = ''"
                        :disabled="!pasteAddressInput"
                        title="Clear"
                      >
                        <i class="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <hr class="my-3">

                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">Street Address</label>
                    <textarea
                      v-model="formData.Address"
                      class="form-control"
                      rows="2"
                      maxlength="200"
                      placeholder="Street address..."
                    ></textarea>
                  </div>
                </div>

                <div class="row mb-3">
                  <div class="col-md-5">
                    <label class="form-label">Town/City</label>
                    <input
                      v-model="formData.Town"
                      type="text"
                      class="form-control"
                      maxlength="50"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">State</label>
                    <select v-model="formData.State" class="form-select">
                      <option value="">Select...</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Post Code</label>
                    <input
                      v-model="formData.PostCode"
                      type="text"
                      class="form-control"
                      maxlength="10"
                    />
                  </div>
                </div>

                <!-- Map Link -->
                <div v-if="getFullAddress(formData)" class="row mb-3">
                  <div class="col-md-12">
                    <a
                      :href="getGoogleMapsUrl(formData)"
                      target="_blank"
                      class="btn btn-outline-primary btn-sm"
                    >
                      <i class="bi bi-geo-alt-fill"></i> View in Google Maps
                    </a>
                  </div>
                </div>
              </div>

              <!-- Contact Info Tab -->
              <div v-show="activeTab === 'contact'">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">
                      <i class="bi bi-envelope"></i> Email
                    </label>
                    <input
                      v-model="formData.Email"
                      type="email"
                      class="form-control"
                      maxlength="100"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">
                      <i class="bi bi-telephone"></i> Phone
                    </label>
                    <input
                      v-model="formData.Phone"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                </div>

                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">
                      <i class="bi bi-phone"></i> Mobile
                    </label>
                    <input
                      v-model="formData.Mobile"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">
                      <i class="bi bi-printer"></i> Fax
                    </label>
                    <input
                      v-model="formData.Fax"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                </div>

                <!-- Quick Actions -->
                <div v-if="formData.Email || formData.Phone || formData.Mobile" class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">Quick Actions</label>
                    <div class="d-flex gap-2">
                      <a
                        v-if="formData.Email"
                        href="javascript:void(0)"
                        class="btn btn-outline-primary btn-sm"
                        @click="openEmailModalFromEdit"
                      >
                        <i class="bi bi-envelope"></i> Send Email
                      </a>
                      <a
                        v-if="formData.Phone"
                        :href="`tel:${formData.Phone}`"
                        class="btn btn-outline-success btn-sm"
                      >
                        <i class="bi bi-telephone"></i> Call Phone
                      </a>
                      <a
                        v-if="formData.Mobile"
                        :href="`tel:${formData.Mobile}`"
                        class="btn btn-outline-success btn-sm"
                      >
                        <i class="bi bi-phone"></i> Call Mobile
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Classification Tab -->
              <div v-show="activeTab === 'classification'">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Group</label>
                    <select v-model="formData.Group_" class="form-select">
                      <option v-for="group in contactGroups" :key="group.value" :value="group.value">
                        {{ group.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="row mb-3">
                  <div class="col-md-6">
                    <div class="form-check">
                      <input
                        v-model="formData.Supplier"
                        class="form-check-input"
                        type="checkbox"
                        id="supplierCheck"
                      />
                      <label class="form-check-label" for="supplierCheck">
                        <i class="bi bi-truck"></i> Supplier
                      </label>
                      <small class="d-block text-muted">This contact supplies goods or services</small>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-check">
                      <input
                        v-model="formData.Debtor"
                        class="form-check-input"
                        type="checkbox"
                        id="debtorCheck"
                      />
                      <label class="form-check-label" for="debtorCheck">
                        <i class="bi bi-person-badge"></i> Debtor / Client
                      </label>
                      <small class="d-block text-muted">This contact is a customer or client</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <hr class="my-3">
              <div class="d-flex justify-content-between">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="closeModal"
                  :disabled="saving"
                >
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" :disabled="saving">
                  <span v-if="saving">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving...
                  </span>
                  <span v-else>
                    <i class="bi bi-save"></i> Save Contact
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div v-if="showModal" class="modal-backdrop fade show"></div>

    <!-- Email Compose Modal -->
    <EmailComposeModal
      :show="showEmailModal"
      :contact="emailContact"
      @close="closeEmailModal"
      @sent="onEmailSent"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';
import EmailComposeModal from '@/components/common/EmailComposeModal.vue';

const api = useElectronAPI();

// State
const contacts = ref([]);
const loading = ref(false);
const error = ref(null);
const searchTerm = ref('');
const filterGroup = ref('');
const showSuppliersOnly = ref(false);
const showDebtorsOnly = ref(false);
const sortColumn = ref('Contact');
const sortDirection = ref('asc');

// Modal state
const showModal = ref(false);
const isEditMode = ref(false);
const saving = ref(false);
const activeTab = ref('details');

// ABN Search state
const showABNSearch = ref(false);
const abnSearchQuery = ref('');
const searchingABN = ref(false);
const abnResults = ref([]);
const abnSearchError = ref('');

// Address paste state
const pasteAddressInput = ref('');

// Form data
const formData = ref({
  Code: '',
  Name: '',
  Contact: '',
  Dear: '',
  Address: '',
  Town: '',
  State: '',
  PostCode: '',
  Email: '',
  Phone: '',
  Mobile: '',
  Fax: '',
  Group_: 1,
  Supplier: false,
  Debtor: false
});

// Contact groups (Group_ values from database)
const contactGroups = ref([
  { value: 1, label: 'Individual' },
  { value: 2, label: 'Company' },
  { value: 3, label: 'Supplier' },
  { value: 4, label: 'Client' },
  { value: 5, label: 'Other' }
]);

// Email modal state
const showEmailModal = ref(false);
const emailContact = ref(null);

// Computed
const filteredContacts = computed(() => {
  let filtered = contacts.value;

  // Search filter - match ALL words in ANY order
  if (searchTerm.value) {
    const searchWords = searchTerm.value.toLowerCase().trim().split(/\s+/);

    filtered = filtered.filter(contact => {
      // Combine all searchable fields into one string
      const searchableText = [
        contact.Code,
        contact.Name,
        contact.Email,
        contact.Phone,
        contact.Mobile,
        contact.Town,
        contact.Contact
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Check if ALL search words are present (in any order)
      return searchWords.every(word => searchableText.includes(word));
    });
  }

  // Group filter
  if (filterGroup.value !== '') {
    filtered = filtered.filter(c => c.Group_ === parseInt(filterGroup.value));
  }

  // Supplier filter
  if (showSuppliersOnly.value) {
    filtered = filtered.filter(c => c.Supplier);
  }

  // Debtor filter
  if (showDebtorsOnly.value) {
    filtered = filtered.filter(c => c.Debtor);
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortColumn.value] || '';
    const bVal = b[sortColumn.value] || '';
    const comparison = aVal.toString().localeCompare(bVal.toString());
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });

  return filtered;
});

// Methods
function getGroupLabel(groupValue) {
  const group = contactGroups.value.find(g => g.value === groupValue);
  return group ? group.label : '-';
}

function sortBy(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
}

function getSortIcon(column) {
  if (sortColumn.value !== column) return 'bi bi-arrow-down-up';
  return sortDirection.value === 'asc' ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
}

function clearFilters() {
  searchTerm.value = '';
  filterGroup.value = '';
  showSuppliersOnly.value = false;
  showDebtorsOnly.value = false;
}

// Address helper functions
function getFullAddress(contact) {
  const parts = [];
  if (contact.Address) parts.push(contact.Address.replace(/\n/g, ', '));
  if (contact.Town) parts.push(contact.Town);
  if (contact.State) parts.push(contact.State);
  if (contact.PostCode) parts.push(contact.PostCode);
  return parts.join(', ');
}

function getGoogleMapsUrl(contact) {
  const address = getFullAddress(contact);
  if (!address) return '#';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Email modal functions
function openEmailModal(contact) {
  emailContact.value = contact;
  showEmailModal.value = true;
}

function closeEmailModal() {
  showEmailModal.value = false;
  emailContact.value = null;
}

function onEmailSent(result) {
  console.log('Email sent:', result);
  // Could show a toast notification here
}

function openEmailModalFromEdit() {
  // Create a contact object from formData
  const contactForEmail = {
    Code: formData.value.Code,
    Name: formData.value.Name,
    Email: formData.value.Email,
    Phone: formData.value.Phone,
    Mobile: formData.value.Mobile,
    Contact: formData.value.Contact
  };
  emailContact.value = contactForEmail;
  showEmailModal.value = true;
}

// ABN Search functions
function toggleABNSearch() {
  showABNSearch.value = !showABNSearch.value;
  if (showABNSearch.value && formData.value.Name) {
    // Pre-fill the search query with the contact name
    abnSearchQuery.value = formData.value.Name;
  }
}

async function searchABN() {
  if (!abnSearchQuery.value || abnSearchQuery.value.length < 3) return;

  searchingABN.value = true;
  abnSearchError.value = '';
  abnResults.value = [];

  try {
    // Get API key from settings
    const apiKeys = await api.apiKeys?.get?.() || {};
    const guid = apiKeys.abnLookupGuid || null;

    const result = await api.abnLookup.searchByName(abnSearchQuery.value, guid);

    if (result.success) {
      abnResults.value = result.data || [];
      if (abnResults.value.length === 0) {
        abnSearchError.value = 'No businesses found. Try a different search term.';
      }
    } else {
      abnSearchError.value = result.message || 'Search failed';
    }
  } catch (error) {
    console.error('ABN search error:', error);
    abnSearchError.value = error.message || 'Search failed';
  } finally {
    searchingABN.value = false;
  }
}

function selectABNResult(business) {
  formData.value.Name = business.name;
  if (business.state) {
    formData.value.State = business.state;
  }
  if (business.postcode) {
    formData.value.PostCode = business.postcode;
  }
  showABNSearch.value = false;
  abnSearchQuery.value = '';
  abnResults.value = [];
}

// Address parsing functions
function onAddressPaste(event) {
  // Auto-parse after a short delay to allow the paste to complete
  setTimeout(() => {
    if (pasteAddressInput.value) {
      parseAndFillAddress();
    }
  }, 100);
}

function parseAndFillAddress() {
  const input = pasteAddressInput.value.trim();
  if (!input) return;

  // Australian states
  const states = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

  // Try to parse Australian address format: "Street, Suburb STATE Postcode"
  // Examples:
  // "1 Powdrill Rd, Prestons NSW 2170"
  // "123 Main Street, Sydney NSW 2000"
  // "Unit 5/42 Smith Ave, Melbourne VIC 3000"

  let address = '';
  let town = '';
  let state = '';
  let postcode = '';

  // First, try to extract postcode (4 digits at the end)
  const postcodeMatch = input.match(/\b(\d{4})\s*$/);
  if (postcodeMatch) {
    postcode = postcodeMatch[1];
  }

  // Try to extract state (before postcode)
  let workingInput = input;
  if (postcode) {
    workingInput = input.replace(/\s*\d{4}\s*$/, '').trim();
  }

  // Look for state abbreviation
  const stateRegex = new RegExp(`\\b(${states.join('|')})\\b`, 'i');
  const stateMatch = workingInput.match(stateRegex);
  if (stateMatch) {
    state = stateMatch[1].toUpperCase();
    // Split at state to get address and suburb
    const parts = workingInput.split(stateRegex);
    if (parts.length >= 1) {
      const beforeState = parts[0].trim();

      // Try to split by comma - last part before state is usually the suburb
      const commaParts = beforeState.split(',').map(p => p.trim()).filter(p => p);

      if (commaParts.length >= 2) {
        // Everything except last part is address, last part is suburb
        town = commaParts.pop();
        address = commaParts.join(', ');
      } else if (commaParts.length === 1) {
        // No comma - try to extract suburb as last word(s) before state
        // Common pattern: "123 Street Name Suburb"
        const words = beforeState.split(/\s+/);
        if (words.length >= 2) {
          // Assume last word is suburb if it doesn't look like a street suffix
          const streetSuffixes = ['st', 'street', 'rd', 'road', 'ave', 'avenue', 'dr', 'drive',
                                   'ct', 'court', 'pl', 'place', 'cres', 'crescent', 'way',
                                   'lane', 'ln', 'blvd', 'boulevard', 'pde', 'parade', 'tce', 'terrace'];

          // Find where the street address likely ends
          let splitIndex = words.length;
          for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i].toLowerCase().replace(/[.,]/g, '');
            if (streetSuffixes.includes(word)) {
              splitIndex = i + 1;
              break;
            }
          }

          if (splitIndex < words.length) {
            address = words.slice(0, splitIndex).join(' ');
            town = words.slice(splitIndex).join(' ');
          } else {
            // Fallback - put everything in address
            address = beforeState;
          }
        } else {
          address = beforeState;
        }
      }
    }
  } else {
    // No state found - try simple comma split
    const commaParts = workingInput.split(',').map(p => p.trim()).filter(p => p);
    if (commaParts.length >= 2) {
      town = commaParts.pop();
      address = commaParts.join(', ');
    } else {
      address = workingInput;
    }
  }

  // Fill the form fields
  formData.value.Address = address;
  formData.value.Town = town;
  formData.value.State = state;
  formData.value.PostCode = postcode;

  // Clear the paste input
  pasteAddressInput.value = '';
}

async function loadContacts() {
  loading.value = true;
  error.value = null;

  try {
    // Load contacts (excluding supplier records - those are shown in Suppliers tab)
    // Pass 'CONTACTS' to get only non-supplier records
    const result = await api.contacts.getList('CONTACTS');

    if (result.success) {
      contacts.value = result.data || [];
      console.log(`Loaded ${contacts.value.length} contacts`);
    } else {
      throw new Error(result.error || 'Failed to load contacts');
    }
  } catch (err) {
    console.error('Error loading contacts:', err);
    error.value = err.message || 'Failed to load contacts';
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  isEditMode.value = false;
  activeTab.value = 'details';
  showABNSearch.value = false;
  abnSearchQuery.value = '';
  abnResults.value = [];
  abnSearchError.value = '';
  formData.value = {
    Code: '',
    Name: '',
    Contact: '',
    Dear: '',
    Address: '',
    Town: '',
    State: '',
    PostCode: '',
    Email: '',
    Phone: '',
    Mobile: '',
    Fax: '',
    Group_: 1,
    Supplier: false,
    Debtor: false
  };
  showModal.value = true;
}

function openEditModal(contact) {
  isEditMode.value = true;
  activeTab.value = 'details';
  showABNSearch.value = false;
  abnSearchQuery.value = '';
  abnResults.value = [];
  abnSearchError.value = '';
  formData.value = {
    Code: contact.Code,
    Name: contact.Name || '',
    Contact: contact.Contact || '',
    Dear: contact.Dear || '',
    Address: contact.Address || '',
    Town: contact.Town || '',
    State: contact.State || '',
    PostCode: contact.PostCode || '',
    Email: contact.Email || '',
    Phone: contact.Phone || '',
    Mobile: contact.Mobile || '',
    Fax: contact.Fax || '',
    Group_: contact.Group_ || 1,
    Supplier: contact.Supplier || false,
    Debtor: contact.Debtor || false
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  isEditMode.value = false;
  activeTab.value = 'details';
  showABNSearch.value = false;
}

async function saveContact() {
  // Validate required fields (trim whitespace)
  const code = (formData.value.Code || '').trim();
  const name = (formData.value.Name || '').trim();

  if (!code) {
    activeTab.value = 'details';
    alert('Contact Code is required.');
    return;
  }
  if (!name) {
    activeTab.value = 'details';
    alert('Contact Name is required. Please enter a name on the Details tab.');
    return;
  }

  // Update formData with trimmed values
  formData.value.Code = code;
  formData.value.Name = name;

  saving.value = true;

  try {
    // Convert reactive object to plain object for IPC serialization
    const plainData = {
      Code: formData.value.Code,
      Name: formData.value.Name,
      Contact: formData.value.Contact,
      Dear: formData.value.Dear,
      Address: formData.value.Address,
      Town: formData.value.Town,
      State: formData.value.State,
      PostCode: formData.value.PostCode,
      Email: formData.value.Email,
      Phone: formData.value.Phone,
      Mobile: formData.value.Mobile,
      Fax: formData.value.Fax,
      Group_: formData.value.Group_,
      Supplier: formData.value.Supplier,
      Debtor: formData.value.Debtor
    };

    let result;
    if (isEditMode.value) {
      result = await api.contacts.updateContact(plainData);
    } else {
      result = await api.contacts.createContact(plainData);
    }

    if (result.success) {
      closeModal();
      await loadContacts();
    } else {
      throw new Error(result.message || result.error || 'Failed to save contact');
    }
  } catch (err) {
    console.error('Error saving contact:', err);
    alert(`Error saving contact: ${err.message}`);
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(contact) {
  const confirmed = confirm(
    `Are you sure you want to delete contact "${contact.Name}" (${contact.Code})?\n\n` +
    'This action cannot be undone.'
  );

  if (confirmed) {
    await deleteContact(contact.Code);
  }
}

async function deleteContact(code) {
  try {
    const result = await api.contacts.deleteContact(code);

    if (result.success) {
      await loadContacts();
    } else {
      throw new Error(result.error || 'Failed to delete contact');
    }
  } catch (err) {
    console.error('Error deleting contact:', err);
    alert(`Error deleting contact: ${err.message}`);
  }
}

// Lifecycle
onMounted(async () => {
  await loadContacts();
});
</script>

<style scoped>
.contacts-tab {
  padding: 20px;
}

.table th {
  background-color: #212529;
  color: white;
}

.table th:hover {
  background-color: #343a40;
}

.badge {
  font-size: 0.75rem;
}

.modal.show {
  display: block;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  background-color: #000;
  opacity: 0.5;
}

.modal {
  z-index: 1050;
}
</style>
