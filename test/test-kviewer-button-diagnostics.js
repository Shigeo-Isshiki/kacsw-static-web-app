const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(
	'<section class="kv-container private-class" id="private-id">' +
		'<main class="kv-main-content"><div class="kv-detail">PRIVATE RECORD</div>' +
		'<nav><a class="kv-detail-fb-button" href="/private?token=PRIVATE_TOKEN">PRIVATE NAME</a>' +
		'<button class="kv-detail-pc-button" hidden style="display:none!important">PRIVATE PDF</button>' +
		'</nav></main></section>' +
		'<section class="kv-container"><div class="kv-detail">' +
		'<button class="kv-detail-fb-button"></button></div></section>',
	{ runScripts: 'outside-only' }
);

try {
	const output = [];
	let handler;
	const frames = [];
	dom.window.console.log = (message) => output.push(message);
	dom.window.console.warn = (message) => output.push(message);
	dom.window.console.error = (message) => output.push(message);
	dom.window.kviewer = {
		events: {
			on: (name, callback) => {
				assert.strictEqual(name, 'record.show');
				handler = callback;
			},
		},
	};
	dom.window.requestAnimationFrame = (callback) => frames.push(callback);
	const before = dom.window.document.documentElement.outerHTML;
	dom.window.eval(
		fs.readFileSync(path.join(__dirname, '../scripts/kviewer-button-diagnostics.js'), 'utf8')
	);
	assert.strictEqual(output.length, 0);
	assert.strictEqual(typeof handler, 'function');
	const detail = dom.window.document.querySelector('.kv-detail');
	handler({
		record: { private: 'PRIVATE_VALUE' },
		getDetailViewElement: () => detail,
		getDetailElement: () => {
			throw new Error('PRIVATE_ERROR');
		},
		getMainContentElement: () => dom.window.document.querySelector('main'),
		getViewElement: () => null,
	});
	assert.strictEqual(frames.length, 1);
	frames.shift()();
	frames.shift()();
	assert.strictEqual(frames.length, 0);
	assert.strictEqual(output.length, 2);
	const snapshots = output.map((line) => JSON.parse(line.slice('KV_BUTTON_DIAGNOSTIC '.length)));
	assert.strictEqual(snapshots[0].stage, 'event');
	assert.strictEqual(snapshots[1].stage, 'after-two-animation-frames');
	for (const snapshot of snapshots) {
		assert.deepStrictEqual(snapshot.pageButtonCounts, { formBridge: 2, printCreator: 1 });
		assert.strictEqual(snapshot.getters.getDetailElement.status, 'getter-or-inspection-failed');
		assert.strictEqual(snapshot.getters.getViewElement.status, 'null');
		assert.strictEqual(snapshot.getters.getDetailViewElement.element.buttonCounts.formBridge, 0);
		const sibling = snapshot.buttons.formBridge[0];
		assert.strictEqual(sibling.relations.getDetailViewElement.insideRoot, false);
		assert.strictEqual(
			sibling.relations.getDetailViewElement.commonAncestor.node,
			snapshot.getters.getMainContentElement.element.node
		);
		assert.strictEqual(snapshot.buttons.printCreator[0].displayState.hiddenAttributePresent, true);
		assert.strictEqual(
			snapshot.buttons.printCreator[0].displayState.inlineDisplayPriority,
			'important'
		);
	}
	assert.strictEqual(dom.window.document.documentElement.outerHTML, before);
	assert.ok(!output.join('\n').includes('PRIVATE'));
	assert.ok(!output.join('\n').includes('private-class'));
	assert.ok(!output.join('\n').includes('private-id'));
	console.log(
		'PASS: read-only kViewer button diagnostics, relationships, finite frames, and privacy'
	);
} finally {
	dom.window.close();
}

const lexicalDom = new JSDOM('<div class="kv-detail"></div>', {
	runScripts: 'outside-only',
});
try {
	const output = [];
	let handler;
	const frames = [];
	const source = fs.readFileSync(
		path.join(__dirname, '../scripts/kviewer-button-diagnostics.js'),
		'utf8'
	);
	lexicalDom.window.console.error = (message) => output.push(message);
	lexicalDom.window.console.log = (message) => output.push(message);
	lexicalDom.window.requestAnimationFrame = (callback) => frames.push(callback);
	lexicalDom.window.eval(source);
	assert.deepStrictEqual(output, [
		'kViewer button diagnostic: event registration API is unavailable.',
	]);
	output.length = 0;

	lexicalDom.window.registerDiagnosticForTest = (name, callback) => {
		assert.strictEqual(name, 'record.show');
		handler = callback;
	};
	vm.runInContext(
		'const kviewer = { events: { on: window.registerDiagnosticForTest } };',
		lexicalDom.getInternalVMContext()
	);
	delete lexicalDom.window.registerDiagnosticForTest;
	assert.strictEqual(typeof lexicalDom.window.kviewer, 'undefined');
	assert.strictEqual(
		vm.runInContext('typeof kviewer', lexicalDom.getInternalVMContext()),
		'object'
	);
	vm.runInContext(source, lexicalDom.getInternalVMContext());
	assert.strictEqual(typeof handler, 'function');
	assert.strictEqual(output.length, 0);
	handler({ getDetailViewElement: () => lexicalDom.window.document.querySelector('.kv-detail') });
	frames.shift()();
	frames.shift()();
	assert.strictEqual(output.length, 2);
	assert.ok(output.every((line) => line.startsWith('KV_BUTTON_DIAGNOSTIC ')));
	assert.strictEqual(typeof lexicalDom.window.kviewer, 'undefined');
	console.log('PASS: kViewer lexical global without window property and unavailable API guard');
} finally {
	lexicalDom.window.close();
}
