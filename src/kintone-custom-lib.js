/** kintone内でよく使われる処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_kc_)で始める
/* exported notifyError, getFieldValueOr, kintoneEventOn, notifyInfo, notifyWarning, setRecordValues, setSpaceFieldButton, setSpaceFieldText */

// 共通定数
/**
 * ダイアログ表示の際に使用するアイコンが格納されている URLのベースパス
 * @constant {string} _KC_ASSET_BASE - アイコン画像のベースURL
 */
const _KC_ASSET_BASE = 'https://js.kacsw.or.jp/image';

// 内部関数
/**
 * HTML文字列をサニタイズして安全な HTML を返します。
 * - フォールバックとして script 要素や on* 属性、javascript: URL を除去します。
 * - 最終的に失敗した場合はエスケープしたプレーンテキストを返します。
 *
 * @param {string} html サニタイズ対象の HTML 文字列（null/非文字列でも許容し String() で扱います）
 * @returns {string} サニタイズ済の HTML 文字列
 */
const _kc_sanitizeHtml = (html) => {
  // フォールバック: 単純なサニタイズ（スクリプトタグ除去・on* 属性除去）
  // 完全な保護を約束するものではありません
  try {
    const template = document.createElement('template');
    template.innerHTML = html;
    // remove script elements
    const scripts = template.content.querySelectorAll('script');
    scripts.forEach((s) => s.remove());
    // remove on* attributes
    const walker = document.createTreeWalker(
      template.content,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    let node = walker.nextNode();
    while (node) {
      [...node.attributes].forEach((attr) => {
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
  } catch {
    // 最後の手段: プレーンテキストにして挿入
    const tmp = document.createElement('div');
    tmp.textContent = html;
    return tmp.innerHTML;
  }
};

/**
 * 内部: ダイアログ作成＆表示の共通ロジック
 * options: {
 *   title: string,
 *   body: HTMLElement,
 * }
 */
const _kc_showDialog = (options) => {
  if (!options || typeof options !== 'object') return;
  const { title, body } = options;
  const config = {
    title: String(title || ''),
    body: body,
    showOkButton: true,
    okButtonText: '閉じる',
    showCancelButton: false,
    cancelButtonText: '',
    showCloseButton: false,
    beforeClose: () => {
      return;
    },
  };

  try {
    const dialog = kintone.createDialog && kintone.createDialog(config);
    const setOkAriaLabel = (dialogObj) => {
      try {
        const container = dialogObj.element || dialogObj.dialog || dialogObj.container || null;
        if (container) {
          const okBtn = container.querySelector('button.kintone-dialog-ok-button, button');
          if (okBtn) {
            okBtn.setAttribute('aria-label', '閉じる');
          }
        }
      } catch {
        // noop
      }
    };
    if (dialog && typeof dialog.then === 'function') {
      dialog
        .then((object) => {
          try {
            object.show();
          } catch {}
          setOkAriaLabel(object);
        })
        .catch((error) => console.error('ダイアログ表示中にエラー:', error));
    } else if (dialog && typeof dialog.show === 'function') {
      dialog.show();
      setOkAriaLabel(dialog);
    }
  } catch (error) {
    console.error('_kc_showDialog error', error);
    try {
      alert(body && body.textContent ? body.textContent : String(title));
    } catch {
      /* noop */
    }
  }
};

// 公開: kintone 側から直接呼び出すための公開はファイル末尾で行います。

// ここから外部に公開する関数群
/**
 * エラーをユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyInfo/notifyWarning と同様に共通ロジックを利用します。
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
  errorImage.src = _KC_ASSET_BASE + '/error-icon.png';
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
  const messageId = 'kc-notify-error__message-' + Math.random().toString(36).slice(2, 8);
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
  // 共通処理でダイアログ表示
  _kc_showDialog({ title, body });
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
    const field = Object.prototype.hasOwnProperty.call(record, fieldCode)
      ? record[fieldCode]
      : undefined;
    if (!field || typeof field !== 'object') {
      return defaultValue;
    }
    // value が存在する場合はそのまま返す（null や空文字も有効値として返す）
    if (Object.prototype.hasOwnProperty.call(field, 'value')) {
      return field.value;
    }
    return defaultValue;
  } catch (error) {
    console.error('getFieldValueOr: unexpected error', {
      error,
      record,
      fieldCode,
    });
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
  const isValidEvents =
    typeof events === 'string' ||
    (Array.isArray(events) && events.every((e) => typeof e === 'string'));
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
        try {
          notifyError(
            'システムエラーが発生しました。詳細はコンソールを確認してください。',
            undefined,
            true
          );
        } catch {}
        return event;
      }
    });
    return true;
  } catch (error) {
    console.error('kintoneEventOn: failed to register events', {
      events,
      error,
    });
    return false;
  }
};

/**
 * 情報をユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyError/notifyWarning と同様に共通ロジックを利用します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='情報'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {void}
 */
const notifyInfo = (message, title = '情報', allowHtml = false) => {
  const body = document.createElement('div');
  body.className = 'kc-notify-info';
  body.setAttribute('role', 'alertdialog');
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.gap = '1em';
  body.style.margin = '1em';

  const infoImage = document.createElement('img');
  infoImage.src = _KC_ASSET_BASE + '/info-icon.png';
  infoImage.alt = '情報アイコン';
  infoImage.style.width = '32px';
  infoImage.style.height = '32px';
  infoImage.setAttribute('aria-hidden', 'true');
  body.appendChild(infoImage);

  const infoText = document.createElement('div');
  infoText.setAttribute('role', 'status');
  infoText.setAttribute('aria-live', 'polite');
  infoText.className = 'kc-notify-info__message';
  const messageId = 'kc-notify-info__message-' + Math.random().toString(36).slice(2, 8);
  infoText.id = messageId;
  if (allowHtml) {
    infoText.innerHTML = _kc_sanitizeHtml(message);
  } else {
    infoText.textContent = String(message);
  }
  body.appendChild(infoText);
  body.setAttribute('aria-label', String(title));
  body.setAttribute('aria-describedby', messageId);

  _kc_showDialog({ title, body });
};

/**
 * 注意をユーザーに通知するダイアログを表示します。
 * - kintone.createDialog を使ってカスタムダイアログを表示します。
 * - allowHtml が true のときのみ message を HTML として挿入（サニタイズあり）、
 *   デフォルトはプレーンテキストとして表示します。
 * - notifyError/notifyWarning と同様に共通ロジックを利用します。
 *
 * @param {string|Node} message 表示するメッセージ（文字列が想定）。Node を渡す場合はそのまま挿入されます。
 * @param {string} [title='注意'] ダイアログのタイトル
 * @param {boolean} [allowHtml=false] メッセージを HTML として挿入するか（サニタイズされます）
 * @returns {void}
 */
const notifyWarning = (message, title = '注意', allowHtml = false) => {
  const body = document.createElement('div');
  body.className = 'kc-notify-warning';
  body.setAttribute('role', 'alertdialog');
  body.style.display = 'flex';
  body.style.alignItems = 'center';
  body.style.gap = '1em';
  body.style.margin = '1em';

  const warnImage = document.createElement('img');
  warnImage.src = _KC_ASSET_BASE + '/warning-icon.png';
  warnImage.alt = '注意アイコン';
  warnImage.style.width = '32px';
  warnImage.style.height = '32px';
  warnImage.setAttribute('aria-hidden', 'true');
  body.appendChild(warnImage);

  const warnText = document.createElement('div');
  warnText.setAttribute('role', 'status');
  warnText.setAttribute('aria-live', 'polite');
  warnText.className = 'kc-notify-warning__message';
  const messageId = 'kc-notify-warning__message-' + Math.random().toString(36).slice(2, 8);
  warnText.id = messageId;
  if (allowHtml) {
    warnText.innerHTML = _kc_sanitizeHtml(message);
  } else {
    warnText.textContent = String(message);
  }
  body.appendChild(warnText);
  body.setAttribute('aria-label', String(title));
  body.setAttribute('aria-describedby', messageId);
  // 共通処理でダイアログ表示
  _kc_showDialog({ title, body });
};

/**
 * setRecordValues - record の複数フィールドに対して値を一括設定するユーティリティ
 * - 引数チェックを行い、成功時は true、失敗時は false を返します。
 * @param {Object} record 各フィールドの値（kintone の record オブジェクト想定）
 * @param {Object} values 設定するフィールド値のオブジェクト（キーがフィールドコード、値が設定値）
 * @returns {boolean} 成功したら true、入力が不正な場合は false
 */
const setRecordValues = (record, values) => {
  if (
    typeof record !== 'object' ||
    record === null ||
    Array.isArray(record) ||
    typeof values !== 'object' ||
    values === null
  ) {
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
    console.warn('setSpaceFieldDisplay: invalid arguments', {
      spaceField,
      display,
    });
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
    typeof spaceField !== 'string' ||
    !spaceField.trim() ||
    typeof id !== 'string' ||
    !id.trim() ||
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
    typeof spaceField !== 'string' ||
    !spaceField.trim() ||
    typeof id !== 'string' ||
    !id.trim() ||
    (innerHTML !== null && typeof innerHTML !== 'string')
  ) {
    console.warn('setSpaceFieldText: invalid arguments', {
      spaceField,
      id,
      innerHTML,
    });
    return false;
  }
  // 既存要素削除
  const spaceFieldElementById = document.getElementById(id);
  if (spaceFieldElementById) {
    spaceFieldElementById.remove();
  }
  if (innerHTML) {
    // 表示
    // createElement を関数化してリトライ時にも使えるようにする
    const createSpaceFieldElement = () => {
      const el = document.createElement('div');
      el.id = id;
      // innerHTML は HTML 形式での入力が想定されるため、可能な限りサニタイズしてから挿入する
      el.innerHTML = _kc_sanitizeHtml(innerHTML);
      return el;
    };

    // 初回アタック（同期的に試す）
    let appended = false;
    try {
      const spaceElement = kintone.app.record.getSpaceElement(spaceField);
      if (spaceElement) {
        // 既に同 id の要素がある場合は削除してから追加
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        spaceElement.appendChild(createSpaceFieldElement());
        appended = true;
        // 表示を許可
        setSpaceFieldDisplay(spaceField, true);
      } else {
        // do nothing here; we'll retry below
      }
    } catch {
      // ignore and let retry handle it
      appended = false;
    }

    // 非同期リトライ: 一時的な早すぎる実行や別処理による上書きを数回の試行で修復する
    // ※ 即時の戻り値は従来通り同期的な成功/失敗を返します（破壊的変更を避ける）
    const startRetryLoop = () => {
      // exponential backoff style intervals for faster initial response
      const intervals = [50, 100, 200, 400, 800]; // ms
      let idx = 0;
      const tryOnce = () => {
        // 要素が既に存在すれば成功とみなして終了
        if (document.getElementById(id)) {
          return;
        }
        // スペース要素が利用可能であれば追加を試みる
        try {
          const se = kintone.app.record.getSpaceElement(spaceField);
          if (se) {
            if (!document.getElementById(id)) {
              se.appendChild(createSpaceFieldElement());
              setSpaceFieldDisplay(spaceField, true);
            }
            return;
          }
        } catch {
          // ignore and will retry
        }
        // schedule next attempt if available
        if (idx < intervals.length) {
          const wait = intervals[idx++];
          setTimeout(tryOnce, wait);
        }
      };

      // kick off immediately (non-blocking)
      setTimeout(tryOnce, 0);
    };
    // 実行
    startRetryLoop();

    return appended;
  } else {
    // 非表示
    return setSpaceFieldDisplay(spaceField, false);
  }
};

// 公開: kintone 側から直接呼び出すためにグローバルに割り当てる（初期化後に安全に行う）
if (typeof window !== 'undefined') {
  try {
    window.notifyError = typeof notifyError !== 'undefined' ? notifyError : undefined;
  } catch {}
  try {
    window.getFieldValueOr = typeof getFieldValueOr !== 'undefined' ? getFieldValueOr : undefined;
  } catch {}
  try {
    window.kintoneEventOn = typeof kintoneEventOn !== 'undefined' ? kintoneEventOn : undefined;
  } catch {}
  try {
    window.notifyInfo = typeof notifyInfo !== 'undefined' ? notifyInfo : undefined;
  } catch {}
  try {
    window.notifyWarning = typeof notifyWarning !== 'undefined' ? notifyWarning : undefined;
  } catch {}
  try {
    window.setRecordValues = typeof setRecordValues !== 'undefined' ? setRecordValues : undefined;
  } catch {}
  try {
    window.setSpaceFieldButton =
      typeof setSpaceFieldButton !== 'undefined' ? setSpaceFieldButton : undefined;
  } catch {}
  try {
    window.setSpaceFieldText =
      typeof setSpaceFieldText !== 'undefined' ? setSpaceFieldText : undefined;
  } catch {}
}
