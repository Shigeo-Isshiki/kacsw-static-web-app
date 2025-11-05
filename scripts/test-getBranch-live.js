// Live test runner for getBranch in bank-transfer.js
// Usage: node scripts/test-getBranch-live.js

(async function () {
  try {
    // make a minimal browser-like global for the script to attach to
    global.window = global.window || {};
    global.self = global.self || global.window;

    // require the bank-transfer script (it will populate window.BANK)
    require('../src/bank-transfer.js');

    const bt = (global.window && global.window.BANK) || null;
    if (!bt || typeof bt.getBranch !== 'function') {
      console.error('bankTransfer.getBranch not found on window.BANK');
      process.exit(2);
    }

    const tests = [
      { bank: '0001', branch: '001', desc: '支店コードでの取得（本店営業部: 001 を想定）' },
      { bank: '0001', branch: '渋谷支店', desc: '支店名での取得（部分一致/完全一致の挙動確認）' },
    ];

    let idx = 0;
    const runOne = () => {
      if (idx >= tests.length) {
        console.log('全テスト完了');
        process.exit(0);
      }
      const t = tests[idx++];
      console.log('\n--- 実行: ' + t.desc + " -> getBranch('" + t.bank + "', '" + t.branch + "') ---");
      // getBranch uses single-arg callback style; provide one-arg callback
      try {
        bt.getBranch(t.bank, t.branch, (res) => {
          console.log('コールバック結果:');
          console.log(JSON.stringify(res, null, 2));
          // wait a moment before next to ensure network settle
          setTimeout(runOne, 800);
        });
      } catch (e) {
        console.error('getBranch 呼び出しで例外:', e && e.message ? e.message : e);
        setTimeout(runOne, 800);
      }
    };

    runOne();
  } catch (e) {
    console.error('テストランナーでエラー:', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
