/**
 * アイテムマスタに関する型定義
 */

export interface ItemFilter {
  search?: string;
  code?: string;
  name?: string;
  category?: string;
}

export interface ItemSearchOptions {
  filter?: ItemFilter;
  limit?: number;
  offset?: number;
  sortBy?: 'code' | 'name' | 'category' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
