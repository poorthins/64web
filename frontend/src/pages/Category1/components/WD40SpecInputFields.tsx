/**
 * WD40SpecInputFields - WD-40 規格輸入欄位組件
 *
 * 包含：
 * - 1 個輸入欄位（規格名稱）
 * - 1 個 FileDropzone（品項佐證）
 * - 保存按鈕（在組件內）
 */

import { FileDropzone, MemoryFile, EvidenceFile as FileDropzoneEvidenceFile } from '../../../components/FileDropzone'
import { Package } from 'lucide-react'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../../constants/fileUpload'
import { WD40Spec } from '../hooks/useWD40SpecManager'

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
  }
} as const

// ==================== 介面定義 ====================
interface WD40SpecInputFieldsProps {
  spec: WD40Spec
  onFieldChange: (field: keyof WD40Spec, value: any) => void
  onSave: () => void
  editingSpecId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

// ==================== 主組件 ====================
export function WD40SpecInputFields({
  spec,
  onFieldChange,
  onSave,
  editingSpecId,
  isReadOnly,
  thumbnails,
  onImageClick
}: WD40SpecInputFieldsProps) {
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
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#068A8F" }}>
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
            background: '#EBEDF0',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* 規格名稱 */}
          <div>
            <label style={STYLES.label}>品項名稱</label>
            <input
              type="text"
              value={spec.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              disabled={isReadOnly}
              placeholder="例如：WD-40 防鏽潤滑劑 400ml"
              className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={STYLES.field}
            />
          </div>

          {/* 檔案上傳 */}
          <div style={{ marginTop: '40px' }}>
            <h4 style={STYLES.label}>品項佐證（產品照片/規格書）</h4>
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
              primaryText="點擊或拖放品項佐證"
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
