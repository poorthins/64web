import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Filter, Download, CheckCircle, XCircle, AlertTriangle, Check, X, Eye, MessageSquare } from 'lucide-react'
import { getUserSubmissions, reviewSubmission, bulkReviewSubmissions, Submission } from '../../api/adminSubmissions'

// Using Submission from adminSubmissions API

interface UserEntriesTabProps {
  userId: string
  userName: string
  onBack: () => void
}

const UserEntriesTab: React.FC<UserEntriesTabProps> = ({ userId, userName, onBack }) => {
  const [entries, setEntries] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('')
  const [reviewStatus, setReviewStatus] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewingEntryId, setReviewingEntryId] = useState<string | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [bulkReviewing, setBulkReviewing] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [userId, fromDate, toDate, category])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      let data = await getUserSubmissions(userId)
      
      // Apply filters
      if (fromDate || toDate || category) {
        data = data.filter(entry => {
          let matches = true
          
          if (fromDate && entry.period_start < fromDate) matches = false
          if (toDate && entry.period_end > toDate) matches = false
          if (category && entry.category !== category) matches = false
          
          return matches
        })
      }
      
      setEntries(data)
    } catch (error) {
      console.error('Error fetching entries:', error)
      alert('取得填報記錄時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (entryId: string) => {
    if (!reviewStatus) {
      alert('請選擇審核狀態')
      return
    }

    try {
      await reviewSubmission(entryId, reviewStatus as 'approved' | 'needs_fix', reviewNote)
      
      // 重新載入填報列表
      await fetchEntries()
      setReviewingEntryId(null)
      setReviewStatus('')
      setReviewNote('')
      alert('審核完成')
    } catch (error) {
      console.error('Error creating review:', error)
      alert('建立審核記錄時發生錯誤')
    }
  }

  const handleBulkReview = async (status: 'approved' | 'needs_fix') => {
    if (selectedEntries.size === 0) {
      alert('請選擇要審核的填報')
      return
    }

    const note = prompt(`請輸入${status === 'approved' ? '核准' : '修正'}備註（選填）:`) || ''
    
    try {
      setBulkReviewing(true)
      await bulkReviewSubmissions(Array.from(selectedEntries), status, note)
      
      await fetchEntries()
      setSelectedEntries(new Set())
      alert(`已${status === 'approved' ? '核准' : '要求修正'} ${selectedEntries.size} 筆填報`)
    } catch (error) {
      console.error('Error bulk reviewing:', error)
      alert('批量審核時發生錯誤')
    } finally {
      setBulkReviewing(false)
    }
  }

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries)
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId)
    } else {
      newSelected.add(entryId)
    }
    setSelectedEntries(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedEntries.size === entries.length) {
      setSelectedEntries(new Set())
    } else {
      setSelectedEntries(new Set(entries.map(entry => entry.id)))
    }
  }

  const getLatestReviewStatus = (entry: Submission) => {
    if (!entry.review_history || entry.review_history.length === 0) {
      return { status: 'pending', note: '', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> }
    }

    const latest = entry.review_history.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const statusConfig = {
      approved: {
        status: '已核准',
        note: latest.review_notes,
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        color: 'text-green-800 bg-green-100'
      },
      needs_fix: {
        status: '需修正',
        note: latest.review_notes,
        icon: <XCircle className="h-4 w-4 text-red-500" />,
        color: 'text-red-800 bg-red-100'
      },
      pending: {
        status: '待審核',
        note: '',
        icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
        color: 'text-yellow-800 bg-yellow-100'
      }
    }

    return statusConfig[latest.new_status as keyof typeof statusConfig] || statusConfig.pending
  }

  const exportToCSV = () => {
    if (entries.length === 0) return

    const headers = ['期間開始', '期間結束', '類別', '單位', '數量', '備註', '審核狀態', '審核備註', '建立時間']
    
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => {
        const reviewStatus = getLatestReviewStatus(entry)
        return [
          entry.period_start,
          entry.period_end,
          entry.category,
          entry.unit,
          entry.amount,
          `"${entry.notes || ''}"`,
          reviewStatus.status,
          `"${reviewStatus.note || ''}"`,
          new Date(entry.created_at).toLocaleDateString()
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h2 className="text-xl font-semibold text-gray-900">{userName} 的填報記錄</h2>
            <p className="text-sm text-gray-500">共 {entries.length} 筆填報</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {selectedEntries.size > 0 && (
            <>
              <button
                onClick={() => handleBulkReview('approved')}
                disabled={bulkReviewing}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                批量核准 ({selectedEntries.size})
              </button>
              <button
                onClick={() => handleBulkReview('needs_fix')}
                disabled={bulkReviewing}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                批量退件 ({selectedEntries.size})
              </button>
            </>
          )}
          <button
            onClick={exportToCSV}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            匯出 CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            開始日期
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            結束日期
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            類別
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部類別</option>
            <option value="範疇一">範疇一</option>
            <option value="範疇二">範疇二</option>
            <option value="範疇三">範疇三</option>
          </select>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedEntries.size === entries.length && entries.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類別
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  數量
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
              {entries.map((entry) => {
                const reviewStatus = getLatestReviewStatus(entry)
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEntries.has(entry.id)}
                        onChange={() => handleSelectEntry(entry.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{new Date(entry.period_start).toLocaleDateString()}</div>
                        <div className="text-gray-500">至 {new Date(entry.period_end).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.amount} {entry.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {reviewStatus.icon}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(reviewStatus as any).color || 'bg-yellow-100 text-yellow-800'}`}>
                          {reviewStatus.status}
                        </span>
                      </div>
                      {reviewStatus.note && (
                        <div className="text-xs text-gray-500 mt-1">
                          {reviewStatus.note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowDetailModal(entry.id)}
                          className="text-gray-600 hover:text-gray-900"
                          title="查看詳情"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setReviewingEntryId(entry.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="快速審核"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {entries.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有填報記錄</h3>
          <p className="mt-1 text-sm text-gray-500">
            此用戶尚未提交任何填報記錄
          </p>
        </div>
      )}

      {/* Review Modal */}
      {reviewingEntryId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">審核填報</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  審核結果
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">請選擇</option>
                  <option value="approved">核准</option>
                  <option value="needs_fix">需修正</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  備註
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="審核備註（選填）"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setReviewingEntryId(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
              <button
                onClick={() => handleReview(reviewingEntryId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                確認審核
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {(() => {
              const entry = entries.find(e => e.id === showDetailModal)
              if (!entry) return null
              
              const reviewStatus = getLatestReviewStatus(entry)
              
              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">填報詳情</h3>
                    <button
                      onClick={() => setShowDetailModal(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">填報期間</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(entry.period_start).toLocaleDateString()} - {new Date(entry.period_end).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">類別</label>
                        <p className="mt-1 text-sm text-gray-900">{entry.category}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">數量</label>
                        <p className="mt-1 text-sm text-gray-900">{entry.amount} {entry.unit}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">建立時間</label>
                        <p className="mt-1 text-sm text-gray-900">{new Date(entry.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {entry.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">備註</label>
                        <p className="mt-1 text-sm text-gray-900">{entry.notes}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">審核歷史</label>
                      {entry.review_history && entry.review_history.length > 0 ? (
                        <div className="space-y-2">
                          {entry.review_history.map((review) => (
                            <div key={review.id} className="border rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {review.new_status === 'approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                                  {review.new_status === 'needs_fix' && <XCircle className="h-4 w-4 text-red-500" />}
                                  {review.new_status === 'pending' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                  <span className="text-sm font-medium">
                                    {review.new_status === 'approved' ? '已核准' : review.new_status === 'needs_fix' ? '需修正' : '待審核'}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(review.created_at).toLocaleString()}
                                </span>
                              </div>
                              {review.review_notes && (
                                <p className="text-sm text-gray-600 mt-1">{review.review_notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">尚無審核記錄</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowDetailModal(null)
                        setReviewingEntryId(entry.id)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      審核此填報
                    </button>
                    <button
                      onClick={() => setShowDetailModal(null)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      關閉
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserEntriesTab