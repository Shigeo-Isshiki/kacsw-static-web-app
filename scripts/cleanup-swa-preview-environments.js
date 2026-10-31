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
	const environmentName = getEnvironmentName(environment);
	const match = environmentName && environmentName.match(/^(?:pr-)?([1-9]\d*)$/i);
	const nameNumber = match ? Number(match[1]) : null;
	if (rawNumber !== null && rawNumber !== undefined) {
		const parsedNumber =
			typeof rawNumber === 'number'
				? rawNumber
				: typeof rawNumber === 'string' && /^[1-9]\d*$/.test(rawNumber)
					? Number(rawNumber)
					: null;
		if (!Number.isSafeInteger(parsedNumber) || parsedNumber <= 0) return null;
		if (match && nameNumber !== parsedNumber) return null;
		return parsedNumber;
	}
	return Number.isSafeInteger(nameNumber) && nameNumber > 0 ? nameNumber : null;
};

const isProductionEnvironment = (environment, productionBranch) => {
	if (!environment || typeof environment !== 'object') return false;
	const properties = getEnvironmentProperties(environment);
	const environmentName = getEnvironmentName(environment);
	const sourceBranch = properties.sourceBranch ?? environment.sourceBranch;
	return (
		properties.isProduction === true ||
		environment.isProduction === true ||
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

const fetchGitHubJson = ({ url, token, httpsClient }) =>
	new Promise((resolve, reject) => {
		const request = httpsClient.get(
			url,
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
				res.on('error', reject);
				res.on('data', (chunk) => {
					body += chunk;
				});
				res.on('end', () => {
					if (res.statusCode < 200 || res.statusCode >= 300) {
						reject(new Error('GitHub pull request API returned HTTP ' + res.statusCode));
						return;
					}
					try {
						resolve({ body: JSON.parse(body), linkHeader: res.headers.link });
					} catch (error) {
						reject(new Error('GitHub pull request API returned invalid JSON: ' + error.message));
					}
				});
			}
		);
		request.on('error', reject);
	});

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
		const response = await fetchGitHubJson({ url: nextUrl, token, httpsClient });

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
	wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
	log = console,
} = {}) => {
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
	// Verify all candidates before deleting any environment.
	const verifiedEnvironments = [];
	for (const environment of staleEnvironments) {
		const number = getPullRequestNumber(environment);
		const apiBase = (env.GITHUB_API_URL || 'https://api.github.com').replace(/\/+$/, '');
		const { body: pullRequest } = await fetchGitHubJson({
			url: apiBase + '/repos/' + env.GITHUB_REPOSITORY + '/pulls/' + number,
			token: env.GITHUB_TOKEN,
			httpsClient,
		});
		const properties = getEnvironmentProperties(environment);
		const sourceBranch = properties.sourceBranch ?? environment.sourceBranch;
		if (
			pullRequest &&
			pullRequest.number === number &&
			pullRequest.state === 'closed' &&
			pullRequest.base?.ref === productionBranch &&
			pullRequest.base?.repo?.full_name === env.GITHUB_REPOSITORY &&
			pullRequest.head?.repo?.full_name === env.GITHUB_REPOSITORY &&
			typeof sourceBranch === 'string' &&
			sourceBranch.length > 0 &&
			pullRequest.head?.ref === sourceBranch
		) {
			verifiedEnvironments.push(environment);
		} else {
			log.log('Keeping environment with unverified PR identity:', getEnvironmentName(environment));
		}
	}
	const deletableNames = verifiedEnvironments.map(getEnvironmentName);
	if (deletableNames.some((name) => !name)) {
		throw new Error('A stale preview environment has no environment name; refusing to delete.');
	}

	const staleSet = new Set(verifiedEnvironments);
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
	log.log(
		'Preview cleanup counts:',
		JSON.stringify({
			total: environments.length,
			candidates: staleEnvironments.length,
			verified: verifiedEnvironments.length,
			kept: environments.length - verifiedEnvironments.length,
		})
	);

	if (env.SWA_CLEANUP_DRY_RUN === 'true') {
		log.log('Dry run: stale preview environments:', deletableNames.join(', ') || 'none');
		return { deleted: [], planned: deletableNames };
	}
	if (
		deletableNames.length > 0 &&
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			env.AZURE_SUBSCRIPTION_ID || ''
		)
	) {
		throw new Error('AZURE_SUBSCRIPTION_ID must be a GUID to delete preview environments.');
	}

	const deleted = [];
	for (let i = 0; i < verifiedEnvironments.length; i += 1) {
		const environment = verifiedEnvironments[i];
		const environmentName = deletableNames[i];
		const pullRequestNumber = getPullRequestNumber(environment);
		log.log(
			'Deleting closed PR preview environment:',
			environmentName,
			'(PR #' + pullRequestNumber + ')'
		);
		const resourceUrl =
			'https://management.azure.com/subscriptions/' +
			encodeURIComponent(env.AZURE_SUBSCRIPTION_ID) +
			'/resourceGroups/' +
			encodeURIComponent(env.SWA_RESOURCE_GROUP) +
			'/providers/Microsoft.Web/staticSites/' +
			encodeURIComponent(env.SWA_NAME) +
			'/builds/' +
			encodeURIComponent(environmentName) +
			'?api-version=2024-11-01';
		exec('az', [
			'rest',
			'--method',
			'delete',
			'--url',
			resourceUrl,
			'--output',
			'none',
			'--only-show-errors',
		]);
		let confirmed = false;
		for (let attempt = 0; attempt < 12; attempt += 1) {
			if (attempt > 0) await wait(5000);
			const remaining = loadAzureEnvironments(env, exec);
			if (!remaining.some((item) => getEnvironmentName(item) === environmentName)) {
				confirmed = true;
				break;
			}
		}
		if (!confirmed) {
			throw new Error(
				'Timed out confirming preview deletion: ' +
					environmentName +
					'. The deletion request may still be in progress.'
			);
		}
		deleted.push(environmentName);
		log.log('Confirmed preview environment deletion:', environmentName);
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
