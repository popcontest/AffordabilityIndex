// Test grade calculation function
function scoreToGrade(score) {
  if (score === null || score === undefined) return null;

  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

// Test cases from actual database
const testCases = [
  { city: 'Detroit, MI', score: 79.47, expectedGrade: 'B' },
  { city: 'Wichita, KS', score: 60.43, expectedGrade: 'C' },
  { city: 'Midwest, WY', score: 99.98, expectedGrade: 'A+' },
  { city: 'Superior, WY', score: 99.94, expectedGrade: 'A+' },
  { city: 'Edge case: 95.0', score: 95.0, expectedGrade: 'A+' },
  { city: 'Edge case: 94.9', score: 94.9, expectedGrade: 'A' },
  { city: 'Edge case: 80.0', score: 80.0, expectedGrade: 'B+' },
  { city: 'Edge case: 79.9', score: 79.9, expectedGrade: 'B' },
  { city: 'Edge case: 60.0', score: 60.0, expectedGrade: 'C' },
  { city: 'Edge case: 59.9', score: 59.9, expectedGrade: 'C-' },
  { city: 'Edge case: 50.0', score: 50.0, expectedGrade: 'D' },
  { city: 'Edge case: 49.9', score: 49.9, expectedGrade: 'F' },
];

console.log('LETTER GRADE CALCULATION VERIFICATION');
console.log('='.repeat(80));
console.log();

console.log('CURRENT GRADING SCALE:');
console.log('  A+: 95-100');
console.log('  A:  90-94');
console.log('  A-: 85-89');
console.log('  B+: 80-84');
console.log('  B:  75-79');
console.log('  B-: 70-74');
console.log('  C+: 65-69');
console.log('  C:  60-64');
console.log('  C-: 55-59');
console.log('  D:  50-54');
console.log('  F:  0-49');
console.log();

console.log('TEST RESULTS:');
console.log('-'.repeat(80));

let allPassed = true;

testCases.forEach(({ city, score, expectedGrade }) => {
  const actualGrade = scoreToGrade(score);
  const passed = actualGrade === expectedGrade;
  const status = passed ? '✓ PASS' : '✗ FAIL';

  if (!passed) allPassed = false;

  console.log(`${status} | ${city.padEnd(25)} | Score: ${score.toString().padEnd(7)} | Expected: ${expectedGrade.padEnd(3)} | Got: ${actualGrade}`);
});

console.log('-'.repeat(80));
console.log();

if (allPassed) {
  console.log('✓ ALL TESTS PASSED - Grade calculations are correct!');
} else {
  console.log('✗ SOME TESTS FAILED - Review grade calculation logic');
}

console.log();
console.log('ANALYSIS:');
console.log('-'.repeat(80));
console.log('The current grading scale uses 5-point intervals for most grades,');
console.log('which is standard academic grading. This appears appropriate for');
console.log('composite scores ranging from 0-100.');
console.log();
console.log('Key observations:');
console.log('  - Detroit (79.47) gets B - correct for a score in 75-79 range');
console.log('  - Wichita (60.43) gets C - correct for a score in 60-64 range');
console.log('  - Top cities (99.98) get A+ - correct for scores 95+');
console.log();
