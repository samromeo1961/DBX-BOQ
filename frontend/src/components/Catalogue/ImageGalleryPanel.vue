<template>
  <div class="image-gallery-panel">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h6 class="mb-0">
        <i class="bi bi-images me-2"></i>
        Image Gallery
        <span v-if="priceCode" class="text-muted small ms-2">({{ priceCode }})</span>
      </h6>
      <div class="d-flex gap-2">
        <button
          class="btn btn-outline-secondary btn-sm"
          @click="showCopyImagesModal = true"
          :disabled="!priceCode || loading"
          title="Copy images from another item"
        >
          <i class="bi bi-copy me-1"></i>
          Copy From...
        </button>
        <button
          class="btn btn-primary btn-sm"
          @click="openAddImageDialog"
          :disabled="!priceCode || loading"
        >
          <i class="bi bi-plus-lg me-1"></i>
          Add Image
        </button>
      </div>
    </div>

    <!-- Info Alert -->
    <div class="alert alert-info alert-sm mb-3">
      <i class="bi bi-info-circle me-2"></i>
      <strong>Image Gallery:</strong> Add product photos, specification sheets, diagrams, or supplier catalog pages.
      Images can be viewed in reports and purchase orders. Click any image to view full size.
    </div>

    <!-- Empty State -->
    <div v-if="!priceCode" class="alert alert-warning">
      <i class="bi bi-exclamation-triangle me-2"></i>
      Select a catalogue item to manage its images
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="text-center p-4">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Image Gallery -->
    <div v-else>
      <div v-if="images.length === 0" class="alert alert-secondary text-center">
        <i class="bi bi-image" style="font-size: 3rem; color: #ccc;"></i>
        <p class="mb-0 mt-2">No images added yet</p>
        <button class="btn btn-sm btn-primary mt-2" @click="openAddImageDialog">
          <i class="bi bi-plus-lg me-1"></i>
          Add First Image
        </button>
      </div>

      <div v-else class="image-grid">
        <div
          v-for="(image, index) in images"
          :key="index"
          class="image-card"
          draggable="true"
          @dragstart="onDragStart(index, $event)"
          @dragover.prevent="onDragOver(index, $event)"
          @drop="onDrop(index, $event)"
          @dragend="onDragEnd"
          :class="{ 'dragging': draggedIndex === index, 'drag-over': dragOverIndex === index }"
        >
          <div class="image-thumbnail" @click="openImageModal(image, index)">
            <!-- PDF Thumbnail -->
            <div v-if="isPDF(image.url)" class="pdf-thumbnail">
              <i class="bi bi-file-pdf-fill" style="font-size: 3rem; color: #dc3545;"></i>
              <div class="small mt-2">PDF</div>
            </div>
            <!-- Image Thumbnail -->
            <img
              v-else
              :src="image.url"
              :alt="image.caption || 'Image'"
              @error="onImageError"
              @contextmenu="allowContextMenu"
            >

            <div v-if="image.isPrimary" class="primary-badge">
              <i class="bi bi-star-fill"></i> Primary
            </div>
            <div class="image-overlay">
              <i class="bi bi-zoom-in"></i>
              Click to view
            </div>
          </div>
          <div class="image-info">
            <div class="image-type-badge">
              <i :class="getImageTypeIcon(image.type)"></i>
              {{ image.type || 'Image' }}
            </div>
            <div v-if="image.caption" class="image-caption small text-muted">
              {{ image.caption }}
            </div>
            <div v-if="image.tags" class="image-tags mt-1">
              <span
                v-for="tag in getTagsArray(image.tags)"
                :key="tag"
                class="badge bg-secondary me-1"
                style="font-size: 0.65rem;"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <div class="image-actions">
            <button
              v-if="!image.isPrimary"
              class="btn btn-sm btn-outline-warning"
              @click="setPrimaryImage(index)"
              title="Set as primary image"
            >
              <i class="bi bi-star"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary"
              @click="editImage(index)"
              title="Edit"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-danger"
              @click="deleteImage(index)"
              title="Delete"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Image Dialog -->
    <div v-if="showImageDialog" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editingImageIndex !== null ? 'Edit' : 'Add' }} Image
            </h5>
            <button type="button" class="btn-close" @click="closeImageDialog"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Image Type *</label>
              <select v-model="imageFormData.type" class="form-select" required>
                <option value="Product Photo">Product Photo</option>
                <option value="Specification Sheet">Specification Sheet</option>
                <option value="Installation Diagram">Installation Diagram</option>
                <option value="Supplier Catalog">Supplier Catalog</option>
                <option value="Technical Drawing">Technical Drawing</option>
                <option value="Sample/Color">Sample/Color</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Image Source *</label>

              <!-- Source Type Toggle -->
              <div class="btn-group w-100 mb-2" role="group">
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="imageSourceType === 'url' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="imageSourceType = 'url'"
                >
                  <i class="bi bi-link-45deg me-1"></i>
                  URL
                </button>
                <button
                  type="button"
                  class="btn btn-sm"
                  :class="imageSourceType === 'upload' ? 'btn-primary' : 'btn-outline-primary'"
                  @click="imageSourceType = 'upload'"
                >
                  <i class="bi bi-upload me-1"></i>
                  Upload File
                </button>
              </div>

              <!-- URL Input -->
              <div v-if="imageSourceType === 'url'">
                <input
                  type="url"
                  v-model="imageFormData.url"
                  class="form-control"
                  placeholder="https://example.com/image.jpg or https://supplier.com/spec.pdf"
                  required
                />
                <div class="form-text">
                  Enter a direct link to the image or PDF (jpg, png, gif, webp, pdf)
                </div>
              </div>

              <!-- File Upload -->
              <div v-else>
                <input
                  type="file"
                  ref="fileInput"
                  class="form-control"
                  accept="image/*,.pdf"
                  @change="onFileSelected"
                />
                <div class="form-text">
                  Upload an image (JPG, PNG, GIF, WebP) or PDF file (max 10MB)
                </div>
                <div v-if="uploadedFileName" class="mt-2">
                  <span class="badge bg-success">
                    <i class="bi bi-check-circle me-1"></i>
                    {{ uploadedFileName }} ({{ uploadedFileSize }})
                  </span>
                </div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label">Caption</label>
              <input
                type="text"
                v-model="imageFormData.caption"
                class="form-control"
                placeholder="Optional description..."
              />
            </div>

            <div class="mb-3">
              <label class="form-label">Tags/Labels</label>
              <input
                type="text"
                v-model="imageFormData.tags"
                class="form-control"
                placeholder="e.g., red, brindle, 230mm, north-facing"
              />
              <div class="form-text">
                Add searchable tags separated by commas (helps identify variants)
              </div>
            </div>

            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                v-model="imageFormData.isPrimary"
                id="isPrimaryCheck"
              />
              <label class="form-check-label" for="isPrimaryCheck">
                Set as primary image (used in reports and purchase orders)
              </label>
            </div>

            <!-- Image/PDF Preview -->
            <div v-if="imageFormData.url" class="mt-3">
              <label class="form-label">Preview:</label>
              <div class="preview-container">
                <!-- PDF Preview -->
                <div v-if="isPDF(imageFormData.url)" class="pdf-preview">
                  <i class="bi bi-file-pdf" style="font-size: 4rem; color: #dc3545;"></i>
                  <p class="mt-2 mb-0">PDF File</p>
                  <small class="text-muted">{{ getFileName(imageFormData.url) }}</small>
                </div>
                <!-- Image Preview -->
                <img
                  v-else
                  :src="imageFormData.url"
                  alt="Preview"
                  class="img-fluid"
                  @error="onPreviewError"
                  @contextmenu="allowContextMenu"
                />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeImageDialog">
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-primary"
              @click="saveImage"
              :disabled="!imageFormData.url || !imageFormData.type"
            >
              <i class="bi bi-check-lg me-1"></i>
              {{ editingImageIndex !== null ? 'Update' : 'Add' }} Image
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Image View Modal (Full Size) -->
    <div v-if="showImageModal" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.9);" @click="showImageModal = false">
      <div class="modal-dialog modal-xl modal-dialog-centered">
        <div class="modal-content bg-transparent border-0" @click.stop>
          <div class="modal-header border-0 text-white">
            <div>
              <h5 class="modal-title">
                {{ selectedImage?.type || 'Image' }}
                <span v-if="selectedImage?.isPrimary" class="badge bg-warning ms-2">
                  <i class="bi bi-star-fill"></i> Primary
                </span>
              </h5>
              <p v-if="selectedImage?.caption" class="mb-0 small">{{ selectedImage.caption }}</p>
            </div>
            <button type="button" class="btn-close btn-close-white" @click="showImageModal = false"></button>
          </div>
          <div class="modal-body text-center p-4">
            <!-- PDF Viewer -->
            <div v-if="selectedImage && isPDF(selectedImage.url)" class="pdf-viewer">
              <iframe
                :src="selectedImage.url"
                style="width: 100%; height: 70vh; border: none;"
                @error="onPDFError"
              ></iframe>
            </div>
            <!-- Image Viewer -->
            <img
              v-else
              :src="selectedImage?.url"
              alt="Full size image"
              class="img-fluid"
              style="max-height: 80vh; cursor: zoom-in;"
              @click="openImageInNewTab"
              @contextmenu="allowContextMenu"
            />
            <div class="mt-3">
              <button class="btn btn-light btn-sm me-2" @click="openImageInNewTab">
                <i class="bi bi-box-arrow-up-right me-1"></i>
                Open in New Tab
              </button>
              <button class="btn btn-light btn-sm" @click="copyImageUrl">
                <i class="bi bi-clipboard me-1"></i>
                Copy URL
              </button>
            </div>
          </div>
          <div class="modal-footer border-0 justify-content-center">
            <button
              class="btn btn-outline-light"
              @click="navigateImage(-1)"
              :disabled="selectedImageIndex === 0"
            >
              <i class="bi bi-chevron-left"></i> Previous
            </button>
            <span class="text-white mx-3">
              {{ selectedImageIndex + 1 }} / {{ images.length }}
            </span>
            <button
              class="btn btn-outline-light"
              @click="navigateImage(1)"
              :disabled="selectedImageIndex === images.length - 1"
            >
              Next <i class="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Copy Images Modal -->
    <div v-if="showCopyImagesModal" class="modal d-block" tabindex="-1" style="background-color: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Copy Images from Another Item</h5>
            <button type="button" class="btn-close" @click="showCopyImagesModal = false"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <input
                type="text"
                class="form-control"
                placeholder="Search catalogue items..."
                v-model="copyImagesSearch"
              />
            </div>
            <div class="catalogue-items-list" style="max-height: 400px; overflow-y: auto;">
              <div
                v-for="item in filteredCatalogueItems"
                :key="item.PriceCode"
                class="list-group-item list-group-item-action"
                @click="copyImagesFrom(item)"
                style="cursor: pointer;"
              >
                <div class="d-flex justify-content-between align-items-start">
                  <div class="flex-grow-1">
                    <div class="d-flex align-items-center">
                      <strong>{{ item.PriceCode }}</strong>
                      <span v-if="item.imageCount > 0" class="badge bg-success ms-2">
                        <i class="bi bi-images"></i> {{ item.imageCount }} image(s)
                      </span>
                      <span v-else class="badge bg-secondary ms-2">
                        No images
                      </span>
                    </div>
                    <div class="small text-muted">{{ item.Description }}</div>
                  </div>
                </div>
              </div>
              <div v-if="filteredCatalogueItems.length === 0" class="text-center p-4 text-muted">
                No items found
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showCopyImagesModal = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import { useElectronAPI } from '@/composables/useElectronAPI';

export default {
  name: 'ImageGalleryPanel',
  props: {
    priceCode: {
      type: String,
      default: null
    }
  },
  emits: ['updated'],
  setup(props, { emit }) {
    const api = useElectronAPI();
    const loading = ref(false);
    const images = ref([]);
    const showImageDialog = ref(false);
    const showImageModal = ref(false);
    const showCopyImagesModal = ref(false);
    const editingImageIndex = ref(null);
    const selectedImage = ref(null);
    const selectedImageIndex = ref(0);
    const copyImagesSearch = ref('');
    const catalogueItems = ref([]);
    const imageSourceType = ref('url'); // 'url' or 'upload'
    const fileInput = ref(null);
    const uploadedFileName = ref('');
    const uploadedFileSize = ref('');
    const draggedIndex = ref(null);
    const dragOverIndex = ref(null);

    const imageFormData = ref({
      type: 'Product Photo',
      url: '',
      caption: '',
      tags: '',
      isPrimary: false
    });

    // Filtered catalogue items for copy
    const filteredCatalogueItems = computed(() => {
      if (!copyImagesSearch.value) {
        return catalogueItems.value;
      }

      const query = copyImagesSearch.value.toLowerCase();
      return catalogueItems.value.filter(item =>
        item.PriceCode.toLowerCase().includes(query) ||
        item.Description?.toLowerCase().includes(query)
      );
    });

    // Watch for item code changes
    watch(() => props.priceCode, (newValue) => {
      if (newValue) {
        loadImages();
      } else {
        images.value = [];
      }
    });

    async function loadImages() {
      if (!props.priceCode) return;

      loading.value = true;
      try {
        const result = await api.catalogueImages.getImages(props.priceCode);
        if (result.success) {
          images.value = result.data || [];
        } else {
          console.error('Failed to load images:', result.message);
        }
      } catch (error) {
        console.error('Error loading images:', error);
      } finally {
        loading.value = false;
      }
    }

    async function loadCatalogueItems() {
      try {
        const result = await api.catalogue.getAllItems();
        if (result.success) {
          // Get image counts for each item
          catalogueItems.value = result.data || [];
          // Note: In a real implementation, you'd fetch image counts from the backend
          catalogueItems.value.forEach(item => {
            item.imageCount = 0; // Placeholder - would come from backend
          });
        }
      } catch (error) {
        console.error('Error loading catalogue items:', error);
      }
    }

    // Helper function to detect if URL is a PDF
    function isPDF(url) {
      if (!url) return false;
      return url.toLowerCase().endsWith('.pdf') ||
             url.toLowerCase().includes('.pdf?') ||
             url.toLowerCase().includes('data:application/pdf');
    }

    // Helper function to get filename from URL
    function getFileName(url) {
      if (!url) return '';
      if (url.startsWith('data:')) return 'Uploaded file';
      const parts = url.split('/');
      return parts[parts.length - 1] || 'file';
    }

    // Helper function to parse tags string into array
    function getTagsArray(tags) {
      if (!tags) return [];
      return tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }

    // Helper function to format file size
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // File upload handler
    async function onFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert('File size exceeds 10MB limit. Please choose a smaller file.');
        return;
      }

      uploadedFileName.value = file.name;
      uploadedFileSize.value = formatFileSize(file.size);

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        imageFormData.value.url = base64;

        // Auto-detect type based on file extension
        if (file.type.includes('pdf')) {
          if (imageFormData.value.type === 'Product Photo') {
            imageFormData.value.type = 'Specification Sheet';
          }
        }
      };
      reader.readAsDataURL(file);
    }

    function getImageTypeIcon(type) {
      const icons = {
        'Product Photo': 'bi bi-camera',
        'Specification Sheet': 'bi bi-file-text',
        'Installation Diagram': 'bi bi-diagram-3',
        'Supplier Catalog': 'bi bi-book',
        'Technical Drawing': 'bi bi-rulers',
        'Sample/Color': 'bi bi-palette',
        'Other': 'bi bi-image'
      };
      return icons[type] || 'bi bi-image';
    }

    function openAddImageDialog() {
      editingImageIndex.value = null;
      imageSourceType.value = 'url';
      uploadedFileName.value = '';
      uploadedFileSize.value = '';
      imageFormData.value = {
        type: 'Product Photo',
        url: '',
        caption: '',
        tags: '',
        isPrimary: images.value.length === 0 // First image is primary by default
      };
      showImageDialog.value = true;
    }

    function editImage(index) {
      editingImageIndex.value = index;
      const image = images.value[index];
      imageSourceType.value = image.url && image.url.startsWith('data:') ? 'upload' : 'url';
      imageFormData.value = { ...image };
      if (!imageFormData.value.tags) imageFormData.value.tags = '';
      showImageDialog.value = true;
    }

    function closeImageDialog() {
      showImageDialog.value = false;
      editingImageIndex.value = null;
      imageSourceType.value = 'url';
      uploadedFileName.value = '';
      uploadedFileSize.value = '';
      imageFormData.value = {
        type: 'Product Photo',
        url: '',
        caption: '',
        tags: '',
        isPrimary: false
      };
    }

    async function saveImage() {
      loading.value = true;
      try {
        const imageData = {
          priceCode: props.priceCode,
          ...imageFormData.value,
          index: editingImageIndex.value
        };

        const result = editingImageIndex.value !== null
          ? await api.catalogueImages.updateImage(imageData)
          : await api.catalogueImages.addImage(imageData);

        if (result.success) {
          await loadImages();
          closeImageDialog();
          emit('updated');
        } else {
          alert('Error saving image: ' + result.message);
        }
      } catch (error) {
        console.error('Error saving image:', error);
        alert('Error saving image: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function deleteImage(index) {
      if (!confirm('Delete this image?')) return;

      loading.value = true;
      try {
        const result = await api.catalogueImages.deleteImage(props.priceCode, index);
        if (result.success) {
          await loadImages();
          emit('updated');
        } else {
          alert('Error deleting image: ' + result.message);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        alert('Error deleting image: ' + error.message);
      } finally {
        loading.value = false;
      }
    }

    async function setPrimaryImage(index) {
      loading.value = true;
      try {
        const result = await api.catalogueImages.setPrimaryImage(props.priceCode, index);
        if (result.success) {
          await loadImages();
          emit('updated');
        } else {
          alert('Error setting primary image: ' + result.message);
        }
      } catch (error) {
        console.error('Error setting primary image:', error);
      } finally {
        loading.value = false;
      }
    }

    function openImageModal(image, index) {
      selectedImage.value = image;
      selectedImageIndex.value = index;
      showImageModal.value = true;
    }

    function navigateImage(direction) {
      const newIndex = selectedImageIndex.value + direction;
      if (newIndex >= 0 && newIndex < images.value.length) {
        selectedImageIndex.value = newIndex;
        selectedImage.value = images.value[newIndex];
      }
    }

    function openImageInNewTab() {
      if (selectedImage.value?.url) {
        window.open(selectedImage.value.url, '_blank');
      }
    }

    function copyImageUrl() {
      if (selectedImage.value?.url) {
        navigator.clipboard.writeText(selectedImage.value.url);
        alert('Image URL copied to clipboard');
      }
    }

    async function copyImagesFrom(item) {
      if (confirm(`Copy images from ${item.PriceCode}?\n\nThis will add all images from that item to this item.`)) {
        loading.value = true;
        try {
          const result = await api.catalogueImages.copyImages(item.PriceCode, props.priceCode);
          if (result.success) {
            await loadImages();
            showCopyImagesModal.value = false;
            copyImagesSearch.value = '';
            emit('updated');
          } else {
            alert('Error copying images: ' + result.message);
          }
        } catch (error) {
          console.error('Error copying images:', error);
          alert('Error copying images: ' + error.message);
        } finally {
          loading.value = false;
        }
      }
    }

    function onImageError(event) {
      event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
    }

    function onPreviewError(event) {
      event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%23f8f9fa" width="300" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EInvalid image URL%3C/text%3E%3C/svg%3E';
    }

    function onPDFError(event) {
      console.error('PDF failed to load:', event);
      alert('Failed to load PDF. Try opening in a new tab.');
    }

    // Allow right-click context menu on images
    function allowContextMenu(event) {
      // Let the browser's default context menu show
      // This allows "Save Image As", "Copy Image Address", etc.
      return true;
    }

    // Drag & Drop functions
    function onDragStart(index, event) {
      draggedIndex.value = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/html', event.target.innerHTML);
      // Add a ghost image effect
      event.target.style.opacity = '0.5';
    }

    function onDragOver(index, event) {
      dragOverIndex.value = index;
      event.dataTransfer.dropEffect = 'move';
    }

    function onDrop(index, event) {
      event.preventDefault();
      const fromIndex = draggedIndex.value;
      const toIndex = index;

      if (fromIndex === null || fromIndex === toIndex) {
        return;
      }

      // Reorder images array
      const reorderedImages = [...images.value];
      const [movedImage] = reorderedImages.splice(fromIndex, 1);
      reorderedImages.splice(toIndex, 0, movedImage);

      images.value = reorderedImages;

      // Save the new order to backend
      saveImageOrder();
    }

    function onDragEnd(event) {
      event.target.style.opacity = '1';
      draggedIndex.value = null;
      dragOverIndex.value = null;
    }

    async function saveImageOrder() {
      loading.value = true;
      try {
        const result = await api.catalogueImages.reorderImages(props.priceCode, images.value);
        if (result.success) {
          emit('updated');
        } else {
          alert('Error saving image order: ' + result.message);
          // Reload images to restore original order
          await loadImages();
        }
      } catch (error) {
        console.error('Error saving image order:', error);
        alert('Error saving image order: ' + error.message);
        // Reload images to restore original order
        await loadImages();
      } finally {
        loading.value = false;
      }
    }

    // Load images on mount
    onMounted(() => {
      if (props.priceCode) {
        loadImages();
      }
      loadCatalogueItems();
    });

    return {
      loading,
      images,
      showImageDialog,
      showImageModal,
      showCopyImagesModal,
      editingImageIndex,
      selectedImage,
      selectedImageIndex,
      copyImagesSearch,
      filteredCatalogueItems,
      imageFormData,
      imageSourceType,
      fileInput,
      uploadedFileName,
      uploadedFileSize,
      isPDF,
      getFileName,
      getTagsArray,
      formatFileSize,
      onFileSelected,
      getImageTypeIcon,
      openAddImageDialog,
      editImage,
      closeImageDialog,
      saveImage,
      deleteImage,
      setPrimaryImage,
      openImageModal,
      navigateImage,
      openImageInNewTab,
      copyImageUrl,
      copyImagesFrom,
      onImageError,
      onPreviewError,
      onPDFError,
      allowContextMenu,
      draggedIndex,
      dragOverIndex,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd
    };
  }
};
</script>

<style scoped>
.image-gallery-panel {
  padding: 1rem;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.alert-sm {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.image-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: move;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.image-card.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.image-card.drag-over {
  border: 2px dashed #0d6efd;
  background: rgba(13, 110, 253, 0.05);
  transform: scale(1.02);
}

.image-thumbnail {
  position: relative;
  width: 100%;
  height: 150px;
  overflow: hidden;
  cursor: pointer;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s;
}

.image-thumbnail:hover img {
  transform: scale(1.1);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-thumbnail:hover .image-overlay {
  opacity: 1;
}

.primary-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #ffc107;
  color: #000;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.image-info {
  padding: 0.75rem;
  background: #f8f9fa;
}

.image-type-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.25rem;
}

.image-caption {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #6c757d;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-actions {
  padding: 0.5rem;
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  border-top: 1px solid #dee2e6;
}

.preview-container {
  max-height: 300px;
  overflow: hidden;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.preview-container img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.pdf-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.pdf-preview {
  text-align: center;
  padding: 2rem;
}

.pdf-viewer {
  width: 100%;
  height: 100%;
}
</style>
