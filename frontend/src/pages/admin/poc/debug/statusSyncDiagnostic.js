// 狀態同步診斷工具
// 在瀏覽器控制台中使用：copy(diagnosticScript) 然後貼上執行

const diagnosticScript = `
console.log('🔍 開始狀態同步診斷...');

// 1. 檢查 statusManager 實例
console.log('\\n📦 1. 檢查 statusManager 實例');
try {
  // 嘗試獲取 statusManager 實例
  const statusManagerModule = await import('/src/pages/admin/poc/utils/statusManager.ts');
  const statusManager = statusManagerModule.statusManager;

  console.log('✅ statusManager 實例已找到');

  // 檢查當前資料
  const allSubmissions = statusManager.getAllSubmissions();
  console.log('📊 當前提交記錄數量:', allSubmissions.length);

  const stats = statusManager.calculateStats();
  console.log('📈 當前統計:', stats);

  // 2. 檢查 localStorage
  console.log('\\n💾 2. 檢查 localStorage 資料');
  const stored = localStorage.getItem('poc_submissions');
  if (stored) {
    const data = JSON.parse(stored);
    console.log('✅ localStorage 有資料，記錄數量:', data.length);

    // 檢查已通過的項目
    const approvedItems = data.filter(item => item.status === 'approved');
    console.log('✅ 已通過項目:', approvedItems.length, '筆');
    approvedItems.forEach(item => {
      console.log('   -', item.id, '|', item.userName, '|', item.categoryName);
    });

    // 檢查已退回的項目
    const rejectedItems = data.filter(item => item.status === 'rejected');
    console.log('❌ 已退回項目:', rejectedItems.length, '筆');
    rejectedItems.forEach(item => {
      console.log('   -', item.id, '|', item.userName, '|', item.categoryName, '| 原因:', item.reviewNotes || '無');
    });
  } else {
    console.log('❌ localStorage 無資料');
  }

  // 3. 測試狀態變更
  console.log('\\n🧪 3. 測試狀態變更功能');

  // 找一個已通過的項目來測試
  const approvedSubmission = allSubmissions.find(s => s.status === 'approved');
  if (approvedSubmission) {
    console.log('找到已通過項目進行測試:', approvedSubmission.id, approvedSubmission.userName);

    // 嘗試退回
    console.log('🔄 測試：將已通過項目退回...');

    const result = await statusManager.changeStatus(
      approvedSubmission.id,
      'rejected',
      '診斷工具測試退回'
    );

    console.log('📝 變更結果:', result);

    if (result.success) {
      // 檢查變更後的狀態
      const updatedSubmission = statusManager.getAllSubmissions().find(s => s.id === approvedSubmission.id);
      console.log('✅ 變更後狀態:', updatedSubmission.status);

      // 檢查統計是否更新
      const newStats = statusManager.calculateStats();
      console.log('📊 新統計:', newStats);

      // 檢查 localStorage 是否同步
      const newStored = JSON.parse(localStorage.getItem('poc_submissions'));
      const storedItem = newStored.find(s => s.id === approvedSubmission.id);
      console.log('💾 localStorage 中的狀態:', storedItem.status);

      // 恢復原狀態
      console.log('🔄 恢復原狀態...');
      await statusManager.changeStatus(approvedSubmission.id, 'approved', '恢復測試');
      console.log('✅ 已恢復原狀態');
    }
  } else {
    console.log('❌ 沒有找到已通過的項目進行測試');
  }

  // 4. 檢查監聽器
  console.log('\\n👂 4. 檢查狀態變更監聽器');

  // 添加測試監聽器
  const testListener = (event) => {
    console.log('🔔 監聽到狀態變更:', event);
  };

  statusManager.addListener(testListener);
  console.log('✅ 測試監聽器已添加');

  // 測試監聽器
  const testSubmission = allSubmissions.find(s => s.status === 'submitted');
  if (testSubmission) {
    console.log('🧪 測試監聽器...');
    await statusManager.changeStatus(testSubmission.id, 'approved', '監聽器測試');
    // 立即恢復
    await statusManager.changeStatus(testSubmission.id, 'submitted', '恢復測試');
  }

  // 移除測試監聽器
  statusManager.removeListener(testListener);
  console.log('✅ 測試監聽器已移除');

  console.log('\\n🎉 診斷完成！');

} catch (error) {
  console.error('❌ 診斷過程中發生錯誤:', error);
}
`;

console.log('診斷腳本已準備完成。');
console.log('請在瀏覽器中：');
console.log('1. 打開 http://localhost:5174/app/admin/poc');
console.log('2. 打開開發者工具控制台');
console.log('3. 執行以下命令：');
console.log('');
console.log(diagnosticScript);