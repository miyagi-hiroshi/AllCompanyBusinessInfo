/**
 * 既存システムのテーブル定義（参照専用）
 * 
 * 注意: これらのテーブルは既存システムで管理されており、
 * 本システムでは読み取り専用として使用します。
 * 外部キー制約は設定せず、文字列参照のみで関連付けます。
 */

import { pgTable, varchar, timestamp, serial, boolean, integer, date, text } from 'drizzle-orm/pg-core';

// 既存システムのユーザーテーブル（参照専用）
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isFirstLogin: boolean("is_first_login").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 既存システムの従業員テーブル（参照専用）
// 本システムで使用するカラムのみ定義
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 20 }).notNull().unique(),
  userId: varchar("user_id"), // 外部キー制約なし
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  departmentId: integer("department_id"), // 外部キー制約なし
  status: varchar("status", { length: 20 }).default("active"),
});

// 既存システムの部署テーブル（参照専用）
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 既存システムのセッションテーブル（参照専用）
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull(), // 外部キー制約なし
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
