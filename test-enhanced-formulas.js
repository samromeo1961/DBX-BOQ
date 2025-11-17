/**
 * Test Enhanced Formula System (Math.js Style)
 * Demonstrates clean syntax with custom variables
 */

const { parseFormula, evaluateFormula, getDefaultInputValues } = require('./src/utils/enhancedFormulaParser');

console.log('═══════════════════════════════════════════════════════');
console.log('   ENHANCED FORMULA SYSTEM - Math.js Style Tests');
console.log('═══════════════════════════════════════════════════════\n');

// Test cases with new clean syntax
const testCases = [
  {
    name: 'Simple Expression',
    formula: 'QTY * 2',
    context: { QTY: 5 },
    expectedResult: 10
  },
  {
    name: 'Custom Variable with Default',
    formula: `wallHeight = 2.4
QTY * wallHeight`,
    context: { QTY: 10 },
    expectedResult: 24
  },
  {
    name: 'Multiple Variables',
    formula: `length = 3.6
width = 2.4
area = length * width
QTY * area`,
    context: { QTY: 1 },
    expectedResult: 8.64
  },
  {
    name: 'Override Variable Value',
    formula: `wallHeight = 2.4
QTY * wallHeight`,
    context: { QTY: 10, wallHeight: 3.0 },
    expectedResult: 30
  },
  {
    name: 'Math Functions',
    formula: 'ceil(QTY / 5.4)',
    context: { QTY: 10 },
    expectedResult: 2
  },
  {
    name: 'Rounding to Increment',
    formula: 'round(QTY * 2.5 / 1) * 1',
    context: { QTY: 3 },
    expectedResult: 8
  },
  {
    name: 'Wastage Calculation',
    formula: `baseQty = QTY * 2.5
wastage = 1.1
baseQty * wastage`,
    context: { QTY: 4 },
    expectedResult: 11
  },
  {
    name: 'Undefined Variable (Becomes Input)',
    formula: `QTY * wallHeight`,
    context: { QTY: 5, wallHeight: 2.4 },
    expectedResult: 12
  },
  {
    name: 'Bracketed Variable - Simple',
    formula: `QTY * [Wall Height]`,
    context: { QTY: 5, 'Wall Height': 2.4 },
    expectedResult: 12
  },
  {
    name: 'Bracketed Variable - Assignment',
    formula: `[Wall Height] = 2.4
QTY * [Wall Height]`,
    context: { QTY: 10 },
    expectedResult: 24
  },
  {
    name: 'Bracketed Variable - Multiple',
    formula: `QTY * [Wall Height] * [Wall Length]`,
    context: { QTY: 1, 'Wall Height': 2.4, 'Wall Length': 3.6 },
    expectedResult: 8.64
  },
  {
    name: 'Bracketed Variable - Mixed with Regular',
    formula: `length = QTY * 2
area = length * [Wall Height]
area`,
    context: { QTY: 3, 'Wall Height': 2.5 },
    expectedResult: 15
  },
  {
    name: 'Bracketed Variable - Override Assignment',
    formula: `[Wall Height] = 2.4
QTY * [Wall Height]`,
    context: { QTY: 10, 'Wall Height': 3.0 },
    expectedResult: 30
  }
];

console.log('Running Tests...\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Formula: ${test.formula.replace(/\n/g, ' ⮐ ')}`);
  console.log(`   Context: ${JSON.stringify(test.context)}`);

  // Parse to find required inputs
  const parsed = parseFormula(test.formula);
  if (parsed.requiredInputs.length > 0) {
    console.log(`   📝 Required Inputs: ${parsed.requiredInputs.join(', ')}`);
  }

  // Evaluate
  const result = evaluateFormula(test.formula, test.context);

  if (result.success) {
    const matches = Math.abs(result.result - test.expectedResult) < 0.0001;

    if (matches) {
      console.log(`   ✅ Result: ${result.result} (Expected: ${test.expectedResult})`);
      passed++;
    } else {
      console.log(`   ❌ Result: ${result.result} (Expected: ${test.expectedResult})`);
      failed++;
    }
  } else {
    console.log(`   ❌ Error: ${result.error}`);
    failed++;
  }

  console.log('');
});

console.log('═══════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════\n');

// Demonstrate variable detection
console.log('Variable Detection Example (CamelCase):');
console.log('───────────────────────────────────────────────────────');

const exampleFormula = `# Calculate wall area
wallHeight = 2.4
wallLength = 3.6
area = wallHeight * wallLength
wastage = 1.1
finalQty = QTY * area * wastage
finalQty`;

const parsedExample = parseFormula(exampleFormula);
console.log('Formula:');
console.log(exampleFormula);
console.log('\nDetected Variables:', Object.keys(parsedExample.variables));
console.log('Required Inputs (undefined variables):', parsedExample.requiredInputs);

console.log('\n📋 User would see input fields for: wallHeight, wallLength, wastage');
console.log('These can be set with default values or left for user to enter.\n');

// Show default values
if (parsedExample.requiredInputs.length > 0) {
  const defaults = getDefaultInputValues(parsedExample.requiredInputs);
  console.log('Smart Defaults:');
  for (const [varName, value] of Object.entries(defaults)) {
    console.log(`  ${varName}: ${value}`);
  }
}

// Demonstrate bracketed variable detection
console.log('\n\nBracketed Variable Detection Example:');
console.log('───────────────────────────────────────────────────────');

const bracketedFormula = `# Calculate concrete volume with bracketed variables
[Wall Height] = 2.4
[Wall Length] = 3.6
area = [Wall Height] * [Wall Length]
[Wastage Factor] = 1.1
QTY * area * [Wastage Factor]`;

const parsedBracketed = parseFormula(bracketedFormula);
console.log('Formula:');
console.log(bracketedFormula);
console.log('\nDetected Variables:', Object.keys(parsedBracketed.variables));
console.log('Required Inputs (undefined variables):', parsedBracketed.requiredInputs);

console.log('\n📋 User would see input fields for: Wall Height, Wall Length, Wastage Factor');
console.log('Variables with spaces are fully supported!\n');

// Show default values for bracketed variables
if (parsedBracketed.requiredInputs.length > 0) {
  const defaults = getDefaultInputValues(parsedBracketed.requiredInputs);
  console.log('Smart Defaults:');
  for (const [varName, value] of Object.entries(defaults)) {
    console.log(`  "${varName}": ${value}`);
  }
}
