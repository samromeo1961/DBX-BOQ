const {
  roundToIncrement,
  evaluateExpression,
  processFormulaLine,
  processRecipeFormula
} = require('./formulaParser');

console.log('🧪 Testing Formula Parser\n');
console.log('=' .repeat(60));

// Test 1: Rounding function
console.log('\n📐 Test 1: Rounding to increments');
console.log('-'.repeat(60));
console.log('roundToIncrement(2.5, 1) =', roundToIncrement(2.5, 1));  // Should be 3
console.log('roundToIncrement(2.4, 1) =', roundToIncrement(2.4, 1));  // Should be 2
console.log('roundToIncrement(1.8, 0.3) =', roundToIncrement(1.8, 0.3));  // Should be 1.8
console.log('roundToIncrement(1.85, 0.3) =', roundToIncrement(1.85, 0.3));  // Should be 1.8 or 2.1

// Test 2: Simple expression evaluation
console.log('\n📊 Test 2: Simple expression evaluation');
console.log('-'.repeat(60));
const vars = { QTY: 10, Qty: 10, qty: 10 };
console.log('Expression: QTY * 2', '| Result:', evaluateExpression('QTY * 2', vars));
console.log('Expression: Qty / 5', '| Result:', evaluateExpression('Qty / 5', vars));

// Test 3: Expression with rounding
console.log('\n🔢 Test 3: Expressions with rounding');
console.log('-'.repeat(60));
console.log('Expression: Qty*2.0rnd1', '| Result:', evaluateExpression('Qty*2.0rnd1', { Qty: 10 }));
console.log('Expression: 51*2.5rnd1', '| Result:', evaluateExpression('51*2.5rnd1', {}));

// Test 4: Complex formula from user's data
console.log('\n🎯 Test 4: Real formulas from database');
console.log('-'.repeat(60));

// Formula: [Qty*2.0rnd1]/5.4
console.log('\nFormula: [Qty*2.0rnd1]/5.4 with Qty=10');
const result1 = processFormulaLine('[Qty*2.0rnd1]/5.4', { qty: 10 });
console.log('Result:', JSON.stringify(result1, null, 2));

// Formula: Quantity = [QTY/500*50]
console.log('\nFormula: Quantity = [QTY/500*50] with QTY=1500');
const result2 = processFormulaLine('Quantity = [QTY/500*50]', { qty: 1500 });
console.log('Result:', JSON.stringify(result2, null, 2));

// Test 5: LocalVariable
console.log('\n📦 Test 5: LocalVariable creation');
console.log('-'.repeat(60));

const localVarFormula = 'LocalVariable WAREA = [HEIGHT*WIDTH/1000000] #';
const result3 = processFormulaLine(localVarFormula, {
  qty: 1,
  localVariables: { HEIGHT: 1200, WIDTH: 1500 }
});
console.log('Formula:', localVarFormula);
console.log('Result:', JSON.stringify(result3, null, 2));

// Test 6: OnlyIf condition
console.log('\n🔍 Test 6: OnlyIf conditions');
console.log('-'.repeat(60));

const onlyIfTrue = 'onlyif [ZONE=2]#';
const result4a = processFormulaLine(onlyIfTrue, {
  qty: 1,
  localVariables: { ZONE: 2 }
});
console.log('Formula:', onlyIfTrue, '| ZONE=2');
console.log('Result:', JSON.stringify(result4a, null, 2));

const result4b = processFormulaLine(onlyIfTrue, {
  qty: 1,
  localVariables: { ZONE: 3 }
});
console.log('Formula:', onlyIfTrue, '| ZONE=3');
console.log('Result:', JSON.stringify(result4b, null, 2));

// Test 7: Complex multi-line formula
console.log('\n🏗️  Test 7: Multi-line formula (Window example)');
console.log('-'.repeat(60));

const complexFormula = `LocalVariable WAREA = [HEIGHT*WIDTH/1000000] #
LocalVariable TAREA = [qty*WAREA] #
LocalVariable NBRICKS = [TAREA*51rnd1] #
Quantity = [-NBRICKS/1000] #`;

const result5 = processRecipeFormula(complexFormula, {
  qty: 3,
  localVariables: { HEIGHT: 1200, WIDTH: 1800 }
});
console.log('Context: qty=3, HEIGHT=1200, WIDTH=1800');
console.log('Result:', JSON.stringify(result5, null, 2));

// Test 8: Formula with workup text
console.log('\n📝 Test 8: Formula with workup text');
console.log('-'.repeat(60));

const workupFormula = 'Please supply#[HEIGHT-50] X [WIDTH-75]  [qty] OFF';
const result6 = processFormulaLine(workupFormula, {
  qty: 3,
  localVariables: { HEIGHT: 1200, WIDTH: 1800 }
});
console.log('Formula:', workupFormula);
console.log('Result:', JSON.stringify(result6, null, 2));

// Test 9: Comparison operators
console.log('\n⚖️  Test 9: Conditional with comparisons');
console.log('-'.repeat(60));

const conditionFormula = 'onlyif [Height>=650 & Height<950 & Width>=650 & Width<950] #';
const result7a = processFormulaLine(conditionFormula, {
  qty: 1,
  localVariables: { Height: 900, Width: 900 }
});
console.log('Height=900, Width=900 (should be TRUE)');
console.log('Result:', JSON.stringify(result7a, null, 2));

const result7b = processFormulaLine(conditionFormula, {
  qty: 1,
  localVariables: { Height: 600, Width: 900 }
});
console.log('Height=600, Width=900 (should be FALSE)');
console.log('Result:', JSON.stringify(result7b, null, 2));

console.log('\n' + '='.repeat(60));
console.log('✅ All tests completed!\n');
