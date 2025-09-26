import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import StatsCard from './components/StatsCard'
import Modal from './components/Modal'
import RejectModal from './components/RejectModal'
import { DashboardSkeleton, LoadingSpinner } from './components/LoadingSkeleton'
import { PageHeader } from './components/PageHeader'
import { handleAPIError, showErrorToast, withRetry } from './utils/errorHandler'
import { useKeyboardShortcuts, createCommonShortcuts } from './hooks/useKeyboardShortcuts'
import {
  mockSubmissions,
  mockUsers,
  energyCategories,
  calculateSubmissionStats,
  UserStatus,
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  SubmissionRecord
} from './data/mockData'

type SortField = 'submissionDate' | 'amount' | 'co2Emission' | 'userName'
type SortOrder = 'asc' | 'desc'

const StatisticsDetail: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') as UserStatus | null

  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>(
    initialStatus ? [initialStatus] : []
  )
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('submissionDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionRecord | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const itemsPerPage = 10

  // 載入資料函數
  const loadData = withRetry(async () => {
    setIsLoading(true)
    setError(null)

    // 模擬 API 延遲
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 模擬可能的錯誤（8% 機率）
    if (Math.random() < 0.08) {
      throw new Error('模擬載入統計資料失敗')
    }

    setSubmissions(mockSubmissions)
    setIsLoading(false)
  }, {
    maxRetries: 3,
    baseDelay: 1000
  })

  // 模擬載入資料
  useEffect(() => {
    loadData().catch((err: any) => {
      const apiError = handleAPIError(err)
      setError(apiError.message)
      showErrorToast(apiError)
      setIsLoading(false)
    })
  }, [loadData])

  const stats = useMemo(() => calculateSubmissionStats(submissions), [submissions])

  const filteredSubmissions = useMemo(() => {
    let filtered = submissions.filter(submission => {
      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(submission.status)
      const matchesUser = !selectedUser || submission.userId === selectedUser
      const matchesCategory = !selectedCategory || submission.categoryId === selectedCategory

      return matchesStatus && matchesUser && matchesCategory
    })

    // 排序
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'submissionDate') {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (sortField === 'userName') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [submissions, selectedStatuses, selectedUser, selectedCategory, sortField, sortOrder])

  // 分頁計算
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, startIndex + itemsPerPage)

  const handleStatsCardClick = (status: UserStatus) => {
    const currentlySelected = selectedStatuses.includes(status)
    if (currentlySelected) {
      setSelectedStatuses(selectedStatuses.filter(s => s !== status))
    } else {
      setSelectedStatuses([status])
    }
    setCurrentPage(1)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleSubmissionClick = (submission: SubmissionRecord) => {
    console.log('點擊填報記錄:', {
      id: submission.id,
      user: submission.userName,
      category: submission.categoryName,
      status: submission.status,
      amount: submission.amount,
      co2Emission: submission.co2Emission,
      comments: submission.comments
    })
    setSelectedSubmission(submission)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedSubmission(null)
  }

  const handleApprove = async (submission: SubmissionRecord) => {
    const confirmed = window.confirm(`確定要通過 ${submission.userName} 的 ${submission.categoryName} 申請嗎？`)
    if (!confirmed) return

    setIsProcessing(true)
    try {
      await withRetry(async () => {
        // 模擬 API 調用延遲
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 模擬可能的錯誤（5% 機率）
        if (Math.random() < 0.05) {
          throw new Error('模擬審核操作失敗')
        }
      }, {
        maxRetries: 2,
        baseDelay: 500
      })

      // 更新提交記錄狀態
      setSubmissions(prev => prev.map(s =>
        s.id === submission.id
          ? {
              ...s,
              status: 'approved' as UserStatus,
              reviewDate: new Date().toISOString().split('T')[0],
              reviewedAt: new Date().toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }),
              reviewer: '管理員',
              reviewerId: 'admin_current'
            }
          : s
      ))

      // 顯示成功訊息
      alert(`✅ 已通過 ${submission.userName} 的 ${submission.categoryName} 申請`)
    } catch (err) {
      const apiError = handleAPIError(err)
      showErrorToast(apiError)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = (submission: SubmissionRecord) => {
    setSelectedSubmission(submission)
    setIsRejectModalOpen(true)
  }

  const handleRejectConfirm = async (reason: string) => {
    if (!selectedSubmission) return

    setIsProcessing(true)
    try {
      // 模擬 API 調用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 更新提交記錄狀態
      setSubmissions(prev => prev.map(s =>
        s.id === selectedSubmission.id
          ? {
              ...s,
              status: 'rejected' as UserStatus,
              reviewDate: new Date().toISOString().split('T')[0],
              reviewedAt: new Date().toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              }),
              reviewer: '管理員',
              reviewerId: 'admin_current',
              reviewNotes: reason
            }
          : s
      ))

      // 顯示成功訊息
      alert(`❌ 已退回 ${selectedSubmission.userName} 的 ${selectedSubmission.categoryName} 申請`)

      // 關閉模態框
      setIsRejectModalOpen(false)
      setSelectedSubmission(null)
    } catch (error) {
      console.error('退回操作失敗:', error)
      alert('❌ 退回操作失敗，請稍後再試')
    } finally {
      setIsProcessing(false)
    }
  }

  const closeRejectModal = () => {
    if (!isProcessing) {
      setIsRejectModalOpen(false)
      setSelectedSubmission(null)
    }
  }

  const clearAllFilters = () => {
    setSelectedStatuses([])
    setSelectedUser('')
    setSelectedCategory('')
    setCurrentPage(1)
  }

  // 鍵盤快捷鍵
  const shortcuts = createCommonShortcuts({
    back: () => navigate('/app/admin'),
    refresh: () => loadData().catch(console.error)
  })

  useKeyboardShortcuts({ shortcuts })

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-400">↕️</span>
    return sortOrder === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">📊⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">載入統計資料失敗</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="填報記錄管理 📊"
          subtitle="查看和管理所有用戶的能源填報記錄"
          currentPage="statistics"
        />

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="已提交"
            count={stats.submitted}
            icon="📝"
            bgColor="bg-blue-100"
            onClick={() => handleStatsCardClick('submitted')}
          />
          <StatsCard
            title="已通過"
            count={stats.approved}
            icon="✅"
            bgColor="bg-green-100"
            onClick={() => handleStatsCardClick('approved')}
          />
          <StatsCard
            title="已退回"
            count={stats.rejected}
            icon="❌"
            bgColor="bg-red-100"
            onClick={() => handleStatsCardClick('rejected')}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* 篩選區域 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🔍</span>
              篩選條件
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* 用戶篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  選擇用戶
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有用戶</option>
                  {mockUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* 類別篩選 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  能源類別
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有類別</option>
                  {energyCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} (範疇{category.scope})
                    </option>
                  ))}
                </select>
              </div>

              {/* 排序 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序欄位
                </label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="submissionDate">提交日期</option>
                  <option value="userName">用戶姓名</option>
                  <option value="amount">填報數量</option>
                  <option value="co2Emission">CO2 排放量</option>
                </select>
              </div>

              {/* 排序方向 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序方向
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">降序 (新到舊)</option>
                  <option value="asc">升序 (舊到新)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                顯示 {filteredSubmissions.length} 筆記錄 (共 {mockSubmissions.length} 筆)
              </div>

              {(selectedStatuses.length > 0 || selectedUser || selectedCategory) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  清除所有篩選
                </button>
              )}
            </div>
          </div>

          {/* 記錄列表 */}
          {paginatedSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                沒有找到符合條件的記錄
              </h3>
              <p className="text-gray-500">
                請調整篩選條件或聯絡管理員
              </p>
            </div>
          ) : (
            <>
              {/* 表格標題 */}
              <div className="hidden lg:grid lg:grid-cols-9 gap-4 p-4 bg-gray-50 rounded-t-lg font-semibold text-gray-700 text-sm">
                <button
                  onClick={() => handleSort('userName')}
                  className="text-left flex items-center hover:text-gray-900"
                >
                  用戶 <SortIcon field="userName" />
                </button>
                <div>類別</div>
                <button
                  onClick={() => handleSort('amount')}
                  className="text-left flex items-center hover:text-gray-900"
                >
                  數量 <SortIcon field="amount" />
                </button>
                <button
                  onClick={() => handleSort('co2Emission')}
                  className="text-left flex items-center hover:text-gray-900"
                >
                  CO2排放 <SortIcon field="co2Emission" />
                </button>
                <div>狀態</div>
                <div>優先級</div>
                <button
                  onClick={() => handleSort('submissionDate')}
                  className="text-left flex items-center hover:text-gray-900"
                >
                  提交日期 <SortIcon field="submissionDate" />
                </button>
                <div>審核日期</div>
                <div>操作</div>
              </div>

              {/* 記錄列表 */}
              <div className="space-y-3 lg:space-y-0">
                {paginatedSubmissions.map(submission => {
                  const statusColor = statusColors[submission.status]
                  const priorityColor = priorityColors[submission.priority]

                  return (
                    <div key={submission.id} className="space-y-0">
                      <div
                        onClick={() => handleSubmissionClick(submission)}
                        className="lg:grid lg:grid-cols-9 gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors lg:rounded-none rounded-lg lg:border-0 border lg:shadow-none shadow-sm lg:bg-transparent bg-white"
                      >
                      {/* 響應式佈局 */}
                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">用戶</div>
                        <div>
                          <div className="font-medium text-gray-900">{submission.userName}</div>
                          <div className="text-sm text-gray-500">{submission.userDepartment}</div>
                        </div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">類別</div>
                        <div>
                          <div className="text-sm font-medium">{submission.categoryName}</div>
                          <div className="text-xs text-gray-500">範疇 {submission.scope}</div>
                        </div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">數量</div>
                        <div className="text-sm">
                          {submission.amount.toLocaleString()} {submission.unit}
                        </div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">CO2排放</div>
                        <div className="text-sm font-medium text-green-600">
                          {submission.co2Emission.toLocaleString()} kg
                        </div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">狀態</div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                          {statusLabels[submission.status]}
                        </span>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">優先級</div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${priorityColor.bg} ${priorityColor.text}`}>
                          {priorityLabels[submission.priority]}
                        </span>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">提交日期</div>
                        <div className="text-sm">{submission.submissionDate}</div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">審核日期</div>
                        <div className="text-sm text-gray-500">
                          {submission.reviewDate || '未審核'}
                        </div>
                      </div>

                      <div className="lg:flex lg:items-center">
                        <div className="lg:hidden text-xs text-gray-500 mb-1">操作</div>
                        <div className="flex items-center gap-2">
                          {/* 待審核狀態顯示審核按鈕 */}
                          {submission.status === 'submitted' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleApprove(submission)
                                }}
                                disabled={isProcessing}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                              >
                                {isProcessing ? (
                                  <LoadingSpinner size="sm" className="mr-1" />
                                ) : (
                                  <span className="mr-1">✅</span>
                                )}
                                通過
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReject(submission)
                                }}
                                disabled={isProcessing}
                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                              >
                                <span className="mr-1">❌</span>
                                退回
                              </button>
                            </>
                          )}

                          {/* 其他狀態顯示查看詳情按鈕 */}
                          {submission.status !== 'submitted' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSubmissionClick(submission)
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm underline"
                            >
                              查看詳情
                            </button>
                          )}
                        </div>
                        </div>
                      </div>

                      {/* 已退回記錄顯示退回原因 */}
                      {submission.status === 'rejected' && submission.reviewNotes && (
                        <div className="lg:ml-4 mt-3 p-3 bg-red-50 border-l-4 border-red-300 rounded-r">
                          <div className="flex items-start">
                            <span className="mr-2 text-red-600">📝</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-red-800 mb-1">退回原因：</div>
                              <div className="text-sm text-red-700 leading-relaxed">{submission.reviewNotes}</div>
                              {submission.reviewedAt && (
                                <div className="text-xs text-red-600 mt-2">
                                  退回時間：{submission.reviewedAt}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 分頁 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    第 {currentPage} 頁，共 {totalPages} 頁
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      上一頁
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1
                        const isActive = page === currentPage

                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded text-sm ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      下一頁
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 提示文字 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 flex items-center justify-center">
              <span className="mr-2">💡</span>
              提示：點擊記錄可查看詳情，待審核記錄可進行審核操作
            </p>
          </div>
        </div>

        {/* 詳情模態框 */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title="功能說明"
        >
          <div className="space-y-6">
            {/* 功能說明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center">
                <span className="mr-2">🚀</span>
                審核系統
              </h3>
              <p className="text-blue-800">
                此處將跳轉到用戶的填寫頁面進行審核，包含詳細的數據檢視、審核流程、備註添加等功能。
              </p>
            </div>

            {/* 記錄詳情 */}
            {selectedSubmission && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  記錄詳情
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-600">記錄編號：</span>
                      <span className="text-gray-900">{selectedSubmission.id}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">填報用戶：</span>
                      <span className="text-gray-900">{selectedSubmission.userName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">所屬部門：</span>
                      <span className="text-gray-900">{selectedSubmission.userDepartment}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">能源類別：</span>
                      <span className="text-gray-900">{selectedSubmission.categoryName}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">範疇分類：</span>
                      <span className="text-gray-900">範疇 {selectedSubmission.scope}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="font-medium text-gray-600">填報數量：</span>
                      <span className="text-gray-900">
                        {selectedSubmission.amount.toLocaleString()} {selectedSubmission.unit}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">CO2 排放量：</span>
                      <span className="text-green-600 font-medium">
                        {selectedSubmission.co2Emission.toLocaleString()} kg
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">當前狀態：</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        statusColors[selectedSubmission.status].bg
                      } ${statusColors[selectedSubmission.status].text}`}>
                        {statusLabels[selectedSubmission.status]}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">優先級：</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                        priorityColors[selectedSubmission.priority].bg
                      } ${priorityColors[selectedSubmission.priority].text}`}>
                        {priorityLabels[selectedSubmission.priority]}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">提交日期：</span>
                      <span className="text-gray-900">{selectedSubmission.submissionDate}</span>
                    </div>
                  </div>
                </div>

                {/* 審核資訊 */}
                {(selectedSubmission.reviewDate || selectedSubmission.reviewer || selectedSubmission.comments) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">審核資訊</h4>
                    <div className="space-y-2 text-sm">
                      {selectedSubmission.reviewDate && (
                        <div>
                          <span className="font-medium text-gray-600">審核日期：</span>
                          <span className="text-gray-900">{selectedSubmission.reviewDate}</span>
                        </div>
                      )}
                      {selectedSubmission.reviewer && (
                        <div>
                          <span className="font-medium text-gray-600">審核人員：</span>
                          <span className="text-gray-900">{selectedSubmission.reviewer}</span>
                        </div>
                      )}
                      {selectedSubmission.comments && (
                        <div>
                          <span className="font-medium text-gray-600">審核備註：</span>
                          <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-gray-900">
                            {selectedSubmission.comments}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 未來功能預覽 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2 flex items-center">
                <span className="mr-2">🔮</span>
                未來功能預覽
              </h3>
              <ul className="text-green-800 space-y-1 text-sm">
                <li>• 詳細數據檢視和編輯</li>
                <li>• 審核流程管理（核准/退回/要求補件）</li>
                <li>• 審核備註和溝通記錄</li>
                <li>• 數據異常檢測和提醒</li>
                <li>• 批量審核操作</li>
                <li>• 審核歷史追蹤</li>
              </ul>
            </div>
          </div>
        </Modal>

        {/* 退回原因模態框 */}
        <RejectModal
          isOpen={isRejectModalOpen}
          onClose={closeRejectModal}
          onConfirm={handleRejectConfirm}
          submissionInfo={selectedSubmission ? {
            userName: selectedSubmission.userName,
            categoryName: selectedSubmission.categoryName,
            amount: selectedSubmission.amount,
            unit: selectedSubmission.unit
          } : undefined}
        />
      </div>
    </div>
  )
}

export default StatisticsDetail