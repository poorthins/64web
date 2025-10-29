import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Loader2, X, Eye } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from '../../components/EvidenceUpload'
import { EntryStatus } from '../../components/StatusSwitcher'
import StatusIndicator from '../../components/StatusIndicator'
import Toast, { ToastType } from '../../components/Toast'
import BottomActionBar from '../../components/BottomActionBar'
import ReviewSection from '../../components/ReviewSection'
import { useEditPermissions } from '../../hooks/useEditPermissions'
import { useGhostFileCleaner } from '../../hooks/useGhostFileCleaner'
import { useFrontendStatus } from '../../hooks/useFrontendStatus'
import { useEnergyClear } from '../../hooks/useEnergyClear'
import { useEnergyData } from '../../hooks/useEnergyData'
import { useApprovalStatus } from '../../hooks/useApprovalStatus'
import { useStatusBanner, getBannerColorClasses } from '../../hooks/useStatusBanner'
import { useRecordFileMapping } from '../../hooks/useRecordFileMapping'
import { useRole } from '../../hooks/useRole'
import { useAdminSave } from '../../hooks/useAdminSave'
import { commitEvidence, getEntryFiles, EvidenceFile, uploadEvidenceWithEntry } from '../../api/files'
import { upsertEnergyEntry, UpsertEntryInput, getEntryByPageKeyAndYear } from '../../api/entries'
import { supabase } from '../../lib/supabaseClient'
import { designTokens } from '../../utils/designTokens'
import { getCategoryInfo } from '../../utils/categoryConstants'
import { DocumentHandler } from '../../services/documentHandler'

// 柴油發電機測試資料結構（多台發電機）
interface GeneratorRecord {
  id: string                     // ⭐ 記錄 ID（改用 string）
  generatorLocation: string      // 發電機位置
  powerRating: number            // 發電功率 (kW)
  testFrequency: string          // 發動測試頻率
  testDuration: number           // 測試時間(分)
  annualTestTime: number         // 年總測試時間(分)
  nameplateFiles: EvidenceFile[] // 發電機銘牌檔案
  nameplateMemoryFiles?: MemoryFile[] // 記憶體暫存檔案
  isExample?: boolean            // 是否為範例列
}

// 固定的「範例列」，會放在第一列、不可編輯/不可刪除/不參與送出
const EXAMPLE_GENERATOR: GeneratorRecord = {
  id: 'example',  // ⭐ 字串 ID
  generatorLocation: '倉庫A',
  powerRating: 100,
  testFrequency: '每月1次',
  testDuration: 30,
  annualTestTime: 360,
  nameplateFiles: [],
  nameplateMemoryFiles: [],
  isExample: true
}

// 把 generators 排序成：範例列永遠第一，其餘照原順序
const withExampleFirst = (generators: GeneratorRecord[]) => {
  const others = generators.filter(g => !g.isExample)
  return [EXAMPLE_GENERATOR, ...others]
}

const DieselGeneratorTestPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewEntryId = searchParams.get('entryId')
  const reviewUserId = searchParams.get('userId')

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasSubmittedBefore, setHasSubmittedBefore] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false)
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null)
  const [initialStatus, setInitialStatus] = useState<EntryStatus>('submitted')
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

  // 狀態管理 Hook
  const frontendStatus = useFrontendStatus({
    initialStatus,
    entryId: currentEntryId
  })

  const { currentStatus: frontendCurrentStatus, setCurrentStatus, handleSubmitSuccess, handleDataChanged, isInitialLoad } = frontendStatus
  const currentStatus = frontendCurrentStatus || initialStatus
  const isUpdating = false

  // 表單資料（多台發電機）
  const [year] = useState(new Date().getFullYear())
  const [generators, setGenerators] = useState<GeneratorRecord[]>([])

  const pageKey = 'diesel_generator'

  // 資料載入 Hook
  const entryIdToLoad = isReviewMode && reviewEntryId ? reviewEntryId : undefined
  const {
    entry: loadedEntry,
    files: loadedFiles,
    loading: dataLoading,
    error: dataError,
    reload
  } = useEnergyData(pageKey, year, entryIdToLoad)

  // 角色檢查 Hook
  const { role } = useRole()
  const isReadOnly = isReviewMode && role !== 'admin'

  // 管理員審核儲存 Hook
  const { save: adminSave, saving: adminSaving } = useAdminSave(pageKey, reviewEntryId)

  // 編輯權限控制
  const editPermissions = useEditPermissions(currentStatus, isReadOnly)

  // 審核狀態 Hook
  const { reload: reloadApprovalStatus, ...approvalStatus } = useApprovalStatus(pageKey, year)

  // 統一狀態橫幅 Hook
  const banner = useStatusBanner(approvalStatus, isReviewMode)

  const { cleanFiles } = useGhostFileCleaner()

  // 清除 Hook
  const {
    clear,
    clearing: clearLoading,
    error: clearError,
    clearError: clearClearError
  } = useEnergyClear(currentEntryId, currentStatus)

  // 檔案映射 Hook
  const {
    uploadRecordFiles,
    getRecordFiles,
    loadFileMapping,
    getFileMappingForPayload,
    removeRecordMapping
  } = useRecordFileMapping(pageKey, currentEntryId)

  // 判斷是否有資料（排除範例列）
  const hasAnyData = useMemo(() => {
    const userGenerators = generators.filter(g => !g.isExample)
    return userGenerators.length > 0
  }, [generators])

  // 第一步：載入記錄資料（不等檔案）
  useEffect(() => {
    if (loadedEntry && !dataLoading) {
      const entryStatus = loadedEntry.status as EntryStatus
      setInitialStatus(entryStatus)
      setCurrentStatus(entryStatus)  // 同步前端狀態
      setCurrentEntryId(loadedEntry.id)
      setHasSubmittedBefore(true)

      console.log('🔍 [DieselGeneratorTestPage] Loading data check:', {
        hasEntry: !!loadedEntry,
        status: loadedEntry?.status,
        hasPayload: !!loadedEntry?.payload,
        mode: loadedEntry?.payload?.mode,
        hasGenerators: !!loadedEntry?.payload?.generators
      })

      // 載入已提交的記錄數據（多台發電機）
      if (loadedEntry.payload?.mode === 'test') {
        let loadedGenerators: GeneratorRecord[] = []

        // 從 payload.generators 載入（新格式）
        if (loadedEntry.payload.generators && Array.isArray(loadedEntry.payload.generators)) {
          loadedGenerators = loadedEntry.payload.generators.map((g: any, index: number) => ({
            id: g.id ? String(g.id) : `${pageKey}_${Date.now()}_${index}`,  // ⭐ 優先用 payload 的 id（轉 string），沒有就生成
            generatorLocation: g.generatorLocation || '',
            powerRating: g.powerRating || 0,
            testFrequency: g.testFrequency || '',
            testDuration: g.testDuration || 0,
            annualTestTime: g.annualTestTime || 0,
            nameplateFiles: [],
            nameplateMemoryFiles: []
          }))
        }
        // 舊格式相容：從 payload.testData 轉換（單台發電機）
        else if (loadedEntry.payload.testData) {
          const oldData = loadedEntry.payload.testData
          loadedGenerators = [{
            id: oldData.id ? String(oldData.id) : `${pageKey}_${Date.now()}`,  // ⭐ 強制轉換成 string
            generatorLocation: oldData.generatorLocation || '',
            powerRating: oldData.powerRating || 0,
            testFrequency: oldData.testFrequency || '',
            testDuration: oldData.testDuration || 0,
            annualTestTime: oldData.annualTestTime || 0,
            nameplateFiles: [],
            nameplateMemoryFiles: []
          }]
        }

        console.log(`🔍 [DieselGeneratorTestPage] Loaded records: ${loadedGenerators.length}`)
        setGenerators(loadedGenerators)

        // ⭐ 載入 fileMapping（還原檔案映射表）
        loadFileMapping(loadedEntry.payload)
      } else if (loadedEntry.payload?.mode === 'refuel') {
        console.warn('[DieselGeneratorTestPage] Found refuel mode data, skipping load in test mode page')
      }

      if (!isInitialLoad.current) {
        handleDataChanged()
      }
      isInitialLoad.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedEntry, dataLoading])

  // 第二步：檔案載入後分配到記錄（非破壞性更新）
  useEffect(() => {
    // ⭐ 防止 Race Condition：等待檔案載入完成
    if (dataLoading) {
      console.log('🔍 [DieselGeneratorTestPage] 等待檔案載入中...')
      return
    }

    if (loadedFiles.length > 0 && generators.length > 0) {
      // 檔案過濾：只取 file_type='other' 且 page_key === pageKey 的檔案
      const generatorFiles = loadedFiles.filter(f =>
        f.file_type === 'other' && f.page_key === pageKey
      )

      if (generatorFiles.length > 0) {
        // ✅ 先清理所有檔案,再分配給記錄(避免 EvidenceUpload 載入幽靈檔案)
        const cleanAndAssignFiles = async () => {
          console.log('[DieselGeneratorTestPage] Starting ghost file cleanup for', generatorFiles.length, 'files')

          // 第一階段：清理所有幽靈檔案（使用 Hook）
          const validGeneratorFiles = await cleanFiles(generatorFiles)
          console.log('[DieselGeneratorTestPage] Cleanup complete. Valid files:', validGeneratorFiles.length)

          // 第二階段：非破壞性更新 - 只更新檔案欄位，保留原有資料
          setGenerators(prev => {
            const userGenerators = prev.filter(g => !g.isExample)
            console.log(`[DieselGeneratorTestPage] Updating ${userGenerators.length} generators with files`)

            const updatedGenerators = userGenerators.map((generator) => {
              // ⭐ 使用 recordId 查詢檔案（不再用陣列索引）
              const recordFiles = getRecordFiles(generator.id, validGeneratorFiles)

              console.log(`📁 [DieselGeneratorTestPage] Generator ${generator.id}: ${recordFiles.length} files`)

              return {
                ...generator,  // ✅ 保留所有原有資料
                nameplateFiles: recordFiles,
                nameplateMemoryFiles: []  // ✅ 清空 memoryFiles，避免重複提交
              }
            })

            console.log(`✅ [DieselGeneratorTestPage] Assigned files to ${updatedGenerators.filter(g => g.nameplateFiles.length > 0).length} generators`)
            return updatedGenerators
          })
        }

        cleanAndAssignFiles()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFiles, pageKey, dataLoading, cleanFiles, getRecordFiles])

  // Generators 陣列操作函式
  const addGenerator = () => {
    const newGenerator: GeneratorRecord = {
      id: `${pageKey}_${Date.now()}`,  // ⭐ 穩定的 recordId
      generatorLocation: '',
      powerRating: 0,
      testFrequency: '',
      testDuration: 0,
      annualTestTime: 0,
      nameplateFiles: [],
      nameplateMemoryFiles: []
    }
    // 新的插在最前面（舊的往下推）
    setGenerators(prev => [newGenerator, ...prev])
    handleDataChanged()
  }

  const updateGenerator = (id: string, field: keyof Omit<GeneratorRecord, 'id' | 'isExample'>, value: any) => {  // ⭐ 改成 string
    setGenerators(prev => prev.map(g =>
      g.id === id ? { ...g, [field]: value } : g
    ))
    handleDataChanged()
  }

  const deleteGenerator = (id: string) => {  // ⭐ 改成 string
    setGenerators(prev => prev.filter(g => g.id !== id))
    // ⭐ 清理映射表
    removeRecordMapping(id)
    handleDataChanged()
  }

  const validateData = () => {
    const errors: string[] = []
    const userGenerators = generators.filter(g => !g.isExample)

    if (userGenerators.length === 0) {
      errors.push('請至少新增一台發電機記錄')
      return errors
    }

    userGenerators.forEach((generator, index) => {
      const rowNum = index + 1

      if (!generator.generatorLocation.trim()) {
        errors.push(`發電機 #${rowNum}：請填寫位置`)
      }
      if (generator.powerRating <= 0) {
        errors.push(`發電機 #${rowNum}：發電功率必須大於0`)
      }
      if (!generator.testFrequency.trim()) {
        errors.push(`發電機 #${rowNum}：請填寫測試頻率`)
      }
      if (generator.testDuration <= 0) {
        errors.push(`發電機 #${rowNum}：測試時間必須大於0分鐘`)
      }
      if (generator.annualTestTime <= 0) {
        errors.push(`發電機 #${rowNum}：年總測試時間必須大於0分鐘`)
      }

      // 檢查發電機銘牌檔案
      const totalFiles = generator.nameplateFiles.length + (generator.nameplateMemoryFiles?.length || 0)
      if (totalFiles === 0) {
        errors.push(`發電機 #${rowNum}：請上傳銘牌佐證資料`)
      }
    })

    return errors
  }

  const handleSubmit = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setToast({
        message: '請修正以下問題：\n' + errors.join('\n'),
        type: 'error'
      })
      return
    }

    setSubmitting(true)
    setSuccess(null)

    try {
      console.log('🔍 ========== 柴油發電機測試提交診斷開始（多台） ==========')

      const userGenerators = generators.filter(g => !g.isExample)
      console.log(`🔍 [1] 提交 ${userGenerators.length} 台發電機`)

      // 計算所有發電機的總年度測試時間
      const totalAnnualTestTime = userGenerators.reduce((sum, g) => sum + g.annualTestTime, 0)
      console.log('🔍 [2] 總年度測試時間:', totalAnnualTestTime)

      // ⭐ 準備 generators 資料（不包含檔案，清理 payload）
      const generatorsData = userGenerators.map(g => ({
        id: g.id,  // ⭐ 保留 recordId
        generatorLocation: g.generatorLocation,
        powerRating: g.powerRating,
        testFrequency: g.testFrequency,
        testDuration: g.testDuration,
        annualTestTime: g.annualTestTime
      }))

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '分鐘',
        monthly: {
          '12': totalAnnualTestTime // 年度總測試時間
        },
        extraPayload: {
          mode: 'test',
          generators: generatorsData, // 儲存多台發電機資料
          fileMapping: getFileMappingForPayload(),  // ⭐ 保存 fileMapping
          notes: `柴油發電機測試記錄 - ${userGenerators.length} 台發電機`
        }
      }

      console.log('🔍 [3] entryInput:', entryInput)

      const { entry_id } = await upsertEnergyEntry(entryInput, false)  // ✅ preserveStatus = false (重新提交變 submitted)

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // ⭐ 使用 uploadRecordFiles 上傳檔案（帶 recordId）
      for (const generator of userGenerators) {
        if (generator.nameplateMemoryFiles && generator.nameplateMemoryFiles.length > 0) {
          console.log(`📁 [DieselGeneratorTestPage] 上傳發電機 ${generator.id} 的 ${generator.nameplateMemoryFiles.length} 個檔案...`)
          await uploadRecordFiles(generator.id, generator.nameplateMemoryFiles, entry_id)
        }
      }

      // ⭐ 再次保存 entry（此時 fileMapping 已更新）
      await upsertEnergyEntry({
        ...entryInput,
        extraPayload: {
          ...entryInput.extraPayload,
          fileMapping: getFileMappingForPayload()  // ✅ 此時 fileMapping 有檔案 ID
        }
      }, true)  // preserveStatus = true（保持 submitted 狀態）

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      await handleSubmitSuccess()

      // 重新載入審核狀態，更新狀態橫幅
      reloadApprovalStatus()

      // 重新載入已上傳的檔案
      console.log('🔄 [DieselGeneratorTestPage] 重新載入銘牌檔案...')
      try {
        const updatedFiles = await getEntryFiles(entry_id)
        const validFiles = await cleanFiles(updatedFiles)

        // ⭐ 更新 generators 的檔案（使用 recordId 查詢）
        setGenerators(prev => prev.map((generator) => {
          if (generator.isExample) return generator

          const recordFiles = getRecordFiles(generator.id, validFiles)

          return {
            ...generator,
            nameplateFiles: recordFiles,
            nameplateMemoryFiles: []
          }
        }))

        console.log(`✅ [DieselGeneratorTestPage] 檔案重新載入完成`)

      } catch (fileError) {
        console.error('❌ [DieselGeneratorTestPage] 重新載入檔案失敗:', fileError)
      }

      setSuccess(`發電機測試資料已提交成功\n共 ${userGenerators.length} 台發電機\n總年度測試時間：${totalAnnualTestTime} 分鐘`)
      setHasSubmittedBefore(true)
      setShowSuccessModal(true)

    } catch (error) {
      console.error('Submit error:', error)
      setToast({
        message: error instanceof Error ? error.message : '提交失敗',
        type: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSave = async () => {
    const errors = validateData()
    if (errors.length > 0) {
      setToast({
        message: '請修正以下問題：\n' + errors.join('\n'),
        type: 'error'
      })
      return
    }

    setSubmitting(true)
    setSuccess(null)

    try {
      console.log('🔍 ========== 柴油發電機測試儲存（保持狀態）==========')

      const userGenerators = generators.filter(g => !g.isExample)
      const totalAnnualTestTime = userGenerators.reduce((sum, g) => sum + g.annualTestTime, 0)

      // 準備 generators 資料
      const generatorsData = userGenerators.map(g => ({
        id: g.id,
        generatorLocation: g.generatorLocation,
        powerRating: g.powerRating,
        testFrequency: g.testFrequency,
        testDuration: g.testDuration,
        annualTestTime: g.annualTestTime
      }))

      // 📝 管理員審核模式：使用 useAdminSave hook
      if (isReviewMode && reviewEntryId) {
        console.log('📝 管理員審核模式：使用 useAdminSave hook', reviewEntryId)

        // 準備發電機銘牌檔案
        const filesToUpload: Array<{
          file: File
          metadata: {
            recordIndex: number
            fileType: 'usage_evidence' | 'msds' | 'other'
          }
        }> = []

        // 收集每台發電機的銘牌檔案
        userGenerators.forEach((generator, generatorIndex) => {
          const memFiles = generator.nameplateMemoryFiles || []
          memFiles.forEach(mf => {
            filesToUpload.push({
              file: mf.file,
              metadata: {
                recordIndex: generatorIndex,
                fileType: 'other' as const
              }
            })
          })
        })

        await adminSave({
          updateData: {
            unit: '分鐘',
            amount: totalAnnualTestTime,
            payload: {
              mode: 'test',
              generators: generatorsData,
              fileMapping: getFileMappingForPayload(),
              notes: `柴油發電機測試記錄 - ${userGenerators.length} 台發電機`
            }
          },
          files: filesToUpload
        })

        // 清空記憶體檔案
        setGenerators(prev => prev.map(g => ({
          ...g,
          nameplateMemoryFiles: []
        })))

        await reload()
        reloadApprovalStatus()
        setToast({ message: '✅ 儲存成功！資料已更新', type: 'success' })
        setSubmitting(false)
        return
      }

      const entryInput: UpsertEntryInput = {
        page_key: pageKey,
        period_year: year,
        unit: '分鐘',
        monthly: {
          '12': totalAnnualTestTime
        },
        extraPayload: {
          mode: 'test',
          generators: generatorsData,
          fileMapping: getFileMappingForPayload(),
          notes: `柴油發電機測試記錄 - ${userGenerators.length} 台發電機`
        }
      }

      const { entry_id } = await upsertEnergyEntry(entryInput, true)  // ✅ preserveStatus = true

      if (!currentEntryId) {
        setCurrentEntryId(entry_id)
      }

      // 上傳檔案（使用 recordId）
      for (const generator of userGenerators) {
        if (generator.nameplateMemoryFiles && generator.nameplateMemoryFiles.length > 0) {
          console.log(`📁 [DieselGeneratorTestPage] 儲存發電機 ${generator.id} 的檔案...`)
          await uploadRecordFiles(generator.id, generator.nameplateMemoryFiles, entry_id)
        }
      }

      // 再次保存（更新 fileMapping）
      await upsertEnergyEntry({
        ...entryInput,
        extraPayload: {
          ...entryInput.extraPayload,
          fileMapping: getFileMappingForPayload()
        }
      }, true)

      await commitEvidence({
        entryId: entry_id,
        pageKey: pageKey
      })

      // 重新載入檔案
      try {
        const updatedFiles = await getEntryFiles(entry_id)
        const validFiles = await cleanFiles(updatedFiles)

        setGenerators(prev => prev.map((generator) => {
          if (generator.isExample) return generator

          const recordFiles = getRecordFiles(generator.id, validFiles)

          return {
            ...generator,
            nameplateFiles: recordFiles,
            nameplateMemoryFiles: []
          }
        }))

        console.log(`✅ [DieselGeneratorTestPage] 儲存完成`)

      } catch (fileError) {
        console.error('❌ [DieselGeneratorTestPage] 重新載入檔案失敗:', fileError)
      }

      setToast({
        message: '發電機測試資料已儲存！',
        type: 'success'
      })

    } catch (error) {
      console.error('❌ [DieselGeneratorTestPage] Save error:', error)
      setToast({
        message: error instanceof Error ? error.message : '儲存失敗，請重試',
        type: 'error'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: EntryStatus) => {
    console.log('Status change requested:', newStatus)
  }

  const handleClearAll = async () => {
    try {
      // 收集所有要刪除的檔案（排除範例列）
      const allFiles: EvidenceFile[] = []
      generators.filter(g => !g.isExample).forEach(g => {
        allFiles.push(...g.nameplateFiles)
      })

      // 收集記憶體檔案
      const memoryFiles = generators
        .filter(g => !g.isExample)
        .flatMap(g => g.nameplateMemoryFiles || [])

      // 呼叫 Hook 清除（會刪除資料庫 + Storage + 清理 preview URLs）
      await clear({
        filesToDelete: allFiles,
        memoryFilesToClean: memoryFiles
      })

      // 清除成功後，重置前端狀態
      setGenerators([])
      setHasSubmittedBefore(false)
      setCurrentEntryId(null)
      setSuccess(null)
      setShowClearConfirmModal(false)

      // 顯示成功訊息
      setToast({
        message: '資料已完全清除',
        type: 'success'
      })

    } catch (error) {
      console.error('❌ [DieselGeneratorTestPage] 清除失敗:', error)
      const errorMessage = error instanceof Error ? error.message : '清除操作失敗，請重試'
      setToast({
        message: errorMessage,
        type: 'error'
      })
      setShowClearConfirmModal(false)
    }
  }

  // Loading 狀態
  if (dataLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.background }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: designTokens.colors.accentPrimary }}
          />
          <p style={{ color: designTokens.colors.textPrimary }}>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* 頁面標題 */}
        <div className="text-center mb-8">
          {/* 審核模式指示器 */}
          {isReviewMode && (
            <div className="mb-4 p-3 bg-orange-100 border-2 border-orange-300 rounded-lg max-w-4xl mx-auto">
              <div className="flex items-center justify-center">
                <Eye className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-orange-800 font-medium">
                  📋 審核模式 - 查看填報內容
                </span>
              </div>
              <p className="text-sm text-orange-600 mt-1">
                所有輸入欄位已鎖定，僅供審核查看
              </p>
            </div>
          )}

          <h1
            className="text-3xl font-semibold mb-3"
            style={{ color: designTokens.colors.textPrimary }}
          >
            柴油發電機測試記錄
          </h1>
          <p
            className="text-base"
            style={{ color: designTokens.colors.textSecondary }}
          >
            {isReviewMode
              ? '管理員審核模式 - 檢視填報內容和相關檔案'
              : '請填寫發電機測試資料並上傳發電機銘牌佐證文件'
            }
          </p>
        </div>

        {/* 統一狀態橫幅 */}
        {banner && (
          <div className={`border-l-4 p-4 mb-6 rounded-r-lg max-w-4xl mx-auto ${getBannerColorClasses(banner.type)}`}>
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

        {/* 標題 */}
        <h2 className="text-xl font-semibold mb-4" style={{ color: designTokens.colors.textPrimary }}>
          發電機測試資料
        </h2>

        {/* 發電機卡片列表 */}
        <div className="space-y-4">
          {/* 範例發電機（固定第一） */}
          {withExampleFirst(generators).filter(g => g.isExample).map((generator) => {
            return (
              <div
                key={generator.id}
                className="rounded-lg border p-6 bg-gray-50"
                style={{
                  borderColor: designTokens.colors.border
                }}
              >
                {/* 卡片標題 */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium" style={{ color: designTokens.colors.textPrimary }}>
                    範例發電機
                  </h3>
                  <span className="inline-block px-3 py-1 text-xs rounded bg-gray-300 text-gray-700 font-medium">
                    範例
                  </span>
                </div>

                {/* 欄位區域 */}
                <div className="space-y-4">
                  {/* 第一行：位置 + 功率 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        位置
                      </label>
                      <div className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                        {generator.generatorLocation}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        功率 (kW)
                      </label>
                      <div className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                        {generator.powerRating}
                      </div>
                    </div>
                  </div>

                  {/* 第二行：每年測試次數 + 測試時間 + 年總測試時間 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        每年測試次數
                      </label>
                      <div className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                        {generator.testFrequency}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        測試時間 (分)
                      </label>
                      <div className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                        {generator.testDuration}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        年總測試時間 (分)
                      </label>
                      <div className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg">
                        {generator.annualTestTime}
                      </div>
                    </div>
                  </div>

                  {/* 第三行：銘牌佐證（完整寬度） */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textSecondary }}>
                      銘牌佐證
                    </label>
                    <div className="px-4 py-3 text-sm text-gray-500 bg-gray-100 rounded-lg text-center">
                      （範例不含檔案）
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 新增按鈕 */}
          <button
            onClick={addGenerator}
            disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
            className="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-base"
          >
            + 新增發電機
          </button>

          {/* 用戶發電機（新的在上） */}
          {generators.filter(g => !g.isExample).map((generator) => {
            const userGenerators = generators.filter(g => !g.isExample)
            return (
              <div
                key={generator.id}
                className="rounded-lg border p-6 bg-white hover:shadow-md transition-shadow"
                style={{
                  borderColor: designTokens.colors.border,
                  boxShadow: designTokens.shadows.sm
                }}
              >
                {/* 卡片標題 */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium" style={{ color: designTokens.colors.textPrimary }}>
                    發電機測試資料
                  </h3>
                  <div className="flex items-center gap-2">
                    {userGenerators.length > 1 && (
                      <button
                        onClick={() => deleteGenerator(generator.id)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="刪除此發電機"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* 欄位區域 */}
                <div className="space-y-4">
                  {/* 第一行：位置 + 功率 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        位置
                      </label>
                      <input
                        type="text"
                        value={generator.generatorLocation}
                        onChange={(e) => updateGenerator(generator.id, 'generatorLocation', e.target.value)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        功率 (kW)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={generator.powerRating || ''}
                        onChange={(e) => updateGenerator(generator.id, 'powerRating', parseFloat(e.target.value) || 0)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* 第二行：每年測試次數 + 測試時間 + 年總測試時間 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        每年測試次數
                      </label>
                      <input
                        type="text"
                        value={generator.testFrequency}
                        onChange={(e) => updateGenerator(generator.id, 'testFrequency', e.target.value)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        測試時間 (分)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={generator.testDuration || ''}
                        onChange={(e) => updateGenerator(generator.id, 'testDuration', parseFloat(e.target.value) || 0)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: designTokens.colors.textSecondary }}>
                        年總測試時間 (分)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={generator.annualTestTime || ''}
                        onChange={(e) => updateGenerator(generator.id, 'annualTestTime', parseFloat(e.target.value) || 0)}
                        disabled={submitting || !editPermissions.canEdit || approvalStatus.isApproved}
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                  </div>

                  {/* 第三行：銘牌佐證（完整寬度） */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: designTokens.colors.textSecondary }}>
                      銘牌佐證
                    </label>
                    <EvidenceUpload
                      key={`upload-${generator.id}`}
                      pageKey={`${pageKey}_${generator.id}`}
                      files={generator.nameplateFiles}
                      onFilesChange={async (files) => {
                        const validFiles = await cleanFiles(files)
                        updateGenerator(generator.id, 'nameplateFiles', validFiles)
                      }}
                      memoryFiles={generator.nameplateMemoryFiles || []}
                      onMemoryFilesChange={(files) => updateGenerator(generator.id, 'nameplateMemoryFiles', files)}
                      maxFiles={5}
                      disabled={submitting || !editPermissions.canUploadFiles || approvalStatus.isApproved}
                      kind="other"
                      mode={editPermissions.canEdit && !approvalStatus.isApproved ? "edit" : "view"}
                      isAdminReviewMode={isReviewMode && role === 'admin'}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 空狀態提示 */}
        {generators.filter(g => !g.isExample).length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border" style={{ borderColor: designTokens.colors.border }}>
            <p className="mb-2">尚未新增任何發電機記錄</p>
            <p className="text-sm">請點擊上方「+ 新增發電機」按鈕開始填寫</p>
          </div>
        )}

        {/* 底部說明 */}
        <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-4" style={{ borderColor: designTokens.colors.border }}>
          <p className="font-medium mb-2">📋 填寫說明：</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>每台發電機需單獨填寫一筆記錄</li>
            <li>年總測試時間 = 每次測試時間 × 年測試次數</li>
            <li>銘牌佐證：請上傳發電機銘牌照片或技術規格文件（最多5個檔案）</li>
          </ul>
        </div>

        {/* 審核區塊 - 只在審核模式顯示 */}
        {isReviewMode && (
          <div className="max-w-4xl mx-auto mt-8">
            <ReviewSection
              entryId={reviewEntryId || currentEntryId || `diesel_generator_test_${year}`}
              userId={reviewUserId || "current_user"}
              category="柴油發電機測試"
              userName="填報用戶"
              amount={generators
                .filter(g => !g.isExample)
                .reduce((sum, g) => sum + g.annualTestTime, 0)}
              unit="分鐘"
              role={role}
              onSave={handleSave}
              isSaving={submitting}
              onApprove={() => {
                // ReviewSection 會處理 API 呼叫和導航
              }}
              onReject={(reason) => {
                // ReviewSection 會處理 API 呼叫和導航
              }}
            />
          </div>
        )}

        {/* 底部空間 */}
        <div className="h-20"></div>
      </div>

      {/* 成功模態框 */}
      {showSuccessModal && success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              {/* ✅ 新增 X 關閉按鈕 */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-center">
                <div
                  className="w-12 h-12 mx-auto rounded-full mb-4 flex items-center justify-center"
                  style={{ backgroundColor: designTokens.colors.accentLight }}
                >
                  <CheckCircle
                    className="h-6 w-6"
                    style={{ color: designTokens.colors.accentPrimary }}
                  />
                </div>
                <h3
                  className="text-lg font-medium mb-2"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  提交成功！
                </h3>
                <p
                  className="mb-4"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  {success}
                </p>

                {/* ✅ 新增資訊卡片 */}
                <div
                  className="rounded-lg p-4 mb-4 text-left"
                  style={{ backgroundColor: '#f8f9fa' }}
                >
                  <p
                    className="text-base mb-2 font-medium"
                    style={{ color: designTokens.colors.textPrimary }}
                  >
                    您的資料已成功儲存，您可以：
                  </p>
                  <ul className="text-base space-y-1">
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 隨時回來查看或修改資料
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 重新上傳新的銘牌檔案
                    </li>
                    <li style={{ color: designTokens.colors.textSecondary }}>
                      • 新增或刪除發電機記錄
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-6 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: designTokens.colors.accentPrimary }}
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 清除確認 Modal - 與 WD40 相同的介面 */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div
            className="bg-white rounded-lg shadow-lg max-w-md w-full animate-in fade-in duration-200"
            style={{ borderRadius: designTokens.borderRadius.lg }}
          >
            <div className="p-6">
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: designTokens.colors.textPrimary }}
              >
                清除所有資料
              </h3>
              <p
                className="mb-6"
                style={{ color: designTokens.colors.textSecondary }}
              >
                確定要清除所有柴油發電機測試資料嗎？此操作無法復原。
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearConfirmModal(false)}
                  className="px-4 py-2 border rounded-lg transition-colors"
                  style={{
                    borderColor: designTokens.colors.border,
                    color: designTokens.colors.textSecondary
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearLoading}
                  className="px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center"
                  style={{
                    backgroundColor: clearLoading ? '#9ca3af' : designTokens.colors.error,
                    opacity: clearLoading ? 0.7 : 1
                  }}
                >
                  {clearLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      清除中...
                    </>
                  ) : (
                    '確認清除'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作欄 - 審核模式和審核通過時隱藏 */}
      {!isReadOnly && !approvalStatus.isApproved && !isReviewMode && (
        <BottomActionBar
          currentStatus={currentStatus}
          currentEntryId={currentEntryId}
          isUpdating={isUpdating}
          hasSubmittedBefore={hasSubmittedBefore}
          hasAnyData={hasAnyData}
          banner={banner}
          editPermissions={editPermissions}
          submitting={submitting}
          saving={submitting}
          onSubmit={handleSubmit}
          onSave={handleSave}
          onClear={() => setShowClearConfirmModal(true)}
          designTokens={designTokens}
        />
      )}

      {/* Toast 通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default DieselGeneratorTestPage