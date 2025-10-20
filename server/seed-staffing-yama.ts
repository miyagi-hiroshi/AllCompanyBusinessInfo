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
  application_name: 'AllCompanyBusinessInfo-SeedStaffingData',
});

interface StaffingData {
  employeeName: string;
  projectName: string;
  months: { [key: string]: string }; // 月ごとの工数
}

interface EmployeeInfo {
  id: string;
  last_name: string;
  first_name: string;
}

interface ProjectInfo {
  id: string;
  code: string;
  name: string;
}

// 従業員名で検索（部分一致）
async function findEmployeeByName(employeeName: string): Promise<EmployeeInfo | null> {
  try {
    // 姓の部分を抽出（スペースや全角スペースで分割）
    const nameParts = employeeName.split(/[\s\u3000]+/);
    const lastName = nameParts[0];
    
    const query = `
      SELECT id, last_name, first_name 
      FROM public.employees 
      WHERE last_name LIKE $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [`%${lastName}%`]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`従業員検索エラー (${employeeName}):`, error);
    return null;
  }
}

// プロジェクト名で検索（部分一致）
async function findProjectByName(projectName: string): Promise<ProjectInfo | null> {
  try {
    const query = `
      SELECT id, code, name 
      FROM app.projects 
      WHERE name LIKE $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [`%${projectName}%`]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`プロジェクト検索エラー (${projectName}):`, error);
    return null;
  }
}

// 月の文字列から年度と年度月を抽出
function parseMonth(monthStr: string): { fiscalYear: number; fiscalMonth: number } | null {
  // "2025-04" -> fiscalYear: 2025, fiscalMonth: 1 (4月は年度の1ヶ月目)
  // "2025-05" -> fiscalYear: 2025, fiscalMonth: 2 (5月は年度の2ヶ月目)
  // "2026-01" -> fiscalYear: 2025, fiscalMonth: 10 (1月は年度の10ヶ月目)
  const match = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  
  const year = parseInt(match[1]);
  const calendarMonth = parseInt(match[2]); // 1-12の通常月
  
  // 2026年は2025年度として扱う
  const fiscalYear = year === 2026 ? 2025 : year;
  
  // 通常月を年度月に変換
  // 4月=1, 5月=2, ..., 12月=9, 1月=10, 2月=11, 3月=12
  const fiscalMonth = calendarMonth >= 4 ? calendarMonth - 3 : calendarMonth + 9;
  
  return { fiscalYear, fiscalMonth };
}

// 既存のstaffingデータを全削除
async function clearStaffingData(): Promise<void> {
  try {
    console.log('🗑️ 既存のstaffingデータを削除中...');
    await pool.query('DELETE FROM app.staffing');
    console.log('✅ 既存のstaffingデータを削除完了');
  } catch (error) {
    console.error('❌ staffingデータ削除エラー:', error);
    throw error;
  }
}

// ファイルを読み込んでデータを解析
function parseStaffingFile(filePath: string): StaffingData[] {
  try {
    console.log(`📖 ファイル読み込み中: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('ファイルに十分なデータがありません');
    }
    
    // ヘッダー行を解析（月の列を特定）
    const header = lines[0].split('\t');
    const monthColumns: { [key: string]: number } = {};
    
    for (let i = 2; i < header.length; i++) { // 最初の2列（従業員、プロジェクト）をスキップ
      const monthStr = header[i].trim();
      if (monthStr.match(/^\d{4}-\d{2}$/)) {
        monthColumns[monthStr] = i;
      }
    }
    
    console.log(`📅 検出された月列: ${Object.keys(monthColumns).join(', ')}`);
    
    // データ行を解析
    const staffingData: StaffingData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split('\t');
      if (columns.length < 3) continue;
      
      const employeeName = columns[0].trim();
      const projectName = columns[1].trim();
      
      if (!employeeName || !projectName) continue;
      
      const months: { [key: string]: string } = {};
      
      // 各月の工数を抽出
      for (const [monthStr, columnIndex] of Object.entries(monthColumns)) {
        const workHours = columns[columnIndex]?.trim();
        if (workHours && workHours !== '') {
          months[monthStr] = workHours;
        }
      }
      
      if (Object.keys(months).length > 0) {
        staffingData.push({
          employeeName,
          projectName,
          months
        });
      }
    }
    
    console.log(`📊 解析完了: ${staffingData.length}件のデータ行`);
    return staffingData;
    
  } catch (error) {
    console.error('❌ ファイル解析エラー:', error);
    throw error;
  }
}

// 配員データをデータベースに挿入
async function insertStaffingData(staffingData: StaffingData[]): Promise<void> {
  let successCount = 0;
  let errorCount = 0;
  let employeeNotFoundCount = 0;
  let projectNotFoundCount = 0;
  
  console.log('📝 配員データの挿入を開始...');
  
  for (const data of staffingData) {
    try {
      // 従業員を検索
      const employee = await findEmployeeByName(data.employeeName);
      if (!employee) {
        console.warn(`⚠️ 従業員が見つかりません: ${data.employeeName}`);
        employeeNotFoundCount++;
        continue;
      }
      
      // プロジェクトを検索
      const project = await findProjectByName(data.projectName);
      if (!project) {
        console.warn(`⚠️ プロジェクトが見つかりません: ${data.projectName}`);
        projectNotFoundCount++;
        continue;
      }
      
      // 各月のデータを挿入
      for (const [monthStr, workHoursStr] of Object.entries(data.months)) {
        try {
          const monthInfo = parseMonth(monthStr);
          if (!monthInfo) {
            console.warn(`⚠️ 無効な月形式: ${monthStr}`);
            continue;
          }
          
          const workHours = parseFloat(workHoursStr);
          if (isNaN(workHours)) {
            console.warn(`⚠️ 無効な工数: ${workHoursStr} (${data.employeeName}, ${data.projectName}, ${monthStr})`);
            continue;
          }
          
          const insertQuery = `
            INSERT INTO app.staffing (
              project_id, project_code, project_name, fiscal_year, month,
              employee_id, employee_name, work_hours
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (project_id, fiscal_year, month, employee_id) 
            DO UPDATE SET 
              work_hours = EXCLUDED.work_hours,
              employee_name = EXCLUDED.employee_name
          `;
          
          await pool.query(insertQuery, [
            project.id,
            project.code,
            project.name,
            monthInfo.fiscalYear,
            monthInfo.fiscalMonth, // 年度月を使用
            employee.id,
            data.employeeName,
            workHours
          ]);
          
          successCount++;
          
        } catch (error) {
          console.error(`❌ レコード挿入エラー (${data.employeeName}, ${data.projectName}, ${monthStr}):`, error);
          errorCount++;
        }
      }
      
    } catch (error) {
      console.error(`❌ データ処理エラー (${data.employeeName}, ${data.projectName}):`, error);
      errorCount++;
    }
  }
  
  console.log('\n📊 挿入結果:');
  console.log(`✅ 成功: ${successCount}件`);
  console.log(`❌ エラー: ${errorCount}件`);
  console.log(`⚠️ 従業員未発見: ${employeeNotFoundCount}件`);
  console.log(`⚠️ プロジェクト未発見: ${projectNotFoundCount}件`);
  
  const totalProcessed = successCount + errorCount;
  const successRate = totalProcessed > 0 ? (successCount / totalProcessed * 100).toFixed(1) : '0.0';
  console.log(`📈 成功率: ${successRate}%`);
}

// メイン処理
async function main(): Promise<void> {
  try {
    console.log('🚀 testData-Yama.txt配員データ取り込み開始（年度月形式）');
    
    // 1. 既存データを削除
    await clearStaffingData();
    
    // 2. ファイルを読み込み
    const filePath = 'testData-Yama.txt';
    if (!fs.existsSync(filePath)) {
      throw new Error(`ファイルが見つかりません: ${filePath}`);
    }
    
    const staffingData = parseStaffingFile(filePath);
    
    // 3. データを挿入
    await insertStaffingData(staffingData);
    
    console.log('🎉 配員データ取り込み完了（月は年度月形式: 4月=1, 5月=2, ..., 3月=12）');
    
  } catch (error) {
    console.error('❌ 処理エラー:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// スクリプト実行
main();
