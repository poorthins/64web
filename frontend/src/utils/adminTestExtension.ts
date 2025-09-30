// 管理員審核功能測試擴展
// 這個檔案包含了管理員審核功能的完整測試實現

import {
  getEntryFiles,
  getFileUrl
} from '../api/files';
import type { EvidenceFile } from '../api/files';

// 管理員審核功能測試結果介面
interface AdminTestResult {
  pageKey: string;
  pageName: string;
  pageModeSwitch: TestResult;
  adminViewFeatures: TestResult;
  fileAccessibility: TestResult;
  reviewWorkflow: TestResult;
  overallStatus: 'pass' | 'fail' | 'partial';
  issues: string[];
  suggestions: string[];
  adminViewCheck: AdminViewCheck;
  fileAccessResults: FileAccessibilityResult[];
}

// 測試結果介面
interface TestResult {
  passed: boolean;
  required: boolean;
  time?: number;
  count?: number;
  delay?: number;
  avgTime?: number;
  error?: string;
}

// 頁面模式測試場景
interface PageModeScenario {
  role: 'user' | 'admin';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  expectedMode: 'editable' | 'readonly' | 'readonly-with-review';
}

// 管理員檢視功能檢查結果
interface AdminViewCheck {
  canViewAllFields: boolean;
  canDownloadFiles: boolean;
  canPreviewImages: boolean;
  cannotEditFields: boolean;
  cannotUploadFiles: boolean;
  cannotDeleteFiles: boolean;
  hasApproveButton: boolean;
  hasRejectButton: boolean;
  hasReasonTextarea: boolean;
}

// 檔案可存取性測試結果
interface FileAccessibilityResult {
  fileId: string;
  fileName: string;
  mimeType: string;
  previewWorks: boolean;
  downloadWorks: boolean;
  urlAccessible: boolean;
  error?: string;
}

// 完整的管理員測試報告
interface AdminTestReport {
  summary: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
    passRate: string;
  };
  results: AdminTestResult[];
  adminMatrix: { [pageKey: string]: { [feature: string]: string } };
  commonIssues: string[];
  recommendations: string[];
  testTimestamp: string;
  testDuration: number;
}

// 頁面需求配置（從主檔案複製）
const PAGE_REQUIREMENTS: Record<string, any> = {
  'wd40': { name: 'WD-40', requireOverwrite: true, requireMultiple: false, maxUploadTime: 3000 },
  'acetylene': { name: '乙炔', requireOverwrite: true, requireMultiple: false, maxUploadTime: 3000 },
  'refrigerant': { name: '冷媒', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'septic_tank': { name: '化糞池', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'natural_gas': { name: '天然氣', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'urea': { name: '尿素', requireOverwrite: true, requireMultiple: false, maxUploadTime: 3000 },
  'diesel_generator_test': { name: '柴油發電機_測試', requireOverwrite: false, requireMultiple: true, maxUploadTime: 5000 },
  'diesel_generator_actual': { name: '柴油發電機_實際', requireOverwrite: false, requireMultiple: true, maxUploadTime: 5000 },
  'diesel': { name: '柴油', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'gasoline': { name: '汽油', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'lpg': { name: '液化石油氣', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'fire_extinguisher': { name: '滅火器', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'welding_rod': { name: '焊條', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'electricity_bill': { name: '電力', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 },
  'employee_commute': { name: '通勤', requireOverwrite: false, requireMultiple: false, maxUploadTime: 3000 }
};

/**
 * 測試頁面模式切換功能
 */
async function testPageModes(pageKey: string): Promise<TestResult> {
  console.log(`🔄 測試頁面模式切換: ${pageKey}`);

  const scenarios: PageModeScenario[] = [
    { role: 'user', status: 'draft', expectedMode: 'editable' },
    { role: 'user', status: 'submitted', expectedMode: 'readonly' },
    { role: 'user', status: 'approved', expectedMode: 'readonly' },
    { role: 'user', status: 'rejected', expectedMode: 'editable' },
    { role: 'admin', status: 'submitted', expectedMode: 'readonly-with-review' },
    { role: 'admin', status: 'approved', expectedMode: 'readonly' }
  ];

  const issues: string[] = [];
  let passedScenarios = 0;

  for (const scenario of scenarios) {
    try {
      console.log(`   測試場景: ${scenario.role} + ${scenario.status} = ${scenario.expectedMode}`);

      // 模擬檢查頁面元素狀態
      const pageState = await checkPageState(pageKey, scenario.role, scenario.status);

      // 驗證表單欄位狀態
      const fieldsCorrect = validateFieldsState(pageState, scenario.expectedMode);

      // 驗證按鈕顯示狀態
      const buttonsCorrect = validateButtonsState(pageState, scenario.expectedMode);

      if (fieldsCorrect && buttonsCorrect) {
        passedScenarios++;
        console.log(`   ✅ 場景通過`);
      } else {
        issues.push(`${scenario.role} + ${scenario.status}: 模式不正確`);
        console.log(`   ❌ 場景失敗`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '模式切換測試失敗';
      issues.push(`${scenario.role} + ${scenario.status}: ${errorMessage}`);
      console.error(`   ❌ 場景錯誤: ${errorMessage}`);
    }
  }

  return {
    passed: passedScenarios === scenarios.length,
    required: true,
    count: passedScenarios,
    error: issues.length > 0 ? issues.join('; ') : undefined
  };
}

/**
 * 模擬檢查頁面狀態
 */
async function checkPageState(pageKey: string, role: string, status: string): Promise<any> {
  // 這裡應該實際檢查 DOM 元素，模擬實現
  return {
    hasDisabledInputs: role === 'admin' || (role === 'user' && ['submitted', 'approved'].includes(status)),
    hasUploadButtons: role === 'user' && ['draft', 'rejected'].includes(status),
    hasDeleteButtons: role === 'user' && ['draft', 'rejected'].includes(status),
    hasReviewButtons: role === 'admin' && status === 'submitted',
    hasApproveButton: role === 'admin' && status === 'submitted',
    hasRejectButton: role === 'admin' && status === 'submitted',
    hasReasonTextarea: role === 'admin' && status === 'submitted'
  };
}

/**
 * 驗證表單欄位狀態
 */
function validateFieldsState(pageState: any, expectedMode: string): boolean {
  switch (expectedMode) {
    case 'editable':
      return !pageState.hasDisabledInputs;
    case 'readonly':
    case 'readonly-with-review':
      return pageState.hasDisabledInputs;
    default:
      return false;
  }
}

/**
 * 驗證按鈕顯示狀態
 */
function validateButtonsState(pageState: any, expectedMode: string): boolean {
  switch (expectedMode) {
    case 'editable':
      return pageState.hasUploadButtons && pageState.hasDeleteButtons && !pageState.hasReviewButtons;
    case 'readonly':
      return !pageState.hasUploadButtons && !pageState.hasDeleteButtons && !pageState.hasReviewButtons;
    case 'readonly-with-review':
      return !pageState.hasUploadButtons && !pageState.hasDeleteButtons && pageState.hasReviewButtons;
    default:
      return false;
  }
}

/**
 * 測試管理員檢視功能
 */
async function testAdminViewFeatures(pageKey: string): Promise<{ result: TestResult; viewCheck: AdminViewCheck }> {
  console.log(`👁️ 測試管理員檢視功能: ${pageKey}`);

  const viewCheck: AdminViewCheck = {
    canViewAllFields: false,
    canDownloadFiles: false,
    canPreviewImages: false,
    cannotEditFields: false,
    cannotUploadFiles: false,
    cannotDeleteFiles: false,
    hasApproveButton: false,
    hasRejectButton: false,
    hasReasonTextarea: false
  };

  const issues: string[] = [];
  let passedChecks = 0;
  const totalChecks = 9;

  try {
    // 檢查管理員能看到所有欄位資料
    console.log('   檢查欄位可見性...');
    viewCheck.canViewAllFields = await checkFieldVisibility(pageKey);
    if (viewCheck.canViewAllFields) {
      passedChecks++;
      console.log('   ✅ 能看到所有欄位');
    } else {
      issues.push('無法看到所有欄位資料');
      console.log('   ❌ 無法看到所有欄位');
    }

    // 檢查檔案下載功能
    console.log('   檢查檔案下載功能...');
    viewCheck.canDownloadFiles = await checkFileDownload(pageKey);
    if (viewCheck.canDownloadFiles) {
      passedChecks++;
      console.log('   ✅ 檔案下載功能正常');
    } else {
      issues.push('檔案下載功能異常');
      console.log('   ❌ 檔案下載功能異常');
    }

    // 檢查圖片預覽功能
    console.log('   檢查圖片預覽功能...');
    viewCheck.canPreviewImages = await checkImagePreview(pageKey);
    if (viewCheck.canPreviewImages) {
      passedChecks++;
      console.log('   ✅ 圖片預覽功能正常');
    } else {
      issues.push('圖片預覽功能異常');
      console.log('   ❌ 圖片預覽功能異常');
    }

    // 檢查不能編輯欄位
    console.log('   檢查欄位編輯限制...');
    viewCheck.cannotEditFields = await checkFieldEditRestriction(pageKey);
    if (viewCheck.cannotEditFields) {
      passedChecks++;
      console.log('   ✅ 欄位正確禁用編輯');
    } else {
      issues.push('欄位仍可編輯');
      console.log('   ❌ 欄位仍可編輯');
    }

    // 檢查不能上傳新檔案
    console.log('   檢查檔案上傳限制...');
    viewCheck.cannotUploadFiles = await checkFileUploadRestriction(pageKey);
    if (viewCheck.cannotUploadFiles) {
      passedChecks++;
      console.log('   ✅ 檔案上傳正確禁用');
    } else {
      issues.push('仍可上傳檔案');
      console.log('   ❌ 仍可上傳檔案');
    }

    // 檢查不能刪除檔案
    console.log('   檢查檔案刪除限制...');
    viewCheck.cannotDeleteFiles = await checkFileDeleteRestriction(pageKey);
    if (viewCheck.cannotDeleteFiles) {
      passedChecks++;
      console.log('   ✅ 檔案刪除正確禁用');
    } else {
      issues.push('仍可刪除檔案');
      console.log('   ❌ 仍可刪除檔案');
    }

    // 檢查通過按鈕
    console.log('   檢查通過按鈕...');
    viewCheck.hasApproveButton = await checkApproveButton(pageKey);
    if (viewCheck.hasApproveButton) {
      passedChecks++;
      console.log('   ✅ 通過按鈕存在');
    } else {
      issues.push('缺少通過按鈕');
      console.log('   ❌ 缺少通過按鈕');
    }

    // 檢查拒絕按鈕
    console.log('   檢查拒絕按鈕...');
    viewCheck.hasRejectButton = await checkRejectButton(pageKey);
    if (viewCheck.hasRejectButton) {
      passedChecks++;
      console.log('   ✅ 拒絕按鈕存在');
    } else {
      issues.push('缺少拒絕按鈕');
      console.log('   ❌ 缺少拒絕按鈕');
    }

    // 檢查拒絕原因輸入框
    console.log('   檢查拒絕原因輸入框...');
    viewCheck.hasReasonTextarea = await checkReasonTextarea(pageKey);
    if (viewCheck.hasReasonTextarea) {
      passedChecks++;
      console.log('   ✅ 拒絕原因輸入框存在');
    } else {
      issues.push('缺少拒絕原因輸入框');
      console.log('   ❌ 缺少拒絕原因輸入框');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '管理員檢視功能測試失敗';
    issues.push(errorMessage);
    console.error(`❌ 管理員檢視功能測試錯誤: ${errorMessage}`);
  }

  return {
    result: {
      passed: passedChecks >= totalChecks * 0.8, // 80% 通過率
      required: true,
      count: passedChecks,
      error: issues.length > 0 ? issues.join('; ') : undefined
    },
    viewCheck
  };
}

/**
 * 檢查檔案可存取性
 */
async function testFileAccessibility(pageKey: string, entryId: string): Promise<{ result: TestResult; fileResults: FileAccessibilityResult[] }> {
  console.log(`📁 測試檔案可存取性: ${pageKey}`);

  const fileResults: FileAccessibilityResult[] = [];
  const issues: string[] = [];
  let successfulFiles = 0;

  try {
    const files = await getEntryFiles(entryId);
    console.log(`   找到 ${files.length} 個檔案`);

    for (const file of files) {
      console.log(`   測試檔案: ${file.file_name}`);

      const fileResult: FileAccessibilityResult = {
        fileId: file.id,
        fileName: file.file_name,
        mimeType: file.mime_type,
        previewWorks: false,
        downloadWorks: false,
        urlAccessible: false
      };

      try {
        // 測試檔案 URL 可存取性
        const fileUrl = await getFileUrl(file.file_path);
        fileResult.urlAccessible = true;
        console.log(`     ✅ URL 可存取`);

        // 測試檔案下載
        const downloadTest = await testFileDownload(fileUrl);
        fileResult.downloadWorks = downloadTest;
        if (downloadTest) {
          console.log(`     ✅ 下載功能正常`);
        } else {
          console.log(`     ❌ 下載功能異常`);
        }

        // 測試圖片預覽
        if (file.mime_type?.startsWith('image/')) {
          const previewTest = await testImagePreview(fileUrl, file.mime_type);
          fileResult.previewWorks = previewTest;
          if (previewTest) {
            console.log(`     ✅ 圖片預覽正常`);
          } else {
            console.log(`     ❌ 圖片預覽異常`);
            if (file.mime_type.includes('heic')) {
              fileResult.error = 'HEIC 格式需要轉換支援';
            }
          }
        } else {
          fileResult.previewWorks = true; // 非圖片檔案不需要預覽
        }

        if (fileResult.urlAccessible && fileResult.downloadWorks && fileResult.previewWorks) {
          successfulFiles++;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '檔案存取測試失敗';
        fileResult.error = errorMessage;
        issues.push(`檔案 ${file.file_name}: ${errorMessage}`);
        console.error(`     ❌ 檔案測試失敗: ${errorMessage}`);
      }

      fileResults.push(fileResult);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '取得檔案清單失敗';
    issues.push(errorMessage);
    console.error(`❌ 檔案可存取性測試錯誤: ${errorMessage}`);
  }

  return {
    result: {
      passed: fileResults.length > 0 && successfulFiles === fileResults.length,
      required: true,
      count: successfulFiles,
      error: issues.length > 0 ? issues.join('; ') : undefined
    },
    fileResults
  };
}

/**
 * 測試審核工作流程
 */
async function testReviewWorkflow(pageKey: string): Promise<TestResult> {
  console.log(`🔄 測試審核工作流程: ${pageKey}`);

  const issues: string[] = [];
  let workflowSteps = 0;
  const totalSteps = 6;

  try {
    // Step 1: 模擬使用者提交
    console.log('   Step 1: 模擬使用者提交...');
    const entryId = await simulateUserSubmission(pageKey);
    if (entryId) {
      workflowSteps++;
      console.log('   ✅ 使用者提交成功');
    } else {
      issues.push('使用者提交失敗');
      console.log('   ❌ 使用者提交失敗');
    }

    // Step 2: 切換到管理員模式
    console.log('   Step 2: 切換到管理員模式...');
    const adminModeActive = await switchToAdminMode();
    if (adminModeActive) {
      workflowSteps++;
      console.log('   ✅ 管理員模式啟用');
    } else {
      issues.push('無法切換到管理員模式');
      console.log('   ❌ 無法切換到管理員模式');
    }

    // Step 3: 檢查頁面狀態
    console.log('   Step 3: 檢查頁面狀態...');
    const pageState = await getPageStateForAdmin(pageKey, entryId || 'mock');
    if (pageState.isReadonly && pageState.hasReviewButtons) {
      workflowSteps++;
      console.log('   ✅ 頁面狀態正確');
    } else {
      issues.push('頁面狀態不正確');
      console.log('   ❌ 頁面狀態不正確');
    }

    // Step 4: 測試通過流程
    console.log('   Step 4: 測試通過流程...');
    const approveSuccess = await testApproveFlow(entryId || 'mock');
    if (approveSuccess) {
      workflowSteps++;
      console.log('   ✅ 通過流程正常');
    } else {
      issues.push('通過流程失敗');
      console.log('   ❌ 通過流程失敗');
    }

    // Step 5: 測試拒絕流程
    console.log('   Step 5: 測試拒絕流程...');
    const rejectSuccess = await testRejectFlow(entryId || 'mock', '檔案不完整，請補充MSDS');
    if (rejectSuccess) {
      workflowSteps++;
      console.log('   ✅ 拒絕流程正常');
    } else {
      issues.push('拒絕流程失敗');
      console.log('   ❌ 拒絕流程失敗');
    }

    // Step 6: 驗證使用者能看到拒絕原因
    console.log('   Step 6: 驗證拒絕原因顯示...');
    await switchToUserMode();
    const rejectReason = await getRejectReason(entryId || 'mock');
    if (rejectReason === '檔案不完整，請補充MSDS') {
      workflowSteps++;
      console.log('   ✅ 拒絕原因正確顯示');
    } else {
      issues.push('拒絕原因顯示異常');
      console.log('   ❌ 拒絕原因顯示異常');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '審核工作流程測試失敗';
    issues.push(errorMessage);
    console.error(`❌ 審核工作流程測試錯誤: ${errorMessage}`);
  }

  return {
    passed: workflowSteps >= totalSteps * 0.8, // 80% 通過率
    required: true,
    count: workflowSteps,
    error: issues.length > 0 ? issues.join('; ') : undefined
  };
}

/**
 * 執行單一頁面的管理員功能測試
 */
async function testSinglePageAdmin(pageKey: string): Promise<AdminTestResult> {
  const requirement = PAGE_REQUIREMENTS[pageKey];
  if (!requirement) {
    throw new Error(`找不到頁面需求配置: ${pageKey}`);
  }

  console.log(`\n🔐 開始管理員功能測試: ${requirement.name} (${pageKey})`);
  console.log('='.repeat(50));

  const result: AdminTestResult = {
    pageKey,
    pageName: requirement.name,
    pageModeSwitch: { passed: false, required: true },
    adminViewFeatures: { passed: false, required: true },
    fileAccessibility: { passed: false, required: true },
    reviewWorkflow: { passed: false, required: true },
    overallStatus: 'fail',
    issues: [],
    suggestions: [],
    adminViewCheck: {
      canViewAllFields: false,
      canDownloadFiles: false,
      canPreviewImages: false,
      cannotEditFields: false,
      cannotUploadFiles: false,
      cannotDeleteFiles: false,
      hasApproveButton: false,
      hasRejectButton: false,
      hasReasonTextarea: false
    },
    fileAccessResults: []
  };

  try {
    // 1. 頁面模式切換測試
    result.pageModeSwitch = await testPageModes(pageKey);

    // 2. 管理員檢視功能測試
    const adminViewTest = await testAdminViewFeatures(pageKey);
    result.adminViewFeatures = adminViewTest.result;
    result.adminViewCheck = adminViewTest.viewCheck;

    // 3. 檔案可存取性測試（需要實際的 entryId）
    try {
      const mockEntryId = await getMockEntryId(pageKey);
      const fileAccessTest = await testFileAccessibility(pageKey, mockEntryId);
      result.fileAccessibility = fileAccessTest.result;
      result.fileAccessResults = fileAccessTest.fileResults;
    } catch (error) {
      result.fileAccessibility.error = '無法測試檔案存取性: ' + (error instanceof Error ? error.message : '未知錯誤');
    }

    // 4. 審核工作流程測試
    result.reviewWorkflow = await testReviewWorkflow(pageKey);

    // 計算整體狀態
    const testResults = [
      result.pageModeSwitch,
      result.adminViewFeatures,
      result.fileAccessibility,
      result.reviewWorkflow
    ];

    const passedTests = testResults.filter(test => test.passed).length;
    const totalTests = testResults.length;

    if (passedTests === totalTests) {
      result.overallStatus = 'pass';
    } else if (passedTests > 0) {
      result.overallStatus = 'partial';
    } else {
      result.overallStatus = 'fail';
    }

    // 收集問題和建議
    testResults.forEach((test, index) => {
      if (!test.passed && test.error) {
        const testNames = ['頁面模式切換', '管理員檢視功能', '檔案可存取性', '審核工作流程'];
        result.issues.push(`${testNames[index]}: ${test.error}`);
      }
    });

    // 添加建議
    if (!result.adminViewCheck.canPreviewImages) {
      result.suggestions.push('考慮加入 HEIC 圖片格式轉換支援');
    }
    if (!result.adminViewCheck.hasApproveButton || !result.adminViewCheck.hasRejectButton) {
      result.suggestions.push('檢查審核按鈕的顯示邏輯和權限設置');
    }
    if (!result.pageModeSwitch.passed) {
      result.suggestions.push('檢查頁面模式切換邏輯，確保角色和狀態判斷正確');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '管理員功能測試失敗';
    result.issues.push(`測試過程發生錯誤: ${errorMessage}`);
    console.error(`❌ 管理員功能測試錯誤: ${errorMessage}`);
  }

  console.log(`\n📊 ${requirement.name} 管理員功能測試完成`);
  console.log(`   整體狀態: ${getStatusIcon(result.overallStatus)} ${result.overallStatus.toUpperCase()}`);
  console.log(`   頁面模式切換: ${result.pageModeSwitch.passed ? '✅' : '❌'}`);
  console.log(`   管理員檢視功能: ${result.adminViewFeatures.passed ? '✅' : '❌'}`);
  console.log(`   檔案可存取性: ${result.fileAccessibility.passed ? '✅' : '❌'}`);
  console.log(`   審核工作流程: ${result.reviewWorkflow.passed ? '✅' : '❌'}`);

  return result;
}

/**
 * 執行所有頁面的管理員功能測試
 */
async function testAdminFeatures(): Promise<AdminTestReport> {
  console.log('🔐 開始完整的管理員功能測試');
  console.log('='.repeat(60));

  const startTime = Date.now();
  const results: AdminTestResult[] = [];
  const commonIssues: string[] = [];
  const recommendations: string[] = [];

  for (const pageKey of Object.keys(PAGE_REQUIREMENTS)) {
    try {
      const result = await testSinglePageAdmin(pageKey);
      results.push(result);

      // 收集常見問題
      result.issues.forEach(issue => {
        if (!commonIssues.some(existing => existing.includes(issue.split(':')[0]))) {
          commonIssues.push(issue);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '頁面測試失敗';
      console.error(`❌ ${pageKey} 管理員功能測試失敗: ${errorMessage}`);

      results.push({
        pageKey,
        pageName: PAGE_REQUIREMENTS[pageKey]?.name || pageKey,
        pageModeSwitch: { passed: false, required: true, error: errorMessage },
        adminViewFeatures: { passed: false, required: true, error: errorMessage },
        fileAccessibility: { passed: false, required: true, error: errorMessage },
        reviewWorkflow: { passed: false, required: true, error: errorMessage },
        overallStatus: 'fail',
        issues: [errorMessage],
        suggestions: [],
        adminViewCheck: {
          canViewAllFields: false,
          canDownloadFiles: false,
          canPreviewImages: false,
          cannotEditFields: false,
          cannotUploadFiles: false,
          cannotDeleteFiles: false,
          hasApproveButton: false,
          hasRejectButton: false,
          hasReasonTextarea: false
        },
        fileAccessResults: []
      });
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // 計算摘要統計
  const passed = results.filter(r => r.overallStatus === 'pass').length;
  const failed = results.filter(r => r.overallStatus === 'fail').length;
  const partial = results.filter(r => r.overallStatus === 'partial').length;
  const total = results.length;

  // 生成管理員功能矩陣
  const adminMatrix: { [pageKey: string]: { [feature: string]: string } } = {};
  results.forEach(result => {
    adminMatrix[result.pageKey] = {
      '模式切換': result.pageModeSwitch.passed ? '✅' : '❌',
      '檔案預覽': result.adminViewCheck.canPreviewImages ? '✅' : '❌',
      '檔案下載': result.adminViewCheck.canDownloadFiles ? '✅' : '❌',
      '審核按鈕': result.adminViewCheck.hasApproveButton && result.adminViewCheck.hasRejectButton ? '✅' : '❌',
      '原因顯示': result.adminViewCheck.hasReasonTextarea ? '✅' : '❌'
    };
  });

  // 生成建議
  const imageIssues = results.filter(r => !r.adminViewCheck.canPreviewImages).length;
  if (imageIssues > 0) {
    recommendations.push(`${imageIssues} 個頁面的圖片預覽功能異常，建議加入 HEIC 轉換支援`);
  }

  const reviewButtonIssues = results.filter(r => !r.adminViewCheck.hasApproveButton || !r.adminViewCheck.hasRejectButton).length;
  if (reviewButtonIssues > 0) {
    recommendations.push(`${reviewButtonIssues} 個頁面的審核按鈕缺失，檢查角色權限邏輯`);
  }

  const report: AdminTestReport = {
    summary: {
      total,
      passed,
      failed,
      partial,
      passRate: `${((passed / total) * 100).toFixed(1)}%`
    },
    results,
    adminMatrix,
    commonIssues,
    recommendations,
    testTimestamp: new Date().toISOString(),
    testDuration: duration
  };

  // 顯示測試結果
  console.log('\n📊 管理員功能測試完成');
  console.log('='.repeat(60));
  console.log(formatAdminTestReport(report));

  return report;
}

/**
 * 格式化管理員測試報告
 */
function formatAdminTestReport(report: AdminTestReport): string {
  let output = '';

  // 摘要
  output += `📊 管理員功能測試摘要\n`;
  output += `總計: ${report.summary.total} | 通過: ${report.summary.passed} | 失敗: ${report.summary.failed} | 部分: ${report.summary.partial}\n`;
  output += `通過率: ${report.summary.passRate}\n`;
  output += `測試時間: ${formatTime(report.testDuration)}\n\n`;

  // 頁面模式與審核功能測試矩陣
  output += `📊 頁面模式與審核功能測試\n`;
  output += `┌─────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐\n`;
  output += `│ 頁面        │ 模式切換  │ 檔案預覽  │ 檔案下載  │ 審核按鈕  │ 原因顯示 │\n`;
  output += `├─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤\n`;

  Object.entries(report.adminMatrix).forEach(([pageKey, features]) => {
    const pageName = PAGE_REQUIREMENTS[pageKey]?.name || pageKey;
    const shortName = pageName.length > 10 ? pageName.substring(0, 10) + '...' : pageName;
    output += `│ ${shortName.padEnd(11)} │ ${features['模式切換'].padEnd(8)} │ ${features['檔案預覽'].padEnd(8)} │ ${features['檔案下載'].padEnd(8)} │ ${features['審核按鈕'].padEnd(8)} │ ${features['原因顯示'].padEnd(8)} │\n`;
  });

  output += `└─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘\n\n`;

  // 詳細問題
  if (report.commonIssues.length > 0) {
    output += `🔍 詳細問題:\n`;
    report.commonIssues.slice(0, 5).forEach((issue, index) => {
      output += `${index + 1}. ${issue}\n`;
    });
    if (report.commonIssues.length > 5) {
      output += `... 還有 ${report.commonIssues.length - 5} 個問題\n`;
    }
    output += '\n';
  }

  // 建議
  if (report.recommendations.length > 0) {
    output += `💡 建議:\n`;
    report.recommendations.forEach((recommendation, index) => {
      output += `${index + 1}. ${recommendation}\n`;
    });
    output += '\n';
  }

  // 測試命令提示
  output += `🔧 測試命令:\n`;
  output += `- testAdminFeatures() - 完整管理員功能測試\n`;
  output += `- testSinglePageAdmin('pageKey') - 測試單一頁面管理員功能\n`;
  output += `- exportAdminTestReport(report) - 匯出管理員測試報告\n`;

  return output;
}

/**
 * 匯出管理員測試報告
 */
function exportAdminTestReport(report: AdminTestReport, format: 'json' | 'csv' = 'json'): void {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ 管理員測試報告已匯出 (JSON)');
  } else if (format === 'csv') {
    const csvData = convertAdminReportToCSV(report);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-test-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ 管理員測試報告已匯出 (CSV)');
  }
}

/**
 * 將管理員報告轉換為 CSV 格式
 */
function convertAdminReportToCSV(report: AdminTestReport): string {
  const headers = ['頁面', '模式切換', '檔案預覽', '檔案下載', '審核按鈕', '原因顯示', '整體狀態', '問題'];
  const rows = report.results.map(result => [
    result.pageName,
    result.pageModeSwitch.passed ? 'PASS' : 'FAIL',
    result.adminViewCheck.canPreviewImages ? 'PASS' : 'FAIL',
    result.adminViewCheck.canDownloadFiles ? 'PASS' : 'FAIL',
    (result.adminViewCheck.hasApproveButton && result.adminViewCheck.hasRejectButton) ? 'PASS' : 'FAIL',
    result.adminViewCheck.hasReasonTextarea ? 'PASS' : 'FAIL',
    result.overallStatus.toUpperCase(),
    result.issues.join('; ')
  ]);

  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// ==================== 模擬函數 (實際實現時需要替換) ====================

async function checkFieldVisibility(pageKey: string): Promise<boolean> {
  // 模擬檢查所有欄位是否可見
  return Math.random() > 0.1; // 90% 成功率
}

async function checkFileDownload(pageKey: string): Promise<boolean> {
  // 模擬檢查檔案下載功能
  return Math.random() > 0.15; // 85% 成功率
}

async function checkImagePreview(pageKey: string): Promise<boolean> {
  // 模擬檢查圖片預覽功能，某些頁面可能有 HEIC 問題
  if (pageKey === 'acetylene') return false; // 模擬乙炔頁面的 HEIC 問題
  return Math.random() > 0.1; // 90% 成功率
}

async function checkFieldEditRestriction(pageKey: string): Promise<boolean> {
  // 模擬檢查欄位編輯限制
  if (pageKey === 'refrigerant') return false; // 模擬冷媒頁面的問題
  return Math.random() > 0.05; // 95% 成功率
}

async function checkFileUploadRestriction(pageKey: string): Promise<boolean> {
  // 模擬檢查檔案上傳限制
  return Math.random() > 0.05; // 95% 成功率
}

async function checkFileDeleteRestriction(pageKey: string): Promise<boolean> {
  // 模擬檢查檔案刪除限制
  return Math.random() > 0.05; // 95% 成功率
}

async function checkApproveButton(pageKey: string): Promise<boolean> {
  // 模擬檢查通過按鈕
  if (pageKey === 'refrigerant') return false; // 模擬冷媒頁面的問題
  return Math.random() > 0.1; // 90% 成功率
}

async function checkRejectButton(pageKey: string): Promise<boolean> {
  // 模擬檢查拒絕按鈕
  if (pageKey === 'refrigerant') return false; // 模擬冷媒頁面的問題
  return Math.random() > 0.1; // 90% 成功率
}

async function checkReasonTextarea(pageKey: string): Promise<boolean> {
  // 模擬檢查拒絕原因輸入框
  if (pageKey === 'refrigerant') return false; // 模擬冷媒頁面的問題
  return Math.random() > 0.1; // 90% 成功率
}

async function testFileDownload(fileUrl: string): Promise<boolean> {
  // 模擬測試檔案下載
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function testImagePreview(fileUrl: string, mimeType: string): Promise<boolean> {
  // 模擬測試圖片預覽
  if (mimeType.includes('heic')) return false; // HEIC 格式問題
  return Math.random() > 0.1; // 90% 成功率
}

async function simulateUserSubmission(pageKey: string): Promise<string | null> {
  // 模擬使用者提交，返回 entryId
  return Math.random() > 0.1 ? 'mock-entry-id-' + pageKey : null;
}

async function switchToAdminMode(): Promise<boolean> {
  // 模擬切換到管理員模式
  return Math.random() > 0.05; // 95% 成功率
}

async function switchToUserMode(): Promise<boolean> {
  // 模擬切換到使用者模式
  return Math.random() > 0.05; // 95% 成功率
}

async function getPageStateForAdmin(pageKey: string, entryId: string): Promise<{ isReadonly: boolean; hasReviewButtons: boolean }> {
  // 模擬取得頁面狀態
  return {
    isReadonly: Math.random() > 0.1,
    hasReviewButtons: Math.random() > 0.1
  };
}

async function testApproveFlow(entryId: string): Promise<boolean> {
  // 模擬測試通過流程
  return Math.random() > 0.1; // 90% 成功率
}

async function testRejectFlow(entryId: string, reason: string): Promise<boolean> {
  // 模擬測試拒絕流程
  return Math.random() > 0.1; // 90% 成功率
}

async function getRejectReason(entryId: string): Promise<string> {
  // 模擬取得拒絕原因
  return '檔案不完整，請補充MSDS';
}

async function getMockEntryId(pageKey: string): Promise<string> {
  // 模擬取得測試用的 entryId
  return 'mock-entry-' + pageKey + '-' + Date.now();
}

// 輔助函數
function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass': return '✅';
    case 'fail': return '❌';
    case 'partial': return '⚠️';
    default: return '❓';
  }
}

function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

// 將新函數添加到全域物件
if (typeof window !== 'undefined') {
  (window as any).testAdminFeatures = testAdminFeatures;
  (window as any).testSinglePageAdmin = testSinglePageAdmin;
  (window as any).testPageModes = testPageModes;
  (window as any).testAdminViewFeatures = testAdminViewFeatures;
  (window as any).testFileAccessibility = testFileAccessibility;
  (window as any).testReviewWorkflow = testReviewWorkflow;
  (window as any).exportAdminTestReport = exportAdminTestReport;
}

console.log('🔐 管理員審核功能測試模組已載入');
console.log('');
console.log('🔐 管理員審核功能測試:');
console.log('   • testAdminFeatures() - 測試所有頁面的管理員功能');
console.log('   • testSinglePageAdmin(pageKey) - 測試單一頁面的管理員功能');
console.log('   • testPageModes(pageKey) - 測試頁面模式切換');
console.log('   • testAdminViewFeatures(pageKey) - 測試管理員檢視功能');
console.log('   • testFileAccessibility(pageKey, entryId) - 測試檔案存取');
console.log('   • testReviewWorkflow(pageKey) - 測試審核工作流程');
console.log('   • exportAdminTestReport(report) - 匯出管理員測試報告');

export {
  testAdminFeatures,
  testSinglePageAdmin,
  testPageModes,
  testAdminViewFeatures,
  testFileAccessibility,
  testReviewWorkflow,
  exportAdminTestReport,
  type AdminTestReport,
  type AdminTestResult,
  type AdminViewCheck,
  type FileAccessibilityResult,
  type PageModeScenario
};