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

// 2025年度プロジェクトデータ
const PROJECT_DATA = [
  { code: "SI-ASPIT", name: "鈴木", serviceType: "インテグレーション", analysisType: "生産性" },
  {
    code: "SI-ASPITリニューアル",
    name: "鈴木",
    serviceType: "インテグレーション",
    analysisType: "生産性",
  },
  { code: "SI-BSW", name: "北", serviceType: "インテグレーション", analysisType: "生産性" },
  { code: "SI-PKG-大原", name: "大原", serviceType: "インテグレーション", analysisType: "生産性" },
  { code: "SI-PKG-山内", name: "山内", serviceType: "インテグレーション", analysisType: "生産性" },
  { code: "SI-ナツアキ", name: "田代", serviceType: "インテグレーション", analysisType: "生産性" },
  { code: "SI-NES", name: "稲田", serviceType: "インテグレーション", analysisType: "生産性" },
  { code: "SI-CP-構築", name: "秋山", serviceType: "インテグレーション", analysisType: "粗利" },
  { code: "ENG-BSW", name: "北", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-YISS", name: "渡邊", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-YPT", name: "渡邊", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-SB", name: "秋山", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-QNES-稲田", name: "稲田", serviceType: "エンジニアリング", analysisType: "生産性" },
  {
    code: "ENG-ミライト・ワン",
    name: "田代",
    serviceType: "エンジニアリング",
    analysisType: "生産性",
  },
  { code: "ENG-QNES-志水", name: "志水", serviceType: "エンジニアリング", analysisType: "生産性" },
  {
    code: "ENG-ジャパネット",
    name: "秋山",
    serviceType: "エンジニアリング",
    analysisType: "生産性",
  },
  { code: "ENG-HSW", name: "中野", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-NECST", name: "久保山", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-PASCO", name: "渡邊", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-AAA", name: "田代", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-アプレット", name: "中野", serviceType: "エンジニアリング", analysisType: "生産性" },
  {
    code: "ENG-アプレット_HSW",
    name: "中野",
    serviceType: "エンジニアリング",
    analysisType: "生産性",
  },
  { code: "ENG-アクシス", name: "田代", serviceType: "エンジニアリング", analysisType: "生産性" },
  {
    code: "ENG-BBS太田昭和",
    name: "渡邊",
    serviceType: "エンジニアリング",
    analysisType: "生産性",
  },
  { code: "ENG-富士ソフト", name: "渡邊", serviceType: "エンジニアリング", analysisType: "生産性" },
  { code: "ENG-BPSES-山内", name: "山内", serviceType: "エンジニアリング", analysisType: "粗利" },
  { code: "ENG-BPSES-田代", name: "田代", serviceType: "エンジニアリング", analysisType: "粗利" },
  { code: "ENG-BPSES-秋山", name: "秋山", serviceType: "エンジニアリング", analysisType: "粗利" },
  { code: "ENG-BPSES-渡邊", name: "渡邊", serviceType: "エンジニアリング", analysisType: "粗利" },
  { code: "ENG-BPSES-大原", name: "大原", serviceType: "エンジニアリング", analysisType: "粗利" },
  { code: "ENG-BPSES-中野", name: "中野", serviceType: "エンジニアリング", analysisType: "粗利" },
  {
    code: "SWM-PKG保守",
    name: "大原",
    serviceType: "ソフトウェアマネージド",
    analysisType: "生産性",
  },
  {
    code: "SWM-TWD保守",
    name: "渡邊",
    serviceType: "ソフトウェアマネージド",
    analysisType: "生産性",
  },
  {
    code: "SWM-ASPIT保守",
    name: "鈴木",
    serviceType: "ソフトウェアマネージド",
    analysisType: "生産性",
  },
  {
    code: "SWM-CP-保守",
    name: "秋山",
    serviceType: "ソフトウェアマネージド",
    analysisType: "粗利",
  },
  {
    code: "SWM-九電工ヘルプデスク",
    name: "稲田",
    serviceType: "ソフトウェアマネージド",
    analysisType: "粗利",
  },
  {
    code: "SWM-福岡市ヘルプデスク(NEC)",
    name: "稲田",
    serviceType: "ソフトウェアマネージド",
    analysisType: "粗利",
  },
  {
    code: "SWM-西技ヘルプデスク",
    name: "渡邊",
    serviceType: "ソフトウェアマネージド",
    analysisType: "粗利",
  },
  { code: "リセール-渡邊", name: "渡邊", serviceType: "リセール", analysisType: "粗利" },
  { code: "リセール-田代", name: "田代", serviceType: "リセール", analysisType: "粗利" },
  { code: "リセール-秋山", name: "秋山", serviceType: "リセール", analysisType: "粗利" },
  { code: "リセール-大原", name: "大原", serviceType: "リセール", analysisType: "粗利" },
  { code: "リセール-中野", name: "中野", serviceType: "リセール", analysisType: "粗利" },
  { code: "リセール-弓山", name: "弓山", serviceType: "リセール", analysisType: "粗利" },
];

async function seedProjects2025() {
  const client = await pool.connect();

  try {
    console.log("📊 2025年度プロジェクトマスタシードデータ作成を開始...");

    // 従業員マスタから営業担当者情報を取得
    console.log("👥 従業員マスタから営業担当者情報を取得中...");
    const employeesResult = await client.query(`
      SELECT id, last_name, first_name 
      FROM public.employees 
      WHERE status = 'active' 
      ORDER BY last_name, first_name
    `);

    const employees = employeesResult.rows;
    console.log(`👥 取得した従業員数: ${employees.length}件`);

    // 営業担当者名のマッピングを作成
    const salesPersonMap = new Map<string, string>();

    for (const project of PROJECT_DATA) {
      const targetLastName = project.name;
      const matchingEmployees = employees.filter((emp) => emp.last_name === targetLastName);

      if (matchingEmployees.length > 0) {
        // 複数いる場合は最初の1件を使用
        const employee = matchingEmployees[0];
        const salesPersonName = `${employee.last_name}${employee.first_name}`;
        salesPersonMap.set(targetLastName, salesPersonName);
        console.log(`👤 ${targetLastName} → ${salesPersonName}`);
      } else {
        console.warn(`⚠️ ${targetLastName}に該当する従業員が見つかりません`);
        salesPersonMap.set(targetLastName, `${targetLastName}（未登録）`);
      }
    }

    // プロジェクトデータを登録
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < PROJECT_DATA.length; i++) {
      const project = PROJECT_DATA[i];
      const projectCode = `${String(i + 1).padStart(3, "0")}-${project.code}`;
      const salesPerson = salesPersonMap.get(project.name) || `${project.name}（未登録）`;

      try {
        await client.query(
          `
          INSERT INTO app.projects (
            code, name, fiscal_year, customer_id, customer_name, 
            sales_person, service_type, analysis_type, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
          [
            projectCode,
            project.code,
            2025,
            "", // customerId: 空文字列
            "", // customerName: 空文字列
            salesPerson,
            project.serviceType,
            project.analysisType,
            "active",
          ]
        );

        console.log(`✅ ${projectCode}: ${project.code} (${project.name})`);
        successCount++;
      } catch (error) {
        console.error(`❌ ${projectCode}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 登録結果:`);
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);
    console.log(`📋 合計: ${PROJECT_DATA.length}件`);

    // 最終確認
    const countResult = await client.query(
      "SELECT COUNT(*) as count FROM app.projects WHERE fiscal_year = 2025"
    );
    const finalCount = parseInt(countResult.rows[0].count);
    console.log(`📊 2025年度プロジェクト最終データ数: ${finalCount}件`);
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプト実行
seedProjects2025()
  .then(() => {
    console.log("🎉 2025年度プロジェクトマスタシードデータ作成が正常に完了しました");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 2025年度プロジェクトマスタシードデータ作成に失敗しました:", error);
    process.exit(1);
  });

export { seedProjects2025 };
