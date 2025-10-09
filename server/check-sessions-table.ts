/**
 * sessionsテーブルの構造確認スクリプト
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function checkSessionsTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('sessionsテーブルの構造を確認中...\n');
    
    // テーブルの存在確認
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
      )
    `);
    
    console.log('テーブルの存在:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // カラム情報を取得
      const columns = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('\nカラム一覧:');
      columns.rows.forEach((col: any) => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
      
      // サンプルデータを確認
      const sampleData = await pool.query(`
        SELECT * FROM sessions LIMIT 1
      `);
      
      console.log('\nサンプルデータ:');
      if (sampleData.rows.length > 0) {
        console.log(JSON.stringify(sampleData.rows[0], null, 2));
      } else {
        console.log('データなし');
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessionsTable();

