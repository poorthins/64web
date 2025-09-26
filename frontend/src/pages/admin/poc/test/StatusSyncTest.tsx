import React, { useState, useEffect } from 'react'
import { useStatusManager } from '../hooks/useStatusManager'
import { statusManager } from '../utils/statusManager'

const StatusSyncTest: React.FC = () => {
  const {
    submissions,
    stats,
    loading,
    error,
    changeStatus
  } = useStatusManager(false)

  const [testResults, setTestResults] = useState<string[]>([])
  const [isRunningTest, setIsRunningTest] = useState(false)

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const runStatusChangeTest = async () => {
    setIsRunningTest(true)
    setTestResults([])

    try {
      addTestResult('🔍 開始狀態同步測試')

      // 找一個已通過的項目
      const approvedSubmission = submissions.find(s => s.status === 'approved')
      if (!approvedSubmission) {
        addTestResult('❌ 找不到已通過的項目進行測試')
        return
      }

      addTestResult(`📝 測試項目: ${approvedSubmission.id} - ${approvedSubmission.userName}`)
      addTestResult(`📊 初始狀態: ${approvedSubmission.status}`)

      // 檢查初始統計
      const initialStats = statusManager.calculateStats()
      addTestResult(`📈 初始統計 - 已通過: ${initialStats.approved}, 已退回: ${initialStats.rejected}`)

      // 執行狀態變更：approved → rejected
      addTestResult('🔄 執行狀態變更: approved → rejected')

      const result = await changeStatus(approvedSubmission.id, 'rejected', '測試退回原因')

      addTestResult(`📝 變更結果: ${result.success ? '成功' : '失敗'} - ${result.message}`)

      if (result.success) {
        // 等待一段時間讓監聽器處理
        await new Promise(resolve => setTimeout(resolve, 500))

        // 檢查 statusManager 中的實際狀態
        const updatedSubmission = statusManager.getAllSubmissions().find(s => s.id === approvedSubmission.id)
        addTestResult(`🔍 statusManager 中的狀態: ${updatedSubmission?.status}`)

        // 檢查 localStorage 中的狀態
        const storedData = JSON.parse(localStorage.getItem('poc_submissions') || '[]')
        const storedSubmission = storedData.find((s: any) => s.id === approvedSubmission.id)
        addTestResult(`💾 localStorage 中的狀態: ${storedSubmission?.status}`)

        // 檢查 Hook 返回的資料
        const hookSubmission = submissions.find(s => s.id === approvedSubmission.id)
        addTestResult(`🎣 Hook 返回的狀態: ${hookSubmission?.status}`)

        // 檢查新統計
        const newStats = statusManager.calculateStats()
        addTestResult(`📈 新統計 - 已通過: ${newStats.approved}, 已退回: ${newStats.rejected}`)

        // 恢復原狀態
        addTestResult('🔄 恢復原狀態: rejected → approved')
        const restoreResult = await changeStatus(approvedSubmission.id, 'approved', '恢復測試狀態')
        addTestResult(`📝 恢復結果: ${restoreResult.success ? '成功' : '失敗'}`)
      }

      addTestResult('✅ 測試完成')

    } catch (error) {
      addTestResult(`❌ 測試過程中發生錯誤: ${error}`)
    } finally {
      setIsRunningTest(false)
    }
  }

  const clearLocalStorage = () => {
    localStorage.removeItem('poc_submissions')
    addTestResult('🧹 已清除 localStorage')
    window.location.reload()
  }

  if (loading) {
    return <div className="p-4">載入中...</div>
  }

  if (error) {
    return <div className="p-4 text-red-600">錯誤: {error}</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">狀態同步測試工具</h1>

      {/* 當前統計 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">當前統計</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
            <div className="text-sm text-gray-600">已提交</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-sm text-gray-600">已通過</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <div className="text-sm text-gray-600">已退回</div>
          </div>
        </div>
      </div>

      {/* 測試按鈕 */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">測試操作</h2>
        <div className="space-x-4">
          <button
            onClick={runStatusChangeTest}
            disabled={isRunningTest}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunningTest ? '測試進行中...' : '執行狀態變更測試'}
          </button>
          <button
            onClick={clearLocalStorage}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            清除 localStorage
          </button>
        </div>
      </div>

      {/* 測試結果 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">測試結果</h2>
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-gray-500">尚未執行測試</div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index}>{result}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 提交記錄列表 */}
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">提交記錄（前10筆）</h2>
        <div className="space-y-2">
          {submissions.slice(0, 10).map(submission => (
            <div key={submission.id} className="flex items-center justify-between p-2 border rounded">
              <div>
                <span className="font-medium">{submission.userName}</span>
                <span className="text-gray-500 ml-2">{submission.categoryName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  submission.status === 'approved' ? 'bg-green-100 text-green-800' :
                  submission.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {submission.status}
                </span>
                <span className="text-xs text-gray-400">{submission.id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StatusSyncTest