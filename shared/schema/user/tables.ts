import { pgTable, varchar, timestamp, serial, boolean } from 'drizzle-orm/pg-core';

// User storage table
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

// User menu permissions table
export const userMenuPermissions = pgTable("user_menu_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  menuPath: varchar("menu_path").notNull(), // メニューのパス（例: /employees, /skills）
  menuName: varchar("menu_name").notNull(), // メニュー名（例: 従業員一覧, スキル管理）
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User operation permissions table
export const userOperationPermissions = pgTable("user_operation_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  resourceType: varchar("resource_type").notNull(), // 'employee', 'qualification', 'skill', 'career_history'
  operation: varchar("operation").notNull(), // 'view', 'edit', 'delete', 'create', 'link_user'
  scope: varchar("scope").notNull().default('own'), // 'own', 'all', 'view', 'none'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
