/**
 * SF6InputFields - SF6 自訂輸入欄位組件
 *
 * 包含：
 * - 4 個輸入欄位（設備位置、SF6氣體重量、型號、年洩漏率）
 * - 2 個 FileDropzone（GCB銘牌照片、證明文件）
 */

import { FileDropzone, MemoryFile } from '../../../components/FileDropzone'
import { generateRecordId } from '../../../utils/idGenerator'
import { SF6Record } from '../shared/mobile/mobileEnergyTypes'

export interface SF6InputFieldsProps {
  record: SF6Record
  memoryNameplateFiles: MemoryFile[]
  memoryCertificateFiles: MemoryFile[]
  isReadOnly: boolean

  // 事件回調
  onRecordChange: (field: keyof SF6Record, value: any) => void
  onNameplateFilesChange: (files: MemoryFile[]) => void
  onCertificateFilesChange: (files: MemoryFile[]) => void
  onImagePreview: (src: string) => void
}

export function SF6InputFields({
  record,
  memoryNameplateFiles,
  memoryCertificateFiles,
  isReadOnly,
  onRecordChange,
  onNameplateFilesChange,
  onCertificateFilesChange,
  onImagePreview
}: SF6InputFieldsProps) {
  return (
    <div style={{
      width: '845px',
      minHeight: '565px',
      flexShrink: 0,
      borderRadius: '37px',
      background: '#EBEDF0',
      paddingLeft: '27px',
      paddingTop: '27px',
      paddingRight: '27px',
      paddingBottom: '27px'
    }}>
      {/* 4 個輸入欄位 - 2x2 Grid 佈局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '352px 352px',
        columnGap: '87px',
        rowGap: '36px',
        marginBottom: '36px'
      }}>
        {/* 設備位置 */}
        <SF6TextField
          label="設備位置"
          value={record.location}
          onChange={(value) => onRecordChange('location', value)}
          disabled={isReadOnly}
          placeholder="請輸入設備位置"
        />

        {/* SF6氣體重量 (g) */}
        <SF6NumberField
          label="SF6氣體重量 (g)"
          value={record.sf6Weight}
          onChange={(value) => onRecordChange('sf6Weight', value)}
          disabled={isReadOnly}
          placeholder="0"
        />

        {/* 型號 */}
        <SF6TextField
          label="型號"
          value={record.model}
          onChange={(value) => onRecordChange('model', value)}
          disabled={isReadOnly}
          placeholder="請輸入型號"
        />

        {/* 年洩漏率 (%) */}
        <SF6NumberField
          label="年洩漏率 (%)"
          value={record.leakageRate}
          onChange={(value) => onRecordChange('leakageRate', value)}
          disabled={isReadOnly}
          placeholder="0"
          min={0}
          max={100}
        />
      </div>

      {/* 2 個 FileDropzone - 水平並排佈局 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '352px 352px',
        columnGap: '87px'
      }}>
        {/* FileDropzone 1: GCB 氣體斷路器銘牌照片 */}
        <SF6FileUpload
          title="GCB 氣體斷路器銘牌照片"
          file={memoryNameplateFiles[0] || null}
          onFileSelect={(file) => onNameplateFilesChange([file])}
          onRemove={() => onNameplateFilesChange([])}
          onPreview={onImagePreview}
          disabled={isReadOnly}
          primaryText="點擊或拖放銘牌照片"
          secondaryText="支援圖片或 PDF 格式，最大 10MB"
        />

        {/* FileDropzone 2: SF6 氣體重量/ 年洩漏率證明文件 */}
        <SF6FileUpload
          title="SF6 氣體重量/ 年洩漏率證明文件"
          file={memoryCertificateFiles[0] || null}
          onFileSelect={(file) => onCertificateFilesChange([file])}
          onRemove={() => onCertificateFilesChange([])}
          onPreview={onImagePreview}
          disabled={isReadOnly}
          primaryText="點擊或拖放證明文件"
          secondaryText="支援圖片或 PDF 格式，最大 10MB"
        />
      </div>
    </div>
  )
}

/**
 * SF6TextField - 文本輸入欄位子組件
 */
interface SF6TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  placeholder?: string
}

function SF6TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder = ''
}: SF6TextFieldProps) {
  return (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '17px',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        style={{
          height: '52px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontWeight: 400,
          paddingLeft: '20px',
          paddingRight: '20px',
        }}
      />
    </div>
  )
}

/**
 * SF6NumberField - 數字輸入欄位子組件
 */
interface SF6NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  disabled: boolean
  placeholder?: string
  min?: number
  max?: number
}

function SF6NumberField({
  label,
  value,
  onChange,
  disabled,
  placeholder = '0',
  min = 0,
  max
}: SF6NumberFieldProps) {
  return (
    <div>
      <label style={{
        display: 'block',
        marginBottom: '17px',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        step="0.01"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        onWheel={(e) => e.currentTarget.blur()}
        disabled={disabled}
        placeholder={placeholder}
        className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
        style={{
          height: '52px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontWeight: 400,
          paddingLeft: '20px',
          paddingRight: '20px',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
        }}
      />
    </div>
  )
}

/**
 * SF6FileUpload - 檔案上傳子組件
 */
interface SF6FileUploadProps {
  title: string
  file: MemoryFile | null
  onFileSelect: (file: MemoryFile) => void
  onRemove: () => void
  onPreview: (src: string) => void
  disabled: boolean
  primaryText: string
  secondaryText: string
}

function SF6FileUpload({
  title,
  file,
  onFileSelect,
  onRemove,
  onPreview,
  disabled,
  primaryText,
  secondaryText
}: SF6FileUploadProps) {
  return (
    <div>
      <h4 style={{
        marginBottom: '17px',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        {title}
      </h4>
      <FileDropzone
        width="352px"
        height="182px"
        accept="image/*,application/pdf"
        multiple={false}
        onFileSelect={(files) => {
          const selectedFile = files[0]
          if (selectedFile) {
            const memoryFile: MemoryFile = {
              id: generateRecordId(),
              file: selectedFile,
              preview: selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : '',
              file_name: selectedFile.name,
              file_size: selectedFile.size,
              mime_type: selectedFile.type
            }
            onFileSelect(memoryFile)
          }
        }}
        disabled={disabled}
        readOnly={disabled}
        file={file}
        onRemove={onRemove}
        onFileClick={(f) => {
          if (f.preview) {
            onPreview(f.preview)
          }
        }}
        primaryText={primaryText}
        secondaryText={secondaryText}
      />
    </div>
  )
}

export default SF6InputFields
