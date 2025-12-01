/**
 * GroupListItem - 群組列表項元件
 *
 * 用途：顯示能源頁面的群組資料（檔案預覽 + 筆數 + 操作按鈕）
 * 適用於：所有有群組概念的多記錄能源頁面
 */

import { FileTypeIcon } from './FileTypeIcon'
import { ActionButtons } from './ActionButtons'
import { getFileType } from '../../utils/energy/fileTypeDetector'
import { THUMBNAIL_PLACEHOLDER_SVG, THUMBNAIL_BACKGROUND } from '../../utils/energy/thumbnailConstants'
import { EvidenceFile } from '../../api/files'
import { MemoryFile } from '../../services/documentHandler'

export interface GroupListItemProps {
  /** 群組索引（用於顯示編號，從 0 開始） */
  index: number
  /** 群組 ID */
  groupId: string
  /** 佐證檔案（來自伺服器） */
  evidenceFile?: EvidenceFile | null
  /** 記憶體檔案（未上傳） */
  memoryFile?: MemoryFile | null
  /** 群組內記錄數量 */
  recordCount: number
  /** 設備類型（可選，柴油固定源專用） */
  deviceType?: string
  /** 檔案縮圖 URL（圖片檔案用） */
  thumbnailUrl?: string | null
  /** 編輯回調 */
  onEdit: (groupId: string) => void
  /** 刪除回調 */
  onDelete: (groupId: string) => void
  /** 檔案點擊預覽回調（圖片） */
  onFileClick?: (file: EvidenceFile | MemoryFile) => void
  /** 是否禁用（同時控制編輯和刪除，向後兼容） */
  disabled?: boolean
  /** 單獨禁用編輯按鈕 */
  disableEdit?: boolean
  /** 單獨禁用刪除按鈕 */
  disableDelete?: boolean
  /** 列表項寬度（px），預設 924 */
  width?: number
  /** 列表項高度（px），預設 87 */
  height?: number
}

/**
 * GroupListItem 元件
 *
 * @example
 * ```tsx
 * <GroupListItem
 *   index={0}
 *   groupId="group_1"
 *   evidenceFile={evidenceFile}
 *   recordCount={3}
 *   thumbnailUrl="https://..."
 *   onEdit={(id) => console.log('Edit', id)}
 *   onDelete={(id) => console.log('Delete', id)}
 *   disabled={false}
 * />
 * ```
 */
export function GroupListItem({
  index,
  groupId,
  evidenceFile,
  memoryFile,
  recordCount,
  deviceType,
  thumbnailUrl,
  onEdit,
  onDelete,
  onFileClick,
  disabled = false,
  disableEdit,
  disableDelete,
  width = 924,
  height = 87,
}: GroupListItemProps): JSX.Element {
  const mimeType = evidenceFile?.mime_type || memoryFile?.mime_type || memoryFile?.file?.type
  const fileName = evidenceFile?.file_name || memoryFile?.file_name
  const fileSize = evidenceFile?.file_size || memoryFile?.file_size

  // 判斷檔案類型
  const fileType = getFileType(mimeType, fileName)

  // 判斷是否為圖片（可點擊預覽）
  const isImage = mimeType?.startsWith('image/')
  const canClickFile = isImage && onFileClick && (evidenceFile || memoryFile)

  // ⭐ 使用父元件傳入的 thumbnailUrl (已由 useThumbnailLoader 批次載入)
  // evidenceFile: 使用 thumbnailUrl, memoryFile: 使用 preview
  const imageUrl = thumbnailUrl || memoryFile?.preview || null

  return (
    <div
      className="flex items-center"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        flexShrink: 0,
        borderRadius: '28px',
        border: '1px solid rgba(0, 0, 0, 0.25)',
        background: '#FFF',
        paddingLeft: '26px',
        gap: '39px',
      }}
    >
      {/* 編號 */}
      <div className="w-[42px] h-[42px] bg-black rounded-full flex items-center justify-center">
        <span className="text-white text-[18px] font-medium">{index + 1}</span>
      </div>

      {/* 檔案預覽 */}
      <div
        className="flex items-center justify-center"
        style={{
          width: '55.769px',
          height: '55.769px',
          flexShrink: 0,
          borderRadius: '10px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#EBEDF0',
          overflow: 'hidden',
          cursor: canClickFile ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (canClickFile) {
            onFileClick!(evidenceFile || memoryFile!)
          }
        }}
      >
        {isImage ? (
          // 圖片檔案
          imageUrl ? (
            <img
              src={imageUrl}
              alt="preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            // 圖片但縮圖還沒載入：顯示統一佔位符
            <div
              style={{
                width: '100%',
                height: '100%',
                background: THUMBNAIL_BACKGROUND,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {THUMBNAIL_PLACEHOLDER_SVG}
            </div>
          )
        ) : (
          // 非圖片檔案：顯示檔案類型 icon
          <FileTypeIcon fileType={fileType} size={36} />
        )}
      </div>

      {/* 檔名 */}
      <div className="flex-1" style={{ maxWidth: '180px' }}>
        <p className="text-[16px] text-black font-medium truncate">{fileName || '無佐證'}</p>
        <p className="text-[15px] text-gray-500">{fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : ''}</p>
      </div>

      {/* 設備類型 / 使用數據 */}
      <div className="text-center flex-shrink-0" style={{ width: '220px' }}>
        <p className="text-[24px] text-black">
          {deviceType ? `${deviceType} / ` : '/ '}使用數據
        </p>
      </div>

      {/* 筆數 */}
      <div className="text-center flex-shrink-0" style={{ width: '80px' }}>
        <p className="text-[24px] font-medium text-black">{recordCount} 筆</p>
      </div>

      {/* 操作按鈕組 */}
      <ActionButtons
        onEdit={() => onEdit(groupId)}
        onDelete={() => onDelete(groupId)}
        disabled={disabled}
        disableEdit={disableEdit}
        disableDelete={disableDelete}
        editTitle="編輯群組"
        deleteTitle="刪除群組"
      />
    </div>
  )
}

export default GroupListItem