'use strict';
const path = require('path');
const fs = require('fs-extra');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// files to copy from src -> dist (keep in sync with previous list)
const FILES = [
	'kintone-custom-lib.js',
	'zip-code-address-utils.js',
	'zipcode_processing.js',
	'phone_number_translation.js',
	'phone-utils.js',
	'character_handling.js',
	'date-utils.js',
	'date_handling.js',
	'text-suite.js',
	'financial_institution_processing.js',
	'shipping-processing.js',
	'vc-check.js',
	'password_generation.js',
	'jquery.autoKana.js',
	'national_holiday_handling.js',
	'all-window-exports.js',
	'index.html',
	'test.html',
	'test-all-scripts.html',
	'styles.css',
];

async function run() {
	try {
		// ensure node version compatibility (best-effort check)
		const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
		if (Number.isNaN(nodeMajor) || nodeMajor < 14) {
			console.warn(
				'Warning: Node.js 14+ is recommended for prepare-dist (found ' + process.versions.node + ')'
			);
		}

		// remove previous dist and recreate
		await fs.remove(DIST);
		await fs.mkdirp(DIST);

		for (const f of FILES) {
			const srcPath = path.join(SRC, f);
			const destPath = path.join(DIST, path.basename(f));
			try {
				await fs.copy(srcPath, destPath, { overwrite: true, errorOnExist: false });
				console.log('copied', f);
			} catch (err) {
				console.warn('warning: failed to copy', f + ':', err.message);
			}
		}

		// copy image directory if exists
		const srcImage = path.join(SRC, 'image');
		if (await fs.pathExists(srcImage)) {
			await fs.copy(srcImage, path.join(DIST, 'image'), { overwrite: true, recursive: true });
			console.log('copied image directory');
		}

		console.log('prepare:dist finished');
	} catch (err) {
		console.error('prepare:dist failed:', err);
		process.exitCode = 1;
	}
}

run();
