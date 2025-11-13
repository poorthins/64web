/**
 * UploadedFileList - 已上傳檔案列表元件
 *
 * 用途：顯示已上傳（記憶體暫存）的檔案列表
 * 適用於：所有需要顯示檔案列表的能源頁面
 *
 * 注意：此元件只處理檔案列表顯示，不包含上傳區域
 * 上傳區域應該由各頁面自己實作（因為差異太大）
 */

import { Trash2 } from 'lucide-react'
import { MemoryFile } from '../../services/documentHandler'
import { getFileType, getFileIconColor } from '../../utils/energy/fileTypeDetector'

export interface UploadedFileListProps {
  /** 已上傳的記憶體檔案列表 */
  files: MemoryFile[]
  /** 檔案移除回調 */
  onRemove: (index: number) => void
  /** 檔案點擊預覽回調（圖片） */
  onFileClick?: (file: MemoryFile) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 列表項寬度（px），預設 358 */
  itemWidth?: number
  /** 列表項高度（px），預設 78 */
  itemHeight?: number
  /** 項目間距（px），預設 19 */
  itemSpacing?: number
}

/**
 * UploadedFileList 元件
 *
 * @example
 * ```tsx
 * const [memoryFiles, setMemoryFiles] = useState<MemoryFile[]>([])
 *
 * <UploadedFileList
 *   files={memoryFiles}
 *   onRemove={(index) => {
 *     setMemoryFiles(memoryFiles.filter((_, i) => i !== index))
 *   }}
 *   onFileClick={(file) => {
 *     if (file.file.type.startsWith('image/')) {
 *       setLightboxSrc(URL.createObjectURL(file.file))
 *     }
 *   }}
 *   disabled={false}
 * />
 * ```
 */
export function UploadedFileList({
  files,
  onRemove,
  onFileClick,
  disabled = false,
  itemWidth = 358,
  itemHeight = 78,
  itemSpacing = 19,
}: UploadedFileListProps): JSX.Element | null {
  // 如果沒有檔案，不渲染任何東西
  if (files.length === 0) {
    return null
  }

  return (
    <>
      {files.map((file, index) => (
        <div
          key={index}
          style={{
            marginTop: `${itemSpacing}px`,
            width: `${itemWidth}px`,
            height: `${itemHeight}px`,
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
          {/* 檔案縮圖 */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              cursor: file.file.type.startsWith('image/') && onFileClick ? 'pointer' : 'default',
              background: '#f0f0f0',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => {
              if (file.file.type.startsWith('image/') && onFileClick) {
                onFileClick(file)
              }
            }}
          >
            {file.file.type.startsWith('image/') ? (
              <img
                src={file.preview || URL.createObjectURL(file.file)}
                alt={file.file.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              (() => {
                const fileType = getFileType(file.mime_type, file.file_name)
                const iconColor = getFileIconColor(fileType)
                return (
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
                )
              })()
            )}
          </div>

          {/* 檔案名稱 */}
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
            >
              {file.file.name}
            </p>
            <p
              style={{
                fontSize: '12px',
                color: '#666',
                marginTop: '2px',
              }}
            >
              {(file.file.size / 1024).toFixed(1)} KB
            </p>
          </div>

          {/* 刪除按鈕 */}
          <button
            onClick={() => onRemove(index)}
            disabled={disabled}
            className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="刪除檔案"
          >
            <Trash2 style={{ width: '32px', height: '28px' }} />
          </button>
        </div>
      ))}
    </>
  )
}

export default UploadedFileList