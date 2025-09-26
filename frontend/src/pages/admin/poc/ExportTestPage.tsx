import React, { useState } from 'react'
import { runAllTests } from './test/exportTest'
import { runAllUserExportTests } from './test/userExportTest'
import { exportUserData, exportDepartmentData, demonstrateFileRenaming } from './utils/exportUtils'

const ExportTestPage: React.FC = () => {
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [isRunningUserTests, setIsRunningUserTests] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [userTestResults, setUserTestResults] = useState<any>(null)

  const handleRunTests = async () => {
    setIsRunningTests(true)
    try {
      const results = runAllTests()
      setTestResults(results)
      console.log('🎉 測試完成！請查看控制台詳細結果。')
    } catch (error) {
      console.error('❌ 測試執行失敗:', error)
    } finally {
      setIsRunningTests(false)
    }
  }

  const handleRunUserTests = async () => {
    setIsRunningUserTests(true)
    try {
      const results = await runAllUserExportTests()
      setUserTestResults(results)
      console.log('🎉 用戶匯出測試完成！請查看控制台詳細結果。')
    } catch (error) {
      console.error('❌ 用戶匯出測試執行失敗:', error)
    } finally {
      setIsRunningUserTests(false)
    }
  }

  const handleTestExport = async (type: 'user' | 'department') => {
    setIsExporting(true)
    try {
      switch (type) {
        case 'user':
          await exportUserData('1') // 測試用戶 ID
          break
        case 'department':
          await exportDepartmentData('研發部')
          break
      }
      console.log(`✅ ${type} 匯出測試成功`)
    } catch (error) {
      console.error(`❌ ${type} 匯出測試失敗:`, error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDemoRenaming = () => {
    demonstrateFileRenaming()
    console.log('🔄 智慧命名展示完成，請查看控制台')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            匯出功能測試頁面 🧪
          </h1>
          <p className="text-gray-600">
            測試 POC 的批量匯出和智慧檔案命名功能
          </p>
        </div>

        {/* 測試控制區 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* 單元測試 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🧪</span>
              單元測試
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isRunningTests ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    執行測試中...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    執行完整測試套件
                  </>
                )}
              </button>

              <button
                onClick={handleDemoRenaming}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <span className="mr-2">🔄</span>
                智慧命名展示
              </button>

              {testResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">測試結果</h3>
                  <div className="text-sm space-y-1">
                    <div className={`${testResults.renamingResults.failedTests === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      📁 智慧命名: {testResults.renamingResults.passedTests}/{testResults.renamingResults.totalTests} 通過
                    </div>
                    <div className={`${testResults.duplicateResults ? 'text-green-600' : 'text-red-600'}`}>
                      🔄 重複處理: {testResults.duplicateResults ? '✅ 通過' : '❌ 失敗'}
                    </div>
                    <div className={`${testResults.timestampResults ? 'text-green-600' : 'text-red-600'}`}>
                      ⏰ 時間戳: {testResults.timestampResults ? '✅ 通過' : '❌ 失敗'}
                    </div>
                    <div className={`font-medium ${testResults.allTestsPassed ? 'text-green-600' : 'text-red-600'}`}>
                      🎉 整體: {testResults.allTestsPassed ? '全部通過' : '部分失敗'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 單一用戶匯出測試 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👤</span>
              單一用戶匯出
            </h2>

            <div className="space-y-4">
              <button
                onClick={handleRunUserTests}
                disabled={isRunningUserTests}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isRunningUserTests ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    測試中...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🧪</span>
                    執行用戶匯出測試
                  </>
                )}
              </button>

              {userTestResults && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">用戶匯出測試結果</h3>
                  <div className="text-sm space-y-1">
                    <div className={`${userTestResults.results.complete ? 'text-green-600' : 'text-red-600'}`}>
                      ✅ 完整功能: {userTestResults.results.complete ? '通過' : '失敗'}
                    </div>
                    <div className={`${userTestResults.results.options ? 'text-green-600' : 'text-red-600'}`}>
                      🎯 選項組合: {userTestResults.results.options ? '通過' : '失敗'}
                    </div>
                    <div className={`${userTestResults.results.multiple ? 'text-green-600' : 'text-red-600'}`}>
                      👥 多用戶: {userTestResults.results.multiple ? '通過' : '失敗'}
                    </div>
                    <div className={`${userTestResults.results.error ? 'text-green-600' : 'text-red-600'}`}>
                      ⚠️ 錯誤處理: {userTestResults.results.error ? '通過' : '失敗'}
                    </div>
                    <div className={`font-medium ${userTestResults.allPassed ? 'text-green-600' : 'text-red-600'}`}>
                      🎉 整體: {userTestResults.allPassed ? '全部通過' : '部分失敗'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 匯出測試 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📦</span>
              匯出測試
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => handleTestExport('user')}
                disabled={isExporting}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-left"
              >
                <span className="mr-2">👤</span>
                測試個人匯出 (王小明)
              </button>

              <button
                onClick={() => handleTestExport('department')}
                disabled={isExporting}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-left"
              >
                <span className="mr-2">🏢</span>
                測試部門匯出 (研發部)
              </button>

              {isExporting && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-3"></div>
                  <span className="text-blue-700 text-sm">匯出中，請稍候...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 功能說明 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            功能說明
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">智慧檔案命名</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 偵測 MSDS 檔案並標註為安全資料表</li>
                <li>• 識別月份資訊並加入時間標籤</li>
                <li>• 自動處理年度和季度檔案</li>
                <li>• 重複檔名自動加序號</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">批量匯出功能</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Excel 多工作表生成</li>
                <li>• ZIP 檔案打包與分類</li>
                <li>• 模擬檔案內容生成</li>
                <li>• 規範化資料夾結構</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">單一用戶匯出</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 可選擇匯出資料類型</li>
                <li>• 基本資料與填報記錄</li>
                <li>• 審核狀態與退回原因</li>
                <li>• 檔案清單與月度數據</li>
                <li>• Excel 格式結構化輸出</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">💡 測試說明</h4>
            <p className="text-sm text-yellow-700">
              執行測試後請查看瀏覽器控制台 (F12) 查看詳細結果。
              匯出測試會產生實際的檔案下載，請檢查下載資料夾中的 ZIP 檔案。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportTestPage