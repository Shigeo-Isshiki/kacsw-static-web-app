const assert = require('assert');

const nh = require('../src/national-holidays.js');

const findHolidayName = (list, date) => {
	const hit = list.find((item) => item.date === date);
	return hit ? hit.name : null;
};

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('1949-01-01'), '元日');
	assert.strictEqual(nh.isNationalHoliday('1949-01-01'), true);
	console.log('PASS: 元日 (1949-01-01)');
} catch (e) {
	console.error('FAIL: 元日', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('1988-04-29'), '天皇誕生日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('1989-04-29'), 'みどりの日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2007-04-29'), '昭和の日');
	console.log('PASS: 4/29 名称変更');
} catch (e) {
	console.error('FAIL: 4/29 名称変更', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2018-12-23'), '天皇誕生日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2019-12-23'), null);
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2020-02-23'), '天皇誕生日');
	console.log('PASS: 天皇誕生日の移行');
} catch (e) {
	console.error('FAIL: 天皇誕生日の移行', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('1999-01-15'), '成人の日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2000-01-10'), '成人の日');
	console.log('PASS: 成人の日の固定日/可変日');
} catch (e) {
	console.error('FAIL: 成人の日の固定日/可変日', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2015-09-22'), '国民の休日');
	console.log('PASS: 国民の休日 (2015-09-22)');
} catch (e) {
	console.error('FAIL: 国民の休日', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2006-01-02'), '振替休日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2019-05-06'), '振替休日');
	console.log('PASS: 振替休日');
} catch (e) {
	console.error('FAIL: 振替休日', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2020-07-20'), null);
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2020-07-23'), '海の日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2020-07-24'), 'スポーツの日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2020-08-10'), '山の日');
	console.log('PASS: 特例移動 (2020)');
} catch (e) {
	console.error('FAIL: 特例移動 (2020)', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2024-03-20'), '春分の日');
	assert.strictEqual(nh.getNationalHolidayNameByLaw('2024-09-22'), '秋分の日');
	console.log('PASS: 春分・秋分');
} catch (e) {
	console.error('FAIL: 春分・秋分', e && e.message ? e.message : e);
	process.exitCode = 2;
}

try {
	const holidays2024 = nh.getNationalHolidaysInYear(2024);
	assert.strictEqual(findHolidayName(holidays2024, '2024-01-01'), '元日');
	assert.strictEqual(findHolidayName(holidays2024, '2024-03-20'), '春分の日');
	assert.strictEqual(findHolidayName(holidays2024, '2024-09-22'), '秋分の日');
	console.log('PASS: getNationalHolidaysInYear (2024)');
} catch (e) {
	console.error('FAIL: getNationalHolidaysInYear (2024)', e && e.message ? e.message : e);
	process.exitCode = 2;
}

console.log('ALL NATIONAL-HOLIDAYS TESTS INVOKED');
