/**
 * 会計項目マスタに関する型定義
 */

export interface AccountingItemFilter {
  search?: string;
  code?: string;
  name?: string;
}

export interface AccountingItemSearchOptions {
  filter?: AccountingItemFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'code' | 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
