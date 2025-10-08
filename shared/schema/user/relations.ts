import { relations } from "drizzle-orm";

import { users } from "./tables";

export const userRelations = relations(users, ({ many: _many }) => ({
  // ユーザーに関連するリレーションをここに定義
}));
