/**
 * 既存システムリポジトリ
 * 
 * 責務:
 * - 既存システムのテーブルからの読み取り専用アクセス
 * - 本システムで使用するカラムのみを選択
 * - 外部キー制約なしでの参照
 */

import { departments, employees, sessions,users } from '@shared/schema/existing';
import { jobPositions, jobTypes } from '@shared/schema/job/tables';
import { and, eq, like } from 'drizzle-orm';

import { db } from '../../db';

// 既存システムのユーザー情報を取得
export async function getExistingUser(userId: string) {
  return await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    isFirstLogin: users.isFirstLogin,
  }).from(users).where(eq(users.id, userId));
}

// 既存システムのユーザー情報をメールアドレスで取得
export async function getExistingUserByEmail(email: string) {
  const result = await db.select({
    id: users.id,
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName,
    isFirstLogin: users.isFirstLogin,
    password: users.password, // パスワードハッシュを含める
  }).from(users).where(eq(users.email, email));
  
  return result[0] || null;
}

// 既存システムの従業員情報を取得（本システムで使用するカラムのみ）
export async function getExistingEmployee(employeeId: string) {
  const result = await db.select({
    id: employees.id,
    employeeId: employees.employeeId,
    userId: employees.userId,
    firstName: employees.firstName,
    lastName: employees.lastName,
    departmentId: employees.departmentId,
    status: employees.status,
  }).from(employees).where(eq(employees.employeeId, employeeId));
  
  return result[0] || null;
}

// 既存システムの従業員情報をユーザーIDで取得
export async function getExistingEmployeeByUserId(userId: string) {
  const result = await db.select({
    id: employees.id,
    employeeId: employees.employeeId,
    userId: employees.userId,
    firstName: employees.firstName,
    lastName: employees.lastName,
    departmentId: employees.departmentId,
    jobPositionLevel: jobPositions.level,
    jobTypeId: employees.jobTypeId,
    status: employees.status,
  })
  .from(employees)
  .leftJoin(jobPositions, eq(employees.jobPositionId, jobPositions.id))
  .where(eq(employees.userId, userId));
  
  return result[0] || null;
}

// 既存システムの部署情報を取得
export async function getExistingDepartment(departmentId: number) {
  const result = await db.select({
    id: departments.id,
    name: departments.name,
  }).from(departments).where(eq(departments.id, departmentId));
  
  return result[0] || null;
}

// 既存システムのセッション情報を取得
export async function getExistingSession(sessionId: string) {
  const result = await db.select({
    id: sessions.id,
    userId: sessions.userId,
    expiresAt: sessions.expiresAt,
  }).from(sessions).where(eq(sessions.id, sessionId));
  
  return result[0] || null;
}

// 既存システムのアクティブな従業員一覧を取得
export async function getActiveExistingEmployees() {
  return await db.select({
    id: employees.id,
    employeeId: employees.employeeId,
    userId: employees.userId,
    firstName: employees.firstName,
    lastName: employees.lastName,
    departmentId: employees.departmentId,
    status: employees.status,
  }).from(employees).where(eq(employees.status, 'active'));
}

// 既存システムの部署一覧を取得
export async function getExistingDepartments() {
  return await db.select({
    id: departments.id,
    name: departments.name,
  }).from(departments);
}

// エンジニア職種のアクティブな従業員一覧を取得
export async function getEngineerEmployees() {
  return await db.select({
    id: employees.id,
    employeeId: employees.employeeId,
    firstName: employees.firstName,
    lastName: employees.lastName,
    departmentId: employees.departmentId,
    status: employees.status,
  })
  .from(employees)
  .leftJoin(jobTypes, eq(employees.jobTypeId, jobTypes.id))
  .where(and(
    eq(employees.status, 'active'),
    like(jobTypes.code, '%ENGINEER%')
  ))
  .orderBy(employees.employeeId);
}
