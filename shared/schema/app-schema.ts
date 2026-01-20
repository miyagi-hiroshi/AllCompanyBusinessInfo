/**
 * アプリケーション専用スキーマ（マイグレーション用）
 * 
 * 本システムで新規作成するテーブル（appスキーマ）のみを含む。
 * 既存システムのテーブル（publicスキーマのusers, employees, departments）は含めない。
 * これにより、マイグレーション時に既存テーブルに影響を与えない。
 */

import { pgSchema } from "drizzle-orm/pg-core";

// appスキーマを定義（Drizzle Kitがスキーマを認識するために必要）
export const appSchema = pgSchema("app");

// appスキーマのテーブルのみをインポート
import * as accountingItems from "./accountingItem";
import * as angleBForecasts from "./angleBForecast";
import * as budgetsExpense from "./budgetExpense";
import * as budgetsRevenue from "./budgetRevenue";
import * as budgetsTarget from "./budgetTarget";
import * as customers from "./customer";
// existing/tables.tsからsessionsのみをインポート（appスキーマ）
import { sessions } from "./existing/tables";
import * as glEntries from "./glEntry";
import * as items from "./item";
import * as orderForecasts from "./orderForecast";
import * as projects from "./project";
import * as projectAnalysisSnapshots from "./projectAnalysisSnapshot";
import * as reconciliationLogs from "./reconciliationLog";
import * as staffing from "./staffing";

// appスキーマのテーブルのみをエクスポート
// Drizzle Kitがこのスキーマを読み取り、appスキーマのテーブルのみを認識する
export const schema = {
  // 新規業務データスキーマ（appスキーマ）
  ...customers,
  ...items,
  ...projects,
  ...accountingItems,
  ...orderForecasts,
  ...glEntries,
  ...reconciliationLogs,
  ...angleBForecasts,
  ...budgetsRevenue,
  ...budgetsExpense,
  ...budgetsTarget,
  ...staffing,
  ...projectAnalysisSnapshots,
  // sessionsテーブル（appスキーマ）
  sessions,
};
