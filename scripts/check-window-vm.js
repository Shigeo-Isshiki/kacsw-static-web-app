const fs = require('fs');
const path = require('path');
const vm = require('vm');

const distDir = path.resolve(__dirname, '..', 'dist');
const files = [
  'kintone-custom-lib.js',
  'date-utils.js',
  'date_handling.js',
  'text-suite.js',
  'character_handling.js',
  'national_holiday_handling.js',
  'financial_institution_processing.js',
  'zip-code-address-utils.js',
  'zipcode_processing.js',
  'phone-utils.js',
  'phone_number_translation.js',
  'shipping-processing.js',
  'vc-check.js',
  // do NOT load jquery.autoKana.js because it expects jQuery
  'all-window-exports.js'
];

const namesToCheck = [
  'getNationalHolidayName',
  'isSingleByteAlnumOnly',
  'toFullWidthKatakana',
  'toFullWidth',
  'toHalfWidth',
  'convert_to_hiragana',
  'start'
];

const context = {
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  // minimal globals
  window: {},
  self: {},
  globalThis: {},
  navigator: { userAgent: 'node' },
};

// make window/self/globalThis refer to the same object inside the context
context.self = context.window;
context.globalThis = context.window;

vm.createContext(context);

files.forEach((f) => {
  const p = path.join(distDir, f);
  if (!fs.existsSync(p)) {
    console.warn('[skip] not found:', f);
    return;
  }
  try {
    let code = fs.readFileSync(p, 'utf8');
    // Wrap each file in an IIFE to avoid duplicate top-level declarations
    // while preserving assignments to window (files usually assign window.xxx = ... at the end).
    const wrapped = `(function(window){\n"use strict";\n${code}\n})(typeof window !== 'undefined' ? window : globalThis);`;
    vm.runInContext(wrapped, context, { filename: p, displayErrors: true });
    console.log('[loaded]', f);
  } catch (err) {
    console.warn('[error] loading', f, err && err.message ? err.message : err);
  }
});

console.log('\n=== check results ===');
namesToCheck.forEach((name) => {
  try {
    // Check both as a top-level binding and as a property on window
    const topType = vm.runInContext('typeof ' + name, context);
    const winType = typeof context.window[name];
    console.log(name + ': top=' + topType + ' window.' + name + '=' + winType);
  } catch (e) {
    console.log(name + ': (error while checking)');
  }
});

console.log('\nContext window keys count:', Object.keys(context.window).length);
// list a few keys
const keys = Object.keys(context.window).slice(0, 200);
console.log(keys.join(', '));
