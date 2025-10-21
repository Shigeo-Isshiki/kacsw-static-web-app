/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める

// 内部関数
/**
 * HTML文字列をサニタイズして安全な HTML を返します。
 * - 可能なら DOMPurify.sanitize を利用します。
 * - フォールバックとして script 要素や on* 属性、javascript: URL を除去します。
 * - 最終的に失敗した場合はエスケープしたプレーンテキストを返します。
 *
 * @param {string} html サニタイズ対象の HTML 文字列（null/非文字列でも許容し String() で扱います）
 * @returns {string} サニタイズ済の HTML 文字列
 */
const _kc_sanitizeHtml = (html) => {
    try {
        if (typeof DOMPurify !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
            return DOMPurify.sanitize(html);
        }
    } catch (error) {
        // ignore and fallback
    }
    // フォールバック: 単純なサニタイズ（スクリプトタグ除去・on* 属性除去）
    // 完全な保護を約束するものではないため、可能であればDOMPurify等を導入してください。
    try {
        const template = document.createElement('template');
        template.innerHTML = html;
        // remove script elements
        const scripts = template.content.querySelectorAll('script');
        scripts.forEach(s => s.remove());
        // remove on* attributes
        const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT, null, false);
        let node = walker.nextNode();
        while (node) {
            [...node.attributes].forEach(attr => {
                if (/^on/i.test(attr.name)) {
                    node.removeAttribute(attr.name);
                }
                // javascript: URL を除去
                if (/^href$|^src$/i.test(attr.name) && /javascript:\s*/i.test(attr.value)) {
                    node.removeAttribute(attr.name);
                }
            });
            node = walker.nextNode();
        }
        return template.innerHTML;
    } catch (error) {
        // 最後の手段: プレーンテキストにして挿入
        const tmp = document.createElement('div');
        tmp.textContent = html;
        return tmp.innerHTML;
    }
};

// ここから外部に公開する関数群
/**
 * エラーをユーザーに通知するダイアログを表示します。
 * - 可能なら kintone.createDialog を使ってカスタムダイアログを表示します。
 * - 失敗時は alert をフォールバックで使用します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='エラー'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {void}
 */
const notifyError = (message, title = 'エラー', allowHtml = false) => {
    const body = document.createElement('div');
    // class 名を付与してスタイルやテストを容易にする
    body.className = 'kc-notify-error';
    // アクセシビリティ: アラートダイアログとして扱う
    body.setAttribute('role', 'alertdialog');
    body.style.display = 'flex';
    body.style.alignItems = 'center';
    body.style.gap = '1em';
    body.style.margin = '1em';
    const errorImage = document.createElement('img');
    errorImage.src = 'https://js.kacsw.or.jp/image/errorIcon.png';
    errorImage.alt = 'エラーアイコン';
    errorImage.style.width = '32px';
    errorImage.style.height = '32px';
    // 装飾的な画像はスクリーンリーダーから隠す
    errorImage.setAttribute('aria-hidden', 'true');
    body.appendChild(errorImage);
    const errorText = document.createElement('div');
    // 読み上げ優先度: 即時読み上げが望ましいため assertive に設定
    errorText.setAttribute('role', 'status');
    errorText.setAttribute('aria-live', 'assertive');
    errorText.className = 'kc-notify-error__message';
    // 参照用 id を付与して dialog に関連付けられるようにする
    const messageId = 'kc-notify-error__message-' + Math.random().toString(36).slice(2,8);
    errorText.id = messageId;
    if (allowHtml) {
        // HTML を許可する場合のみサニタイズ済の HTML を挿入
        errorText.innerHTML = _kc_sanitizeHtml(message);
    } else {
        // デフォルトはプレーンテキストとして表示（XSS リスク低減）
        errorText.textContent = String(message);
    }
    body.appendChild(errorText);
    // ダイアログにタイトルをラベルとして与える。aria-describedby で本文を参照。
    body.setAttribute('aria-label', String(title));
    body.setAttribute('aria-describedby', messageId);

    const config = {
        title: String(title),
        body: body,
        showOkButton: true,
        okButtonText: '閉じる',
        showCancelButton: false,
        cancelButtonText: '',
        showCloseButton: false,
        beforeClose: () => {
        return;
        }
    }
    try {
        const dialog = kintone.createDialog(config);
        const setOkAriaLabel = (dialogObj) => {
            try {
                // 可能ならダイアログ内部の OK ボタンに aria-label を付与
                const container = dialogObj.element || dialogObj.dialog || dialogObj.container || null;
                if (container) {
                    const okBtn = container.querySelector('button.kintone-dialog-ok-button, button');
                    if (okBtn) {
                        okBtn.setAttribute('aria-label', '閉じる');
                    }
                }
            } catch (error) {
                // noop
            }
        };
        if (dialog && typeof dialog.then === 'function') {
            dialog.then((object) => {
                try { object.show(); } catch(error) {}
                setOkAriaLabel(object);
            }).catch((error) => console.error('ダイアログ表示中にエラー:', error));
        } else if (dialog && typeof dialog.show === 'function') {
            dialog.show();
            setOkAriaLabel(dialog);
        }
    } catch (error) {
        console.error('notifyError dialog error', error);
        // フォールバック
        try {
            alert(String(message));
        } catch (error) {
            // noop
        }
    }
};

/**
 * getFieldValueOr - record から指定フィールドの value を安全に取得します。
 * - record が null/非オブジェクト、fieldCode が文字列でない場合は defaultValue を返します。
 * - 指定フィールドが存在しない、または value が undefined の場合は defaultValue を返します。
 * - defaultValue を省略した場合は undefined が返ります。
 *
 * @param {Object} record kintone の record オブジェクト想定
 * @param {string} fieldCode 取得するフィールドのフィールドコード
 * @param {*} [defaultValue] フィールドが無ければ返す既定値（省略可能）
 * @returns {*} フィールドの value または defaultValue
 */
const getFieldValueOr = (record, fieldCode, defaultValue) => {
    try {
        if (typeof fieldCode !== 'string' || !fieldCode.trim()) {
            console.warn('getFieldValueOr: invalid fieldCode', { fieldCode });
            return defaultValue;
        }
        if (typeof record !== 'object' || record === null || Array.isArray(record)) {
            console.warn('getFieldValueOr: invalid record', { record });
            return defaultValue;
        }
        const field = Object.prototype.hasOwnProperty.call(record, fieldCode) ? record[fieldCode] : undefined;
        if (!field || typeof field !== 'object') {
            return defaultValue;
        }
        // value が存在する場合はそのまま返す（null や空文字も有効値として返す）
        if (Object.prototype.hasOwnProperty.call(field, 'value')) {
            return field.value;
        }
        return defaultValue;
    } catch (error) {
        console.error('getFieldValueOr: unexpected error', { error, record, fieldCode });
        return defaultValue;
    }
};

/**
 * kintoneEventOn - kintone のイベント登録ラッパー
 * - 引数チェックを行い、登録成功で true、失敗で false を返します。
 * @param {string|string[]} events イベント名またはイベント名配列
 * @param {function} handler イベントハンドラ関数
 * @returns {boolean} 登録に成功したら true、入力が不正な場合は false
 */
const kintoneEventOn = (events, handler) => {
    // basic validation
    const isValidEvents = typeof events === 'string' || (Array.isArray(events) && events.every(e => typeof e === 'string'));
    if (!isValidEvents || typeof handler !== 'function') {
        console.warn('kintoneEventOn: invalid arguments', { events, handler });
        return false;
    }

    try {
        kintone.events.on(events, (event) => {
            try {
                return handler(event);
            } catch (error) {
                console.error('kintone event handler error', { events, error });
                try { notifyError('システムエラーが発生しました。詳細はコンソールを確認してください。'); } catch (err) {}
                return event;
            }
        });
        return true;
    } catch (error) {
        console.error('kintoneEventOn: failed to register events', { events, error });
        return false;
    }
};

/**
 * setRecordValues - record の複数フィールドに対して値を一括設定するユーティリティ
 * - 引数チェックを行い、成功時は true、失敗時は false を返します。
 * @param {Object} record 各フィールドの値（kintone の record オブジェクト想定）
 * @param {Object} values 設定するフィールド値のオブジェクト（キーがフィールドコード、値が設定値）
 * @returns {boolean} 成功したら true、入力が不正な場合は false
 */
const setRecordValues = (record, values) => {
    if (typeof record !== 'object' || record === null || Array.isArray(record) || typeof values !== 'object' || values === null) {
        console.warn('setRecordValues: invalid arguments', { record, values });
        return false;
    }
    Object.keys(values).forEach((k) => {
        // 既存フィールドがある場合は value に設定する（kintone フィールドオブジェクト想定）
        if (Object.prototype.hasOwnProperty.call(record, k)) {
            const fieldObj = record[k];
            if (fieldObj && typeof fieldObj === 'object') {
                if (Object.prototype.hasOwnProperty.call(fieldObj, 'value')) {
                    fieldObj.value = values[k];
                } else {
                    // オブジェクトだが value プロパティが無い場合は value を追加する
                    fieldObj.value = values[k];
                }
            } else {
                // 原始値が入っている場合は上書き
                record[k] = values[k];
            }
        } else {
            // フィールドが存在しない場合は簡易フィールドオブジェクトを作成して value を設定する
            record[k] = { value: values[k] };
        }
    });
    return true;
};

/**
 * kintone のスペースフィールド（スペースエレメント）を表示/非表示に切り替えます。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {boolean} display true=表示, false=非表示
 * @returns {boolean} 成功したら true、引数不正や要素が見つからなければ false
 */
const setSpaceFieldDisplay = (spaceField, display) => {
    if (typeof spaceField !== 'string' || !spaceField.trim() || typeof display !== 'boolean') {
        console.warn('setSpaceFieldDisplay: invalid arguments', { spaceField, display });
        return false;
    }
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (!spaceElement) {
        console.warn('setSpaceFieldDisplay: space element not found', spaceField);
        return false;
    }
    spaceElement.parentNode.style.display = display ? '' : 'none';
    return true;
};

/**
 * kintone のスペースフィールドにボタン要素を追加または削除します。
 * - 既存の同 ID の要素は常に削除されます。
 * - 追加時は type="button" として作成し、onClick が関数であれば click イベントを登録します。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {string} id 追加するボタン要素の id
 * @param {string|null} textContent ボタンの表示テキスト。null/空なら要素を削除して非表示にする
 * @param {function|null|undefined} [onClick] クリック時に実行するコールバック（関数でない場合は無視される）
 * @returns {boolean|undefined} 要素の追加/削除に成功したら true/false を返します。入力が不正な場合は undefined を返すことがあります。
 */
const setSpaceFieldButton = (spaceField, id, textContent, onClick) => {
    if (
        typeof spaceField !== 'string' || !spaceField.trim() ||
        typeof id !== 'string' || !id.trim() ||
        (textContent !== null && typeof textContent !== 'string') ||
        (onClick !== undefined && typeof onClick !== 'function' && onClick !== null)
    ) {
        return;
    }
    // 既存ボタン削除
    const buttonElementById = document.getElementById(id);
    if (buttonElementById) {
        buttonElementById.remove();
    }
    if (textContent) {
        // ボタン追加
        const button = document.createElement('button');
        // フォーム内で誤って submit を引き起こさないように type を明示する
        button.type = 'button';
        button.id = id;
        button.textContent = textContent;
        if (typeof onClick === 'function') {
            button.addEventListener('click', onClick);
        }
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (!spaceElement) {
            console.warn('setSpaceFieldButton: space element not found', spaceField);
            return false;
        }
        spaceElement.appendChild(button);
        setSpaceFieldDisplay(spaceField, true);
        return true;
    } else {
        // 非表示
        return setSpaceFieldDisplay(spaceField, false);
    }
    
};

/**
 * kintone のスペースフィールド内に任意の HTML 文字列を挿入して表示／削除します。
 * - 挿入時は既存の同 ID 要素を削除してから追加します。
 * - innerHTML は内部でサニタイズされます。
 *
 * @param {string} spaceField スペースフィールドのフィールドコード
 * @param {string} id 追加する要素の id（既存要素があれば上書きの代わりに削除して再作成）
 * @param {string|null} innerHTML 表示する HTML。null/空文字 の場合は要素を削除して非表示にする
 * @returns {boolean} 成功したら true、引数不正や要素未発見などで失敗したら false
 */
const setSpaceFieldText = (spaceField, id, innerHTML) => {
    if (
        typeof spaceField !== 'string' || !spaceField.trim() ||
        typeof id !== 'string' || !id.trim() ||
        (innerHTML !== null && typeof innerHTML !== 'string')
    ) {
        console.warn('setSpaceFieldText: invalid arguments', { spaceField, id, innerHTML });
        return false;
    }
    // 既存要素削除
    const spaceFieldElementById = document.getElementById(id);
    if (spaceFieldElementById) {
        spaceFieldElementById.remove();
    }
    if (innerHTML) {
        // 表示
        const createSpaceFieldElement = document.createElement('div');
        createSpaceFieldElement.id = id;
        // innerHTML は HTML 形式での入力が想定されるため、可能な限りサニタイズしてから挿入する
        createSpaceFieldElement.innerHTML = _kc_sanitizeHtml(innerHTML);
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (!spaceElement) {
            console.warn('setSpaceFieldText: space element not found', spaceField);
            return false;
        }
        spaceElement.appendChild(createSpaceFieldElement);
        return setSpaceFieldDisplay(spaceField, true);
    } else {
        // 非表示
        return setSpaceFieldDisplay(spaceField, false);
    }
    
};