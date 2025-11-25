/**
 * FileDropzone - 可重用的檔案拖放上傳區
 *
 * 特色：
 * - 雲朵圖標設計
 * - 支援點擊和拖放上傳
 * - 可自訂尺寸、提示文字、檔案類型
 *
 * 使用方法：
 * ```tsx
 * import { FileDropzone } from './FileDropzone'
 *
 * // 基礎用法
 * <FileDropzone
 *   width="904px"
 *   height="210px"
 *   accept="application/pdf"
 *   multiple={false}
 *   onFileSelect={(files) => {
 *     const file = files[0]
 *     // 處理檔案
 *   }}
 *   primaryText="點擊或拖放檔案暫存"
 *   secondaryText="支援 PDF 格式，最大 10MB"
 * />
 *
 * // 自訂樣式和位置
 * <FileDropzone
 *   width="600px"
 *   height="150px"
 *   accept="image/*"
 *   multiple={true}
 *   onFileSelect={(files) => console.log(files)}
 *   className="absolute"
 *   style={{ top: '100px', left: '50px' }}
 * />
 *
 * // 外部控制拖放狀態
 * const [isDragging, setIsDragging] = useState(false)
 * <FileDropzone
 *   onFileSelect={(files) => {}}
 *   isDragging={isDragging}
 *   onDragStateChange={setIsDragging}
 * />
 * ```
 */

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { getFileType, getFileIconColor } from '../utils/energy/fileTypeDetector'

export interface MemoryFile {
  id: string
  file: File
  preview: string
  file_name: string
  file_size: number
  mime_type: string
}

// EvidenceFile 介面（用於顯示已儲存的檔案）
export interface EvidenceFile {
  id: string
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
}

export interface FileDropzoneProps {
  // 尺寸
  width?: string
  height?: string

  // 檔案處理
  accept?: string
  multiple?: boolean
  onFileSelect: (files: FileList) => void

  // 狀態
  disabled?: boolean  // 控制上傳區是否可點擊
  readOnly?: boolean  // 控制是否為只讀模式（影響刪除按鈕）

  // 當前檔案 (顯示在上傳框下方) - 支援 MemoryFile（新上傳）或 EvidenceFile（已儲存）
  file?: MemoryFile | null
  evidenceFile?: EvidenceFile | null  // ⭐ 新增：用於顯示已儲存的檔案
  evidenceFileUrl?: string | null      // ⭐ 新增：EvidenceFile 的預覽 URL
  onRemove?: () => void
  showFileActions?: boolean // 是否顯示預覽/刪除按鈕
  onFileClick?: (file: MemoryFile) => void // 檔案點擊回調（圖片預覽）
  onEvidenceFileClick?: (url: string) => void // ⭐ 新增：EvidenceFile 點擊回調

  // 提示文字
  primaryText?: string
  secondaryText?: string

  // 樣式
  className?: string
  style?: React.CSSProperties

  // 拖放狀態
  isDragging?: boolean
  onDragStateChange?: (isDragging: boolean) => void
}

export function FileDropzone({
  width = '904px',
  height = '210px',
  accept = '*',
  multiple = false,
  onFileSelect,
  disabled = false,
  readOnly = false,
  file = null,
  evidenceFile = null,  // ⭐ 新增
  evidenceFileUrl = null,  // ⭐ 新增
  onRemove,
  showFileActions = true,
  onFileClick,
  onEvidenceFileClick,  // ⭐ 新增
  primaryText = '點擊或拖放檔案暫存',
  secondaryText = '支援所有檔案類型，最大 10MB',
  className = '',
  style,
  isDragging: externalIsDragging,
  onDragStateChange
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [internalIsDragging, setInternalIsDragging] = useState(false)

  // 使用外部控制的 isDragging 或內部狀態
  const isDragging = externalIsDragging ?? internalIsDragging
  const setIsDragging = onDragStateChange ?? setInternalIsDragging

  // ⭐ 優先使用 file（新上傳），其次使用 evidenceFile（已儲存）
  const hasFile = file !== null || evidenceFile !== null

  // 自動鎖定邏輯：當 multiple=false 且已有檔案時，自動禁用
  const isAutoDisabled = !multiple && hasFile
  const effectiveDisabled = disabled || isAutoDisabled

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!effectiveDisabled) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFileSelect(files)
    }
    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!effectiveDisabled) {
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

    if (effectiveDisabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFileSelect(files)
    }
  }

  // ⭐ 根據檔案類型渲染 icon（支援 MemoryFile 和 EvidenceFile）
  const renderFileIcon = (
    fileData: MemoryFile | null,
    evidenceFileData: EvidenceFile | null,
    previewUrl: string | null
  ) => {
    // 優先使用 MemoryFile
    if (fileData) {
      const mimeType = fileData.mime_type
      const isImage = mimeType.startsWith('image/')
      const isClickable = isImage && onFileClick

      // 圖片：顯示預覽
      if (isImage) {
        return (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isClickable ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (isClickable) {
                onFileClick(fileData)
              }
            }}
          >
            {fileData.preview ? (
              <img
                src={fileData.preview}
                alt={fileData.file_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </div>
        )
      }

      // 非圖片：根據類型顯示不同顏色的文件 icon
      const fileType = getFileType(mimeType, fileData.file_name)
      const iconColor = getFileIconColor(fileType)

      return (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#f0f0f0',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2V8H20" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    }

    // 使用 EvidenceFile
    if (evidenceFileData) {
      const mimeType = evidenceFileData.mime_type
      const isImage = mimeType.startsWith('image/')
      const isClickable = isImage && onEvidenceFileClick && previewUrl

      // 圖片：顯示預覽
      if (isImage) {
        return (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              background: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isClickable ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (isClickable && previewUrl) {
                onEvidenceFileClick(previewUrl)
              }
            }}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={evidenceFileData.file_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : null}
          </div>
        )
      }

      // 非圖片：根據類型顯示不同顏色的文件 icon
      const fileType = getFileType(mimeType, evidenceFileData.file_name)
      const iconColor = getFileIconColor(fileType)

      return (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#f0f0f0',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2V8H20" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    }

    return null
  }

  return (
    <>
    <div
      className={`bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors ${
        effectiveDisabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${isDragging ? 'bg-blue-50 border-blue-400' : ''} ${className}`}
      style={{
        width,
        height,
        flexShrink: 0,
        border: '1px solid rgba(0, 0, 0, 0.25)',
        borderRadius: '25px',
        padding: '20px',
        ...style
      }}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 隱藏的文件輸入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={effectiveDisabled}
      />

      <div className="flex flex-col items-center justify-center text-center pointer-events-none">
        {/* 雲朵上傳 SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="40"
          viewBox="0 0 48 40"
          fill="none"
          className="mb-4"
        >
          <path
            d="M31.9999 27.9951L23.9999 19.9951M23.9999 19.9951L15.9999 27.9951M23.9999 19.9951V37.9951M40.7799 32.7751C42.7306 31.7116 44.2716 30.0288 45.1597 27.9923C46.0477 25.9558 46.2323 23.6815 45.6843 21.5285C45.1363 19.3754 43.8869 17.4661 42.1333 16.102C40.3796 14.7378 38.2216 13.9966 35.9999 13.9951H33.4799C32.8746 11.6536 31.7462 9.47975 30.1798 7.63707C28.6134 5.79439 26.6496 4.33079 24.4361 3.3563C22.2226 2.38181 19.817 1.9218 17.4002 2.01085C14.9833 2.0999 12.6181 2.73569 10.4823 3.87042C8.34649 5.00515 6.49574 6.60929 5.06916 8.56225C3.64259 10.5152 2.6773 12.7662 2.24588 15.1459C1.81446 17.5256 1.92813 19.9721 2.57835 22.3016C3.22856 24.6311 4.3984 26.7828 5.99992 28.5951"
            stroke="#1E1E1E"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="text-[16px] text-black font-medium mb-1">{primaryText}</p>
        <p className="text-[14px] text-gray-500">{secondaryText}</p>
      </div>
    </div>

    {/* 檔案列表 - 有檔案時才顯示（支援 MemoryFile 和 EvidenceFile） */}
    {(file || evidenceFile) && (
      <div
        style={{
          marginTop: '25px',
          width: width,
          height: '78px',
          flexShrink: 0,
          borderRadius: '28px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '21px',
          paddingRight: '16px',
          position: 'relative',
        }}
      >
        {/* 檔案縮圖/icon */}
        {renderFileIcon(file, evidenceFile, evidenceFileUrl)}

        {/* 檔名 + 大小 */}
        <div style={{ flex: 1, marginLeft: '12px', overflow: 'hidden' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#000',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={file?.file_name || evidenceFile?.file_name || ''}
          >
            {file?.file_name || evidenceFile?.file_name || ''}
          </p>
          <p
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '2px',
            }}
          >
            {((file?.file_size || evidenceFile?.file_size || 0) / 1024).toFixed(1)} KB
          </p>
        </div>

        {/* 刪除按鈕 - 使用 readOnly 而非 disabled */}
        {showFileActions && onRemove && (
          <button
            onClick={onRemove}
            disabled={readOnly}
            className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="刪除檔案"
          >
            <Trash2 style={{ width: '32px', height: '32px' }} />
          </button>
        )}
      </div>
    )}
    </>
  )
}

export default FileDropzone