/* kintone カスタマイズのサンプルエントリポイント */
(function () {
	'use strict';

	if (typeof kintone === 'undefined') {
		console.warn('kintone オブジェクトが見つかりません。kintone 上で実行してください。');
		return;
	}

	kintone.events.on('app.record.index.show', function (event) {
		console.log('kintone customization loaded');
		return event;
	});
})();
