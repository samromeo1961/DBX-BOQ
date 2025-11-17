<template>
  <div class="formula-builder">
    <!-- Formula Input Section -->
    <div class="mb-3">
      <label class="form-label fw-bold">Formula</label>
      <textarea
        v-model="formula"
        class="form-control font-monospace"
        rows="4"
        placeholder="Enter formula (e.g., QTY * 2.5 or wallHeight = 2.4)"
        @input="onFormulaChange"
      ></textarea>
      <div class="form-text">
        Use clean Math.js syntax. Built-in variable: <strong>QTY</strong> (parent quantity). Create custom variables with <code>varName = value</code>
      </div>
    </div>

    <!-- Quick Insert Buttons -->
    <div class="mb-3">
      <label class="form-label small fw-bold">Quick Insert:</label>
      <div class="btn-group btn-group-sm d-flex flex-wrap gap-1" role="group">
        <button type="button" class="btn btn-outline-primary" @click="insertText('QTY')">
          QTY
        </button>
        <button type="button" class="btn btn-outline-primary" @click="insertText('QTY * ')">
          QTY *
        </button>
        <button type="button" class="btn btn-outline-primary" @click="insertText('QTY * [Wall Height]')">
          QTY * [Var]
        </button>
        <button type="button" class="btn btn-outline-success" @click="insertText('[Wall Height]')">
          [Variable]
        </button>
        <button type="button" class="btn btn-outline-success" @click="insertText('round(QTY / 1) * 1')">
          round( )
        </button>
        <button type="button" class="btn btn-outline-info" @click="insertText('ceil(QTY / 5.4)')">
          ceil( )
        </button>
        <button type="button" class="btn btn-outline-info" @click="insertText('floor(QTY / 5.4)')">
          floor( )
        </button>
      </div>
    </div>

    <!-- Custom Variables Section -->
    <div v-if="requiredInputs.length > 0" class="card bg-info bg-opacity-10 border-info mb-3">
      <div class="card-body">
        <h6 class="card-title">
          <i class="bi bi-input-cursor-text me-2"></i>
          Custom Variables
        </h6>
        <div class="row g-2">
          <div v-for="varName in requiredInputs" :key="varName" class="col-md-4">
            <label class="form-label small fw-bold">{{ formatVariableName(varName) }}</label>
            <input
              type="number"
              v-model.number="customVariables[varName]"
              class="form-control form-control-sm"
              step="0.001"
              :placeholder="varName"
            />
          </div>
        </div>
        <div class="form-text mt-2">
          <i class="bi bi-info-circle me-1"></i>
          These variables are used in your formula but not defined. Set their values here.
        </div>
      </div>
    </div>

    <!-- Test Section -->
    <div class="card bg-light mb-3">
      <div class="card-body">
        <h6 class="card-title">Test Formula</h6>
        <div class="row g-2">
          <div class="col-md-4">
            <label class="form-label small">Parent Quantity (QTY)</label>
            <input
              type="number"
              v-model.number="testQty"
              class="form-control form-control-sm"
              step="0.001"
              @input="onFormulaChange"
            />
          </div>
          <div class="col-md-8">
            <label class="form-label small">Calculated Base Qty</label>
            <div class="d-flex align-items-center gap-2">
              <div
                class="form-control form-control-sm font-monospace"
                :class="{
                  'bg-success text-white': calculationResult.success && !calculationResult.error,
                  'bg-danger text-white': calculationResult.error,
                  'bg-secondary text-white': !formula || formula.trim() === ''
                }"
              >
                <span v-if="calculationResult.success && calculationResult.value !== null && typeof calculationResult.value === 'number'">
                  {{ calculationResult.value.toFixed(3) }}
                </span>
                <span v-else-if="calculationResult.error" class="small">
                  ❌ {{ calculationResult.error }}
                </span>
                <span v-else-if="!formula || formula.trim() === ''" class="text-muted">
                  Enter formula to test
                </span>
                <span v-else class="text-muted">
                  {{ calculationResult.workupText || 'No result' }}
                </span>
              </div>
              <button
                v-if="calculationResult.success && !calculationResult.error"
                type="button"
                class="btn btn-sm btn-success"
                title="Formula is valid"
              >
                <i class="bi bi-check-circle"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Workup Text Preview -->
        <div v-if="calculationResult.workupText" class="mt-2">
          <label class="form-label small">Workup Text:</label>
          <div class="font-monospace small text-muted">
            {{ calculationResult.workupText }}
          </div>
        </div>
      </div>
    </div>

    <!-- Formula Examples -->
    <div class="accordion" id="formulaExamples">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button
            class="accordion-button collapsed"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#examplesCollapse"
          >
            <i class="bi bi-book me-2"></i> Formula Examples & Syntax Guide
          </button>
        </h2>
        <div id="examplesCollapse" class="accordion-collapse collapse">
          <div class="accordion-body">
            <div class="row">
              <div class="col-md-6">
                <h6 class="fw-bold">Basic Formulas (Math.js Style)</h6>
                <ul class="list-unstyled small">
                  <li class="mb-2">
                    <code>QTY</code> - Same as parent quantity
                  </li>
                  <li class="mb-2">
                    <code>QTY * 2</code> - Double the quantity
                  </li>
                  <li class="mb-2">
                    <code>QTY / 5.4</code> - Divide by 5.4
                  </li>
                  <li class="mb-2">
                    <code>QTY * 2.5 + 1</code> - Multiply and add
                  </li>
                </ul>

                <h6 class="fw-bold mt-3">Rounding (Math.js)</h6>
                <ul class="list-unstyled small">
                  <li class="mb-2">
                    <code>round(QTY * 2.5 / 1) * 1</code> - Round to nearest 1
                  </li>
                  <li class="mb-2">
                    <code>round(QTY * 3.7 / 0.3) * 0.3</code> - Round to nearest 0.3
                  </li>
                  <li class="mb-2">
                    <code>ceil(QTY / 5.4)</code> - Round up
                  </li>
                </ul>

                <h6 class="fw-bold mt-3">Custom Variables</h6>
                <ul class="list-unstyled small">
                  <li class="mb-2">
                    <code>wallHeight = 2.4<br />QTY * wallHeight</code>
                    <br /><span class="text-muted">CamelCase variables</span>
                  </li>
                  <li class="mb-2">
                    <code>[Wall Height] = 2.4<br />QTY * [Wall Height]</code>
                    <br /><span class="text-muted">Bracketed variables with spaces</span>
                  </li>
                </ul>

                <h6 class="fw-bold mt-3">Bracketed Variables</h6>
                <ul class="list-unstyled small">
                  <li class="mb-2">
                    <code>QTY * [Wall Height] * [Wall Length]</code>
                    <br /><span class="text-muted">Variables can have spaces using [ ]</span>
                  </li>
                </ul>
              </div>

              <div class="col-md-6">
                <h6 class="fw-bold">Advanced Examples</h6>
                <ul class="list-unstyled small">
                  <li class="mb-2">
                    <code>length = QTY * 2<br />area = length * 1.5</code>
                    <br /><span class="text-muted">Multi-step calculation</span>
                  </li>
                  <li class="mb-2">
                    <code>wastage = 1.05<br />QTY * wastage</code>
                    <br /><span class="text-muted">5% wastage factor</span>
                  </li>
                  <li class="mb-2">
                    <code># This is a comment<br />QTY * 2</code>
                    <br /><span class="text-muted">Comments start with #</span>
                  </li>
                </ul>

                <h6 class="fw-bold mt-3">Complete Example</h6>
                <pre class="small bg-light p-2 rounded"><code># Calculate wall area with wastage
wallHeight = 2.4
wallLength = 3.6
area = wallHeight * wallLength
wastage = 1.1
area * wastage</code></pre>
                <div class="small text-muted mt-1">
                  ℹ️ wallHeight, wallLength, wastage become input fields
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import { calculateFormulaQuantity } from '@/utils/formulaCalculator';
import { parseFormula, evaluateFormula, getDefaultInputValues, formatVariableName } from '@/utils/enhancedFormulaParser';

export default {
  name: 'FormulaBuilder',
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'validation-change'],
  setup(props, { emit }) {
    const formula = ref(props.modelValue || '');
    const testQty = ref(1);
    const calculationResult = ref({
      success: false,
      value: null,
      error: null,
      workupText: ''
    });
    const customVariables = ref({});
    const requiredInputs = ref([]);
    let isUpdatingVariables = false; // Flag to prevent infinite loop

    // Watch for external changes to modelValue
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== formula.value) {
        formula.value = newValue;
        onFormulaChange();
      }
    });

    function onFormulaChange() {
      // Emit updated value
      emit('update:modelValue', formula.value);

      // Test the formula
      testFormula();
    }

    function testFormula() {
      if (!formula.value || formula.value.trim() === '') {
        calculationResult.value = {
          success: true,
          value: null,
          error: null,
          workupText: ''
        };
        requiredInputs.value = [];
        isUpdatingVariables = true;
        customVariables.value = {};
        isUpdatingVariables = false;
        emit('validation-change', { isValid: true, error: null });
        return;
      }

      try {
        // Parse formula to detect required inputs
        const parsed = parseFormula(formula.value);
        requiredInputs.value = parsed.requiredInputs;

        // Initialize custom variables with defaults if not set
        if (requiredInputs.value.length > 0) {
          const defaults = getDefaultInputValues(requiredInputs.value);
          isUpdatingVariables = true;
          for (const varName of requiredInputs.value) {
            if (customVariables.value[varName] === undefined) {
              customVariables.value[varName] = defaults[varName];
            }
          }
          isUpdatingVariables = false;
        }

        // Build context with QTY and custom variables
        const context = {
          QTY: testQty.value,
          Qty: testQty.value,
          qty: testQty.value,
          ...customVariables.value
        };

        // Evaluate formula with enhanced parser
        const result = evaluateFormula(formula.value, context);

        if (result.success) {
          calculationResult.value = {
            success: true,
            value: result.result,
            error: null,
            workupText: requiredInputs.value.length > 0
              ? `Using variables: ${Object.keys(customVariables.value).join(', ')}`
              : ''
          };
          emit('validation-change', { isValid: true, error: null });
        } else {
          calculationResult.value = {
            success: false,
            value: null,
            error: result.error,
            workupText: ''
          };
          emit('validation-change', { isValid: false, error: result.error });
        }
      } catch (error) {
        calculationResult.value = {
          success: false,
          value: null,
          error: error.message,
          workupText: ''
        };
        emit('validation-change', { isValid: false, error: error.message });
      }
    }

    function insertText(text) {
      // Insert text at cursor position or append
      const textarea = document.querySelector('.formula-builder textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = formula.value.substring(0, start);
        const after = formula.value.substring(end);

        formula.value = before + text + after;

        // Move cursor after inserted text
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + text.length;
          textarea.focus();
        }, 0);
      } else {
        formula.value += text;
      }

      onFormulaChange();
    }

    // Watch custom variables for changes (only when user edits, not during initialization)
    watch(customVariables, () => {
      if (!isUpdatingVariables) {
        testFormula();
      }
    }, { deep: true });

    // Initial test
    testFormula();

    return {
      formula,
      testQty,
      calculationResult,
      customVariables,
      requiredInputs,
      onFormulaChange,
      insertText,
      formatVariableName
    };
  }
};
</script>

<style scoped>
.formula-builder {
  max-width: 100%;
}

.font-monospace {
  font-family: 'Courier New', Courier, monospace;
}

.btn-group-sm .btn {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

code {
  background-color: #f8f9fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  margin-bottom: 0;
}

.card-title {
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}
</style>
