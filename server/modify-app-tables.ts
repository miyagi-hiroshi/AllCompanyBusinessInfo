/**
 * appスキーマのテーブル変更用スクリプト
 * このファイルを編集してテーブル変更を実行
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function modifyAppTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('appスキーマのテーブルを変更中...');
    
    // ========================================
    // ここにテーブル変更のSQLを記述
    // ========================================
    
    // projectsテーブルのUNIQUE制約を変更
    // 既存のUNIQUE(code)制約を削除
    await pool.query(`
      ALTER TABLE app.projects 
      DROP CONSTRAINT IF EXISTS projects_code_key
    `);
    console.log('✅ projectsテーブルの既存UNIQUE(code)制約を削除');
    
    // 複合ユニーク制約(code, fiscal_year)を追加
    await pool.query(`
      ALTER TABLE app.projects 
      ADD CONSTRAINT projects_code_fiscal_year_key UNIQUE (code, fiscal_year)
    `);
    console.log('✅ projectsテーブルに複合ユニーク制約(code, fiscal_year)を追加');
    
    console.log('\n🎉 テーブル変更が完了しました！');
    console.log('変更内容を必ず確認してください。');
    
  } catch (error) {
    console.error('❌ テーブル変更エラー:', error.message);
    console.error('バックアップから復元することを検討してください。');
  } finally {
    await pool.end();
  }
}

modifyAppTables();
