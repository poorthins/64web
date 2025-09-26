import React, { useState, useEffect } from 'react'
import { useStatusManager, useStatusStats } from './hooks/useStatusManager'
import {
  SubmissionStatus,
  STATUS_LABELS,
  getStatusIcon,
  getStatusStyle,
  formatTimestamp
} from './utils/statusManager'
import { SubmissionRecord, allSubmissions, TEST_SCENARIOS } from './data/mockData'
import RejectModal from './components/RejectModal'
import UserViewSimulator from './UserViewSimulator'
import StatsCard from './components/StatsCard'

const StatusFlowTest: React.FC = () => {
  const {
    submissions,
    stats,
    loading,
    error,
    changeStatus,
    bulkChangeStatus,
    getSubmissionsByStatus,
    getStatusHistory,
    isValidTransition,
    getAvailableTransitions,
    refresh,
    reset
  } = useStatusManager(false) // 不自動刷新，手動控制

  const [selectedStatus, setSelectedStatus] = useState<SubmissionStatus>('submitted')
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingSubmission, setRejectingSubmission] = useState<SubmissionRecord | null>(null)
  const [selectedSubmissionForUser, setSelectedSubmissionForUser] = useState<string>('')
  const [testResults, setTestResults] = useState<Array<{
    id: string
    test: string
    result: 'pass' | 'fail' | 'pending'
    message: string
    timestamp: string
  }>>([])

  // 篩選當前狀態的提交記錄
  const filteredSubmissions = getSubmissionsByStatus(selectedStatus)

  // 處理單個選擇
  const handleSubmissionSelect = (submissionId: string, checked: boolean) => {
    const newSelection = new Set(selectedSubmissions)
    if (checked) {
      newSelection.add(submissionId)
    } else {
      newSelection.delete(submissionId)
    }
    setSelectedSubmissions(newSelection)
  }

  // 處理全選
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissions(new Set(filteredSubmissions.map(s => s.id)))
    } else {
      setSelectedSubmissions(new Set())
    }
  }

  // 處理狀態變更
  const handleStatusChange = async (submissionId: string, newStatus: SubmissionStatus, reason?: string) => {
    try {
      const result = await changeStatus(submissionId, newStatus, reason)

      addTestResult({
        test: `狀態變更: ${submissionId} → ${STATUS_LABELS[newStatus]}`,
        result: result.success ? 'pass' : 'fail',
        message: result.message
      })

      if (result.success) {
        // 清除選擇
        setSelectedSubmissions(new Set())
      }

      return result
    } catch (error) {
      addTestResult({
        test: `狀態變更錯誤: ${submissionId}`,
        result: 'fail',
        message: error instanceof Error ? error.message : '未知錯誤'
      })
      throw error
    }
  }

  // 處理批量狀態變更
  const handleBulkStatusChange = async (newStatus: SubmissionStatus, reason?: string) => {
    if (selectedSubmissions.size === 0) {
      alert('請先選擇要變更的項目')
      return
    }

    try {
      const result = await bulkChangeStatus(Array.from(selectedSubmissions), newStatus, reason)

      addTestResult({
        test: `批量狀態變更: ${selectedSubmissions.size} 項 → ${STATUS_LABELS[newStatus]}`,
        result: result.successful.length > 0 ? 'pass' : 'fail',
        message: `成功 ${result.successful.length} 項，失敗 ${result.failed.length} 項`
      })

      setSelectedSubmissions(new Set())
      return result
    } catch (error) {
      addTestResult({
        test: `批量狀態變更錯誤`,
        result: 'fail',
        message: error instanceof Error ? error.message : '未知錯誤'
      })
      throw error
    }
  }

  // 快速通過
  const handleQuickApprove = async (submissionId: string) => {
    return handleStatusChange(submissionId, 'approved', '通過審核')
  }

  // 開啟退回對話框
  const handleRejectClick = (submission: SubmissionRecord) => {
    setRejectingSubmission(submission)
    setShowRejectModal(true)
  }

  // 確認退回
  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingSubmission) return

    try {
      await handleStatusChange(rejectingSubmission.id, 'rejected', reason)
      setShowRejectModal(false)
      setRejectingSubmission(null)
    } catch (error) {
      // 錯誤已在 handleStatusChange 中處理
    }
  }

  // 執行測試案例
  const runTestScenario = async (scenarioName: keyof typeof TEST_SCENARIOS) => {
    const testIds = TEST_SCENARIOS[scenarioName]

    addTestResult({
      test: `開始執行測試場景: ${scenarioName}`,
      result: 'pending',
      message: `測試項目: ${testIds.join(', ')}`
    })

    try {
      for (const testId of testIds) {
        const submission = allSubmissions.find(s => s.id === testId)
        if (!submission) {
          addTestResult({
            test: `測試項目不存在: ${testId}`,
            result: 'fail',
            message: '找不到對應的提交記錄'
          })
          continue
        }

        // 根據場景執行不同的測試
        switch (scenarioName) {
          case 'normalFlow':
            if (testId === 'sub_001') {
              await handleStatusChange(testId, 'approved', '正常審核通過')
            } else if (testId === 'sub_002') {
              await handleStatusChange(testId, 'rejected', '需要補充資料')
            }
            break

          case 'errorCorrection':
            await handleStatusChange(testId, 'rejected', '發現數據錯誤，需重新確認')
            break

          case 'reReview':
            if (submission.status === 'rejected') {
              await handleStatusChange(testId, 'approved', '重新審核通過')
            }
            break

          case 'batchTest':
            // 批量測試將在迴圈後處理
            break
        }

        await new Promise(resolve => setTimeout(resolve, 500)) // 延遲避免過快
      }

      // 執行批量測試
      if (scenarioName === 'batchTest') {
        await handleBulkStatusChange('approved', '批量審核通過')
      }

      addTestResult({
        test: `測試場景完成: ${scenarioName}`,
        result: 'pass',
        message: '所有測試項目執行完畢'
      })

    } catch (error) {
      addTestResult({
        test: `測試場景失敗: ${scenarioName}`,
        result: 'fail',
        message: error instanceof Error ? error.message : '測試執行失敗'
      })
    }
  }

  // 新增測試結果
  const addTestResult = (result: Omit<typeof testResults[0], 'id' | 'timestamp'>) => {
    const newResult = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...result
    }
    setTestResults(prev => [...prev, newResult])
  }

  // 清除測試結果
  const clearTestResults = () => {
    setTestResults([])
  }

  // 重置所有資料
  const handleReset = () => {
    reset()
    setSelectedSubmissions(new Set())
    setSelectedSubmissionForUser('')
    setTestResults([])
    addTestResult({
      test: '系統重置',
      result: 'pass',
      message: '所有資料已重置為初始狀態'
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">載入中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          🧪 狀態流程測試系統
        </h1>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 刷新
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 重置
          </button>
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(stats).map(([status, count]) => {
          const statusKey = status as SubmissionStatus
          const style = getStatusStyle(statusKey)
          return (
            <div
              key={status}
              onClick={() => setSelectedStatus(statusKey)}
              className={`
                p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${selectedStatus === statusKey
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-600">{STATUS_LABELS[statusKey]}</div>
                </div>
                <div className="text-3xl">{getStatusIcon(statusKey)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 主要內容區域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左側：管理員操作面板 */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                📋 {STATUS_LABELS[selectedStatus]} ({filteredSubmissions.length})
              </h2>

              {/* 批量操作按鈕 */}
              <div className="flex gap-2">
                {selectedSubmissions.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkStatusChange('approved', '批量審核通過')}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      批量通過 ({selectedSubmissions.size})
                    </button>
                    <button
                      onClick={() => handleBulkStatusChange('rejected', '批量退回')}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      批量退回 ({selectedSubmissions.size})
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 全選選項 */}
            {filteredSubmissions.length > 0 && (
              <div className="mb-3">
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="mr-2"
                  />
                  全選 ({filteredSubmissions.length} 項)
                </label>
              </div>
            )}

            {/* 提交記錄列表 */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>目前沒有 {STATUS_LABELS[selectedStatus]} 的記錄</p>
                </div>
              ) : (
                filteredSubmissions.map(submission => (
                  <SubmissionListItem
                    key={submission.id}
                    submission={submission}
                    isSelected={selectedSubmissions.has(submission.id)}
                    onSelect={(checked) => handleSubmissionSelect(submission.id, checked)}
                    onApprove={() => handleQuickApprove(submission.id)}
                    onReject={() => handleRejectClick(submission)}
                    onUserViewSelect={() => setSelectedSubmissionForUser(submission.id)}
                    getAvailableTransitions={getAvailableTransitions}
                    onStatusChange={handleStatusChange}
                  />
                ))
              )}
            </div>
          </div>

          {/* 測試場景按鈕 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold mb-3">🧪 測試場景</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => runTestScenario('normalFlow')}
                className="p-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                正常審核流程
              </button>
              <button
                onClick={() => runTestScenario('errorCorrection')}
                className="p-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                修正錯誤流程
              </button>
              <button
                onClick={() => runTestScenario('reReview')}
                className="p-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                重新審核流程
              </button>
              <button
                onClick={() => runTestScenario('batchTest')}
                className="p-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                批量操作測試
              </button>
            </div>
          </div>
        </div>

        {/* 右側：使用者端視角 */}
        <div className="space-y-4">
          <UserViewSimulator
            selectedSubmissionId={selectedSubmissionForUser}
            onSubmissionSelect={setSelectedSubmissionForUser}
          />

          {/* 測試結果 */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">📊 測試結果</h3>
              <button
                onClick={clearTestResults}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                清除
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p>暫無測試結果</p>
                </div>
              ) : (
                testResults.slice(-10).reverse().map(result => (
                  <div
                    key={result.id}
                    className={`
                      p-2 rounded text-sm border
                      ${result.result === 'pass' ? 'bg-green-50 border-green-200 text-green-800' :
                        result.result === 'fail' ? 'bg-red-50 border-red-200 text-red-800' :
                        'bg-yellow-50 border-yellow-200 text-yellow-800'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {result.result === 'pass' ? '✅' :
                         result.result === 'fail' ? '❌' : '⏳'} {result.test}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatTimestamp(result.timestamp)}
                      </span>
                    </div>
                    <div className="mt-1 opacity-90">{result.message}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 退回對話框 */}
      <RejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingSubmission(null)
        }}
        onConfirm={handleRejectConfirm}
        submissionInfo={rejectingSubmission ? {
          id: rejectingSubmission.id,
          userName: rejectingSubmission.userName,
          categoryName: rejectingSubmission.categoryName,
          amount: rejectingSubmission.amount,
          unit: rejectingSubmission.unit,
          currentStatus: rejectingSubmission.status
        } : undefined}
      />
    </div>
  )
}

// 提交記錄列表項目組件
interface SubmissionListItemProps {
  submission: SubmissionRecord
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onApprove: () => void
  onReject: () => void
  onUserViewSelect: () => void
  getAvailableTransitions: (status: SubmissionStatus) => SubmissionStatus[]
  onStatusChange: (id: string, status: SubmissionStatus, reason?: string) => Promise<any>
}

const SubmissionListItem: React.FC<SubmissionListItemProps> = ({
  submission,
  isSelected,
  onSelect,
  onApprove,
  onReject,
  onUserViewSelect,
  getAvailableTransitions,
  onStatusChange
}) => {
  const availableTransitions = getAvailableTransitions(submission.status)
  const style = getStatusStyle(submission.status)

  return (
    <div className={`
      border rounded-lg p-3 transition-all duration-200
      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
    `}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mt-1"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {submission.userName}
            </h4>
            <div className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${style.bg} ${style.text} ${style.border} border
            `}>
              {submission.categoryName}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            {submission.amount} {submission.unit}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {/* 可用的狀態轉換按鈕 */}
          {availableTransitions.map(newStatus => (
            <button
              key={newStatus}
              onClick={() => {
                if (newStatus === 'rejected') {
                  onReject()
                } else {
                  onStatusChange(submission.id, newStatus, `變更為${STATUS_LABELS[newStatus]}`)
                }
              }}
              className={`
                px-2 py-1 text-xs rounded transition-colors
                ${newStatus === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white' :
                  newStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  'bg-blue-600 hover:bg-blue-700 text-white'
                }
              `}
            >
              {STATUS_LABELS[newStatus]}
            </button>
          ))}

          {/* 查看使用者視角按鈕 */}
          <button
            onClick={onUserViewSelect}
            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            👤 用戶視角
          </button>
        </div>
      </div>
    </div>
  )
}

export default StatusFlowTest