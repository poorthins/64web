import React, { useState, useEffect } from 'react'
import { SubmissionRecord, allSubmissions } from './data/mockData'
import {
  statusManager,
  SubmissionStatus,
  getStatusIcon,
  getStatusStyle,
  STATUS_LABELS
} from './utils/statusManager'
import { useSubmissionStatus } from './hooks/useStatusManager'

interface UserViewSimulatorProps {
  selectedSubmissionId?: string
  onSubmissionSelect?: (id: string) => void
}

const UserViewSimulator: React.FC<UserViewSimulatorProps> = ({
  selectedSubmissionId,
  onSubmissionSelect
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('1')
  const [userSubmissions, setUserSubmissions] = useState<SubmissionRecord[]>([])

  // 取得使用者的所有提交記錄
  useEffect(() => {
    const submissions = allSubmissions.filter(sub => sub.userId === selectedUserId)
    setUserSubmissions(submissions)
  }, [selectedUserId])

  // 取得獨特的使用者列表
  const uniqueUsers = Array.from(
    new Set(allSubmissions.map(sub => ({ id: sub.userId, name: sub.userName })))
  ).map(user => ({ id: user.id, name: user.name }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          👤 使用者端視角模擬
        </h3>

        {/* 使用者選擇器 */}
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
        >
          {uniqueUsers.map(user => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {userSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📄</div>
            <p>此使用者尚無提交記錄</p>
          </div>
        ) : (
          userSubmissions.map(submission => (
            <UserSubmissionCard
              key={submission.id}
              submission={submission}
              isSelected={selectedSubmissionId === submission.id}
              onClick={() => onSubmissionSelect?.(submission.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface UserSubmissionCardProps {
  submission: SubmissionRecord
  isSelected: boolean
  onClick: () => void
}

const UserSubmissionCard: React.FC<UserSubmissionCardProps> = ({
  submission,
  isSelected,
  onClick
}) => {
  const { status, history } = useSubmissionStatus(submission.id)
  const currentStatus = status || submission.status
  const statusStyle = getStatusStyle(currentStatus)
  const isLocked = !statusManager.isEditable(currentStatus)
  const lockMessage = statusManager.getLockMessage(currentStatus)

  // 取得最新的退回原因
  const latestRejectHistory = history
    .filter(h => h.newStatus === 'rejected')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

  return (
    <div
      onClick={onClick}
      className={`
        border-2 rounded-lg p-4 cursor-pointer transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* 基本資訊 */}
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-medium text-gray-900">
              {submission.categoryName}
            </h4>
            <div className={`
              inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} border
            `}>
              <span className="mr-1">{getStatusIcon(currentStatus)}</span>
              {STATUS_LABELS[currentStatus]}
            </div>
          </div>

          {/* 詳細資訊 */}
          <div className="text-sm text-gray-600 space-y-1">
            <div>數量：{submission.amount.toLocaleString()} {submission.unit}</div>
            <div>CO₂ 排放：{submission.co2Emission.toLocaleString()} kg</div>
            <div>提交日期：{submission.submissionDate}</div>
            {submission.reviewDate && (
              <div>審核日期：{submission.reviewDate}</div>
            )}
          </div>

          {/* 鎖定狀態提示 */}
          {isLocked && lockMessage && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">🔒</span>
                {lockMessage}
              </div>
            </div>
          )}

          {/* 退回原因顯示 */}
          {currentStatus === 'rejected' && latestRejectHistory && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm">
                <div className="font-medium text-red-800 mb-1">退回原因：</div>
                <div className="text-red-700">{latestRejectHistory.reason}</div>
                <div className="text-xs text-red-600 mt-2">
                  退回時間：{new Date(latestRejectHistory.timestamp).toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          )}

          {/* 審核通過訊息 */}
          {currentStatus === 'approved' && submission.reviewer && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="text-sm">
                <div className="font-medium text-green-800 mb-1">審核通過</div>
                <div className="text-green-700">審核者：{submission.reviewer}</div>
                {submission.comments && (
                  <div className="text-green-700">備註：{submission.comments}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 編輯按鈕模擬 */}
        <div className="ml-4">
          <button
            disabled={isLocked}
            className={`
              px-3 py-2 text-sm rounded-lg border transition-all duration-200
              ${isLocked
                ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
              }
            `}
          >
            {isLocked ? '🔒 已鎖定' : '✏️ 編輯'}
          </button>
        </div>
      </div>

      {/* 狀態歷史時間軸 */}
      {history.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">狀態變更歷史：</div>
          <div className="space-y-1">
            {history.slice(-3).map((change, index) => (
              <div key={index} className="flex items-center text-xs text-gray-600">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-2"></span>
                <span>
                  {STATUS_LABELS[change.oldStatus]} → {STATUS_LABELS[change.newStatus]}
                </span>
                <span className="ml-auto">
                  {new Date(change.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserViewSimulator