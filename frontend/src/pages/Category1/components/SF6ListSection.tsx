/**
 * SF6ListSection - 六氟化硫資料列表區
 *
 * 顯示格式：
 * - 設備位置 / 型號 / 氣體重量(g) / 年洩漏率(%)
 * - 兩張圖片縮圖（GCB銘牌照片、SF6證明文件）
 * - 編輯和刪除按鈕
 */

import type { SF6Record } from '../shared/mobile/mobileEnergyTypes'
import { getFileUrl } from '../../../api/files'
import { ActionButtons } from '../../../components/energy/ActionButtons'

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

  // 取得兩張圖片
  const nameplateFile = device.nameplateFiles?.[0] || device.memoryNameplateFiles?.[0]
  const certificateFile = device.certificateFiles?.[0] || device.memoryCertificateFiles?.[0]

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

  const nameplateThumbnail = getImageThumbnail(nameplateFile)
  const certificateThumbnail = getImageThumbnail(certificateFile)

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

      {/* 圖片縮圖 1: GCB銘牌照片 */}
      {nameplateThumbnail && (
        <div
          onClick={() => handleImageClick(nameplateFile)}
          style={{
            width: '55.769px',
            height: '55.769px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            background: '#EBEDF0',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <img
            src={nameplateThumbnail}
            alt="GCB銘牌照片"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* 圖片縮圖 2: SF6證明文件 */}
      {certificateThumbnail && (
        <div
          onClick={() => handleImageClick(certificateFile)}
          style={{
            width: '55.769px',
            height: '55.769px',
            borderRadius: '10px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            background: '#EBEDF0',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <img
            src={certificateThumbnail}
            alt="SF6證明文件"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* 操作按鈕 */}
      <ActionButtons
        onEdit={onEdit}
        onDelete={onDelete}
        disabled={isDisabled}
      />
    </div>
  )
}