/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める

// 内部関数
/**
 * HTMLをサニタイズする関数
 * @param {*} html 
 * @returns 
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
 * kintoneのスペースフィールドの表示・非表示を切り替える関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {boolean} display - 表示する場合はtrue、非表示はfalse
 * @returns {void}
 * @description 指定したスペースフィールドの表示状態を切り替えます。
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
 * kintoneのスペースフィールドにテキストを表示・非表示する関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - 出力する要素のID名（任意のもの）
 * @param {string|null} innerHTML - 表示するHTML文字列。nullまたは空文字で非表示
 * @returns {void}
 * @description innerHTMLがあれば表示、なければ削除して非表示にします。
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

/**
 * kintoneのスペースフィールドにボタンを追加・削除する関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - ボタン要素のID名（任意のもの）
 * @param {string|null} textContent - ボタンに表示するテキスト。nullまたは空文字で削除
 * @param {function} [onClick] - ボタンのクリック時に実行する関数（省略可）
 * @returns {void}
 * @description textContentがあればボタンを追加、なければ削除して非表示にします。onClickでクリックイベントを割り当て可能。
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
 * エラーメッセージを通知する共通関数
 * @param {*} message エラーメッセージの内容
 * @param {*} title ダイアログタイトル（省略可）
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
                        try { okBtn.focus(); } catch(e) {}
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