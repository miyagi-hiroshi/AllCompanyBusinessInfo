/**
 * テキスト正規化ユーティリティ
 * 半角・全角の違いを吸収するためのヘルパー関数
 */

/**
 * 文字列を正規化して比較用のキーを生成
 * 半角・全角の違いを吸収し、空白を除去
 * 
 * @param text 正規化する文字列
 * @returns 正規化された文字列
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  
  return text
    // 全角英数字を半角に変換
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    // 全角スペースを半角スペースに変換
    .replace(/\u3000/g, ' ')
    // 連続する空白を単一のスペースに変換
    .replace(/\s+/g, ' ')
    // 前後の空白を除去
    .trim()
    // 大文字小文字を統一（小文字に）
    .toLowerCase();
}

/**
 * 2つの文字列が正規化後に一致するかチェック
 * 
 * @param text1 比較する文字列1
 * @param text2 比較する文字列2
 * @returns 正規化後に一致する場合true
 */
export function isTextMatch(text1: string, text2: string): boolean {
  return normalizeText(text1) === normalizeText(text2);
}
