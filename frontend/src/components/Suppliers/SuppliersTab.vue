<template>
  <div class="suppliers-tab">
    <div class="container-fluid">
      <!-- Header -->
      <div class="row mb-3">
        <div class="col-md-6">
          <h4>Suppliers Management</h4>
          <p class="text-muted mb-0">
            <strong>{{ filteredSuppliers.length }}</strong>
            <span v-if="filteredSuppliers.length !== suppliers.length">
              of <strong>{{ suppliers.length }}</strong>
            </span>
            supplier<span v-if="filteredSuppliers.length !== 1">s</span>
            <span v-if="filteredSuppliers.length !== suppliers.length" class="text-primary">
              (filtered)
            </span>
          </p>
        </div>
        <div class="col-md-6 text-end">
          <button class="btn btn-outline-success me-2" @click="exportSuppliers">
            <i class="bi bi-download"></i> Export CSV
          </button>
          <button class="btn btn-outline-primary me-2" @click="openImportModal">
            <i class="bi bi-upload"></i> Import CSV
          </button>
          <button class="btn btn-primary" @click="openAddModal">
            <i class="bi bi-plus-circle"></i> Add Supplier
          </button>
        </div>
      </div>

      <!-- Filter Controls -->
      <div class="row mb-2">
        <div class="col-md-4">
          <label class="form-label">Search</label>
          <div class="input-group">
            <input
              v-model="searchTerm"
              type="text"
              class="form-control"
              placeholder="Search suppliers..."
            />
            <button class="btn btn-outline-secondary" @click="clearFilters" title="Clear filters">
              <i class="bi bi-x-circle"></i> Clear
            </button>
          </div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Supplier Group</label>
          <select v-model="filterGroup" class="form-select">
            <option :value="null">All Groups</option>
            <option v-for="group in supplierGroups" :key="group.Code" :value="group.Code">
              {{ group.Name }}
            </option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">GST Status</label>
          <select v-model="gstFilter" class="form-select">
            <option value="all">All Suppliers</option>
            <option value="gst-only">GST Registered</option>
            <option value="non-gst">Not GST Registered</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label d-block">&nbsp;</label>
          <div class="form-check">
            <input
              v-model="showArchived"
              class="form-check-input"
              type="checkbox"
              id="showArchived"
            />
            <label class="form-check-label" for="showArchived">
              Show Archived
            </label>
          </div>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-12">
          <small class="text-muted">Search filters: name, code, phone, email, town</small>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading suppliers...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-danger">
        <i class="bi bi-exclamation-triangle"></i> {{ error }}
      </div>

      <!-- Suppliers Table -->
      <div v-else class="table-responsive">
        <table class="table table-hover table-striped">
          <thead class="table-dark">
            <tr>
              <th @click="sortBy('Code')" style="cursor: pointer">
                Code <i :class="getSortIcon('Code')"></i>
              </th>
              <th @click="sortBy('Name')" style="cursor: pointer">
                Name <i :class="getSortIcon('Name')"></i>
              </th>
              <th>Full Address</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Mobile</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredSuppliers.length === 0">
              <td colspan="8" class="text-center text-muted py-4">
                No suppliers found. Click "Add Supplier" to create one.
              </td>
            </tr>
            <tr
              v-for="supplier in filteredSuppliers"
              :key="supplier.Code"
              :class="{ 'table-secondary': supplier.Archived }"
              @dblclick="openEditModal(supplier)"
              style="cursor: pointer"
              :title="'Double-click to edit ' + supplier.Name"
            >
              <td><strong>{{ supplier.Code }}</strong></td>
              <td>{{ supplier.Name }}</td>
              <td>
                <div v-if="getFullAddress(supplier)">
                  {{ getFullAddress(supplier) }}
                  <a
                    :href="getGoogleMapsUrl(supplier)"
                    target="_blank"
                    class="ms-2 text-decoration-none small"
                    title="Open in Google Maps"
                  >
                    <i class="bi bi-geo-alt-fill text-primary"></i> Maps
                  </a>
                </div>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <a v-if="supplier.Email" :href="`mailto:${supplier.Email}`" class="text-decoration-none">
                  {{ supplier.Email }}
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <a v-if="supplier.Phone" :href="`tel:${supplier.Phone}`" class="text-decoration-none">
                  <i class="bi bi-telephone"></i> {{ supplier.Phone }}
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <a v-if="supplier.Mobile" :href="`tel:${supplier.Mobile}`" class="text-decoration-none">
                  <i class="bi bi-phone"></i> {{ supplier.Mobile }}
                </a>
                <span v-else class="text-muted">-</span>
              </td>
              <td>
                <span v-if="supplier.GST" class="badge bg-success me-1">GST</span>
                <span v-if="supplier.Archived" class="badge bg-secondary">Archived</span>
                <span v-if="!supplier.GST && !supplier.Archived" class="text-muted">-</span>
              </td>
              <td class="text-end">
                <button
                  class="btn btn-sm btn-outline-primary me-1"
                  @click="openEditModal(supplier)"
                  title="Edit supplier"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  v-if="!supplier.Archived"
                  class="btn btn-sm btn-outline-warning"
                  @click="archiveSupplier(supplier)"
                  title="Archive supplier (preserves history)"
                >
                  <i class="bi bi-archive"></i>
                </button>
                <button
                  v-else
                  class="btn btn-sm btn-outline-success me-1"
                  @click="restoreSupplier(supplier)"
                  title="Restore archived supplier"
                >
                  <i class="bi bi-arrow-counterclockwise"></i>
                </button>
                <button
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteSupplier(supplier)"
                  title="Delete supplier permanently (cannot be undone)"
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
          Showing {{ filteredSuppliers.length }} of {{ suppliers.length }} suppliers
        </div>
      </div>
    </div>

    <!-- Add/Edit Supplier Modal -->
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
              {{ isEditMode ? 'Edit Supplier' : 'Add Supplier' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <!-- Tabs -->
            <ul class="nav nav-tabs mb-3">
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'addresses' }"
                  @click="activeTab = 'addresses'"
                  href="javascript:void(0)"
                >
                  Addresses
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'details' }"
                  @click="activeTab = 'details'"
                  href="javascript:void(0)"
                >
                  Details
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'compliance' }"
                  @click="activeTab = 'compliance'"
                  href="javascript:void(0)"
                >
                  Insurance & Compliance
                </a>
              </li>
              <li class="nav-item">
                <a
                  class="nav-link"
                  :class="{ active: activeTab === 'orders' }"
                  @click="activeTab = 'orders'; loadOrderHistory()"
                  href="javascript:void(0)"
                >
                  Order History
                </a>
              </li>
            </ul>

            <form @submit.prevent="saveSupplier">
              <!-- Addresses Tab -->
              <div v-show="activeTab === 'addresses'">
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
                      Supplier Name <span class="text-danger">*</span>
                      <button
                        type="button"
                        class="btn btn-sm btn-link p-0 ms-2"
                        @click="openBusinessNameSearch"
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

                <!-- Business Name Search Panel -->
                <div v-if="showBusinessNameSearch" class="row mb-3">
                  <div class="col-md-12">
                    <div class="card bg-light">
                      <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <h6 class="mb-0"><i class="bi bi-search"></i> Search Australian Business Register</h6>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-secondary"
                            @click="closeBusinessNameSearch"
                          >
                            <i class="bi bi-x-lg"></i>
                          </button>
                        </div>
                        <div class="input-group mb-2">
                          <input
                            v-model="businessNameQuery"
                            @keydown.enter.prevent="searchBusinessName"
                            @input="businessNameResults = []"
                            type="text"
                            class="form-control"
                            placeholder="Enter business name (min 3 characters)..."
                            :disabled="searchingBusinessName"
                          />
                          <button
                            class="btn btn-outline-secondary"
                            type="button"
                            @click="clearBusinessNameSearch"
                            :disabled="!businessNameQuery"
                            title="Clear search"
                          >
                            <i class="bi bi-x-lg"></i>
                          </button>
                          <button
                            class="btn btn-primary"
                            type="button"
                            @click="searchBusinessName"
                            :disabled="!businessNameQuery || businessNameQuery.length < 3 || searchingBusinessName"
                          >
                            <span v-if="searchingBusinessName" class="spinner-border spinner-border-sm me-1"></span>
                            <i v-else class="bi bi-search me-1"></i>
                            Search
                          </button>
                        </div>
                        <small class="text-info">
                          <i class="bi bi-info-circle"></i>
                          Search for businesses by name to find their ABN and auto-fill details
                        </small>

                        <!-- Search Results -->
                        <div v-if="businessNameResults.length > 0" class="mt-3">
                          <div class="list-group" style="max-height: 300px; overflow-y: auto;">
                            <button
                              v-for="(business, index) in businessNameResults"
                              :key="index"
                              type="button"
                              class="list-group-item list-group-item-action"
                              @click="selectBusinessFromSearch(business)"
                            >
                              <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">{{ business.name }}</h6>
                                <small>
                                  <span v-if="business.gstRegistered" class="badge bg-success">GST</span>
                                  <span v-else class="badge bg-secondary">No GST</span>
                                  <span v-if="!business.isActive" class="badge bg-warning text-dark ms-1">{{ business.abnStatus }}</span>
                                </small>
                              </div>
                              <p class="mb-1">
                                <strong>ABN:</strong> {{ business.abn }}
                                <span v-if="business.state || business.postcode" class="ms-3">
                                  <i class="bi bi-geo-alt"></i>
                                  {{ business.state }} {{ business.postcode }}
                                </span>
                              </p>
                              <small v-if="business.tradingNames && business.tradingNames.length > 0" class="text-muted">
                                Trading names: {{ business.tradingNames.join(', ') }}
                              </small>
                            </button>
                          </div>
                        </div>

                        <!-- No Results -->
                        <div v-else-if="businessNameResults.length === 0 && businessNameQuery && !searchingBusinessName" class="alert alert-warning mt-3 mb-0">
                          <i class="bi bi-exclamation-triangle"></i>
                          No businesses found. Try a different search term or
                          <button type="button" class="btn btn-sm btn-link p-0" @click="clearBusinessNameSearch">clear and try again</button>.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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

                <hr class="my-2">

                <!-- Address Entry -->
                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">Street Address</label>
                    <textarea
                      v-model="formData.Address"
                      class="form-control"
                      rows="2"
                      maxlength="200"
                      placeholder="e.g., 123 Main Street, Unit 5"
                    ></textarea>
                  </div>
                </div>

                <!-- Town, State, PostCode -->
                <div class="row mb-3">
                  <div class="col-md-5">
                    <label class="form-label">
                      Town/City
                      <button
                        type="button"
                        class="btn btn-sm btn-link p-0 ms-2"
                        @click="openSuburbSearch"
                        title="Search for suburb/postcode"
                      >
                        <i class="bi bi-search"></i> Search Suburb
                      </button>
                    </label>
                    <input
                      v-model="formData.Town"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="e.g., Sydney, Parramatta"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">State</label>
                    <select v-model="formData.State" class="form-select">
                      <option value="">Select State</option>
                      <option value="VIC">VIC</option>
                      <option value="NSW">NSW</option>
                      <option value="QLD">QLD</option>
                      <option value="SA">SA</option>
                      <option value="WA">WA</option>
                      <option value="TAS">TAS</option>
                      <option value="NT">NT</option>
                      <option value="ACT">ACT</option>
                    </select>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Post Code</label>
                    <input
                      v-model="formData.PostCode"
                      type="text"
                      class="form-control"
                      maxlength="10"
                      placeholder="e.g., 2000"
                    />
                  </div>
                </div>

                <!-- Suburb Search Dropdown (shown when Search button clicked) -->
                <div v-if="showSuburbSearch" class="row mb-3">
                  <div class="col-md-12">
                    <div class="card">
                      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-search me-2"></i>Suburb/Postcode Search</span>
                        <button type="button" class="btn-close btn-close-white" @click="closeSuburbSearch"></button>
                      </div>
                      <div class="card-body">
                        <div class="input-group mb-3">
                          <input
                            v-model="suburbSearchQuery"
                            type="text"
                            class="form-control"
                            placeholder="Type suburb name or postcode..."
                            @keydown.enter.prevent="searchSuburb"
                            @input="suburbResults = []"
                          />
                          <button
                            v-if="suburbSearchQuery"
                            class="btn btn-outline-secondary"
                            type="button"
                            @click="clearSuburbSearch"
                            title="Clear search"
                          >
                            <i class="bi bi-x-lg"></i>
                          </button>
                          <button
                            class="btn btn-primary"
                            type="button"
                            @click="searchSuburb"
                            :disabled="searchingSuburb || !suburbSearchQuery"
                          >
                            <span v-if="searchingSuburb" class="spinner-border spinner-border-sm me-2"></span>
                            <i v-else class="bi bi-search me-2"></i>
                            Search
                          </button>
                        </div>

                        <!-- Search Results -->
                        <div v-if="suburbResults.length > 0" class="list-group">
                          <button
                            v-for="(result, index) in suburbResults"
                            :key="index"
                            type="button"
                            class="list-group-item list-group-item-action"
                            @click="selectSuburb(result)"
                          >
                            <div class="d-flex w-100 justify-content-between">
                              <strong>{{ result.locality }}</strong>
                              <span class="badge bg-primary">{{ result.postcode }}</span>
                            </div>
                            <small class="text-muted">{{ result.state }}</small>
                          </button>
                        </div>

                        <div v-else-if="suburbSearchQuery && !searchingSuburb" class="text-center py-3">
                          <p class="text-muted mb-2">
                            <i class="bi bi-search"></i><br>
                            No results found for "<strong>{{ suburbSearchQuery }}</strong>"
                          </p>
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-primary"
                            @click="clearSuburbSearch"
                          >
                            <i class="bi bi-arrow-counterclockwise me-1"></i>
                            Clear and Try Again
                          </button>
                        </div>

                        <small class="text-info d-block mt-2">
                          <i class="bi bi-info-circle"></i>
                          Type a suburb name (e.g., "Sydney", "Parramatta") or postcode (e.g., "2000") and click Search.
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Contact Details -->
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
                      placeholder="e.g., John, Ms. Smith"
                    />
                  </div>
                </div>

                <!-- Email, Website, Phone -->
                <div class="row mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Email</label>
                    <input
                      v-model="formData.Email"
                      type="email"
                      class="form-control"
                      maxlength="100"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Phone</label>
                    <input
                      v-model="formData.Phone"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Mobile</label>
                    <input
                      v-model="formData.Mobile"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                </div>

                <!-- Fax -->
                <div class="row mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Fax</label>
                    <input
                      v-model="formData.Fax"
                      type="tel"
                      class="form-control"
                      maxlength="20"
                    />
                  </div>
                </div>

                <!-- Google Maps Preview -->
                <div v-if="currentFormAddress" class="row mt-4">
                  <div class="col-md-12">
                    <div class="card">
                      <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <span><i class="bi bi-geo-alt-fill me-2"></i>Address Preview</span>
                        <a
                          :href="currentFormMapsUrl"
                          target="_blank"
                          class="btn btn-sm btn-light"
                          title="Open in Google Maps"
                        >
                          <i class="bi bi-box-arrow-up-right"></i> Open in Maps
                        </a>
                      </div>
                      <div class="card-body p-0">
                        <iframe
                          :src="currentFormMapsEmbedUrl"
                          width="100%"
                          height="400"
                          style="border:0;"
                          allowfullscreen=""
                          loading="lazy"
                          referrerpolicy="no-referrer-when-downgrade"
                        ></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Details Tab -->
              <div v-show="activeTab === 'details'">
                <h6 class="mb-3">Control Settings</h6>

                <div class="row mb-3">
                  <div class="col-md-3">
                    <div class="form-check">
                      <input
                        v-model="formData.GST"
                        class="form-check-input"
                        type="checkbox"
                        id="gstCheck"
                      />
                      <label class="form-check-label" for="gstCheck">
                        GST Registered
                      </label>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="form-check">
                      <input
                        v-model="formData.Archived"
                        class="form-check-input"
                        type="checkbox"
                        id="archivedCheck"
                      />
                      <label class="form-check-label" for="archivedCheck">
                        Archived
                      </label>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="form-check">
                      <input
                        v-model="formData.PreventOrders"
                        class="form-check-input"
                        type="checkbox"
                        id="preventOrdersCheck"
                      />
                      <label class="form-check-label" for="preventOrdersCheck">
                        Prevent Orders
                      </label>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="form-check">
                      <input
                        v-model="formData.PreventPosting"
                        class="form-check-input"
                        type="checkbox"
                        id="preventPostingCheck"
                      />
                      <label class="form-check-label" for="preventPostingCheck">
                        Prevent Posting
                      </label>
                    </div>
                  </div>
                </div>

                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">ABN (Australian Business Number)</label>
                    <div class="input-group">
                      <input
                        v-model="formData.ABN"
                        type="text"
                        class="form-control"
                        maxlength="20"
                        placeholder="e.g., 12 345 678 901"
                      />
                      <button
                        class="btn btn-outline-primary"
                        type="button"
                        @click="lookupABN"
                        :disabled="!formData.ABN || lookingUpABN"
                        title="Verify ABN details against ABR"
                      >
                        <i class="bi bi-shield-check" v-if="!lookingUpABN"></i>
                        <span class="spinner-border spinner-border-sm" v-else></span>
                        Verify
                      </button>
                    </div>
                    <small class="text-muted">Enter ABN and click Verify to check business name and GST status</small>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Supplier Group</label>
                    <select v-model="formData.Group_" class="form-select">
                      <option :value="null">No Group</option>
                      <option v-for="group in supplierGroups" :key="group.Code" :value="group.Code">
                        {{ group.Name }}
                      </option>
                    </select>
                    <small class="text-muted">Categorize supplier (e.g., Electrical, Plumbing)</small>
                  </div>
                </div>

                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">
                      Sort Text
                      <i
                        class="bi bi-question-circle-fill text-info ms-1"
                        style="cursor: help; font-size: 0.9rem;"
                        title="Add keywords, abbreviations, or alternative names to help find this supplier. Examples: 'ABC elec' for 'ABC Electrical Pty Ltd', trading names, or location-specific notes like 'Melbourne region only'."
                      ></i>
                    </label>
                    <input
                      v-model="formData.SortText"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="Keywords or alternative names for searching"
                    />
                  </div>
                </div>

              </div>

              <!-- Insurance & Compliance Tab -->
              <div v-show="activeTab === 'compliance'">
                <!-- Workers Compensation Insurance -->
                <h6 class="mb-3">
                  <i class="bi bi-shield-check"></i> Workers Compensation Insurance
                </h6>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Workers Comp Policy Number</label>
                    <input
                      v-model="formData.WCompPolicy"
                      type="text"
                      class="form-control"
                      maxlength="32"
                      placeholder="Policy number"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Workers Comp Expiry Date</label>
                    <input
                      v-model="formData.UDF1"
                      type="date"
                      class="form-control"
                    />
                    <small class="text-muted">Using UDF1 for expiry tracking</small>
                  </div>
                </div>
                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">Workers Comp Comments</label>
                    <textarea
                      v-model="formData.WCompComments"
                      class="form-control"
                      rows="2"
                      maxlength="255"
                    ></textarea>
                  </div>
                </div>
                <div class="row mb-4">
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.WComp1"
                        class="form-check-input"
                        type="checkbox"
                        id="wcomp1Check"
                      />
                      <label class="form-check-label" for="wcomp1Check">
                        WComp Type 1
                      </label>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.WComp2"
                        class="form-check-input"
                        type="checkbox"
                        id="wcomp2Check"
                      />
                      <label class="form-check-label" for="wcomp2Check">
                        WComp Type 2
                      </label>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.WComp3"
                        class="form-check-input"
                        type="checkbox"
                        id="wcomp3Check"
                      />
                      <label class="form-check-label" for="wcomp3Check">
                        WComp Type 3
                      </label>
                    </div>
                  </div>
                </div>

                <hr class="my-4">

                <!-- Public Liability Insurance -->
                <h6 class="mb-3">
                  <i class="bi bi-shield-fill-check"></i> Public Liability Insurance
                </h6>
                <div class="row mb-3">
                  <div class="col-md-4">
                    <label class="form-label">Policy Number</label>
                    <input
                      v-model="formData.UDF2"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="Policy number"
                    />
                    <small class="text-muted">Using UDF2</small>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Expiry Date</label>
                    <input
                      v-model="formData.UDF3"
                      type="date"
                      class="form-control"
                    />
                    <small class="text-muted">Using UDF3</small>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Coverage Amount ($)</label>
                    <input
                      v-model="formData.UDF4"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="e.g., 20,000,000"
                    />
                    <small class="text-muted">Using UDF4</small>
                  </div>
                </div>

                <hr class="my-4">

                <!-- Professional Indemnity -->
                <h6 class="mb-3">
                  <i class="bi bi-briefcase-fill"></i> Professional Indemnity Insurance
                </h6>
                <div class="row mb-4">
                  <div class="col-md-6">
                    <label class="form-label">Policy Number</label>
                    <input
                      v-model="formData.UDF5"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="Policy number"
                    />
                    <small class="text-muted">Using UDF5</small>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Expiry Date</label>
                    <input
                      v-model="formData.UDF6"
                      type="date"
                      class="form-control"
                    />
                    <small class="text-muted">Using UDF6</small>
                  </div>
                </div>

                <hr class="my-4">

                <!-- Contractor License -->
                <h6 class="mb-3">
                  <i class="bi bi-award-fill"></i> Contractor License & Qualifications
                </h6>
                <div class="row mb-4">
                  <div class="col-md-4">
                    <label class="form-label">License Number</label>
                    <input
                      v-model="formData.UDF7"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="License number"
                    />
                    <small class="text-muted">Using UDF7</small>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">License Type</label>
                    <input
                      v-model="formData.UDF8"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="e.g., Builder, Electrician"
                    />
                    <small class="text-muted">Using UDF8</small>
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Expiry Date</label>
                    <input
                      v-model="formData.UDF9"
                      type="date"
                      class="form-control"
                    />
                    <small class="text-muted">Using UDF9</small>
                  </div>
                </div>

                <hr class="my-4">

                <!-- Tax & Compliance -->
                <h6 class="mb-3">
                  <i class="bi bi-file-earmark-text"></i> Tax & Compliance
                </h6>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Tax File Number</label>
                    <input
                      v-model="formData.Tax_File_No"
                      type="text"
                      class="form-control"
                      maxlength="50"
                      placeholder="TFN"
                    />
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Variation Certificate</label>
                    <input
                      v-model="formData.Variation_Certificate"
                      type="text"
                      class="form-control"
                      maxlength="16"
                    />
                  </div>
                </div>
                <div class="row mb-3">
                  <div class="col-md-3">
                    <div class="form-check mt-4">
                      <input
                        v-model="formData.ReportableSC"
                        class="form-check-input"
                        type="checkbox"
                        id="reportableSCCheck"
                      />
                      <label class="form-check-label" for="reportableSCCheck">
                        Reportable Subcontractor
                      </label>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <div class="form-check mt-4">
                      <input
                        v-model="formData.PPS"
                        class="form-check-input"
                        type="checkbox"
                        id="ppsCheck"
                      />
                      <label class="form-check-label" for="ppsCheck">
                        Payment Summary (PPS)
                      </label>
                    </div>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">PPS Declaration Date</label>
                    <input
                      v-model="formData.PPS_Dec"
                      type="date"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">PPS Tax Rate (%)</label>
                    <input
                      v-model="formData.PPS_Tax"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g., 10.5"
                    />
                  </div>
                </div>

                <hr class="my-4">

                <!-- Subcontractor Details -->
                <h6 class="mb-3">
                  <i class="bi bi-person-badge"></i> Subcontractor Details
                </h6>
                <div class="row mb-3">
                  <div class="col-md-3">
                    <label class="form-label">First Name</label>
                    <input
                      v-model="formData.SCFirstName"
                      type="text"
                      class="form-control"
                      maxlength="15"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Second Name</label>
                    <input
                      v-model="formData.SCSecName"
                      type="text"
                      class="form-control"
                      maxlength="15"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">Surname</label>
                    <input
                      v-model="formData.SCSurname"
                      type="text"
                      class="form-control"
                      maxlength="30"
                    />
                  </div>
                  <div class="col-md-3">
                    <label class="form-label">SC Type</label>
                    <input
                      v-model="formData.SCType"
                      type="number"
                      class="form-control"
                    />
                  </div>
                </div>
                <div class="row mb-3">
                  <div class="col-md-12">
                    <label class="form-label">Trading Name</label>
                    <input
                      v-model="formData.SCTName"
                      type="text"
                      class="form-control"
                      maxlength="200"
                    />
                  </div>
                </div>
                <div class="row mb-4">
                  <div class="col-md-4">
                    <label class="form-label">Charge Out Rate ($/hr)</label>
                    <input
                      v-model="formData.ChargeOutRate"
                      type="number"
                      step="0.01"
                      class="form-control"
                      placeholder="e.g., 85.50"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Site Days</label>
                    <input
                      v-model="formData.SiteDays"
                      type="number"
                      class="form-control"
                      placeholder="Number of days"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label">Retention (%)</label>
                    <input
                      v-model="formData.Retention"
                      type="number"
                      step="0.1"
                      class="form-control"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>

                <hr class="my-4">

                <!-- Payment & Deductions -->
                <h6 class="mb-3">
                  <i class="bi bi-cash-stack"></i> Payment & Deductions
                </h6>
                <div class="row mb-3">
                  <div class="col-md-6">
                    <label class="form-label">Payment Strategy</label>
                    <select
                      v-model.number="formData.PayStrategy"
                      class="form-select"
                    >
                      <option :value="null">Select payment terms...</option>
                      <option
                        v-for="strategy in paymentStrategies"
                        :key="strategy.StrategyNo"
                        :value="strategy.StrategyNo"
                      >
                        {{ strategy.ShortName }}
                      </option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Pay Deductions</label>
                    <input
                      v-model="formData.PayDeductions"
                      type="text"
                      class="form-control"
                      maxlength="255"
                    />
                  </div>
                </div>
                <div class="row mb-3">
                  <div class="col-md">
                    <label class="form-label">SD1 (%)</label>
                    <input
                      v-model="formData.SD1"
                      type="number"
                      step="0.01"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md">
                    <label class="form-label">SD2 (%)</label>
                    <input
                      v-model="formData.SD2"
                      type="number"
                      step="0.01"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md">
                    <label class="form-label">SD3 (%)</label>
                    <input
                      v-model="formData.SD3"
                      type="number"
                      step="0.01"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md">
                    <label class="form-label">SD4 (%)</label>
                    <input
                      v-model="formData.SD4"
                      type="number"
                      step="0.01"
                      class="form-control"
                    />
                  </div>
                  <div class="col-md">
                    <label class="form-label">SD5 (%)</label>
                    <input
                      v-model="formData.SD5"
                      type="number"
                      step="0.01"
                      class="form-control"
                    />
                  </div>
                </div>

                <div class="alert alert-info mt-3">
                  <i class="bi bi-info-circle"></i>
                  <strong>Note:</strong> Insurance and license fields are currently using User Defined Fields (UDF1-UDF9) for expiry tracking. These can be migrated to dedicated columns in a future update.
                </div>
              </div>

              <!-- Order History Tab -->
              <div v-show="activeTab === 'orders'">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="mb-0">
                    <i class="bi bi-cart-check"></i> Purchase Order History
                  </h6>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-primary"
                    @click="loadOrderHistory"
                  >
                    <i class="bi bi-arrow-clockwise"></i> Refresh
                  </button>
                </div>

                <!-- Loading State -->
                <div v-if="loadingOrders" class="text-center py-5">
                  <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading orders...</span>
                  </div>
                  <p class="mt-2">Loading order history...</p>
                </div>

                <!-- Error State -->
                <div v-else-if="orderError" class="alert alert-danger">
                  <i class="bi bi-exclamation-triangle"></i> {{ orderError }}
                </div>

                <!-- No Orders -->
                <div v-else-if="orderHistory.length === 0" class="alert alert-info">
                  <i class="bi bi-info-circle"></i>
                  No purchase orders found for this supplier.
                </div>

                <!-- Orders Table -->
                <div v-else class="table-responsive">
                  <table class="table table-sm table-hover">
                    <thead class="table-dark">
                      <tr>
                        <th>Order #</th>
                        <th>Job</th>
                        <th>Cost Centre</th>
                        <th>Order Date</th>
                        <th class="text-end">Order Value</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="order in orderHistory" :key="order.OrderNumber">
                        <td><strong>{{ order.OrderNumber }}</strong></td>
                        <td>{{ order.Job }}</td>
                        <td>{{ order.CostCentre }}</td>
                        <td>{{ formatDate(order.OrderDate) }}</td>
                        <td class="text-end">{{ formatCurrency(order.OrderValue) }}</td>
                        <td>
                          <span
                            class="badge"
                            :class="getOrderStatusClass(order)"
                          >
                            {{ getOrderStatus(order) }}
                          </span>
                        </td>
                        <td>
                          <small class="text-muted">
                            <span v-if="order.InvoiceNumber">
                              Inv: {{ order.InvoiceNumber }}
                            </span>
                            <span v-if="order.PercCompleted">
                              | {{ order.PercCompleted }}% Complete
                            </span>
                          </small>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Summary -->
                  <div class="row mt-3">
                    <div class="col-md-12">
                      <div class="card bg-light">
                        <div class="card-body">
                          <div class="row text-center">
                            <div class="col-md-3">
                              <strong>Total Orders:</strong><br>
                              <span class="fs-5">{{ orderHistory.length }}</span>
                            </div>
                            <div class="col-md-3">
                              <strong>Total Value:</strong><br>
                              <span class="fs-5">{{ formatCurrency(totalOrderValue) }}</span>
                            </div>
                            <div class="col-md-3">
                              <strong>Outstanding:</strong><br>
                              <span class="fs-5 text-danger">{{ outstandingCount }}</span>
                            </div>
                            <div class="col-md-3">
                              <strong>Paid:</strong><br>
                              <span class="fs-5 text-success">{{ paidCount }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modal Footer -->
              <div class="row mt-4">
                <div class="col-md-12">
                  <button
                    type="button"
                    class="btn btn-secondary"
                    @click="closeModal"
                    :disabled="saving"
                  >
                    {{ activeTab === 'orders' ? 'Close' : 'Cancel' }}
                  </button>
                  <!-- Hide Save button on read-only Order History tab -->
                  <button
                    v-if="activeTab !== 'orders'"
                    type="submit"
                    class="btn btn-primary ms-2"
                    :disabled="saving"
                  >
                    <span v-if="saving">
                      <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                      Saving...
                    </span>
                    <span v-else>
                      <i class="bi bi-save"></i> Save Supplier
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div v-if="showModal" class="modal-backdrop fade show"></div>

    <!-- Import Modal -->
    <div
      class="modal fade"
      :class="{ show: showImportModal }"
      :style="{ display: showImportModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="bi bi-upload"></i> Import Suppliers from CSV
            </h5>
            <button type="button" class="btn-close" @click="closeImportModal"></button>
          </div>
          <div class="modal-body">
            <!-- File Upload -->
            <div v-if="!importData" class="mb-3">
              <label class="form-label">Select CSV File</label>
              <input
                type="file"
                class="form-control"
                accept=".csv"
                @change="handleFileUpload"
                ref="fileInput"
              />
              <small class="text-muted">
                CSV file should include headers: Code, Name, Email, Phone, etc.
              </small>
            </div>

            <!-- Preview & Validation -->
            <div v-if="importData && !importing">
              <div class="alert alert-info">
                <i class="bi bi-info-circle"></i>
                <strong>{{ importData.length }} suppliers</strong> found in CSV file
              </div>

              <!-- Preview Table -->
              <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                <table class="table table-sm table-bordered">
                  <thead class="table-light sticky-top">
                    <tr>
                      <th>Status</th>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Town</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, index) in importData"
                      :key="index"
                      :class="{
                        'table-danger': row.status === 'error',
                        'table-warning': row.status === 'warning'
                      }"
                    >
                      <td>
                        <i
                          v-if="row.status === 'error'"
                          class="bi bi-x-circle text-danger"
                          :title="row.errors.join(', ')"
                        ></i>
                        <i
                          v-else-if="row.status === 'warning'"
                          class="bi bi-exclamation-triangle text-warning"
                          :title="row.warnings.join(', ')"
                        ></i>
                        <i v-else class="bi bi-check-circle text-success"></i>
                      </td>
                      <td>{{ row.Code }}</td>
                      <td>{{ row.Name }}</td>
                      <td>{{ row.Email }}</td>
                      <td>{{ row.Phone }}</td>
                      <td>{{ row.Town }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Import Options -->
              <div class="mt-3">
                <div class="form-check">
                  <input
                    v-model="importOptions.updateExisting"
                    class="form-check-input"
                    type="checkbox"
                    id="updateExisting"
                  />
                  <label class="form-check-label" for="updateExisting">
                    Update existing suppliers (by Code)
                  </label>
                </div>
                <div class="form-check">
                  <input
                    v-model="importOptions.skipErrors"
                    class="form-check-input"
                    type="checkbox"
                    id="skipErrors"
                  />
                  <label class="form-check-label" for="skipErrors">
                    Skip rows with errors
                  </label>
                </div>
              </div>
            </div>

            <!-- Importing Progress -->
            <div v-if="importing" class="text-center py-4">
              <div class="spinner-border text-primary mb-3" role="status">
                <span class="visually-hidden">Importing...</span>
              </div>
              <div class="progress mb-3" style="height: 25px;">
                <div
                  class="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  :style="{ width: importProgress + '%' }"
                  :aria-valuenow="importProgress"
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {{ importProgress }}%
                </div>
              </div>
              <p>Importing suppliers...</p>
            </div>

            <!-- Import Results -->
            <div v-if="importResults">
              <div class="alert" :class="importResults.failed === 0 ? 'alert-success' : 'alert-warning'">
                <h6><i class="bi bi-check-circle"></i> Import Complete</h6>
                <ul class="mb-0">
                  <li><strong>Total Processed:</strong> {{ importResults.total }}</li>
                  <li><strong>New Suppliers:</strong> {{ importResults.imported }}</li>
                  <li><strong>Updated:</strong> {{ importResults.updated }}</li>
                  <li><strong>Skipped:</strong> {{ importResults.skipped }}</li>
                  <li v-if="importResults.failed > 0" class="text-danger">
                    <strong>Failed:</strong> {{ importResults.failed }}
                  </li>
                </ul>
              </div>

              <!-- Error Details -->
              <div v-if="importResults.errors.length > 0" class="mt-3">
                <h6 class="text-danger">Error Details:</h6>
                <div class="alert alert-danger">
                  <ul class="mb-0 small">
                    <li v-for="(error, index) in importResults.errors" :key="index">
                      <strong>Row {{ error.row }} ({{ error.code }}):</strong> {{ error.message }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              @click="closeImportModal"
            >
              {{ importResults ? 'Close' : 'Cancel' }}
            </button>
            <button
              v-if="importData && !importing && !importResults"
              type="button"
              class="btn btn-primary"
              @click="performImport"
            >
              <i class="bi bi-upload"></i> Import Suppliers
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Modal Backdrop -->
    <div v-if="showImportModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

const api = useElectronAPI();

// State
const suppliers = ref([]);
const loading = ref(false);
const error = ref(null);
const searchTerm = ref('');
const showArchived = ref(false);
const gstFilter = ref('all'); // 'all', 'gst-only', 'non-gst'
const filterGroup = ref(null);
const supplierGroups = ref([]);
const sortColumn = ref('Name');
const sortDirection = ref('asc');

// Modal state
const showModal = ref(false);
const isEditMode = ref(false);
const saving = ref(false);
const activeTab = ref('addresses');
const lookingUpABN = ref(false);

// Suburb search
const showSuburbSearch = ref(false);
const suburbSearchQuery = ref('');
const searchingSuburb = ref(false);
const suburbResults = ref([]);

// Order History
const orderHistory = ref([]);
const loadingOrders = ref(false);
const orderError = ref(null);

// Import/Export
const showImportModal = ref(false);
const importData = ref(null);
const importing = ref(false);
const importProgress = ref(0);
const importResults = ref(null);
const importOptions = ref({
  updateExisting: true,
  skipErrors: true
});
const fileInput = ref(null);

// ABN search and verification
const showBusinessNameSearch = ref(false);
const businessNameQuery = ref('');
const searchingBusinessName = ref(false);
const businessNameResults = ref([]);
const abnVerification = ref(null);

// Address paste state
const pasteAddressInput = ref('');

// Payment Strategies
const paymentStrategies = ref([]);

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
  GST: false,
  Archived: false,
  PreventOrders: false,
  PreventPosting: false,
  ABN: '',
  SortText: '',
  Group_: null,
  Supplier: true,  // Always true for suppliers
  Debtor: false,
  // Insurance & Compliance fields
  WCompPolicy: '',
  WComp1: false,
  WComp2: false,
  WComp3: false,
  WCompComments: '',
  Tax_File_No: '',
  Variation_Certificate: '',
  ReportableSC: false,
  PPS: false,
  PPS_Dec: null,
  PPS_Tax: null,
  SCFirstName: '',
  SCSecName: '',
  SCSurname: '',
  SCTName: '',
  SCType: null,
  ChargeOutRate: null,
  SiteDays: null,
  Retention: null,
  PayStrategy: null,
  PayDeductions: '',
  SD1: null,
  SD2: null,
  SD3: null,
  SD4: null,
  SD5: null,
  // UDF fields for insurance tracking
  UDF1: '',  // WComp Expiry
  UDF2: '',  // Public Liability Policy
  UDF3: '',  // Public Liability Expiry
  UDF4: '',  // Public Liability Coverage
  UDF5: '',  // Prof Indemnity Policy
  UDF6: '',  // Prof Indemnity Expiry
  UDF7: '',  // License Number
  UDF8: '',  // License Type
  UDF9: '',  // License Expiry
  UDF10: '' // Spare
});

// Computed
const filteredSuppliers = computed(() => {
  let filtered = suppliers.value;

  // Note: Archived filtering is handled by backend when loading suppliers

  // GST filter
  if (gstFilter.value === 'gst-only') {
    filtered = filtered.filter(s => s.GST);
  } else if (gstFilter.value === 'non-gst') {
    filtered = filtered.filter(s => !s.GST);
  }
  // 'all' - no filtering

  // Group filter
  if (filterGroup.value !== null) {
    filtered = filtered.filter(s => s.Group_ === filterGroup.value);
  }

  // Search filter - match ALL words in ANY order
  if (searchTerm.value) {
    const searchWords = searchTerm.value.toLowerCase().trim().split(/\s+/);

    filtered = filtered.filter(supplier => {
      // Combine all searchable fields into one string
      const searchableText = [
        supplier.Code,
        supplier.Name,
        supplier.Email,
        supplier.Phone,
        supplier.Mobile,
        supplier.Town,
        supplier.Contact,
        supplier.ABN
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Check if ALL search words are present (in any order)
      return searchWords.every(word => searchableText.includes(word));
    });
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

// Order History computed properties
const totalOrderValue = computed(() => {
  return orderHistory.value.reduce((sum, order) => sum + (order.OrderValue || 0), 0);
});

const outstandingCount = computed(() => {
  return orderHistory.value.filter(order => !order.Invoiced && order.Ordered).length;
});

const paidCount = computed(() => {
  return orderHistory.value.filter(order => order.Invoiced).length;
});

// Import data computed properties
const validRowsCount = computed(() => {
  if (!importData.value) return 0;
  return importData.value.filter(row => row.status === 'success').length;
});

const warningRowsCount = computed(() => {
  if (!importData.value) return 0;
  return importData.value.filter(row => row.status === 'warning').length;
});

const errorRowsCount = computed(() => {
  if (!importData.value) return 0;
  return importData.value.filter(row => row.status === 'error').length;
});

// Computed property for current form address (for Maps preview in modal)
const currentFormAddress = computed(() => {
  const parts = [];

  if (formData.value.Address) parts.push(formData.value.Address);
  if (formData.value.Town) parts.push(formData.value.Town);
  if (formData.value.State) parts.push(formData.value.State);
  if (formData.value.PostCode) parts.push(formData.value.PostCode);

  return parts.length > 0 ? parts.join(', ') : null;
});

// Computed property for current form Maps URL
const currentFormMapsUrl = computed(() => {
  if (!currentFormAddress.value) return '#';
  const encodedAddress = encodeURIComponent(currentFormAddress.value);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
});

// Computed property for current form Maps embed URL
const currentFormMapsEmbedUrl = computed(() => {
  if (!currentFormAddress.value) return '';
  const encodedAddress = encodeURIComponent(currentFormAddress.value);
  // Using Google Maps without API key - standard embed URL
  return `https://maps.google.com/maps?q=${encodedAddress}&output=embed`;
});

// Methods
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
  showArchived.value = false;
  gstFilter.value = 'all';
  filterGroup.value = null;
}

async function loadSuppliers() {
  loading.value = true;
  error.value = null;

  try {
    // Load suppliers from Supplier table
    const result = await api.suppliers.getList(showArchived.value);

    if (result.success) {
      suppliers.value = result.data || [];
      console.log(`Loaded ${suppliers.value.length} suppliers`);
    } else {
      throw new Error(result.message || 'Failed to load suppliers');
    }
  } catch (err) {
    console.error('Error loading suppliers:', err);
    error.value = err.message || 'Failed to load suppliers';
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  isEditMode.value = false;
  activeTab.value = 'addresses';
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
    GST: false,
    Archived: false,
    PreventOrders: false,
    PreventPosting: false,
    ABN: '',
    SortText: '',
    Supplier: true,
    Debtor: false,
    Group_: 3,  // Supplier group
    // Insurance & Compliance
    WCompPolicy: '',
    WComp1: false,
    WComp2: false,
    WComp3: false,
    WCompComments: '',
    Tax_File_No: '',
    Variation_Certificate: '',
    ReportableSC: false,
    PPS: false,
    PPS_Dec: null,
    PPS_Tax: null,
    SCFirstName: '',
    SCSecName: '',
    SCSurname: '',
    SCTName: '',
    SCType: null,
    ChargeOutRate: null,
    SiteDays: null,
    Retention: null,
    PayStrategy: null,
    PayDeductions: '',
    SD1: null,
    SD2: null,
    SD3: null,
    SD4: null,
    SD5: null,
    UDF1: '',
    UDF2: '',
    UDF3: '',
    UDF4: '',
    UDF5: '',
    UDF6: '',
    UDF7: '',
    UDF8: '',
    UDF9: '',
    UDF10: ''
  };
  showModal.value = true;
}

function openEditModal(supplier) {
  isEditMode.value = true;
  activeTab.value = 'addresses';
  formData.value = {
    Code: supplier.Code,
    Name: supplier.Name || '',
    Contact: supplier.Contact || '',
    Dear: supplier.Dear || '',
    Address: supplier.Address || '',
    Town: supplier.Town || '',
    State: supplier.State || '',
    PostCode: supplier.PostCode || '',
    Email: supplier.Email || '',
    Phone: supplier.Phone || '',
    Mobile: supplier.Mobile || '',
    Fax: supplier.Fax || '',
    GST: supplier.GST || false,
    Archived: supplier.Archived || false,
    PreventOrders: supplier.PreventOrders || false,
    PreventPosting: supplier.PreventPosting || false,
    ABN: supplier.ABN || '',
    SortText: supplier.SortText || '',
    Supplier: true,
    Debtor: supplier.Debtor || false,
    Group_: supplier.Group_ || 3,
    // Insurance & Compliance
    WCompPolicy: supplier.WCompPolicy || '',
    WComp1: supplier.WComp1 || false,
    WComp2: supplier.WComp2 || false,
    WComp3: supplier.WComp3 || false,
    WCompComments: supplier.WCompComments || '',
    Tax_File_No: supplier.Tax_File_No || '',
    Variation_Certificate: supplier.Variation_Certificate || '',
    ReportableSC: supplier.ReportableSC || false,
    PPS: supplier.PPS || false,
    PPS_Dec: supplier.PPS_Dec || null,
    PPS_Tax: supplier.PPS_Tax || null,
    SCFirstName: supplier.SCFirstName || '',
    SCSecName: supplier.SCSecName || '',
    SCSurname: supplier.SCSurname || '',
    SCTName: supplier.SCTName || '',
    SCType: supplier.SCType || null,
    ChargeOutRate: supplier.ChargeOutRate || null,
    SiteDays: supplier.SiteDays || null,
    Retention: supplier.Retention || null,
    PayStrategy: supplier.PayStrategy || null,
    PayDeductions: supplier.PayDeductions || '',
    SD1: supplier.SD1 || null,
    SD2: supplier.SD2 || null,
    SD3: supplier.SD3 || null,
    SD4: supplier.SD4 || null,
    SD5: supplier.SD5 || null,
    UDF1: supplier.UDF1 || '',
    UDF2: supplier.UDF2 || '',
    UDF3: supplier.UDF3 || '',
    UDF4: supplier.UDF4 || '',
    UDF5: supplier.UDF5 || '',
    UDF6: supplier.UDF6 || '',
    UDF7: supplier.UDF7 || '',
    UDF8: supplier.UDF8 || '',
    UDF9: supplier.UDF9 || '',
    UDF10: supplier.UDF10 || ''
  };
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  isEditMode.value = false;
}

async function lookupABN() {
  if (!formData.value.ABN) {
    alert('Please enter an ABN first');
    return;
  }

  lookingUpABN.value = true;
  abnVerification.value = null;

  try {
    // Get ABN GUID from settings
    const apiKeys = await api.settings.getApiKeys();
    const abnGuid = apiKeys?.abnLookupGuid || null;

    // Prepare expected data for verification
    const expectedData = {
      name: formData.value.Name,
      gstRegistered: formData.value.GST
    };

    const result = await api.abnLookup.verify(formData.value.ABN, expectedData, abnGuid);

    if (result.success) {
      abnVerification.value = result.data;

      // If verification failed but we got data, show option to populate
      if (!result.data.verified && result.data.abnData) {
        const data = result.data.abnData;
        const verifications = result.data.verifications;

        let message = `ABN Verification Results:\n\n`;

        if (verifications.nameMatch !== undefined) {
          message += `Business Name: ${verifications.nameMatch ? '✓ Match' : '✗ Mismatch'}\n`;
          message += `  Expected: ${verifications.expectedName}\n`;
          message += `  Actual: ${verifications.actualName}\n\n`;
        }

        if (verifications.gstMatch !== undefined) {
          message += `GST Status: ${verifications.gstMatch ? '✓ Match' : '✗ Mismatch'}\n`;
          message += `  Expected: ${verifications.expectedGstStatus ? 'Registered' : 'Not Registered'}\n`;
          message += `  Actual: ${verifications.actualGstStatus ? 'Registered' : 'Not Registered'}\n\n`;
        }

        message += `\nDo you want to update the form with the ABR registered details?`;

        if (confirm(message)) {
          // Populate with ABR data
          formData.value.Name = data.name;
          if (data.address) formData.value.Address = data.address;
          if (data.town) formData.value.Town = data.town;
          if (data.state) formData.value.State = data.state;
          if (data.postcode) formData.value.PostCode = data.postcode;
          formData.value.GST = data.gstRegistered;
          formData.value.ABN = data.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
        }
      } else if (result.data.verified) {
        alert('✓ ABN Verification Successful!\n\nBusiness name and GST status match ABR records.');
      }
    } else {
      alert(`ABN Lookup failed: ${result.message}`);
      abnVerification.value = null;
    }
  } catch (err) {
    console.error('ABN Lookup error:', err);
    alert(`Error looking up ABN: ${err.message}`);
    abnVerification.value = null;
  } finally {
    lookingUpABN.value = false;
  }
}

function openBusinessNameSearch() {
  showBusinessNameSearch.value = true;
  // Auto-populate from Name field if available
  if (formData.value.Name && !businessNameQuery.value) {
    businessNameQuery.value = formData.value.Name;
    // Auto-search if there's a value with minimum length
    if (businessNameQuery.value.trim().length >= 3) {
      searchBusinessName();
    }
  }
}

async function searchBusinessName() {
  if (!businessNameQuery.value || businessNameQuery.value.trim().length < 3) {
    return;
  }

  searchingBusinessName.value = true;
  businessNameResults.value = [];

  try {
    // Get ABN GUID from settings
    const apiKeys = await api.settings.getApiKeys();
    const abnGuid = apiKeys?.abnLookupGuid || null;

    const result = await api.abnLookup.searchByName(businessNameQuery.value, abnGuid);

    if (result.success && result.data) {
      businessNameResults.value = result.data;
      if (result.data.length === 0) {
        alert('No businesses found matching the search criteria.');
      }
    } else {
      alert(`Business name search failed: ${result.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('Business name search error:', err);
    alert(`Error searching for business name: ${err.message}`);
  } finally {
    searchingBusinessName.value = false;
  }
}

function selectBusinessFromSearch(business) {
  // Populate form with selected business
  formData.value.ABN = business.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
  formData.value.Name = business.name;
  if (business.state) formData.value.State = business.state;
  if (business.postcode) formData.value.PostCode = business.postcode;
  formData.value.GST = business.gstRegistered;

  // Clear search
  businessNameResults.value = [];
  businessNameQuery.value = '';
  showBusinessNameSearch.value = false;

  alert(`Selected: ${business.name}\nABN: ${business.abn}\n\nForm has been populated. Please verify and add additional details.`);
}

function clearBusinessNameSearch() {
  businessNameQuery.value = '';
  businessNameResults.value = [];
}

function closeBusinessNameSearch() {
  showBusinessNameSearch.value = false;
  businessNameQuery.value = '';
  businessNameResults.value = [];
}

function openSuburbSearch() {
  showSuburbSearch.value = true;
  // Auto-populate from Town field if available
  if (formData.value.Town && !suburbSearchQuery.value) {
    suburbSearchQuery.value = formData.value.Town;
    // Auto-search if there's a value
    if (suburbSearchQuery.value.trim().length >= 2) {
      searchSuburb();
    }
  }
}

async function searchSuburb() {
  if (!suburbSearchQuery.value || suburbSearchQuery.value.trim().length < 2) {
    return;
  }

  searchingSuburb.value = true;
  suburbResults.value = [];

  try {
    const result = await api.ausPost.searchAddresses(suburbSearchQuery.value);

    if (result.success && result.data) {
      suburbResults.value = result.data;
      console.log(`Found ${result.data.length} suburbs`);
    } else {
      console.warn('Suburb search failed:', result.message);
      alert(result.message || 'Suburb search failed');
    }
  } catch (error) {
    console.error('Suburb search error:', error);
    alert('Error searching suburbs: ' + error.message);
  } finally {
    searchingSuburb.value = false;
  }
}

function selectSuburb(result) {
  // Populate Town, State, and Postcode
  formData.value.Town = result.locality;
  formData.value.State = result.state;
  formData.value.PostCode = result.postcode;

  // Close search
  closeSuburbSearch();

  console.log('Suburb selected:', result);
}

function clearSuburbSearch() {
  // Clear search but keep panel open
  suburbSearchQuery.value = '';
  suburbResults.value = [];
}

function closeSuburbSearch() {
  // Close panel and clear all
  showSuburbSearch.value = false;
  suburbSearchQuery.value = '';
  suburbResults.value = [];
}

async function saveSupplier() {
  saving.value = true;

  try {
    // Create a plain object to avoid IPC serialization issues
    const supplierData = {
      Code: formData.value.Code,
      Name: formData.value.Name,
      Contact: formData.value.Contact || '',
      Dear: formData.value.Dear || '',
      Address: formData.value.Address || '',
      Town: formData.value.Town || '',
      State: formData.value.State || '',
      PostCode: formData.value.PostCode || '',
      Email: formData.value.Email || '',
      Phone: formData.value.Phone || '',
      Mobile: formData.value.Mobile || '',
      Fax: formData.value.Fax || '',
      GST: formData.value.GST || false,
      Archived: formData.value.Archived || false,
      PreventOrders: formData.value.PreventOrders || false,
      PreventPosting: formData.value.PreventPosting || false,
      ABN: formData.value.ABN || '',
      Group_: formData.value.Group_ || null
    };

    let result;
    if (isEditMode.value) {
      result = await api.suppliers.updateSupplier(supplierData);
    } else {
      result = await api.suppliers.createSupplier(supplierData);
    }

    if (result.success) {
      closeModal();
      await loadSuppliers();
    } else {
      throw new Error(result.message || 'Failed to save supplier');
    }
  } catch (err) {
    console.error('Error saving supplier:', err);
    alert(`Error saving supplier: ${err.message}`);
  } finally {
    saving.value = false;
  }
}

// Helper function to get full formatted address
function getFullAddress(supplier) {
  const parts = [];

  if (supplier.Address) parts.push(supplier.Address);
  if (supplier.Town) parts.push(supplier.Town);
  if (supplier.State) parts.push(supplier.State);
  if (supplier.PostCode) parts.push(supplier.PostCode);

  return parts.length > 0 ? parts.join(', ') : null;
}

// Helper function to get Google Maps URL
function getGoogleMapsUrl(supplier) {
  const address = getFullAddress(supplier);
  if (!address) return '#';

  // Encode the address for URL
  const encodedAddress = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
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
    const parts = workingInput.split(stateRegex);
    if (parts.length >= 1) {
      const beforeState = parts[0].trim();
      const commaParts = beforeState.split(',').map(p => p.trim()).filter(p => p);

      if (commaParts.length >= 2) {
        town = commaParts.pop();
        address = commaParts.join(', ');
      } else if (commaParts.length === 1) {
        const words = beforeState.split(/\s+/);
        if (words.length >= 2) {
          const streetSuffixes = ['st', 'street', 'rd', 'road', 'ave', 'avenue', 'dr', 'drive',
                                   'ct', 'court', 'pl', 'place', 'cres', 'crescent', 'way',
                                   'lane', 'ln', 'blvd', 'boulevard', 'pde', 'parade', 'tce', 'terrace'];
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
            address = beforeState;
          }
        } else {
          address = beforeState;
        }
      }
    }
  } else {
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

async function archiveSupplier(supplier) {
  const confirmed = confirm(
    `Archive supplier "${supplier.Name}" (${supplier.Code})?\n\n` +
    'This will hide the supplier from the active list but preserve all historical records.\n' +
    'Archived suppliers can be restored at any time.'
  );

  if (confirmed) {
    try {
      // Create a plain object to avoid IPC serialization issues
      const updatedSupplier = {
        Code: supplier.Code,
        Name: supplier.Name,
        Contact: supplier.Contact,
        Dear: supplier.Dear,
        Address: supplier.Address,
        Town: supplier.Town,
        State: supplier.State,
        PostCode: supplier.PostCode,
        Email: supplier.Email,
        Phone: supplier.Phone,
        Mobile: supplier.Mobile,
        Fax: supplier.Fax,
        GST: supplier.GST,
        Archived: true,  // Set to true
        PreventOrders: supplier.PreventOrders,
        PreventPosting: supplier.PreventPosting,
        ABN: supplier.ABN,
        Group_: supplier.Group_
      };

      const result = await api.suppliers.updateSupplier(updatedSupplier);

      if (result.success) {
        await loadSuppliers();
      } else {
        throw new Error(result.message || 'Failed to archive supplier');
      }
    } catch (err) {
      console.error('Error archiving supplier:', err);
      alert(`Error archiving supplier: ${err.message}`);
    }
  }
}

async function restoreSupplier(supplier) {
  const confirmed = confirm(
    `Restore supplier "${supplier.Name}" (${supplier.Code})?\n\n` +
    'This will make the supplier visible and active again.'
  );

  if (confirmed) {
    try {
      // Create a plain object to avoid IPC serialization issues
      const updatedSupplier = {
        Code: supplier.Code,
        Name: supplier.Name,
        Contact: supplier.Contact,
        Dear: supplier.Dear,
        Address: supplier.Address,
        Town: supplier.Town,
        State: supplier.State,
        PostCode: supplier.PostCode,
        Email: supplier.Email,
        Phone: supplier.Phone,
        Mobile: supplier.Mobile,
        Fax: supplier.Fax,
        GST: supplier.GST,
        Archived: false,  // Set to false
        PreventOrders: supplier.PreventOrders,
        PreventPosting: supplier.PreventPosting,
        ABN: supplier.ABN,
        Group_: supplier.Group_
      };

      const result = await api.suppliers.updateSupplier(updatedSupplier);

      if (result.success) {
        await loadSuppliers();
      } else {
        throw new Error(result.message || 'Failed to restore supplier');
      }
    } catch (err) {
      console.error('Error restoring supplier:', err);
      alert(`Error restoring supplier: ${err.message}`);
    }
  }
}

async function deleteSupplier(supplier) {
  const confirmed = confirm(
    `⚠️ DELETE supplier "${supplier.Name}" (${supplier.Code}) PERMANENTLY?\n\n` +
    'WARNING: This action CANNOT be undone!\n\n' +
    'The supplier will be completely removed from the database.\n' +
    'If the supplier is used in purchase orders or other records, the deletion may fail.\n\n' +
    'Consider ARCHIVING instead to preserve historical records.\n\n' +
    'Are you absolutely sure you want to DELETE this supplier?'
  );

  if (confirmed) {
    // Double confirmation for safety
    const doubleConfirm = confirm(
      `FINAL CONFIRMATION:\n\n` +
      `Delete "${supplier.Name}" (${supplier.Code})?`
    );

    if (doubleConfirm) {
      try {
        const result = await api.suppliers.deleteSupplier(supplier.Code);

        if (result.success) {
          alert(`Supplier "${supplier.Name}" has been permanently deleted.`);
          await loadSuppliers();
        } else {
          throw new Error(result.message || 'Failed to delete supplier');
        }
      } catch (err) {
        console.error('Error deleting supplier:', err);
        alert(`Error deleting supplier:\n\n${err.message}`);
      }
    }
  }
}

async function loadSupplierGroups() {
  try {
    const result = await api.supplierGroups.getList();
    if (result.success) {
      supplierGroups.value = result.data || [];
    }
  } catch (err) {
    console.error('Error loading supplier groups:', err);
  }
}

async function loadPaymentStrategies() {
  try {
    const result = await api.suppliers.getPaymentStrategies();
    if (result.success) {
      paymentStrategies.value = result.data || [];
    }
  } catch (err) {
    console.error('Error loading payment strategies:', err);
  }
}

// Order History functions
async function loadOrderHistory() {
  if (!formData.value.Code) return;

  loadingOrders.value = true;
  orderError.value = null;

  try {
    const result = await api.suppliers.getOrderHistory(formData.value.Code);

    if (result.success) {
      orderHistory.value = result.data || [];
    } else {
      throw new Error(result.message || 'Failed to load order history');
    }
  } catch (err) {
    console.error('Error loading order history:', err);
    orderError.value = err.message || 'Failed to load order history';
  } finally {
    loadingOrders.value = false;
  }
}

function getOrderStatus(order) {
  if (order.Invoiced) {
    return 'Paid';
  } else if (order.OK2Pay) {
    return 'Allocated';
  } else if (order.Ordered) {
    return 'Outstanding';
  } else {
    return 'Draft';
  }
}

function getOrderStatusClass(order) {
  if (order.Invoiced) {
    return 'bg-success';  // Green - Paid
  } else if (order.OK2Pay) {
    return 'bg-info';     // Blue - Allocated
  } else if (order.Ordered) {
    return 'bg-warning';  // Yellow - Outstanding
  } else {
    return 'bg-secondary'; // Gray - Draft
  }
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD'
  }).format(amount);
}

// Import/Export functions
function openImportModal() {
  importData.value = null;
  importResults.value = null;
  importProgress.value = 0;
  importing.value = false;
  showImportModal.value = true;
}

function closeImportModal() {
  showImportModal.value = false;
  importData.value = null;
  importResults.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const csvText = e.target.result;
      const rows = parseCSV(csvText);

      if (rows.length === 0) {
        alert('CSV file is empty');
        return;
      }

      // Validate and prepare data
      const data = rows.map((row, index) => {
        const validation = validateSupplierRow(row);
        return {
          ...row,
          rowNumber: index + 2, // +2 because row 1 is header and index starts at 0
          status: validation.status,
          errors: validation.errors,
          warnings: validation.warnings
        };
      });

      importData.value = data;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert(`Error reading CSV file: ${error.message}`);
    }
  };

  reader.readAsText(file);
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function validateSupplierRow(row) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!row.Code || row.Code.trim() === '') {
    errors.push('Supplier Code is required');
  }
  if (!row.Name || row.Name.trim() === '') {
    errors.push('Supplier Name is required');
  }

  // Validate Code length (max 8 chars based on typical Databuild limits)
  if (row.Code && row.Code.length > 8) {
    errors.push('Supplier Code must be 8 characters or less');
  }

  // Validate email format if provided
  if (row.Email && row.Email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.Email.trim())) {
      warnings.push('Email format may be invalid');
    }
  }

  // Validate ABN format if provided (should be 11 digits)
  if (row.ABN && row.ABN.trim()) {
    const abnDigits = row.ABN.replace(/\s/g, '');
    if (abnDigits.length !== 11 || !/^\d+$/.test(abnDigits)) {
      warnings.push('ABN should be 11 digits');
    }
  }

  // Validate GST field (should be 0 or 1)
  if (row.GST && row.GST !== '0' && row.GST !== '1') {
    warnings.push('GST should be 0 (not registered) or 1 (registered)');
  }

  // Determine status
  let status = 'success';
  if (errors.length > 0) {
    status = 'error';
  } else if (warnings.length > 0) {
    status = 'warning';
  }

  return { status, errors, warnings };
}

async function performImport() {
  if (!importData.value || importData.value.length === 0) {
    alert('No data to import');
    return;
  }

  // Check for errors
  const hasErrors = importData.value.some(row => row.status === 'error');
  if (hasErrors && !importOptions.value.skipErrors) {
    const proceed = confirm(
      'Some rows have errors. Enable "Skip rows with errors" option to continue, or fix the errors in your CSV file.'
    );
    if (!proceed) return;
  }

  importing.value = true;
  importProgress.value = 0;

  const results = {
    total: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // Filter rows based on options
  let rowsToImport = importData.value;
  if (importOptions.value.skipErrors) {
    rowsToImport = importData.value.filter(row => row.status !== 'error');
  }

  results.total = rowsToImport.length;

  for (let i = 0; i < rowsToImport.length; i++) {
    const row = rowsToImport[i];

    try {
      // Prepare supplier data
      const supplierData = {
        Code: row.Code.trim(),
        Name: row.Name.trim(),
        Contact: row.Contact || '',
        Dear: row.Dear || '',
        Address: row.Address || '',
        Town: row.Town || '',
        State: row.State || '',
        PostCode: row.PostCode || '',
        Email: row.Email || '',
        Phone: row.Phone || '',
        Mobile: row.Mobile || '',
        Fax: row.Fax || '',
        GST: row.GST === '1' ? 1 : 0,
        ABN: row.ABN || '',
        Group_: row.Group_ || null,
        Archived: false,
        PreventOrders: row.PreventOrders === '1' ? 1 : 0,
        PreventPosting: row.PreventPosting === '1' ? 1 : 0,
        SortText: row.SortText || ''
      };

      // Check if supplier exists
      const existingResult = await api.suppliers.getSupplier(supplierData.Code);
      const exists = existingResult.success && existingResult.data;

      if (exists && importOptions.value.updateExisting) {
        // Update existing supplier
        const result = await api.suppliers.updateSupplier(supplierData);
        if (result.success) {
          results.updated++;
        } else {
          throw new Error(result.message);
        }
      } else if (exists) {
        // Skip existing supplier
        results.skipped++;
      } else {
        // Create new supplier
        const result = await api.suppliers.createSupplier(supplierData);
        if (result.success) {
          results.imported++;
        } else {
          throw new Error(result.message);
        }
      }
    } catch (error) {
      console.error(`Error importing row ${row.rowNumber}:`, error);
      results.failed++;
      results.errors.push({
        row: row.rowNumber,
        code: row.Code,
        message: error.message
      });
    }

    // Update progress
    importProgress.value = Math.round(((i + 1) / results.total) * 100);
  }

  importing.value = false;
  importResults.value = results;

  // Reload suppliers list
  await loadSuppliers();
}

async function exportSuppliers() {
  try {
    // Use filtered suppliers for export
    const suppliersToExport = filteredSuppliers.value;

    if (suppliersToExport.length === 0) {
      alert('No suppliers to export');
      return;
    }

    // Define CSV headers
    const headers = [
      'Code', 'Name', 'Contact', 'Dear', 'Address', 'Town', 'State', 'PostCode',
      'Email', 'Phone', 'Mobile', 'Fax', 'GST', 'ABN', 'Group_',
      'PreventOrders', 'PreventPosting', 'SortText', 'Archived'
    ];

    // Build CSV content
    let csvContent = headers.join(',') + '\n';

    suppliersToExport.forEach(supplier => {
      const row = headers.map(header => {
        let value = supplier[header];

        // Handle null/undefined
        if (value === null || value === undefined) {
          value = '';
        }

        // Convert boolean/bit fields to 0/1
        if (typeof value === 'boolean') {
          value = value ? '1' : '0';
        }

        // Escape quotes and wrap in quotes if contains comma or newline
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }

        return value;
      });

      csvContent += row.join(',') + '\n';
    });

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `suppliers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting suppliers:', error);
    alert(`Error exporting suppliers: ${error.message}`);
  }
}

// Watchers
// Reload suppliers when showArchived checkbox changes
watch(showArchived, async () => {
  await loadSuppliers();
});

// Lifecycle
onMounted(async () => {
  await loadSuppliers();
  await loadSupplierGroups();
  await loadPaymentStrategies();
});
</script>

<style scoped>
.suppliers-tab {
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

.modal-xl {
  max-width: 1200px;
}

.nav-tabs .nav-link {
  cursor: pointer;
}

.table-secondary {
  opacity: 0.7;
}
</style>
