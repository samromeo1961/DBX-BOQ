const math = require('mathjs');

/**
 * Databuild Formula Parser
 * Parses and evaluates Databuild recipe formulas
 *
 * Formula Syntax:
 * - [expression] - Evaluated mathematical expression
 * - [QTY] or [Qty] - Parent item quantity
 * - rndX - Round to nearest X (e.g., rnd1 = whole number, rnd0.3 = nearest 0.3)
 * - LocalVariable NAME = [expression] - Create local variable
 * - Quantity = [expression] - Override quantity
 * - OnlyIf [condition] - Conditional inclusion
 * - # - Comment/suppress output
 * - Operators: *, /, +, -, >, <, >=, <=, =, &, |
 */

/**
 * Round a number to the nearest increment
 * @param {number} value - The value to round
 * @param {number} increment - The increment to round to (e.g., 1, 0.3, 0.1)
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

  // Replace all variables (case-insensitive)
  for (const [key, value] of Object.entries(variables)) {
    // Create case-insensitive regex for the variable name
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
    // Replace variables
    let processedExpr = replaceVariables(expression, variables);

    // Process rounding syntax
    processedExpr = processRounding(processedExpr);

    // Create math scope with roundToIncrement function
    const scope = {
      roundToIncrement,
      ...variables
    };

    // Evaluate using Math.js
    const result = math.evaluate(processedExpr, scope);

    return typeof result === 'number' ? result : parseFloat(result);
  } catch (error) {
    console.error('Formula evaluation error:', error);
    console.error('Expression:', expression);
    console.error('Variables:', variables);
    throw new Error(`Formula evaluation failed: ${error.message}`);
  }
}

/**
 * Process a formula line
 * @param {string} line - Formula line from Recipe table
 * @param {object} context - Execution context
 * @returns {object} Processed line result
 */
function processFormulaLine(line, context = {}) {
  const {
    qty = 1,              // Parent item quantity
    localVariables = {},  // Local variables
    jobVariables = {}     // Job variables
  } = context;

  // Combine all variables
  const allVariables = {
    QTY: qty,
    Qty: qty,
    qty: qty,
    ...jobVariables,
    ...localVariables
  };

  // Split by # to separate formula from comments
  const parts = line.split('#');
  const formulaPart = parts[0].trim();
  const outputToWorkup = parts.length === 1; // If no #, output to workup

  if (!formulaPart) {
    return { type: 'empty', outputToWorkup: false };
  }

  // Check for LocalVariable command
  const localVarMatch = formulaPart.match(/^\s*LocalVariable\s+(\w+)\s*=\s*(.+)$/i);
  if (localVarMatch) {
    const varName = localVarMatch[1];
    const expression = localVarMatch[2];

    // Evaluate the expression
    const bracketedExprs = extractBracketedExpressions(expression);
    let value = expression;

    if (bracketedExprs.length > 0) {
      value = evaluateExpression(bracketedExprs[0].expression, allVariables);
    } else {
      value = parseFloat(expression) || 0;
    }

    return {
      type: 'localVariable',
      name: varName,
      value,
      outputToWorkup: false
    };
  }

  // Check for Quantity= command
  const quantityMatch = formulaPart.match(/^\s*Quantity\s*=\s*(.+)$/i);
  if (quantityMatch) {
    const expression = quantityMatch[1];
    const bracketedExprs = extractBracketedExpressions(expression);

    let quantity = 0;
    if (bracketedExprs.length > 0) {
      quantity = evaluateExpression(bracketedExprs[0].expression, allVariables);
    } else {
      quantity = parseFloat(expression) || 0;
    }

    return {
      type: 'quantity',
      value: quantity,
      outputToWorkup: false
    };
  }

  // Check for OnlyIf command
  const onlyIfMatch = formulaPart.match(/^\s*OnlyIf\s+(.+)$/i);
  if (onlyIfMatch) {
    const conditionText = onlyIfMatch[1];
    const bracketedExprs = extractBracketedExpressions(conditionText);

    if (bracketedExprs.length > 0) {
      const condition = bracketedExprs[0].expression;

      // Convert Databuild comparison operators to JavaScript/Math.js compatible format
      let jsCondition = condition
        .replace(/\s*&\s*/g, ' and ')  // AND (Math.js uses 'and')
        .replace(/\s*\|\s*/g, ' or ')   // OR (Math.js uses 'or')
        .replace(/([^><!])=([^=])/g, '$1==$2');  // Single = to == (but not >= or <=)

      // Replace variables
      jsCondition = replaceVariables(jsCondition, allVariables);

      try {
        // Evaluate condition
        const result = math.evaluate(jsCondition);
        return {
          type: 'onlyIf',
          condition: result ? true : false,
          outputToWorkup: false
        };
      } catch (error) {
        console.error('OnlyIf evaluation error:', error);
        return {
          type: 'onlyIf',
          condition: false,
          outputToWorkup: false
        };
      }
    }
  }

  // Regular formula line - process all bracketed expressions
  const bracketedExprs = extractBracketedExpressions(formulaPart);
  let workupText = formulaPart;
  let quantities = [];

  // Process bracketed expressions in reverse order to maintain correct positions
  for (let i = bracketedExprs.length - 1; i >= 0; i--) {
    const expr = bracketedExprs[i];
    const result = evaluateExpression(expr.expression, allVariables);
    quantities.unshift(result);

    // Replace the bracketed expression with the result
    workupText = workupText.substring(0, expr.start) +
                 result.toString() +
                 workupText.substring(expr.end);
  }

  // After replacing all bracketed expressions, check if workupText is a complete expression
  // If it contains only numbers and operators, evaluate it
  if (workupText.match(/^[\d\s+\-*/().]+$/)) {
    try {
      const finalResult = math.evaluate(workupText);
      quantities = [finalResult];
      workupText = finalResult.toString();
    } catch (e) {
      // If evaluation fails, keep workupText as is
    }
  }

  return {
    type: 'formula',
    workupText,
    quantities,
    outputToWorkup
  };
}

/**
 * Process a complete recipe formula
 * @param {string} formula - Complete formula text (may be multi-line)
 * @param {object} context - Execution context
 * @returns {object} Processed result
 */
function processRecipeFormula(formula, context = {}) {
  if (!formula || formula.trim() === '') {
    return {
      include: true,
      quantity: null,
      workupText: '',
      localVariables: {}
    };
  }

  const lines = formula.split('\n');
  const localVariables = { ...(context.localVariables || {}) };
  let include = true;
  let quantity = null;
  let workupLines = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const result = processFormulaLine(line, {
      ...context,
      localVariables
    });

    switch (result.type) {
      case 'localVariable':
        localVariables[result.name] = result.value;
        break;

      case 'quantity':
        quantity = result.value;
        break;

      case 'onlyIf':
        if (!result.condition) {
          include = false;
        }
        break;

      case 'formula':
        if (result.outputToWorkup && result.workupText) {
          workupLines.push(result.workupText);
        }
        // If formula produces quantities and no explicit Quantity= set
        if (result.quantities && result.quantities.length > 0 && quantity === null) {
          // Use the last quantity calculated
          quantity = result.quantities[result.quantities.length - 1];
        }
        break;
    }
  }

  return {
    include,
    quantity,
    workupText: workupLines.join('\n'),
    localVariables
  };
}

module.exports = {
  roundToIncrement,
  processRounding,
  replaceVariables,
  extractBracketedExpressions,
  evaluateExpression,
  processFormulaLine,
  processRecipeFormula
};
