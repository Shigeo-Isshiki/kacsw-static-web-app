/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める

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
        return;
    }
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (spaceElement) {
        spaceElement.parentNode.style.display = display ? '' : 'none';
    }
    return;
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
        return;
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
        createSpaceFieldElement.innerHTML = '<div>' + innerHTML + '</div>';
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (spaceElement) {
            spaceElement.appendChild(createSpaceFieldElement);
            setSpaceFieldDisplay(spaceField, true);
        }
    } else {
        // 非表示
        setSpaceFieldDisplay(spaceField, false);
    }
    return;
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
        button.id = id;
        button.textContent = textContent;
        if (typeof onClick === 'function') {
            button.addEventListener('click', onClick);
        }
        const spaceElement = kintone.app.record.getSpaceElement(spaceField);
        if (spaceElement) {
            spaceElement.appendChild(button);
            setSpaceFieldDisplay(spaceField, true);
        }
    } else {
        // 非表示
        setSpaceFieldDisplay(spaceField, false);
    }
    return;
};