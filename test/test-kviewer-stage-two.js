const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync(path.join(__dirname, '../src/kviewer-custom-lib.js'), 'utf8');
const createPage = () => {
	const dom = new JSDOM('<style>.unrelated { color: red }</style><body><span>text</span></body>', {
		runScripts: 'outside-only',
	});
	const messages = [];
	dom.window.console.warn = (message) => messages.push(message);
	dom.window.console.error = (message) => messages.push(message);
	dom.window.eval(source);
	return { dom, window: dom.window, messages };
};

const dispatch = (window, target, type, options = {}) => {
	const event =
		type === 'keydown'
			? new window.KeyboardEvent(type, { bubbles: true, cancelable: true, ...options })
			: new window.Event(type, { bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event.defaultPrevented;
};

for (const mediaMode of ['modern', 'legacy', 'missing', 'unsupported']) {
	const { dom, window, messages } = createPage();
	try {
		let change;
		let mediaRegistrations = 0;
		if (mediaMode !== 'missing') {
			window.matchMedia = (query) => {
				assert.strictEqual(query, 'print');
				if (mediaMode === 'unsupported') return {};
				if (mediaMode === 'modern') {
					return {
						addEventListener: (type, handler) => {
							assert.strictEqual(type, 'change');
							change = handler;
							mediaRegistrations += 1;
						},
						removeEventListener: () => {},
					};
				}
				return {
					addListener: (handler) => {
						change = handler;
						mediaRegistrations += 1;
					},
					removeListener: () => {},
				};
			};
		}
		const body = window.document.body;
		body.style.setProperty('display', 'grid', 'important');
		assert.strictEqual(window.document.querySelectorAll('style').length, 1);
		assert.strictEqual(dispatch(window, body, 'contextmenu'), false);
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		assert.strictEqual(window.document.querySelectorAll('style').length, 2);
		assert.strictEqual(mediaRegistrations, change ? 1 : 0);
		assert.ok(window.document.querySelectorAll('style')[1].textContent.includes('@media print'));
		assert.strictEqual(dispatch(window, body, 'contextmenu'), true);
		assert.strictEqual(dispatch(window, body, 'selectstart'), true);
		let propagated = 0;
		body.addEventListener('keydown', () => propagated++);
		for (const options of [
			{ key: 'p', ctrlKey: true },
			{ key: 'P', metaKey: true },
			{ key: 'PrintScreen' },
		]) {
			assert.strictEqual(dispatch(window, body, 'keydown', options), true);
		}
		assert.strictEqual(propagated, 0);
		assert.strictEqual(dispatch(window, body, 'keydown', { key: 'p' }), false);
		assert.strictEqual(dispatch(window, body, 'keydown', { key: 'c', ctrlKey: true }), false);
		assert.strictEqual(propagated, 2);
		dispatch(window, window, 'beforeprint');
		dispatch(window, window, 'beforeprint');
		if (change) change({ matches: true });
		assert.strictEqual(body.style.display, 'none');
		assert.strictEqual(body.style.getPropertyPriority('display'), 'important');
		dispatch(window, window, 'afterprint');
		if (change) change({ matches: false });
		assert.strictEqual(body.style.display, 'grid');
		assert.strictEqual(body.style.getPropertyPriority('display'), 'important');
		if (change) {
			change({ matches: true });
			change({ matches: false });
			assert.strictEqual(body.style.display, 'grid');
		}
		body.style.removeProperty('display');
		dispatch(window, window, 'beforeprint');
		dispatch(window, window, 'afterprint');
		assert.strictEqual(body.style.getPropertyValue('display'), '');
		body.style.setProperty('display', 'flex');
		dispatch(window, window, 'beforeprint');
		dispatch(window, window, 'afterprint');
		assert.strictEqual(body.style.display, 'flex');
		assert.strictEqual(body.style.getPropertyPriority('display'), '');
		assert.strictEqual(messages.length, change ? 0 : 1);
		if (change) {
			change({
				get matches() {
					throw new Error('test');
				},
			});
			assert.ok(messages.some((message) => message.includes('print media notification')));
		}
	} finally {
		dom.window.close();
	}
}

for (const failureMode of ['listener', 'css', 'media']) {
	const { dom, window, messages } = createPage();
	try {
		const document = window.document;
		const originalAdd = document.addEventListener.bind(document);
		const originalAppend = document.head.appendChild.bind(document.head);
		let fail = true;
		let registrations = 0;
		const active = new Set();
		const originalRemove = document.removeEventListener.bind(document);
		document.addEventListener = (type, handler, capture) => {
			originalAdd(type, handler, capture);
			active.add(type);
			registrations++;
			if (fail && failureMode === 'listener' && type === 'selectstart') throw new Error('test');
		};
		document.removeEventListener = (type, handler, capture) => {
			active.delete(type);
			originalRemove(type, handler, capture);
		};
		document.head.appendChild = (element) => {
			originalAppend(element);
			if (fail && failureMode === 'css') throw new Error('test');
			return element;
		};
		let mediaHandler = null;
		window.matchMedia = () => ({
			addEventListener: (_type, handler) => {
				mediaHandler = handler;
				if (failureMode === 'css') handler({ matches: true });
				if (fail && failureMode === 'media') throw new Error('test');
			},
			removeEventListener: () => {
				mediaHandler = null;
			},
		});
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		assert.strictEqual(active.size, 0);
		assert.strictEqual(mediaHandler, null);
		assert.strictEqual(document.querySelectorAll('style').length, 1);
		assert.strictEqual(document.body.style.display, '');
		assert.strictEqual(dispatch(window, document.body, 'contextmenu'), false);
		fail = false;
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		assert.strictEqual(active.size, 3);
		assert.strictEqual(document.querySelectorAll('style').length, 2);
		const before = registrations;
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		assert.strictEqual(registrations, before);
		assert.ok(messages.some((message) => message.includes('registration failed')));
	} finally {
		dom.window.close();
	}
}

{
	const { dom, window, messages } = createPage();
	try {
		const page = window.document;
		const add = page.addEventListener.bind(page);
		const remove = page.removeEventListener.bind(page);
		let addCount = 0;
		let rollbackFails = true;
		let unrelatedCalled = 0;
		page.body.addEventListener('contextmenu', () => unrelatedCalled++);
		page.addEventListener = (type, handler, capture) => {
			addCount++;
			add(type, handler, capture);
			if (type === 'selectstart') throw new Error('test');
		};
		page.removeEventListener = (type, handler, capture) => {
			if (rollbackFails) throw new Error('test');
			remove(type, handler, capture);
		};
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		const beforeRetry = addCount;
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		assert.strictEqual(addCount, beforeRetry);
		rollbackFails = false;
		page.addEventListener = add;
		window.matchMedia = () => {
			throw new Error('test');
		};
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		assert.strictEqual(dispatch(window, page.body, 'contextmenu'), false);
		assert.strictEqual(unrelatedCalled, 1);
		window.matchMedia = undefined;
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		assert.strictEqual(dispatch(window, page.body, 'contextmenu'), true);
		assert.strictEqual(unrelatedCalled, 2);
		assert.ok(messages.some((message) => message.includes('clean up partial registration')));
		assert.strictEqual(page.querySelectorAll('style').length, 2);
	} finally {
		dom.window.close();
	}
}

{
	const { dom, window, messages } = createPage();
	try {
		const body = window.document.body;
		body.remove();
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		window.document.documentElement.appendChild(body);
		const head = window.document.head;
		head.remove();
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		window.document.documentElement.prepend(head);
		const add = window.addEventListener;
		window.addEventListener = undefined;
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		window.addEventListener = add;
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
		const set = body.style.setProperty.bind(body.style);
		body.style.setProperty = () => {
			throw new Error('test');
		};
		dispatch(window, window, 'beforeprint');
		assert.ok(messages.some((message) => message.includes('failed to hide')));
		body.style.setProperty = set;
		dispatch(window, window, 'beforeprint');
		const remove = body.style.removeProperty.bind(body.style);
		body.style.removeProperty = () => {
			throw new Error('test');
		};
		dispatch(window, window, 'afterprint');
		assert.ok(messages.some((message) => message.includes('failed to restore')));
		body.style.removeProperty = remove;
		dispatch(window, window, 'afterprint');
		assert.strictEqual(body.style.display, '');
		const create = window.document.createElement;
		window.document.createElement = undefined;
		assert.strictEqual(window.installCopyPrintRestrictions(), false);
		window.document.createElement = create;
		assert.strictEqual(window.installCopyPrintRestrictions(), true);
	} finally {
		dom.window.close();
	}
}

{
	const { dom, window, messages } = createPage();
	try {
		const root = window.document.createElement('main');
		const code = ' code"\\[] ';
		root.setAttribute('data-static-code', code);
		for (const display of ['inline-flex', 'none', '']) {
			const child = window.document.createElement('div');
			child.setAttribute('data-static-code', code);
			if (display) child.style.setProperty('display', display, 'important');
			root.appendChild(child);
		}
		const outside = window.document.createElement('div');
		outside.setAttribute('data-static-code', code);
		window.document.body.append(root, outside);
		const context = { getMainContentElement: () => root };
		const elements = [root, ...root.children];
		assert.strictEqual(window.setStaticContentShown(context, code, true), true);
		assert.strictEqual(root.children[1].style.display, 'none');
		for (const shown of [false, false, true, false, true]) {
			assert.strictEqual(window.setStaticContentShown(context, code, shown), true);
			assert.deepStrictEqual(
				elements.map((element) => element.style.display),
				shown ? ['', 'inline-flex', 'none', ''] : ['none', 'none', 'none', 'none']
			);
			assert.strictEqual(outside.style.display, '');
		}
		assert.strictEqual(root.children[0].style.getPropertyPriority('display'), 'important');
		assert.strictEqual(root.children[1].style.getPropertyPriority('display'), 'important');
		assert.strictEqual(root.style.getPropertyPriority('display'), '');
		for (const args of [
			[null, code, false],
			[context, ' ', false],
			[context, code, 0],
		]) {
			assert.strictEqual(window.setStaticContentShown(...args), false);
		}
		assert.strictEqual(window.setStaticContentShown({}, code, false), false);
		assert.strictEqual(window.setStaticContentShown(context, 'missing', false), false);
		assert.strictEqual(
			window.setStaticContentShown({ getMainContentElement: () => null }, code, false),
			false
		);
		assert.strictEqual(
			window.setStaticContentShown(
				{
					getMainContentElement: () => {
						throw new Error('test');
					},
				},
				code,
				false
			),
			false
		);
		const failed = root.children[0];
		const set = failed.style.setProperty.bind(failed.style);
		failed.style.setProperty = () => {
			throw new Error('test');
		};
		assert.strictEqual(window.setStaticContentShown(context, code, false), false);
		assert.strictEqual(root.style.display, 'none');
		assert.strictEqual(root.children[2].style.display, 'none');
		failed.style.setProperty = set;
		assert.strictEqual(window.setStaticContentShown(context, code, false), true);
		assert.strictEqual(window.setStaticContentShown(context, code, true), true);
		assert.strictEqual(failed.style.display, 'inline-flex');
		assert.ok(messages.some((message) => message.includes('failed to update')));

		const originalStyle = window.document.createElement('style');
		originalStyle.textContent = '.originally-hidden { display: none; }';
		window.document.head.appendChild(originalStyle);
		const cssHidden = window.document.createElement('div');
		cssHidden.className = 'originally-hidden';
		cssHidden.setAttribute('data-static-code', 'hidden');
		cssHidden.style.setProperty('color', 'red');
		root.appendChild(cssHidden);
		assert.strictEqual(window.setStaticContentShown(context, 'hidden', true), true);
		assert.strictEqual(window.getComputedStyle(cssHidden).display, 'none');
		assert.strictEqual(window.setStaticContentShown(context, 'hidden', false), true);
		assert.strictEqual(window.setStaticContentShown(context, 'hidden', true), true);
		assert.strictEqual(cssHidden.style.display, '');
		assert.strictEqual(cssHidden.style.color, 'red');
		assert.strictEqual(window.getComputedStyle(cssHidden).display, 'none');
		cssHidden.style.setProperty('display', 'block');
		assert.strictEqual(window.setStaticContentShown(context, 'hidden', false), true);
		assert.strictEqual(window.setStaticContentShown(context, 'hidden', true), true);
		assert.strictEqual(cssHidden.style.display, 'block');
		assert.strictEqual(cssHidden.style.getPropertyPriority('display'), '');
	} finally {
		dom.window.close();
	}
}

for (const pathname of ['/view', '/view/', '/view///', '/']) {
	let destination;
	let fail = false;
	const location = {
		origin: 'https://viewer.example',
		pathname,
		search: '?secret=test',
		hash: '#ignored',
		set href(value) {
			if (fail) throw new Error('test');
			destination = value;
		},
	};
	const sandbox = { window: { location }, console: { warn: () => {}, error: () => {} } };
	vm.createContext(sandbox);
	vm.runInContext(source, sandbox);
	const redirect = sandbox.window.redirectToRecordDetail;
	for (const code of ['normal', ' a/b?#"\\ ', 'https://external.example/evil']) {
		assert.strictEqual(redirect(code), true);
		assert.strictEqual(
			destination,
			'https://viewer.example' +
				pathname.replace(/\/+$/, '') +
				'/detail/' +
				encodeURIComponent(code)
		);
		assert.strictEqual(new URL(destination).origin, location.origin);
		assert.strictEqual(new URL(destination).search, '');
		assert.strictEqual(new URL(destination).hash, '');
	}
	for (const invalid of ['', ' \t', null, undefined, 1, {}, []]) {
		assert.strictEqual(redirect(invalid), false);
	}
	assert.strictEqual(redirect('\ud800'), false);
	fail = true;
	assert.strictEqual(redirect('normal'), false);
	sandbox.window.location = null;
	assert.strictEqual(redirect('normal'), false);
}

console.log(
	'PASS: kViewer stage two restrictions, rollback, print restoration, static content, and navigation'
);
