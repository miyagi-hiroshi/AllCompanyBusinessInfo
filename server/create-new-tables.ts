/**
 * 新規テーブル作成スクリプト
 * 角度B案件、予算管理、配員計画のテーブルを作成
 */

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

async function createNewTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("新規テーブルを作成中...\n");

    // ========================================
    // 1. 角度B案件テーブル
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.angle_b_forecasts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL,
        project_code TEXT NOT NULL,
        project_name TEXT NOT NULL,
        customer_id VARCHAR NOT NULL,
        customer_code TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        accounting_period TEXT NOT NULL,
        accounting_item TEXT NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(14, 2) NOT NULL,
        remarks TEXT,
        period TEXT NOT NULL,
        probability INTEGER NOT NULL DEFAULT 50,
        created_by_user_id VARCHAR,
        created_by_employee_id VARCHAR,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log("✅ angle_b_forecasts テーブルを作成");

    // ========================================
    // 2. 売上予算テーブル
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.budgets_revenue (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_year INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        budget_amount DECIMAL(14, 2) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(fiscal_year, service_type)
      )
    `);
    console.log("✅ budgets_revenue テーブルを作成");

    // ========================================
    // 3. 販管費予算テーブル
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.budgets_expense (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_year INTEGER NOT NULL,
        accounting_item TEXT NOT NULL,
        budget_amount DECIMAL(14, 2) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(fiscal_year, accounting_item)
      )
    `);
    console.log("✅ budgets_expense テーブルを作成");

    // ========================================
    // 4. 目標値予算テーブル
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.budgets_target (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_year INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        target_value DECIMAL(14, 2) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(fiscal_year, service_type, analysis_type)
      )
    `);
    console.log("✅ budgets_target テーブルを作成");

    // ========================================
    // 5. 配員計画テーブル
    // ========================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.staffing (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL,
        fiscal_year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        employee_id VARCHAR NOT NULL,
        employee_name TEXT NOT NULL,
        hours DECIMAL(5, 1) NOT NULL,
        remarks TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, fiscal_year, month, employee_id)
      )
    `);
    console.log("✅ staffing テーブルを作成");

    // ========================================
    // インデックスの作成
    // ========================================
    console.log("\nインデックスを作成中...");

    // 角度B案件のインデックス
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_angle_b_forecasts_project_id 
      ON app.angle_b_forecasts(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_angle_b_forecasts_period 
      ON app.angle_b_forecasts(period)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_angle_b_forecasts_accounting_period 
      ON app.angle_b_forecasts(accounting_period)
    `);
    console.log("✅ angle_b_forecasts のインデックスを作成");

    // 予算テーブルのインデックス
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_revenue_fiscal_year 
      ON app.budgets_revenue(fiscal_year)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_expense_fiscal_year 
      ON app.budgets_expense(fiscal_year)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_target_fiscal_year 
      ON app.budgets_target(fiscal_year)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_target_service_type 
      ON app.budgets_target(service_type)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budgets_target_analysis_type 
      ON app.budgets_target(analysis_type)
    `);
    console.log("✅ budgets のインデックスを作成");

    // 配員計画のインデックス
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_staffing_project_id 
      ON app.staffing(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_staffing_fiscal_year_month 
      ON app.staffing(fiscal_year, month)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_staffing_employee_id 
      ON app.staffing(employee_id)
    `);
    console.log("✅ staffing のインデックスを作成");

    console.log("\n🎉 すべてのテーブルとインデックスの作成が完了しました！");
    console.log("\n📊 作成されたテーブル:");
    console.log("  - app.angle_b_forecasts (角度B案件)");
    console.log("  - app.budgets_revenue (売上予算)");
    console.log("  - app.budgets_expense (販管費予算)");
    console.log("  - app.budgets_target (目標値予算)");
    console.log("  - app.staffing (配員計画)");
  } catch (error: any) {
    console.error("❌ テーブル作成エラー:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createNewTables();
