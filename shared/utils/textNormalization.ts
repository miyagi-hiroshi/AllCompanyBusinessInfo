/**
 * 半角カナを全角カナに変換
 * @param text 変換する文字列
 * @returns 全角カナに変換された文字列
 */
export function convertHalfWidthKanaToFullWidth(text: string): string {
  if (!text) return "";

  return text.replace(/[\uFF65-\uFF9F]/g, (s) => {
    const code = s.charCodeAt(0);
    const hankanaMap: { [key: number]: string } = {
      0xff65: "・",
      0xff66: "・",
      0xff67: "ァ",
      0xff68: "ィ",
      0xff69: "ゥ",
      0xff6a: "ェ",
      0xff6b: "ォ",
      0xff6c: "ャ",
      0xff6d: "ュ",
      0xff6e: "ョ",
      0xff6f: "ッ",
      0xff70: "ー",
      0xff71: "ア",
      0xff72: "イ",
      0xff73: "ウ",
      0xff74: "エ",
      0xff75: "オ",
      0xff76: "カ",
      0xff77: "キ",
      0xff78: "ク",
      0xff79: "ケ",
      0xff7a: "コ",
      0xff7b: "サ",
      0xff7c: "シ",
      0xff7d: "ス",
      0xff7e: "セ",
      0xff7f: "ソ",
      0xff80: "タ",
      0xff81: "チ",
      0xff82: "ツ",
      0xff83: "テ",
      0xff84: "ト",
      0xff85: "ナ",
      0xff86: "ニ",
      0xff87: "ヌ",
      0xff88: "ネ",
      0xff89: "ノ",
      0xff8a: "ハ",
      0xff8b: "ヒ",
      0xff8c: "フ",
      0xff8d: "ヘ",
      0xff8e: "ホ",
      0xff8f: "マ",
      0xff90: "ミ",
      0xff91: "ム",
      0xff92: "メ",
      0xff93: "モ",
      0xff94: "ヤ",
      0xff95: "ユ",
      0xff96: "ヨ",
      0xff97: "ラ",
      0xff98: "リ",
      0xff99: "ル",
      0xff9a: "レ",
      0xff9b: "ロ",
      0xff9c: "ワ",
      0xff9d: "ヲ",
      0xff9e: "ン",
      0xff9f: "ヴ",
    };
    return hankanaMap[code] || s;
  });
}
