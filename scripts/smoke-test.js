/**
 * Quick Smoke Test Script
 * Run this after making changes to verify basic functionality
 *
 * Usage: node scripts/smoke-test.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n=================================');
console.log('DBx BOQ - Quick Smoke Test');
console.log('=================================\n');

const tests = [];

// Test 1: Check critical files exist
console.log('✓ Checking critical files...');
const criticalFiles = [
  'main.js',
  'preload.js',
  'src/database/connection.js',
  'src/ipc-handlers/global-settings.js',
  'src/ipc-handlers/boq.js',
  'src/ipc-handlers/catalogue.js',
  'frontend/src/App.vue',
  'frontend/src/composables/useElectronAPI.js'
];

let filesOk = true;
criticalFiles.forEach(file => {
  if (!fs.existsSync(path.join(__dirname, '..', file))) {
    console.error(`  ✗ Missing: ${file}`);
    filesOk = false;
  }
});

if (filesOk) {
  console.log('  ✓ All critical files present\n');
  tests.push({ name: 'Critical Files', passed: true });
} else {
  console.log('  ✗ Some files missing\n');
  tests.push({ name: 'Critical Files', passed: false });
}

// Test 2: Check for common syntax errors
console.log('✓ Checking for syntax errors...');
try {
  // Try to require main backend files
  require('../src/ipc-handlers/global-settings.js');
  console.log('  ✓ global-settings.js loads without errors');
  tests.push({ name: 'global-settings.js syntax', passed: true });
} catch (error) {
  console.error(`  ✗ global-settings.js has errors:`, error.message);
  tests.push({ name: 'global-settings.js syntax', passed: false });
}

// Test 3: Check Vue components compile
console.log('\n✓ Checking Vue component syntax...');
try {
  const settingsView = fs.readFileSync(
    path.join(__dirname, '../frontend/src/components/Settings/SettingsView.vue'),
    'utf8'
  );

  // Basic syntax checks
  if (settingsView.includes('export default')) {
    console.log('  ✓ SettingsView.vue has valid structure');
    tests.push({ name: 'SettingsView.vue structure', passed: true });
  }
} catch (error) {
  console.error(`  ✗ SettingsView.vue error:`, error.message);
  tests.push({ name: 'SettingsView.vue structure', passed: false });
}

// Test 4: Check for TODO comments (optional warning)
console.log('\n✓ Checking for TODO comments...');
try {
  const result = execSync('grep -r "TODO:" src/ frontend/src/', { encoding: 'utf8' });
  const todos = result.split('\n').filter(line => line.trim());
  if (todos.length > 0) {
    console.log(`  ⚠ Found ${todos.length} TODO comments (not an error, just FYI)`);
  }
} catch (error) {
  // grep returns non-zero if no matches, which is fine
  console.log('  ✓ No TODO comments found');
}

// Summary
console.log('\n=================================');
console.log('Test Summary:');
console.log('=================================');

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

tests.forEach(test => {
  const icon = test.passed ? '✓' : '✗';
  console.log(`${icon} ${test.name}`);
});

console.log(`\nTotal: ${passed}/${tests.length} passed`);

if (failed > 0) {
  console.log('\n⚠ Some tests failed. Review errors above.');
  process.exit(1);
} else {
  console.log('\n✓ All smoke tests passed!\n');
  console.log('Recommended next steps:');
  console.log('1. Start the app: npm run dev');
  console.log('2. Check database connection indicator');
  console.log('3. Navigate to each tab');
  console.log('4. Test the feature you changed');
  console.log('5. Review TESTING_CHECKLIST.md for full regression test\n');
  process.exit(0);
}
