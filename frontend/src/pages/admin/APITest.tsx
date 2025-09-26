import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from './components/PageHeader'
import { apiTester, type APIConnectionTester } from './test/apiConnectionTest'

interface TestResult {
  success: boolean
  results: Record<string, any>
  errors: Record<string, Error>
}

const APITest: React.FC = () => {
  const navigate = useNavigate()
  const [isTestingRead, setIsTestingRead] = useState(false)
  const [isTestingWrite, setIsTestingWrite] = useState(false)
  const [readResults, setReadResults] = useState<TestResult | null>(null)
  const [writeResults, setWriteResults] = useState<TestResult | null>(null)
  const [showDetails, setShowDetails] = useState<string | null>(null)

  const handleReadAPITest = async () => {
    setIsTestingRead(true)
    setReadResults(null)

    try {
      console.log('🚀 開始讀取 API 測試...')
      const results = await apiTester.testReadAPIs()
      setReadResults(results)

      // 同時執行資料轉換測試
      await apiTester.testDataConversion()

    } catch (error) {
      console.error('API 測試發生錯誤：', error)
      setReadResults({
        success: false,
        results: {},
        errors: { general: error as Error }
      })
    } finally {
      setIsTestingRead(false)
    }
  }

  const handleWriteAPITest = async () => {
    if (!window.confirm('此測試將建立測試用戶資料，確定要繼續嗎？')) {
      return
    }

    setIsTestingWrite(true)
    setWriteResults(null)

    try {
      console.log('⚠️  開始寫入 API 測試...')
      const results = await apiTester.testWriteAPIs()
      setWriteResults(results)
    } catch (error) {
      console.error('寫入 API 測試發生錯誤：', error)
      setWriteResults({
        success: false,
        results: {},
        errors: { general: error as Error }
      })
    } finally {
      setIsTestingWrite(false)
    }
  }

  const renderAPIResult = (testName: string, result: any) => {
    if (!result) return null

    const isExpanded = showDetails === testName

    return (
      <div key={testName} className="border border-gray-200 rounded-lg p-4 mb-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setShowDetails(isExpanded ? null : testName)}
        >
          <div className="flex items-center space-x-3">
            <span className={`text-2xl ${result.success ? '✅' : '❌'}`}>
              {result.success ? '✅' : '❌'}
            </span>
            <div>
              <h4 className="font-medium text-gray-900">{testName}</h4>
              <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.message || (result.success ? '測試成功' : result.error)}
              </p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-700 mb-2">詳細結果：</h5>
              <pre className="text-xs text-gray-600 overflow-auto max-h-60">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    )
  }

  const getTestReport = () => {
    if (!readResults && !writeResults) return null

    const report = apiTester.getTestReport()
    return report
  }

  const testReport = getTestReport()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="API 連接測試 🔗"
          subtitle="測試所有管理員 API 的連接性和資料格式相容性"
          currentPage="api-test"
        />

        {/* 測試說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <span className="mr-2">ℹ️</span>
            測試說明
          </h2>
          <div className="text-blue-800 space-y-2">
            <p><strong>第一批（讀取 API）</strong>：安全測試，只讀取資料不會修改</p>
            <p><strong>第二批（寫入 API）</strong>：會建立測試用戶，執行前請確認</p>
            <p><strong>資料轉換</strong>：測試 Mock 資料與 API 資料的格式轉換</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 第一批：讀取 API 測試 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📖</span>
              第一批：讀取 API 測試
            </h2>

            <div className="mb-4">
              <button
                onClick={handleReadAPITest}
                disabled={isTestingRead}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isTestingRead ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    測試中...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🚀</span>
                    開始讀取 API 測試
                  </>
                )}
              </button>
            </div>

            {readResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">測試結果</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    readResults.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {readResults.success ? '全部通過' : '部分失敗'}
                  </span>
                </div>

                {Object.keys(readResults.results).map(testName =>
                  renderAPIResult(testName, readResults.results[testName])
                )}
              </div>
            )}
          </div>

          {/* 第二批：寫入 API 測試 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">✏️</span>
              第二批：寫入 API 測試
            </h2>

            <div className="mb-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 text-sm flex items-center">
                  <span className="mr-2">⚠️</span>
                  此測試會建立測試用戶，請謹慎執行
                </p>
              </div>

              <button
                onClick={handleWriteAPITest}
                disabled={isTestingWrite}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
              >
                {isTestingWrite ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    測試中...
                  </>
                ) : (
                  <>
                    <span className="mr-2">⚠️</span>
                    開始寫入 API 測試
                  </>
                )}
              </button>
            </div>

            {writeResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-800">測試結果</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    writeResults.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {writeResults.success ? '測試完成' : '部分失敗'}
                  </span>
                </div>

                {Object.keys(writeResults.results)
                  .filter(key => !['listUsers', 'combineUsersWithCounts', 'getAllUsersWithSubmissions', 'getSubmissionStats'].includes(key))
                  .map(testName =>
                    renderAPIResult(testName, writeResults.results[testName])
                  )}
              </div>
            )}
          </div>
        </div>

        {/* 測試報告 */}
        {testReport && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              測試報告
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{testReport.summary.total}</div>
                <div className="text-sm text-blue-800">總測試數</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{testReport.summary.successful}</div>
                <div className="text-sm text-green-800">成功</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{testReport.summary.failed}</div>
                <div className="text-sm text-red-800">失敗</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{testReport.summary.successRate}</div>
                <div className="text-sm text-purple-800">成功率</div>
              </div>
            </div>

            {testReport.recommendations.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">建議事項：</h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  {testReport.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Mock vs API 資料差異說明 */}
        <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">🔄</span>
            Mock vs API 資料結構差異
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">用戶資料結構</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="mb-2"><strong>Mock 有但 API 沒有：</strong></p>
                <ul className="text-gray-600 ml-4 mb-3">
                  <li>• department（部門）</li>
                  <li>• avatar（頭像）</li>
                  <li>• status（狀態）</li>
                </ul>

                <p className="mb-2"><strong>API 有但 Mock 沒有：</strong></p>
                <ul className="text-gray-600 ml-4 mb-3">
                  <li>• company（公司）</li>
                  <li>• job_title（職位）</li>
                  <li>• phone（電話）</li>
                  <li>• filling_config（配置）</li>
                </ul>

                <p className="mb-2"><strong>格式不同：</strong></p>
                <ul className="text-gray-600 ml-4">
                  <li>• name → display_name</li>
                  <li>• entries → entries_count</li>
                  <li>• status → 需由 is_active + review_history 計算</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-3">提交資料結構</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="mb-2"><strong>Mock 有但 API 沒有：</strong></p>
                <ul className="text-gray-600 ml-4 mb-3">
                  <li>• userName（用戶名稱）</li>
                  <li>• userDepartment（用戶部門）</li>
                  <li>• co2Emission（CO2排放量）</li>
                  <li>• priority（優先級）</li>
                </ul>

                <p className="mb-2"><strong>API 有但 Mock 沒有：</strong></p>
                <ul className="text-gray-600 ml-4 mb-3">
                  <li>• period_start（期間開始）</li>
                  <li>• period_end（期間結束）</li>
                  <li>• is_locked（是否鎖定）</li>
                  <li>• approved_at（通過時間）</li>
                </ul>

                <p className="mb-2"><strong>格式不同：</strong></p>
                <ul className="text-gray-600 ml-4">
                  <li>• submissionDate → created_at (ISO format)</li>
                  <li>• reviewDate → review_history 中取得</li>
                  <li>• status → review_history 最新狀態</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/app/admin')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            返回主控台
          </button>

          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              重新整理
            </button>

            <button
              onClick={() => {
                const report = getTestReport()
                if (report) {
                  console.log('完整測試報告：', report)
                  alert('完整測試報告已輸出到 Console，請按 F12 查看')
                }
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              輸出完整報告
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default APITest