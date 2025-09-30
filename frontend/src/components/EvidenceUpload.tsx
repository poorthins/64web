import { useState, useRef, useEffect } from 'react'
import { Upload, X, File, AlertCircle, CheckCircle, FileText, Trash2, Eye, FileSpreadsheet } from 'lucide-react'
import { uploadEvidence, uploadEvidenceSimple, deleteEvidence, deleteEvidenceFile, getFileUrl, EvidenceFile, listMSDSFiles, listUsageEvidenceFiles, getCategoryFromPageKey } from '../api/files'
import FilePreview from './FilePreview'
import { MemoryFile } from '../services/documentHandler'

export type { MemoryFile }

// 處理中文檔名的預覽 - 安全建立預覽 URL
const createSafePreviewUrl = (file: File): string | null => {
  try {
    return URL.createObjectURL(file)
  } catch (error) {
    console.warn('預覽載入失敗:', file.name, error)
    return null // 顯示預設圖示代替預覽
  }
}

// 檔案去重工具函數
function deduplicateFilesByID(files: EvidenceFile[], context: string = ''): EvidenceFile[] {
  const deduplicated = Array.from(
    new Map(files.map(file => [file.id, file])).values()
  )

  if (files.length !== deduplicated.length) {
    const duplicateIds = files
      .filter((file, index, array) =>
        array.findIndex(f => f.id === file.id) !== index
      )
      .map(f => f.id)

  }

  return deduplicated
}

export type EntryStatus = 'submitted' | 'approved' | 'rejected'

interface EvidenceUploadProps {
  pageKey: string
  month?: number
  files: EvidenceFile[]
  onFilesChange: (files: EvidenceFile[]) => void
  disabled?: boolean
  maxFiles?: number
  className?: string
  kind?: 'usage_evidence' | 'msds' | 'unit_weight' | 'other' | 'heat_value_evidence' | 'annual_evidence' | 'nameplate_evidence'
  currentStatus?: EntryStatus
  // 新增記憶體暫存模式
  mode?: 'edit' | 'view'
  memoryFiles?: MemoryFile[]
  onMemoryFilesChange?: (files: MemoryFile[]) => void
  hideFileCount?: boolean  // 隱藏檔案數量顯示
}

// 輔助函數：判斷當前狀態是否允許上傳檔案
function canUploadFiles(status?: EntryStatus): boolean {
  if (!status) return true // 如果沒有狀態，預設允許
  return status === 'submitted' || status === 'rejected'
}

// 輔助函數：判斷當前狀態是否允許刪除檔案
function canDeleteFiles(status?: EntryStatus): boolean {
  if (!status) return true // 如果沒有狀態，預設允許
  return status === 'submitted' || status === 'rejected'
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  pageKey,
  month,
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 5,
  className = '',
  kind = 'usage_evidence',
  currentStatus,
  mode = 'view',
  memoryFiles = [],
  onMemoryFilesChange,
  hideFileCount = false
}) => {

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({})
  const [isDragging, setIsDragging] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<EvidenceFile | MemoryFile | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastUploadTimeRef = useRef<number>(0) // 追蹤最後一次上傳時間
  const uploadingRef = useRef(false) // 雙重上傳鎖，避免 closure 問題
  
  // 狀態檢查
  const isStatusUploadDisabled = !canUploadFiles(currentStatus)
  const isStatusDeleteDisabled = !canDeleteFiles(currentStatus)

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      return
    }

    // 計算總檔案數（已上傳 + 記憶體暫存）
    const totalCurrentFiles = files.length + memoryFiles.length

    // 檢查當前檔案數是否已達上限
    if (totalCurrentFiles >= maxFiles) {
      setError(`已達到最大檔案數量限制 (${maxFiles} 個)，請先刪除一些檔案後再上傳`)
      return
    }

    // 檢查上傳後總檔案數是否會超過限制
    if (totalCurrentFiles + selectedFiles.length > maxFiles) {
      const remainingSlots = maxFiles - totalCurrentFiles
      setError(`最多只能上傳 ${maxFiles} 個檔案，目前已有 ${totalCurrentFiles} 個檔案，還可以上傳 ${remainingSlots} 個檔案`)
      return
    }

    // 檔案重複檢查（包含已上傳檔案和記憶體暫存檔案）
    const duplicateFiles: string[] = []
    const existingFingerprints = new Set([
      ...files.map(f => `${f.file_name}-${f.file_size}`),
      ...memoryFiles.map(f => `${f.file_name}-${f.file_size}`)
    ])

    Array.from(selectedFiles).forEach(newFile => {
      const fingerprint = `${newFile.name}-${newFile.size}`
      if (existingFingerprints.has(fingerprint)) {
        duplicateFiles.push(newFile.name)
      }
    })

    if (duplicateFiles.length > 0) {
      setError(`以下檔案已存在：${duplicateFiles.join(', ')}`)
      return
    }

    setError(null)
    setIsDragging(false)

    // 根據模式處理檔案
    try {
      if (mode === 'edit' && onMemoryFilesChange) {
        // 編輯模式：將檔案暫存到記憶體
        await handleMemoryFileAdd(selectedFiles)
      } else {
        // 檢視模式：直接上傳檔案
        await handleDirectUpload(selectedFiles)
      }
    } finally {
      // 在處理完成後才清除 input value
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 記憶體暫存檔案處理
  const handleMemoryFileAdd = async (selectedFiles: FileList) => {
    if (!onMemoryFilesChange) return

    try {
      const newMemoryFiles: MemoryFile[] = []

      for (const file of Array.from(selectedFiles)) {
        // 生成預覽URL - 使用安全函數處理中文檔名
        let preview = ''
        if (file.type.startsWith('image/')) {
          preview = createSafePreviewUrl(file) || ''
        }

        const memoryFile: MemoryFile = {
          id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type
        }

        newMemoryFiles.push(memoryFile)
      }

      // 更新記憶體檔案清單
      onMemoryFilesChange([...memoryFiles, ...newMemoryFiles])

      const message = `已暫存 ${newMemoryFiles.length} 個檔案到記憶體`
      setSuccessMessage(message)
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error) {
      console.error('Memory file add error:', error)
      setError('暫存檔案到記憶體時發生錯誤')
    }
  }

  // 直接上傳處理
  const handleDirectUpload = async (selectedFiles: FileList) => {

    // 檢查是否正在上傳
    if (uploadingRef.current || uploading) {
      return
    }

    // 防抖保護
    const now = Date.now()
    if (now - lastUploadTimeRef.current < 1000) {
      return
    }
    lastUploadTimeRef.current = now

    uploadingRef.current = true
    setUploading(true)

    try {
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        const category = kind === 'msds' ? 'msds' :
                        kind === 'heat_value_evidence' ? 'heat_value_evidence' :
                        kind === 'annual_evidence' ? 'annual_evidence' :
                        kind === 'nameplate_evidence' ? 'other' :
                        kind === 'other' ? 'other' : 'usage_evidence'
        return await uploadEvidence(file, {
          pageKey,
          year: new Date().getFullYear(),
          category,
          month: category === 'usage_evidence' ? month : undefined,
          allowOverwrite: false
        })
      })

      await Promise.all(uploadPromises)

      // 清除錯誤狀態，因為上傳成功
      setError(null)

      let updatedFilesList: EvidenceFile[]
      if (kind === 'msds') {
        updatedFilesList = await listMSDSFiles(pageKey)
      } else if (month) {
        updatedFilesList = await listUsageEvidenceFiles(pageKey, month)
      } else {
        updatedFilesList = []
      }

      // 去重處理
      const deduplicatedFiles = deduplicateFilesByID(
        updatedFilesList,
        `EvidenceUpload-${kind}-${month || 'nomonth'}`
      )


      onFilesChange(deduplicatedFiles)

      const message = `成功上傳 ${selectedFiles.length} 個檔案`
      setSuccessMessage(message)
      setTimeout(() => setSuccessMessage(null), 3000)

      updatedFilesList.forEach(file => {
        if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
          generateThumbnail(file)
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
      let errorMessage = error instanceof Error ? error.message : '上傳失敗'

      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = '請重新登入或檢查權限'
      }

      setError(errorMessage)
    } finally {
      uploadingRef.current = false
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // 拖拉功能處理函式
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !uploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    // 提前檢查狀態，避免不必要的處理
    if (disabled || uploading) {
      return
    }
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }

  // 移除記憶體檔案
  const handleMemoryFileRemove = (fileId: string) => {
    if (!onMemoryFilesChange) return

    const memoryFile = memoryFiles.find(f => f.id === fileId)
    if (memoryFile && memoryFile.preview) {
      // 清理預覽URL
      URL.revokeObjectURL(memoryFile.preview)
    }

    // 從記憶體檔案清單中移除
    onMemoryFilesChange(memoryFiles.filter(f => f.id !== fileId))

    setSuccessMessage('檔案已從暫存中移除')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleRemoveFile = async (fileId: string) => {
    // 檢查是否為記憶體檔案
    const isMemoryFile = memoryFiles.some(f => f.id === fileId)

    if (isMemoryFile) {
      handleMemoryFileRemove(fileId)
      return
    }

    setDeletingFileId(fileId)

    // 刪除已上傳檔案的邏輯
    try {
      const file = files.find(f => f.id === fileId)
      if (!file) {
        throw new Error('找不到要刪除的檔案')
      }

      const isAssociatedFile = file.entry_id && file.entry_id !== ''

      if (isAssociatedFile) {
        await deleteEvidenceFile(file.id)
      } else {
        await deleteEvidence(fileId)
      }

      onFilesChange(files.filter(f => f.id !== fileId))

      setThumbnails(prev => {
        const newThumbnails = { ...prev }
        delete newThumbnails[fileId]
        return newThumbnails
      })

      // 清除錯誤狀態，因為刪除成功
      setError(null)

      setSuccessMessage('檔案已成功刪除')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error) {
      console.error('Delete error:', error)
      let errorMessage = error instanceof Error ? error.message : '刪除失敗'

      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = '請重新登入或檢查權限'
      }

      setError(errorMessage)
    } finally {
      setDeletingFileId(null)
    }
  }
  
  const confirmDelete = (fileId: string) => {
    setShowDeleteConfirm(fileId)
  }
  
  const cancelDelete = () => {
    setShowDeleteConfirm(null)
  }

  // 預覽功能
  const handlePreviewFile = (file: EvidenceFile | MemoryFile) => {
    setPreviewFile(file)
    setShowPreview(true)
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreviewFile(null)
  }

  const generateThumbnail = async (file: EvidenceFile) => {
    try {
      const url = await getFileUrl(file.file_path)
      setThumbnails(prev => ({
        ...prev,
        [file.id]: url
      }))
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) return fileName
    const extension = fileName.split('.').pop()
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...'
    return `${truncatedName}.${extension}`
  }

  // 渲染記憶體檔案預覽
  const renderMemoryFilePreview = (memoryFile: MemoryFile) => {
    if (memoryFile.mime_type.startsWith('image/') && memoryFile.preview) {
      return (
        <img
          src={memoryFile.preview}
          alt={memoryFile.file_name}
          className="w-10 h-10 object-cover rounded border"
          onError={() => {
            console.warn('Memory file preview failed to load:', memoryFile.file_name)
          }}
        />
      )
    } else if (memoryFile.mime_type === 'application/pdf') {
      return <FileText className="w-10 h-10 text-red-500 p-2 bg-red-50 rounded" />
    } else if (memoryFile.mime_type?.includes('spreadsheet') ||
               memoryFile.mime_type?.includes('excel') ||
               memoryFile.file_name?.toLowerCase().endsWith('.xlsx') ||
               memoryFile.file_name?.toLowerCase().endsWith('.xls')) {
      return <FileSpreadsheet className="w-10 h-10 text-green-500 p-2 bg-green-50 rounded" />
    } else {
      return <File className="w-10 h-10 text-gray-500 p-2 bg-gray-50 rounded" />
    }
  }

  const renderFilePreview = (file: EvidenceFile) => {
    if (file.mime_type.startsWith('image/')) {
      const thumbnailUrl = thumbnails[file.id]
      if (thumbnailUrl) {
        return (
          <img
            src={thumbnailUrl}
            alt={file.file_name}
            className="w-10 h-10 object-cover rounded border"
            onError={() => {
              // 如果縮圖載入失敗，移除它
              setThumbnails(prev => {
                const newThumbnails = { ...prev }
                delete newThumbnails[file.id]
                return newThumbnails
              })
            }}
          />
        )
      } else {
        return <File className="w-10 h-10 text-blue-500 p-2 bg-blue-50 rounded" />
      }
    } else if (file.mime_type === 'application/pdf') {
      return <FileText className="w-10 h-10 text-red-500 p-2 bg-red-50 rounded" />
    } else if (file.mime_type?.includes('spreadsheet') ||
               file.mime_type?.includes('excel') ||
               file.file_name?.toLowerCase().endsWith('.xlsx') ||
               file.file_name?.toLowerCase().endsWith('.xls')) {
      return <FileSpreadsheet className="w-10 h-10 text-green-500 p-2 bg-green-50 rounded" />
    } else {
      return <File className="w-10 h-10 text-gray-500 p-2 bg-gray-50 rounded" />
    }
  }

  // 為現有的圖片檔案生成縮圖
  useEffect(() => {
    files.forEach(file => {
      if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
        generateThumbnail(file)
      }
    })
  }, [files]) // 添加依賴，當 files 變更時重新生成縮圖

  // 清理記憶體檔案的預覽URL，防止記憶體洩漏
  useEffect(() => {
    return () => {
      memoryFiles.forEach(memoryFile => {
        if (memoryFile.preview) {
          URL.revokeObjectURL(memoryFile.preview)
        }
      })
    }
  }, [memoryFiles])

  // 檢查是否已達到檔案上限和狀態限制
  const totalFiles = files.length + memoryFiles.length
  const isAtMaxCapacity = totalFiles >= maxFiles
  const isUploadDisabled = disabled || uploading || isAtMaxCapacity || isStatusUploadDisabled

  // 檢測審核模式
  const searchParams = new URLSearchParams(window.location.search)
  const isReviewMode = searchParams.get('mode') === 'review'
  const reviewUserId = searchParams.get('userId')

  return (
    <div className={`relative space-y-3 ${className}`}>
      {/* 審核模式提示 */}
      {isReviewMode && mode === 'view' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">審核模式</span>
          </div>
          <p className="text-xs text-amber-700 mt-1">
            您正在以管理員身份檢視其他用戶的檔案。如果無法預覽圖片，可能是權限限制。
          </p>
        </div>
      )}

      {/* 上傳區域 */}
      <div
        className={`
          min-h-[120px] border-2 border-dashed rounded-lg text-center transition-all duration-200
          flex flex-col items-center justify-center py-6 px-4
          ${isUploadDisabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.02] shadow-lg'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
        onClick={(e) => {
          // 防止事件冒泡
          e.stopPropagation()

          // 再次檢查上傳狀態
          if (!isUploadDisabled && !uploading && fileInputRef.current) {
            fileInputRef.current.click()
          }
        }}
        onDragOver={isUploadDisabled ? undefined : handleDragOver}
        onDragLeave={isUploadDisabled ? undefined : handleDragLeave}
        onDrop={isUploadDisabled ? undefined : handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            // 事件處理器中再次檢查狀態
            if (!uploading && e.target.files) {
              handleFileSelect(e.target.files)
            }
          }}
          className="hidden"
          disabled={isUploadDisabled}
        />

        {uploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">上傳中...</span>
          </div>
        ) : (
          <>
            <Upload className={`h-6 w-6 transition-all ${
              disabled ? 'text-gray-400' :
              isDragging ? 'text-blue-600 scale-125' : 'text-gray-500'
            }`} />
            <div className="text-sm mt-2">
              <span className={disabled || isStatusUploadDisabled ? 'text-gray-400' : isDragging ? 'text-blue-700 font-semibold' : 'text-blue-600 font-medium'}>
                {isStatusUploadDisabled
                  ? `${currentStatus === 'submitted' ? '已提交' : currentStatus === 'approved' ? '已核准' : ''}狀態下無法上傳檔案`
                  : isDragging
                    ? '拖放檔案到這裡'
                    : mode === 'edit'
                      ? '點擊或拖放檔案暫存'
                      : '點擊或拖放檔案上傳'
                }
              </span>
              {!isStatusUploadDisabled && (
                <p className={`text-xs mt-1 transition-colors ${
                  isDragging ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  支援所有檔案類型，最大 10MB
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* 成功訊息 */}
      {successMessage && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-in fade-in duration-300">
          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-sm text-green-700 font-medium">{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-500 hover:text-green-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 錯誤訊息 */}
      {error && (
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 檔案清單 */}
      {(files.length > 0 || memoryFiles.length > 0) && (
        <div className="space-y-2">
          {!hideFileCount && (
            <div className="text-sm font-medium text-gray-700">
              檔案列表 ({totalFiles}/{maxFiles})
              {mode === 'edit' && memoryFiles.length > 0 && (
                <span className="ml-2 text-xs text-orange-600">(含 {memoryFiles.length} 個暫存檔案)</span>
              )}
            </div>
          )}

          {/* 已上傳檔案 */}
          {files.map((file, index) => (
            <div
              key={`uploaded-${file.id}-${index}`}
              className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                file.entry_id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className="cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => handlePreviewFile(file)}
                  title="點擊預覽檔案"
                >
                  {renderFilePreview(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900" title={file.file_name}>
                    {truncateFileName(file.file_name)}
                    {file.entry_id ? (
                      <span className="ml-2 text-xs text-blue-600">(已提交)</span>
                    ) : (
                      <span className="ml-2 text-xs text-green-600">(已上傳)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreviewFile(file)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                  title="預覽檔案"
                >
                  <Eye className="h-3 w-3" />
                  <span>預覽</span>
                </button>
                <button
                  onClick={() => confirmDelete(file.id)}
                  disabled={deletingFileId === file.id || isStatusDeleteDisabled}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isStatusDeleteDisabled ? "當前狀態下無法刪除檔案" : "刪除檔案"}
                >
                  {deletingFileId === file.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  <span>{deletingFileId === file.id ? '刪除中' : '刪除'}</span>
                </button>
              </div>
            </div>
          ))}

          {/* 記憶體暫存檔案 */}
          {memoryFiles.map((memoryFile, index) => (
            <div
              key={`memory-${memoryFile.id}-${index}`}
              className="flex items-center justify-between p-3 rounded-lg transition-all bg-orange-50 border border-orange-200"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className="cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => handlePreviewFile(memoryFile)}
                  title="點擊預覽檔案"
                >
                  {renderMemoryFilePreview(memoryFile)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900" title={memoryFile.file_name}>
                    {truncateFileName(memoryFile.file_name)}
                    <span className="ml-2 text-xs text-orange-600">(暫存中)</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(memoryFile.file_size)}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePreviewFile(memoryFile)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                  title="預覽檔案"
                >
                  <Eye className="h-3 w-3" />
                  <span>預覽</span>
                </button>
                <button
                  onClick={() => handleRemoveFile(memoryFile.id)}
                  className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white transition-colors"
                  title="從暫存中移除"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>移除</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 檔案數量提示和狀態提示 */}
      {!hideFileCount && totalFiles >= maxFiles && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          已達到最大檔案數量限制 ({maxFiles} 個)
          {mode === 'edit' && memoryFiles.length > 0 && (
            <span className="block mt-1">請提交後才會正式上傳暫存檔案</span>
          )}
        </div>
      )}
      
      {isStatusUploadDisabled && (
        <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
          {currentStatus === 'submitted' && '已提交狀態：如需修改檔案請使用檔案編輯功能'}
          {currentStatus === 'approved' && '已核准狀態：唯讀模式，無法進行任何修改'}
          {currentStatus === 'rejected' && '已駁回狀態：可重新編輯和上傳檔案'}
        </div>
      )}
      
      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    確認刪除檔案
                  </h3>
                  <p className="text-sm text-gray-500">
                    確定要刪除此檔案嗎？此操作無法復原。
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm) {
                      handleRemoveFile(showDeleteConfirm)
                      setShowDeleteConfirm(null)
                    }
                  }}
                  disabled={deletingFileId !== null}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {deletingFileId === showDeleteConfirm ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>刪除中...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>確定刪除</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 檔案預覽模態框 */}
      <FilePreview
        file={previewFile}
        isOpen={showPreview}
        onClose={closePreview}
      />
    </div>
  )
}

export default EvidenceUpload
