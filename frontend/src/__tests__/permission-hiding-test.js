/**
 * 能源類別權限隱藏系統測試
 *
 * 測試目標：
 * 1. 管理員看到所有 14 個能源類別
 * 2. 一般使用者只看到有權限的類別
 * 3. Winnie 使用者看不到 WD-40
 * 4. 如果整個範疇都沒權限，連範疇標題都隱藏
 */

// 模擬的權限資料
const mockPermissions = {
  admin: {
    isAdmin: true,
    energy_categories: ['wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea', 'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod', 'electricity', 'employee_commute']
  },
  winnie: {
    isAdmin: false,
    energy_categories: ['acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea', 'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod', 'electricity', 'employee_commute']
    // 注意：沒有 'wd40'
  },
  limitedUser: {
    isAdmin: false,
    energy_categories: ['diesel', 'gasoline'] // 只有範疇一的部分類別
  },
  scope2OnlyUser: {
    isAdmin: false,
    energy_categories: ['electricity'] // 只有範疇二
  },
  noPermissionUser: {
    isAdmin: false,
    energy_categories: [] // 沒有任何權限
  }
};

// 能源類別配置
const ENERGY_CATEGORIES_BY_SCOPE = {
  scope1: ['wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea', 'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod'],
  scope2: ['electricity'],
  scope3: ['employee_commute']
};

const ALL_ENERGY_CATEGORIES = [
  'wd40', 'acetylene', 'refrigerant', 'septic_tank', 'natural_gas', 'urea',
  'diesel_generator', 'diesel', 'gasoline', 'lpg', 'fire_extinguisher', 'welding_rod',
  'electricity', 'employee_commute'
];

// 模擬權限檢查函數
function hasPermissionSync(userPermissions, category) {
  if (userPermissions.isAdmin) return true;
  return userPermissions.energy_categories.includes(category);
}

// 模擬過濾函數
function filterByPermissions(userPermissions, items, keyGetter) {
  if (userPermissions.isAdmin) return items;
  return items.filter(item => hasPermissionSync(userPermissions, keyGetter(item)));
}

// 模擬可見範疇獲取函數
function getVisibleScopes(userPermissions) {
  if (userPermissions.isAdmin) {
    return ['scope1', 'scope2', 'scope3'];
  }

  const visibleScopes = [];
  Object.entries(ENERGY_CATEGORIES_BY_SCOPE).forEach(([scope, categories]) => {
    const hasAnyCategory = categories.some(category => hasPermissionSync(userPermissions, category));
    if (hasAnyCategory) {
      visibleScopes.push(scope);
    }
  });

  return visibleScopes;
}

// 測試函數
function runPermissionTests() {
  console.log('🧪 開始能源類別權限隱藏系統測試\n');

  // 測試 1: 管理員權限
  console.log('=== 測試 1: 管理員權限 ===');
  const adminVisibleScopes = getVisibleScopes(mockPermissions.admin);
  const adminVisibleCategories = ALL_ENERGY_CATEGORIES.filter(cat => hasPermissionSync(mockPermissions.admin, cat));

  console.log(`✓ 管理員可見範疇: ${adminVisibleScopes.join(', ')}`);
  console.log(`✓ 管理員可見類別數量: ${adminVisibleCategories.length}/14`);
  console.log(`✓ 管理員是否看到 WD-40: ${hasPermissionSync(mockPermissions.admin, 'wd40') ? '是' : '否'}`);
  console.log(`✓ 測試結果: ${adminVisibleCategories.length === 14 && adminVisibleScopes.length === 3 ? '通過' : '失敗'}\n`);

  // 測試 2: Winnie 使用者權限
  console.log('=== 測試 2: Winnie 使用者權限 ===');
  const winnieVisibleScopes = getVisibleScopes(mockPermissions.winnie);
  const winnieVisibleCategories = ALL_ENERGY_CATEGORIES.filter(cat => hasPermissionSync(mockPermissions.winnie, cat));
  const winnieCanSeeWD40 = hasPermissionSync(mockPermissions.winnie, 'wd40');

  console.log(`✓ Winnie 可見範疇: ${winnieVisibleScopes.join(', ')}`);
  console.log(`✓ Winnie 可見類別數量: ${winnieVisibleCategories.length}/14`);
  console.log(`✓ Winnie 是否看到 WD-40: ${winnieCanSeeWD40 ? '是' : '否'}`);
  console.log(`✓ Winnie 看不到的類別: ${ALL_ENERGY_CATEGORIES.filter(cat => !hasPermissionSync(mockPermissions.winnie, cat)).join(', ')}`);
  console.log(`✓ 測試結果: ${!winnieCanSeeWD40 && winnieVisibleCategories.length === 13 ? '通過' : '失敗'}\n`);

  // 測試 3: 限制權限使用者（只有部分範疇一）
  console.log('=== 測試 3: 限制權限使用者 ===');
  const limitedVisibleScopes = getVisibleScopes(mockPermissions.limitedUser);
  const limitedVisibleCategories = ALL_ENERGY_CATEGORIES.filter(cat => hasPermissionSync(mockPermissions.limitedUser, cat));

  console.log(`✓ 限制用戶可見範疇: ${limitedVisibleScopes.join(', ')}`);
  console.log(`✓ 限制用戶可見類別: ${limitedVisibleCategories.join(', ')}`);
  console.log(`✓ 限制用戶可見類別數量: ${limitedVisibleCategories.length}/14`);
  console.log(`✓ 測試結果: ${limitedVisibleScopes.length === 1 && limitedVisibleScopes[0] === 'scope1' ? '通過' : '失敗'}\n`);

  // 測試 4: 只有範疇二權限的使用者
  console.log('=== 測試 4: 只有範疇二權限的使用者 ===');
  const scope2OnlyVisibleScopes = getVisibleScopes(mockPermissions.scope2OnlyUser);
  const scope2OnlyVisibleCategories = ALL_ENERGY_CATEGORIES.filter(cat => hasPermissionSync(mockPermissions.scope2OnlyUser, cat));

  console.log(`✓ 範疇二用戶可見範疇: ${scope2OnlyVisibleScopes.join(', ')}`);
  console.log(`✓ 範疇二用戶可見類別: ${scope2OnlyVisibleCategories.join(', ')}`);
  console.log(`✓ 範疇二用戶可見類別數量: ${scope2OnlyVisibleCategories.length}/14`);
  console.log(`✓ 測試結果: ${scope2OnlyVisibleScopes.length === 1 && scope2OnlyVisibleScopes[0] === 'scope2' ? '通過' : '失敗'}\n`);

  // 測試 5: 無權限使用者
  console.log('=== 測試 5: 無權限使用者 ===');
  const noPermVisibleScopes = getVisibleScopes(mockPermissions.noPermissionUser);
  const noPermVisibleCategories = ALL_ENERGY_CATEGORIES.filter(cat => hasPermissionSync(mockPermissions.noPermissionUser, cat));

  console.log(`✓ 無權限用戶可見範疇: ${noPermVisibleScopes.length === 0 ? '無' : noPermVisibleScopes.join(', ')}`);
  console.log(`✓ 無權限用戶可見類別: ${noPermVisibleCategories.length === 0 ? '無' : noPermVisibleCategories.join(', ')}`);
  console.log(`✓ 無權限用戶可見類別數量: ${noPermVisibleCategories.length}/14`);
  console.log(`✓ 測試結果: ${noPermVisibleScopes.length === 0 && noPermVisibleCategories.length === 0 ? '通過' : '失敗'}\n`);

  // 測試 6: 進度計算測試
  console.log('=== 測試 6: 進度計算測試 ===');
  const mockEntries = [
    { pageKey: 'wd40', status: 'approved' },
    { pageKey: 'diesel', status: 'approved' },
    { pageKey: 'electricity', status: 'approved' },
    { pageKey: 'gasoline', status: 'pending' },
    { pageKey: 'acetylene', status: 'submitted' }
  ];

  // 管理員進度計算
  const adminVisibleEntries = filterByPermissions(mockPermissions.admin, mockEntries, e => e.pageKey);
  const adminCompletedCount = adminVisibleEntries.filter(e => e.status === 'approved').length;
  const adminTotalCount = ALL_ENERGY_CATEGORIES.length;

  console.log(`✓ 管理員可見項目: ${adminVisibleEntries.length}`);
  console.log(`✓ 管理員已完成項目: ${adminCompletedCount}`);
  console.log(`✓ 管理員總項目: ${adminTotalCount}`);

  // Winnie 進度計算
  const winnieVisibleEntries = filterByPermissions(mockPermissions.winnie, mockEntries, e => e.pageKey);
  const winnieCompletedCount = winnieVisibleEntries.filter(e => e.status === 'approved').length;
  const winnieTotalCount = mockPermissions.winnie.energy_categories.length;

  console.log(`✓ Winnie 可見項目: ${winnieVisibleEntries.length}`);
  console.log(`✓ Winnie 已完成項目: ${winnieCompletedCount}`);
  console.log(`✓ Winnie 總項目: ${winnieTotalCount}`);
  console.log(`✓ Winnie 是否看到 WD-40 項目: ${winnieVisibleEntries.some(e => e.pageKey === 'wd40') ? '是' : '否'}`);

  console.log('\n🎉 測試完成！');

  // 總結
  const allTestsPassed =
    adminVisibleCategories.length === 14 &&
    !winnieCanSeeWD40 &&
    winnieVisibleCategories.length === 13 &&
    limitedVisibleScopes.length === 1 &&
    scope2OnlyVisibleScopes.length === 1 &&
    noPermVisibleScopes.length === 0 &&
    !winnieVisibleEntries.some(e => e.pageKey === 'wd40');

  console.log(`\n📊 總測試結果: ${allTestsPassed ? '✅ 全部通過' : '❌ 有測試失敗'}`);

  return allTestsPassed;
}

// 執行測試
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runPermissionTests };
} else {
  // 在瀏覽器中執行
  runPermissionTests();
}