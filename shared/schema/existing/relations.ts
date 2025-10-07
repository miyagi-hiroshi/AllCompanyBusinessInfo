import { relations } from 'drizzle-orm';
import { users, employees, departments, sessions } from './tables';

// 既存システムのリレーション定義（参照専用、外部キー制約なし）
export const existingUsersRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.id],
    references: [employees.userId],
  }),
  sessions: many(sessions),
}));

export const existingEmployeesRelations = relations(employees, ({ one }) => ({
  user: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
}));

export const existingDepartmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
}));

export const existingSessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
