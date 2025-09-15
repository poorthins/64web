import { useState, useEffect } from 'react'
import { Fuel, Calendar, Calculator, FileText, AlertCircle, Loader2 } from 'lucide-react'
import EvidenceUpload from '../../components/EvidenceUpload'
import StatusSwitcher from '../../components/StatusSwitcher'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { 
  upsertEnergyEntry,
  getUserEntries,
  updateEntryStatus,
  EnergyEntry
} from '../../api/entries'
import { EvidenceFile } from '../../api/files'

interface DieselFormData {
  period: string
  // 加油記錄欄位
  refuelVolume?: number
  refuelDate?: string
  // 測試記錄欄位  
  testDate?: string
  testDuration?: number
  testVolume?: number
  // 共用欄位
  emission: number
  evidence: EvidenceFile[]
}

const DieselGeneratorPage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recordMode, setRecordMode] = useState<'refuel' | 'test'>('refuel')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [currentStatus, setCurrentStatus] = useState<'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'>('draft')
  const [isEditAllowed, setIsEditAllowed] = useState(true)
  const [formData, setFormData] = useState<DieselFormData>({
    period: new Date().toISOString().slice(0, 7),
    emission: 0,
    evidence: []
  })

  // 載入用戶的柴油模式設定
  useEffect(() => {
    if (user) {
      loadUserMode()
    }
  }, [user])

  // 當期間改變時重新載入資料
  useEffect(() => {
    if (user && formData.period) {
      loadData()
    }
  }, [formData.period, recordMode])

  const loadUserMode = async () => {
    if (!user?.id) return
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('filling_config')
        .eq('id', user.id)
        .single()
      
      const mode = profile?.filling_config?.diesel_generator_mode || 'refuel'
      setRecordMode(mode)
    } catch (error) {
      console.error('Failed to load user diesel mode:', error)
      // 使用預設值
      setRecordMode('refuel')
    }
  }

  const loadData = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      const pageKey = recordMode === 'test' ? 
        'diesel_generator_test' : 
        'diesel_generator'
      
      const year = parseInt(formData.period.split('-')[0])
      const month = parseInt(formData.period.split('-')[1])
      
      // 取得該頁面的所有記錄
      const entries = await getUserEntries(pageKey, year)
      
      // 找到當年的記錄
      const yearEntry = entries.find(entry => 
        entry.page_key === pageKey && entry.period_year === year
      )
      
      if (yearEntry) {
        setEntryId(yearEntry.id)
        setCurrentStatus(yearEntry.status as any)
        setIsEditAllowed(yearEntry.status === 'draft' || yearEntry.status === 'rejected')
        
        // 從 payload 載入表單資料
        const payload = yearEntry.payload || {}
        const monthKey = month.toString()
        const monthData = payload[monthKey] || {}
        
        setFormData({
          period: formData.period,
          refuelVolume: monthData.refuelVolume || 0,
          refuelDate: monthData.refuelDate || '',
          testDate: monthData.testDate || '',
          testDuration: monthData.testDuration || 0,
          testVolume: monthData.testVolume || 0,
          emission: monthData.emission || 0,
          evidence: monthData.evidence || []
        })
      } else {
        // 沒有記錄，重置表單
        setEntryId(null)
        setFormData({
          period: formData.period,
          emission: 0,
          evidence: []
        })
        setCurrentStatus('draft')
        setIsEditAllowed(true)
      }
    } catch (error) {
      console.error('載入資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      const pageKey = recordMode === 'test' ? 
        'diesel_generator_test' : 
        'diesel_generator'
      
      const [year, month] = formData.period.split('-').map(Number)
      
      // 準備月度數據
      const monthlyData: Record<string, number> = {}
      monthlyData[month.toString()] = formData.emission
      
      // 準備 payload（儲存表單詳細資料）
      const monthKey = month.toString()
      const payload: any = {}
      payload[monthKey] = {
        refuelVolume: formData.refuelVolume,
        refuelDate: formData.refuelDate,
        testDate: formData.testDate,
        testDuration: formData.testDuration,
        testVolume: formData.testVolume,
        emission: formData.emission,
        evidence: formData.evidence
      }
      
      const result = await upsertEnergyEntry({
        page_key: pageKey,
        period_year: year,
        unit: 'L',
        monthly: monthlyData,
        notes: `${recordMode === 'test' ? '測試記錄' : '加油記錄'} - ${formData.period}`
      })
      
      if (result.entry_id) {
        setEntryId(result.entry_id)
        
        // 更新 payload
        const { error: updateError } = await supabase
          .from('energy_entries')
          .update({ payload })
          .eq('id', result.entry_id)
        
        if (updateError) {
          console.error('更新 payload 失敗:', updateError)
        }
        
        alert('儲存成功！')
      }
    } catch (error) {
      console.error('儲存失敗:', error)
      alert('儲存失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus: 'submitted' | 'approved' | 'rejected') => {
    if (!entryId) {
      alert('請先儲存資料')
      return
    }

    try {
      await updateEntryStatus(entryId, newStatus)
      setCurrentStatus(newStatus)
      setIsEditAllowed(newStatus === 'rejected')
      alert('狀態更新成功')
    } catch (error) {
      console.error('狀態更新失敗:', error)
      alert('狀態更新失敗')
    }
  }

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPeriod = e.target.value
    setFormData(prev => ({ ...prev, period: newPeriod }))
  }

  const calculateEmission = () => {
    let co2 = 0
    
    if (recordMode === 'refuel') {
      // 加油記錄：直接使用加油量計算
      const volume = formData.refuelVolume || 0
      co2 = volume * 2.614 // 柴油排放係數
    } else {
      // 測試記錄：使用測試耗油量計算
      const volume = formData.testVolume || 0
      co2 = volume * 2.614 // 柴油排放係數
    }
    
    setFormData(prev => ({ ...prev, emission: parseFloat(co2.toFixed(2)) }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">載入中...</span>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-green-50"
    >
      {/* 主要內容區域 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 - 無背景框 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            柴油發電機 使用數量填報
          </h1>
          <p className="text-lg text-center text-gray-600 mb-6">
            請上傳 MSDS 文件並填入各月份使用數據進行碳排放計算
          </p>
        </div>

        {/* 狀態切換器 */}
        {currentStatus !== 'draft' && (
          <div className="mb-6">
            <StatusSwitcher
              currentStatus={currentStatus as any}
              onStatusChange={handleStatusChange}
              disabled={!isEditAllowed}
            />
          </div>
        )}

        {/* 表單內容 */}
        <div
          className="rounded-lg border p-6"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}
        >
          <h2 className="text-2xl font-medium mb-6" style={{ color: '#1a202c' }}>
            {recordMode === 'test' ? '測試記錄' : '加油記錄'}
          </h2>
        {/* 填報期間 */}
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-2">
            <Calendar className="inline w-4 h-4 mr-1" />
            填報期間
          </label>
          <input
            type="month"
            value={formData.period}
            onChange={handlePeriodChange}
            disabled={!isEditAllowed}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {/* 根據模式顯示不同的表單欄位 */}
        {recordMode === 'refuel' ? (
          // 加油記錄表單
          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                加油日期
              </label>
              <input
                type="date"
                value={formData.refuelDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, refuelDate: e.target.value }))}
                disabled={!isEditAllowed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                加油量（公升）
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.refuelVolume || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, refuelVolume: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditAllowed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="請輸入加油量"
              />
            </div>
          </div>
        ) : (
          // 測試記錄表單
          <div className="space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                測試日期
              </label>
              <input
                type="date"
                value={formData.testDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, testDate: e.target.value }))}
                disabled={!isEditAllowed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                測試時間（分鐘）
              </label>
              <input
                type="number"
                value={formData.testDuration || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, testDuration: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditAllowed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="請輸入測試運轉時間"
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                測試耗油量（公升）
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.testVolume || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, testVolume: parseFloat(e.target.value) || 0 }))}
                disabled={!isEditAllowed}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="請輸入測試期間耗油量"
              />
            </div>
          </div>
        )}

        {/* 計算按鈕 */}
        <div className="mt-6">
          <button
            onClick={calculateEmission}
            disabled={!isEditAllowed}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            <Calculator className="w-4 h-4 mr-2" />
            計算排放量
          </button>
        </div>

        {/* 排放量結果 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <div className="flex items-center justify-between">
            <span className="text-base font-medium text-gray-700">CO₂ 排放量</span>
            <span className="text-3xl font-bold text-blue-600">
              {formData.emission.toFixed(2)} kg CO₂e
            </span>
          </div>
        </div>

        {/* 證據上傳 */}
        <div className="mt-6">
          <label className="block text-base font-medium text-gray-700 mb-2">
            <FileText className="inline w-4 h-4 mr-1" />
            佐證資料
          </label>
          <EvidenceUpload
            pageKey={recordMode === 'test' ? 'diesel_generator_test' : 'diesel_generator'}
            month={parseInt(formData.period.split('-')[1])}
            files={formData.evidence}
            onFilesChange={(files) => setFormData(prev => ({ ...prev, evidence: files }))}
            disabled={!isEditAllowed}
            currentStatus={currentStatus as any}
          />
        </div>

          {/* 儲存按鈕 */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={!isEditAllowed || saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                '儲存'
              )}
            </button>
          </div>
        </div>

        {/* 說明文字 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-base font-medium text-yellow-800">
                {recordMode === 'test' ? '測試記錄說明' : '加油記錄說明'}
              </h3>
              <div className="mt-2 text-base text-yellow-700">
                {recordMode === 'test' ? (
                  <ul className="list-disc list-inside space-y-1">
                    <li>請記錄每次發電機測試的日期、運轉時間和耗油量</li>
                    <li>測試耗油量可透過油表變化或流量計測量</li>
                    <li>建議每月至少進行一次發電機測試</li>
                    <li>CO₂排放係數：2.614 kg CO₂e/公升</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    <li>請記錄每次為發電機加油的日期和加油量</li>
                    <li>加油量應以加油單據或發票上的數量為準</li>
                    <li>請保留加油單據作為佐證資料</li>
                    <li>CO₂排放係數：2.614 kg CO₂e/公升</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DieselGeneratorPage