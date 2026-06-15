const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testDir = path.join(__dirname, '..', 'test');
const setupFile = path.join(testDir, 'setup-tests.js');

const runTestFile = (fileName) => {
	console.log('RUN', fileName);
	const testFile = path.join(testDir, fileName);
	const result = spawnSync(process.execPath, ['-r', setupFile, testFile], {
		stdio: 'inherit',
	});
	return result.status || 0;
};

let hasFailure = false;

const testFiles = fs
	.readdirSync(testDir)
	.filter((f) => /^test-.*\.js$/.test(f))
	.filter((f) => f !== 'test-bank-transfer.js')
	.sort();

testFiles.forEach((f) => {
	const code = runTestFile(f);
	if (code !== 0) {
		hasFailure = true;
	}
});

// Run bank-transfer tests last (keeps existing ordering behavior)
const bankTransferCode = runTestFile('test-bank-transfer.js');
if (bankTransferCode !== 0) {
	hasFailure = true;
}

if (hasFailure) {
	process.exitCode = 1;
}
