#!/usr/bin/env node
const fs = require('fs').promises;
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

const files = [
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

async function copyFile(srcRel, destDir) {
    const src = path.join(SRC, srcRel);
    const dest = path.join(destDir, path.basename(srcRel));
    await fs.copyFile(src, dest);
}

async function copyDir(srcDir, destDir) {
    await fs.mkdir(destDir, { recursive: true });
    const entries = await fs.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else if (entry.isFile()) {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

(async () => {
    try {
        // remove dist if exists (Node 14+ supports fs.rm)
        try {
            await fs.rm(DIST, { recursive: true, force: true });
        } catch (e) {
            // ignore if rm is not supported; fall back to rmdir
            try {
                await fs.rmdir(DIST, { recursive: true });
            } catch (_) {
                // ignore
            }
        }
        await fs.mkdir(DIST, { recursive: true });

        for (const f of files) {
            const srcPath = path.join(SRC, f);
            try {
                await fs.copyFile(srcPath, path.join(DIST, path.basename(f)));
                console.log(`copied ${f}`);
            } catch (err) {
                console.warn(`warning: failed to copy ${f}: ${err.message}`);
            }
        }

        // copy image directory if exists
        const srcImage = path.join(SRC, 'image');
        try {
            const stat = await fs.stat(srcImage);
            if (stat.isDirectory()) {
                await copyDir(srcImage, path.join(DIST, 'image'));
                console.log('copied image directory');
            }
        } catch (e) {
            // no image dir, ignore
        }

        console.log('prepare:dist finished');
    } catch (err) {
        console.error('prepare:dist failed:', err);
        process.exit(1);
    }
})();
