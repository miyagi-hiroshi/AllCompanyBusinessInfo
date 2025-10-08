/**
 * appスキーマのテーブル構造をバックアップ
 * 変更前に必ず実行する
 */

import dotenv from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config();

const { Pool } = pg;

async function backupAppTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('appスキーマのテーブル構造をバックアップ中...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.resolve(import.meta.dirname, '..', 'backups', timestamp);
    
    // バックアップディレクトリを作成
    fs.mkdirSync(backupDir, { recursive: true });
    
    // appスキーマのテーブル一覧を取得
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);
    
    for (const table of tables.rows) {
      // テーブル構造を取得
      const structure = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'app' 
        AND table_name = $1
        ORDER BY ordinal_position
      `, [table.table_name]);
      
      // 制約情報を取得
      const constraints = await pool.query(`
        SELECT 
          constraint_name,
          constraint_type,
          column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'app' 
        AND tc.table_name = $1
      `, [table.table_name]);
      
      // バックアップファイルに保存
      const backupData = {
        tableName: table.table_name,
        timestamp: new Date().toISOString(),
        structure: structure.rows,
        constraints: constraints.rows
      };
      
      const backupFile = path.join(backupDir, `${table.table_name}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
      
      console.log(`✅ ${table.table_name} の構造をバックアップ: ${backupFile}`);
    }
    
    console.log(`\n🎉 バックアップ完了: ${backupDir}`);
    console.log('変更前に必ずこのバックアップを確認してください。');
    
  } catch (error) {
    console.error('❌ バックアップエラー:', error.message);
  } finally {
    await pool.end();
  }
}

backupAppTables();
