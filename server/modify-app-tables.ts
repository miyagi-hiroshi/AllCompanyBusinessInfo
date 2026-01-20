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
    
    // 複合ユニーク制約(code, fiscal_year)を追加（既に存在する場合はスキップ）
    try {
      await pool.query(`
        ALTER TABLE app.projects 
        ADD CONSTRAINT projects_code_fiscal_year_key UNIQUE (code, fiscal_year)
      `);
      console.log('✅ projectsテーブルに複合ユニーク制約(code, fiscal_year)を追加');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ projectsテーブルの複合ユニーク制約は既に存在します（スキップ）');
      } else {
        throw error;
      }
    }
    
    // project_analysis_snapshotsテーブルを作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.project_analysis_snapshots (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        fiscal_year INTEGER NOT NULL,
        name TEXT NOT NULL,
        snapshot_data JSONB NOT NULL,
        created_by_employee_id VARCHAR NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ project_analysis_snapshotsテーブルを作成');
    
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
