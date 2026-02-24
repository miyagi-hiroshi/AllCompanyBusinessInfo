/**
 * appスキーマのテーブル構造を確認
 * 変更後に必ず実行する
 */

import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

async function verifyAppTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log("appスキーマのテーブル構造を確認中...");

    // appスキーマのテーブル一覧を取得
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'app'
      ORDER BY table_name
    `);

    console.log("\n📋 appスキーマのテーブル:");
    for (const table of tables.rows) {
      console.log(`\n🔍 ${table.table_name}:`);

      // カラム情報を取得
      const columns = await pool.query(
        `
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
      `,
        [table.table_name]
      );

      columns.rows.forEach((col: any) => {
        let type = col.data_type;
        if (col.character_maximum_length) {
          type += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          type += `(${col.numeric_precision},${col.numeric_scale || 0})`;
        }

        const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : "";

        console.log(`  - ${col.column_name}: ${type} ${nullable}${defaultVal}`);
      });

      // 制約情報を取得
      const constraints = await pool.query(
        `
        SELECT 
          constraint_name,
          constraint_type,
          column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'app' 
        AND tc.table_name = $1
      `,
        [table.table_name]
      );

      if (constraints.rows.length > 0) {
        console.log("  📌 制約:");
        constraints.rows.forEach((constraint: any) => {
          console.log(
            `    - ${constraint.constraint_name}: ${constraint.constraint_type} (${constraint.column_name})`
          );
        });
      }
    }

    console.log("\n✅ テーブル構造の確認が完了しました！");
  } catch (error) {
    console.error("❌ 確認エラー:", error.message);
  } finally {
    await pool.end();
  }
}

verifyAppTables();
