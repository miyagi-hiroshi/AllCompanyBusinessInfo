import dotenv from 'dotenv';
import fs from 'fs';
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

interface OrderForecastData {
  project: string;
  accountingItem: string;
  accountingPeriod: string;
  description: string;
  amount: number;
  status: string;
}

interface ProjectInfo {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
}

// 計上区分の自動判定ルール
function determineAccountingItem(originalItem: string, projectName: string): string {
  if (originalItem === '売上') {
    if (projectName.includes('SWM')) {
      return '保守売上';
    } else if (projectName.includes('リセール')) {
      return '商品売上';
    } else {
      return 'ソフト売上';
    }
  }
  return originalItem;
}

// プロジェクト情報を取得
async function getProjectInfo(client: pg.PoolClient, projectCode: string): Promise<ProjectInfo | null> {
  const result = await client.query(`
    SELECT id, code, name, customer_id, customer_name 
    FROM app.projects 
    WHERE code LIKE $1 
    LIMIT 1
  `, [`%${projectCode}%`]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const row = result.rows[0];
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    customerId: row.customer_id || '',
    customerName: row.customer_name || ''
  };
}

// 受発注見込データを投入
async function insertOrderForecast(client: pg.PoolClient, data: OrderForecastData, projectInfo: ProjectInfo): Promise<boolean> {
  try {
    await client.query(`
      INSERT INTO app.order_forecasts (
        project_id, project_code, project_name,
        customer_id, customer_code, customer_name,
        accounting_period, accounting_item, description, amount,
        remarks, period, reconciliation_status, is_excluded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      projectInfo.id,
      projectInfo.code,
      projectInfo.name,
      projectInfo.customerId,
      '', // customer_code
      projectInfo.customerName,
      data.accountingPeriod,
      data.accountingItem,
      data.description,
      data.amount,
      data.status,
      data.accountingPeriod,
      'unmatched',
      'false'
    ]);
    return true;
  } catch (error) {
    console.error(`❌ 受発注見込投入エラー: ${error.message}`);
    return false;
  }
}

// アングルB見込データを投入
async function insertAngleBForecast(client: pg.PoolClient, data: OrderForecastData, projectInfo: ProjectInfo): Promise<boolean> {
  try {
    await client.query(`
      INSERT INTO app.angle_b_forecasts (
        project_id, project_code, project_name,
        customer_id, customer_code, customer_name,
        accounting_period, accounting_item, description, amount,
        probability, remarks, period
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      projectInfo.id,
      projectInfo.code,
      projectInfo.name,
      projectInfo.customerId,
      '', // customer_code
      projectInfo.customerName,
      data.accountingPeriod,
      data.accountingItem,
      data.description,
      data.amount,
      50, // probability
      data.status,
      data.accountingPeriod
    ]);
    return true;
  } catch (error) {
    console.error(`❌ アングルB見込投入エラー: ${error.message}`);
    return false;
  }
}

async function seedOrderForecasts(dataFilePath: string) {
  const client = await pool.connect();
  
  try {
    console.log('📊 受発注状況テストデータ投入を開始...');
    
    // ファイルを読み込み
    if (!fs.existsSync(dataFilePath)) {
      throw new Error(`データファイルが見つかりません: ${dataFilePath}`);
    }
    
    const fileContent = fs.readFileSync(dataFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('データファイルが空です');
    }
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1);
    console.log(`📋 処理対象データ行数: ${dataLines.length}行`);
    
    let successCount = 0;
    let errorCount = 0;
    let orderForecastCount = 0;
    let angleBForecastCount = 0;
    let projectNotFoundCount = 0;
    
    // プロジェクト情報のキャッシュ
    const projectCache = new Map<string, ProjectInfo | null>();
    
    console.log('🔄 データ処理開始...');
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;
      
      const columns = line.split('\t');
      if (columns.length < 6) {
        console.error(`❌ 行 ${i + 2}: 列数が不足しています (${columns.length}/6)`);
        errorCount++;
        continue;
      }
      
      const data: OrderForecastData = {
        project: columns[0].trim(),
        accountingItem: columns[1].trim(),
        accountingPeriod: columns[2].trim(),
        description: columns[3].trim(),
        amount: parseFloat(columns[4].trim()),
        status: columns[5].trim()
      };
      
      // 必須フィールドの検証
      if (!data.project || !data.accountingItem || !data.accountingPeriod || 
          !data.description || isNaN(data.amount) || !data.status) {
        console.error(`❌ 行 ${i + 2}: 必須フィールドが不足しています`);
        errorCount++;
        continue;
      }
      
      // プロジェクト情報を取得（キャッシュから）
      let projectInfo = projectCache.get(data.project);
      if (projectInfo === undefined) {
        projectInfo = await getProjectInfo(client, data.project);
        projectCache.set(data.project, projectInfo);
      }
      
      if (!projectInfo) {
        console.error(`❌ 行 ${i + 2}: プロジェクトが見つかりません: ${data.project}`);
        projectNotFoundCount++;
        errorCount++;
        continue;
      }
      
      // 計上区分を自動判定
      const finalAccountingItem = determineAccountingItem(data.accountingItem, projectInfo.name);
      
      // 投入先テーブルを判定
      let inserted = false;
      if (data.status === '角度B') {
        inserted = await insertAngleBForecast(client, {
          ...data,
          accountingItem: finalAccountingItem
        }, projectInfo);
        if (inserted) angleBForecastCount++;
      } else {
        inserted = await insertOrderForecast(client, {
          ...data,
          accountingItem: finalAccountingItem
        }, projectInfo);
        if (inserted) orderForecastCount++;
      }
      
      if (inserted) {
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`✅ ${successCount}件処理完了...`);
        }
      } else {
        errorCount++;
      }
    }
    
    console.log('\n📊 投入結果:');
    console.log(`✅ 成功: ${successCount}件`);
    console.log(`❌ エラー: ${errorCount}件`);
    console.log(`📋 受発注見込: ${orderForecastCount}件`);
    console.log(`📋 アングルB見込: ${angleBForecastCount}件`);
    console.log(`🔍 プロジェクト未発見: ${projectNotFoundCount}件`);
    
    // 最終確認
    const orderForecastTotal = await client.query('SELECT COUNT(*) as count FROM app.order_forecasts');
    const angleBForecastTotal = await client.query('SELECT COUNT(*) as count FROM app.angle_b_forecasts');
    
    console.log(`\n📊 最終データ数:`);
    console.log(`📋 受発注見込総数: ${orderForecastTotal.rows[0].count}件`);
    console.log(`📋 アングルB見込総数: ${angleBForecastTotal.rows[0].count}件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    client.release();
  }
}

// スクリプト実行
const dataFilePath = process.argv[2] || 'testData.txt';

seedOrderForecasts(dataFilePath)
  .then(() => {
    console.log('🎉 受発注状況テストデータ投入が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 受発注状況テストデータ投入に失敗しました:', error);
    process.exit(1);
  });

export { seedOrderForecasts };
