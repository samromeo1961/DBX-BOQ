import { evaluate } from 'mathjs';

/**
 * Round a number to the nearest increment
 * @param {number} value - The value to round
 * @param {number} increment - The increment to round to
 * @returns {number} Rounded value
 */
function roundToIncrement(value, increment) {
  if (increment === 0) return value;
  return Math.round(value / increment) * increment;
}

/**
 * Process rounding syntax in an expression
 * Example: "2.5rnd1" becomes roundToIncrement(2.5, 1)
 * Also handles: "*.018rnd1" becomes "*roundToIncrement(0.018, 1)"
 * @param {string} expression - The expression containing rnd syntax
 * @returns {string} Expression with rounding converted to function calls
 */
function processRounding(expression) {
  // Match pattern: optional operator + number followed by "rnd" followed by number
  // Examples: 51rnd1, 2.5rnd0.3, *.018rnd1, /0.5rnd1
  // Improved pattern to capture optional leading operator
  const rndPattern = /([+\-*/]?\s*\.?\d+\.?\d*)\s*rnd\s*(\d+\.?\d*)/gi;

  return expression.replace(rndPattern, (match, value, increment) => {
    // Trim whitespace from value
    const trimmedValue = value.trim();

    // Check if value starts with an operator
    const startsWithOperator = /^[+\-*/]/.test(trimmedValue);

    if (startsWithOperator) {
      // Extract operator and number
      const operator = trimmedValue[0];
      const number = trimmedValue.substring(1).trim();
      return `${operator}roundToIncrement(${number}, ${increment})`;
    } else {
      return `roundToIncrement(${trimmedValue}, ${increment})`;
    }
  });
}

/**
 * Replace variables in expression with their values
 * @param {string} expression - The expression containing variables
 * @param {object} variables - Object containing variable values
 * @returns {string} Expression with variables replaced
 */
function replaceVariables(expression, variables = {}) {
  let result = expression;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Extract expressions within square brackets
 * @param {string} text - Text containing [expressions]
 * @returns {array} Array of {start, end, expression} objects
 */
function extractBracketedExpressions(text) {
  const expressions = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === '[') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === ']') {
      depth--;
      if (depth === 0 && start !== -1) {
        expressions.push({
          start,
          end: i + 1,
          expression: text.substring(start + 1, i)
        });
        start = -1;
      }
    }
  }

  return expressions;
}

/**
 * Evaluate a mathematical expression
 * @param {string} expression - The expression to evaluate
 * @param {object} variables - Variables available for the expression
 * @returns {number} Result of evaluation
 */
function evaluateExpression(expression, variables = {}) {
  try {
    let processedExpr = replaceVariables(expression, variables);
    processedExpr = processRounding(processedExpr);

    const scope = {
      roundToIncrement,
      ...variables
    };

    const result = evaluate(processedExpr, scope);
    return typeof result === 'number' ? result : parseFloat(result);
  } catch (error) {
    console.error('Formula evaluation error:', error);
    throw new Error(`Formula evaluation failed: ${error.message}`);
  }
}

/**
 * Calculate quantity from a Databuild formula
 * @param {string} formula - The formula from Recipe table
 * @param {number} parentQty - Parent item quantity
 * @param {object} localVariables - Local variables
 * @returns {number} Calculated quantity
 */
export function calculateFormulaQuantity(formula, parentQty = 1, localVariables = {}) {
  if (!formula || formula.trim() === '') {
    return null;
  }

  // Only process formulas with brackets [...]
  // Non-bracketed formulas use Databuild workup text syntax which has different interpretation rules
  if (!formula.includes('[') || !formula.includes(']')) {
    return null; // Return null to show Base Qty instead
  }

  const allVariables = {
    QTY: parentQty,
    Qty: parentQty,
    qty: parentQty,
    ...localVariables
  };

  const lines = formula.split('\n');
  const locals = { ...localVariables };
  let quantity = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Split by # to remove comments
    const parts = line.split('#');
    const formulaPart = parts[0].trim();
    if (!formulaPart) continue;

    // Check for LocalVariable
    const localVarMatch = formulaPart.match(/^\s*LocalVariable\s+(\w+)\s*=\s*(.+)$/i);
    if (localVarMatch) {
      const varName = localVarMatch[1];
      const expression = localVarMatch[2];
      const bracketedExprs = extractBracketedExpressions(expression);

      if (bracketedExprs.length > 0) {
        const value = evaluateExpression(bracketedExprs[0].expression, { ...allVariables, ...locals });
        locals[varName] = value;
        allVariables[varName] = value;
      }
      continue;
    }

    // Check for Quantity=
    const quantityMatch = formulaPart.match(/^\s*Quantity\s*=\s*(.+)$/i);
    if (quantityMatch) {
      const expression = quantityMatch[1];
      const bracketedExprs = extractBracketedExpressions(expression);

      if (bracketedExprs.length > 0) {
        quantity = evaluateExpression(bracketedExprs[0].expression, { ...allVariables, ...locals });
      }
      continue;
    }

    // Check for OnlyIf - skip evaluation for now
    if (formulaPart.match(/^\s*OnlyIf\s+/i)) {
      continue;
    }

    // Regular formula line with bracketed expressions
    const bracketedExprs = extractBracketedExpressions(formulaPart);
    if (bracketedExprs.length > 0 && quantity === null) {
      // If no explicit Quantity= was set, use the last calculated value
      let workupText = formulaPart;

      for (let i = bracketedExprs.length - 1; i >= 0; i--) {
        const expr = bracketedExprs[i];
        const result = evaluateExpression(expr.expression, { ...allVariables, ...locals });

        workupText = workupText.substring(0, expr.start) +
                     result.toString() +
                     workupText.substring(expr.end);
      }

      // Try to evaluate the final workup text if it's a pure expression
      if (workupText.match(/^[\d\s+\-*/().]+$/)) {
        try {
          quantity = evaluate(workupText);
        } catch (e) {
          // Keep existing quantity if evaluation fails
        }
      }
    }
  }

  return quantity;
}

export default {
  calculateFormulaQuantity,
  roundToIncrement,
  evaluateExpression
};
