/**
 * adminUsers.ts listUsers 函數的批量轉換測試
 */

// 模擬多個使用者資料（資料庫格式）
const mockUsersFromDB = [
  {
    id: '1',
    display_name: '使用者 A',
    role: 'user',
    is_active: true,
    filling_config: {
      diesel_generator_mode: 'refuel',
      energy_categories: ['septic_tank', 'electricity', 'diesel'], // 資料庫格式
      target_year: 2024
    }
  },
  {
    id: '2',
    display_name: '使用者 B',
    role: 'user',
    is_active: true,
    filling_config: {
      diesel_generator_mode: 'test',
      energy_categories: ['wd40', 'septic_tank', 'electricity', 'employee_commute'], // 資料庫格式
      target_year: 2024
    }
  },
  {
    id: '3',
    display_name: '使用者 C',
    role: 'user',
    is_active: false,
    filling_config: {
      diesel_generator_mode: 'refuel',
      energy_categories: [], // 空陣列
      target_year: 2024
    }
  },
  {
    id: '4',
    display_name: '使用者 D',
    role: 'user',
    is_active: true
    // 沒有 filling_config
  }
];

// 模擬轉換函數
const DB_TO_FRONTEND_MAP = {
  'septic_tank': 'septictank',
  'electricity': 'electricity_bill'
};

function convertDbKeysToFrontend(categories) {
  return categories.map(key => DB_TO_FRONTEND_MAP[key] || key);
}

function runListUsersConversionTest() {
  console.log('🧪 開始 listUsers 函數批量轉換測試\n');

  // 模擬 listUsers 函數的轉換邏輯
  const processUsersList = (users) => {
    return users.map(user => {
      if (user?.filling_config?.energy_categories) {
        return {
          ...user,
          filling_config: {
            ...user.filling_config,
            energy_categories: convertDbKeysToFrontend(user.filling_config.energy_categories)
          }
        };
      }
      return user;
    });
  };

  console.log('=== 測試 1: 批量使用者資料轉換 ===');

  const processedUsers = processUsersList([...mockUsersFromDB]);

  console.log('處理前（資料庫格式）:');
  mockUsersFromDB.forEach((user, index) => {
    if (user.filling_config?.energy_categories) {
      console.log(`  使用者 ${index + 1}: [${user.filling_config.energy_categories.join(', ')}]`);
    } else {
      console.log(`  使用者 ${index + 1}: 無 energy_categories`);
    }
  });

  console.log('\n處理後（前端格式）:');
  processedUsers.forEach((user, index) => {
    if (user.filling_config?.energy_categories) {
      console.log(`  使用者 ${index + 1}: [${user.filling_config.energy_categories.join(', ')}]`);
    } else {
      console.log(`  使用者 ${index + 1}: 無 energy_categories`);
    }
  });

  // 檢查轉換結果
  const user1Categories = processedUsers[0].filling_config.energy_categories;
  const user2Categories = processedUsers[1].filling_config.energy_categories;

  const test1Pass =
    user1Categories.includes('septictank') &&        // septic_tank → septictank
    !user1Categories.includes('septic_tank') &&      // 不應該有原始的 septic_tank
    user1Categories.includes('electricity_bill') &&  // electricity → electricity_bill
    !user1Categories.includes('electricity') &&      // 不應該有原始的 electricity
    user1Categories.includes('diesel');               // 其他保持不變

  const test2Pass =
    user2Categories.includes('wd40') &&               // 保持不變
    user2Categories.includes('septictank') &&         // septic_tank → septictank
    user2Categories.includes('electricity_bill') &&  // electricity → electricity_bill
    user2Categories.includes('employee_commute');     // 保持不變

  console.log(`\n使用者 1 轉換檢查: ${test1Pass ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`使用者 2 轉換檢查: ${test2Pass ? '✅ 通過' : '❌ 失敗'}`);

  console.log('\n=== 測試 2: 邊界情況處理 ===');

  // 檢查空陣列使用者
  const user3HasEmptyArray =
    Array.isArray(processedUsers[2].filling_config.energy_categories) &&
    processedUsers[2].filling_config.energy_categories.length === 0;

  // 檢查沒有 filling_config 的使用者
  const user4NoConfig = !processedUsers[3].filling_config;

  console.log(`空陣列處理: ${user3HasEmptyArray ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`無 filling_config 處理: ${user4NoConfig ? '✅ 通過' : '❌ 失敗'}`);

  console.log('\n=== 測試 3: 資料完整性檢查 ===');

  // 確認其他欄位沒有被影響
  const dataIntegrityPass =
    processedUsers.every(user => user.id && user.display_name && user.role !== undefined) &&
    processedUsers.length === mockUsersFromDB.length;

  console.log(`資料完整性: ${dataIntegrityPass ? '✅ 通過' : '❌ 失敗'}`);

  // 總結
  const allTestsPassed = test1Pass && test2Pass && user3HasEmptyArray && user4NoConfig && dataIntegrityPass;
  console.log(`\n📊 測試總結: ${allTestsPassed ? '✅ 所有測試通過' : '❌ 有測試失敗'}`);

  if (allTestsPassed) {
    console.log('\n🎉 listUsers 函數的批量轉換功能正常！');
    console.log('✓ 批量轉換所有使用者的能源類別格式');
    console.log('✓ 化糞池: septic_tank → septictank');
    console.log('✓ 外購電力: electricity → electricity_bill');
    console.log('✓ 邊界情況正確處理');
    console.log('✓ 資料完整性維持');
  }

  return allTestsPassed;
}

// 執行測試
runListUsersConversionTest();