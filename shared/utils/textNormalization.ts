/**
 * 半角カナを全角カナに変換
 * @param text 変換する文字列
 * @returns 全角カナに変換された文字列
 */
export function convertHalfWidthKanaToFullWidth(text: string): string {
  if (!text) return '';
  
  return text.replace(/[\uFF65-\uFF9F]/g, (s) => {
    const code = s.charCodeAt(0);
    const hankanaMap: { [key: number]: string } = {
      0xFF65: '・', 0xFF66: '・', 0xFF67: 'ァ', 0xFF68: 'ィ', 0xFF69: 'ゥ', 0xFF6A: 'ェ', 0xFF6B: 'ォ',
      0xFF6C: 'ャ', 0xFF6D: 'ュ', 0xFF6E: 'ョ', 0xFF6F: 'ッ', 0xFF70: 'ー', 0xFF71: 'ア', 0xFF72: 'イ',
      0xFF73: 'ウ', 0xFF74: 'エ', 0xFF75: 'オ', 0xFF76: 'カ', 0xFF77: 'キ', 0xFF78: 'ク', 0xFF79: 'ケ',
      0xFF7A: 'コ', 0xFF7B: 'サ', 0xFF7C: 'シ', 0xFF7D: 'ス', 0xFF7E: 'セ', 0xFF7F: 'ソ', 0xFF80: 'タ',
      0xFF81: 'チ', 0xFF82: 'ツ', 0xFF83: 'テ', 0xFF84: 'ト', 0xFF85: 'ナ', 0xFF86: 'ニ', 0xFF87: 'ヌ',
      0xFF88: 'ネ', 0xFF89: 'ノ', 0xFF8A: 'ハ', 0xFF8B: 'ヒ', 0xFF8C: 'フ', 0xFF8D: 'ヘ', 0xFF8E: 'ホ',
      0xFF8F: 'マ', 0xFF90: 'ミ', 0xFF91: 'ム', 0xFF92: 'メ', 0xFF93: 'モ', 0xFF94: 'ヤ', 0xFF95: 'ユ',
      0xFF96: 'ヨ', 0xFF97: 'ラ', 0xFF98: 'リ', 0xFF99: 'ル', 0xFF9A: 'レ', 0xFF9B: 'ロ', 0xFF9C: 'ワ',
      0xFF9D: 'ヲ', 0xFF9E: 'ン', 0xFF9F: 'ヴ'
    };
    return hankanaMap[code] || s;
  });
}

