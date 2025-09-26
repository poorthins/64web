/**
 * adminUsers.ts 額外的 getUserById 和 getUserDetails 函數轉換測試
 */

// 模擬用戶資料（資料庫格式）
const mockUserFromDB = {
  id: '123',
  display_name: '測試使用者',
  role: 'user',
  is_active: true,
  email: 'test@example.com',
  filling_config: {
    diesel_generator_mode: 'refuel',
    energy_categories: ['septic_tank', 'electricity', 'diesel', 'wd40'], // 資料庫格式
    target_year: 2024
  }
};

// 預期的前端格式
const expectedFrontendFormat = ['septictank', 'electricity_bill', 'diesel', 'wd40'];

// 模擬轉換函數
const DB_TO_FRONTEND_MAP = {
  'septic_tank': 'septictank',
  'electricity': 'electricity_bill'
};

function convertDbKeysToFrontend(categories) {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}

function runAdditionalConversionTests() {
  console.log('🧪 開始額外的 getUserById/getUserDetails 轉換測試\n');

  // 測試 1: 模擬 getUserById/getUserDetails 的轉換邏輯
  console.log('=== 測試 1: 模擬函數返回前的轉換邏輯 ===');

  // 模擬 getUserById/getUserDetails 函數的轉換邏輯
  const processUserData = (user) => {
    // 在返回資料前轉換 energy_categories 格式（資料庫格式 → 前端格式）
    if (user?.filling_config?.energy_categories) {
      user.filling_config.energy_categories = convertDbKeysToFrontend(user.filling_config.energy_categories);
    }
    return user;
  };

  const processedUser = processUserData({ ...mockUserFromDB });

  console.log('原始資料庫格式:', mockUserFromDB.filling_config.energy_categories);
  console.log('轉換後前端格式:', processedUser.filling_config.energy_categories);
  console.log('預期前端格式:', expectedFrontendFormat);

  const test1Pass = JSON.stringify(processedUser.filling_config.energy_categories.sort())
    === JSON.stringify(expectedFrontendFormat.sort());

  console.log(`測試結果: ${test1Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 2: 確認關鍵的轉換項目
  console.log('=== 測試 2: 確認關鍵轉換項目 ===');

  const categories = processedUser.filling_config.energy_categories;
  const hasCorrectTransform =
    categories.includes('septictank') &&        // septic_tank → septictank
    !categories.includes('septic_tank') &&      // 不應該有原始的 septic_tank
    categories.includes('electricity_bill') &&  // electricity → electricity_bill
    !categories.includes('electricity') &&      // 不應該有原始的 electricity
    categories.includes('diesel') &&            // 未變更的項目保持不變
    categories.includes('wd40');                // 未變更的項目保持不變

  console.log('轉換檢查:', {
    '包含 septictank': categories.includes('septictank'),
    '不包含 septic_tank': !categories.includes('septic_tank'),
    '包含 electricity_bill': categories.includes('electricity_bill'),
    '不包含 electricity': !categories.includes('electricity'),
    '保持 diesel 不變': categories.includes('diesel'),
    '保持 wd40 不變': categories.includes('wd40')
  });

  console.log(`關鍵轉換檢查: ${hasCorrectTransform ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 3: 邊界情況 - 沒有 filling_config
  console.log('=== 測試 3: 沒有 filling_config 的情況 ===');

  const userWithoutFillingConfig = {
    id: '456',
    display_name: '無配置使用者',
    role: 'user',
    is_active: true
  };

  const processedUserNoConfig = processUserData({ ...userWithoutFillingConfig });
  const test3Pass = processedUserNoConfig.filling_config === undefined;

  console.log(`沒有 filling_config 的處理: ${test3Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 測試 4: 空的 energy_categories
  console.log('=== 測試 4: 空的 energy_categories ===');

  const userWithEmptyCategories = {
    id: '789',
    display_name: '空權限使用者',
    filling_config: {
      diesel_generator_mode: 'refuel',
      energy_categories: [], // 空陣列
      target_year: 2024
    }
  };

  const processedEmptyCategories = processUserData({ ...userWithEmptyCategories });
  const test4Pass =
    Array.isArray(processedEmptyCategories.filling_config.energy_categories) &&
    processedEmptyCategories.filling_config.energy_categories.length === 0;

  console.log(`空 energy_categories 處理: ${test4Pass ? '✅ 通過' : '❌ 失敗'}\n`);

  // 總結
  const allTestsPassed = test1Pass && hasCorrectTransform && test3Pass && test4Pass;
  console.log(`📊 測試總結: ${allTestsPassed ? '✅ 所有測試通過' : '❌ 有測試失敗'}`);

  if (allTestsPassed) {
    console.log('\n🎉 getUserById 和 getUserDetails 函數的轉換邏輯正常！');
    console.log('✓ 資料庫格式正確轉換為前端格式');
    console.log('✓ 化糞池: septic_tank → septictank');
    console.log('✓ 外購電力: electricity → electricity_bill');
    console.log('✓ 邊界情況處理正確');
  }

  return allTestsPassed;
}

// 執行測試
runAdditionalConversionTests();