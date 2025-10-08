/**
 * アプリケーション専用スキーマ
 * 
 * 本システムで新規作成するテーブルのみを含む。
 * 既存システムのテーブル（users, employees, departments, sessions）は含めない。
 * これにより、マイグレーション時に既存テーブルに影響を与えない。
 */

import { pgSchema } from "drizzle-orm/pg-core";

// 本システム専用のスキーマを作成
export const appSchema = pgSchema("app");

// 既存システムのテーブルは含めない
// - users, employees, departments, sessions は既存システムで管理
