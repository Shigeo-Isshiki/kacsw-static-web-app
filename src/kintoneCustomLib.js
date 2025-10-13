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
    if (!spaceField || typeof display !== 'boolean') {
        return;
    }
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (spaceElement) {
        spaceElement.parentNode.style.display = display ? '' : 'none';
    }
    return;
};


/**
 * kintoneのスペースフィールドにテキストを表示・非表示する統合関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - 出力する要素のID名（任意のもの）
 * @param {string|null} innerHTML - 表示するHTML文字列。nullまたは空文字で非表示
 * @returns {void}
 * @description innerHTMLがあれば表示、なければ削除して非表示にします。
 */
const setSpaceFieldText = (spaceField, id, innerHTML) => {
    if (!spaceField || !id) {
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