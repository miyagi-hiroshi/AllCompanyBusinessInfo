import { glEntries } from '@shared/schema/glEntry/tables';

import { db, pool } from './db';

async function insertTestGLData() {
  try {
    console.log('🔄 GL総勘定元帳テストデータを作成中...');

    // テストデータ
    const testData = [
      {
        voucherNo: 'V001',
        transactionDate: '2025-10-15',
        accountCode: '511',
        accountName: '保守売上',
        amount: '50000',
        debitCredit: 'debit',
        description: '保守契約料',
        period: '2025-10',
      },
      {
        voucherNo: 'V002',
        transactionDate: '2025-10-20',
        accountCode: '512',
        accountName: 'ソフト売上',
        amount: '80000',
        debitCredit: 'debit',
        description: 'システム開発費',
        period: '2025-10',
      },
      {
        voucherNo: 'V003',
        transactionDate: '2025-10-25',
        accountCode: '513',
        accountName: '商品売上',
        amount: '30000',
        debitCredit: 'debit',
        description: '商品販売',
        period: '2025-10',
      },
      {
        voucherNo: 'V004',
        transactionDate: '2025-10-10',
        accountCode: '514',
        accountName: '消耗品売上',
        amount: '15000',
        debitCredit: 'debit',
        description: '消耗品販売',
        period: '2025-10',
      },
      {
        voucherNo: 'V006',
        transactionDate: '2025-10-18',
        accountCode: '515',
        accountName: 'その他売上',
        amount: '10000',
        debitCredit: 'debit',
        description: 'その他収入',
        period: '2025-10',
      },
    ];

    // 既存のテストデータを削除
    await db.delete(glEntries).execute();
    console.log('✅ 既存のGLデータを削除しました');

    // 新しいテストデータを挿入
    for (const data of testData) {
      await db.insert(glEntries).values(data);
    }
    
    console.log(`✅ ${testData.length}件のGLテストデータを作成しました`);
    console.log('\n📋 作成したデータ:');
    testData.forEach((data, index) => {
      console.log(`  ${index + 1}. [${data.accountCode}] ${data.description} - ¥${Number(data.amount).toLocaleString()}`);
    });

  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

insertTestGLData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

