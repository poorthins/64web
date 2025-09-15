import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import EvidenceUpload from '../EvidenceUpload'
import { getEntryFiles, updateFileEntryAssociation, EvidenceFile } from '../../api/files'
import { EntryStatus } from '../StatusSwitcher'

export interface MonthlyFiles {
  [month: number]: EvidenceFile[]
}

export interface FileManagerData {
  msds: EvidenceFile[]
  monthly: MonthlyFiles
  heatValue?: EvidenceFile[]
}

interface EvidenceFileManagerProps {
  pageKey: string
  entryId?: string | null
  year: number
  onFilesChange?: (files: FileManagerData) => void
  disabled?: boolean
  currentStatus?: EntryStatus
  className?: string
  supportedTypes?: ('msds' | 'usage_evidence' | 'heat_value_evidence')[]
}

/**
 * 共用的檔案管理元件
 * 基於 WD40Page 的成功實作，提供統一的檔案載入、顯示、關聯功能
 */
export const EvidenceFileManager = ({
  pageKey,
  entryId,
  year,
  onFilesChange,
  disabled = false,
  currentStatus,
  className = '',
  supportedTypes = ['msds', 'usage_evidence']
}: EvidenceFileManagerProps) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fileData, setFileData] = useState<FileManagerData>({
    msds: [],
    monthly: {},
    heatValue: []
  })

  // 載入已關聯的檔案（核心功能從 WD40 複製）
  const loadExistingFiles = useCallback(async () => {
    if (!entryId) return

    try {
      setLoading(true)
      setError(null)

      console.log(`📁 [FileManager] Loading files for entry: ${entryId}, pageKey: ${pageKey}`)

      const entryFiles = await getEntryFiles(entryId)
      console.log(`📁 [FileManager] Loaded ${entryFiles.length} files:`, {
        files: entryFiles.map(f => ({
          id: f.id,
          name: f.file_name,
          path: f.file_path,
          entry_id: f.entry_id
        }))
      })

      // 從檔案路徑分類檔案（WD40 的成功模式）
      const msdsFiles = entryFiles.filter(f => f.file_path.includes('/msds/'))
      const monthlyFiles = entryFiles.filter(f => f.file_path.includes('/usage_evidence/'))
      const heatValueFiles = entryFiles.filter(f => f.file_path.includes('/heat_value_evidence/'))

      console.log(`📋 [FileManager] File classification:`, {
        msdsCount: msdsFiles.length,
        monthlyCount: monthlyFiles.length,
        heatValueCount: heatValueFiles.length
      })

      // 分配月份檔案到對應月份（WD40 的核心邏輯）
      const monthlyFilesMap: MonthlyFiles = {}
      for (let month = 1; month <= 12; month++) {
        monthlyFilesMap[month] = monthlyFiles.filter(file => {
          // 從檔案路徑提取月份：/usage_evidence/{month}/
          const monthMatch = file.file_path.match(/\/usage_evidence\/(\d+)\//)
          const extractedMonth = monthMatch ? parseInt(monthMatch[1]) : null

          console.log(`📅 [FileManager] File ${file.file_name} path analysis:`, {
            path: file.file_path,
            monthMatch: monthMatch?.[0],
            extractedMonth,
            targetMonth: month,
            matches: extractedMonth === month
          })

          return extractedMonth === month
        })

        if (monthlyFilesMap[month].length > 0) {
          console.log(`📅 [FileManager] Month ${month} assigned ${monthlyFilesMap[month].length} files:`,
            monthlyFilesMap[month].map(f => f.file_name))
        }
      }

      const newFileData = {
        msds: msdsFiles,
        monthly: monthlyFilesMap,
        heatValue: heatValueFiles
      }

      console.log(`📅 [FileManager] Final file distribution:`, {
        msds: newFileData.msds.length,
        monthlyDistribution: Object.entries(newFileData.monthly)
          .filter(([_, files]) => files.length > 0)
          .map(([month, files]) => `${month}月: ${files.length}個`)
          .join(', '),
        heatValue: newFileData.heatValue.length
      })

      setFileData(newFileData)
      onFilesChange?.(newFileData)

    } catch (error) {
      console.error('❌ [FileManager] Failed to load files:', error)
      setError('載入檔案失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
    } finally {
      setLoading(false)
    }
  }, [entryId, pageKey, onFilesChange])

  // 檔案關聯功能（從 WD40 複製的核心邏輯）
  const associateFilesToEntry = useCallback(async (files: EvidenceFile[], targetEntryId: string) => {
    const unassociatedFiles = files.filter(f => !f.entry_id)

    console.log('🔗 [FileManager] Files to associate:', {
      totalFiles: files.length,
      unassociatedCount: unassociatedFiles.length,
      targetEntryId,
      fileDetails: unassociatedFiles.map(f => ({
        id: f.id,
        name: f.file_name,
        path: f.file_path
      }))
    })

    if (unassociatedFiles.length === 0) {
      return { succeeded: 0, failed: 0, total: 0 }
    }

    try {
      // 使用 Promise.allSettled 允許部分失敗（WD40 的錯誤恢復機制）
      const results = await Promise.allSettled(
        unassociatedFiles.map(file =>
          updateFileEntryAssociation(file.id, targetEntryId)
        )
      )

      // 統計結果
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      console.log('✅ [FileManager] Association results:', {
        totalAttempts: results.length,
        succeeded,
        failed,
        detailedResults: results.map((result, index) => ({
          fileId: unassociatedFiles[index].id,
          fileName: unassociatedFiles[index].file_name,
          status: result.status,
          error: result.status === 'rejected' ? result.reason : null
        }))
      })

      // 提供用戶反饋
      if (failed > 0) {
        if (succeeded > 0) {
          setSuccess(`部分檔案關聯成功 (${succeeded}/${unassociatedFiles.length})`)
          setError(`${failed} 個檔案關聯失敗`)
        } else {
          setError(`所有檔案關聯失敗，請檢查網路連線後重新嘗試`)
        }
      } else {
        setSuccess(`所有檔案 (${succeeded} 個) 已成功關聯`)
      }

      // 更新本地檔案狀態（標記成功關聯的）
      const successfulIndices = results
        .map((r, i) => ({ result: r, index: i }))
        .filter(({ result }) => result.status === 'fulfilled')
        .map(({ index }) => index)

      successfulIndices.forEach(index => {
        unassociatedFiles[index].entry_id = targetEntryId
      })

      return { succeeded, failed, total: unassociatedFiles.length }

    } catch (error) {
      console.error('❌ [FileManager] Association failed:', error)
      setError('檔案關聯失敗: ' + (error instanceof Error ? error.message : '未知錯誤'))
      return { succeeded: 0, failed: unassociatedFiles.length, total: unassociatedFiles.length }
    }
  }, [])

  // MSDS 檔案變更處理
  const handleMsdsFilesChange = useCallback((files: EvidenceFile[]) => {
    const newFileData = {
      ...fileData,
      msds: files
    }
    setFileData(newFileData)
    onFilesChange?.(newFileData)
  }, [fileData, onFilesChange])

  // 月份檔案變更處理
  const handleMonthFilesChange = useCallback((month: number, files: EvidenceFile[]) => {
    const newFileData = {
      ...fileData,
      monthly: {
        ...fileData.monthly,
        [month]: files
      }
    }
    setFileData(newFileData)
    onFilesChange?.(newFileData)
  }, [fileData, onFilesChange])

  // 熱值檔案變更處理
  const handleHeatValueFilesChange = useCallback((files: EvidenceFile[]) => {
    const newFileData = {
      ...fileData,
      heatValue: files
    }
    setFileData(newFileData)
    onFilesChange?.(newFileData)
  }, [fileData, onFilesChange])

  // 當 entryId 變更時載入檔案
  useEffect(() => {
    if (entryId) {
      loadExistingFiles()
    }
  }, [entryId, loadExistingFiles])

  // 清除訊息定時器
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [error])

  // 對外暴露的關聯方法
  const associateFiles = useCallback(async (targetEntryId: string) => {
    const allFiles = [
      ...fileData.msds,
      ...Object.values(fileData.monthly).flat(),
      ...(fileData.heatValue || [])
    ]

    return await associateFilesToEntry(allFiles, targetEntryId)
  }, [fileData, associateFilesToEntry])

  // 將關聯方法暴露給父組件
  useEffect(() => {
    if (onFilesChange) {
      (onFilesChange as any).associateFiles = associateFiles
    }
  }, [associateFiles, onFilesChange])

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        <span className="text-gray-600">載入檔案中...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 狀態訊息 */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* MSDS 檔案區域 */}
      {supportedTypes.includes('msds') && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            MSDS 安全資料表
          </label>
          <EvidenceUpload
            pageKey={pageKey}
            files={fileData.msds}
            onFilesChange={handleMsdsFilesChange}
            maxFiles={3}
            kind="msds"
            disabled={disabled}
            currentStatus={currentStatus}
          />
        </div>
      )}

      {/* 熱值證明檔案區域 */}
      {supportedTypes.includes('heat_value_evidence') && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            熱值證明文件
          </label>
          <EvidenceUpload
            pageKey={pageKey}
            files={fileData.heatValue || []}
            onFilesChange={handleHeatValueFilesChange}
            maxFiles={3}
            kind="heat_value_evidence"
            disabled={disabled}
            currentStatus={currentStatus}
          />
        </div>
      )}

      {/* 使用證明檔案區域 - 分月顯示 */}
      {supportedTypes.includes('usage_evidence') && (
        <div>
          <h3 className="text-sm font-medium mb-3 text-gray-700">使用證明文件</h3>
          <div className="space-y-3">
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1
              const monthFiles = fileData.monthly[month] || []

              if (monthFiles.length === 0) return null

              return (
                <div key={month} className="border rounded-lg p-3 bg-gray-50">
                  <label className="block text-sm font-medium mb-2 text-gray-600">
                    {month}月 使用證明
                  </label>
                  <EvidenceUpload
                    pageKey={pageKey}
                    month={month}
                    files={monthFiles}
                    onFilesChange={(files) => handleMonthFilesChange(month, files)}
                    maxFiles={3}
                    kind="usage_evidence"
                    disabled={disabled}
                    currentStatus={currentStatus}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default EvidenceFileManager