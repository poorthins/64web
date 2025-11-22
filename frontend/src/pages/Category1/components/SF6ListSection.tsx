/**
 * SF6ListSection - 六氟化硫資料列表區
 *
 * 顯示格式：
 * - 設備位置 / 型號 / 氣體重量(g) / 年洩漏率(%)
 * - 兩張圖片縮圖（GCB銘牌照片、SF6證明文件）
 * - 編輯和刪除按鈕
 */

import type { SF6Record } from '../common/mobileEnergyTypes'
import { getFileUrl } from '../../../api/files'
import { ActionButtons } from '../../../components/energy/ActionButtons'
import { THUMBNAIL_PLACEHOLDER_SVG, THUMBNAIL_BACKGROUND, THUMBNAIL_BORDER } from '../../../utils/energy/thumbnailConstants'

export interface SF6ListSectionProps {
  savedDevices: SF6Record[]
  thumbnails: Record<string, string>
  isReadOnly: boolean
  approvalStatus: { isApproved: boolean }
  onEditDevice: (deviceId: string) => void
  onDeleteDevice: (deviceId: string) => void
  onPreviewImage: (src: string) => void
  iconColor: string
}

export function SF6ListSection(props: SF6ListSectionProps) {
  const {
    savedDevices,
    thumbnails,
    isReadOnly,
    approvalStatus,
    onEditDevice,
    onDeleteDevice,
    onPreviewImage,
    iconColor
  } = props

  const isDisabled = isReadOnly || approvalStatus.isApproved

  return (
    <>
      {/* 資料列表標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* List Icon */}
          <div
            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconColor }}
          >
            <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>

          {/* 標題文字 */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              資料列表
            </h3>
          </div>
        </div>
      </div>

      {/* 設備列表 */}
      <div className="space-y-4 flex flex-col items-center" style={{ marginTop: '34px', marginBottom: '32px' }}>
        {savedDevices.map((device, index) => (
          <SF6ListItem
            key={device.id}
            index={index}
            device={device}
            thumbnails={thumbnails}
            isDisabled={isDisabled}
            onEdit={() => onEditDevice(device.id)}
            onDelete={() => onDeleteDevice(device.id)}
            onPreviewImage={onPreviewImage}
          />
        ))}

        {savedDevices.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            尚無已新增的設備
          </div>
        )}
      </div>
    </>
  )
}

interface SF6ListItemProps {
  index: number
  device: SF6Record
  thumbnails: Record<string, string>
  isDisabled: boolean
  onEdit: () => void
  onDelete: () => void
  onPreviewImage: (src: string) => void
}

function SF6ListItem(props: SF6ListItemProps) {
  const { index, device, thumbnails, isDisabled, onEdit, onDelete, onPreviewImage } = props

  // 取得檔案（可能有 1~2 張）
  // 優先顯示記憶體檔案（新上傳的），沒有才顯示資料庫檔案（舊的）
  const allFiles = [
    ...(device.memoryNameplateFiles && device.memoryNameplateFiles.length > 0
      ? device.memoryNameplateFiles
      : device.nameplateFiles || []),
    ...(device.memoryCertificateFiles && device.memoryCertificateFiles.length > 0
      ? device.memoryCertificateFiles
      : device.certificateFiles || [])
  ]

  console.log('📸 [SF6ListItem] 設備檔案顯示:', {
    deviceId: device.id,
    nameplateFilesFromDB: device.nameplateFiles?.length || 0,
    certificateFilesFromDB: device.certificateFiles?.length || 0,
    memoryNameplateFiles: device.memoryNameplateFiles?.length || 0,
    memoryCertificateFiles: device.memoryCertificateFiles?.length || 0,
    allFilesCount: allFiles.length,
    allFiles
  })

  const file1 = allFiles[0]
  const file2 = allFiles[1]

  // 圖片預覽處理
  const handleImageClick = async (file: any) => {
    if (!file) return

    if ('file_path' in file) {
      // EvidenceFile - 已上傳的檔案
      const url = await getFileUrl(file.file_path)
      onPreviewImage(url)
    } else if ('preview' in file && file.preview) {
      // MemoryFile - 記憶體檔案，有 preview
      onPreviewImage(file.preview)
    } else if ('file' in file && file.file) {
      // MemoryFile - 記憶體檔案，沒有 preview
      onPreviewImage(URL.createObjectURL(file.file))
    }
  }

  // 取得縮圖 URL
  const getImageThumbnail = (file: any) => {
    if (!file) return null

    if ('file_path' in file) {
      // EvidenceFile - 使用預先載入的 thumbnail
      return thumbnails[file.id] || null
    } else if ('preview' in file && file.preview) {
      // MemoryFile - 使用 preview
      return file.preview
    } else if ('file' in file && file.file && file.file.type.startsWith('image/')) {
      // MemoryFile - 動態生成 preview
      return URL.createObjectURL(file.file)
    }

    return null
  }

  const thumbnail1 = getImageThumbnail(file1)
  const thumbnail2 = getImageThumbnail(file2)

  return (
    <div
      style={{
        width: '924px',
        height: '87px',
        borderRadius: '28px',
        border: '1px solid rgba(0, 0, 0, 0.25)',
        background: '#FFF',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '26px',
        gap: '39px'
      }}
    >
      {/* 編號 */}
      <div style={{
        width: '42px',
        height: '42px',
        backgroundColor: '#000',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <span style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>{index + 1}</span>
      </div>

      {/* 設備資訊：設備位置 / 型號 / 氣體重量 / 年洩漏率 */}
      <div className="flex-1 text-[24px] text-black" style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {device.location} / {device.model} / {device.sf6Weight.toLocaleString()} g / {device.leakageRate}%
      </div>

      {/* 圖片縮圖容器 - 兩張圖間距 20px */}
      <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
        {/* 圖片縮圖 1 - 永久顯示 */}
        <div
          onClick={thumbnail1 ? () => handleImageClick(file1) : undefined}
          style={{
            width: '55.769px',
            height: '55.769px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: THUMBNAIL_BORDER,
            background: THUMBNAIL_BACKGROUND,
            cursor: thumbnail1 ? 'pointer' : 'default',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {thumbnail1 ? (
            <img
              src={thumbnail1}
              alt="佐證資料 1"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            THUMBNAIL_PLACEHOLDER_SVG
          )}
        </div>

        {/* 圖片縮圖 2 - 永久顯示 */}
        <div
          onClick={thumbnail2 ? () => handleImageClick(file2) : undefined}
          style={{
            width: '55.769px',
            height: '55.769px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: THUMBNAIL_BORDER,
            background: THUMBNAIL_BACKGROUND,
            cursor: thumbnail2 ? 'pointer' : 'default',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {thumbnail2 ? (
            <img
              src={thumbnail2}
              alt="佐證資料 2"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            THUMBNAIL_PLACEHOLDER_SVG
          )}
        </div>
      </div>

      {/* 操作按鈕 */}
      <ActionButtons
        onEdit={onEdit}
        onDelete={onDelete}
        disabled={isDisabled}
      />
    </div>
  )
}