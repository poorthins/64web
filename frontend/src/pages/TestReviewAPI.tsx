import React, { useState } from 'react'
import { testReviewAPI, testReviewOperations } from '../utils/testReviewAPI'

interface TestResults {
  pendingCount: number
  reviewedCount: number
  usersWithPendingCount: number
  approvedCount: number
  rejectedCount: number
}

export default function TestReviewAPI() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTests = async () => {
    setIsLoading(true)
    setError(null)
    setResults(null)

    try {
      console.log('Starting Review API tests...')
      const testResults = await testReviewAPI()
      setResults(testResults)
      
      // 也測試審核操作 (但不會實際執行)
      await testReviewOperations()
      
    } catch (err) {
      console.error('Test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Enhanced Review API Test
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API 功能測試</h2>
          <p className="text-gray-600 mb-4">
            測試增強版審核 API 的各項功能，包括獲取待審核項目、已審核項目、用戶列表等。
          </p>
          
          <button
            onClick={runTests}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isLoading ? '測試中...' : '開始測試'}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>錯誤:</strong> {error}
          </div>
        )}

        {results && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">測試結果</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800">待審核項目</h3>
                <p className="text-2xl font-bold text-blue-600">{results.pendingCount}</p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800">已通過項目</h3>
                <p className="text-2xl font-bold text-green-600">{results.approvedCount}</p>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800">已退回項目</h3>
                <p className="text-2xl font-bold text-red-600">{results.rejectedCount}</p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800">總已審核項目</h3>
                <p className="text-2xl font-bold text-purple-600">{results.reviewedCount}</p>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800">有待審項目的用戶</h3>
                <p className="text-2xl font-bold text-yellow-600">{results.usersWithPendingCount}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">測試說明</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ getPendingReviewEntries() - 獲取待審核項目</li>
                <li>✅ getReviewedEntries() - 獲取已審核項目</li>
                <li>✅ getUsersWithPendingEntries() - 獲取有待審項目的用戶</li>
                <li>✅ 篩選功能測試 (approved/rejected)</li>
                <li>⚠️ 審核操作測試 (已跳過以避免修改數據庫)</li>
              </ul>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              詳細測試結果請查看瀏覽器控制台 (F12)
            </div>
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">注意事項</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 此測試頁面僅用於驗證 API 功能，不會修改數據庫數據</li>
            <li>• 實際的審核操作 (approve/reject) 已被跳過</li>
            <li>• 請查看瀏覽器控制台獲取詳細的測試輸出</li>
            <li>• 確保以管理員身份登入才能執行測試</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
