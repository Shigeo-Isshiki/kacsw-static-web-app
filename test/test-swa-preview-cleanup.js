'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');
const {
	cleanupStalePreviewEnvironments,
	findStalePreviewEnvironments,
	getPullRequestNumber,
	isProductionEnvironment,
	parseOpenPullRequests,
} = require('../scripts/cleanup-swa-preview-environments');

const environments = [
	{ name: 'default', properties: { sourceBranch: 'main', pullRequestNumber: null } },
	{ name: 'pr-21', properties: { sourceBranch: 'feature/open', pullRequestNumber: 21 } },
	{ name: 'pr-22', properties: { sourceBranch: 'feature/closed', pullRequestNumber: 22 } },
	{ name: 'feature/branch-preview', properties: { sourceBranch: 'feature/branch-preview' } },
	{ name: 'pr-23', properties: { sourceBranch: 'feature/open-with-number-in-name' } },
];
const subscriptionId = '00000000-0000-0000-0000-000000000001';
const deletedName = (args) => decodeURIComponent(new URL(args[4]).pathname.split('/').pop());

assert.deepStrictEqual(
	findStalePreviewEnvironments(environments, new Set([21, 23])).map(
		(environment) => environment.name
	),
	['pr-22']
);
console.log('PASS: cleanup selects only stale PR preview environments');

assert.strictEqual(isProductionEnvironment(environments[0], 'main'), true);
assert.strictEqual(
	isProductionEnvironment({ name: 'custom-prod', properties: { sourceBranch: 'main' } }, 'main'),
	true
);
assert.strictEqual(getPullRequestNumber(environments[0]), null);
console.log('PASS: production and production branch are protected');

assert.strictEqual(getPullRequestNumber({ name: 'pr-24' }), 24);
assert.strictEqual(getPullRequestNumber({ name: '24' }), 24);
assert.strictEqual(getPullRequestNumber({ name: '24', pullRequestNumber: 25 }), null);
assert.strictEqual(getPullRequestNumber({ name: '24', pullRequestNumber: 'invalid' }), null);
assert.strictEqual(getPullRequestNumber({ name: '24', pullRequestNumber: '24' }), 24);
for (const name of ['0', '024', '-24', '24-preview', '9007199254740992']) {
	assert.strictEqual(getPullRequestNumber({ name }), null);
}
assert.strictEqual(getPullRequestNumber({ name: '#24 - old preview' }), null);
assert.strictEqual(getPullRequestNumber(null), null);
assert.strictEqual(isProductionEnvironment(null, 'main'), false);
assert.deepStrictEqual(parseOpenPullRequests([{ number: 4 }, { number: 24 }]), new Set([4, 24]));
assert.throws(() => parseOpenPullRequests([{ number: 0 }]), /valid number/);
console.log('PASS: pull request matching fails closed on ambiguous metadata');

const cliResult = spawnSync(
	process.execPath,
	[path.join(__dirname, '../scripts/cleanup-swa-preview-environments.js')],
	{ encoding: 'utf8', env: { PATH: process.env.PATH } }
);
assert.strictEqual(cliResult.status, 1);
assert.match(
	cliResult.stderr,
	/Stale Azure Static Web Apps preview cleanup failed: SWA_NAME is required\./
);
assert.doesNotMatch(cliResult.stderr, /Cannot read properties of undefined/);
console.log('PASS: CLI invocation without configuration reports a clear validation error');

async function runCleanupTests() {
	const calls = [];
	const logs = [];
	const fakeHttps = {
		get(url, options, callback) {
			calls.push({ type: 'github', url, options });
			const response = {
				statusCode: 200,
				headers: {},
				setEncoding() {},
				on(event, handler) {
					if (event === 'data') {
						handler(
							JSON.stringify(
								url.includes('/pulls/22')
									? {
											number: 22,
											state: 'closed',
											base: { ref: 'main', repo: { full_name: 'owner/repo' } },
											head: { ref: 'feature/closed', repo: { full_name: 'owner/repo' } },
										}
									: [{ number: 21 }, { number: 23 }]
							)
						);
					}
					if (event === 'end') handler();
				},
			};
			callback(response);
			return { on() {} };
		},
	};
	const result = await cleanupStalePreviewEnvironments({
		env: {
			AZURE_SUBSCRIPTION_ID: subscriptionId,
			SWA_NAME: 'test-app',
			SWA_RESOURCE_GROUP: 'test-rg',
			SWA_PRODUCTION_BRANCH: 'main',
			GITHUB_REPOSITORY: 'owner/repo',
			GITHUB_TOKEN: 'test-token',
		},
		exec(command, args) {
			calls.push({ type: 'azure', command, args });
			if (args[2] === 'list') {
				const requested = calls.some((call) => call.type === 'azure' && call.args[0] === 'rest');
				return JSON.stringify(environments.filter((item) => !requested || item.name !== 'pr-22'));
			}
			return '';
		},
		httpsClient: fakeHttps,
		log: { log: (...values) => logs.push(values) },
	});
	assert.deepStrictEqual(result.deleted, ['pr-22']);
	assert.deepStrictEqual(
		calls
			.filter((call) => call.type === 'azure' && call.args[0] === 'rest')
			.map((call) => deletedName(call.args)),
		['pr-22']
	);
	const deleteArgs = calls.find((call) => call.type === 'azure' && call.args[0] === 'rest').args;
	assert.deepStrictEqual(deleteArgs.slice(0, 4), ['rest', '--method', 'delete', '--url']);
	assert.strictEqual(
		deleteArgs[4],
		'https://management.azure.com/subscriptions/' +
			subscriptionId +
			'/resourceGroups/test-rg/providers/Microsoft.Web/staticSites/test-app/builds/pr-22?api-version=2024-11-01'
	);
	assert(calls.some((call) => call.type === 'github' && call.url.includes('base=main')));
	assert(logs.some((entry) => entry[0] === 'Deleting closed PR preview environment:'));
	console.log('PASS: cleanup queries GitHub and deletes only closed PR environments');

	const dryRunCalls = [];
	const dryRunResult = await cleanupStalePreviewEnvironments({
		env: {
			SWA_NAME: 'test-app',
			SWA_RESOURCE_GROUP: 'test-rg',
			GITHUB_REPOSITORY: 'owner/repo',
			GITHUB_TOKEN: 'test-token',
			SWA_CLEANUP_DRY_RUN: 'true',
		},
		exec(command, args) {
			dryRunCalls.push(args);
			if (args[2] === 'list') return JSON.stringify(environments);
			throw new Error('Dry run must not delete Azure environments.');
		},
		httpsClient: fakeHttps,
		log: { log() {} },
	});
	assert.deepStrictEqual(dryRunResult.planned, ['pr-22']);
	assert.strictEqual(
		dryRunCalls.some((args) => args[0] === 'rest'),
		false
	);
	console.log('PASS: manual dry run reports stale environments without deleting');

	const runScenario = async ({
		previews,
		responseFor,
		dryRun = false,
		pendingReads = 0,
		deleteError,
		listError,
		subscription = subscriptionId,
	}) => {
		const deletes = [];
		const requests = [];
		let remainingReads = pendingReads;
		let listCalls = 0;
		let waits = 0;
		const result = cleanupStalePreviewEnvironments({
			env: {
				AZURE_SUBSCRIPTION_ID: subscription,
				SWA_NAME: 'test-app',
				SWA_RESOURCE_GROUP: 'test-rg',
				GITHUB_REPOSITORY: 'owner/repo',
				GITHUB_TOKEN: 'test-token',
				SWA_CLEANUP_DRY_RUN: String(dryRun),
			},
			exec(command, args) {
				if (args[2] === 'list') {
					listCalls += 1;
					if (deletes.length > 0) {
						if (listError) throw listError;
						if (remainingReads-- <= 0) {
							return JSON.stringify(previews.filter((item) => !deletes.includes(item.name)));
						}
					}
					return JSON.stringify(previews);
				}
				assert.strictEqual(args[0], 'rest');
				if (deleteError) throw deleteError;
				deletes.push(deletedName(args));
				return '';
			},
			wait: async (milliseconds) => {
				assert.strictEqual(milliseconds, 5000);
				waits += 1;
			},
			httpsClient: {
				get(url, options, callback) {
					requests.push(url);
					const { body, statusCode = 200, link } = responseFor(url);
					callback({
						statusCode,
						headers: { link },
						setEncoding() {},
						on(event, handler) {
							if (event === 'data') handler(JSON.stringify(body));
							if (event === 'end') handler();
						},
					});
					return { on() {} };
				},
			},
			log: { log() {} },
		});
		return { result: await result, deletes, requests, listCalls, waits };
	};
	const closedPR = {
		number: 24,
		state: 'closed',
		base: { ref: 'main', repo: { full_name: 'owner/repo' } },
		head: { ref: 'feature/closed', repo: { full_name: 'owner/repo' } },
	};
	const numericPreview = { name: '24', sourceBranch: 'feature/closed' };
	const responseFor = (url) => ({
		body: url.includes('/pulls/') ? closedPR : [],
	});
	const numericResult = await runScenario({ previews: [numericPreview], responseFor });
	assert.deepStrictEqual(numericResult.deletes, ['24']);
	assert(numericResult.requests.some((url) => url.endsWith('/pulls/24')));
	assert.strictEqual(numericResult.listCalls, 2);
	const delayedResult = await runScenario({
		previews: [numericPreview],
		responseFor,
		pendingReads: 2,
	});
	assert.deepStrictEqual(delayedResult.result.deleted, ['24']);
	assert.strictEqual(delayedResult.waits, 2);
	assert.strictEqual(delayedResult.listCalls, 4);
	console.log(
		'PASS: asynchronous deletion is confirmed through environment list without extra RBAC'
	);
	for (const scenario of [
		{ pendingReads: 12, expected: /Timed out confirming preview deletion/ },
		{ deleteError: new Error('DELETE denied'), expected: /DELETE denied/ },
		{ listError: new Error('List unavailable'), expected: /List unavailable/ },
		{ subscription: '', expected: /AZURE_SUBSCRIPTION_ID must be a GUID/ },
	]) {
		const { expected, ...options } = scenario;
		await assert.rejects(
			runScenario({ previews: [numericPreview], responseFor, ...options }),
			expected
		);
	}
	console.log('PASS: deletion, completion check, timeout and subscription errors fail explicitly');
	const numericDryRun = await runScenario({
		previews: [numericPreview],
		responseFor,
		dryRun: true,
	});
	assert.deepStrictEqual(numericDryRun.result, { planned: ['24'], deleted: [] });
	assert.deepStrictEqual(numericDryRun.deletes, []);
	console.log('PASS: numeric preview names require verified PR identity, including in dry run');

	for (const unverified of [
		{ ...closedPR, state: 'open' },
		{ ...closedPR, number: 25 },
		{ ...closedPR, base: { ref: 'other', repo: { full_name: 'owner/repo' } } },
		{ ...closedPR, base: { ref: 'main', repo: { full_name: 'other/repo' } } },
		{ ...closedPR, head: { ref: 'wrong', repo: { full_name: 'owner/repo' } } },
		{ ...closedPR, head: { ref: 'feature/closed', repo: { full_name: 'fork/repo' } } },
		{ ...closedPR, head: { ref: 'feature/closed', repo: null } },
		null,
	]) {
		const retained = await runScenario({
			previews: [numericPreview],
			responseFor: (url) => ({ body: url.includes('/pulls/') ? unverified : [] }),
		});
		assert.deepStrictEqual(retained.deletes, []);
		assert.deepStrictEqual(retained.result.planned, []);
	}
	for (const preview of [
		{ name: '24' },
		{ ...numericPreview, sourceBranch: 'main' },
		{ name: 'default', pullRequestNumber: 24 },
		{ ...numericPreview, properties: { isProduction: true } },
		{ ...numericPreview, isProduction: true },
	]) {
		const retained = await runScenario({ previews: [preview], responseFor });
		assert.deepStrictEqual(retained.deletes, []);
	}
	console.log(
		'PASS: open, mismatched, fork, missing metadata and production environments are kept'
	);

	const paginated = await runScenario({
		previews: [numericPreview],
		responseFor: (url) => {
			if (url.includes('page=2')) return { body: [{ number: 24 }] };
			return {
				body: [],
				link: '<https://api.github.com/repos/owner/repo/pulls?page=2>; rel="next"',
			};
		},
	});
	assert.strictEqual(paginated.requests.length, 2);
	assert.deepStrictEqual(paginated.deletes, []);
	console.log('PASS: open PRs on later pages remain protected');

	for (const statusCode of [403, 404, 500]) {
		let deleteCount = 0;
		await assert.rejects(
			cleanupStalePreviewEnvironments({
				env: {
					SWA_NAME: 'test-app',
					SWA_RESOURCE_GROUP: 'test-rg',
					GITHUB_REPOSITORY: 'owner/repo',
					GITHUB_TOKEN: 'test-token',
				},
				exec(command, args) {
					if (args[2] === 'list') {
						return JSON.stringify([numericPreview, { name: '25', sourceBranch: 'feature/closed' }]);
					}
					deleteCount += 1;
					return '';
				},
				httpsClient: {
					get(url, options, callback) {
						callback({
							statusCode: url.endsWith('/pulls/25') ? statusCode : 200,
							headers: {},
							setEncoding() {},
							on(event, handler) {
								if (event === 'data') {
									handler(JSON.stringify(url.includes('/pulls/') ? closedPR : []));
								}
								if (event === 'end') handler();
							},
						});
						return { on() {} };
					},
				},
				log: { log() {} },
			}),
			new RegExp('HTTP ' + statusCode)
		);
		assert.strictEqual(deleteCount, 0);
	}
	console.log('PASS: verification API failures stop cleanup before any environment is deleted');
}

runCleanupTests().catch((error) => {
	console.error('FAIL: Azure Static Web Apps preview cleanup tests', error);
	process.exitCode = 1;
});
