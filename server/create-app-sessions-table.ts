/**
 * app.sessionsテーブル作成スクリプト
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function createAppSessionsTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('app.sessionsテーブルを作成中...\n');
    
    // appスキーマが存在することを確認
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS app
    `);
    console.log('✅ appスキーマを確認');
    
    // app.sessionsテーブルを作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app.sessions (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ app.sessionsテーブルを作成');
    
    // インデックスを作成
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id 
      ON app.sessions(user_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at 
      ON app.sessions(expires_at)
    `);
    console.log('✅ インデックスを作成');
    
    console.log('\n🎉 app.sessionsテーブルの作成が完了しました！');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

createAppSessionsTable();

