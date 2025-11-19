const Store = require('electron-store');

// Store for import templates (column mappings and configurations)
const store = new Store({
  name: 'import-templates',
  defaults: {
    templates: []
  }
});

/**
 * Get all saved import templates
 */
function getTemplates() {
  return store.get('templates', []);
}

/**
 * Get a specific template by ID
 */
function getTemplate(id) {
  const templates = store.get('templates', []);
  return templates.find(t => t.id === id);
}

/**
 * Save a new template or update existing
 */
function saveTemplate(template) {
  const templates = store.get('templates', []);

  // Generate ID if new template
  if (!template.id) {
    template.id = Date.now().toString();
    template.createdAt = new Date().toISOString();
  }

  template.updatedAt = new Date().toISOString();

  // Check if template with this ID already exists
  const existingIndex = templates.findIndex(t => t.id === template.id);

  if (existingIndex >= 0) {
    // Update existing
    templates[existingIndex] = template;
  } else {
    // Add new
    templates.push(template);
  }

  store.set('templates', templates);
  return template;
}

/**
 * Delete a template
 */
function deleteTemplate(id) {
  const templates = store.get('templates', []);
  const filtered = templates.filter(t => t.id !== id);
  store.set('templates', filtered);
  return { success: true };
}

/**
 * Reset all templates
 */
function resetTemplates() {
  store.set('templates', []);
}

module.exports = {
  getTemplates,
  getTemplate,
  saveTemplate,
  deleteTemplate,
  resetTemplates
};
