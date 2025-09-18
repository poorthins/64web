import { useState, useEffect, useCallback } from 'react'
import { Save, Upload as UploadIcon, AlertTriangle, CheckCircle, FileText, Loader } from 'lucide-react'
import EvidenceUpload, { MemoryFile } from './EvidenceUpload'
import { EvidenceFile, listMSDSFiles, listUsageEvidenceFiles, uploadEvidence, batchUploadEvidence } from '../api/files'
import { EntryStatus } from './EvidenceUpload'

interface EnergyFileManagerProps {
  pageKey: string
  entryStatus?: EntryStatus
  mode?: 'edit' | 'view'
  className?: string
  onStatusChange?: (hasChanges: boolean) => void
  onSave?: () => Promise<void>
}

interface FileSection {
  key: string
  title: string
  kind: 'msds' | 'usage_evidence'
  months?: number[]
  maxFiles: number
}

// 定義檔案區段配置
const getFileSections = (pageKey: string): FileSection[] => {
  return [
    {
      key: 'msds',
      title: 'MSDS 安全資料表',
      kind: 'msds',
      maxFiles: 3
    },
    {
      key: 'usage_evidence_1',
      title: '1月 使用量證明',
      kind: 'usage_evidence',
      months: [1],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_2',
      title: '2月 使用量證明',
      kind: 'usage_evidence',
      months: [2],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_3',
      title: '3月 使用量證明',
      kind: 'usage_evidence',
      months: [3],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_4',
      title: '4月 使用量證明',
      kind: 'usage_evidence',
      months: [4],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_5',
      title: '5月 使用量證明',
      kind: 'usage_evidence',
      months: [5],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_6',
      title: '6月 使用量證明',
      kind: 'usage_evidence',
      months: [6],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_7',
      title: '7月 使用量證明',
      kind: 'usage_evidence',
      months: [7],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_8',
      title: '8月 使用量證明',
      kind: 'usage_evidence',
      months: [8],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_9',
      title: '9月 使用量證明',
      kind: 'usage_evidence',
      months: [9],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_10',
      title: '10月 使用量證明',
      kind: 'usage_evidence',
      months: [10],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_11',
      title: '11月 使用量證明',
      kind: 'usage_evidence',
      months: [11],
      maxFiles: 5
    },
    {
      key: 'usage_evidence_12',
      title: '12月 使用量證明',
      kind: 'usage_evidence',
      months: [12],
      maxFiles: 5
    }
  ]
}

const EnergyFileManager: React.FC<EnergyFileManagerProps> = ({
  pageKey,
  entryStatus,
  mode = 'view',
  className = '',
  onStatusChange,
  onSave
}) => {
  const [sections] = useState(() => getFileSections(pageKey))
  const [files, setFiles] = useState<{ [key: string]: EvidenceFile[] }>({})
  const [memoryFiles, setMemoryFiles] = useState<{ [key: string]: MemoryFile[] }>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // 載入所有檔案
  const loadAllFiles = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const filePromises = sections.map(async (section) => {
        let sectionFiles: EvidenceFile[] = []

        if (section.kind === 'msds') {
          sectionFiles = await listMSDSFiles(pageKey)
        } else if (section.kind === 'usage_evidence' && section.months?.[0]) {
          sectionFiles = await listUsageEvidenceFiles(pageKey, section.months[0])
        }

        return {
          key: section.key,
          files: sectionFiles
        }
      })

      const results = await Promise.all(filePromises)
      const newFiles: { [key: string]: EvidenceFile[] } = {}

      results.forEach(result => {
        newFiles[result.key] = result.files
      })

      setFiles(newFiles)

      console.log('🔄 [EnergyFileManager] Loaded all files:', {
        pageKey,
        sectionsCount: sections.length,
        totalFiles: Object.values(newFiles).flat().length
      })

    } catch (err) {
      console.error('Failed to load files:', err)
      setError('載入檔案時發生錯誤')
    } finally {
      setLoading(false)
    }
  }, [pageKey, sections])

  // 初始化載入檔案
  useEffect(() => {
    loadAllFiles()
  }, [loadAllFiles])

  // 檢查是否有變更
  const hasChanges = Object.values(memoryFiles).some(files => files.length > 0)

  // 通知父元件狀態變更
  useEffect(() => {
    onStatusChange?.(hasChanges)
  }, [hasChanges, onStatusChange])

  // 處理檔案變更
  const handleFilesChange = (sectionKey: string, newFiles: EvidenceFile[]) => {
    setFiles(prev => ({
      ...prev,
      [sectionKey]: newFiles
    }))
  }

  // 處理記憶體檔案變更
  const handleMemoryFilesChange = (sectionKey: string, newMemoryFiles: MemoryFile[]) => {
    setMemoryFiles(prev => ({
      ...prev,
      [sectionKey]: newMemoryFiles
    }))
  }

  // 批次上傳所有記憶體檔案
  const handleSaveAll = async () => {
    if (!hasChanges) return

    setSaving(true)
    setError(null)
    setSaveMessage(null)

    try {
      // 準備批次上傳的檔案和中繼資料
      const filesToUpload: File[] = []
      const metadataArray: any[] = []

      // 遍歷所有區段的記憶體檔案
      Object.entries(memoryFiles).forEach(([sectionKey, memFiles]) => {
        if (memFiles.length === 0) return

        const section = sections.find(s => s.key === sectionKey)
        if (!section) return

        memFiles.forEach(memFile => {
          filesToUpload.push(memFile.file)
          metadataArray.push({
            pageKey,
            year: new Date().getFullYear(),
            category: section.kind === 'msds' ? 'msds' : 'usage_evidence',
            month: section.kind === 'usage_evidence' ? section.months?.[0] : undefined,
            allowOverwrite: false
          })
        })
      })

      console.log('🚀 [EnergyFileManager] Starting batch upload:', {
        totalFiles: filesToUpload.length,
        sectionsWithFiles: Object.keys(memoryFiles).filter(key => memoryFiles[key].length > 0)
      })

      // 使用批次上傳函數
      const { successes, failures } = await batchUploadEvidence(
        filesToUpload,
        metadataArray,
        (completed, total, currentFile) => {
          // 更新進度顯示（可以添加進度條或狀態文字）
          console.log(`📊 [EnergyFileManager] Upload progress: ${completed}/${total}, current: ${currentFile}`)
        }
      )

      // 清理記憶體檔案的預覽URLs
      Object.values(memoryFiles).flat().forEach(memFile => {
        if (memFile.preview) {
          URL.revokeObjectURL(memFile.preview)
        }
      })

      // 清空記憶體檔案
      setMemoryFiles({})

      // 重新載入檔案列表
      await loadAllFiles()

      // 呼叫父元件的保存回調
      if (onSave) {
        await onSave()
      }

      // 顯示結果訊息
      if (failures.length > 0) {
        setSaveMessage(`部分上傳成功：${successes.length} 個成功，${failures.length} 個失敗`)
        setError(`上傳失敗的檔案：${failures.map(f => f.file.name).join(', ')}`)
      } else {
        setSaveMessage(`成功上傳 ${successes.length} 個檔案`)
      }

      setTimeout(() => setSaveMessage(null), 5000)

    } catch (err) {
      console.error('Batch upload failed:', err)
      const errorMessage = err instanceof Error ? err.message : '批次上傳失敗'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  // 取消所有變更
  const handleCancelChanges = () => {
    // 清理記憶體檔案的預覽URLs
    Object.values(memoryFiles).flat().forEach(memFile => {
      if (memFile.preview) {
        URL.revokeObjectURL(memFile.preview)
      }
    })

    // 清空記憶體檔案
    setMemoryFiles({})
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 頂部狀態列 */}
      {mode === 'edit' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-medium text-orange-900">編輯模式</h3>
                <p className="text-sm text-orange-700">
                  檔案將暫存到記憶體，點擊「儲存全部」後統一上傳
                </p>
              </div>
            </div>

            {hasChanges && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-orange-600">
                  有 {Object.values(memoryFiles).flat().length} 個檔案待上傳
                </span>
                <button
                  onClick={handleCancelChanges}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  取消變更
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>上傳中...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>儲存全部</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 成功訊息 */}
      {saveMessage && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">{saveMessage}</span>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">載入檔案中...</span>
        </div>
      )}

      {/* 檔案區段 */}
      {!loading && sections.map((section) => {
        const sectionFiles = files[section.key] || []
        const sectionMemoryFiles = memoryFiles[section.key] || []
        const month = section.months?.[0]

        return (
          <div key={section.key} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>{section.title}</span>
                </h3>
                <div className="text-sm text-gray-500">
                  {sectionFiles.length + sectionMemoryFiles.length} / {section.maxFiles} 檔案
                  {mode === 'edit' && sectionMemoryFiles.length > 0 && (
                    <span className="ml-2 text-orange-600">
                      ({sectionMemoryFiles.length} 個暫存)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4">
              <EvidenceUpload
                pageKey={pageKey}
                month={month}
                files={sectionFiles}
                onFilesChange={(newFiles) => handleFilesChange(section.key, newFiles)}
                maxFiles={section.maxFiles}
                kind={section.kind}
                currentStatus={entryStatus}
                mode={mode}
                memoryFiles={sectionMemoryFiles}
                onMemoryFilesChange={(newMemoryFiles) => handleMemoryFilesChange(section.key, newMemoryFiles)}
                className="border-0"
              />
            </div>
          </div>
        )
      })}

      {/* 底部操作按鈕 */}
      {mode === 'edit' && hasChanges && (
        <div className="sticky bottom-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <UploadIcon className="w-4 h-4" />
              <span>有 {Object.values(memoryFiles).flat().length} 個檔案待上傳</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancelChanges}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消變更
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>上傳中...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>儲存全部變更</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnergyFileManager