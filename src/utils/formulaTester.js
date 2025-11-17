const { processRecipeFormula, evaluateExpression, extractBracketedExpressions } = require('./formulaParser');

/**
 * Formula Tester Utility
 * Tests and validates Databuild formulas with Math.js
 */

/**
 * Test a single formula with a given parent quantity
 * @param {string} formula - The formula to test
 * @param {number} parentQty - Parent quantity (default: 1)
 * @returns {object} Test result with calculation details
 */
function testFormula(formula, parentQty = 1) {
  const result = {
    formula: formula,
    parentQty: parentQty,
    success: false,
    calculatedValue: null,
    error: null,
    hasBrackets: false,
    isTextOnly: false,
    warnings: []
  };

  // Handle empty or null formulas
  if (!formula || formula.trim() === '') {
    result.isTextOnly = true;
    result.calculatedValue = null;
    result.success = true;
    return result;
  }

  // Check if formula contains brackets
  result.hasBrackets = formula.includes('[') && formula.includes(']');

  // Check for special text markers like [No Workup]
  if (result.hasBrackets && /\[No\s+Workup\]/i.test(formula)) {
    result.isTextOnly = true;
    result.calculatedValue = 0;
    result.success = true;
    return result;
  }

  // Check if formula is text-only (no brackets, no operators, or starts with text)
  const isNumericFormula = /[\d\[\]*/+\-()]/.test(formula);
  if (!isNumericFormula) {
    result.isTextOnly = true;
    result.calculatedValue = 0; // Text formulas typically result in 0 quantity
    result.success = true;
    return result;
  }

  // Check for common syntax errors
  const syntaxErrors = detectSyntaxErrors(formula);
  if (syntaxErrors.length > 0) {
    result.error = 'Syntax errors: ' + syntaxErrors.join(', ');
    result.warnings = syntaxErrors;
    return result;
  }

  try {
    // Test with processRecipeFormula
    const parseResult = processRecipeFormula(formula, {
      qty: parentQty,
      localVariables: {},
      jobVariables: {}
    });

    result.success = true;
    result.calculatedValue = parseResult.quantity;
    result.include = parseResult.include;
    result.workupText = parseResult.workupText;
    result.localVariables = parseResult.localVariables;

  } catch (error) {
    result.error = error.message;
    result.success = false;
  }

  return result;
}

/**
 * Detect common syntax errors in formulas
 * @param {string} formula - Formula to check
 * @returns {array} Array of error messages
 */
function detectSyntaxErrors(formula) {
  const errors = [];

  // Check for consecutive numbers without operators (e.g., "2.55.4")
  if (/\d\.\d+\.\d+/.test(formula)) {
    errors.push('Consecutive decimal points detected - missing operator?');
  }

  // Check for malformed rnd syntax
  if (/rnd\s*[^\d\[]/.test(formula)) {
    errors.push('Malformed rnd syntax - should be: numberrndincrement');
  }

  // Check for unmatched brackets
  const openBrackets = (formula.match(/\[/g) || []).length;
  const closeBrackets = (formula.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
  }

  // Check for invalid division patterns (e.g., starts with division)
  if (/^\//.test(formula.trim())) {
    errors.push('Formula starts with division operator');
  }

  return errors;
}

/**
 * Test multiple formulas and generate a report
 * @param {array} formulaTests - Array of {formula, expectedResult} objects
 * @returns {object} Test report with statistics
 */
function testMultipleFormulas(formulaTests) {
  const report = {
    totalTests: formulaTests.length,
    passed: 0,
    failed: 0,
    textOnly: 0,
    withWarnings: 0,
    results: []
  };

  for (const test of formulaTests) {
    const result = testFormula(test.formula, test.parentQty || 1);

    // Compare with expected result if provided
    if (test.expectedResult !== undefined && test.expectedResult !== null) {
      const expected = parseFloat(test.expectedResult);
      const actual = result.calculatedValue;

      if (actual !== null) {
        const tolerance = 0.0001; // Allow small floating point differences
        const matches = Math.abs(expected - actual) < tolerance;

        result.expectedResult = expected;
        result.matches = matches;

        if (!matches && !result.isTextOnly) {
          result.warnings.push(`Expected ${expected}, got ${actual}`);
        }
      }
    }

    // Update statistics
    if (result.isTextOnly) {
      report.textOnly++;
    } else if (result.success) {
      report.passed++;
    } else {
      report.failed++;
    }

    if (result.warnings.length > 0) {
      report.withWarnings++;
    }

    report.results.push(result);
  }

  return report;
}

/**
 * Format a test report for display
 * @param {object} report - Test report from testMultipleFormulas
 * @returns {string} Formatted report text
 */
function formatTestReport(report) {
  let output = '═══════════════════════════════════════════════════════\n';
  output += '         DATABUILD FORMULA TEST REPORT\n';
  output += '═══════════════════════════════════════════════════════\n\n';

  output += `Total Tests:     ${report.totalTests}\n`;
  output += `Passed:          ${report.passed}\n`;
  output += `Failed:          ${report.failed}\n`;
  output += `Text Only:       ${report.textOnly}\n`;
  output += `With Warnings:   ${report.withWarnings}\n`;
  output += `Success Rate:    ${((report.passed / (report.totalTests - report.textOnly)) * 100).toFixed(1)}%\n\n`;

  // Failed tests
  if (report.failed > 0) {
    output += '───────────────────────────────────────────────────────\n';
    output += 'FAILED TESTS:\n';
    output += '───────────────────────────────────────────────────────\n';

    report.results.filter(r => !r.success && !r.isTextOnly).forEach((result, index) => {
      output += `\n${index + 1}. Formula: ${result.formula}\n`;
      output += `   Error: ${result.error}\n`;
      if (result.warnings.length > 0) {
        output += `   Warnings: ${result.warnings.join('; ')}\n`;
      }
    });
    output += '\n';
  }

  // Tests with warnings (mismatched results)
  const mismatchedResults = report.results.filter(r =>
    r.success && !r.isTextOnly && r.expectedResult !== undefined && !r.matches
  );

  if (mismatchedResults.length > 0) {
    output += '───────────────────────────────────────────────────────\n';
    output += 'MISMATCHED RESULTS:\n';
    output += '───────────────────────────────────────────────────────\n';

    mismatchedResults.forEach((result, index) => {
      output += `\n${index + 1}. Formula: ${result.formula}\n`;
      output += `   Expected: ${result.expectedResult}\n`;
      output += `   Actual:   ${result.calculatedValue}\n`;
      output += `   Diff:     ${(result.calculatedValue - result.expectedResult).toFixed(6)}\n`;
    });
    output += '\n';
  }

  // Successful tests summary
  output += '───────────────────────────────────────────────────────\n';
  output += 'SAMPLE SUCCESSFUL CALCULATIONS (first 10):\n';
  output += '───────────────────────────────────────────────────────\n';

  const successful = report.results.filter(r => r.success && !r.isTextOnly && r.calculatedValue !== null);
  successful.slice(0, 10).forEach((result, index) => {
    output += `\n${index + 1}. ${result.formula}\n`;
    output += `   Result: ${result.calculatedValue}`;
    if (result.expectedResult !== undefined) {
      const match = result.matches ? '✓' : '✗';
      output += ` (Expected: ${result.expectedResult} ${match})`;
    }
    output += '\n';
  });

  output += '\n═══════════════════════════════════════════════════════\n';

  return output;
}

/**
 * Parse formula test data from text format
 * @param {string} text - Text with "Formula    Quantity" format
 * @returns {array} Array of {formula, expectedResult} objects
 */
function parseFormulaTestData(text) {
  const tests = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === 'Formula    Quantity') continue;

    // Try to split by multiple spaces or tabs
    const parts = line.split(/\s{2,}|\t/);

    if (parts.length >= 2) {
      const formula = parts[0].trim();
      const expectedResult = parseFloat(parts[parts.length - 1]);

      if (formula) {
        tests.push({
          formula: formula,
          expectedResult: isNaN(expectedResult) ? null : expectedResult,
          parentQty: 1
        });
      }
    } else {
      // Single column - just formula
      tests.push({
        formula: line,
        expectedResult: null,
        parentQty: 1
      });
    }
  }

  return tests;
}

module.exports = {
  testFormula,
  testMultipleFormulas,
  formatTestReport,
  parseFormulaTestData,
  detectSyntaxErrors
};
