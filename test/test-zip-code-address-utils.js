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

		// 9) kintone では CORS に依存せず kintone.proxy を利用する
		const previousKintone = global.kintone;
		const proxyUrls = [];
		global.kintone = {
			proxy: (url, method, headers, body, success) => {
				proxyUrls.push({ url, method, headers, body });
				success(JSON.stringify({ addresses: [{ zip_code: '1234567' }] }), 200);
			},
		};
		global.fetch = () => Promise.reject(new Error('fetch should not be called in kintone'));
		await new Promise((resolve, reject) => {
			zc.formatZipCode('1234567', (res) => {
				try {
					assert.strictEqual(res.zipCode, '123-4567');
					assert.strictEqual(proxyUrls.length, 1);
					assert.strictEqual(proxyUrls[0].method, 'GET');
					assert.ok(proxyUrls[0].url.includes('search_code=1234567'));
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		if (previousKintone === undefined) delete global.kintone;
		else global.kintone = previousKintone;
		console.log('PASS: ZIP API uses kintone.proxy when available');

		// 10) hasPrefectureName: 住所の先頭にある正式な都道府県名だけを許可する
		assert.strictEqual(zc.hasPrefectureName('東京都千代田区千代田1-1'), true);
		assert.strictEqual(zc.hasPrefectureName('北海道札幌市中央区北一条'), true);
		assert.strictEqual(zc.hasPrefectureName('沖縄県那覇市泉崎1-1'), true);
		assert.strictEqual(zc.hasPrefectureName('千代田区東京都千代田1-1'), false);
		assert.strictEqual(zc.hasPrefectureName('東京千代田区千代田1-1'), false);
		assert.strictEqual(zc.hasPrefectureName(' 東京都千代田区千代田1-1'), false);
		assert.strictEqual(zc.hasPrefectureName(''), false);
		assert.strictEqual(zc.hasPrefectureName(null), false);
		console.log('PASS: hasPrefectureName strict prefix check');

		// 10) invalid input (not 7 chars) -> formatZipCode returns error in callback
		await new Promise((resolve) => {
			zc.formatZipCode('123', (res) => {
				assert.ok(res.error);
				resolve();
			});
		});
		console.log('PASS: formatZipCode invalid input');

		// getAddressByZipCode: API応答の追加項目は改名のみで未加工のまま返す。
		const detailedAddress = {
			zip_code: '1234567',
			dgacode: 'A1B2C3D',
			pref_code: '13',
			pref_name: '東京都',
			pref_kana: 'トウキョウト',
			pref_roma: 'TOKYO',
			city_code: '13101',
			city_name: '千代田区',
			city_kana: 'チヨダク',
			city_roma: 'CHIYODA-KU',
			town_name: '千代田',
			town_kana: 'チヨダ',
			town_roma: 'CHIYODA 1',
			biz_name: null,
			biz_kana: null,
			biz_roma: null,
			block_name: '1-1',
			other_name: null,
			address: '東京都千代田区千代田１−１',
			corporate_number: '0000000000000',
			business_name: null,
			business_name_kana: 'カナ',
			tel_number: '03-0000-0000',
			url: 'https://example.com/',
			longitude: 139.75,
			latitude: 35.68,
			locations: [{ floor: '1F' }],
			usage: { type: 'office' },
		};
		global.fetch = makeFetchStub(200, { addresses: [detailedAddress] });
		await new Promise((resolve, reject) => {
			zc.getAddressByZipCode('1234567', (res) => {
				try {
					assert.ok(!res.error);
					// 既存キーは従来どおり（apiAddressと結合addressは別キー）
					assert.strictEqual(res.address, '東京都千代田区千代田1-1');
					assert.strictEqual(res.prefName, '東京都');
					// 追加キーはAPIの値を未加工で保持（空白・型を変換しない）
					assert.strictEqual(res.dgaCode, 'A1B2C3D');
					assert.strictEqual(res.prefCode, '13');
					assert.strictEqual(res.prefKana, 'トウキョウト');
					assert.strictEqual(res.prefRoma, 'TOKYO');
					assert.strictEqual(res.cityCode, '13101');
					assert.strictEqual(res.cityKana, 'チヨダク');
					assert.strictEqual(res.cityRoma, 'CHIYODA-KU');
					assert.strictEqual(res.townKana, 'チヨダ');
					assert.strictEqual(res.townRoma, 'CHIYODA 1');
					assert.strictEqual(res.bizKana, null);
					assert.strictEqual(res.bizRoma, null);
					assert.strictEqual(res.apiAddress, '東京都千代田区千代田１−１');
					assert.strictEqual(res.corporateNumber, '0000000000000');
					assert.strictEqual(res.businessNameKana, 'カナ');
					assert.strictEqual(res.telNumber, '03-0000-0000');
					assert.strictEqual(res.url, 'https://example.com/');
					assert.strictEqual(res.longitude, 139.75);
					assert.strictEqual(res.latitude, 35.68);
					assert.deepStrictEqual(res.locations, [{ floor: '1F' }]);
					assert.deepStrictEqual(res.usage, { type: 'office' });
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: getAddressByZipCode returns raw API extras');

		// 追加項目のキー欠落（undefined）はnullに揃え、既存の検証は変えない
		global.fetch = makeFetchStub(200, {
			addresses: [
				{ zip_code: '1234567', pref_name: '東京都', city_name: '千代田区', town_name: '千代田' },
			],
		});
		await new Promise((resolve, reject) => {
			zc.getAddressByZipCode('1234567', (res) => {
				try {
					assert.ok(!res.error);
					for (const key of [
						'dgaCode',
						'prefCode',
						'prefKana',
						'prefRoma',
						'cityCode',
						'cityKana',
						'cityRoma',
						'townKana',
						'townRoma',
						'bizKana',
						'bizRoma',
						'apiAddress',
						'corporateNumber',
						'businessNameKana',
						'telNumber',
						'url',
						'longitude',
						'latitude',
						'locations',
						'usage',
					])
						assert.strictEqual(res[key], null, key);
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});
		console.log('PASS: getAddressByZipCode missing API extras become null');

		console.log('ALL ZIP-CODE-ADDRESS-UTILS TESTS INVOKED');
	} finally {
		// restore
		global.fetch = originalFetch;
	}
})();
