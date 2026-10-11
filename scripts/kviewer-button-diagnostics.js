/* Temporary browser diagnostic. Remove the file from customization settings after use. */
(() => {
	'use strict';

	if (typeof kviewer === 'undefined' || !kviewer || typeof kviewer.events?.on !== 'function') {
		console.error('kViewer button diagnostic: event registration API is unavailable.');
		return;
	}

	const selectors = {
		formBridge: '.kv-detail-fb-button',
		printCreator: '.kv-detail-pc-button',
	};
	const getterNames = [
		'getDetailViewElement',
		'getDetailElement',
		'getMainContentElement',
		'getViewElement',
	];
	const publicClasses = [
		'kv-container',
		'kv-main-content',
		'kv-detail',
		'kv-record-menu',
		'kv-dashboard-view',
		'kv-detail-fb-button',
		'kv-detail-pc-button',
	];
	const nodeIds = new WeakMap();
	let nextNodeId = 1;
	let eventNumber = 0;
	const isElement = (element) => element && element.nodeType === 1;
	const countButtons = (root) =>
		Object.fromEntries(
			Object.entries(selectors).map(([kind, selector]) => [
				kind,
				root.querySelectorAll(selector).length +
					(isElement(root) && root.matches(selector) ? 1 : 0),
			])
		);
	const describe = (element) => {
		if (!nodeIds.has(element)) nodeIds.set(element, nextNodeId++);
		return {
			node: nodeIds.get(element),
			tag: element.tagName,
			publicClasses: publicClasses.filter((name) => element.classList.contains(name)),
			childIndex: element.parentElement
				? Array.from(element.parentElement.children).indexOf(element)
				: null,
			connected: element.isConnected,
		};
	};
	const ancestors = (element) => {
		const result = [];
		for (let current = element; current; current = current.parentElement) result.push(current);
		return result;
	};
	const structure = (element) => ({
		...describe(element),
		buttonCounts: countButtons(element),
		detailCount:
			element.querySelectorAll('.kv-detail').length + (element.matches('.kv-detail') ? 1 : 0),
	});

	const snapshot = (context, number, stage) => {
		try {
			const roots = {};
			const getters = {};
			for (const name of getterNames) {
				try {
					if (typeof context[name] !== 'function') {
						getters[name] = { status: 'unavailable' };
						continue;
					}
					const element = context[name]();
					if (!isElement(element)) {
						getters[name] = { status: element == null ? 'null' : 'not-element' };
						continue;
					}
					roots[name] = element;
					getters[name] = {
						status: 'element',
						element: structure(element),
						ancestors: ancestors(element).map(structure),
					};
				} catch {
					getters[name] = { status: 'getter-or-inspection-failed' };
				}
			}

			const buttons = {};
			for (const [kind, selector] of Object.entries(selectors)) {
				buttons[kind] = Array.from(document.querySelectorAll(selector), (button) => {
					const chain = ancestors(button);
					const computed = window.getComputedStyle(button);
					return {
						element: describe(button),
						ancestors: chain.map(structure),
						relations: Object.fromEntries(
							Object.entries(roots).map(([name, root]) => [
								name,
								{
									insideRoot: root.contains(button),
									containsRoot: button.contains(root),
									commonAncestor: (() => {
										const common = chain.find((element) => element.contains(root));
										return common ? structure(common) : null;
									})(),
								},
							])
						),
						displayState: {
							hiddenAttributePresent: button.hasAttribute('hidden'),
							hiddenProperty: Boolean(button.hidden),
							inlineDisplay: button.style.getPropertyValue('display'),
							inlineDisplayPriority: button.style.getPropertyPriority('display'),
							computedDisplay: computed.display,
							computedVisibility: computed.visibility,
							computedPointerEvents: computed.pointerEvents,
							hasClientRects: button.getClientRects().length > 0,
						},
					};
				});
			}
			console.log(
				'KV_BUTTON_DIAGNOSTIC ' +
					JSON.stringify({
						event: 'record.show',
						eventNumber: number,
						stage,
						getters,
						pageButtonCounts: countButtons(document),
						buttons,
					})
			);
		} catch {
			console.error(
				'KV_BUTTON_DIAGNOSTIC ' +
					JSON.stringify({ eventNumber: number, stage, status: 'snapshot-failed' })
			);
		}
	};

	kviewer.events.on('record.show', (context) => {
		const number = ++eventNumber;
		snapshot(context, number, 'event');
		if (typeof window.requestAnimationFrame !== 'function') {
			console.warn('KV_BUTTON_DIAGNOSTIC: rendering-frame comparison is unavailable.');
			return;
		}
		// Two finite rendering callbacks are for observation, not a display-control workaround.
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => snapshot(context, number, 'after-two-animation-frames'));
		});
	});
})();
