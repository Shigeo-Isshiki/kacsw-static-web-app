const assert = require('assert');

// モジュールを読み込み
const zc = require('../src/zip-code-address-utils.js');

// 簡易 fetch スタブ
let originalFetch;
const makeFetchStub = (status, jsonBody) => {
	return (url) => {
		return Promise.resolve({
			status,
			ok: status >= 200 && status < 300,
			json: () => Promise.resolve(jsonBody),
		});
	};
};

// テスト開始
(async () => {
	// setup
	originalFetch = global.fetch;

	try {
		// 1) formatZipCode: 正常系（数字7桁 -> ハイフン付き）
		global.fetch = makeFetchStub(200, { addresses: [{ zip_code: '1234567' }] });
		await new Promise((resolve, reject) => {
			zc.formatZipCode('123-4567', (res) => {
				try {
					assert.ok(res.zipCode === '123-4567');
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: formatZipCode numeric 7-digit');

		// 2) formatZipCode: デジタルアドレス（英字含む） -> 通常化された返却
		global.fetch = makeFetchStub(200, { addresses: [{ zip_code: 'A1B2C3D' }] });
		await new Promise((resolve, reject) => {
			zc.formatZipCode('A1B-2C3D', (res) => {
				try {
					assert.ok(res.zipCode === 'A1B2C3D');
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: formatZipCode alnum');

		// 3) checkZipCodeExists: 存在する
		global.fetch = makeFetchStub(200, { addresses: [{ zip_code: '1234567' }] });
		await new Promise((resolve, reject) => {
			zc.checkZipCodeExists('1234567', (exists) => {
				try {
					assert.strictEqual(exists, true);
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: checkZipCodeExists exists');

		// 4) checkZipCodeExists: 404 -> false
		global.fetch = makeFetchStub(404, null);
		await new Promise((resolve, reject) => {
			zc.checkZipCodeExists('0000000', (exists) => {
				try {
					assert.strictEqual(exists, false);
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: checkZipCodeExists not exists (404)');

		// 5) getAddressByZipCode: 正常系の返却内容構造
		const apiResp = {
			addresses: [
				{
					zip_code: '1234567',
					pref_name: '東京都',
					city_name: '千代田区',
					town_name: '千代田',
					block_name: '1-1',
					other_name: null,
					biz_name: null,
				},
			],
		};
		global.fetch = makeFetchStub(200, apiResp);
		await new Promise((resolve, reject) => {
			zc.getAddressByZipCode('1234567', (res) => {
				try {
					assert.ok(!res.error);
					assert.strictEqual(res.apiZipCode, '1234567');
					assert.strictEqual(res.zipCode1, '1');
					assert.strictEqual(res.zipCode7, '7');
					assert.strictEqual(res.prefName, '東京都');
					assert.strictEqual(res.cityName, '千代田区');
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: getAddressByZipCode normal case');

		// 6) getAddressByZipCode: API 404 -> error
		global.fetch = makeFetchStub(404, null);
		await new Promise((resolve, reject) => {
			zc.getAddressByZipCode('0000000', (res) => {
				try {
					assert.ok(res.error);
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: getAddressByZipCode 404 case');

		// 7) getCityByZipCode / getPrefectureByZipCode
		global.fetch = makeFetchStub(200, apiResp);
		await new Promise((resolve, reject) => {
			let c = 0;
			zc.getCityByZipCode('1234567', (city) => {
				try {
					assert.strictEqual(city, '千代田区');
					if (++c === 2) resolve();
				} catch (e) {
					reject(e);
				}
			});
			zc.getPrefectureByZipCode('1234567', (pref) => {
				try {
					assert.strictEqual(pref, '東京都');
					if (++c === 2) resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: getCityByZipCode and getPrefectureByZipCode');

		// 8) normalizeZipCode: 存在する
		global.fetch = makeFetchStub(200, { addresses: [{ zip_code: '1234567' }] });
		await new Promise((resolve, reject) => {
			zc.normalizeZipCode('１２３－４５６７', (res) => {
				try {
					assert.strictEqual(res.zipCode, '1234567');
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: normalizeZipCode fullwidth input');

		// 9) invalid input (not 7 chars) -> formatZipCode returns error in callback
		await new Promise((resolve) => {
			zc.formatZipCode('123', (res) => {
				assert.ok(res.error);
				resolve();
			});
		});
		console.log('PASS: formatZipCode invalid input');

		// 10) kintone DOM helpers: basic invocation (we'll stub kintone.app.record.getSpaceElement)
		// prepare a fake DOM element and kintone
		global.document = global.document || {
			createElement: () => ({
				id: null,
				textContent: null,
				addEventListener: () => {},
				appendChild: () => {},
				remove: () => {},
			}),
			getElementById: () => null,
		};
		global.kintone = global.kintone || {
			app: {
				record: {
					getSpaceElement: () => ({ parentNode: { style: {} }, appendChild: () => {} }),
				},
			},
		};
		// call kintoneZipSetSpaceFieldButton with null label to hide
		zc.kintoneZipSetSpaceFieldButton('S', 'btn-id', undefined, '1234567');
		zc.kintoneZipSpaceFieldText('S', 'txt-id', true);
		console.log('PASS: kintone DOM helper basic calls');

		console.log('ALL ZIP-CODE-ADDRESS-UTILS TESTS INVOKED');
	} finally {
		// restore
		global.fetch = originalFetch;
	}
})();
