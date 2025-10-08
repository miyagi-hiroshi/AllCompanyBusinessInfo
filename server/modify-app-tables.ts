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
    
    // 例: customersテーブルにemailカラムを追加
    // await pool.query(`
    //   ALTER TABLE app.customers 
    //   ADD COLUMN email TEXT
    // `);
    // console.log('✅ customersテーブルにemailカラムを追加');
    
    // 例: customersテーブルからemailカラムを削除
    // await pool.query(`
    //   ALTER TABLE app.customers 
    //   DROP COLUMN email
    // `);
    // console.log('✅ customersテーブルからemailカラムを削除');
    
    // 例: customersテーブルのnameカラムをVARCHAR(255)に変更
    // await pool.query(`
    //   ALTER TABLE app.customers 
    //   ALTER COLUMN name TYPE VARCHAR(255)
    // `);
    // console.log('✅ customersテーブルのnameカラムをVARCHAR(255)に変更');
    
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
