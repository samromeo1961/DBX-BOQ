const math = require('mathjs');

/**
 * Enhanced Formula Parser - Math.js Style
 * Supports clean JavaScript/Math.js syntax instead of Databuild custom syntax
 *
 * Examples:
 *   wallHeight = 5
 *   length = QTY * 2
 *   area = length * wallHeight
 *
 * Features:
 * - Standard variable assignment (no "LocalVariable" keyword)
 * - Detects undefined variables (becomes user inputs)
 * - Supports Math.js functions and operators
 * - Natural if/else statements
 */

/**
 * Parse a formula and extract variable definitions and requirements
 * @param {string} formula - The formula text
 * @returns {object} Parsed formula information
 */
function parseFormula(formula) {
  if (!formula || formula.trim() === '') {
    return {
      variables: {},
      requiredInputs: [],
      expressions: [],
      isValid: true
    };
  }

  const lines = formula.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  const variables = {};
  const expressions = [];
  const definedVars = new Set(['QTY', 'Qty', 'qty', 'PI', 'E', 'pi', 'e']); // Built-in variables
  const requiredInputs = [];

  for (const line of lines) {
    // Skip comments
    if (line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    // Check for variable assignment: variableName = expression OR [Variable Name] = expression
    const assignmentMatch = line.match(/^(?:\[([^\]]+)\]|([a-zA-Z_]\w*))\s*=\s*(.+)$/);

    if (assignmentMatch) {
      const varName = assignmentMatch[1] || assignmentMatch[2]; // Bracketed or regular name
      const expression = assignmentMatch[3];

      variables[varName] = expression;
      definedVars.add(varName);
      expressions.push({ type: 'assignment', variable: varName, expression });
    } else {
      // Standalone expression (result)
      expressions.push({ type: 'expression', expression: line });
    }
  }

  // Find required inputs (variables used but not defined)
  const usedVars = new Set();
  for (const expr of expressions) {
    const vars = extractVariables(expr.expression);
    vars.forEach(v => usedVars.add(v));
  }

  // Required inputs are variables used but not defined
  for (const varName of usedVars) {
    if (!definedVars.has(varName)) {
      requiredInputs.push(varName);
    }
  }

  return {
    variables,
    requiredInputs,
    expressions,
    isValid: true
  };
}

/**
 * Extract variable names from an expression
 * Supports both regular names (wallHeight) and bracketed names ([Wall Height])
 * @param {string} expression - The expression to analyze
 * @returns {array} Array of variable names
 */
function extractVariables(expression) {
  const variables = [];

  // First, extract bracketed variables: [Variable Name]
  const bracketedPattern = /\[([^\]]+)\]/g;
  let match;

  while ((match = bracketedPattern.exec(expression)) !== null) {
    const varName = match[1].trim();
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }

  // Remove bracketed sections before extracting regular variables
  // This prevents matching words inside brackets as separate variables
  const withoutBrackets = expression.replace(/\[([^\]]+)\]/g, '');

  // Then extract regular variable names (from expression with brackets removed)
  const varPattern = /\b([a-zA-Z_]\w*)\b(?!\s*\()/g;
  const mathFunctions = ['sqrt', 'sin', 'cos', 'tan', 'abs', 'ceil', 'floor', 'round', 'max', 'min', 'pow', 'exp', 'log', 'log10', 'mean', 'median', 'sum', 'if'];
  const mathConstants = ['PI', 'E', 'pi', 'e', 'true', 'false', 'tau', 'phi'];

  while ((match = varPattern.exec(withoutBrackets)) !== null) {
    const varName = match[1];

    if (!mathFunctions.includes(varName) && !mathConstants.includes(varName)) {
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
  }

  return variables;
}

/**
 * Replace bracketed variables with values from scope
 * @param {string} expression - Expression with [Variable Name] syntax
 * @param {object} scope - Variable values
 * @returns {string} Expression with variables replaced
 */
function replaceBracketedVariables(expression, scope) {
  return expression.replace(/\[([^\]]+)\]/g, (match, varName) => {
    const trimmedName = varName.trim();
    if (scope[trimmedName] !== undefined) {
      return scope[trimmedName];
    }
    // If not in scope, throw error
    throw new Error(`Variable "${trimmedName}" is not defined`);
  });
}

/**
 * Evaluate a formula with given context
 * @param {string} formula - The formula to evaluate
 * @param {object} context - Variable values (QTY, and user inputs)
 * @returns {object} Evaluation result
 */
function evaluateFormula(formula, context = {}) {
  try {
    const parsed = parseFormula(formula);

    if (!parsed.isValid) {
      return {
        success: false,
        error: 'Invalid formula',
        result: null
      };
    }

    // Create scope with context (context values take precedence)
    const scope = {
      QTY: context.QTY || context.Qty || context.qty || 1,
      Qty: context.QTY || context.Qty || context.qty || 1,
      qty: context.QTY || context.Qty || context.qty || 1,
      ...context
    };

    let lastResult = null;

    // Execute each expression
    for (const expr of parsed.expressions) {
      if (expr.type === 'assignment') {
        // Only evaluate if variable not provided in context
        if (context[expr.variable] === undefined) {
          // Replace bracketed variables before evaluation
          const processedExpr = replaceBracketedVariables(expr.expression, scope);
          const value = math.evaluate(processedExpr, scope);
          scope[expr.variable] = value;
          lastResult = value;
        } else {
          // Use context value (user-provided)
          lastResult = context[expr.variable];
        }
      } else {
        // Replace bracketed variables before evaluation
        const processedExpr = replaceBracketedVariables(expr.expression, scope);
        lastResult = math.evaluate(processedExpr, scope);
      }
    }

    return {
      success: true,
      result: lastResult,
      scope,
      error: null
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      result: null
    };
  }
}

/**
 * Convert old Databuild syntax to new Math.js syntax
 * @param {string} oldFormula - Formula in Databuild syntax
 * @returns {string} Formula in Math.js syntax
 */
function convertFromDatabuild(oldFormula) {
  if (!oldFormula || oldFormula.trim() === '') {
    return '';
  }

  let converted = oldFormula;

  // Convert LocalVariable declarations
  converted = converted.replace(/LocalVariable\s+(\w+)\s*=\s*\[([^\]]+)\]/gi, '$1 = $2');

  // Convert Quantity = [expression] to just the expression
  converted = converted.replace(/Quantity\s*=\s*\[([^\]]+)\]/gi, 'result = $1');

  // Convert OnlyIf to if statements (simplified)
  converted = converted.replace(/OnlyIf\s+\[([^\]]+)\]/gi, '// if ($1)');

  // Remove remaining brackets from expressions
  converted = converted.replace(/\[([^\]]+)\]/g, '$1');

  // Clean up rnd syntax (keep as is, we'll handle it separately)
  // No changes needed for rnd

  return converted.trim();
}

/**
 * Get default values for required inputs based on variable names
 * @param {array} requiredInputs - Array of variable names
 * @returns {object} Default values
 */
function getDefaultInputValues(requiredInputs) {
  const defaults = {};

  for (const varName of requiredInputs) {
    const lowerName = varName.toLowerCase();

    // Smart defaults based on common variable names
    if (lowerName.includes('height') || lowerName.includes('width') || lowerName.includes('length')) {
      defaults[varName] = 1.0;
    } else if (lowerName.includes('wastage') || lowerName.includes('factor')) {
      defaults[varName] = 1.05; // 5% wastage
    } else if (lowerName.includes('count') || lowerName.includes('qty')) {
      defaults[varName] = 1;
    } else {
      defaults[varName] = 0;
    }
  }

  return defaults;
}

/**
 * Process rounding in expression (maintains compatibility with old rnd syntax)
 * @param {string} expression - Expression with rnd syntax
 * @returns {string} Expression with rounding converted
 */
function processRounding(expression) {
  function roundToIncrement(value, increment) {
    if (increment === 0) return value;
    return Math.round(value / increment) * increment;
  }

  // Pattern: number followed by "rnd" followed by increment
  const rndPattern = /([+\-*/]?\s*\.?\d+\.?\d*)\s*rnd\s*(\d+\.?\d*)/gi;

  return expression.replace(rndPattern, (match, value, increment) => {
    const trimmedValue = value.trim();
    const startsWithOperator = /^[+\-*/]/.test(trimmedValue);

    if (startsWithOperator) {
      const operator = trimmedValue[0];
      const number = trimmedValue.substring(1).trim();
      return `${operator}round(${number} / ${increment}) * ${increment}`;
    } else {
      return `round(${trimmedValue} / ${increment}) * ${increment}`;
    }
  });
}

/**
 * Convert label-style variable names to readable text
 * Example: "wallHeight" -> "Wall Height", "Wall Height" -> "Wall Height"
 * @param {string} varName - Variable name
 * @returns {string} Formatted variable name
 */
function formatVariableName(varName) {
  // If variable already has spaces (from bracketed syntax), just capitalize properly
  if (varName.includes(' ')) {
    return varName.replace(/\b\w/g, l => l.toUpperCase());
  }

  // Convert camelCase to spaces
  let formatted = varName.replace(/([A-Z])/g, ' $1');

  // Capitalize first letter of each word
  formatted = formatted.replace(/\b\w/g, l => l.toUpperCase());

  return formatted.trim();
}

module.exports = {
  parseFormula,
  extractVariables,
  evaluateFormula,
  convertFromDatabuild,
  getDefaultInputValues,
  processRounding,
  formatVariableName
};
