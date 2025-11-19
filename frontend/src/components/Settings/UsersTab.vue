<template>
  <div class="users-tab">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">User Management</h5>
      <button class="btn btn-primary btn-sm" @click="showAddUser">
        <i class="bi bi-plus-lg me-1"></i>
        Add User
      </button>
    </div>

    <!-- Users List -->
    <div class="card">
      <div class="card-body">
        <div v-if="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>

        <div v-else-if="users.length === 0" class="text-center text-muted py-5">
          <i class="bi bi-people" style="font-size: 3rem;"></i>
          <p class="mt-3">No users configured yet</p>
          <button class="btn btn-primary" @click="showAddUser">
            Add Your First User
          </button>
        </div>

        <div v-else class="table-responsive">
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th style="width: 50px;"></th>
                <th>Username</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Security Level</th>
                <th>Status</th>
                <th style="width: 120px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.username"
                :class="{ 'table-primary': user.username === currentUserId }"
              >
                <td class="text-center">
                  <i
                    v-if="user.username === currentUserId"
                    class="bi bi-person-check-fill text-primary"
                    title="Current User"
                  ></i>
                </td>
                <td>
                  <strong>{{ user.username }}</strong>
                  <span v-if="user.username === currentUserId" class="badge bg-primary ms-2">
                    Current
                  </span>
                </td>
                <td>{{ user.fullName || '-' }}</td>
                <td>{{ user.email || '-' }}</td>
                <td>
                  <span class="badge" :class="getSecurityLevelClass(user.securityLevel)">
                    {{ getSecurityLevelLabel(user.securityLevel) }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge"
                    :class="user.active ? 'bg-success' : 'bg-secondary'"
                  >
                    {{ user.active ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>
                  <div class="btn-group btn-group-sm">
                    <button
                      class="btn btn-outline-secondary"
                      @click="editUser(user)"
                      title="Edit user"
                    >
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      class="btn btn-outline-danger"
                      @click="confirmDeleteUser(user)"
                      title="Delete user"
                      :disabled="user.username === currentUserId"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- User Edit Modal -->
    <div
      class="modal fade"
      :class="{ show: showModal }"
      :style="{ display: showModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editMode ? 'Edit User' : 'Add User' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="saveUserForm">
              <!-- Basic Information -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">
                    Username (User ID) <span class="text-danger">*</span>
                    <span v-if="editMode" class="text-muted small">(cannot be changed)</span>
                  </label>
                  <input
                    v-model="formData.username"
                    type="text"
                    class="form-control"
                    maxlength="8"
                    :disabled="editMode"
                    required
                  />
                  <small class="form-text text-muted">
                    Login ID (max 8 characters)
                  </small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Full Name</label>
                  <input v-model="formData.fullName" type="text" class="form-control" />
                </div>
              </div>

              <!-- Password -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">
                    Password (max 8 characters)
                    <span v-if="!editMode" class="text-danger">*</span>
                    <span v-if="editMode" class="text-muted small">(leave blank to keep current)</span>
                  </label>
                  <div class="input-group">
                    <input
                      v-model="formData.password"
                      :type="showPassword ? 'text' : 'password'"
                      class="form-control"
                      maxlength="8"
                      :required="!editMode"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="showPassword = !showPassword"
                      tabindex="-1"
                    >
                      <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                    </button>
                  </div>
                  <small class="form-text text-muted">
                    Stored as plain text (database limit: 8 chars)
                  </small>
                </div>
                <div class="col-md-6">
                  <label class="form-label">
                    Confirm Password
                    <span v-if="!editMode" class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <input
                      v-model="passwordConfirmation"
                      :type="showPasswordConfirm ? 'text' : 'password'"
                      class="form-control"
                      maxlength="8"
                      :required="!editMode"
                    />
                    <button
                      type="button"
                      class="btn btn-outline-secondary"
                      @click="showPasswordConfirm = !showPasswordConfirm"
                      tabindex="-1"
                    >
                      <i :class="showPasswordConfirm ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                    </button>
                  </div>
                  <small v-if="formData.password && passwordConfirmation && formData.password !== passwordConfirmation" class="form-text text-danger">
                    <i class="bi bi-exclamation-triangle me-1"></i>
                    Passwords do not match
                  </small>
                  <small v-else-if="formData.password && passwordConfirmation && formData.password === passwordConfirmation" class="form-text text-success">
                    <i class="bi bi-check-circle me-1"></i>
                    Passwords match
                  </small>
                </div>
              </div>

              <!-- Email and Phone -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input v-model="formData.email" type="email" class="form-control" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Phone Number</label>
                  <input
                    v-model="formData.phone"
                    type="tel"
                    class="form-control"
                    maxlength="20"
                    placeholder="e.g., 0412 345 678"
                  />
                </div>
              </div>

              <!-- Security and Status -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Security Level</label>
                  <select v-model.number="formData.securityLevel" class="form-select">
                    <option :value="0">None (0)</option>
                    <option :value="1">Read Only (1)</option>
                    <option :value="2">Standard User (2)</option>
                    <option :value="3">Power User (3)</option>
                    <option :value="4">Administrator (4)</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label d-block">Status</label>
                  <div class="form-check form-switch mt-2">
                    <input
                      v-model="formData.active"
                      class="form-check-input"
                      type="checkbox"
                      id="userActive"
                    />
                    <label class="form-check-label" for="userActive">
                      User Active
                    </label>
                  </div>
                </div>
              </div>

              <!-- Permissions -->
              <div class="mb-3">
                <label class="form-label">Job Permissions</label>
                <div class="row">
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.jobClear"
                        class="form-check-input"
                        type="checkbox"
                        id="jobClear"
                      />
                      <label class="form-check-label" for="jobClear">
                        Job Clear
                      </label>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.jobView"
                        class="form-check-input"
                        type="checkbox"
                        id="jobView"
                      />
                      <label class="form-check-label" for="jobView">
                        Job View
                      </label>
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-check">
                      <input
                        v-model="formData.jobChange"
                        class="form-check-input"
                        type="checkbox"
                        id="jobChange"
                      />
                      <label class="form-check-label" for="jobChange">
                        Job Change
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Budget Levels -->
              <div class="mb-3">
                <label class="form-label">Budget Levels</label>
                <div class="row">
                  <div class="col-md-4">
                    <label class="form-label small">Level 1</label>
                    <input
                      v-model.number="formData.budgetLevel1"
                      type="number"
                      class="form-control"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small">Level 2</label>
                    <input
                      v-model.number="formData.budgetLevel2"
                      type="number"
                      class="form-control"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label small">Level 3</label>
                    <input
                      v-model.number="formData.budgetLevel3"
                      type="number"
                      class="form-control"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="mb-3">
                <label class="form-label">Notes</label>
                <textarea v-model="formData.notes" class="form-control" rows="3"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveUserForm"
              :disabled="saving"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-1"></span>
              {{ editMode ? 'Update User' : 'Add User' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div v-if="showModal" class="modal-backdrop fade show"></div>

    <!-- Delete Confirmation Modal -->
    <div
      class="modal fade"
      :class="{ show: showDeleteModal }"
      :style="{ display: showDeleteModal ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Delete</h5>
            <button type="button" class="btn-close btn-close-white" @click="showDeleteModal = false"></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete user <strong>{{ userToDelete?.username }}</strong>?</p>
            <p class="text-danger mb-0">
              <i class="bi bi-exclamation-triangle me-1"></i>
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showDeleteModal = false">
              Cancel
            </button>
            <button type="button" class="btn btn-danger" @click="deleteUser">
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Modal Backdrop -->
    <div v-if="showDeleteModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'UsersTab',
  emits: ['reload'],
  setup(props, { emit }) {
    const api = useElectronAPI();

    const users = ref([]);
    const currentUserId = ref(null);
    const loading = ref(false);
    const saving = ref(false);
    const showModal = ref(false);
    const showDeleteModal = ref(false);
    const editMode = ref(false);
    const userToDelete = ref(null);
    const showPassword = ref(false);
    const showPasswordConfirm = ref(false);
    const passwordConfirmation = ref('');

    const formData = ref({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      securityLevel: 2,
      active: true,
      usePassword: false,
      budgetLimit: 0,
      orderLimit: 0,
      variationLimit: 0,
      etsLimit: 0,
      permissions: null,
      // Legacy fields (not in database)
      jobClear: false,
      jobView: false,
      jobChange: false,
      budgetLevel1: 0,
      budgetLevel2: 0,
      budgetLevel3: 0,
      notes: ''
    });

    async function loadUsers() {
      loading.value = true;
      try {
        const result = await api.settings.getUsers();
        users.value = result;

        const currentUser = await api.settings.getCurrentUser();
        currentUserId.value = currentUser?.username || null;
      } catch (error) {
        console.error('Error loading users:', error);
        alert('Error loading users: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    function getSecurityLevelLabel(level) {
      const labels = {
        0: 'None',
        1: 'Read Only',
        2: 'Standard',
        3: 'Power User',
        4: 'Admin'
      };
      return labels[level] || 'Unknown';
    }

    function getSecurityLevelClass(level) {
      if (level >= 4) return 'bg-danger';
      if (level >= 3) return 'bg-warning';
      if (level >= 2) return 'bg-info';
      if (level >= 1) return 'bg-secondary';
      return 'bg-light text-dark';
    }

    function showAddUser() {
      editMode.value = false;
      formData.value = {
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        securityLevel: 2,
        active: true,
        usePassword: false,
        budgetLimit: 0,
        orderLimit: 0,
        variationLimit: 0,
        etsLimit: 0,
        permissions: null,
        // Legacy fields (not in database)
        jobClear: false,
        jobView: false,
        jobChange: false,
        budgetLevel1: 0,
        budgetLevel2: 0,
        budgetLevel3: 0,
        notes: ''
      };
      passwordConfirmation.value = '';
      showPassword.value = false;
      showPasswordConfirm.value = false;
      showModal.value = true;
    }

    function editUser(user) {
      editMode.value = true;
      // Map user fields to formData (password intentionally left blank)
      formData.value = {
        username: user.username,
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        password: '', // Don't show existing password
        securityLevel: user.securityLevel || 2,
        active: user.active || false,
        usePassword: user.usePassword || false,
        budgetLimit: user.budgetLimit || 0,
        orderLimit: user.orderLimit || 0,
        variationLimit: user.variationLimit || 0,
        etsLimit: user.etsLimit || 0,
        permissions: user.permissions || null,
        // These fields don't exist in database but are in formData
        jobClear: false,
        jobView: false,
        jobChange: false,
        budgetLevel1: 0,
        budgetLevel2: 0,
        budgetLevel3: 0,
        notes: ''
      };
      passwordConfirmation.value = '';
      showPassword.value = false;
      showPasswordConfirm.value = false;
      showModal.value = true;
    }

    function closeModal() {
      showModal.value = false;
      editMode.value = false;
    }

    async function saveUserForm() {
      // Validate password confirmation
      if (!editMode.value && formData.value.password !== passwordConfirmation.value) {
        alert('Passwords do not match. Please check and try again.');
        return;
      }

      if (editMode.value && formData.value.password && formData.value.password !== passwordConfirmation.value) {
        alert('Passwords do not match. Please check and try again.');
        return;
      }

      saving.value = true;
      try {
        // Don't send empty password on edit
        const dataToSave = { ...formData.value };
        if (editMode.value && !dataToSave.password) {
          delete dataToSave.password;
        }

        console.log('Saving user data:', {
          username: dataToSave.username,
          fullName: dataToSave.fullName,
          hasPassword: !!dataToSave.password,
          passwordLength: dataToSave.password?.length,
          active: dataToSave.active,
          securityLevel: dataToSave.securityLevel
        });

        await api.settings.saveUser(dataToSave);
        await loadUsers();
        closeModal();
        emit('reload');
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Error saving user: ' + error.message);
      } finally {
        saving.value = false;
      }
    }

    function confirmDeleteUser(user) {
      userToDelete.value = user;
      showDeleteModal.value = true;
    }

    async function deleteUser() {
      try {
        await api.settings.deleteUser(userToDelete.value.username);
        await loadUsers();
        showDeleteModal.value = false;
        userToDelete.value = null;
        emit('reload');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
      }
    }

    onMounted(() => {
      loadUsers();
    });

    return {
      users,
      currentUserId,
      loading,
      saving,
      showModal,
      showDeleteModal,
      editMode,
      formData,
      userToDelete,
      showPassword,
      showPasswordConfirm,
      passwordConfirmation,
      getSecurityLevelLabel,
      getSecurityLevelClass,
      showAddUser,
      editUser,
      closeModal,
      saveUserForm,
      confirmDeleteUser,
      deleteUser
    };
  }
};
</script>

<style scoped>
.users-tab {
  max-width: 1200px;
}

.table tbody tr {
  cursor: default;
}

.table tbody tr.table-primary {
  background-color: rgba(13, 110, 253, 0.1);
}

.modal.show {
  display: block;
}

.modal-backdrop {
  opacity: 0.5;
}
</style>
