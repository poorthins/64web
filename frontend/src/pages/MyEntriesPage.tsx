import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'

interface EnergyEntry {
  id: string
  owner_id: string
  period_start: string
  period_end: string
  category: string
  unit: string
  amount: number
  notes?: string
  created_at: string
  updated_at: string
}

interface FormData {
  period_start: string
  period_end: string
  category: string
  unit: string
  amount: string
  notes: string
}

const MyEntriesPage = () => {
  const { user } = useAuth()
  const [entries, setEntries] = useState<EnergyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    period_start: '',
    period_end: '',
    category: '',
    unit: '',
    amount: '',
    notes: ''
  })

  const categoryOptions = [
    { value: 'electricity', label: '電力' },
    { value: 'gas', label: '天然氣' },
    { value: 'fuel', label: '燃料' },
    { value: 'water', label: '用水' },
    { value: 'waste', label: '廢棄物' },
    { value: 'transport', label: '運輸' },
    { value: 'other', label: '其他' }
  ]

  const unitOptions = [
    { value: 'kwh', label: 'kWh' },
    { value: 'm3', label: 'm³' },
    { value: 'liter', label: '公升' },
    { value: 'kg', label: '公斤' },
    { value: 'ton', label: '公噸' },
    { value: 'km', label: '公里' },
    { value: 'unit', label: '個/次' }
  ]

  useEffect(() => {
    if (user) {
      fetchEntries()
    }
  }, [user])

  const fetchEntries = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('energy_entries')
        .select('*')
        .eq('owner_id', user.id)
        .order('period_start', { ascending: false })

      if (error) throw error
      setEntries(data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching entries:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // 前端驗證
    if (new Date(formData.period_end) < new Date(formData.period_start)) {
      setError('結束日期必須大於或等於開始日期')
      return
    }

    const amount = parseFloat(formData.amount)
    if (amount <= 0) {
      setError('數量必須大於 0')
      return
    }

    try {
      setFormLoading(true)
      setError(null)

      const entryData = {
        owner_id: user.id,
        period_start: formData.period_start,
        period_end: formData.period_end,
        category: formData.category,
        unit: formData.unit,
        amount: amount,
        notes: formData.notes.trim() || null
      }

      if (editingId) {
        const { error } = await supabase
          .from('energy_entries')
          .update({
            period_start: entryData.period_start,
            period_end: entryData.period_end,
            category: entryData.category,
            unit: entryData.unit,
            amount: entryData.amount,
            notes: entryData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)
          .eq('owner_id', user.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('energy_entries')
          .insert([entryData])

        if (error) throw error
      }

      resetForm()
      await fetchEntries()
    } catch (err: any) {
      setError(err.message)
      console.error('Error saving entry:', err)
    } finally {
      setFormLoading(false)
    }
  }

  const handleEdit = (entry: EnergyEntry) => {
    setEditingId(entry.id)
    setFormData({
      period_start: entry.period_start,
      period_end: entry.period_end,
      category: entry.category,
      unit: entry.unit,
      amount: entry.amount.toString(),
      notes: entry.notes || ''
    })
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('確定要刪除這筆填報嗎？')) return

    try {
      const { error } = await supabase
        .from('energy_entries')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id)

      if (error) throw error
      await fetchEntries()
    } catch (err: any) {
      setError(err.message)
      console.error('Error deleting entry:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      period_start: '',
      period_end: '',
      category: '',
      unit: '',
      amount: '',
      notes: ''
    })
    setShowForm(false)
    setEditingId(null)
    setError(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  const getCategoryLabel = (value: string) => {
    return categoryOptions.find(opt => opt.value === value)?.label || value
  }

  const getUnitLabel = (value: string) => {
    return unitOptions.find(opt => opt.value === value)?.label || value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">我的填報</h1>
          <p className="text-gray-600 mt-1">管理您的能源使用填報記錄</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>新增填報</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 表單 */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? '編輯填報' : '新增填報'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
                disabled={formLoading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始日期 *
                  </label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={formLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    結束日期 *
                  </label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    類別 *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={formLoading}
                  >
                    <option value="">選擇類別</option>
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    單位 *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={formLoading}
                  >
                    <option value="">選擇單位</option>
                    {unitOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  數量 *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="請輸入數量"
                  min="0"
                  step="0.01"
                  required
                  disabled={formLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備註
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="選填"
                  disabled={formLoading}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={formLoading}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={formLoading}
                >
                  {formLoading ? '處理中...' : editingId ? '更新' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">尚無填報記錄</h3>
            <p className="text-gray-600">點擊上方「新增填報」按鈕開始記錄您的能源使用資料</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">期間</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類別</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">數量</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">備註</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.period_start)} ~ {formatDate(entry.period_end)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getCategoryLabel(entry.category)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {entry.amount.toLocaleString()} {getUnitLabel(entry.unit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {entry.notes || '－'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyEntriesPage