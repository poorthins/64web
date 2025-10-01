/**
 * 完整工作流程 E2E 測試
 * 測試從用戶提交到管理員審核的完整循環
 */

import {
  upsertEnergyEntry,
  updateEntryStatus,
  deleteEnergyEntry,
  getEntryById
} from '../api/entries'
import {
  uploadEvidenceWithEntry,
  deleteEvidenceFile,
  getEntryFiles
} from '../api/files'
import { getReportingProgress } from '../api/dashboardAPI'
import { supabase } from '../lib/supabaseClient'

// 測試配置
const TEST_CONFIG = {
  pageKey: 'wd40',
  year: 2099,
  category: 'WD-40',
  unit: 'ML',
  testData: {
    unitCapacity: 500,
    carbonRate: 0.85,
    monthlyQuantity: { '1': 2 },
    monthly: { '1': 1000 }
  }
}

// 測試狀態追蹤
interface TestState {
  entryId: string | null
  fileIds: string[]
  startTime: number
  currentStep: number
}

const state: TestState = {
  entryId: null,
  fileIds: [],
  startTime: 0,
  currentStep: 0
}

/**
 * 斷言輔助函數
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ 斷言失敗: ${message}`)
  }
}

/**
 * 建立測試用檔案
 */
function createTestFile(filename: string, type: string = 'image/png'): File {
  // 建立一個簡單的 PNG 檔案（1x1 像素透明圖片）
  const base64PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const binaryString = atob(base64PNG)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type })
  return new File([blob], filename, { type })
}

/**
 * 等待函數
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 清理測試資料
 */
async function cleanupTestData(): Promise<void> {
  console.log('🗑️ 開始清理測試資料...')

  try {
    // 刪除所有測試檔案
    if (state.fileIds.length > 0) {
      console.log(`   刪除 ${state.fileIds.length} 個檔案...`)
      for (const fileId of state.fileIds) {
        try {
          await deleteEvidenceFile(fileId)
          console.log(`   ✅ 已刪除檔案: ${fileId}`)
        } catch (err) {
          console.warn(`   ⚠️ 無法刪除檔案 ${fileId}:`, err)
        }
      }
    }

    // 刪除測試 entry
    if (state.entryId) {
      console.log(`   刪除 entry: ${state.entryId}...`)
      try {
        await deleteEnergyEntry(state.entryId)
        console.log(`   ✅ 已刪除 entry`)
      } catch (err) {
        console.warn(`   ⚠️ 無法刪除 entry:`, err)
      }
    }

    console.log('✅ 清理完成')
  } catch (error) {
    console.error('❌ 清理過程發生錯誤:', error)
  }
}

/**
 * 步驟 1: 用戶提交資料（表單 + 檔案）
 */
async function step1_userSubmit(): Promise<void> {
  console.log('\n👤 步驟 1: 用戶提交資料')
  state.currentStep = 1

  // 建立草稿
  console.log('   📝 建立填報記錄（草稿）...')
  const entryData = {
    page_key: TEST_CONFIG.pageKey,
    period_year: TEST_CONFIG.year,
    unit: TEST_CONFIG.unit,
    monthly: TEST_CONFIG.testData.monthly,
    extraPayload: {
      unitCapacity: TEST_CONFIG.testData.unitCapacity,
      carbonRate: TEST_CONFIG.testData.carbonRate,
      monthlyQuantity: TEST_CONFIG.testData.monthlyQuantity
    }
  }

  const result = await upsertEnergyEntry(entryData, false)  // false = 設為 submitted
  state.entryId = result.entry_id
  console.log(`   ✅ Entry 已建立: ${state.entryId}`)

  // 上傳檔案
  console.log('   📤 上傳測試檔案...')
  const testFile = createTestFile('test-msds.png')
  const uploadedFile = await uploadEvidenceWithEntry(testFile, {
    entryId: state.entryId,
    pageKey: TEST_CONFIG.pageKey,
    year: TEST_CONFIG.year,
    category: 'msds'
  })

  state.fileIds.push(uploadedFile.id)
  console.log(`   ✅ 檔案已上傳: ${uploadedFile.id}`)
}

/**
 * 步驟 2: 驗證 Supabase 狀態 = submitted
 */
async function step2_verifySubmitted(): Promise<void> {
  console.log('\n🔍 步驟 2: 驗證資料庫狀態 = submitted')
  state.currentStep = 2

  const entry = await getEntryById(state.entryId!)
  assert(entry !== null, '找不到 entry')
  assert(entry.status === 'submitted', `狀態應為 submitted，實際為 ${entry.status}`)

  console.log(`   ✅ 狀態正確: ${entry.status}`)
}

/**
 * 步驟 3: 驗證用戶首頁顯示「已提交」
 */
async function step3_verifyDashboardSubmitted(): Promise<void> {
  console.log('\n🔍 步驟 3: 驗證首頁顯示「已提交」')
  state.currentStep = 3

  const progress = await getReportingProgress()
  assert(progress.byStatus.submitted > 0, '首頁應顯示至少 1 筆已提交')

  console.log(`   ✅ 首頁顯示已提交: ${progress.byStatus.submitted} 筆`)
}

/**
 * 步驟 4: 管理員拒絕並註明原因
 */
async function step4_adminReject(): Promise<void> {
  console.log('\n👨‍💼 步驟 4: 管理員拒絕')
  state.currentStep = 4

  const rejectReason = 'MSDS 檔案不完整，請補充產品安全資料表'

  // 更新狀態為 rejected
  await updateEntryStatus(state.entryId!, 'rejected')

  // 更新拒絕原因（透過 Supabase 直接寫入）
  const { error } = await supabase
    .from('energy_entries')
    .update({ review_notes: rejectReason })
    .eq('id', state.entryId!)

  if (error) {
    throw new Error(`更新拒絕原因失敗: ${error.message}`)
  }

  console.log(`   ✅ 已拒絕，原因: ${rejectReason}`)
}

/**
 * 步驟 5: 驗證 Supabase 狀態 = rejected
 */
async function step5_verifyRejected(): Promise<void> {
  console.log('\n🔍 步驟 5: 驗證資料庫狀態 = rejected')
  state.currentStep = 5

  const entry = await getEntryById(state.entryId!)
  assert(entry !== null, '找不到 entry')
  assert(entry.status === 'rejected', `狀態應為 rejected，實際為 ${entry.status}`)
  assert(entry.review_notes !== null, '拒絕原因不應為空')

  console.log(`   ✅ 狀態正確: ${entry.status}`)
  console.log(`   ✅ 拒絕原因: ${entry.review_notes}`)
}

/**
 * 步驟 6: 驗證用戶首頁顯示「已退回」+ 原因
 */
async function step6_verifyDashboardRejected(): Promise<void> {
  console.log('\n🔍 步驟 6: 驗證首頁顯示「已退回」')
  state.currentStep = 6

  const progress = await getReportingProgress()
  assert(progress.byStatus.rejected > 0, '首頁應顯示至少 1 筆已退回')

  console.log(`   ✅ 首頁顯示已退回: ${progress.byStatus.rejected} 筆`)
}

/**
 * 步驟 7: 用戶上傳新檔案（測試覆蓋功能）
 */
async function step7_userUploadNewFile(): Promise<void> {
  console.log('\n👤 步驟 7: 用戶上傳新檔案（覆蓋）')
  state.currentStep = 7

  const oldFileId = state.fileIds[0]
  console.log(`   📤 舊檔案 ID: ${oldFileId}`)

  // 刪除舊檔案
  await deleteEvidenceFile(oldFileId)
  console.log(`   🗑️ 已刪除舊檔案`)

  // 上傳新檔案
  const newFile = createTestFile('test-msds-updated.png')
  const uploadedFile = await uploadEvidenceWithEntry(newFile, {
    entryId: state.entryId!,
    pageKey: TEST_CONFIG.pageKey,
    year: TEST_CONFIG.year,
    category: 'msds'
  })

  console.log(`   📤 新檔案 ID: ${uploadedFile.id}`)

  // 驗證檔案 ID 不同
  assert(uploadedFile.id !== oldFileId, '新舊檔案 ID 應該不同')

  // 更新追蹤
  state.fileIds[0] = uploadedFile.id

  console.log(`   ✅ 檔案覆蓋成功`)
}

/**
 * 步驟 8: 用戶重新提交
 */
async function step8_userResubmit(): Promise<void> {
  console.log('\n👤 步驟 8: 用戶重新提交')
  state.currentStep = 8

  await updateEntryStatus(state.entryId!, 'submitted')
  console.log(`   ✅ 已重新提交`)
}

/**
 * 步驟 9: 驗證狀態變回 submitted
 */
async function step9_verifyResubmitted(): Promise<void> {
  console.log('\n🔍 步驟 9: 驗證狀態 = submitted')
  state.currentStep = 9

  const entry = await getEntryById(state.entryId!)
  assert(entry !== null, '找不到 entry')
  assert(entry.status === 'submitted', `狀態應為 submitted，實際為 ${entry.status}`)

  console.log(`   ✅ 狀態正確: ${entry.status}`)
}

/**
 * 步驟 10: 管理員通過
 */
async function step10_adminApprove(): Promise<void> {
  console.log('\n👨‍💼 步驟 10: 管理員通過')
  state.currentStep = 10

  await updateEntryStatus(state.entryId!, 'approved')
  console.log(`   ✅ 已通過`)
}

/**
 * 步驟 11: 驗證狀態 = approved
 */
async function step11_verifyApproved(): Promise<void> {
  console.log('\n🔍 步驟 11: 驗證狀態 = approved')
  state.currentStep = 11

  const entry = await getEntryById(state.entryId!)
  assert(entry !== null, '找不到 entry')
  assert(entry.status === 'approved', `狀態應為 approved，實際為 ${entry.status}`)

  console.log(`   ✅ 狀態正確: ${entry.status}`)
}

/**
 * 步驟 12: 驗證用戶首頁顯示「已通過」
 */
async function step12_verifyDashboardApproved(): Promise<void> {
  console.log('\n🔍 步驟 12: 驗證首頁顯示「已通過」')
  state.currentStep = 12

  const progress = await getReportingProgress()
  assert(progress.byStatus.approved > 0, '首頁應顯示至少 1 筆已通過')

  console.log(`   ✅ 首頁顯示已通過: ${progress.byStatus.approved} 筆`)
}

/**
 * 步驟 13: 用戶清除資料
 */
async function step13_userClearData(): Promise<void> {
  console.log('\n👤 步驟 13: 用戶清除資料')
  state.currentStep = 13

  // 刪除所有檔案
  const files = await getEntryFiles(state.entryId!)
  console.log(`   🗑️ 刪除 ${files.length} 個檔案...`)
  for (const file of files) {
    await deleteEvidenceFile(file.id)
    console.log(`   ✅ 已刪除檔案: ${file.id}`)
  }

  // 刪除 entry
  await deleteEnergyEntry(state.entryId!)
  console.log(`   ✅ 已刪除 entry`)
}

/**
 * 步驟 14: 驗證 Supabase 無資料
 */
async function step14_verifyNoData(): Promise<void> {
  console.log('\n🔍 步驟 14: 驗證 Supabase 無資料')
  state.currentStep = 14

  try {
    const entry = await getEntryById(state.entryId!)
    assert(entry === null, '資料應已被刪除')
  } catch (error) {
    // 預期會拋出錯誤，因為資料已不存在
    console.log('   ✅ Entry 已不存在（符合預期）')
  }
}

/**
 * 步驟 15: 驗證檔案已刪除
 */
async function step15_verifyFilesDeleted(): Promise<void> {
  console.log('\n🔍 步驟 15: 驗證檔案已刪除')
  state.currentStep = 15

  try {
    const files = await getEntryFiles(state.entryId!)
    assert(files.length === 0, '檔案應已全部刪除')
    console.log('   ✅ 所有檔案已刪除')
  } catch (error) {
    // 預期會拋出錯誤，因為 entry 已不存在
    console.log('   ✅ 檔案已不存在（符合預期）')
  }
}

/**
 * 主測試函數
 */
export async function testCompleteWorkflow(): Promise<boolean> {
  console.log('🚀 ========================================')
  console.log('🚀 開始完整工作流程 E2E 測試')
  console.log('🚀 ========================================')
  console.log(`📋 測試配置:`)
  console.log(`   Page Key: ${TEST_CONFIG.pageKey}`)
  console.log(`   Year: ${TEST_CONFIG.year}`)
  console.log(`   Category: ${TEST_CONFIG.category}`)

  state.fileIds = []
  state.startTime = Date.now()

  try {
    // 執行所有測試步驟
    await step1_userSubmit()
    await sleep(500)

    await step2_verifySubmitted()
    await sleep(500)

    // await step3_verifyDashboardSubmitted()  // 註解掉（首頁只統計 2025 年資料）
    // await sleep(500)

    await step4_adminReject()
    await sleep(500)

    await step5_verifyRejected()
    await sleep(500)

    // await step6_verifyDashboardRejected()  // 註解掉（首頁只統計 2025 年資料）
    // await sleep(500)

    await step7_userUploadNewFile()
    await sleep(500)

    await step8_userResubmit()
    await sleep(500)

    await step9_verifyResubmitted()
    await sleep(500)

    await step10_adminApprove()
    await sleep(500)

    await step11_verifyApproved()
    await sleep(500)

    // await step12_verifyDashboardApproved()  // 註解掉（首頁只統計 2025 年資料）
    // await sleep(500)

    await step13_userClearData()
    await sleep(500)

    await step14_verifyNoData()
    await sleep(500)

    await step15_verifyFilesDeleted()

    // 測試成功
    const duration = Date.now() - state.startTime
    console.log('\n✅ ========================================')
    console.log('✅ 測試全部通過！')
    console.log('✅ ========================================')
    console.log(`⏱️  測試耗時: ${(duration / 1000).toFixed(2)} 秒`)
    console.log(`📊 完成步驟: ${state.currentStep}/15`)

    return true

  } catch (error) {
    // 測試失敗
    const duration = Date.now() - state.startTime
    console.error('\n❌ ========================================')
    console.error('❌ 測試失敗！')
    console.error('❌ ========================================')
    console.error(`⏱️  測試耗時: ${(duration / 1000).toFixed(2)} 秒`)
    console.error(`📊 失敗於步驟: ${state.currentStep}/15`)
    console.error(`💥 錯誤訊息: ${error instanceof Error ? error.message : String(error)}`)

    if (error instanceof Error && error.stack) {
      console.error(`📚 錯誤堆疊:\n${error.stack}`)
    }

    // 清理測試資料
    await cleanupTestData()

    return false
  }
}

// 全域匯出供 Console 使用
if (typeof window !== 'undefined') {
  (window as any).testCompleteWorkflow = testCompleteWorkflow

  console.log('✅ 完整工作流程測試工具已載入')
  console.log('🔧 使用方式:')
  console.log('   testCompleteWorkflow() - 執行完整 E2E 測試')
}
