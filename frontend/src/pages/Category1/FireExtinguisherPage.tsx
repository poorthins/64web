// src/pages/FireExtinguisherPage.tsx
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useEnergySubmit } from '../../hooks/useEnergySubmit'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { useReloadWithFileSync } from '../../hooks/useReloadWithFileSync'

import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import BottomActionBar from '../../components/BottomActionBar'
import ReviewSection from '../../components/ReviewSection'
import { EntryStatus } from '../../components/StatusSwitcher'

import { EvidenceFile } from '../../api/files'
import { UpsertEntryInput } from '../../api/entries'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'

/**
 * 滅火器記錄
 */
interface FireExtinguisherRecord {
  id: string                    // 穩定 ID（fire_timestamp）
  type: string                  // 設備類型
  quantity: number              // 數量
  unit: string                  // 單位
  location: string              // 位置
  isRefilled: boolean           // 該年度是否填充
  nameplatePhotos: MemoryFile[] // 銘牌照片（記憶體暫存）
}

/**
 * 頁面總資料結構
 */
interface FireExtinguisherData {
  inspectionReports: MemoryFile[]     // 全年度共用檢修表（記憶體暫存）
  records: FireExtinguisherRecord[]   // 滅火器清單
  fileMapping: Record<string, string[]> // 檔案映射表（global_inspection + recordId → fileIds）
}

const equipmentTypes = ['ABC 乾粉滅火器', 'CO2 滅火器', '泡沫滅火器', '海龍滅火器', '潔淨滅火器', '其他']
const unitOptions = ['支', '個', 'kg', 'L']

export default function FireExtinguisherPage() {
  const currentYear = new Date().getFullYear()
  const pageKey = 'fire_extinguisher'

  // ==================== URL 參數 ====================
  const [searchParams] = useSearchParams()
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId') || null

  // ==================== Hooks ====================
  const { entry, files, loading: dataLoading, reload } = useEnergyData(pageKey, currentYear, reviewEntryId)
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, currentYear)
  const banner = useStatusBanner(approvalStatus, isReviewMode)
  const { submit, save, submitting: submitLoading } = useEnergySubmit(pageKey, currentYear, approvalStatus.status)  // ✅ 使用資料庫狀態
  const { role } = useRole()
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, entry?.id || null)
  const { clear, clearing } = useEnergyClear(entry?.id || null, (entry?.status as EntryStatus) || 'submitted')
  const { cleanFiles } = useGhostFileCleaner()
  const { reloadAndSync } = useReloadWithFileSync(reload)

  const frontendStatus = useFrontendStatus({
    initialStatus: (entry?.status as EntryStatus) || 'submitted',
    entryId: entry?.id || null
  })
  const { currentStatus, setCurrentStatus, handleSubmitSuccess, isInitialLoad } = frontendStatus

  // ⭐ 審核模式下只有管理員可編輯
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  const editPermissions = useEditPermissions(currentStatus || 'submitted', isReadOnly, role)

  const submitting = submitLoading || clearing

  // ==================== 本地狀態 ====================
  const [data, setData] = useState<FireExtinguisherData>({
    inspectionReports: [],
    records: [],
    fileMapping: {}
  })

  // 已上傳的檢修表檔案（從 Supabase）
  const [uploadedInspectionFiles, setUploadedInspectionFiles] = useState<EvidenceFile[]>([])

  // 追蹤已載入的 entry ID
  const [lastLoadedEntryId, setLastLoadedEntryId] = useState<string | null>(null)

  // 本地檔案狀態（用於即時更新 UI，避免 reload）
  const [localFiles, setLocalFiles] = useState<EvidenceFile[]>([])

  const [newRecord, setNewRecord] = useState<Omit<FireExtinguisherRecord, 'id'>>({
    type: 'ABC 乾粉滅火器',
    quantity: 1,
    unit: '支',
    location: '',
    isRefilled: false,
    nameplatePhotos: []
  })

  const [showSuccess, setShowSuccess] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // ==================== 核心操作：新增記錄 ====================
  const handleAddRecord = useCallback(() => {
    if (!newRecord.location.trim()) {
      setErrorMessage('請填寫位置')
      setShowError(true)
      return
    }
    if (newRecord.quantity <= 0) {
      setErrorMessage('數量必須大於 0')
      setShowError(true)
      return
    }

    const record: FireExtinguisherRecord = {
      id: `fire_${Date.now()}`,
      ...newRecord
    }

    setData(prev => ({
      ...prev,
      records: [...prev.records, record] // 新增在最後
    }))

    // 重置表單
    setNewRecord({
      type: 'ABC 乾粉滅火器',
      quantity: 1,
      unit: '支',
      location: '',
      isRefilled: false,
      nameplatePhotos: []
    })
  }, [newRecord])

  // ==================== 核心操作：刪除記錄 ====================
  const handleDeleteRecord = useCallback((recordId: string) => {
    setData(prev => ({
      ...prev,
      records: prev.records.filter(r => r.id !== recordId)
    }))
    removeRecordMapping(recordId)
  }, [removeRecordMapping])

  // ==================== 核心操作：提交 ====================
  const handleSubmit = useCallback(async () => {
    // 驗證
    if (data.inspectionReports.length === 0 && uploadedInspectionFiles.length === 0) {
      setErrorMessage('請上傳消防安全設備檢修表')
      setShowError(true)
      return
    }
    if (data.records.length === 0) {
      setErrorMessage('請至少新增一筆滅火器記錄')
      setShowError(true)
      return
    }

    try {
      console.log('📤 [Submit] === 開始提交 ===')

      // 計算總數
      const totalQuantity = data.records.reduce((sum, r) => sum + r.quantity, 0)

      console.log('📤 [Submit] 檢修表檔案數:', data.inspectionReports.length)
      console.log('📤 [Submit] 記錄數:', data.records.length)
      console.log('📤 [Submit] fileMapping:', getFileMappingForPayload())

      // 準備 payload
      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: currentYear,
        unit: '支',
        monthly: { '1': totalQuantity },
        notes: `滅火器填報：共 ${data.records.length} 筆記錄，總數量 ${totalQuantity} 支`,
        extraPayload: {
          fireExtinguisherData: {
            records: data.records.map(r => ({
              ...r,
              nameplatePhotos: [] // 不存 blob 到 payload
            })),
            fileMapping: getFileMappingForPayload()
          }
        }
      }

      // 提交 entry + 上傳檢修表
      const newEntryId = await submit({
        formData: {
          unit: entryInput.unit,
          monthly: entryInput.monthly,
          notes: entryInput.notes,
          extraPayload: entryInput.extraPayload
        },
        msdsFiles: [],
        monthlyFiles: [],
        evidenceFiles: data.inspectionReports // 檢修表
      })

      if (!newEntryId) {
        throw new Error('無法取得 entryId')
      }

      console.log('📤 [Submit] 新 entryId:', newEntryId)

      // 上傳各滅火器的銘牌照片
      for (const record of data.records) {
        if (record.nameplatePhotos.length > 0) {
          console.log('📤 [Submit] 上傳記錄照片:', record.id, record.nameplatePhotos.length, '個檔案')
          await uploadRecordFiles(record.id, record.nameplatePhotos, newEntryId)
        }
      }

      console.log('📤 [Submit] 提交完成')

      // 清空記憶體檔案
      setData(prev => ({
        ...prev,
        inspectionReports: [],
        records: prev.records.map(r => ({ ...r, nameplatePhotos: [] }))
      }))

      await reload()
      await handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

    } catch (error) {
      console.error('⚠️ [Submit] 提交失敗:', error)
      const msg = error instanceof Error ? error.message : '提交失敗'
      setErrorMessage(msg)
      setShowError(true)
    }
  }, [
    data,
    uploadedInspectionFiles,
    currentYear,
    pageKey,
    submit,
    uploadRecordFiles,
    getFileMappingForPayload,
    reload,
    handleSubmitSuccess
  ])

  // ==================== 核心操作：暫存 ====================
  const handleSave = useCallback(async () => {
    try {
      console.log('📤 [Save] === 開始暫存 ===')

      // 計算總數
      const totalQuantity = data.records.reduce((sum, r) => sum + r.quantity, 0)

      // 審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備月份檔案列表
        const filesToUpload: Array<{
          file: File
          metadata: {
            month: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集全年度檢修表
        data.inspectionReports.forEach((mf) => {
          filesToUpload.push({
            file: mf.file,
            metadata: {
              month: 1,
              fileType: 'other' as const
            }
          })
        })

        // 收集每個滅火器的銘牌照片
        data.records.forEach((record) => {
          record.nameplatePhotos.forEach(mf => {
            filesToUpload.push({
              file: mf.file,
              metadata: {
                month: 1,
                fileType: 'other' as const,
                allRecordIds: [record.id]
              }
            })
          })
        })

        // 從舊區塊中提取 payload 資料
        await adminSave({
          updateData: {
            unit: '支',
            amount: totalQuantity,
            payload: {
              fireExtinguisherData: {
                records: data.records.map(r => ({
                  ...r,
                  nameplatePhotos: []
                })),
                fileMapping: getFileMappingForPayload()
              }
            },
          },
          files: filesToUpload
        })

        await reloadAndSync()
        reloadApprovalStatus()
        // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
        setData(prev => ({
          inspectionReports: [],
          records: prev.records.map(r => ({ ...r, nameplatePhotos: [] })),
          fileMapping: prev.fileMapping
        }))
        return
      }

      // 非審核模式：原本的邏輯
      // 準備 payload（不驗證）
      const entryInput = {
        unit: '支',
        monthly: { '1': totalQuantity },
        notes: `滅火器填報：共 ${data.records.length} 筆記錄，總數量 ${totalQuantity} 支`,
        extraPayload: {
          fireExtinguisherData: {
            records: data.records.map(r => ({
              ...r,
              nameplatePhotos: []
            })),
            fileMapping: getFileMappingForPayload()
          }
        }
      }

      // 使用 Hook 暫存
      const newEntryId = await save({
        formData: entryInput,
        msdsFiles: [],
        monthlyFiles: [],
        evidenceFiles: data.inspectionReports
      })

      if (!newEntryId) {
        throw new Error('無法取得 entryId')
      }

      // 上傳各滅火器的銘牌照片
      for (const record of data.records) {
        if (record.nameplatePhotos.length > 0) {
          await uploadRecordFiles(record.id, record.nameplatePhotos, newEntryId)
        }
      }

      await reloadAndSync()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 清空記憶體檔案（在 reload 之後，避免檔案暫時消失）
      setData(prev => ({
        ...prev,
        inspectionReports: [],
        records: prev.records.map(r => ({ ...r, nameplatePhotos: [] }))
      }))

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

    } catch (error) {
      console.error('⚠️ [Save] 暫存失敗:', error)
      const msg = error instanceof Error ? error.message : '暫存失敗'
      setErrorMessage(msg)
      setShowError(true)
    }
  }, [data, save, uploadRecordFiles, getFileMappingForPayload, reload, isReviewMode, reviewEntryId])

  // ==================== 核心操作：清除 ====================
  const handleClear = useCallback(async () => {
    try {
      const filesToDelete: EvidenceFile[] = [...uploadedInspectionFiles]

      // 收集所有記錄的檔案
      data.records.forEach(record => {
        const recordFiles = getRecordFiles(record.id, localFiles)
        filesToDelete.push(...recordFiles)
      })

      const memoryFilesToClean: MemoryFile[] = [
        ...data.inspectionReports,
        ...data.records.flatMap(r => r.nameplatePhotos)
      ]

      await clear({ filesToDelete, memoryFilesToClean })

      // 重置狀態
      setData({
        inspectionReports: [],
        records: [],
        fileMapping: {}
      })
      setUploadedInspectionFiles([])
      setLocalFiles([])
      setNewRecord({
        type: 'ABC 乾粉滅火器',
        quantity: 1,
        unit: '支',
        location: '',
        isRefilled: false,
        nameplatePhotos: []
      })

      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

    } catch (error) {
      const msg = error instanceof Error ? error.message : '清除失敗'
      setErrorMessage(msg)
      setShowError(true)
    }
  }, [data, uploadedInspectionFiles, localFiles, clear, getRecordFiles])

  // ==================== 載入：從 entry 還原記錄資料 ====================
  useEffect(() => {
    if (!entry) return
    if (dataLoading) return

    // 判斷是否應該載入表單資料
    const isNewEntry = entry.id !== lastLoadedEntryId
    const shouldLoadFormData = isInitialLoad.current || isNewEntry

    // 同步前端狀態（總是更新）
    if (entry.status) {
      setCurrentStatus(entry.status as EntryStatus)
    }

    // 只在首次載入或切換 entry 時設定表單欄位
    if (!shouldLoadFormData) return

    console.log('🔍 [Load] === 載入 entry payload ===')
    console.log('🔍 [Load] entry ID:', entry.id)
    console.log('🔍 [Load] isNewEntry:', isNewEntry, '(last:', lastLoadedEntryId, ')')

    // 載入記錄資料
    if (entry.payload?.fireExtinguisherData) {
      const rawData = entry.payload.fireExtinguisherData
      const rawRecords = Array.isArray(rawData.records) ? rawData.records : []

      console.log('🔍 [Load] payload 記錄數:', rawRecords.length)
      console.log('🔍 [Load] payload fileMapping:', rawData.fileMapping)

      setData({
        inspectionReports: [],
        records: rawRecords.map((r: any) => ({
          ...r,
          nameplatePhotos: [] // blob 不從 payload 載入
        })),
        fileMapping: rawData.fileMapping || {}
      })

      // 載入 fileMapping
      loadFileMapping(entry.payload.fireExtinguisherData)
      console.log('🔍 [Load] fileMapping 已載入')
    }

    // 記錄已載入的 entry ID
    setLastLoadedEntryId(entry.id)
    isInitialLoad.current = false
  }, [entry, dataLoading, lastLoadedEntryId, setCurrentStatus, loadFileMapping])

  // ==================== 載入：分配檔案到檢修表 ====================
  useEffect(() => {
    if (files.length === 0) return

    console.log('🔍 [Load] === 開始載入檔案 ===')
    console.log('🔍 [Load] files 總數:', files.length)
    console.log('🔍 [Load] pageKey:', pageKey)

    // 清理幽靈檔案，再分類
    const cleanAndAssignFiles = async () => {
      const validFiles = await cleanFiles(files)
      console.log('✅ [Load] 有效檔案數:', validFiles.length)

      // 同步到 localFiles
      setLocalFiles(validFiles)

      // 載入檢修表檔案
      const inspectionFiles = (validFiles as any[]).filter(f => {
        const match = f.page_key === pageKey &&
          (f.record_id == null && f.recordId == null) &&
          (f.record_ids == null || f.record_ids.length === 0) &&
          (f.record_index == null && f.recordIndex == null)
        return match
      })

      console.log('🔍 [Load] 過濾後的檢修表檔案數:', inspectionFiles.length)
      setUploadedInspectionFiles(inspectionFiles as EvidenceFile[])
    }

    cleanAndAssignFiles()
  }, [files, cleanFiles, pageKey])

  // ==================== 清理幽靈檔案 ====================
  useEffect(() => {
    // ⭐ 嚴格條件檢查，避免在狀態未準備好時執行
    if (!entry || localFiles.length === 0 || data.records.length === 0) return
    if (dataLoading) return  // 等待資料載入完成

    console.log('🗑️ [Clean] === 開始檢查幽靈檔案 ===')
    console.log('🗑️ [Clean] uploadedInspectionFiles 數量:', uploadedInspectionFiles.length)

    const collectValidIds = () => {
      const ids = new Set<string>()

      // 檢修表檔案
      console.log('🗑️ [Clean] 檢修表檔案:', uploadedInspectionFiles.length, '個')
      uploadedInspectionFiles.forEach(f => ids.add(f.id))

      // 記錄檔案
      data.records.forEach(record => {
        const recordFiles = getRecordFiles(record.id, localFiles)
        console.log('🗑️ [Clean] 記錄', record.id, '的檔案:', recordFiles.length, '個')
        recordFiles.forEach(f => ids.add(f.id))
      })

      console.log('🗑️ [Clean] 有效檔案總數:', ids.size)
      return ids
    }

    const cleanGhost = async () => {
      const validFileIds = collectValidIds()
      const ghostFiles = (localFiles as any[]).filter(
        f => f.page_key === pageKey && !validFileIds.has(f.id)
      )

      console.log('🗑️ [Clean] 所有檔案數:', localFiles.length)
      console.log('🗑️ [Clean] 幽靈檔案數:', ghostFiles.length)

      if (ghostFiles.length > 0) {
        console.log('🗑️ [Clean] 幽靈檔案 IDs:', ghostFiles.map(f => f.id.substring(0, 8)))
        await cleanFiles(ghostFiles as any)
        console.log('🗑️ [Clean] 清理完成')
      }
    }

    cleanGhost()
  }, [entry, localFiles, data.records, uploadedInspectionFiles, pageKey, getRecordFiles, cleanFiles, dataLoading])

  // ==================== Loading ====================
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: designTokens.colors.background }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: designTokens.colors.accentPrimary }} />
          <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
        </div>
      </div>
    )
  }

  // ==================== 計算總數 ====================
  const totalQuantity = data.records.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ==================== 標題 ==================== */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">滅火器使用數量填報</h1>
            <p className="text-lg text-gray-600">請填寫滅火器設備資料並上傳相關佐證文件</p>
          </div>

          {/* ==================== 審核狀態橫幅 - 統一管理 ==================== */}
          {banner && (
            <div className={`border-l-4 p-4 mb-6 rounded-r-lg ${getBannerColorClasses(banner.type)}`}>
              <div className="flex items-center">
                <div className="text-2xl mr-3">{banner.icon}</div>
                <div className="flex-1">
                  <p className="font-bold text-lg">{banner.title}</p>
                  {banner.message && <p className="text-sm mt-1">{banner.message}</p>}
                  {banner.reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                      <p className="text-base font-bold text-red-800 mb-1">退回原因：</p>
                      <p className="text-lg font-semibold text-red-900">{banner.reason}</p>
                    </div>
                  )}
                  {banner.reviewedAt && (
                    <p className="text-xs mt-2 opacity-75">
                      {banner.type === 'rejected' ? '退回時間' : '審核完成時間'}：
                      {new Date(banner.reviewedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 舊資料格式警告 ==================== */}
          {!isReviewMode && entry && !entry.payload?.fireExtinguisherData?.fileMapping && data.records.length > 0 && (
            <div className="rounded-lg p-4 border-l-4 bg-orange-50 border-orange-500">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 mt-0.5 mr-3 text-orange-600" />
                <div>
                  <h3 className="text-base font-medium text-orange-800 mb-1">舊版資料格式</h3>
                  <p className="text-base text-gray-700">
                    此填報使用舊版格式儲存，檔案顯示功能可能受限。建議重新提交以獲得更好的檔案管理體驗。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 檢修表上傳區（全域獨立） ==================== */}
          <div className="rounded-xl border-l-4 p-6 bg-white border-green-500 shadow-md">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 mr-2 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">消防安全設備檢修表</h2>
            </div>
            <div>
              <label className="block text-base font-medium mb-2 text-gray-700">佐證資料</label>
              <EvidenceUpload
                pageKey={pageKey}
                files={uploadedInspectionFiles}
                onFilesChange={setUploadedInspectionFiles}
                memoryFiles={data.inspectionReports}
                onMemoryFilesChange={(memFiles) => setData(prev => ({ ...prev, inspectionReports: memFiles }))}
                maxFiles={3}
                disabled={submitting || !editPermissions.canUploadFiles || isReadOnly || approvalStatus.isApproved}
                kind="other"
                mode={isReadOnly ? "view" : "edit"}
                isAdminReviewMode={isReviewMode && role === 'admin'}
              />
              <p className="text-sm mt-1 text-gray-500">
                {isReviewMode ? '已上傳的消防安全設備檢修表' : '請上傳消防安全設備檢修表或相關證明文件（全年度共用）'}
              </p>
            </div>
          </div>

          {/* ==================== 新增表單 ==================== */}
          {!isReadOnly && (
            <div className="rounded-xl border p-6 bg-white shadow-md">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">新增滅火器記錄</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-700">設備類型</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    {equipmentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-medium mb-2 text-gray-700">數量</label>
                  <input
                    type="number"
                    min="1"
                    value={newRecord.quantity}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-base font-medium mb-2 text-gray-700">單位</label>
                  <select
                    value={newRecord.unit}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    {unitOptions.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-medium mb-2 text-gray-700">位置</label>
                  <input
                    type="text"
                    value={newRecord.location}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="例如：1F 走廊、辦公室"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-base font-medium mb-2 text-gray-700">該年度是否填充</label>
                  <select
                    value={newRecord.isRefilled ? 'yes' : 'no'}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, isRefilled: e.target.value === 'yes' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={submitting}
                  >
                    <option value="no">否</option>
                    <option value="yes">是</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-base font-medium mb-2 text-gray-700">滅火器銘牌照片</label>
                <EvidenceUpload
                  pageKey={pageKey}
                  files={[]}
                  onFilesChange={() => {}}
                  memoryFiles={newRecord.nameplatePhotos}
                  onMemoryFilesChange={(memFiles) => setNewRecord(prev => ({ ...prev, nameplatePhotos: memFiles }))}
                  maxFiles={3}
                  kind="other"
                  mode="edit"
                  disabled={submitting}
                  isAdminReviewMode={isReviewMode && role === 'admin'}
                />
                <p className="text-sm mt-1 text-gray-500">請上傳此滅火器的銘牌照片作為佐證</p>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleAddRecord}
                  className="px-6 py-3 bg-green-600 text-white text-lg font-bold rounded-lg hover:bg-green-700 transition-all shadow-md flex items-center space-x-2"
                  disabled={submitting}
                >
                  <Plus className="w-5 h-5" />
                  <span>新增記錄</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================== 滅火器清單 ==================== */}
          {data.records.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-gray-900">滅火器清單</h2>
              <div className="space-y-4">
                {data.records.map((record, index) => {
                  const recordFiles = getRecordFiles(record.id, localFiles)
                  console.log('🔍 [Render] 記錄檔案:', record.id, '→', recordFiles.length, '個檔案')

                  return (
                    <div key={record.id} className="rounded-xl p-6 bg-white shadow-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Shield className="w-6 h-6 text-red-600 flex-shrink-0" />
                          <div>
                            <h3 className="text-xl font-bold text-gray-800">{record.type}</h3>
                            <p className="text-sm text-gray-500">位置：{record.location}</p>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除此記錄"
                            disabled={submitting}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">數量</p>
                          <p className="text-lg font-bold text-gray-800">{record.quantity}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">單位</p>
                          <p className="text-lg font-bold text-gray-800">{record.unit}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">填充狀態</p>
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                            record.isRefilled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {record.isRefilled ? '已填充' : '未填充'}
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2 text-gray-700">銘牌照片</label>
                        <EvidenceUpload
                          pageKey={pageKey}
                          files={recordFiles}
                          onFilesChange={(updatedFiles) => {
                            // ✅ 直接更新 localFiles，不要 reload（跟化糞池一樣）
                            setLocalFiles(prev => {
                              // 從 prev 中移除被刪除的檔案
                              const deletedFileIds = recordFiles
                                .filter(f => !updatedFiles.find(uf => uf.id === f.id))
                                .map(f => f.id)
                              return prev.filter(f => !deletedFileIds.includes(f.id))
                            })
                          }}
                          memoryFiles={record.nameplatePhotos}
                          onMemoryFilesChange={(memFiles) => {
                            setData(prev => ({
                              ...prev,
                              records: prev.records.map(r =>
                                r.id === record.id ? { ...r, nameplatePhotos: memFiles } : r
                              )
                            }))
                          }}
                          maxFiles={3}
                          disabled={submitting || isReadOnly || approvalStatus.isApproved}
                          kind="other"
                          mode={isReadOnly ? 'view' : 'edit'}
                          isAdminReviewMode={isReviewMode && role === 'admin'}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ==================== 年度總計 ==================== */}
          {data.records.length > 0 && (
            <div className="rounded-xl border p-6 bg-white shadow-md">
              <h3 className="text-2xl font-bold mb-4 text-gray-900">{currentYear} 年度總計</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-base text-gray-600">總設備數量</p>
                  <p className="text-3xl font-bold text-blue-600">{totalQuantity} 支</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-base text-gray-600">記錄筆數</p>
                  <p className="text-3xl font-bold text-green-600">{data.records.length} 筆</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 審核模式資訊 ==================== */}
          {isReviewMode && entry && (
            <div className="rounded-lg border-2 p-6 bg-yellow-50 border-yellow-500">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mt-0.5 mr-3 flex-shrink-0 text-yellow-600" />
                <div>
                  <h3 className="text-lg font-bold mb-2 text-yellow-800">管理員審核模式</h3>
                  <div className="text-base text-gray-700 space-y-2">
                    <p><strong>填報內容總覽：</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>消防安全設備檢修表：共 {uploadedInspectionFiles.length} 個檔案</li>
                      <li>滅火器記錄：共 {data.records.length} 筆記錄</li>
                      <li>總設備數量：{totalQuantity} 支</li>
                    </ul>
                    <p className="mt-3 text-sm text-gray-600">
                      請仔細檢查上方所有資料是否完整正確，然後在下方審核區進行審核操作。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 審核區段 ==================== */}
          {isReviewMode && entry && (
            <ReviewSection
              entryId={entry.id}
              userId={entry.owner_id}
              category="滅火器"
              amount={totalQuantity}
              unit="支"
              role={role}
              onSave={handleSave}
              isSaving={submitting}
            />
          )}

          {/* ==================== 成功提示 ==================== */}
          {showSuccess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
                <button onClick={() => setShowSuccess(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">×</button>
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">操作成功</h3>
                  <p className="text-base text-gray-500 mb-6">
                    滅火器填報已成功提交，總設備數量 {totalQuantity} 支
                  </p>
                  <button onClick={() => setShowSuccess(false)} className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    確定
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 錯誤提示 ==================== */}
          {showError && (
            <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
              <AlertCircle className="w-5 h-5" />
              <span>{errorMessage}</span>
              <button onClick={() => setShowError(false)} className="ml-2 hover:bg-red-600 rounded p-1">×</button>
            </div>
          )}
        </div>

        {/* 底部空間 */}
        <div className="h-20" />
      </div>

      {/* ==================== 底部操作欄 ==================== */}
      {!isReadOnly && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={entry?.id || null}
          isUpdating={false}
          hasSubmittedBefore={!!entry}
          banner={banner}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={handleClear}
          designTokens={designTokens}
        />
      )}
    </>
  )
}
