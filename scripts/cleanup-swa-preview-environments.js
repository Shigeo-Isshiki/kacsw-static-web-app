'use strict';

const { execFileSync } = require('child_process');

const DEFAULT_PRODUCTION_BRANCH = 'main';

const getEnvironmentProperties = (environment) => {
	return environment && environment.properties && typeof environment.properties === 'object'
		? environment.properties
		: {};
};

const getEnvironmentName = (environment) => {
	if (!environment || typeof environment !== 'object') return null;
	if (typeof environment.name === 'string' && environment.name.trim())
		return environment.name.trim();
	if (typeof environment.environmentName === 'string' && environment.environmentName.trim()) {
		return environment.environmentName.trim();
	}
	return null;
};

const getPullRequestNumber = (environment) => {
	if (!environment || typeof environment !== 'object') return null;
	const properties = getEnvironmentProperties(environment);
	const rawNumber = properties.pullRequestNumber ?? environment.pullRequestNumber;
	if (typeof rawNumber === 'number' && Number.isSafeInteger(rawNumber) && rawNumber > 0) {
		return rawNumber;
	}
	if (typeof rawNumber === 'string' && /^[1-9]\d*$/.test(rawNumber)) {
		const parsedNumber = Number(rawNumber);
		return Number.isSafeInteger(parsedNumber) ? parsedNumber : null;
	}

	const environmentName = getEnvironmentName(environment);
	const match = environmentName && environmentName.match(/^pr-(\d+)$/i);
	if (!match) return null;
	const parsedNameNumber = Number(match[1]);
	return Number.isSafeInteger(parsedNameNumber) && parsedNameNumber > 0 ? parsedNameNumber : null;
};

const isProductionEnvironment = (environment, productionBranch) => {
	if (!environment || typeof environment !== 'object') return false;
	const properties = getEnvironmentProperties(environment);
	const environmentName = getEnvironmentName(environment);
	const sourceBranch = properties.sourceBranch ?? environment.sourceBranch;
	return (
		properties.isProduction === true ||
		(typeof environmentName === 'string' &&
			['default', 'production', 'prod'].includes(environmentName.toLowerCase())) ||
		sourceBranch === productionBranch
	);
};

const findStalePreviewEnvironments = (
	environments,
	openPullRequestNumbers,
	productionBranch = DEFAULT_PRODUCTION_BRANCH
) => {
	if (!Array.isArray(environments)) {
		throw new TypeError('Azure Static Web Apps environment list must be an array.');
	}
	if (!(openPullRequestNumbers instanceof Set)) {
		throw new TypeError('Open pull request numbers must be provided as a Set.');
	}

	return environments.filter((environment) => {
		if (!environment || typeof environment !== 'object') return false;
		if (isProductionEnvironment(environment, productionBranch)) return false;
		const pullRequestNumber = getPullRequestNumber(environment);
		return pullRequestNumber !== null && !openPullRequestNumbers.has(pullRequestNumber);
	});
};

const parseOpenPullRequests = (pullRequests) => {
	if (!Array.isArray(pullRequests)) {
		throw new TypeError('GitHub pull request response must be an array.');
	}
	const numbers = new Set();
	pullRequests.forEach((pullRequest) => {
		if (!pullRequest || !Number.isSafeInteger(pullRequest.number) || pullRequest.number <= 0) {
			throw new TypeError('GitHub returned a pull request without a valid number.');
		}
		numbers.add(pullRequest.number);
	});
	return numbers;
};

const getNextPageUrl = (linkHeader) => {
	if (!linkHeader) return null;
	const links = linkHeader.split(',');
	for (let i = 0; i < links.length; i += 1) {
		const match = links[i].match(/<([^>]+)>;\s*rel="next"/);
		if (match) return match[1];
	}
	return null;
};

const fetchOpenPullRequests = async ({
	repository,
	token,
	apiUrl,
	httpsClient,
	productionBranch = DEFAULT_PRODUCTION_BRANCH,
}) => {
	if (typeof repository !== 'string' || !/^[^/]+\/[^/]+$/.test(repository)) {
		throw new Error('GITHUB_REPOSITORY must be in owner/repository format.');
	}
	if (!token) throw new Error('GITHUB_TOKEN is required to list open pull requests.');

	const apiBase = (apiUrl || 'https://api.github.com').replace(/\/+$/, '');
	let nextUrl =
		apiBase +
		'/repos/' +
		repository +
		'/pulls?state=open&base=' +
		encodeURIComponent(productionBranch) +
		'&per_page=100';
	const pullRequests = [];

	while (nextUrl) {
		const response = await new Promise((resolve, reject) => {
			const request = httpsClient.get(
				nextUrl,
				{
					headers: {
						Accept: 'application/vnd.github+json',
						Authorization: 'Bearer ' + token,
						'X-GitHub-Api-Version': '2022-11-28',
						'User-Agent': 'kacsw-swa-preview-cleanup',
					},
				},
				(res) => {
					let body = '';
					res.setEncoding('utf8');
					res.on('data', (chunk) => {
						body += chunk;
					});
					res.on('end', () => {
						if (res.statusCode < 200 || res.statusCode >= 300) {
							reject(
								new Error(
									'GitHub pull request API returned HTTP ' +
										res.statusCode +
										': ' +
										body.slice(0, 500)
								)
							);
							return;
						}
						try {
							resolve({
								body: JSON.parse(body),
								linkHeader: res.headers.link,
							});
						} catch (error) {
							reject(new Error('GitHub pull request API returned invalid JSON: ' + error.message));
						}
					});
				}
			);
			request.on('error', reject);
		});

		if (!Array.isArray(response.body)) {
			throw new TypeError('GitHub pull request API response must be an array.');
		}
		pullRequests.push(...response.body);
		nextUrl = getNextPageUrl(response.linkHeader);
	}

	return parseOpenPullRequests(pullRequests);
};

const loadAzureEnvironments = (environment, exec) => {
	const output = exec('az', [
		'staticwebapp',
		'environment',
		'list',
		'--name',
		environment.SWA_NAME,
		'--resource-group',
		environment.SWA_RESOURCE_GROUP,
		'--output',
		'json',
		'--only-show-errors',
	]);
	let parsed;
	try {
		parsed = JSON.parse(output);
	} catch (error) {
		throw new Error('Azure CLI returned invalid environment JSON: ' + error.message);
	}
	if (!Array.isArray(parsed)) {
		throw new TypeError('Azure CLI environment list must be a JSON array.');
	}
	return parsed;
};

const cleanupStalePreviewEnvironments = async ({
	env = process.env,
	exec = (command, args) =>
		execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }),
	httpsClient = require('https'),
	log = console,
}) => {
	if (!env.SWA_NAME) throw new Error('SWA_NAME is required.');
	if (!env.SWA_RESOURCE_GROUP) throw new Error('SWA_RESOURCE_GROUP is required.');
	const productionBranch = env.SWA_PRODUCTION_BRANCH || DEFAULT_PRODUCTION_BRANCH;

	const [environments, openPullRequestNumbers] = await Promise.all([
		Promise.resolve(loadAzureEnvironments(env, exec)),
		fetchOpenPullRequests({
			repository: env.GITHUB_REPOSITORY,
			token: env.GITHUB_TOKEN,
			apiUrl: env.GITHUB_API_URL,
			httpsClient,
			productionBranch,
		}),
	]);

	const staleEnvironments = findStalePreviewEnvironments(
		environments,
		openPullRequestNumbers,
		productionBranch
	);
	const deletableNames = staleEnvironments.map(getEnvironmentName);
	if (deletableNames.some((name) => !name)) {
		throw new Error('A stale preview environment has no environment name; refusing to delete.');
	}

	const staleSet = new Set(staleEnvironments);
	environments.forEach((environment) => {
		if (staleSet.has(environment)) return;
		if (
			getPullRequestNumber(environment) === null ||
			isProductionEnvironment(environment, productionBranch)
		) {
			log.log(
				'Keeping environment without a safe, closed pull request match:',
				getEnvironmentName(environment) || '(unnamed)'
			);
		}
	});

	if (env.SWA_CLEANUP_DRY_RUN === 'true') {
		log.log('Dry run: stale preview environments:', deletableNames.join(', ') || 'none');
		return { deleted: [], planned: deletableNames };
	}

	const deleted = [];
	for (let i = 0; i < staleEnvironments.length; i += 1) {
		const environment = staleEnvironments[i];
		const environmentName = deletableNames[i];
		const pullRequestNumber = getPullRequestNumber(environment);
		log.log(
			'Deleting closed PR preview environment:',
			environmentName,
			'(PR #' + pullRequestNumber + ')'
		);
		exec('az', [
			'staticwebapp',
			'environment',
			'delete',
			'--name',
			env.SWA_NAME,
			'--environment-name',
			environmentName,
			'--resource-group',
			env.SWA_RESOURCE_GROUP,
			'--yes',
			'--only-show-errors',
		]);
		deleted.push(environmentName);
	}

	log.log('Stale preview cleanup complete. Deleted:', deleted.join(', ') || 'none');
	return { deleted, planned: deletableNames };
};

if (require.main === module) {
	cleanupStalePreviewEnvironments().catch((error) => {
		console.error('Stale Azure Static Web Apps preview cleanup failed:', error.message);
		process.exitCode = 1;
	});
}

module.exports = {
	cleanupStalePreviewEnvironments,
	findStalePreviewEnvironments,
	getEnvironmentName,
	getPullRequestNumber,
	isProductionEnvironment,
	parseOpenPullRequests,
};
