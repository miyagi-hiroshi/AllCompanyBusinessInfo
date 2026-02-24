import dotenv from "dotenv";
import pg from "pg";

const { Pool } = pg;

// 環境変数を読み込み
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// データベース接続URLに文字エンコーディングを明示的に指定
const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.set("client_encoding", "UTF8");

const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: false, // 開発環境ではSSLを無効
  application_name: "AllCompanyBusinessInfo-SeedData",
});

async function seedAccountingItems() {
  const client = await pool.connect();

  try {
    console.log("📊 計上区分マスタシードデータ確認を開始...");

    // 現在のデータ数を確認
    const countResult = await client.query("SELECT COUNT(*) as count FROM app.accounting_items");
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`📋 現在の計上区分データ数: ${currentCount}件`);

    if (currentCount >= 15) {
      console.log("✅ 計上区分マスタは十分なデータが登録されています");
      return;
    }

    // 既存のデータを確認
    const existingResult = await client.query(
      "SELECT code FROM app.accounting_items ORDER BY code"
    );
    const existingCodes = existingResult.rows.map((row) => row.code);
    console.log(`📋 既存のコード: ${existingCodes.join(", ")}`);

    // 必要な計上区分データ（現在のDBに存在するデータと一致）
    const requiredItems = [
      { code: "511", name: "保守売上" },
      { code: "512", name: "ソフト売上" },
      { code: "513", name: "商品売上" },
      { code: "514", name: "消耗品売上" },
      { code: "515", name: "その他売上" },
      { code: "541", name: "仕入高" },
      { code: "727", name: "通信費" },
      { code: "737", name: "消耗品費" },
      { code: "740", name: "支払保守料" },
      { code: "745", name: "外注加工費" },
      { code: "1100", name: "期首製品棚卸高" },
      { code: "1200", name: "期首商品棚卸高" },
      { code: "1300", name: "期末製品棚卸高" },
      { code: "1400", name: "期末商品棚卸高" },
      { code: "9999", name: "その他調整経費" },
    ];

    let addedCount = 0;
    for (const item of requiredItems) {
      if (!existingCodes.includes(item.code)) {
        await client.query("INSERT INTO app.accounting_items (code, name) VALUES ($1, $2)", [
          item.code,
          item.name,
        ]);
        console.log(`✅ 追加: ${item.code} - ${item.name}`);
        addedCount++;
      }
    }

    if (addedCount === 0) {
      console.log("📋 追加すべき計上区分はありません");
    } else {
      console.log(`✅ ${addedCount}件の計上区分を追加しました`);
    }

    // 最終確認
    const finalCountResult = await client.query(
      "SELECT COUNT(*) as count FROM app.accounting_items"
    );
    const finalCount = parseInt(finalCountResult.rows[0].count);
    console.log(`📊 最終的な計上区分データ数: ${finalCount}件`);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプト実行
seedAccountingItems()
  .then(() => {
    console.log("🎉 計上区分マスタシードデータ作成が正常に完了しました");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 計上区分マスタシードデータ作成に失敗しました:", error);
    process.exit(1);
  });

export { seedAccountingItems };
