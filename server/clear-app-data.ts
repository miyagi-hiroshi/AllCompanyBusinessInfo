import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

// 環境変数を読み込み
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// データベース接続URLに文字エンコーディングを明示的に指定
const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.set('client_encoding', 'UTF8');

const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: false, // 開発環境ではSSLを無効
  application_name: 'AllCompanyBusinessInfo-SeedData',
});

async function clearAppData() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ appスキーマデータ削除を開始...');
    
    // 削除順序：外部キー制約を考慮して逆順で削除
    const tablesToDelete = [
      'app.reconciliation_logs',
      'app.gl_entries', 
      'app.staffing',
      'app.angle_b_forecasts',
      'app.order_forecasts',
      'app.budgets_expense',
      'app.budgets_revenue', 
      'app.budgets_target',
      'app.items',
      'app.customers',
      'app.projects'
    ];
    
    for (const table of tablesToDelete) {
      const result = await client.query(`DELETE FROM ${table}`);
      console.log(`✅ ${table}: ${result.rowCount}件削除`);
    }
    
    // accounting_itemsは削除しない（計上区分マスタを残す）
    console.log('📋 app.accounting_items: 削除スキップ（計上区分マスタを保持）');
    
    console.log('✅ appスキーマデータ削除完了');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプト実行
clearAppData()
  .then(() => {
    console.log('🎉 データ削除が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 データ削除に失敗しました:', error);
    process.exit(1);
  });

export { clearAppData };
