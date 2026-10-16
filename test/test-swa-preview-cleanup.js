'use strict';

const assert = require('assert');
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
assert.strictEqual(getPullRequestNumber({ name: '#24 - old preview' }), null);
assert.strictEqual(getPullRequestNumber(null), null);
assert.strictEqual(isProductionEnvironment(null, 'main'), false);
assert.deepStrictEqual(parseOpenPullRequests([{ number: 4 }, { number: 24 }]), new Set([4, 24]));
assert.throws(() => parseOpenPullRequests([{ number: 0 }]), /valid number/);
console.log('PASS: pull request matching fails closed on ambiguous metadata');

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
					if (event === 'data') handler(JSON.stringify([{ number: 21 }, { number: 23 }]));
					if (event === 'end') handler();
				},
			};
			callback(response);
			return { on() {} };
		},
	};
	const result = await cleanupStalePreviewEnvironments({
		env: {
			SWA_NAME: 'test-app',
			SWA_RESOURCE_GROUP: 'test-rg',
			SWA_PRODUCTION_BRANCH: 'main',
			GITHUB_REPOSITORY: 'owner/repo',
			GITHUB_TOKEN: 'test-token',
		},
		exec(command, args) {
			calls.push({ type: 'azure', command, args });
			if (args[2] === 'list') return JSON.stringify(environments);
			return '';
		},
		httpsClient: fakeHttps,
		log: { log: (...values) => logs.push(values) },
	});
	assert.deepStrictEqual(result.deleted, ['pr-22']);
	assert.deepStrictEqual(
		calls
			.filter((call) => call.type === 'azure' && call.args[2] === 'delete')
			.map((call) => call.args[6]),
		['pr-22']
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
		dryRunCalls.some((args) => args[2] === 'delete'),
		false
	);
	console.log('PASS: manual dry run reports stale environments without deleting');
}

runCleanupTests().catch((error) => {
	console.error('FAIL: Azure Static Web Apps preview cleanup tests', error);
	process.exitCode = 1;
});
