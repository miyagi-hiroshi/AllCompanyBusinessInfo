import { pgTable, serial, varchar, date, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../user/tables';
import { departments } from '../department/tables';
import { jobPositions, jobTypes } from '../job/tables';

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeId: varchar("employee_id", { length: 20 }).notNull().unique(),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  firstNameKana: varchar("first_name_kana", { length: 50 }),
  lastNameKana: varchar("last_name_kana", { length: 50 }),
  birthDate: date("birth_date"),
  address: text("address"),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  departmentId: integer("department_id").references(() => departments.id),
  jobPositionId: integer("job_position_id").references(() => jobPositions.id),
  jobTypeId: integer("job_type_id").references(() => jobTypes.id),
  // 所属オフィス（例: fukuoka | hiroshima）
  office: varchar("office", { length: 20 }),
  hireDate: date("hire_date").notNull(),
  terminationDate: date("termination_date"),
  status: varchar("status", { length: 20 }).default("active"), // active, leave, maternity, terminated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


