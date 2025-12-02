/**
 * WeldingRodSpecInputFields - 焊條規格輸入欄位組件
 *
 * 包含：
 * - 1 個輸入欄位（品項清單）
 * - 1 個 FileDropzone（含碳率佐證文件）
 * - 保存按鈕（在組件內）
 */

import { FileDropzone, MemoryFile, EvidenceFile as FileDropzoneEvidenceFile } from '../../../components/FileDropzone'
import { Package } from 'lucide-react'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { WeldingRodSpec } from '../hooks/useWeldingRodSpecManager'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../../utils/fileUpload'

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
interface WeldingRodSpecInputFieldsProps {
  spec: WeldingRodSpec
  onFieldChange: (field: keyof WeldingRodSpec, value: any) => void
  onSave: () => void
  editingSpecId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

// ==================== 主組件 ====================
export function WeldingRodSpecInputFields({
  spec,
  onFieldChange,
  onSave,
  editingSpecId,
  isReadOnly,
  thumbnails,
  onImageClick
}: WeldingRodSpecInputFieldsProps) {
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
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#95D0A7" }}>
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
            background: '#95D0A7',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* 品項清單 */}
          <div>
            <label style={STYLES.label}>品項清單</label>
            <p style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 300,
              lineHeight: 'normal',
              marginBottom: '17px'
            }}>* 輸入型號_線徑 (mm)_含碳率 (%)_單位重量 (KG)</p>
            <input
              type="text"
              value={spec.name}
              onChange={(e) => onFieldChange('name', e.target.value)}
              disabled={isReadOnly}
              placeholder="例如：E7018_0.05"
              className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={STYLES.field}
            />
          </div>

          {/* 檔案上傳 */}
          <div style={{ marginTop: '40px' }}>
            {/* 提示框 */}
            <div style={{
              backgroundColor: '#95D0A7',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              lineHeight: 'normal'
            }}>
              <span style={{ fontWeight: 400 }}>
                含碳率佐證文件*(規格書/銲條檢驗報告或其他)/ 重量證明
              </span>
              {'    '}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 15" fill="none" style={{ verticalAlign: 'middle', display: 'inline-block' }}>
                <path d="M16.4551 14.5H0.865234L8.66016 0.999023L16.4551 14.5Z" stroke="black" strokeWidth="1"/>
              </svg>
              <span style={{ fontWeight: 300 }}>
                若購買單位為「盒」、「包」等
                描述物品容器或包裝的單位，需上傳重量證明，如: 規格書/ 對話紀錄截圖/ 有公司章的文件等。
              </span>
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
              primaryText="點擊或拖放佐證文件"
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
