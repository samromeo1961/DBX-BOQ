<template>
  <div>
    <!-- Email Compose Modal -->
    <div
      class="modal fade"
      :class="{ show: show }"
      :style="{ display: show ? 'block' : 'none' }"
      tabindex="-1"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="bi bi-envelope"></i> Compose Email
            </h5>
            <button type="button" class="btn-close btn-close-white" @click="close"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="sendEmail">
              <!-- To Field -->
              <div class="row mb-3">
                <div class="col-md-1">
                  <label class="form-label fw-bold">To:</label>
                </div>
                <div class="col-md-11">
                  <input
                    v-model="emailData.to"
                    type="email"
                    class="form-control"
                    placeholder="recipient@example.com"
                    required
                  />
                </div>
              </div>

              <!-- CC/BCC Row -->
              <div class="row mb-3">
                <div class="col-md-1">
                  <label class="form-label fw-bold">CC:</label>
                </div>
                <div class="col-md-5">
                  <input
                    v-model="emailData.cc"
                    type="text"
                    class="form-control"
                    placeholder="cc@example.com"
                  />
                </div>
                <div class="col-md-1">
                  <label class="form-label fw-bold">BCC:</label>
                </div>
                <div class="col-md-5">
                  <input
                    v-model="emailData.bcc"
                    type="text"
                    class="form-control"
                    placeholder="bcc@example.com"
                  />
                </div>
              </div>

              <!-- Subject -->
              <div class="row mb-3">
                <div class="col-md-1">
                  <label class="form-label fw-bold">Subject:</label>
                </div>
                <div class="col-md-11">
                  <input
                    v-model="emailData.subject"
                    type="text"
                    class="form-control"
                    placeholder="Email subject"
                    required
                  />
                </div>
              </div>

              <!-- Template & Signature Selection -->
              <div class="row mb-3">
                <div class="col-md-6">
                  <label class="form-label">Template</label>
                  <select v-model="selectedTemplate" class="form-select" @change="applyTemplate">
                    <option value="">-- No Template --</option>
                    <option v-for="template in templates" :key="template.name" :value="template.name">
                      {{ template.name }}
                    </option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Signature</label>
                  <select v-model="selectedSignature" class="form-select" @change="updateBodyWithSignature">
                    <option value="">-- No Signature --</option>
                    <option v-for="sig in signatures" :key="sig.name" :value="sig.name">
                      {{ sig.name }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- Available Tags -->
              <div class="row mb-2">
                <div class="col-md-12">
                  <label class="form-label">Insert Tag:</label>
                  <div class="d-flex flex-wrap gap-1">
                    <button
                      v-for="tag in availableTags"
                      :key="tag.tag"
                      type="button"
                      class="btn btn-sm btn-outline-secondary"
                      @click="insertTag(tag.tag)"
                      :title="tag.description"
                    >
                      {{ tag.label }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Email Body -->
              <div class="row mb-3">
                <div class="col-md-12">
                  <label class="form-label fw-bold">Message:</label>
                  <textarea
                    ref="bodyTextarea"
                    v-model="emailData.body"
                    class="form-control"
                    rows="12"
                    placeholder="Type your message here..."
                    required
                  ></textarea>
                </div>
              </div>

              <!-- Attachments (future) -->
              <div class="row mb-3">
                <div class="col-md-12">
                  <label class="form-label">Attachments</label>
                  <div class="border rounded p-3 bg-light">
                    <span class="text-muted">
                      <i class="bi bi-paperclip"></i> No attachments (attachment support coming soon)
                    </span>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <div class="d-flex justify-content-between w-100">
              <div>
                <span v-if="emailSettings.testMode" class="badge bg-warning text-dark">
                  <i class="bi bi-exclamation-triangle"></i> Test Mode - Will send to {{ emailSettings.testEmail }}
                </span>
              </div>
              <div>
                <button type="button" class="btn btn-secondary me-2" @click="close" :disabled="sending">
                  Cancel
                </button>
                <button type="button" class="btn btn-primary" @click="sendEmail" :disabled="sending || !canSend">
                  <span v-if="sending">
                    <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                    Sending...
                  </span>
                  <span v-else>
                    <i class="bi bi-send"></i> Send Email
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Backdrop -->
    <div v-if="show" class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

const api = useElectronAPI();

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  contact: {
    type: Object,
    default: null
  },
  // Optional context for merge tags (job, order, etc.)
  context: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'sent']);

// Email data
const emailData = ref({
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: ''
});

// State
const sending = ref(false);
const selectedTemplate = ref('');
const selectedSignature = ref('');
const bodyTextarea = ref(null);
const emailSettings = ref({});

// Default templates
const templates = ref([
  {
    name: 'General Inquiry',
    subject: 'Inquiry',
    body: `Dear {{ContactName}},

I hope this email finds you well.

[Your message here]

Kind regards`
  },
  {
    name: 'Quote Request',
    subject: 'Quote Request - {{JobName}}',
    body: `Dear {{ContactName}},

We are requesting a quote for the following job:

Job: {{JobName}} ({{JobNo}})

Please provide your best pricing at your earliest convenience.

Kind regards`
  },
  {
    name: 'Follow Up',
    subject: 'Following Up - {{JobName}}',
    body: `Dear {{ContactName}},

I am following up on our previous correspondence regarding:

Job: {{JobName}} ({{JobNo}})

Please let me know if you require any additional information.

Kind regards`
  },
  {
    name: 'Thank You',
    subject: 'Thank You',
    body: `Dear {{ContactName}},

Thank you for your recent assistance.

[Your message here]

Kind regards`
  }
]);

// Default signatures
const signatures = ref([
  {
    name: 'Default',
    content: `

--
{{UserName}}
{{CompanyName}}
Phone: {{UserPhone}}
Email: {{UserEmail}}`
  },
  {
    name: 'Formal',
    content: `

Best regards,

{{UserName}}
{{UserTitle}}
{{CompanyName}}

Phone: {{UserPhone}}
Email: {{UserEmail}}
Website: {{CompanyWebsite}}`
  },
  {
    name: 'Simple',
    content: `

Thanks,
{{UserName}}`
  }
]);

// Available merge tags
const availableTags = [
  { tag: '{{ContactName}}', label: 'Contact Name', description: 'Contact\'s name' },
  { tag: '{{ContactEmail}}', label: 'Contact Email', description: 'Contact\'s email' },
  { tag: '{{ContactPhone}}', label: 'Contact Phone', description: 'Contact\'s phone' },
  { tag: '{{CompanyName}}', label: 'Company', description: 'Your company name' },
  { tag: '{{JobNo}}', label: 'Job No', description: 'Job number' },
  { tag: '{{JobName}}', label: 'Job Name', description: 'Job name' },
  { tag: '{{UserName}}', label: 'User Name', description: 'Current user\'s name' },
  { tag: '{{UserEmail}}', label: 'User Email', description: 'Current user\'s email' },
  { tag: '{{Today}}', label: 'Today', description: 'Today\'s date' }
];

// Computed
const canSend = computed(() => {
  return emailData.value.to && emailData.value.subject && emailData.value.body;
});

// Watch for contact changes
watch(() => props.contact, (newContact) => {
  if (newContact) {
    emailData.value.to = newContact.Email || '';
    // Apply default template or clear
    if (selectedTemplate.value) {
      applyTemplate();
    }
  }
}, { immediate: true });

// Watch for show changes to load settings
watch(() => props.show, async (isShown) => {
  if (isShown) {
    await loadEmailSettings();
    // Set default signature if available
    if (signatures.value.length > 0 && !selectedSignature.value) {
      selectedSignature.value = signatures.value[0].name;
      updateBodyWithSignature();
    }
  }
});

// Methods
async function loadEmailSettings() {
  try {
    const result = await api.emailSettings.get();
    if (result) {
      emailSettings.value = result;
      // Load custom templates and signatures if stored
      if (result.templates) {
        templates.value = [...templates.value, ...result.templates];
      }
      if (result.signatures) {
        signatures.value = [...signatures.value, ...result.signatures];
      }
    }
  } catch (error) {
    console.error('Error loading email settings:', error);
  }
}

function applyTemplate() {
  const template = templates.value.find(t => t.name === selectedTemplate.value);
  if (template) {
    emailData.value.subject = replaceMergeTags(template.subject);
    emailData.value.body = replaceMergeTags(template.body);
    updateBodyWithSignature();
  }
}

function updateBodyWithSignature() {
  // Remove any existing signature (everything after --)
  let body = emailData.value.body;
  const sigIndex = body.lastIndexOf('\n\n--');
  if (sigIndex !== -1) {
    body = body.substring(0, sigIndex);
  }

  // Add new signature
  const signature = signatures.value.find(s => s.name === selectedSignature.value);
  if (signature) {
    emailData.value.body = body + replaceMergeTags(signature.content);
  } else {
    emailData.value.body = body;
  }
}

function replaceMergeTags(text) {
  if (!text) return text;

  const contact = props.contact || {};
  const context = props.context || {};

  // Format today's date
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const replacements = {
    '{{ContactName}}': contact.Name || contact.Contact || 'Sir/Madam',
    '{{ContactEmail}}': contact.Email || '',
    '{{ContactPhone}}': contact.Phone || contact.Mobile || '',
    '{{CompanyName}}': emailSettings.value.companyName || 'Our Company',
    '{{JobNo}}': context.JobNo || '',
    '{{JobName}}': context.JobName || '',
    '{{UserName}}': emailSettings.value.emailFromName || '',
    '{{UserEmail}}': emailSettings.value.emailFrom || emailSettings.value.smtpUser || '',
    '{{UserPhone}}': emailSettings.value.userPhone || '',
    '{{UserTitle}}': emailSettings.value.userTitle || '',
    '{{CompanyWebsite}}': emailSettings.value.companyWebsite || '',
    '{{Today}}': today
  };

  let result = text;
  for (const [tag, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  return result;
}

function insertTag(tag) {
  const textarea = bodyTextarea.value;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = emailData.value.body;

  emailData.value.body = text.substring(0, start) + tag + text.substring(end);

  // Set cursor position after inserted tag
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(start + tag.length, start + tag.length);
  }, 0);
}

async function sendEmail() {
  if (!canSend.value) return;

  sending.value = true;

  try {
    // Replace any remaining merge tags in the final email
    const finalSubject = replaceMergeTags(emailData.value.subject);
    const finalBody = replaceMergeTags(emailData.value.body);

    const result = await api.email.sendGeneral({
      to: emailData.value.to,
      cc: emailData.value.cc,
      bcc: emailData.value.bcc,
      subject: finalSubject,
      body: finalBody
    });

    if (result.success) {
      alert(`Email sent successfully${result.testMode ? ' (TEST MODE)' : ''}!`);
      emit('sent', result);
      close();
    } else {
      throw new Error(result.error || 'Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    alert(`Error sending email: ${error.message}`);
  } finally {
    sending.value = false;
  }
}

function close() {
  // Reset form
  emailData.value = {
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  };
  selectedTemplate.value = '';
  emit('close');
}

onMounted(async () => {
  await loadEmailSettings();
});
</script>

<style scoped>
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
  max-width: 900px;
}

textarea {
  font-family: inherit;
  resize: vertical;
}

.btn-outline-secondary:hover {
  background-color: #0d6efd;
  color: white;
  border-color: #0d6efd;
}
</style>
