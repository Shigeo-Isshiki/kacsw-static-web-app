const assert = require('assert');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const css = fs.readFileSync(path.join(__dirname, '../src/51-modern-default.css'), 'utf8');
const competingCss = `
[class|=kintoneplugin] {
	color: #333;
	word-wrap: break-word;
	font-size: 16px;
	line-height: 1.5;
}
._kintoneplugin-button-normal_t1p20_465 { color: #3498db; }
`;
const cases = [
	['button', 'kintoneplugin-button-normal', 'rgb(52, 152, 219)'],
	['a', 'kintoneplugin-button-normal', 'rgb(52, 152, 219)'],
	['button', 'kintoneplugin-button-normal extra', 'rgb(52, 152, 219)'],
	['button', 'extra kintoneplugin-button-normal', 'rgb(52, 152, 219)'],
	['button', 'kintoneplugin-button-disabled', 'rgb(186, 186, 186)'],
	['button', 'kintoneplugin-button-dialog-ok', 'rgb(255, 255, 255)'],
	['button', 'kintoneplugin-button-dialog-cancel', 'rgb(52, 152, 219)'],
	['div', 'kintoneplugin-alert', 'rgb(246, 246, 246)'],
	['div', 'kintoneplugin-desc', 'rgb(136, 136, 136)'],
	['span', 'kintoneplugin-require', 'rgb(192, 152, 83)'],
	['input', 'kintoneplugin-input-text', 'rgb(167, 167, 167)'],
	['div', 'kintoneplugin-dropdown', 'rgb(52, 152, 219)'],
	['span', 'kintoneplugin-dropdown-selected-name', 'rgb(52, 152, 219)'],
	['th', 'kintoneplugin-table-th', 'rgb(255, 255, 255)'],
	['div', 'kintoneplugin-row', 'rgb(51, 51, 51)'],
];

(async () => {
	const browser = await puppeteer.launch({
		headless: true,
		args: process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
	});
	try {
		const page = await browser.newPage();
		let baseline;
		for (const order of ['original', 'none', 'before', 'after']) {
			await page.mouse.move(0, 0);
			await page.setContent('<html lang="ja"><body></body></html>');
			await page.evaluate((fixtures) => {
				for (const [index, [tag, className]] of fixtures.entries()) {
					const element = document.createElement(tag);
					element.id = `case-${index}`;
					element.className = className;
					if (tag === 'input') element.type = 'text';
					else element.textContent = 'Test';
					if (tag === 'th') {
						const table = document.createElement('table');
						const row = table.insertRow();
						row.appendChild(element);
						document.body.appendChild(table);
					} else {
						document.body.appendChild(element);
					}
				}
			}, cases);
			if (order === 'before') await page.addStyleTag({ content: competingCss });
			await page.addStyleTag({
				content: order === 'original' ? css.replace(/\[class\]/g, '') : css,
			});
			if (order === 'after') await page.addStyleTag({ content: competingCss });

			const appearance = await page.evaluate(() =>
				[...document.querySelectorAll('[id^="case-"]')].map((element) => {
					const style = getComputedStyle(element);
					return Object.fromEntries(
						[
							'color',
							'backgroundColor',
							'border',
							'boxShadow',
							'fontFamily',
							'fontSize',
							'lineHeight',
							'height',
							'minWidth',
							'padding',
							'display',
						].map((property) => [property, style[property]])
					);
				})
			);
			if (order === 'original') baseline = appearance;
			else assert.deepStrictEqual(appearance, baseline, `${order}: appearance unchanged`);

			for (const [index, [, className, expected]] of cases.entries()) {
				const selector = `#case-${index}`;
				const getColor = () => page.$eval(selector, (element) => getComputedStyle(element).color);
				assert.strictEqual(await getColor(), expected, `${order}: ${className}`);
				if (className.startsWith('kintoneplugin-button-')) {
					await page.hover(selector);
					assert.strictEqual(await getColor(), expected, `${order}: ${className}:hover`);
					await page.focus(selector);
					assert.strictEqual(await getColor(), expected, `${order}: ${className}:focus`);
				}
				if (className === 'kintoneplugin-input-text') {
					await page.focus(selector);
					assert.strictEqual(await getColor(), 'rgb(0, 0, 0)', `${order}: input:focus`);
				}
			}
		}
		console.log('modern-default CSS colors: passed (standalone, competing CSS before/after)');
	} finally {
		await browser.close();
	}
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
