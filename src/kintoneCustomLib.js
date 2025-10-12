/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める

/**
 * kintoneのスペースフィールドにテキストを表示する関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - 出力する要素のID名（任意のもの）
 * @param {string} innerHTML - 表示するHTML文字列
 * @returns {void}
 * @description 指定したスペースフィールドに、指定したIDとHTML内容でテキストを表示します。既存の同ID要素があれば削除し、新たに追加します。
 */
const appendSpaceText = (spaceField, id, innerHTML) => {
    if (!spaceField || !id || !innerHTML) {
        return;
    }
    removeSpaceText(spaceField, id);
    const createSpaceFieldElement = document.createElement('div');
    createSpaceFieldElement.id = id;
    createSpaceFieldElement.innerHTML = '<div>' + innerHTML + '</div>';
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (spaceElement) {
        spaceElement.appendChild(createSpaceFieldElement);
        spaceElement.parentNode.style.display = '';
    }
    return;
};

/**
 * kintoneのスペースフィールドからテキストを削除する関数
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - 削除する要素のID名
 * @returns {void}
 * @description 指定したスペースフィールド内の、指定したIDの要素を削除し、スペースフィールドの表示を非表示にします。
 */
const removeSpaceText = (spaceField, id) => {
    if (!spaceField || !id) {
        return;
    }
    const spaceFieldElementById = document.getElementById(id);
    if (spaceFieldElementById) {
        spaceFieldElementById.remove();
    }
    const spaceFieldElement = kintone.app.record.getSpaceElement(spaceField);
    if (spaceFieldElement && spaceFieldElement.parentNode) {
        spaceFieldElement.parentNode.style.display = 'none';
    }
};