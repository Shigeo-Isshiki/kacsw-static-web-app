const assert = require('assert');

global.window = global;
require('../src/text-suite.js');

let registration;
global.kintone = {
	events: {
		on: (events, handler) => {
			registration = { events, handler };
		},
	},
};

const register = (options = {}) => {
	window.registerEmailAddressHandler('email', options);
	return registration;
};
const constraint = {
	allowedDomains: ['KACSW.OR.JP'],
	errorMessage: 'domain error',
};
const run = (name, test) => {
	try {
		test();
		console.log(`PASS: ${name}`);
	} catch (error) {
		console.error(`FAIL: ${name}`, error);
		process.exitCode = 2;
	}
};

run('domain opt-out preserves existing normalization and events', () => {
	const { events, handler } = register();
	assert.deepStrictEqual(events, [
		'app.record.create.change.email',
		'app.record.edit.change.email',
	]);
	const event = { record: { email: { value: 'ＴＥＳＴ@Example.COM' } } };
	assert.strictEqual(handler(event), event);
	assert.strictEqual(event.record.email.value, 'test@example.com');
	assert.strictEqual(window.assertEmailAddress('Test@example.com'), 'test@example.com');
});

run('domain matching normalizes first and requires the complete domain', () => {
	const errorMessages = { other: 'keep' };
	const { handler } = register({ domainConstraint: constraint, errorMessages });
	const field = { value: ' ＴＥＳＴ＠KACSW.OR.JP ' };
	const event = { record: { email: field } };
	handler(event);
	assert.strictEqual(field.value, 'test@kacsw.or.jp');
	assert.strictEqual(field.error, null);
	assert.strictEqual(errorMessages.email, null);
	for (const value of [
		'test@example.com',
		'test@sub.kacsw.or.jp',
		'test@notkacsw.or.jp',
		'test@kacsw.or.jp.example.com',
	]) {
		field.value = value;
		handler(event);
		assert.strictEqual(field.value, value);
		assert.strictEqual(field.error, constraint.errorMessage);
		assert.strictEqual(errorMessages.email, field.error);
	}
	field.value = 'Test@kacsw.or.jp';
	handler(event);
	assert.strictEqual(field.value, 'test@kacsw.or.jp');
	assert.strictEqual(field.error, null);
	assert.strictEqual(errorMessages.email, null);
	assert.strictEqual(errorMessages.other, 'keep');
});

run('dependency change uses current record and clears conditional domain errors', () => {
	const errorMessages = {};
	const record = {
		email: { value: 'TEST@Example.COM' },
		classification: { value: 'staff' },
	};
	let lastEmail;
	const { handler } = register({
		errorMessages,
		watchFields: ['classification'],
		domainConstraint: {
			...constraint,
			when: (currentRecord, email) => {
				assert.strictEqual(currentRecord, record);
				lastEmail = email;
				return currentRecord.classification.value === 'staff';
			},
		},
	});
	const event = { type: 'app.record.edit.change.classification', record };
	handler(event);
	assert.strictEqual(lastEmail, 'test@example.com');
	assert.strictEqual(record.email.value, 'TEST@Example.COM');
	assert.strictEqual(record.email.error, constraint.errorMessage);
	record.classification.value = 'external';
	handler(event);
	assert.strictEqual(record.email.value, 'test@example.com');
	assert.strictEqual(record.email.error, null);
	assert.strictEqual(errorMessages.email, null);
	record.classification.value = 'staff';
	handler(event);
	assert.strictEqual(record.email.error, constraint.errorMessage);
	record.email.value = 'new@kacsw.or.jp';
	handler(event);
	assert.strictEqual(record.email.error, null);
	assert.strictEqual(errorMessages.email, null);
});

run('multiple allowed domains work and invalid format takes precedence over the condition', () => {
	let conditionCalls = 0;
	const { handler } = register({
		domainConstraint: {
			...constraint,
			allowedDomains: ['kacsw.or.jp', 'EXAMPLE.COM'],
			when: () => {
				conditionCalls += 1;
				return true;
			},
		},
	});
	const field = { value: 'TEST@Example.COM' };
	const event = { record: { email: field } };
	handler(event);
	assert.strictEqual(field.value, 'test@example.com');
	assert.strictEqual(field.error, null);
	field.value = 'invalid';
	handler(event);
	assert.strictEqual(conditionCalls, 1);
	assert.strictEqual(field.value, 'invalid');
	assert.strictEqual(field.error, 'メールアドレスの形式が正しくありません');
	assert.strictEqual(handler({ record: {} }).record.email, undefined);
});

run('false condition still validates email format and empty values clear errors', () => {
	const errorMessages = {};
	const { handler } = register({
		errorMessages,
		domainConstraint: { ...constraint, when: () => false },
	});
	const field = { value: 'invalid' };
	const event = { record: { email: field } };
	handler(event);
	assert.strictEqual(field.value, 'invalid');
	assert.strictEqual(field.error, 'メールアドレスの形式が正しくありません');
	assert.strictEqual(errorMessages.email, field.error);
	for (const value of ['', null, undefined]) {
		field.value = value;
		field.error = 'old';
		errorMessages.email = 'old';
		handler(event);
		assert.strictEqual(field.value, value);
		assert.strictEqual(field.error, null);
		assert.strictEqual(errorMessages.email, null);
	}
});

run('watch events respect devices, deduplicate fields, and never register submit', () => {
	for (const devices of ['desktop', 'mobile', 'both']) {
		const { events } = register({
			devices,
			watchFields: ['classification', 'email', 'classification'],
		});
		const prefixes =
			devices === 'both' ? ['app', 'mobile.app'] : devices === 'mobile' ? ['mobile.app'] : ['app'];
		const expected = ['email', 'classification'].flatMap((code) =>
			prefixes.flatMap((prefix) => [
				`${prefix}.record.create.change.${code}`,
				`${prefix}.record.edit.change.${code}`,
			])
		);
		assert.deepStrictEqual(events, expected);
	}
});

run('invalid options fail before registering and invalid callbacks surface errors', () => {
	for (const options of [
		{ watchFields: 'classification' },
		{ watchFields: [''] },
		{ domainConstraint: null },
		{ domainConstraint: { ...constraint, allowedDomains: [] } },
		{ domainConstraint: { ...constraint, allowedDomains: ['@kacsw.or.jp'] } },
		{ domainConstraint: { ...constraint, allowedDomains: ['example..com'] } },
		{ domainConstraint: { ...constraint, errorMessage: '' } },
		{ domainConstraint: { ...constraint, when: true } },
	]) {
		registration = null;
		assert.throws(() => register(options));
		assert.strictEqual(registration, null);
	}
	for (const when of [
		() => undefined,
		() => {
			throw new Error('condition error');
		},
	]) {
		const errorMessages = {};
		const { handler } = register({ errorMessages, domainConstraint: { ...constraint, when } });
		const field = { value: 'TEST@kacsw.or.jp' };
		handler({ record: { email: field } });
		assert.strictEqual(field.value, 'TEST@kacsw.or.jp');
		assert.ok(field.error);
		assert.strictEqual(errorMessages.email, field.error);
	}
});

const registerTable = (options = {}) => {
	const registered = [];
	global.kintone.events.on = (events, handler) => registered.push({ events, handler });
	window.registerTableEmailAddressHandler('table', 'email', options);
	return registered;
};

run('table without domain constraints preserves existing behavior', () => {
	const registered = registerTable();
	assert.strictEqual(registered.length, 2);
	assert.deepStrictEqual(registered[1].events, [
		'app.record.create.change.email',
		'app.record.edit.change.email',
	]);
	const field = { value: 'TEST@Example.COM' };
	registered[1].handler({
		record: { table: { value: [{ id: 'row-1', value: { email: field } }] } },
		changes: { row: { id: 'row-1' } },
	});
	assert.strictEqual(field.value, 'test@example.com');
	assert.strictEqual(field.error, null);
});

run('table column changes validate only the identified row using current row context', () => {
	const errorMessages = { table: { deleted: { email: 'old' } }, other: 'keep' };
	const rows = [
		{ id: 'r1', value: { email: { value: 'TEST@Example.COM' }, role: { value: 'staff' } } },
		{ id: 'r2', value: { email: { value: 'OTHER@Example.COM' }, role: { value: 'staff' } } },
	];
	const record = { table: { value: rows } };
	const registered = registerTable({
		errorMessages,
		watchColumns: ['role', 'email', 'role'],
		domainConstraint: {
			...constraint,
			when: (currentRecord, email, row) => {
				assert.strictEqual(currentRecord, record);
				assert.ok(rows.includes(row));
				assert.strictEqual(email, row.value.email.value.trim().toLowerCase());
				return row.value.role.value === 'staff';
			},
		},
	});
	const handler = registered[1].handler;
	const event = {
		type: 'app.record.edit.change.role',
		record,
		changes: { row: { id: 'r1' } },
	};
	handler(event);
	assert.strictEqual(rows[0].value.email.value, 'TEST@Example.COM');
	assert.strictEqual(rows[0].value.email.error, constraint.errorMessage);
	assert.strictEqual(errorMessages.table.r1.email, constraint.errorMessage);
	assert.strictEqual(rows[1].value.email.value, 'OTHER@Example.COM');
	assert.strictEqual(rows[1].value.email.error, undefined);
	assert.strictEqual(errorMessages.table.deleted, undefined);
	rows[0].value.role.value = 'external';
	handler(event);
	assert.strictEqual(rows[0].value.email.value, 'test@example.com');
	assert.strictEqual(rows[0].value.email.error, null);
	assert.strictEqual(errorMessages.table.r1.email, null);
	const snapshot = JSON.stringify(rows);
	handler({ ...event, changes: { row: { id: 'missing' } } });
	handler({ ...event, changes: { row: {} } });
	assert.strictEqual(JSON.stringify(rows), snapshot);
	assert.strictEqual(errorMessages.other, 'keep');
});

run('external field changes revalidate every row and clear conditional errors', () => {
	const rows = [
		{ id: 'r1', value: { email: { value: 'A@Example.COM' } } },
		{ id: 'r2', value: { email: { value: 'Ｂ＠KACSW.OR.JP' } } },
		{ value: { email: { value: 'C@example.com' } } },
		{ id: 'r4', value: { email: { value: '' } } },
	];
	const errorMessages = {};
	const record = { table: { value: rows }, classification: { value: 'staff' } };
	const registered = registerTable({
		errorMessages,
		watchFields: ['classification'],
		domainConstraint: {
			...constraint,
			when: (currentRecord) => currentRecord.classification.value === 'staff',
		},
	});
	const event = { type: 'app.record.edit.change.classification', record, changes: { row: null } };
	const handler = registered[2].handler;
	assert.strictEqual(handler(event), event);
	assert.strictEqual(rows[0].value.email.value, 'A@Example.COM');
	assert.strictEqual(rows[0].value.email.error, constraint.errorMessage);
	assert.strictEqual(rows[1].value.email.value, 'b@kacsw.or.jp');
	assert.strictEqual(rows[1].value.email.error, null);
	assert.strictEqual(rows[2].value.email.error, constraint.errorMessage);
	assert.deepStrictEqual(Object.keys(errorMessages.table).sort(), ['r1', 'r2', 'r4']);
	assert.strictEqual(rows[3].value.email.error, null);
	record.classification.value = 'external';
	handler(event);
	assert.strictEqual(rows[0].value.email.value, 'a@example.com');
	assert.strictEqual(rows[0].value.email.error, null);
	assert.strictEqual(errorMessages.table.r1.email, null);
	assert.strictEqual(rows[2].value.email.error, null);
	rows[0].value.email.value = 'invalid';
	handler(event);
	assert.strictEqual(rows[0].value.email.error, 'メールアドレスの形式が正しくありません');
	assert.strictEqual(errorMessages.table.r1.email, rows[0].value.email.error);
	assert.strictEqual(handler({ record: {} }).record.table, undefined);
});

run('table domain matching is exact and handles empty values and condition failures', () => {
	const errorMessages = {};
	const registered = registerTable({ errorMessages, domainConstraint: constraint });
	const field = { value: 'test@sub.kacsw.or.jp' };
	const row = { id: 'r1', value: { email: field } };
	const event = { record: { table: { value: [row] } }, changes: { row } };
	const handler = registered[1].handler;
	handler(event);
	assert.strictEqual(field.value, 'test@sub.kacsw.or.jp');
	assert.strictEqual(field.error, constraint.errorMessage);
	field.value = 'TEST@KACSW.OR.JP';
	handler(event);
	assert.strictEqual(field.value, 'test@kacsw.or.jp');
	assert.strictEqual(errorMessages.table.r1.email, null);
	for (const value of ['', null, undefined]) {
		field.value = value;
		field.error = 'old';
		errorMessages.table.r1.email = 'old';
		handler(event);
		assert.strictEqual(field.value, value);
		assert.strictEqual(field.error, null);
		assert.strictEqual(errorMessages.table.r1.email, null);
	}
	const invalidCondition = registerTable({
		errorMessages,
		domainConstraint: { ...constraint, when: () => undefined },
	});
	field.value = 'TEST@kacsw.or.jp';
	invalidCondition[1].handler(event);
	assert.strictEqual(field.value, 'TEST@kacsw.or.jp');
	assert.strictEqual(field.error, 'domainConstraint.whenはboolean値を返す必要があります');
	assert.strictEqual(errorMessages.table.r1.email, field.error);
});

run('table watch events honor devices and reject ambiguous configuration', () => {
	for (const devices of ['desktop', 'mobile', 'both']) {
		const registered = registerTable({
			devices,
			watchFields: ['classification', 'classification'],
			watchColumns: ['role', 'email', 'role'],
		});
		const prefixes =
			devices === 'both' ? ['app', 'mobile.app'] : devices === 'mobile' ? ['mobile.app'] : ['app'];
		const eventsFor = (code) =>
			prefixes.flatMap((prefix) => [
				`${prefix}.record.create.change.${code}`,
				`${prefix}.record.edit.change.${code}`,
			]);
		assert.deepStrictEqual(registered[0].events, eventsFor('table'));
		assert.deepStrictEqual(registered[1].events, [...eventsFor('email'), ...eventsFor('role')]);
		assert.deepStrictEqual(registered[2].events, eventsFor('classification'));
	}
	for (const options of [
		{ watchColumns: 'role' },
		{ watchColumns: [''] },
		{ watchFields: ['role'], watchColumns: ['role'] },
		{ watchFields: ['email'] },
		{ watchFields: ['table'] },
		{ watchColumns: ['table'] },
		{ domainConstraint: { ...constraint, allowedDomains: [] } },
	]) {
		const registered = [];
		global.kintone.events.on = (events) => registered.push(events);
		assert.throws(() => window.registerTableEmailAddressHandler('table', 'email', options));
		assert.deepStrictEqual(registered, []);
	}
});
