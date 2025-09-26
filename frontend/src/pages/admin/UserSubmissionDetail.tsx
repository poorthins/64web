import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, CheckCircle, XCircle, AlertTriangle, Download, Eye, MessageSquare, Calendar, User, Building, Save, X, Loader2, Lock, Unlock, RotateCcw } from 'lucide-react'
import { getUserSubmissions, reviewSubmission, Submission, ReviewStatus } from '../../api/adminSubmissions'
import { getUserDetails, UserProfile } from '../../api/adminUsers'
import { reviewEntry } from '../../api/reviewEnhancements'

interface UserSubmissionDetailProps {
  userId: string
  userName: string
  onBack: () => void
}

interface SubmissionWithFiles extends Submission {
  files?: Array<{
    id: string
    filename: string
    file_path: string
    upload_date: string
    file_size: number
  }>
}

const UserSubmissionDetail: React.FC<UserSubmissionDetailProps> = ({
  userId,
  userName,
  onBack
}) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionWithFiles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 審核相關狀態
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set())
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'reset' | ''>('')
  const [reviewNote, setReviewNote] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  
  // 檢視詳情
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionWithFiles | null>(null)
  
  // 篩選狀態
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'needs_fix'>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | '範疇一' | '範疇二' | '範疇三'>('all')

  useEffect(() => {
    fetchData()
  }, [userId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [userDetails, submissionData] = await Promise.all([
        getUserDetails(userId),
        getUserSubmissions(userId)
      ])
      
      setUser(userDetails)
      
      // 模擬添加檔案資訊 (實際應該從 API 獲取)
      const submissionsWithFiles = submissionData.map(submission => ({
        ...submission,
        files: [] // 這裡應該從實際的檔案表獲取
      }))
      
      setSubmissions(submissionsWithFiles)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : '載入資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const getLatestReviewStatus = (submission: Submission) => {
    // 假設 submission 有 status 欄位，對應新的三狀態系統
    const currentStatus = (submission as any).status || 'submitted'

    const statusConfig = {
      submitted: {
        status: 'submitted',
        note: '',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        color: 'bg-yellow-100 text-yellow-800',
        text: '已提交',
        canEdit: true
      },
      approved: {
        status: 'approved',
        note: (submission as any).review_notes || '',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        color: 'bg-green-100 text-green-800',
        text: '已通過',
        canEdit: true // 現在已通過的項目也可以操作
      },
      rejected: {
        status: 'rejected',
        note: (submission as any).review_notes || '',
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        color: 'bg-red-100 text-red-800',
        text: '已退回',
        canEdit: true
      }
    }

    return statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.submitted
  }

  const filteredSubmissions = submissions.filter(submission => {
    const reviewStatus = getLatestReviewStatus(submission)

    // 狀態映射：舊篩選器 -> 新狀態
    const statusMapping = {
      'pending': 'submitted',
      'approved': 'approved',
      'needs_fix': 'rejected'
    };

    const matchesStatus = statusFilter === 'all' || reviewStatus.status === (statusMapping[statusFilter as keyof typeof statusMapping] || statusFilter)
    const matchesCategory = categoryFilter === 'all' || submission.category === categoryFilter

    return matchesStatus && matchesCategory
  })

  const handleSelectSubmission = (submissionId: string) => {
    const newSelected = new Set(selectedSubmissions)
    if (newSelected.has(submissionId)) {
      newSelected.delete(submissionId)
    } else {
      newSelected.add(submissionId)
    }
    setSelectedSubmissions(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedSubmissions.size === filteredSubmissions.length) {
      setSelectedSubmissions(new Set())
    } else {
      setSelectedSubmissions(new Set(filteredSubmissions.map(s => s.id)))
    }
  }

  const handleStatusChange = async (entryId: string, action: 'approve' | 'reject' | 'reset', reason?: string) => {
    console.group('🔄 項目詳情頁面狀態變更');
    console.log('操作參數:', { entryId, action, reason });

    try {
      setIsReviewing(true);

      // 呼叫增強版 API
      await reviewEntry(entryId, action, reason);

      // 重新載入資料
      await fetchData();

      // 重置狀態
      setReviewingId(null);
      setReviewAction('');
      setReviewNote('');
      setRejectModalOpen(false);

      const actionText = {
        approve: '通過',
        reject: '退回',
        reset: '重置'
      }[action];

      alert(`✅ ${actionText}操作完成！`);
      console.log('✅ 狀態變更成功');
    } catch (error) {
      console.error('❌ 狀態變更失敗:', error);
      alert('操作時發生錯誤: ' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setIsReviewing(false);
      console.groupEnd();
    }
  };

  const handleRejectWithReason = (entryId: string) => {
    const reason = prompt('請輸入退回原因:');
    if (reason !== null) {
      handleStatusChange(entryId, 'reject', reason);
    }
  };

  const handleBatchReview = async (action: 'approve' | 'reject') => {
    if (selectedSubmissions.size === 0) {
      alert('請選擇要審核的項目');
      return;
    }

    const actionText = action === 'approve' ? '通過' : '退回';
    const note = prompt(`請輸入${actionText}原因（選填）:`) || '';

    try {
      setIsReviewing(true);

      // 逐一審核選中的項目
      for (const submissionId of selectedSubmissions) {
        await reviewEntry(submissionId, action, note);
      }

      await fetchData();
      setSelectedSubmissions(new Set());
      alert(`✅ 批次${actionText}完成！處理了 ${selectedSubmissions.size} 個項目`);
    } catch (error) {
      console.error('Error batch reviewing:', error);
      alert('批次審核時發生錯誤');
    } finally {
      setIsReviewing(false);
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) return

    const headers = ['項目', '類別', '期間', '數量', '單位', '審核狀態', '審核備註', '建立時間']
    
    const csvContent = [
      headers.join(','),
      ...submissions.map(submission => {
        const reviewStatus = getLatestReviewStatus(submission)
        return [
          `"填報項目"`,
          submission.category,
          `${submission.period_start} 至 ${submission.period_end}`,
          submission.amount,
          submission.unit,
          reviewStatus.text,
          `"${reviewStatus.note || ''}"`,
          new Date(submission.created_at).toLocaleDateString()
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${userName}-填報記錄-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatistics = () => {
    const total = submissions.length
    const pending = submissions.filter(s => getLatestReviewStatus(s).status === 'submitted').length
    const approved = submissions.filter(s => getLatestReviewStatus(s).status === 'approved').length
    const needsFix = submissions.filter(s => getLatestReviewStatus(s).status === 'rejected').length

    return { total, pending, approved, needsFix }
  }

  const stats = getStatistics()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">載入填報資料中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">載入資料時發生錯誤</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchData}
            className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors"
          >
            重試
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            返回用戶列表
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900">填報審核</h1>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {userName}
              </div>
              {user?.company && (
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  {user.company}
                </div>
              )}
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {stats.total} 個填報項目
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {selectedSubmissions.size > 0 && (
            <>
              <button
                onClick={() => handleBatchReview('approve')}
                disabled={isReviewing}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                批量通過 ({selectedSubmissions.size})
              </button>
              <button
                onClick={() => handleBatchReview('reject')}
                disabled={isReviewing}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                批量退件 ({selectedSubmissions.size})
              </button>
            </>
          )}
          
          <button
            onClick={exportToCSV}
            disabled={submissions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            匯出記錄
          </button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
              <div className="text-blue-600">總填報</div>
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
              <div className="text-yellow-600">待審核</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
              <div className="text-green-600">已通過</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-900">{stats.needsFix}</div>
              <div className="text-red-600">需修正</div>
            </div>
          </div>
        </div>
      </div>

      {/* 篩選器 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">審核狀態</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部狀態</option>
              <option value="pending">已提交</option>
              <option value="approved">已通過</option>
              <option value="needs_fix">已退回</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">類別</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部類別</option>
              <option value="範疇一">範疇一</option>
              <option value="範疇二">範疇二</option>
              <option value="範疇三">範疇三</option>
            </select>
          </div>
        </div>
      </div>

      {/* 填報項目列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSubmissions.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  項目資訊
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期間與數量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  審核狀態
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubmissions.map((submission) => {
                const reviewStatus = getLatestReviewStatus(submission)
                return (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.has(submission.id)}
                        onChange={() => handleSelectSubmission(submission.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.category}
                          </div>
                          {!reviewStatus.canEdit && (
                            <div title="已鎖定，不可編輯">
                              <Lock className="h-4 w-4 text-gray-400 ml-2" />
                            </div>
                          )}
                        </div>
                        {submission.notes && (
                          <div className="text-sm text-gray-500 mt-1">{submission.notes}</div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {new Date(submission.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div>{new Date(submission.period_start).toLocaleDateString()}</div>
                        <div className="text-gray-500">至 {new Date(submission.period_end).toLocaleDateString()}</div>
                        <div className="font-medium mt-1">{submission.amount} {submission.unit}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {reviewStatus.icon}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${reviewStatus.color}`}>
                          {reviewStatus.text}
                        </span>
                      </div>
                      {reviewStatus.note && (
                        <div className="text-xs text-gray-500 mt-1">{reviewStatus.note}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingSubmission(submission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="查看詳情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* 智能操作按鈕 */}
                        {reviewStatus.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(submission.id, 'approve')}
                              className="text-green-600 hover:text-green-900"
                              title="通過審核"
                              disabled={isReviewing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRejectWithReason(submission.id)}
                              className="text-red-600 hover:text-red-900"
                              title="退回修正"
                              disabled={isReviewing}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {reviewStatus.status === 'approved' && (
                          <>
                            <button
                              onClick={() => handleRejectWithReason(submission.id)}
                              className="text-red-600 hover:text-red-900"
                              title="退回修正"
                              disabled={isReviewing}
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(submission.id, 'reset')}
                              className="text-gray-600 hover:text-gray-900"
                              title="重置狀態"
                              disabled={isReviewing}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {reviewStatus.status === 'rejected' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(submission.id, 'approve')}
                              className="text-green-600 hover:text-green-900"
                              title="通過審核"
                              disabled={isReviewing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStatusChange(submission.id, 'reset')}
                              className="text-gray-600 hover:text-gray-900"
                              title="重置狀態"
                              disabled={isReviewing}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredSubmissions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到符合條件的填報項目</h3>
          <p className="mt-1 text-sm text-gray-500">
            {statusFilter !== 'all' || categoryFilter !== 'all'
              ? '嘗試調整篩選條件'
              : '此用戶尚未提交任何填報記錄'
            }
          </p>
        </div>
      )}


      {/* 詳情檢視模態框 */}
      {viewingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">填報詳情</h3>
              <button
                onClick={() => setViewingSubmission(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 基本資訊 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">基本資訊</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">類別</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingSubmission.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">數量</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingSubmission.amount} {viewingSubmission.unit}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">期間開始</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(viewingSubmission.period_start).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">期間結束</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(viewingSubmission.period_end).toLocaleDateString()}</p>
                  </div>
                </div>
                
                {viewingSubmission.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">備註</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingSubmission.notes}</p>
                  </div>
                )}
                
                {/* 上傳檔案 */}
                {viewingSubmission.files && viewingSubmission.files.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">上傳檔案</label>
                    <div className="space-y-2">
                      {viewingSubmission.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="text-sm font-medium">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {(file.file_size / 1024).toFixed(1)} KB • {new Date(file.upload_date).toLocaleDateString()}
                            </p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-900">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 審核歷史 */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">審核歷史</h4>
                
                {viewingSubmission.review_history && viewingSubmission.review_history.length > 0 ? (
                  <div className="space-y-3">
                    {viewingSubmission.review_history.map((review) => (
                      <div key={review.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {review.status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {review.status === 'needs_fix' && <XCircle className="h-4 w-4 text-red-500" />}
                            {review.status === 'pending' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                            <span className="text-sm font-medium">
                              {review.status === 'approved' ? '已通過' : review.status === 'needs_fix' ? '需修正' : '待審核'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.created_at).toLocaleString()}
                          </span>
                        </div>
                        {review.note && (
                          <p className="text-sm text-gray-600">{review.note}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          審核者：{review.reviewer_profiles?.display_name || 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">尚無審核記錄</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              {/* 智能審核按鈕 */}
              {(() => {
                const status = getLatestReviewStatus(viewingSubmission).status;

                if (status === 'submitted') {
                  return (
                    <>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleStatusChange(viewingSubmission.id, 'approve');
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        通過審核
                      </button>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleRejectWithReason(viewingSubmission.id);
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        退回修正
                      </button>
                    </>
                  );
                }

                if (status === 'approved') {
                  return (
                    <>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleRejectWithReason(viewingSubmission.id);
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        退回修正
                      </button>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleStatusChange(viewingSubmission.id, 'reset');
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        重置狀態
                      </button>
                    </>
                  );
                }

                if (status === 'rejected') {
                  return (
                    <>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleStatusChange(viewingSubmission.id, 'approve');
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        通過審核
                      </button>
                      <button
                        onClick={() => {
                          setViewingSubmission(null);
                          handleStatusChange(viewingSubmission.id, 'reset');
                        }}
                        disabled={isReviewing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        重置狀態
                      </button>
                    </>
                  );
                }

                return null;
              })()}

              <button
                onClick={() => setViewingSubmission(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserSubmissionDetail