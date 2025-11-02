/** 郵便番号や電話番号処理を除いた運送会社に関する処理をまとめたJavaScriptの関数群です。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_sp_)で始める
/* exported getNextBusinessDay, kintoneShippingInquiryButton, validateTrackingNumber */
'use strict';
//　ライブラリ内の共通定数・変換テーブル定義部
// 祝日APIベースURL
const _SP_HOLIDAY_API_BASE_URL = 'https://api.national-holidays.jp';

// 運送会社ごとの問い合わせURLテンプレート
const _SP_SHIPPING_INQUIRY_URL_MAP = {
  yamato: 'https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno={trackingNumber}', // ヤマト運輸
  japanpost:
    'https://trackings.post.japanpost.jp/services/srv/search/direct?searchKind=S002&locale=ja&reqCodeNo1={trackingNumber}', // 日本郵便
};

// ハイフン類を検出するための正規表現（全角・半角・ダッシュ類）
const _SP_HYPHEN_REGEX = /[－‐‑–—−ー―]/g;

//　ライブラリ内の共通関数定義部
/**
 * 文字列が文字列型であることを確認する関数
 * @param {*} str 確認する文字列
 * @returns {boolean} 文字列である = true、文字でない = false
 */
const _sp_checkString = (str) => {
  return typeof str === 'string';
};

/**
 * boolean型であることを確認する関数
 * @param {*} val 確認する値
 * @returns {boolean} boolean型である = true、そうでない = false
 */
// _sp_checkBoolean は内部ユーティリティで、外部公開は行いません

/**
 * 指定された日付が国民の祝日かどうかをWebAPIで判定する内部関数（コールバック形式）
 * @param {Date} date 判定対象の日付
 * @param {(isHoliday: boolean) => void} callback 判定結果を返すコールバック関数
 * @returns {void}
 */
const _sp_isNationalHolidayCallback = (date, callback) => {
  // 1948年7月20日以前は祝日法制定前なので対象外
  if (date < new Date(1948, 6, 20)) {
    callback(false);
    return;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  fetch(`${_SP_HOLIDAY_API_BASE_URL}/${dateStr}`)
    .then((response) => {
      if (!response.ok) {
        // 404などのエラーは祝日でないことを意味する
        callback(false);
        return;
      }
      return response.json();
    })
    .then((result) => {
      // 祝日でない場合 { error: "not_found" }
      if (result && typeof result === 'object') {
        if (result.error === 'not_found') {
          callback(false);
          return;
        }
        // 祝日の場合 { date: "2025-01-01", name: "元日" }
        if (typeof result.date === 'string' && typeof result.name === 'string') {
          callback(true);
          return;
        }
      }
      callback(false);
    })
    .catch((_error) => {
      // 通信エラーやAPI異常時は祝日でないものとして扱う
      callback(false);
    });
};

/**
 * 指定された日付が営業日（土日・祝日・年末年始を除く平日）かどうかを判定する内部関数（コールバック形式）
 * @param {Date} date 判定対象の日付
 * @param {(isBusinessDay: boolean) => void} callback 判定結果を返すコールバック関数
 * @returns {void}
 */
const _sp_isBusinessDayCallback = (date, callback) => {
  const dayOfWeek = date.getDay(); // 0=日曜日, 6=土曜日
  const month = date.getMonth() + 1; // 1-12月
  const day = date.getDate();

  // 土曜日または日曜日は営業日ではない
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    callback(false);
    return;
  }

  // 年末年始（12月29日〜1月4日）は営業日ではない
  if ((month === 12 && day >= 29) || (month === 1 && day <= 4)) {
    callback(false);
    return;
  }

  // 国民の祝日は営業日ではない
  _sp_isNationalHolidayCallback(date, (isHoliday) => {
    if (isHoliday) {
      callback(false);
    } else {
      callback(true);
    }
  });
};

//　ライブラリ本体部
/**
 * 発送日として適切な営業日を取得する関数（コールバック形式）
 * 土曜日、日曜日、国民の祝日、年末年始（12月29日～1月4日）を除いた営業日を返す
 * cutoffHour以降の場合は翌営業日を返す（省略時は16時）
 * @param {Date|string} [baseDate=new Date()] 基準日時（省略時は現在日時、kintoneの日付・日時フィールド形式にも対応）
 * @param {number} [cutoffHour=16] 締め時刻（省略時は16）
 * @param {(businessDay: string) => void} callback 発送可能な営業日（YYYY-MM-DD形式）を返すコールバック関数
 * @returns {void}
 * @throws {Error} 不正な日付の場合は例外
 */
const getNextBusinessDay = (baseDate = new Date(), cutoffHour = 16, callback) => {
  if (typeof callback !== 'function') {
    throw new Error('callback は関数である必要があります');
  }
  // cutoffHourが文字列の場合も数値化して判定
  const cutoffHourNum = Number(cutoffHour);
  if (!Number.isInteger(cutoffHourNum) || cutoffHourNum < 0 || cutoffHourNum > 23) {
    throw new Error('締め時刻は0～23の整数である必要があります');
  }
  let targetDate;
  let hasTimeInfo = false;
  // 文字列の場合はDateオブジェクトに変換
  if (typeof baseDate === 'string') {
    targetDate = new Date(baseDate);
    // 文字列に時刻情報が含まれているか判定（"T"や空白区切りで時刻がある場合）
    hasTimeInfo = /T\d{2}:\d{2}|\d{2}:\d{2}/.test(baseDate);
  } else if (baseDate instanceof Date) {
    targetDate = new Date(baseDate);
    // Date型で時刻が0:0:0以外なら時刻情報あり
    hasTimeInfo =
      targetDate.getHours() !== 0 || targetDate.getMinutes() !== 0 || targetDate.getSeconds() !== 0;
  } else {
    throw new Error('基準日時は日付文字列、またはDate型である必要があります');
  }
  // 有効な日付かチェック
  if (isNaN(targetDate.getTime())) {
    throw new Error('基準日時は有効な日付である必要があります');
  }
  // 時刻情報がある場合のみcutoffHour判定
  if (hasTimeInfo && targetDate.getHours() >= cutoffHourNum) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  // 営業日を探す再帰関数
  const findBusinessDay = () => {
    _sp_isBusinessDayCallback(targetDate, (isBusinessDay) => {
      if (isBusinessDay) {
        // 営業日が見つかったので結果を返す
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const day = String(targetDate.getDate()).padStart(2, '0');
        callback(`${year}-${month}-${day}`);
      } else {
        // 営業日でない場合は翌日をチェック
        targetDate.setDate(targetDate.getDate() + 1);
        findBusinessDay();
      }
    });
  };
  findBusinessDay();
};

/**
 * kintoneのスペースフィールドに荷物問い合わせボタンを追加・削除する関数
 *
 * @function
 * @param {string} spaceField - スペースフィールドのフィールドコード
 * @param {string} id - ボタン要素のID名（任意のもの）
 * @param {string|undefined|null} label - ボタンラベル（省略時はデフォルト文言）
 *   - 文字列: 指定ラベル
 *   - undefined: デフォルト文言（例: '荷物問い合わせ'）
 *   - null/空文字: ボタン非表示（削除）
 * @param {string} trackingNumber - 問い合わせ番号（伝票番号）
 * @param {('yamato'|'japanpost')} carrier - 運送会社（'yamato'または'japanpost'）
 * @returns {void}
 * @description labelの値により表示制御：
 *   - 文字列なら指定ラベルで表示
 *   - undefinedならデフォルト文言で表示
 *   - null/空文字ならボタン非表示（削除）
 *   ボタン押下時、公式サイト（ヤマト運輸・日本郵便）に遷移します。
 */
const kintoneShippingInquiryButton = (spaceField, id, label, trackingNumber, carrier) => {
  if (
    typeof spaceField !== 'string' ||
    !spaceField.trim() ||
    typeof id !== 'string' ||
    !id.trim() ||
    (label !== null && typeof label !== 'string') ||
    (carrier !== null && typeof carrier !== 'string')
  ) {
    return;
  }
  // 既存ボタン削除
  const buttonElementById = document.getElementById(id);
  if (buttonElementById) {
    buttonElementById.remove();
  }
  // URL生成関数
  const getInquiryUrl = (carrier, trackingNumber) => {
    const template = _SP_SHIPPING_INQUIRY_URL_MAP[carrier];
    if (!template) return '';
    return template.replace('{trackingNumber}', encodeURIComponent(trackingNumber));
  };
  let textContent = '';
  if (label !== undefined && label !== null && label !== '') {
    textContent = label;
  } else if (label === undefined) {
    // デフォルト文言
    textContent = '荷物問い合わせ';
  }
  if (textContent === '' || !trackingNumber || !carrier) {
    // 非表示
    const spaceElement = kintone.app.record.getSpaceElement(spaceField);
    if (spaceElement && spaceElement.parentNode) {
      spaceElement.parentNode.style.display = 'none';
    }
    return;
  }
  // ボタン追加
  const button = document.createElement('button');
  button.id = id;
  button.textContent = textContent;
  button.addEventListener('click', () => {
    const url = getInquiryUrl(carrier, trackingNumber);
    if (url) window.open(url, '_blank');
  });
  const spaceElement = kintone.app.record.getSpaceElement(spaceField);
  if (spaceElement) {
    spaceElement.appendChild(button);
    spaceElement.parentNode.style.display = '';
  }
  return;
};

/**
 * 運送会社の伝票番号を半角数字のみに変換し、正しい形式かどうかを判定する関数
 * 全角・半角を問わず数字とハイフン・空白を許容し、最終的に半角数字のみの形式に変換する
 * 日本郵便・ヤマト運輸・佐川急便の伝票番号形式に対応
 * @param {string} trackingNumber チェック対象の伝票番号
 * @param {number} [minLength=10] 最小桁数（省略時は10桁、日本の主要3社対応）
 * @param {number} [maxLength=14] 最大桁数（省略時は14桁、日本の主要3社対応）
 * @returns {string} 変換後の伝票番号（半角数字のみ）
 * @throws {Error} 不正な場合は例外
 */
const validateTrackingNumber = (trackingNumber, minLength = 10, maxLength = 14) => {
  if (!_sp_checkString(trackingNumber)) throw new Error('伝票番号は文字列である必要があります');
  if (!Number.isInteger(minLength) || minLength < 1)
    throw new Error('最小桁数は1以上の整数である必要があります');
  if (!Number.isInteger(maxLength) || maxLength < minLength)
    throw new Error('最大桁数は最小桁数以上の整数である必要があります');
  if (!trackingNumber.trim()) throw new Error('伝票番号が空です');
  // ハイフン類を統一し、全角文字を半角に変換
  let processed = trackingNumber.replace(_SP_HYPHEN_REGEX, '-');
  processed = processed.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));
  processed = processed.replace(/\u3000/g, ' '); // 全角スペースを半角に
  // タブ・改行・復帰コードなども半角スペースに統一
  processed = processed.replace(/[\t\n\r]/g, ' ');
  // 半角数字・ハイフン・空白以外が含まれていればエラー
  if (!/^[0-9\- ]+$/.test(processed)) {
    const invalid = processed.match(/[^0-9\- ]/)[0];
    throw new Error(`伝票番号には半角数字・ハイフン・空白のみ許容されます。不正な文字: ${invalid}`);
  }
  // ハイフンと空白を除去して数字のみにする
  const digitsOnly = processed.replace(/[\- ]/g, '');
  // 桁数チェック
  if (digitsOnly.length < minLength || digitsOnly.length > maxLength) {
    throw new Error(
      `伝票番号は${minLength}桁以上${maxLength}桁以下の数字である必要があります（現在: ${digitsOnly.length}桁）`
    );
  }
  return digitsOnly;
};

// 公開
if (typeof window !== 'undefined') {
  window.getNextBusinessDay = getNextBusinessDay;
  window.kintoneShippingInquiryButton = kintoneShippingInquiryButton;
  window.validateTrackingNumber = validateTrackingNumber;
}

// shipping-processing の内部ユーティリティは非公開化しました
