/**
 * SDSUploadSection - SDS 安全資料表上傳區
 *
 * 獨立的上傳區域，用於尿素等需要 SDS 的頁面
 * - 只允許上傳單個 PDF 檔案
 * - 顯示在頁面頂部（說明文字下方）
 * - 使用特殊 record_id = 'sds_upload'
 */

import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { MemoryFile } from '../services/documentHandler'
import { FileDropzone } from './FileDropzone'

export interface SDSUploadSectionProps {
  // 權限
  isReadOnly: boolean
  submitting: boolean
  canUploadFiles: boolean

  // 狀態
  sdsFile: MemoryFile | null
  setSdsFile: (file: MemoryFile | null) => void

  // 事件
  onError: (msg: string) => void
  onPreviewImage?: (src: string) => void  // 圖片預覽回調

  // 樣式
  iconColor: string
}

export function SDSUploadSection({
  isReadOnly,
  submitting,
  canUploadFiles,
  sdsFile,
  setSdsFile,
  onError,
  onPreviewImage,
  iconColor
}: SDSUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false)

  const validateAndSetFile = (selectedFile: File) => {
    // 允許的檔案類型
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg']
    const fileName = selectedFile.name.toLowerCase()
    const isAllowed = allowedExtensions.some(ext => fileName.endsWith(ext))

    if (!isAllowed) {
      onError('僅支援 PDF、Word、圖片檔案')
      return
    }

    // 檔案大小限制 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      onError('檔案大小不可超過 10MB')
      return
    }

    const memoryFile: MemoryFile = {
      id: `memory-sds-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,  // ⭐ 使用 memory- 前綴（與其他頁面統一）
      file: selectedFile,
      preview: URL.createObjectURL(selectedFile),
      file_name: selectedFile.name,
      file_size: selectedFile.size,
      mime_type: selectedFile.type
    }

    setSdsFile(memoryFile)
  }

  const handleRemove = () => {
    if (sdsFile?.preview) {
      URL.revokeObjectURL(sdsFile.preview)
    }
    setSdsFile(null)
  }

  return (
    <div style={{ marginTop: '60px' }}>
      {/* 標題 - icon 距離左邊界 367px，與使用數據對齊 */}
      <div className="flex items-center gap-[29px] mb-6" style={{ marginLeft: '367px' }}>
        {/* FileText Icon */}
        <div
          className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconColor }}
        >
          <FileText size={29} color="white" />
        </div>

        {/* 標題文字 */}
        <div className="flex flex-col justify-center">
          <h3 className="text-[28px] font-bold text-black">
            SDS 安全資料表
          </h3>
        </div>
      </div>

      {/* 上傳區 - 綠色外框容器（置中）*/}
      <div className="flex justify-center">
        <div
          className="relative"
          style={{
            width: '1005px',
            minHeight: '446px',
            flexShrink: 0,
            borderRadius: '37px',
            background: iconColor
          }}
        >
          {/* 上傳框 + 檔案列表 */}
          <div className="absolute" style={{ top: '68px', left: '49px' }}>
            <FileDropzone
              width="904px"
              height="210px"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,image/*"
              multiple={false}
              onFileSelect={(files) => {
                if (!isReadOnly && !submitting && canUploadFiles) {
                  const selectedFile = files[0]
                  if (selectedFile) {
                    validateAndSetFile(selectedFile)
                  }
                }
              }}
              disabled={isReadOnly || submitting || !canUploadFiles || !!sdsFile}
              readOnly={isReadOnly || submitting}
              file={sdsFile}
              onRemove={handleRemove}
              showFileActions={!isReadOnly && canUploadFiles}
              onFileClick={(file) => {
                // 圖片預覽：使用 ImageLightbox
                if (file.preview && onPreviewImage) {
                  onPreviewImage(file.preview)
                }
              }}
              primaryText="點擊或拖放檔案暫存"
              secondaryText="僅支援上傳 1 個檔案，格式：PDF、Word、圖片，最大 10MB"
              isDragging={isDragging}
              onDragStateChange={setIsDragging}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SDSUploadSection
