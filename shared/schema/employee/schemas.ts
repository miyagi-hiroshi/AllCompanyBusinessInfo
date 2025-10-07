import { z } from 'zod';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { employees } from './tables';

// Employees
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertEmployeeSchema = createInsertSchema(employees);
export type Employee = z.infer<typeof selectEmployeeSchema>;
export type NewEmployee = z.infer<typeof insertEmployeeSchema>;
