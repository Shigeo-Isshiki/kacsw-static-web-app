const fs = require('fs');
const path = require('path');

// Load global test setup (stubs for CI)
require(path.join(__dirname, '..', 'test', 'setup-tests.js'));

const testDir = path.join(__dirname, '..', 'test');
fs.readdirSync(testDir)
  .filter((f) => /^test-.*\.js$/.test(f))
  .filter((f) => !/^test-bank-transfer-/.test(f))
  .forEach((f) => {
    console.log('RUN', f);
    require(path.join(testDir, f));
  });

// Run bank-transfer tests last (keeps existing ordering behavior)
require(path.join(testDir, 'test-bank-transfer.js'));
