/**
 * 既存の予算テーブルにremarksカラムを追加するスクリプト
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function addRemarksColumns() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('予算テーブルにremarksカラムを追加中...\n');
    
    // 売上予算テーブルにremarksカラムを追加
    await pool.query(`
      ALTER TABLE app.budgets_revenue 
      ADD COLUMN IF NOT EXISTS remarks TEXT
    `);
    console.log('✅ budgets_revenue テーブルにremarksカラムを追加');
    
    // 販管費予算テーブルにremarksカラムを追加
    await pool.query(`
      ALTER TABLE app.budgets_expense 
      ADD COLUMN IF NOT EXISTS remarks TEXT
    `);
    console.log('✅ budgets_expense テーブルにremarksカラムを追加');
    
    console.log('\n🎉 remarksカラムの追加が完了しました！');
    
  } catch (error: any) {
    console.error('❌ カラム追加エラー:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

addRemarksColumns();
