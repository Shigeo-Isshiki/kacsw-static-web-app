/**
 * 国民の祝日判定・取得用ユーティリティ関数群
 *
 * @fileoverview 国民の祝日API（https://api.national-holidays.jp）を利用し、指定日が祝日かどうかを判定します。
 * @author Shigeo Isshiki <issiki@kacsw.or.jp>
 * @version 1.0.0
 */
// 関数命名ルール: 外部に見せる関数名はそのまま、内部で使用する関数名は(_nh_)で始める
/* exported getNationalHolidayName */
// リソースの読み込み制限を行っている場合は、fetch通信を下記のURLに対して許可する必要があります
// https://api.national-holidays.jp
'use strict';
// --- 外部APIエンドポイント定数 ---
/**
 * 祝日APIベースURL
 * @type {string}
 */
const _nh_HOLIDAY_API_BASE_URL = 'https://api.national-holidays.jp';
/**
 * 国民の祝日処理用の統一エラークラス
 * @class
 * @extends {Error}
 * @param {string} message エラーメッセージ
 * @param {'logic'|'ajax'|'validation'|'unknown'} [type='unknown'] エラー種別
 * @property {string} name エラー名（NationalHolidayError）
 * @property {'logic'|'ajax'|'validation'|'unknown'} type エラー種別
 * @throws {Error} 継承元Errorの例外
 * @private
 */
class _nh_FinancialInstitutionError extends Error {
  constructor(message, type = 'unknown') {
    super(message);
    this.name = 'NationalHolidayError';
    this.type = type;
  }
}

/**
 * 指定した日付が国民の祝日かどうかを判定し、祝日名またはnullをコールバックで返す（非同期）
 *
 * @function getNationalHolidayName
 * @param {string} date_str - ISO 8601拡張形式（YYYY-MM-DD）の日付文字列
 * @param {(holidayName: string|null) => void} callback - 祝日名（該当しなければnull）を返すコールバック関数
 * @returns {void}
 * @throws {_nh_FinancialInstitutionError} date_strやcallbackの型が不正な場合
 * @public
 * @example
 * getNationalHolidayName('2025-09-15', (name) => {
 *   if (name) {
 *     console.log('祝日:', name);
 *   } else {
 *     console.log('祝日ではありません');
 *   }
 * });
 *
 * @remarks
 * - 1948-07-20以前の日付は祝日判定対象外です。
 * - APIレスポンスの型チェックを行い、不正なデータは無視します。
 * - fetch通信エラーやAPI異常時は必ずnullを返します。
 */
const getNationalHolidayName = (date_str, callback) => {
  if (typeof date_str !== 'string')
    throw new _nh_FinancialInstitutionError('検索対象の日付は文字列である必要があります', 'logic');
  if (typeof callback !== 'function')
    throw new _nh_FinancialInstitutionError('コールバックは関数である必要があります', 'logic');
  if (!date_str) return callback(null);
  if (date_str < '1948-07-20') return callback(null);
  fetch(_nh_HOLIDAY_API_BASE_URL + '/' + date_str)
    .then((res) => {
      if (!res.ok) {
        throw new Error('祝日APIのレスポンスが不正です: ' + res.status);
      }
      return res.json();
    })
    .then((result) => {
      // 祝日でない場合 { error: "not_found" }
      if (result && typeof result === 'object') {
        if (result.error === 'not_found') {
          callback(null);
          return;
        }
        if (typeof result.date === 'string' && typeof result.name === 'string') {
          callback(result.name);
          return;
        }
      }
      // それ以外はnull
      callback(null);
    })
    .catch((_err) => {
      // 通信エラーやAPI異常時も必ずnullで抜ける
      callback(null);
    });
};

// 公開（kintone から直接呼ばれるため）
if (typeof window !== 'undefined') {
  window.getNationalHolidayName = getNationalHolidayName;
}
