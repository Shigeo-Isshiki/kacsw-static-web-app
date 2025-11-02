#!/usr/bin/env node
const { spawn } = require('child_process');

const ONCE = process.argv.includes('--once');
const WATCH = process.argv.includes('--watch') || process.argv.includes('-w');
const INTERVAL_MS = 5000;
const DEBOUNCE_MS = 300;
let chokidar;
try { chokidar = require('chokidar'); } catch (e) { /* will error later if watch requested */ }

function runOnce() {
  return new Promise((resolve) => {
    console.log('Running puppeteer-check.js...');
    const cp = spawn(process.execPath, ['scripts/puppeteer-check.js'], { stdio: 'inherit' });
    cp.on('close', (code) => {
      console.log('puppeteer-check exit code', code);
      resolve(code);
    });
  });
}

(async function main(){
  if (ONCE && !WATCH) {
    await runOnce();
    return;
  }

  if (WATCH) {
    if (!chokidar) {
      console.error('chokidar is required for --watch. Please run `npm install` to install dependencies.');
      process.exit(1);
    }
    console.log('Starting watch mode for src/ -> will run on changes (debounce', DEBOUNCE_MS, 'ms)');
    let timer = null;
    // watch src and package.json (in case prepare:dist changes)
    const watcher = chokidar.watch(['src/**/*', 'package.json'], { ignoreInitial: true });
    watcher.on('all', (event, path) => {
      console.log('change detected:', event, path);
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await runOnce();
        } catch (e) {
          console.error('auto-check run error', e && e.message ? e.message : e);
        }
        if (ONCE) {
          await watcher.close();
          process.exit(0);
        }
      }, DEBOUNCE_MS);
    });
    // run initial check as well
    await runOnce();
    return;
  }

  console.log('Starting auto-check loop (press Ctrl+C to stop).');
  while (true) {
    try {
      await runOnce();
    } catch (e) {
      console.error('auto-check run error', e && e.message ? e.message : e);
    }
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }
})();
