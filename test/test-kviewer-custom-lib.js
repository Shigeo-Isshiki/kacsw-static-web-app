const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');

const libPath = path.join(__dirname, '..', 'src', 'kviewer-custom-lib.js');
const dom = new JSDOM(
	'<div id="view-a" class="kv-detail"><div id="field-a" style="display: grid"></div>' +
		'<button class="kv-detail-fb-button" style="display: inline-flex"></button>' +
		'<button class="kv-detail-fb-button"></button><button class="kv-detail-pc-button"></button></div>' +
		'<div id="view-b" class="kv-detail"><button class="kv-detail-fb-button"></button></div>'
);

try {
	global.window = dom.window;
	delete require.cache[require.resolve(libPath)];
	require(libPath);

	const {
		createDependencyChecker,
		getFieldValueOr,
		setFieldShown,
		setFormBridgeButtonShown,
		setPrintCreatorButtonShown,
	} = dom.window;
	const field = dom.window.document.getElementById('field-a');
	const viewA = dom.window.document.getElementById('view-a');
	const viewB = dom.window.document.getElementById('view-b');
	const contextA = {
		getFieldElement: (code) => (code === 'TARGET' ? field : null),
		getDetailViewElement: () => viewA,
	};
	const contextB = { getDetailViewElement: () => viewB };

	assert.deepStrictEqual(
		[
			getFieldValueOr({ zero: { value: 0 } }, 'zero', 'fallback'),
			getFieldValueOr({ no: { value: false } }, 'no', 'fallback'),
			getFieldValueOr({ blank: { value: '' } }, 'blank', 'fallback'),
			getFieldValueOr({ nil: { value: null } }, 'nil', 'fallback'),
			getFieldValueOr({ list: { value: [] } }, 'list', 'fallback'),
			getFieldValueOr({ undef: { value: undefined } }, 'undef', 'fallback'),
			getFieldValueOr({}, 'missing', 'fallback'),
		],
		[0, false, '', null, [], 'fallback', 'fallback']
	);
	assert.strictEqual(getFieldValueOr(null, 'x', 'fallback'), 'fallback');
	assert.strictEqual(getFieldValueOr({}, ' ', 'fallback'), 'fallback');

	assert.strictEqual(setFieldShown(contextA, 'TARGET', false), true);
	assert.strictEqual(field.style.display, 'none');
	assert.strictEqual(setFieldShown(contextA, 'TARGET', false), true);
	assert.strictEqual(field.style.display, 'none');
	assert.strictEqual(setFieldShown(contextA, 'TARGET', true), true);
	assert.strictEqual(field.style.display, 'grid');
	assert.strictEqual(setFieldShown(contextA, 'TARGET', false), true);
	assert.strictEqual(setFieldShown(contextA, 'TARGET', true), true);
	assert.strictEqual(field.style.display, 'grid');

	assert.strictEqual(setFieldShown(contextA, 'MISSING', false), false);
	assert.strictEqual(setFieldShown({}, 'TARGET', false), false);
	assert.strictEqual(setFieldShown(contextA, '', false), false);
	assert.strictEqual(setFieldShown(contextA, 'TARGET', 'false'), false);
	assert.strictEqual(setFieldShown(null, 'TARGET', false), false);
	assert.strictEqual(
		setFieldShown(
			{
				getFieldElement: () => {
					throw new Error('field lookup failed');
				},
			},
			'TARGET',
			false
		),
		false
	);
	assert.strictEqual(
		setFieldShown(
			{ getFieldElement: () => ({ nodeType: 1, style: { display: '' } }) },
			'TARGET',
			false
		),
		false
	);

	const fbButtonsA = viewA.querySelectorAll('.kv-detail-fb-button');
	const fbButtonB = viewB.querySelector('.kv-detail-fb-button');
	assert.strictEqual(setFormBridgeButtonShown(contextA, false), true);
	assert.deepStrictEqual(
		Array.from(fbButtonsA, (button) => button.style.display),
		['none', 'none']
	);
	assert.strictEqual(fbButtonB.style.display, '');
	assert.strictEqual(setFormBridgeButtonShown(contextA, false), true);
	assert.strictEqual(setFormBridgeButtonShown(contextA, true), true);
	assert.deepStrictEqual(
		Array.from(fbButtonsA, (button) => button.style.display),
		['inline-flex', '']
	);

	const pcButton = viewA.querySelector('.kv-detail-pc-button');
	assert.strictEqual(setPrintCreatorButtonShown(contextA, false), true);
	assert.strictEqual(pcButton.style.display, 'none');
	assert.strictEqual(setPrintCreatorButtonShown(contextA, true), true);
	assert.strictEqual(pcButton.style.display, '');
	assert.strictEqual(setFormBridgeButtonShown(contextB, false), true);
	assert.strictEqual(fbButtonB.style.display, 'none');

	assert.strictEqual(setFormBridgeButtonShown({}, false), false);
	assert.strictEqual(setFormBridgeButtonShown(contextA, 1), false);
	assert.strictEqual(
		setFormBridgeButtonShown(
			{ getDetailViewElement: () => dom.window.document.createElement('div') },
			false
		),
		false
	);
	assert.strictEqual(
		setPrintCreatorButtonShown(
			{
				getDetailViewElement: () => {
					throw new Error('detail lookup failed');
				},
			},
			false
		),
		false
	);
	assert.strictEqual(
		setPrintCreatorButtonShown({ getDetailViewElement: () => viewB }, false),
		false
	);

	// A hypothetical sibling placement verifies failure reporting, not production compatibility.
	const outsideScope = dom.window.document.createElement('section');
	outsideScope.innerHTML =
		'<div class="kv-detail"></div><button class="kv-detail-fb-button"></button>' +
		'<button class="kv-detail-pc-button"></button>';
	dom.window.document.body.appendChild(outsideScope);
	const warningBefore = console.warn;
	const scopeWarnings = [];
	try {
		console.warn = (message, details) => scopeWarnings.push({ message, details });
		const outsideContext = {
			getDetailViewElement: () => outsideScope.querySelector('.kv-detail'),
		};
		assert.strictEqual(setFormBridgeButtonShown(outsideContext, false), false);
		assert.strictEqual(setPrintCreatorButtonShown(outsideContext, false), false);
		assert.strictEqual(scopeWarnings.length, 2);
		for (const warning of scopeWarnings) {
			assert.ok(warning.message.includes('no matching buttons found'));
			assert.ok(!warning.message.includes('not configured'));
			assert.strictEqual(warning.details.searchScope, 'detail-element');
			assert.strictEqual(warning.details.matchedCount, 0);
		}
		assert.ok(
			Array.from(outsideScope.querySelectorAll('button')).every(
				(button) => button.style.display === '' && !button.hidden
			)
		);
	} finally {
		console.warn = warningBefore;
		outsideScope.remove();
	}

	const fixture = dom.window.document.createElement('section');
	fixture.innerHTML =
		'<div class="kv-container" id="scope-target">' +
		'<div class="kv-main-content"><div class="kv-detail" id="scope-detail"></div></div>' +
		'<div class="kv-record-menu" id="scope-menu">' +
		'<button class="kv-detail-fb-button" style="display:inline-flex"></button>' +
		'<button class="kv-detail-fb-button"></button>' +
		'<button class="kv-detail-pc-button"></button></div>' +
		'<div class="kv-container"><div class="kv-detail"></div><div class="kv-record-menu">' +
		'<button class="kv-detail-fb-button"></button>' +
		'<button class="kv-detail-pc-button"></button></div></div></div>' +
		'<div class="kv-container"><div class="kv-detail"></div><div class="kv-record-menu">' +
		'<button class="kv-detail-fb-button"></button></div></div>';
	dom.window.document.body.appendChild(fixture);
	const target = fixture.querySelector('#scope-target');
	const detail = fixture.querySelector('#scope-detail');
	const menu = fixture.querySelector('#scope-menu');
	const scopeContext = { getDetailViewElement: () => detail };
	const fallbackContext = { getDetailElement: () => detail };
	const unrelated = Array.from(fixture.querySelectorAll('button')).filter(
		(button) => !menu.contains(button)
	);
	assert.strictEqual(detail.querySelectorAll('.kv-detail-fb-button').length, 0);
	assert.strictEqual(target.querySelector('.kv-main-content').querySelectorAll('button').length, 0);
	for (const shown of [false, false, true, true, false, true]) {
		assert.strictEqual(setFormBridgeButtonShown(scopeContext, shown), true);
		assert.strictEqual(setPrintCreatorButtonShown(fallbackContext, shown), true);
		assert.deepStrictEqual(
			Array.from(menu.querySelectorAll('button'), (button) => button.style.display),
			shown ? ['inline-flex', '', ''] : ['none', 'none', 'none']
		);
		assert.ok(unrelated.every((button) => button.style.display === '' && !button.hidden));
	}

	const ambiguousWarnings = [];
	try {
		console.warn = (message, details) => ambiguousWarnings.push({ message, details });
		for (const extraClass of ['kv-detail', 'kv-record-menu']) {
			const extra = dom.window.document.createElement('div');
			extra.className = extraClass;
			target.appendChild(extra);
			assert.strictEqual(setFormBridgeButtonShown(scopeContext, false), false);
			assert.strictEqual(setPrintCreatorButtonShown(scopeContext, false), false);
			assert.strictEqual(menu.querySelector('button').style.display, 'inline-flex');
			extra.remove();
		}
		assert.ok(ambiguousWarnings.every((warning) => warning.message.includes('cannot uniquely')));
		assert.strictEqual(ambiguousWarnings[0].details.detailCount, 2);
		assert.strictEqual(ambiguousWarnings[2].details.menuCount, 2);
		for (const warning of ambiguousWarnings) {
			assert.strictEqual(warning.details.searchScope, 'nearest-kv-container');
			assert.deepStrictEqual(Object.keys(warning.details).sort(), [
				'className',
				'detailCount',
				'menuCount',
				'searchScope',
			]);
		}

		// Nested menus in the same container are ambiguous even if only one has buttons.
		const nestedMenu = dom.window.document.createElement('div');
		nestedMenu.className = 'kv-record-menu';
		menu.appendChild(nestedMenu);
		assert.strictEqual(setFormBridgeButtonShown(scopeContext, false), false);
		nestedMenu.remove();

		// A menu in a nested container cannot substitute for this container's missing menu.
		menu.remove();
		assert.strictEqual(setFormBridgeButtonShown(scopeContext, false), false);
		assert.ok(unrelated.every((button) => button.style.display === ''));
		target.appendChild(menu);

		menu.querySelectorAll = () => {
			throw new Error('PRIVATE_LOOKUP_ERROR');
		};
		const originalError = console.error;
		const lookupErrors = [];
		try {
			console.error = (message, details) => lookupErrors.push({ message, details });
			assert.strictEqual(setFormBridgeButtonShown(scopeContext, false), false);
			assert.ok(!JSON.stringify(lookupErrors).includes('PRIVATE_LOOKUP_ERROR'));
			assert.strictEqual(menu.querySelector('button').style.display, 'inline-flex');
		} finally {
			console.error = originalError;
			delete menu.querySelectorAll;
		}
	} finally {
		console.warn = warningBefore;
		fixture.remove();
	}

	// Direct-detail lookup must not include another container nested inside that detail.
	const directFixture = dom.window.document.createElement('div');
	directFixture.className = 'kv-container';
	directFixture.innerHTML =
		'<div class="kv-detail"><button class="kv-detail-fb-button"></button>' +
		'<div class="kv-container"><div class="kv-detail">' +
		'<button class="kv-detail-fb-button"></button></div></div></div>';
	const directDetail = directFixture.querySelector('.kv-detail');
	assert.strictEqual(
		setFormBridgeButtonShown({ getDetailViewElement: () => directDetail }, false),
		true
	);
	const directButtons = directDetail.querySelectorAll('button');
	assert.strictEqual(directButtons[0].style.display, 'none');
	assert.strictEqual(directButtons[1].style.display, '');

	const nestedDetail = dom.window.document.createElement('div');
	nestedDetail.className = 'kv-detail';
	nestedDetail.innerHTML = '<button class="kv-detail-fb-button"></button>';
	directDetail.appendChild(nestedDetail);
	assert.strictEqual(
		setFormBridgeButtonShown({ getDetailViewElement: () => directDetail }, false),
		true
	);
	assert.strictEqual(nestedDetail.querySelector('button').style.display, '');

	const originalWarn = console.warn;
	const originalDebug = console.debug;
	const originalNotifyError = global.notifyError;
	const warnings = [];
	let notified = 0;
	try {
		console.warn = (message) => warnings.push(String(message));
		console.debug = () => {};
		delete global.dependencyPresentForKViewerTest;
		delete global.dependencyMissingForKViewerTest;
		delete global.notifyError;
		global.dependencyPresentForKViewerTest = () => true;
		const check = createDependencyChecker([
			{ name: 'dependencyPresentForKViewerTest', source: 'present.js' },
			{ name: 'dependencyMissingForKViewerTest', source: 'missing.js' },
		]);
		assert.strictEqual(check(), false);
		assert.ok(warnings[0].includes('missing.js (dependencyMissingForKViewerTest)'));
		global.notifyError = () => {
			notified += 1;
			throw new Error('notification unavailable');
		};
		assert.strictEqual(check(), false);
		assert.strictEqual(notified, 1);
		assert.throws(() => check({ strict: true }), /missing\.js \(dependencyMissingForKViewerTest\)/);
		assert.strictEqual(notified, 2);
		assert.strictEqual(
			createDependencyChecker([
				{ name: 'dependencyPresentForKViewerTest', source: 'present.js' },
			])(),
			true
		);
	} finally {
		console.warn = originalWarn;
		console.debug = originalDebug;
		if (originalNotifyError === undefined) delete global.notifyError;
		else global.notifyError = originalNotifyError;
		delete global.dependencyPresentForKViewerTest;
		delete global.dependencyMissingForKViewerTest;
	}

	console.log(
		'PASS: kviewer-custom-lib values, validation, display restoration, and view isolation'
	);
} catch (error) {
	console.error('FAIL: kviewer-custom-lib', error && error.stack ? error.stack : error);
	process.exitCode = 1;
} finally {
	dom.window.close();
	delete global.window;
}
