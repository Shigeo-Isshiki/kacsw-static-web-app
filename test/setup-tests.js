// test/setup-tests.js
// CI 環境で外部 API 呼び出しによる不安定な失敗を避けるためのデフォルトスタブ
// 必要なテストは個別に上書きしてください。
/* eslint-disable no-global-assign */
// Always replace the global fetch with a test stub so tests are deterministic in CI
global.fetch = function (url) {
    // Simple routing for known external services used in tests
    try {
      const u = String(url);
      // National holidays API -> always not found (not a holiday)
      if (u.indexOf('api.national-holidays.jp') !== -1) {
        return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not_found' }) });
      }
      // bank.teraren.com -> provide minimal stubbed bank/branch data used by tests
      if (u.indexOf('bank.teraren.com') !== -1) {
        // /banks/{code}.json
        const mBank = u.match(/\/banks\/(\d{4})\.json$/);
        if (mBank) {
          const code = mBank[1];
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ code, name: 'テスト銀行', kana: 'ﾃｽﾄｷﾞﾝｺｳ' }) });
        }
        // /banks/{code}/branches/{branch}.json
        // Try to match branches in a lenient way (allow optional .json or query string)
        const mBranch = u.match(/\/banks\/(\d{1,4})\/branches\/(\d{1,4})(?:\.json)?(?:$|[\?\/\#])/);
        if (mBranch) {
          const branchCode = mBranch[2].padStart(3, '0');
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ code: branchCode, name: '本店', kana: 'ﾎﾝﾃﾝ' }) });
        }
        // default bank API fallback
        return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not_found' }) });
      }
      // zip / postal APIs and others -> return not found by default
      return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'not_found' }) });
    } catch (e) {
      return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: 'stub error' }) });
    }
  };

// なお、ブラウザ向けのコードでは window.fetch を参照する場合があるため
// 必要に応じて window.fetch もスタブしておきます。
if (typeof global.window !== 'undefined') {
  global.window.fetch = global.fetch;
}
