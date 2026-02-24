import { orderForecasts } from "@shared/schema/orderForecast/tables";

import { db, pool } from "./db";

async function createTestOrderData() {
  try {
    console.log("🔄 受発注見込みテストデータを作成中...");

    // テストデータ
    const testData = [
      {
        projectId: "test-project-1",
        projectCode: "TEST001",
        projectName: "テストプロジェクト1",
        customerId: "test-customer-1",
        customerCode: "CUST001",
        customerName: "東京システム開発株式会社",
        accountingPeriod: "2025-10",
        accountingItem: "511", // 保守売上
        description: "保守契約料",
        amount: "50000",
        period: "2025-10",
      },
      {
        projectId: "test-project-2",
        projectCode: "TEST002",
        projectName: "アスピット刷新",
        customerId: "test-customer-1",
        customerCode: "CUST001",
        customerName: "東京システム開発株式会社",
        accountingPeriod: "2025-10",
        accountingItem: "512", // ソフト売上
        description: "システム開発費",
        amount: "80000",
        period: "2025-10",
      },
      {
        projectId: "test-project-3",
        projectCode: "TEST003",
        projectName: "商品販売プロジェクト",
        customerId: "test-customer-1",
        customerCode: "CUST001",
        customerName: "東京システム開発株式会社",
        accountingPeriod: "2025-10",
        accountingItem: "513", // 商品売上
        description: "商品販売",
        amount: "30000",
        period: "2025-10",
      },
      {
        projectId: "test-project-4",
        projectCode: "TEST004",
        projectName: "消耗品販売",
        customerId: "test-customer-1",
        customerCode: "CUST001",
        customerName: "東京システム開発株式会社",
        accountingPeriod: "2025-10",
        accountingItem: "514", // 消耗品売上
        description: "消耗品販売（手動突合用）",
        amount: "16000", // 金額を少し変えて手動突合が必要に
        period: "2025-10",
      },
      {
        projectId: "test-project-5",
        projectCode: "TEST005",
        projectName: "除外テスト案件",
        customerId: "test-customer-1",
        customerCode: "CUST001",
        customerName: "東京システム開発株式会社",
        accountingPeriod: "2025-10",
        accountingItem: "515", // その他売上
        description: "その他収入（除外対象）",
        amount: "10000",
        period: "2025-10",
      },
    ];

    // 既存のテストデータを削除
    await db.delete(orderForecasts).execute();
    console.log("✅ 既存の受発注見込みデータを削除しました");

    // 新しいテストデータを挿入
    for (const data of testData) {
      await db.insert(orderForecasts).values(data);
    }

    console.log(`✅ ${testData.length}件の受発注見込みテストデータを作成しました`);
    console.log("\n📋 作成したデータ:");
    testData.forEach((data, index) => {
      console.log(
        `  ${index + 1}. [${data.accountingItem}] ${data.description} - ¥${Number(data.amount).toLocaleString()}`
      );
    });
  } catch (error) {
    console.error("❌ テストデータ作成エラー:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTestOrderData().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
