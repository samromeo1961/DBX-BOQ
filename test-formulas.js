/**
 * Test script for Databuild formulas
 * Run with: node test-formulas.js
 */

const { testMultipleFormulas, formatTestReport, parseFormulaTestData } = require('./src/utils/formulaTester');
const fs = require('fs');
const path = require('path');

// Formula test data from user's list
const formulaTestData = `Formula    Quantity
    0
 [No Workup]    0
"FOR DETAILS OF CLIENT SELECTIONS PLEASE REFER TO THE JOB SIGNED SPECIFICATION WHICH IS AVAILABLE TO YOU FOR DOWNLOAD FROM THE JOB ONLINE LINK"    0.7
"H" Moulds    0.0624999
(Extra 600mm Allowed For Breakfast Bar Second End Panel Of Island)    0.6
. 2040 x 1000 Front Entry Door To Have Four Hinges    0
. 2040 x 1020 Front Entry Door To Have Four Hinges    0
. 2040mm x 920mm x 40mm with 4 hinges and jamb secured by screws    0
. 2340 x 1020 Front Entry Door To Have Four Hinges    0
. 2340 x 1120 Front Entry Door To Have Four Hinges    0
. 2340 x 1200 Front Entry Door To Have Four Hinges    0
. 2340 x 820 Front Entry Door To Have Four Hinges    0
. 2340mm x 1200mm x 40mm XS24 with 4 hinges and jamb secured by screws    0
[(Qty/Qty)*1]/[Qty]    1
[(Qty/Qty)*4]/[Qty]    4
[No Workup]    0
[Qty*.018rnd1/5.4]/5.4    0.625
[Qty*.232rnd1/5.4]/5.4    1.25
[Qty*.29/5.4*1.05rnd1]/5.4 Framing for Eaves - (Inc 5% Wastage)    1.6
[Qty*.296rnd1/5.4]/5.4    1.6
[Qty*.29rnd1/5.4]/5.4    1.6
[qty*.667Rnd1]/2.7    1.8
[qty*.667Rnd1]/5.4    3.6
[qty*0.223Rnd1]/5.4    1.8
[qty*0.389*2Rnd1]/5.4  [qty*0.334*2Rnd1]/5.4    2
[qty*0.45Rnd1]/2.7    1.8
-[Qty*0.6/5.4rnd0]/5.4    -0.6
-[Qty*0.8/5.4rnd0]/5.4    -0.8
-[Qty*0.89/5.4rnd0]/5.4    -0.89
[qty*0.89Rnd1]/2.7    2.4
[Qty*0.9/2.7rnd1]/2.7    0.9
-[Qty*0.9/5.4rnd0]/5.4    -0.9
[Qty*1.0/5.4rnd0]/5.4    1
-[Qty*1.0/5.4rnd0]/5.4    -1
[Qty*1.05/5.4rnd0]/5.4    1.05
[Qty*1.05] meters - Eave Trim - (Inc 5% Wastage)    0.194444
-[Qty*1.09/5.4rnd0]/5.4    -1.09
[qty*1.0Rnd1]/2.7    2.7
[Qty*1.0rnd1]/5.4    5.4
[Qty*1.1/5.4]/5.4    1.1
[Qty*1.1/5.4rnd0]/5.4    1.1
-[Qty*1.1/5.4rnd0]/5.4    -0.9
[Qty*1.1/5.4rnd1]/5.4    1
[Qty*1.1rnd1]/5.4    5.85
-[Qty*1.2.4/5.4rnd0]/5.4    -1.24
[Qty*1.2/5.4rnd0]/5.4    1.2
-[Qty*1.2/5.4rnd0]/5.4    -1.2
-[Qty*1.3/5.4rnd0]/5.4    -1.3
-[Qty*1.4/5.4rnd0]/5.4    -1.4
[Qty*1.5/5.4rnd0]/5.4    1.5
-[Qty*1.5/5.4rnd0]/5.4    -1.5
-[Qty*1.54/5.4rnd0]/5.4    -1.54
[Qty*1.6/5.4rnd0]/5.4    1.6
-[Qty*1.6/5.4rnd0]/5.4    -1.6
[Qty*1.62/5.4rnd0]/5.4    1.62
-[Qty*1.62/5.4rnd0]/5.4    -1.62
-[Qty*1.64/5.4rnd0]/5.4    -1.64
-[Qty*1.68/5.4rnd0]/5.4    -1.68
-[Qty*1.73/5.4rnd0]/5.4    -1.73
-[Qty*1.76/5.4rnd0]/5.4    -1.68
[Qty*1.8/5.4rnd0]/5.4    1.8
-[Qty*1.8/5.4rnd0]/5.4    -1.8
-[Qty*1.82/5.4rnd0]/5.4    -1.82
-[Qty*1.84/5.4rnd0]/5.4    -1.84
[Qty*1.96/5.4rnd0]/5.4    1.96
[Qty*1/2.7rnd0]/2.7    1
[Qty*10.0/5.4rnd0]/5.4    10
-[Qty*10.34/5.4rnd0]/5.4    -10.34
[Qty*10.4/5.4rnd0]/5.4    10.4
[Qty*10.8/5.4rnd0]/5.4    10.8
[Qty*10.8/5.4rnd1]/5.4    10.8
[Qty*10.88/5.4rnd1]/5.4    10.88
[Qty*11.1/5.4rnd0]/5.4    11.1
[Qty*11.1111/5.4rnd1]/5.4    11.1111
[Qty*11.28/5.4rnd1]/5.4    11.28
[Qty*11.3/5.4rnd0]/5.4    11.3
[Qty*11.4/5.4rnd0]/5.4    11.4
[Qty*11.4/5.4rnd1]/5.4    11.4
[Qty*11.64/5.4rnd1]/5.4    11.64
[Qty*12.2/5.4rnd0]/5.4    12.2
[Qty*12.6/5.4rnd0]/5.4    12.6
[Qty*13.0/5.4rnd0]/5.4    13
-[Qty*13.2/5.4rnd0]/5.4    -13.2
[Qty*13.32/5.4rnd1]/5.4    13.32
[Qty*14.16/5.4rnd1]/5.4    14.16
[Qty*14.96/5.4rnd1]/5.4    14.96
[qty*1Rnd1]/5.4    5.4
[Qty*2.0/5.4rnd0]/5.4    2
-[Qty*2.0/5.4rnd0]/5.4    -2
-[Qty*2.04/5.4rnd0]/5.4    -2.04
-[Qty*2.08/5.4rnd0]/5.4    -2.08
[Qty*2.08rnd1]/5.4    11.2
[Qty*2.0rnd1]/5.4    10.8
[Qty*2.1/5.4rnd0]/5.4    2.1
-[Qty*2.1/5.4rnd0]/5.4    -1.5
[Qty*2.17rnd1]/5.4    10.8
-[Qty*2.18/5.4rnd0]/5.4    -1.6
[Qty*2.2/5.4rnd0]/5.4    2.2
-[Qty*2.2/5.4rnd0]/5.4    -2.2
[Qty*2.23rnd1]/5.4    12
[Qty*2.4/5.4rnd0]/5.4    2.1
-[Qty*2.4/5.4rnd0]/5.4    -2.1
-[Qty*2.48/5.4rnd0]/5.4    -2.48
[Qty*2.5/5.4rnd0]/5.4    2.5
-[Qty*2.55.4rnd0]/5.4    -2.5
[Qty*2.56/5.4rnd0]/5.4    2.56
[Qty*2.56rnd1]/5.4    13.8
[Qty*2.6/5.4rnd0]/5.4    2.6
-[Qty*2.6/5.4rnd0]/5.4    -2.6
[Qty*2.7/5.4rnd0]/5.4    2.7
-[Qty*2.7/5.4rnd0]/5.4    -2.7
[Qty*2.8/5.4rnd0]/5.4    3
-[Qty*2.8/5.4rnd0]/5.4    -2.8
-[Qty*2.88/5.4rnd0]/5.4    -2.88
[Qty*3.0/5.4rnd0]/5.4    3
-[Qty*3.0/5.4rnd0]/5.4    -3
-[Qty*3.03/5.4rnd0]/5.4    -3.03
-[Qty*3.08/5.4rnd0]/5.4    -3.08
[Qty*3.1/5.4rnd0]/5.4    3.1
-[Qty*3.1/5.4rnd0]/5.4    -3.1
-[Qty*3.2.8/5.4rnd0]/5.4    -3.28
[Qty*3.2/5.4rnd0]/5.4    3.2
-[Qty*3.2/5.4rnd0]/5.4    -3.2
-[Qty*3.24/5.4rnd0]/5.4    -3.24
-[Qty*3.28/5.4rnd0]/5.4    -3.28
[Qty*3.3/5.4rnd0]/5.4    3.3
-[Qty*3.3/5.4rnd0]/5.4    -3.3
[Qty*3.4/5.4rnd0]/5.4    3.4
-[Qty*3.4/5.4rnd0]/5.4    -3.4
-[Qty*3.45/5.4rnd0]/5.4    -1.3
-[Qty*3.48/5.4rnd0]/5.4    -3.48
[Qty*3.6/5.4rnd0]/5.4    3.6
-[Qty*3.6/5.4rnd0]/5.4    -3.3
-[Qty*3.68/5.4rnd0]/5.4    -3.68
-[Qty*3.72/5.4rnd0]/5.4    -3.72
[Qty*3.8/5.4rnd0]/5.4    3.8
-[Qty*3.8/5.4rnd0]/5.4    -3.8
-[Qty*3.9/5.4rnd0]/5.4    -3.9
[Qty*4.0/5.4rnd0]/5.4    4
-[Qty*4.0/5.4rnd0]/5.4    -4
-[Qty*4.08/5.4rnd0]/5.4    -4.08
[Qty*4.1/5.4rnd0]/5.4    4.1
-[Qty*4.1/5.4rnd0]/5.4    -4.1
[Qty*4.2/5.4rnd0]/5.4    2
-[Qty*4.2/5.4rnd0]/5.4    -4.2
-[Qty*4.32/5.4rnd0]/5.4    -4.32
[Qty*4.4/5.4rnd0]/5.4    4.4
-[Qty*4.4/5.4rnd0]/5.4    -4.4
[Qty*4.5/5.4rnd0]/5.4    4.5
-[Qty*4.5/5.4rnd0]/5.4    -4.5
-[Qty*4.54/5.4rnd0]/5.4    -4.54
[Qty*4.6/5.4rnd0]/5.4    4.6
-[Qty*4.6/5.4rnd0]/5.4    -4.6
[Qty*4.7/5.4rnd0]/5.4    4.7
-[Qty*4.7/5.4rnd0]/5.4    -4.7
[Qty*4.8/5.4rnd0]/5.4    4.8
-[Qty*4.8/5.4rnd0]/5.4    -4.8
-[Qty*4.85/5.4rnd0]/5.4    -4.85
-[Qty*4.92/5.4rnd0]/5.4    -4.92
[Qty*5.0/5.4rnd0]/5.4    5
-[Qty*5.0/5.4rnd0]/5.4    -5
-[Qty*5.1/5.4rnd0]/5.4    -5.1
-[Qty*5.17/5.4rnd0]/5.4    -5.17
[Qty*5.2/5.4rnd0]/5.4    5.2
-[Qty*5.2/5.4rnd0]/5.4    -5.2
[Qty*5.4/5.4rnd0]/5.4    5.4
-[Qty*5.4/5.4rnd0]/5.4    -5.4
[Qty*5.6/5.4rnd0]/5.4    5.2
[Qty*5.7/5.4rnd0]/5.4    5.7
-[Qty*5.7/5.4rnd0]/5.4    -5.7
-[Qty*5.76/5.4rnd0]/5.4    -5.76
[Qty*5.8/5.4rnd0]/5.4    5.8
-[Qty*5.8/5.4rnd0]/5.4    -5.8
[Qty*6.0/5.4rnd0]/5.4    6
-[Qty*6.0/5.4rnd0]/5.4    -6
[Qty*6.2/5.4rnd0]/5.4    6.2
[Qty*6.3/5.4rnd0]/5.4    6.3
[Qty*6.4/5.4rnd0]/5.4    6.4
-[Qty*6.4/5.4rnd0]/5.4    -6.4
-[Qty*6.56/5.4rnd0]/5.4    -6.56
[Qty*6.6/5.4rnd0]/5.4    6.6
-[Qty*6.6/5.4rnd0]/5.4    -6.6
[Qty*6.8/5.4rnd0]/5.4    6.8
-[Qty*6.8/5.4rnd0]/5.4    -6.8
[Qty*6.9/5.4rnd0]/5.4    6.9
[Qty*7.0/5.4rnd0]/5.4    7
[Qty*7.2/5.4rnd0]/5.4    7.2
-[Qty*7.2/5.4rnd0]/5.4    -7.2
-[Qty*7.26/5.4rnd0]/5.4    -7.26
[Qty*7.3/5.4rnd0]/5.4    7.3
[Qty*7.4/5.4rnd0]/5.4    7.4
[Qty*7.5/5.4rnd0]/5.4    7.5
[Qty*7.6/5.4rnd0]/5.4    7.6
[Qty*7.8/5.4rnd0]/5.4    7.8
-[Qty*7.82/5.4rnd0]/5.4    -7.82
[Qty*8.0/5.4rnd0]/5.4    8
-[Qty*8.0/5.4rnd0]/5.4    -8
[Qty*8.2/5.4rnd0]/5.4    8.2
[Qty*8.3/5.4rnd0]/5.4    8.3
[Qty*8.4/5.4rnd0]/5.4    8.4
[Qty*8.7/5.4rnd0]/5.4    8.7
[Qty*9.0/5.4rnd0]/5.4    9
[Qty*9.6/5.4rnd0]/5.4    9.6
[qty/*1/5.4Rnd0]/5.4    5.44
[Qty/2.7rnd1]/2.7    1
[Qty/5.4rnd1]/5.4    1
1/0.9    0.9
1/0.90    0.9
1/1.2    1.2
1/1.20    1.2
1/1.5    1.5
1/1.50    1.5
1/1.8    1.8
1/1.80    1.8
1/2.1    2.1
1/2.10    2.1
1/2.40    2.4
1/2.7    2.7
1/3.0    3
1/3.3    3.3
1/3.6    3.6
1/3.9    3.9
1/4.2    4.2
1/4.5    4.5
1/4.8    4.8
1/5.1    5.1
1/5.4    5.4
1/5.7    5.7
1/6.0    6
2/2.1    4.2
2/2.1   1/0.9    1
2/2.1   1/1.2    1
2/2.1   1/1.5    1
2/2.1   1/1.8    1
2/2.1  1/1.8    6.6
2/2.4    4.8
2/2.4   1/0.9    1
2/2.4   1/1.2    1
2/2.4   1/1.5    1
2/2.4   1/1.8    1
2/2.7    5.4
2340 Front Entry Door To Have Four Hinges    0
2340 x 1020 x 35 H 54    1
5/3.6    9.6`;

console.log('Starting Databuild Formula Tests...\n');

// Parse the test data
const tests = parseFormulaTestData(formulaTestData);
console.log(`Parsed ${tests.length} formulas from test data\n`);

// Run tests
const report = testMultipleFormulas(tests);

// Format and display report
const formattedReport = formatTestReport(report);
console.log(formattedReport);

// Save detailed results to JSON file
const detailedResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: report.totalTests,
    passed: report.passed,
    failed: report.failed,
    textOnly: report.textOnly,
    withWarnings: report.withWarnings,
    successRate: ((report.passed / (report.totalTests - report.textOnly)) * 100).toFixed(2) + '%'
  },
  results: report.results
};

const outputPath = path.join(__dirname, 'formula-test-results.json');
fs.writeFileSync(outputPath, JSON.stringify(detailedResults, null, 2));
console.log(`\nDetailed results saved to: ${outputPath}`);

// Save text report
const reportPath = path.join(__dirname, 'formula-test-report.txt');
fs.writeFileSync(reportPath, formattedReport);
console.log(`Text report saved to: ${reportPath}`);
