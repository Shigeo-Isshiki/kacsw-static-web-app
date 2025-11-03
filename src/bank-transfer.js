// bank-transfer.js
// 単一ファイルで提供する銀行振込ユーティリティ（kintone向け、callback専用）
// 公開 API (window.KACSW.bankTransfer):
//  - getBank(input)                 // 銀行コード or 銀行名を自動判定して返す
//  - getBranch(bankCode, branch)    // 支店コード or 支店名で支店を返す
//  - convertYucho(kigou, bangou)    // ゆうちょ記号/番号を全銀向け口座情報に変換（簡易）
//  - generateZenginTransfer(records) // 簡易CSV形式の振込データ生成
//  - loadBankByCode(bankCode, options?, callback) // BankKunスタイルの単一銀行取得（callbackのみ）
//  - loadBankDataFromBankKun(apiBaseUrl, options?, callback) // 全件取得系（callbackのみ、オプションでパス調整可）

// --- 内部キャッシュ（プレフィックス _bt_ ）
const _bt_BANKS = [
  { code: '0001', name: 'みずほ銀行', kana: 'ミズホギンコウ' },
  { code: '0005', name: '三菱UFJ銀行', kana: 'ミツビシUFJギンコウ' },
  { code: '0009', name: '三井住友銀行', kana: 'ミツイスミトモギンコウ' },
  { code: '9900', name: 'ゆうちょ銀行', kana: 'ユウチョギンコウ' },
];

const _bt_BRANCHES = {
  '0001': [
    { branchCode: '001', name: '本店営業部', kana: 'ホンテンエイギョウブ' },
    { branchCode: '002', name: '渋谷支店', kana: 'シブヤシテン' },
  ],
  9900: [{ branchCode: '001', name: 'ゆうちょ本店', kana: 'ユウチョホンテン' }],
};

// 内部ユーティリティ
const _bt_toStr = (v) => (v == null ? '' : String(v));

// -------------------------
// 公開: BankKun 単一銀行取得（/banks/{code}.json） callback-only
// - loadBankByCode('0001', options?, callback)
// - callback(err, result)  result: { success:true, bank } or error
// -------------------------
// internal: _bt_loadBankByCode - not exposed to window.KACSW
const _bt_loadBankByCode = (bankCode, options = {}, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  const {
    apiBaseUrl = 'https://bank.teraren.com',
    apiKey,
    timeout = 5000,
    pathTemplate = '/banks/{code}.json',
  } = options;
  const code = _bt_toStr(bankCode).padStart(4, '0');
  const base = apiBaseUrl.replace(/\/$/, '');
  const path = pathTemplate.replace('{code}', code);
  const url = base + path;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (abortController) timer = setTimeout(() => abortController.abort(), timeout);

  fetch(url, { headers, signal: abortController ? abortController.signal : undefined })
    .then((res) => {
      if (!res.ok) {
        // HTTP ステータスが OK でない場合は日本語でわかりやすいメッセージを投げる
        throw new Error(`銀行情報の取得に失敗しました（HTTPステータス: ${res.status}）`);
      }
      return res.json();
    })
    .then((j) => {
      const bankObj = {
        code: _bt_toStr(j.code).padStart(4, '0'),
        name: _bt_toStr(j.normalize && j.normalize.name ? j.normalize.name : j.name),
        kana: _bt_toStr(j.normalize && j.normalize.kana ? j.normalize.kana : j.kana),
        url: _bt_toStr(j.url || url),
        branches_url: _bt_toStr(j.branches_url || base + `/banks/${code}/branches.json`),
      };
      const idx = _bt_BANKS.findIndex((b) => b.code === bankObj.code);
      if (idx >= 0) _bt_BANKS[idx] = bankObj;
      else _bt_BANKS.push(bankObj);
      if (typeof callback === 'function') callback(null, { success: true, bank: bankObj });
    })
    .catch((err) => {
      // AbortError（タイムアウト等）を判別して分かりやすい日本語メッセージに変換
      let message = null;
      try {
        if (err && err.name === 'AbortError') {
          message = '取得がタイムアウトしました（指定時間内に応答がありません）';
        } else if (err && err.message) {
          // すでに日本語のメッセージを投げている場合はそのまま使う
          message = err.message;
        } else {
          message = '銀行情報の取得中に不明なエラーが発生しました';
        }
      } catch (e2) {
        message = '銀行情報の取得中にエラーが発生しました';
      }
      const e = { success: false, error: message };
      if (typeof callback === 'function') callback(e, null);
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
};

// -------------------------
// 公開: 銀行取得（自動判定）
// 入力が数字のみ（<=4桁）ならコード検索して単一オブジェクトまたは null を返す
// そうでなければ名前で部分一致検索して配列を返す
// -------------------------
// getBank: (input, [callback])
// - if input looks like a bank code and a callback is provided, call internal _bt_loadBankByCode
//   and return via callback the simplified object { code, name, kana }
// - otherwise behave as before (synchronous): return object|null for code lookup or array for name search
const getBank = (input, callback) => {
  const s = _bt_toStr(input).trim();
  if (!s) return null;
  const digitsOnly = /^[0-9]+$/.test(s);
  if (digitsOnly && s.length <= 4) {
    const key = s.padStart(4, '0');
    // If a callback is provided, use the internal async loader to refresh/obtain bank info
    if (typeof callback === 'function') {
      // call internal loader; it returns via callback(err, { success, bank })
      _bt_loadBankByCode(key, {}, (err, res) => {
        // err があればそのまま中継
        if (err) return callback(err, null);
        // 結果が無い場合は汎用メッセージ
        if (!res) return callback({ success: false, error: '銀行情報の取得結果が空です' }, null);
        // _bt_loadBankByCode が失敗を示す場合はそのオブジェクトをそのまま中継
        if (res && res.success === false) return callback(res, null);
        // 成功だが bank がない場合は不整合エラーを返す
        if (!res.bank)
          return callback(
            { success: false, error: '銀行データがレスポンスに含まれていません' },
            null
          );
        const b = res.bank;
        return callback(null, { code: b.code, name: b.name, kana: b.kana });
      });
      return;
    }
    // synchronous fallback: return from internal cache
    return _bt_BANKS.find((b) => b.code === key) || null;
  }
  const q = s.toLowerCase();
  return _bt_BANKS.filter(
    (b) =>
      _bt_toStr(b.name).toLowerCase().includes(q) || _bt_toStr(b.kana).toLowerCase().includes(q)
  );
};

// -------------------------
// 公開: 支店取得
// -------------------------
const getBranch = (bankCode, branchCodeOrName) => {
  const bankKey = _bt_toStr(bankCode).padStart(4, '0');
  const list = _bt_BRANCHES[bankKey] || [];
  const q = _bt_toStr(branchCodeOrName).toLowerCase();
  if (!q) return null;
  const byCode = list.find((b) => _bt_toStr(b.branchCode) === q.padStart(3, '0'));
  if (byCode) return byCode;
  return (
    list.find(
      (b) =>
        _bt_toStr(b.name).toLowerCase().includes(q) || _bt_toStr(b.kana).toLowerCase().includes(q)
    ) || null
  );
};

// -------------------------
// 公開: ゆうちょ変換（簡易）
// -------------------------
const convertYucho = (kigou, bangou) => {
  const k = _bt_toStr(kigou).replace(/[^0-9]/g, '');
  const b = _bt_toStr(bangou).replace(/[^0-9]/g, '');
  if (k.length < 1 || b.length < 1) {
    return { error: 'invalid_format', message: '記号/番号の形式が不正です' };
  }
  const bankCode = '9900';
  const branchCode = k.padStart(5, '0').slice(0, 3);
  const accountNumber = b.slice(-7).padStart(7, '0');
  const accountType = 'ordinary';
  return {
    bankCode,
    branchCode,
    accountType,
    accountNumber,
    note: 'この変換は簡易実装です。全銀仕様に従い必ず確認してください。',
  };
};

// -------------------------
// 公開: 振込データ（簡易CSV）
// -------------------------
const generateZenginTransfer = (records = []) => {
  const lines = [];
  lines.push(
    'from_bank,from_branch,from_type,from_account,to_bank,to_branch,to_type,to_account,amount,customer_name,customer_kana,reference'
  );
  for (const r of records) {
    const from = r.fromAccount || {};
    const cols = [
      _bt_toStr(from.bankCode),
      _bt_toStr(from.branchCode),
      _bt_toStr(from.accountType),
      _bt_toStr(from.accountNumber),
      _bt_toStr(r.toBankCode),
      _bt_toStr(r.toBranchCode),
      _bt_toStr(r.toAccountType),
      _bt_toStr(r.toAccountNumber),
      String(r.amount || 0),
      '"' + (r.customerName || '') + '"',
      '"' + (r.customerKana || '') + '"',
      '"' + (r.reference || '') + '"',
    ];
    lines.push(cols.join(','));
  }
  return lines.join('\n');
};

// -------------------------
// 公開: BankKun から全件取得してキャッシュ更新（callback-only）
// - apiBaseUrl: 例 'https://bank.teraren.com'
// - options: { apiKey, timeout(ms)=5000, banksPath='/banks', branchesPath='/branches' }
// - callback: function(err, result)
// result: { success:true, loadedBanks, loadedBranches } or on error { success:false, error }
// -------------------------
const loadBankDataFromBankKun = (apiBaseUrl, options = {}, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (!apiBaseUrl) {
    if (typeof callback === 'function')
      callback({ success: false, error: 'apiBaseUrl required' }, null);
    return;
  }
  const { apiKey, timeout = 5000, banksPath = '/banks', branchesPath = '/branches' } = options;
  const base = apiBaseUrl.replace(/\/$/, '');
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let timer = null;
  if (abortController) timer = setTimeout(() => abortController.abort(), timeout);

  fetch(base + banksPath, { headers, signal: abortController ? abortController.signal : undefined })
    .then((banksRes) => {
      if (!banksRes.ok) throw new Error(`banks fetch failed: ${banksRes.status}`);
      return banksRes.json();
    })
    .then((banksJson) => {
      if (!Array.isArray(banksJson)) throw new Error('banks response not array');
      _bt_BANKS.length = 0;
      for (const b of banksJson) {
        _bt_BANKS.push({
          code: _bt_toStr(b.code).padStart(4, '0'),
          name: _bt_toStr(b.name),
          kana: _bt_toStr(b.kana),
        });
      }
      return fetch(base + branchesPath, {
        headers,
        signal: abortController ? abortController.signal : undefined,
      });
    })
    .then((branchesRes) => {
      if (!branchesRes.ok) {
        const resObj = { success: true, loadedBanks: _bt_BANKS.length, loadedBranches: 0 };
        if (typeof callback === 'function') callback(null, resObj);
        return;
      }
      return branchesRes.json().then((branchesJson) => {
        if (!Array.isArray(branchesJson)) throw new Error('branches response not array');
        // clear
        for (const k in _bt_BRANCHES) delete _bt_BRANCHES[k];
        for (const br of branchesJson) {
          const bk = _bt_toStr(br.bankCode).padStart(4, '0');
          if (!_bt_BRANCHES[bk]) _bt_BRANCHES[bk] = [];
          _bt_BRANCHES[bk].push({
            branchCode: _bt_toStr(br.branchCode).padStart(3, '0'),
            name: _bt_toStr(br.name),
            kana: _bt_toStr(br.kana),
          });
        }
        const resObj = {
          success: true,
          loadedBanks: _bt_BANKS.length,
          loadedBranches: Object.keys(_bt_BRANCHES).reduce(
            (acc, k) => acc + (_bt_BRANCHES[k] ? _bt_BRANCHES[k].length : 0),
            0
          ),
        };
        if (typeof callback === 'function') callback(null, resObj);
      });
    })
    .catch((err) => {
      const e = { success: false, error: err && err.message ? err.message : String(err) };
      if (typeof callback === 'function') callback(e, null);
    })
    .finally(() => {
      if (timer) clearTimeout(timer);
    });
};

// expose to window for kintone
if (typeof window !== 'undefined') {
  window.KACSW = window.KACSW || {};
  window.KACSW.bankTransfer = window.KACSW.bankTransfer || {};
  Object.assign(window.KACSW.bankTransfer, {
    getBank,
    getBranch,
    convertYucho,
    generateZenginTransfer,
    loadBankDataFromBankKun,
    loadBankByCode,
  });
}
