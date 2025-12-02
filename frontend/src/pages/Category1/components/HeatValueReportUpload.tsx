/**
 * HeatValueReportUpload - 熱值報表上傳區塊
 *
 * 包含：
 * - FileDropzone 上傳區
 * - 已暫存的檔案（memoryFiles）列表
 * - 已儲存的檔案（evidenceFiles）列表
 */

import { Trash2 } from 'lucide-react'
import { EvidenceFile, deleteEvidenceFile, getFileUrl } from '../../../api/files'
import { MemoryFile } from '../../../utils/documentHandler'
import { FileDropzone } from '../../../components/FileDropzone'
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../utils/energy/fileTypeDetector'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { useState, useEffect } from 'react'

interface HeatValueReportUploadProps {
  /** 當前選中月份 (1-12) */
  selectedMonth: number
  /** 月度暫存檔案 */
  monthlyMemoryFiles: Record<number, MemoryFile[]>
  /** 月度已上傳檔案 */
  monthlyFiles: Record<number, EvidenceFile[]>
  /** 暫存檔案變更事件 */
  onMemoryFilesChange: (month: number, files: MemoryFile[]) => void
  /** 已上傳檔案變更事件 */
  onFilesChange: (month: number, files: EvidenceFile[]) => void
  /** 標記檔案為待刪除 */
  onDeleteEvidence?: (fileId: string) => void
  /** 錯誤回調 */
  onError: (error: string) => void
  /** 開啟 Lightbox 回調 */
  onLightboxOpen: (src: string) => void
  /** 是否可編輯 */
  canEdit: boolean
  /** 是否已核准 */
  isApproved: boolean
}

// 單個已儲存檔案顯示元件（支援 signed URL 載入）
function SavedFileItem({
  file,
  onDelete,
  onLightboxOpen,
  canEdit,
  isApproved
}: {
  file: EvidenceFile
  onDelete: () => void
  onLightboxOpen: (src: string) => void
  canEdit: boolean
  isApproved: boolean
}) {
  const isImage = file.mime_type?.startsWith('image/')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (isImage && file.file_path) {
      getFileUrl(file.file_path)
        .then(url => setImageUrl(url))
        .catch(err => {
          console.error('載入圖片失敗:', err)
          setImageUrl(null)
        })
    }
  }, [isImage, file.file_path])

  return (
    <div
      style={{
        borderRadius: '28px',
        border: '1px solid rgba(0, 0, 0, 0.25)',
        background: '#FFF',
        display: 'flex',
        alignItems: 'center',
        padding: '16px 21px',
        gap: '12px',
        marginBottom: '12px'
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
          cursor: isImage ? 'pointer' : 'default',
          background: '#f0f0f0',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => {
          if (isImage && imageUrl) {
            onLightboxOpen(imageUrl)
          }
        }}
      >
        {isImage && imageUrl ? (
          <img
            src={imageUrl}
            alt={file.file_name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <FileTypeIcon fileType={getFileType(file.mime_type, file.file_name)} size={36} />
        )}
      </div>

      {/* 檔名 */}
      <div className="flex-1 overflow-hidden">
        <p className="text-[14px] font-medium text-black truncate">
          {file.file_name}
        </p>
        <p className="text-[12px] text-gray-500">
          {file.file_size ? (file.file_size / 1024).toFixed(1) : '0.0'} KB
        </p>
      </div>

      {/* 刪除按鈕 */}
      {canEdit && !isApproved && (
        <button
          onClick={onDelete}
          className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="刪除檔案"
        >
          <Trash2 style={{ width: '32px', height: '32px' }} />
        </button>
      )}
    </div>
  )
}

export function HeatValueReportUpload({
  selectedMonth,
  monthlyMemoryFiles,
  monthlyFiles,
  onMemoryFilesChange,
  onFilesChange,
  onDeleteEvidence,
  onError,
  onLightboxOpen,
  canEdit,
  isApproved
}: HeatValueReportUploadProps) {
  const isReadOnly = !canEdit || isApproved

  return (
    <div style={{ marginTop: '54px' }}>
      <h4
        style={{
          display: 'block',
          marginBottom: '17px',
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal'
        }}
      >
        熱值報表
      </h4>

      {/* FileDropzone 上傳區 */}
      <FileDropzone
        width="904px"
        height="210px"
        accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        multiple={false}
        onFileSelect={(files) => {
          if (canEdit && !isApproved) {
            // 檢查數量限制（每月最多 1 個檔案）
            if ((monthlyMemoryFiles[selectedMonth]?.length || 0) >= 1) {
              onError('已達到最大檔案數量限制 (每月 1 個)')
              return
            }

            // 建立 MemoryFile
            const file = files[0]
            const memoryFile = createMemoryFile(file)

            // 更新當前月份的 memoryFiles
            onMemoryFilesChange(selectedMonth, [memoryFile])
          }
        }}
        disabled={isReadOnly}
        readOnly={isReadOnly}
        file={null}
        showFileActions={canEdit && !isApproved}
        primaryText="點擊或拖放檔案暫存"
        secondaryText="支援所有檔案格式，最大 10MB"
      />

      {/* 已暫存的檔案（memoryFiles） - 顯示當前月份 */}
      {(monthlyMemoryFiles[selectedMonth]?.length || 0) > 0 && (
        <div style={{ marginTop: '19px', width: '904px' }}>
          {(monthlyMemoryFiles[selectedMonth] || []).map((file) => {
            const isImage = file.mime_type.startsWith('image/')

            return (
              <div
                key={file.id}
                style={{
                  borderRadius: '28px',
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  background: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 21px',
                  gap: '12px',
                  marginBottom: '12px'
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
                    cursor: isImage ? 'pointer' : 'default',
                    background: '#f0f0f0',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => {
                    if (isImage && file.preview) {
                      onLightboxOpen(file.preview)
                    }
                  }}
                >
                  {isImage && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <FileTypeIcon fileType={getFileType(file.mime_type, file.file_name)} size={36} />
                  )}
                </div>

                {/* 檔名 */}
                <div className="flex-1 overflow-hidden">
                  <p className="text-[14px] font-medium text-black truncate">
                    {file.file_name}
                  </p>
                  <p className="text-[12px] text-gray-500">
                    {(file.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>

                {/* 刪除按鈕 */}
                {canEdit && !isApproved && (
                  <button
                    onClick={() => {
                      const updatedFiles = monthlyMemoryFiles[selectedMonth]?.filter(f => f.id !== file.id) || []
                      onMemoryFilesChange(selectedMonth, updatedFiles)
                    }}
                    className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="刪除檔案"
                  >
                    <Trash2 style={{ width: '32px', height: '32px' }} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 已儲存的檔案（heatValueFiles） - 顯示當前月份 */}
      {(monthlyFiles[selectedMonth]?.length || 0) > 0 && (
        <div style={{ marginTop: '19px', width: '904px' }}>
          {(monthlyFiles[selectedMonth] || []).map((file) => (
            <SavedFileItem
              key={file.id}
              file={file}
              onDelete={() => {
                // ✅ 標記檔案為待刪除（而不是立即刪除）
                if (onDeleteEvidence) {
                  onDeleteEvidence(file.id)
                }

                // 從 UI 移除
                const updatedFiles = monthlyFiles[selectedMonth]?.filter(f => f.id !== file.id) || []
                onFilesChange(selectedMonth, updatedFiles)
              }}
              onLightboxOpen={onLightboxOpen}
              canEdit={canEdit}
              isApproved={isApproved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
