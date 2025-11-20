/**
 * API v2 測試腳本
 * 用於驗證前後端整合
 *
 * 執行方式：
 * 1. 確保後端運行在 http://localhost:5000
 * 2. 確保用戶已登入
 * 3. 在瀏覽器 console 執行此檔案中的函式
 */

import { carbonAPI } from './carbonAPI'
import { entryAPI } from './entryAPI'
import { fileAPI } from './fileAPI'

/**
 * 測試碳排放計算 API
 */
export async function testCarbonAPI() {
  console.log('🧪 Testing Carbon API...')

  try {
    const result = await carbonAPI.calculateCarbon({
      page_key: 'diesel',
      monthly_data: {
        '1': 100,
        '2': 150,
        '3': 200
      },
      year: 2024
    })

    console.log('✅ Carbon API Success:', result)
    console.log(`Total Emission: ${result.total_emission} kgCO2e`)
    console.log(`Emission Factor: ${result.emission_factor}`)
    return result
  } catch (error) {
    console.error('❌ Carbon API Failed:', error)
    throw error
  }
}

/**
 * 測試能源條目提交 API
 */
export async function testEntryAPI() {
  console.log('🧪 Testing Entry API...')

  try {
    // 先提交
    const submitResult = await entryAPI.submitEnergyEntry({
      page_key: 'diesel',
      period_year: 2024,
      unit: '公升',
      monthly: {
        '1': 100,
        '2': 150
      },
      notes: 'API v2 測試提交',
      status: 'submitted'
    })

    console.log('✅ Entry Submit Success:', submitResult)

    // 再更新
    const updateResult = await entryAPI.updateEnergyEntry(submitResult.entry_id, {
      monthly: {
        '1': 120,
        '2': 160
      },
      notes: 'API v2 測試更新'
    })

    console.log('✅ Entry Update Success:', updateResult)
    return { submitResult, updateResult }
  } catch (error) {
    console.error('❌ Entry API Failed:', error)
    throw error
  }
}

/**
 * 測試檔案上傳 API
 * 需要提供檔案物件
 */
export async function testFileAPI(file: File, entryId: string) {
  console.log('🧪 Testing File API...')

  try {
    // 上傳檔案
    const uploadResult = await fileAPI.uploadEvidenceFile(file, {
      page_key: 'diesel',
      period_year: 2024,
      file_type: 'usage_evidence',
      month: 1,
      entry_id: entryId,
      standard: '64'
    })

    console.log('✅ File Upload Success:', uploadResult)

    // 刪除檔案
    const deleteResult = await fileAPI.deleteEvidenceFile(uploadResult.file_id)

    console.log('✅ File Delete Success:', deleteResult)
    return { uploadResult, deleteResult }
  } catch (error) {
    console.error('❌ File API Failed:', error)
    throw error
  }
}

/**
 * 執行所有測試（除了檔案上傳）
 */
export async function runAllTests() {
  console.log('🚀 Running all API v2 tests...\n')

  try {
    // 測試 Carbon API
    await testCarbonAPI()
    console.log('\n')

    // 測試 Entry API
    await testEntryAPI()
    console.log('\n')

    console.log('✅ All tests passed!')
  } catch (error) {
    console.error('❌ Tests failed:', error)
  }
}

/**
 * 使用範例
 *
 * 在瀏覽器 console:
 *
 * ```javascript
 * // 匯入測試模組
 * import * as apiTest from './src/api/v2/__test_api__'
 *
 * // 執行所有測試
 * await apiTest.runAllTests()
 *
 * // 或個別測試
 * await apiTest.testCarbonAPI()
 * await apiTest.testEntryAPI()
 *
 * // 測試檔案上傳（需要先準備檔案和 entry_id）
 * const fileInput = document.createElement('input')
 * fileInput.type = 'file'
 * fileInput.onchange = async (e) => {
 *   const file = e.target.files[0]
 *   const entryId = 'your-entry-id'
 *   await apiTest.testFileAPI(file, entryId)
 * }
 * fileInput.click()
 * ```
 */
