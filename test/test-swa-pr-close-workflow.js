const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const workflow = fs.readFileSync(
	path.join(__dirname, '../.github/workflows/azure-static-web-apps-wonderful-dune-09934f50f.yml'),
	'utf8'
);
const closeJob = workflow.slice(workflow.indexOf('  close_pull_request_job:'));
const scriptMatch = closeJob.match(/          script: \|\n([\s\S]+)$/);
assert(scriptMatch, 'The close job must contain a dispatch script.');
const script = scriptMatch[1].replace(/^            /gm, '');

test('PR close dispatches only trusted main cleanup without checking out PR code', () => {
	assert.match(closeJob, /github\.event_name == 'pull_request'/);
	assert.match(closeJob, /github\.event\.action == 'closed'/);
	assert.match(
		closeJob,
		/github\.event\.pull_request\.head\.repo\.full_name == github\.repository/
	);
	assert.match(closeJob, /permissions:\n      actions: write/);
	assert.doesNotMatch(closeJob, /checkout@|azure\/login|id-token:|secrets\.|action: 'close'/i);
	assert.match(workflow, /types: \[opened, synchronize, reopened, closed\]/);
	assert.match(workflow, /skip_app_build: true/);
});

const runDispatch = (dispatch) => {
	const summaryCalls = [];
	const summary = {};
	for (const method of ['addHeading', 'addRaw', 'addLink']) {
		summary[method] = (...args) => {
			summaryCalls.push([method, ...args]);
			return summary;
		};
	}
	summary.write = async () => summaryCalls.push(['write']);
	const result = vm.runInNewContext(`(async () => { ${script} })()`, {
		github: { rest: { actions: { createWorkflowDispatch: dispatch } } },
		context: {
			repo: { owner: 'owner', repo: 'repo' },
			serverUrl: 'https://github.com',
		},
		core: { summary },
	});
	return { result, summaryCalls };
};

test('dispatch uses a fixed workflow, main ref and non-dry-run input', async () => {
	const calls = [];
	const { result, summaryCalls } = runDispatch(async (request) => {
		calls.push(JSON.parse(JSON.stringify(request)));
	});
	await result;
	assert.deepEqual(calls, [
		{
			owner: 'owner',
			repo: 'repo',
			workflow_id: 'swa-preview-cleanup.yml',
			ref: 'main',
			inputs: { dry_run: 'false' },
		},
	]);
	assert(
		summaryCalls.some((call) => call[0] === 'addRaw' && /not deletion confirmation/.test(call[1]))
	);
	assert(
		summaryCalls.some(
			(call) =>
				call[0] === 'addLink' &&
				call[2] === 'https://github.com/owner/repo/actions/workflows/swa-preview-cleanup.yml'
		)
	);
});

test('dispatch API failure fails the job instead of reporting cleanup success', async () => {
	const error = new Error('Workflow dispatch forbidden');
	const { result, summaryCalls } = runDispatch(async () => {
		throw error;
	});
	await assert.rejects(result, (actual) => actual === error);
	assert.deepEqual(summaryCalls, []);
});
