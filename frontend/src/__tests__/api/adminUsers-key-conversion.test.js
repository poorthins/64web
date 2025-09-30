/**
 * adminUsers.ts 能源類別 key 轉換功能測試
 */

// 模擬對應表（從 adminUsers.ts 複製）
const FRONTEND_TO_DB_MAP = {
  'septic_tank': 'septic_tank',
  'electricity_bill': 'electricity'
};

const DB_TO_FRONTEND_MAP = {
  'septic_tank': 'septic_tank',
  'electricity': 'electricity_bill'
};

// 模擬轉換函數（從 adminUsers.ts 複製邏輯）
function convertFrontendKeysToDb(categories) {
  return categories.map(key => FRONTEND_TO_DB_MAP[key] || key);
}

function convertDbKeysToFrontend(categories) {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}

// 測試案例
function runKeyConversionTests() {
  console.log('🧪 開始能源類別 key 轉換功能測試\n');

  // 測試 1: 前端 → 資料庫格式轉換
  console.log('=== 測試 1: 前端 → 資料庫格式轉換 ===');
  const frontendKeys = ['wd40', 'septic_tank', 'electricity_bill', 'diesel', 'employee_commute'];
  const convertedToDb = convertFrontendKeysToDb(frontendKeys);

  console.log('輸入 (前端格式):', frontendKeys);
  console.log('輸出 (資料庫格式):', convertedToDb);
  console.log('預期轉換:', {
    'septic_tank': 'septic_tank',
    'electricity_bill': 'electricity'
  });

  const test1Pass =
    convertedToDb.includes('septic_tank') && // septic_tank 現在不需要轉換，保持原樣
    convertedToDb.includes('electricity') &&
    !convertedToDb.includes('electricity_bill') &&
    convertedToDb.includes('wd40') && // 未變更的保持原樣
    convertedToDb.includes('diesel') &&
    convertedToDb.includes('employee_commute');

  console.log(`測試結果: ${test1Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 2: 資料庫 → 前端格式轉換
  console.log('=== 測試 2: 資料庫 → 前端格式轉換 ===');
  const dbKeys = ['wd40', 'septic_tank', 'electricity', 'diesel', 'employee_commute'];
  const convertedToFrontend = convertDbKeysToFrontend(dbKeys);

  console.log('輸入 (資料庫格式):', dbKeys);
  console.log('輸出 (前端格式):', convertedToFrontend);
  console.log('預期轉換:', {
    'septic_tank': 'septic_tank',
    'electricity': 'electricity_bill'
  });

  const test2Pass =
    convertedToFrontend.includes('septic_tank') && // septic_tank 現在不需要轉換，保持原樣
    convertedToFrontend.includes('electricity_bill') &&
    !convertedToFrontend.includes('electricity') &&
    convertedToFrontend.includes('wd40') && // 未變更的保持原樣
    convertedToFrontend.includes('diesel') &&
    convertedToFrontend.includes('employee_commute');

  console.log(`測試結果: ${test2Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 3: 雙向轉換一致性
  console.log('=== 測試 3: 雙向轉換一致性 ===');
  const originalFrontend = ['septic_tank', 'electricity_bill', 'wd40'];
  const toDb = convertFrontendKeysToDb(originalFrontend);
  const backToFrontend = convertDbKeysToFrontend(toDb);

  console.log('原始前端格式:', originalFrontend);
  console.log('轉為資料庫格式:', toDb);
  console.log('轉回前端格式:', backToFrontend);

  const test3Pass = JSON.stringify(originalFrontend.sort()) === JSON.stringify(backToFrontend.sort());
  console.log(`雙向轉換一致性: ${test3Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 4: 空陣列處理
  console.log('=== 測試 4: 空陣列處理 ===');
  const emptyToDb = convertFrontendKeysToDb([]);
  const emptyToFrontend = convertDbKeysToFrontend([]);

  const test4Pass = emptyToDb.length === 0 && emptyToFrontend.length === 0;
  console.log(`空陣列處理: ${test4Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 5: 未知 key 處理
  console.log('=== 測試 5: 未知 key 處理 ===');
  const unknownKeys = ['unknown_key1', 'unknown_key2'];
  const unknownToDb = convertFrontendKeysToDb(unknownKeys);
  const unknownToFrontend = convertDbKeysToFrontend(unknownKeys);

  const test5Pass =
    JSON.stringify(unknownToDb) === JSON.stringify(unknownKeys) &&
    JSON.stringify(unknownToFrontend) === JSON.stringify(unknownKeys);

  console.log(`未知 key 保持不變: ${test5Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 總結
  const allTestsPassed = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass;
  console.log(`📊 測試總結: ${allTestsPassed ? '✅ 所有測試通過' : '❌ 有測試失敗'}`);

  if (allTestsPassed) {
    console.log('\n🎉 能源類別 key 轉換功能運作正常！');
    console.log('✓ 前端 → 資料庫格式轉換正確');
    console.log('✓ 資料庫 → 前端格式轉換正確');
    console.log('✓ 雙向轉換保持一致性');
    console.log('✓ 邊界情況處理正確');
  }

  return allTestsPassed;
}

// 執行測試
runKeyConversionTests();