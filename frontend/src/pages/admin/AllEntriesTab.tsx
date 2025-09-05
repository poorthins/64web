import { useState, useEffect } from 'react'
import { Calendar, Filter, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

interface Entry {
  id: string
  period_start: string
  period_end: string
  category: string
  unit: string
  amount: number
  notes: string
  created_at: string
  profiles: {
    display_name: string
  }
  entry_reviews: Array<{
    id: string
    status: string
    note: string
    created_at: string
  }>
}

const AllEntriesTab: React.FC = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [fromDate, toDate, category])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No access token')
      }

      const params = new URLSearchParams()
      if (fromDate) params.append('from', fromDate)
      if (toDate) params.append('to', toDate)
      if (category) params.append('category', category)

      const response = await fetch(`/api/admin/entries?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch entries')
      }

      const data = await response.json()
      setEntries(data.entries || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      alert('取得填報記錄時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  const getLatestReviewStatus = (entry: Entry) => {
    if (!entry.entry_reviews || entry.entry_reviews.length === 0) {
      return { status: 'pending', note: '', icon: <AlertTriangle className="h-4 w-4 text-yellow-500" /> }
    }

    const latest = entry.entry_reviews.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    const statusConfig = {
      approved: { 
        status: '已核准', 
        note: latest.note, 
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        color: 'text-green-800 bg-green-100'
      },
      needs_fix: { 
        status: '需修正', 
        note: latest.note, 
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

    return statusConfig[latest.status as keyof typeof statusConfig] || statusConfig.pending
  }

  const exportToCSV = () => {
    if (entries.length === 0) return

    const headers = ['用戶', '期間開始', '期間結束', '類別', '單位', '數量', '備註', '審核狀態', '審核備註', '建立時間']
    
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => {
        const reviewStatus = getLatestReviewStatus(entry)
        return [
          entry.profiles?.display_name || 'N/A',
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
    link.setAttribute('download', `全部填報記錄-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusStats = () => {
    const stats = entries.reduce((acc, entry) => {
      const status = getLatestReviewStatus(entry)
      if (status.status === '已核准') acc.approved++
      else if (status.status === '需修正') acc.needs_fix++
      else acc.pending++
      return acc
    }, { approved: 0, needs_fix: 0, pending: 0 })
    
    return stats
  }

  const stats = getStatusStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">{entries.length}</div>
              <div className="text-blue-600">總填報數</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
              <div className="text-green-600">已核准</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-900">{stats.needs_fix}</div>
              <div className="text-red-600">需修正</div>
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
      </div>

      {/* Header and Export */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">全部填報記錄</h2>
        <button
          onClick={exportToCSV}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          匯出 CSV
        </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用戶
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
                  建立時間
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => {
                const reviewStatus = getLatestReviewStatus(entry)
                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.profiles?.display_name || 'N/A'}
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
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${reviewStatus.color || 'bg-yellow-100 text-yellow-800'}`}>
                          {reviewStatus.status}
                        </span>
                      </div>
                      {reviewStatus.note && (
                        <div className="text-xs text-gray-500 mt-1">
                          {reviewStatus.note}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.created_at).toLocaleDateString()}
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
            系統中尚無任何填報記錄
          </p>
        </div>
      )}
    </div>
  )
}

export default AllEntriesTab