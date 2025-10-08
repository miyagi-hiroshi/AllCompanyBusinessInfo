import { InferModel } from "drizzle-orm";

import { userMenuPermissions, userOperationPermissions,users } from "./tables";

export type User = InferModel<typeof users>;
export type NewUser = InferModel<typeof users, "insert">;

export type UserMenuPermission = InferModel<typeof userMenuPermissions>;
export type NewUserMenuPermission = InferModel<typeof userMenuPermissions, "insert">;

export type UserOperationPermission = InferModel<typeof userOperationPermissions>;
export type NewUserOperationPermission = InferModel<typeof userOperationPermissions, "insert">;

// 権限の型定義
export type ResourceType = "employee" | "qualification" | "skill" | "career_history" | "settlement_attachment" | "bulletin_article" | "settlement_confirmation";
export type Operation = "view" | "edit" | "delete" | "create" | "link_user";
export type Scope = "own" | "all" | "view" | "none";

export interface OperationPermission {
  resourceType: ResourceType;
  operation: Operation;
  scope: Scope;
}

// 一括権限取得用の型定義
export interface AllPermissionsResponse {
  users: User[];
  menuPermissions: {
    [userId: string]: UserMenuPermission[];
  };
  operationPermissions: {
    [userId: string]: UserOperationPermission[];
  };
}

export interface UserWithPermissions {
  user: User;
  menuPermissions: UserMenuPermission[];
  operationPermissions: UserOperationPermission[];
}

// バッチ更新用の型定義
export interface MenuPermissionUpdate {
  userId: string;
  menuPath: string;
  menuName: string;
  isVisible: boolean;
}

export interface OperationPermissionUpdate {
  userId: string;
  resourceType: ResourceType;
  operation: Operation;
  scope: Scope;
}

export interface BatchPermissionUpdates {
  menuPermissions?: MenuPermissionUpdate[];
  operationPermissions?: OperationPermissionUpdate[];
} 