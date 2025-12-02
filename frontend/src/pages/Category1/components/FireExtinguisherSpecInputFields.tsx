/**
 * FireExtinguisherSpecInputFields - 滅火器規格輸入欄位組件
 *
 * 包含：
 * - 1 個輸入欄位（品項清單）
 * - 1 個 FileDropzone（產品照片）
 * - 保存按鈕（在組件內）
 */

import { FileDropzone, MemoryFile, EvidenceFile as FileDropzoneEvidenceFile } from '../../../components/FileDropzone'
import { Package } from 'lucide-react'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { FireExtinguisherSpec } from '../hooks/useFireExtinguisherSpecManager'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../../constants/fileUpload'

// ==================== 樣式常數 ====================
const STYLES = {
  field: {
    width: '795px',
    height: '52px',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    background: '#FFF',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontWeight: 400,
    paddingLeft: '20px',
    paddingRight: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '17px',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: 'normal' as const
  },
  helperText: {
    display: 'block',
    marginTop: '8px',
    color: '#666',
    fontFamily: 'Inter',
    fontSize: '14px',
    fontStyle: 'normal' as const,
    fontWeight: 400,
    lineHeight: 'normal' as const
  }
} as const

// ==================== 介面定義 ====================
interface FireExtinguisherSpecInputFieldsProps {
  spec: FireExtinguisherSpec
  onFieldChange: (field: keyof FireExtinguisherSpec, value: any) => void
  onSave: () => void
  editingSpecId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

// ==================== 主組件 ====================
export function FireExtinguisherSpecInputFields({
  spec,
  onFieldChange,
  onSave,
  editingSpecId,
  isReadOnly,
  thumbnails,
  onImageClick
}: FireExtinguisherSpecInputFieldsProps) {
  // ⭐ 準備 FileDropzone 所需的資料
  const evidenceFile = spec.evidenceFiles?.[0]
  const memoryFile = spec.memoryFiles?.[0]
  const evidenceFileForDropzone: FileDropzoneEvidenceFile | null = evidenceFile ? {
    id: evidenceFile.id,
    file_path: evidenceFile.file_path,
    file_name: evidenceFile.file_name,
    file_size: evidenceFile.file_size,
    mime_type: evidenceFile.mime_type
  } : null
  const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null

  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#006738" }}>
            <Package size={24} color="#FFF" />
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              品項設定
            </h3>
          </div>
        </div>
      </div>

      {/* 填寫框 */}
      <div className="flex justify-center" style={{ marginTop: '39px' }}>
        <div
          style={{
            width: '893px',
            minHeight: '400px',
            flexShrink: 0,
            borderRadius: '37px',
            background: '#006738',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* 品項清單 */}
          <div>
            <div style={{
              color: '#FFF',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              品項清單<br />
              * 輸入設備類型_單支藥劑量 (KG/支)
            </div>
            <input
              type="text"
              value={spec.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              disabled={isReadOnly}
              placeholder="例如：ABC 乾粉滅火器_2.5"
              className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={STYLES.field}
            />
          </div>

          {/* 檔案上傳 */}
          <div style={{ marginTop: '40px' }}>
            {/* 提示框 */}
            <div style={{
              backgroundColor: '#006738',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#FFF',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              lineHeight: '1.6'
            }}>
              產品照片<br />
              * 產品照片需拍到藥劑重量資訊
            </div>

            <FileDropzone
              width="795px"
              height="262px"
              accept={TYPE3_ALLOWED_FILE_TYPES}
              multiple={false}
              file={memoryFile || null}
              evidenceFile={evidenceFileForDropzone}
              evidenceFileUrl={thumbnailUrl}
              onFileSelect={(files) => {
                const file = files[0]
                if (file) {
                  const memoryFile = createMemoryFile(file)
                  onFieldChange('memoryFiles', [memoryFile])
                }
              }}
              onRemove={() => {
                onFieldChange('memoryFiles', [])
                if (evidenceFile) {
                  onFieldChange('evidenceFiles', [])
                }
              }}
              onEvidenceFileClick={(url) => onImageClick(url)}
              disabled={isReadOnly}
              readOnly={isReadOnly}
              primaryText="點擊或拖放產品照片"
              secondaryText={TYPE3_FILE_UPLOAD_HINT}
            />
          </div>
        </div>
      </div>

      {/* 保存按鈕 */}
      <div className="flex justify-center" style={{ marginTop: '46px' }}>
        <button
          onClick={onSave}
          style={{
            width: '237px',
            height: '46.25px',
            flexShrink: 0,
            borderRadius: '7px',
            border: '1px solid rgba(0, 0, 0, 0.50)',
            background: '#000',
            boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'var(--sds-typography-body-font-family)',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 'var(--sds-typography-body-font-weight-regular)',
            lineHeight: '100%'
          }}
        >
          {editingSpecId ? '儲存變更' : '+ 新增品項'}
        </button>
      </div>
    </>
  )
}
