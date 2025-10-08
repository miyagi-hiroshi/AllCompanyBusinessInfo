import { relations } from "drizzle-orm";

import { accountingItems } from "../accountingItem/tables";
import { customers } from "../customer/tables";
import { glEntries } from "../glEntry/tables";
import { items } from "../item/tables";
import { orderForecasts } from "../orderForecast/tables";
import { projects } from "../project/tables";
import { reconciliationLogs } from "../reconciliationLog/tables";

// 業務データのリレーション定義
export const customersRelations = relations(customers, ({ many }) => ({
  projects: many(projects),
  orderForecasts: many(orderForecasts),
}));

export const itemsRelations = relations(items, ({ many: _many }) => ({
  // 品目マスタのリレーション（必要に応じて追加）
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  customer: one(customers, {
    fields: [projects.customerId],
    references: [customers.id],
  }),
  orderForecasts: many(orderForecasts),
}));

export const accountingItemsRelations = relations(accountingItems, ({ many }) => ({
  orderForecasts: many(orderForecasts),
  glEntries: many(glEntries),
}));

export const orderForecastsRelations = relations(orderForecasts, ({ one }) => ({
  project: one(projects, {
    fields: [orderForecasts.projectId],
    references: [projects.id],
  }),
  customer: one(customers, {
    fields: [orderForecasts.customerId],
    references: [customers.id],
  }),
  accountingItem: one(accountingItems, {
    fields: [orderForecasts.accountingItem],
    references: [accountingItems.code],
  }),
  matchedGlEntry: one(glEntries, {
    fields: [orderForecasts.glMatchId],
    references: [glEntries.id],
  }),
}));

export const glEntriesRelations = relations(glEntries, ({ one }) => ({
  accountingItem: one(accountingItems, {
    fields: [glEntries.accountCode],
    references: [accountingItems.code],
  }),
  matchedOrderForecast: one(orderForecasts, {
    fields: [glEntries.orderMatchId],
    references: [orderForecasts.id],
  }),
}));

export const reconciliationLogsRelations = relations(reconciliationLogs, ({ many: _many }) => ({
  // 突合ログのリレーション（必要に応じて追加）
}));
