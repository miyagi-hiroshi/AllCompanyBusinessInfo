/**
 * 計上科目の表示順序を定義するファイル
 * 指定された順序で計上科目を表示するためのヘルパー関数
 */

// 計上科目の表示順序（コード順）
export const ACCOUNTING_ITEM_ORDER = [
  '511', // 保守売上
  '512', // ソフト売上
  '513', // 商品売上
  '514', // 消耗品売上
  '541', // 仕入高
  '515', // その他売上
  '727', // 通信費
  '737', // 消耗品費
  '740', // 支払保守料
  '745', // 外注加工費
  '1100', // 期首製品棚卸高
  '1200', // 期首商品棚卸高
  '1300', // 期末製品棚卸高
  '1400', // 期末商品棚卸高
  '9999', // その他調整経費
];

/**
 * 計上科目の配列を指定された順序でソートする
 * @param accountingItems 計上科目の配列
 * @returns ソートされた計上科目の配列
 */
export function sortAccountingItemsByOrder<T extends { code: string }>(accountingItems: T[]): T[] {
  return [...accountingItems].sort((a, b) => {
    const indexA = ACCOUNTING_ITEM_ORDER.indexOf(a.code);
    const indexB = ACCOUNTING_ITEM_ORDER.indexOf(b.code);
    
    // 両方とも順序に含まれている場合
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // 一方のみ順序に含まれている場合、含まれている方を前に
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // 両方とも順序に含まれていない場合、コード順でソート
    return a.code.localeCompare(b.code);
  });
}
