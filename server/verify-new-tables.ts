/**
 * 新規作成テーブルの簡易確認スクリプト
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function verifyNewTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('新規作成テーブルを確認中...\n');
    
    const tables = [
      'angle_b_forecasts',
      'budgets_revenue',
      'budgets_expense',
      'staffing'
    ];
    
    for (const tableName of tables) {
      // テーブルの存在確認
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'app' 
          AND table_name = $1
        )
      `, [tableName]);
      
      if (tableCheck.rows[0].exists) {
        console.log(`✅ app.${tableName} テーブルが存在します`);
        
        // カラム数を確認
        const columnCount = await pool.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = 'app' AND table_name = $1
        `, [tableName]);
        
        console.log(`   カラム数: ${columnCount.rows[0].count}`);
        
        // レコード数を確認
        const recordCount = await pool.query(`
          SELECT COUNT(*) as count FROM app.${tableName}
        `);
        
        console.log(`   レコード数: ${recordCount.rows[0].count}\n`);
      } else {
        console.log(`❌ app.${tableName} テーブルが存在しません\n`);
      }
    }
    
    console.log('🎉 確認完了！');
    
  } catch (error: any) {
    console.error('❌ 確認エラー:', error.message);
  } finally {
    await pool.end();
  }
}

verifyNewTables();

