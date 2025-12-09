const assert = require('assert');
const path = require('path');

// ブラウザ向け公開スタイルに合わせて global.window を設定してから読み込む
global.window = global;
require(path.join(__dirname, '..', 'src', 'shipping-processing.js'));

const getNextBusinessDay = global.getNextBusinessDay || (window && window.getNextBusinessDay);
const kintoneShippingInquiryButton =
  global.kintoneShippingInquiryButton || (window && window.kintoneShippingInquiryButton);
const validateTrackingNumber = global.validateTrackingNumber || (window && window.validateTrackingNumber);

if (!getNextBusinessDay || !kintoneShippingInquiryButton || !validateTrackingNumber)
  throw new Error('shipping-processing の関数が取得できませんでした');

// --- validateTrackingNumber tests ---
try {
  const out = validateTrackingNumber('１２３－４５６－７８９０');
  assert.strictEqual(out, '1234567890', '全角数字とハイフンを許容して半角数字だけに変換');
  console.log('PASS: validateTrackingNumber fullwidth and hyphen');
} catch (e) {
  console.error('FAIL: validateTrackingNumber fullwidth', e && e.message ? e.message : e);
  process.exitCode = 2;
}

try {
  let threw = false;
  try {
    validateTrackingNumber('ABC-123');
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, 'アルファベットを含むと例外を投げること');
  console.log('PASS: validateTrackingNumber rejects non-digit chars');
} catch (e) {
  console.error('FAIL: validateTrackingNumber rejects non-digit', e && e.message ? e.message : e);
  process.exitCode = 2;
}

try {
  let threw = false;
  try {
    validateTrackingNumber('12345', 10, 14); // 短すぎ
  } catch (e) {
    threw = true;
  }
  assert.ok(threw, '短すぎる伝票番号は例外');
  console.log('PASS: validateTrackingNumber rejects too short');
} catch (e) {
  console.error('FAIL: validateTrackingNumber too short', e && e.message ? e.message : e);
  process.exitCode = 2;
}

// --- getNextBusinessDay tests (stub fetch to be deterministic) ---
try {
  // stub fetch: 常に response.ok = false にして祝日判定が false になるようにする
  global.fetch = (url) =>
    Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not_found' }) });

  // 基準日時が営業日かつ締め時間前 -> 同じ日が返る
  const base = new Date('2025-11-12T10:00:00'); // 水曜日
  getNextBusinessDay(base, 16, (out) => {
    try {
      assert.strictEqual(out, '2025-11-12', '締め時間前は同日が返る');
      console.log('PASS: getNextBusinessDay same-day before cutoff');
    } catch (e) {
      console.error('FAIL: getNextBusinessDay same-day', e && e.message ? e.message : e);
      process.exitCode = 2;
    }
  });
} catch (e) {
  console.error('FAIL: getNextBusinessDay setup', e && e.message ? e.message : e);
  process.exitCode = 2;
}

try {
  // cutoff を超える場合は翌営業日が返る
  global.fetch = (url) => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'not_found' }) });
  const base2 = new Date('2025-11-12T17:00:00'); // 水曜 17:00 -> 木曜に進む
  getNextBusinessDay(base2, 16, (out) => {
    try {
      assert.strictEqual(out, '2025-11-13', '締め時間超過時は翌営業日');
      console.log('PASS: getNextBusinessDay next-day after cutoff');
    } catch (e) {
      console.error('FAIL: getNextBusinessDay next-day', e && e.message ? e.message : e);
      process.exitCode = 2;
    }
  });
} catch (e) {
  console.error('FAIL: getNextBusinessDay second setup', e && e.message ? e.message : e);
  process.exitCode = 2;
}

// --- kintoneShippingInquiryButton tests ---
try {
  // Setup fake DOM and kintone
  const spaceField = 'space1';
  const spaceElement = {
    _appended: null,
    appendChild: function (el) {
      this._appended = el;
    },
    parentNode: { style: { display: 'none' } },
  };

  // simple document stub
  global.document = {
    _byId: {},
    createElement: function (tag) {
      const el = {
        tagName: tag,
        id: '',
        textContent: '',
        _listener: null,
        addEventListener: function (_evt, fn) {
          this._listener = fn;
        },
        click: function () {
          if (this._listener) this._listener();
        },
        remove: function () {
          // noop
        },
      };
      return el;
    },
    getElementById: function (id) {
      return this._byId[id] || null;
    },
  };

  global.kintone = {
    app: {
      record: {
        getSpaceElement: function (field) {
          if (field === spaceField) return spaceElement;
          return null;
        },
      },
    },
  };

  // spy for window.open
  let lastOpened = null;
  global.window.open = function (url) {
    lastOpened = url;
  };

  // 1) ラベル省略時のデフォルトラベル追加 + クリックで window.open が呼ばれる
  kintoneShippingInquiryButton(spaceField, 'btn1', undefined, '1234567890', 'yamato');
  const appended = spaceElement._appended;
  try {
    assert.ok(appended, 'ボタンが追加されていること');
    assert.strictEqual(appended.id, 'btn1', '追加ボタンの id が正しいこと');
    assert.strictEqual(appended.textContent, '荷物問い合わせ', 'デフォルトラベルが設定されること');
    // simulate click
    appended.click();
    assert.ok(
      lastOpened && lastOpened.indexOf(encodeURIComponent('1234567890')) !== -1,
      'クリック時に window.open が呼ばれ、伝票番号が URL に含まれること'
    );
    console.log('PASS: kintoneShippingInquiryButton creates button and opens URL');
  } catch (e) {
    console.error('FAIL: kintoneShippingInquiryButton create/open', e && e.message ? e.message : e);
    process.exitCode = 2;
  }

  // 2) label が null の場合、スペース親要素が非表示になる
  spaceElement.parentNode.style.display = '';
  kintoneShippingInquiryButton(spaceField, 'btn2', null, '123', 'yamato');
  try {
    assert.strictEqual(spaceElement.parentNode.style.display, 'none', 'label が null で親が非表示になる');
    console.log('PASS: kintoneShippingInquiryButton hides parent when label is null');
  } catch (e) {
    console.error('FAIL: kintoneShippingInquiryButton hide-on-null', e && e.message ? e.message : e);
    process.exitCode = 2;
  }
} catch (e) {
  console.error('FAIL: kintoneShippingInquiryButton setup', e && e.message ? e.message : e);
  process.exitCode = 2;
}

console.log('ALL SHIPPING-PROCESSING TESTS INVOKED');
