import { relations } from "drizzle-orm";

import { departments } from "./tables";

export const departmentRelations = relations(departments, ({ many: _many }) => ({
  // 部署に関連するリレーションをここに定義
}));
