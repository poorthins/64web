import { useState, useRef } from 'react'
import { Upload, X, File, AlertCircle, CheckCircle, FileText } from 'lucide-react'
import { uploadEvidence, deleteEvidence, getFileUrl, EvidenceFile } from '../api/files'

interface EvidenceUploadProps {
  pageKey: string
  month?: number
  files: EvidenceFile[]
  onFilesChange: (files: EvidenceFile[]) => void
  disabled?: boolean
  maxFiles?: number
  className?: string
  kind?: 'usage_evidence' | 'msds' | 'other'
}

const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  pageKey,
  month,
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 5,
  className = '',
  kind = 'usage_evidence'
}) => {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({})
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return

    if (selectedFiles.length > maxFiles) {
      setError(`最多只能上傳 ${maxFiles} 個檔案`)
      return
    }

    setUploading(true)
    setError(null)
    setIsDragging(false)  // 重置拖拉狀態

    try {
      // 先刪除現有的舊檔案（實現覆蓋功能）
      if (files.length > 0) {
        const deletePromises = files.map(async (file) => {
          try {
            await deleteEvidence(file.id)
          } catch (error) {
            console.warn(`Failed to delete file ${file.id}:`, error)
          }
        })
        await Promise.all(deletePromises)
        
        // 清理縮圖
        setThumbnails(prev => {
          const newThumbnails = { ...prev }
          files.forEach(file => {
            delete newThumbnails[file.id]
          })
          return newThumbnails
        })
      }

      // 上傳新檔案
      const uploadPromises = Array.from(selectedFiles).map(async (file) => {
        return await uploadEvidence(file, {
          pageKey,
          year: new Date().getFullYear()
        })
      })

      const uploadedFiles = await Promise.all(uploadPromises)
      // 完全替換檔案列表（而不是添加到現有檔案）
      onFilesChange(uploadedFiles)

      // 顯示成功訊息
      const message = files.length > 0 
        ? `成功覆蓋並上傳 ${uploadedFiles.length} 個檔案`
        : `成功上傳 ${uploadedFiles.length} 個檔案`
      setSuccessMessage(message)
      setTimeout(() => setSuccessMessage(null), 3000)

      // 為圖片檔案生成縮圖
      uploadedFiles.forEach(file => {
        if (file.mime_type.startsWith('image/')) {
          generateThumbnail(file)
        }
      })
    } catch (error) {
      console.error('Upload error:', error)
      let errorMessage = error instanceof Error ? error.message : '上傳失敗'
      
      // 友善化錯誤訊息
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = '請重新登入或檢查權限'
      }
      
      setError(errorMessage)
    } finally {
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
    
    if (disabled || uploading) return
    
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles)
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    try {
      await deleteEvidence(fileId)
      onFilesChange(files.filter(f => f.id !== fileId))
      
      // 清理縮圖
      setThumbnails(prev => {
        const newThumbnails = { ...prev }
        delete newThumbnails[fileId]
        return newThumbnails
      })
    } catch (error) {
      console.error('Delete error:', error)
      let errorMessage = error instanceof Error ? error.message : '刪除失敗'
      
      if (errorMessage.includes('401') || errorMessage.includes('403')) {
        errorMessage = '請重新登入或檢查權限'
      }
      
      setError(errorMessage)
    }
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
    } else {
      return <File className="w-10 h-10 text-gray-500 p-2 bg-gray-50 rounded" />
    }
  }

  // 為現有的圖片檔案生成縮圖
  useState(() => {
    files.forEach(file => {
      if (file.mime_type.startsWith('image/') && !thumbnails[file.id]) {
        generateThumbnail(file)
      }
    })
  })

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 上傳區域 */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-200
          ${disabled || uploading
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragging
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer'
          }
        `}
        onClick={() => {
          if (!disabled && !uploading && fileInputRef.current) {
            fileInputRef.current.click()
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">上傳中...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className={`h-6 w-6 transition-all ${
              disabled ? 'text-gray-400' : 
              isDragging ? 'text-blue-600 scale-125' : 'text-gray-500'
            }`} />
            <div className="text-sm">
              <span className={disabled ? 'text-gray-400' : isDragging ? 'text-blue-700 font-semibold' : 'text-blue-600 font-medium'}>
                {isDragging ? '拖放檔案到這裡' : '點擊或拖放檔案上傳'}
              </span>
              <p className={`text-xs mt-1 transition-colors ${
                isDragging ? 'text-blue-600' : 'text-gray-500'
              }`}>
                支援 JPG、PNG、WebP、HEIC、PDF 檔案，最大 10MB
              </p>
            </div>
          </div>
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
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            還可上傳檔案 ({files.length}/{maxFiles})
          </div>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {renderFilePreview(file)}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900" title={file.file_name}>
                    {truncateFileName(file.file_name)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.file_size)}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {file.status === 'submitted' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <File className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {file.status === 'submitted' ? '已提交' : '草稿'}
                  </span>
                </div>
              </div>
              
              {file.status === 'draft' && (
                <button
                  onClick={() => handleRemoveFile(file.id)}
                  className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="刪除檔案"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 檔案數量提示 */}
      {files.length >= maxFiles && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
          已達到最大檔案數量限制 ({maxFiles} 個)
        </div>
      )}
    </div>
  )
}

export default EvidenceUpload
