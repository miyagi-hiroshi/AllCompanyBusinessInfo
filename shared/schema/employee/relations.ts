import { relations } from "drizzle-orm";

import { employees } from "./tables";

export const employeeRelations = relations(employees, ({ many: _many }) => ({
  // 従業員に関連するリレーションをここに定義
}));
