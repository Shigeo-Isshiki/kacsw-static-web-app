const fs = require('fs');
const path = require('path');
const spawnSync = require('child_process').spawnSync;

const testDir = path.join(__dirname);
const files = fs
  .readdirSync(testDir)
  .filter((f) => /^test-.*\.js$/.test(f) && f !== path.basename(__filename));

let failures = 0;

files.forEach((file) => {
  const p = path.join(testDir, file);
  console.log('\n=== RUN', file);
  const res = spawnSync(process.execPath, [p], { stdio: 'inherit' });
  if (res.error) {
    console.error('Error running', file, res.error);
    failures++;
  } else if (res.status !== 0) {
    console.error('Test', file, 'exited with code', res.status);
    failures++;
  } else {
    console.log('OK:', file);
  }
});

if (failures === 0) {
  console.log('\nALL TESTS PASSED');
  process.exitCode = 0;
} else {
  console.error('\n' + failures + ' TEST(S) FAILED');
  process.exitCode = 2;
}
