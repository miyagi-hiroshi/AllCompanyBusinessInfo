import { relations } from "drizzle-orm";

import { jobPositions, jobTypes } from "./tables";

export const jobPositionRelations = relations(jobPositions, ({ many: _many }) => ({
  // ジョブに関連するリレーションをここに定義
}));

export const jobTypeRelations = relations(jobTypes, ({ many: _many }) => ({
  // ジョブタイプに関連するリレーションをここに定義
}));
