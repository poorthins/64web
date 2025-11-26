/**
 * FireExtinguisherUsageInputFields - 滅火器使用數據輸入欄位組件
 *
 * 包含：
 * - 左側：上傳框（購買單據）
 * - 右側：表格式輸入（藍色表頭 + 白色輸入行）
 *   - 購買日期 + 品項選單 + 數量(支)
 */

import { FileDropzone, MemoryFile, EvidenceFile as FileDropzoneEvidenceFile } from '../../../components/FileDropzone'
import { Trash2 } from 'lucide-react'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { FireExtinguisherSpec } from '../hooks/useFireExtinguisherSpecManager'
import { CurrentEditingGroup } from '../common/mobileEnergyTypes'
import { TYPE3_ALLOWED_FILE_TYPES, TYPE3_FILE_UPLOAD_HINT } from '../../../constants/fileUpload'

interface FireExtinguisherUsageInputFieldsProps {
  currentGroup: CurrentEditingGroup
  onUpdate: (id: string, field: 'date' | 'quantity', value: any) => void
  onUpdateSpecId: (id: string, specId: string) => void
  onDelete: (id: string) => void
  onAddRecord: () => void
  onFileChange: (files: MemoryFile[]) => void
  onRemoveEvidence: () => void
  specs: FireExtinguisherSpec[]
  isReadOnly: boolean
  iconColor: string
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

const STYLES = {
  container: {
    width: '1275px',
    minHeight: '605px',
    flexShrink: 0,
    borderRadius: '37px',
    background: '#EBEDF0',
    paddingTop: '38px',
    paddingLeft: '49px',
    paddingRight: '49px',
    paddingBottom: '49px'
  },
  field: {
    height: '52px',
    border: '1px solid rgba(0, 0, 0, 0.25)',
    background: '#FFF',
    color: '#000',
    fontFamily: 'Inter',
    fontSize: '20px',
    fontWeight: 400,
    paddingLeft: '20px',
    paddingRight: '20px',
  }
} as const

export function FireExtinguisherUsageInputFields({
  currentGroup,
  onUpdate,
  onUpdateSpecId,
  onDelete,
  onAddRecord,
  onFileChange,
  onRemoveEvidence,
  specs,
  isReadOnly,
  iconColor,
  thumbnails,
  onImageClick
}: FireExtinguisherUsageInputFieldsProps) {
  // 準備 FileDropzone 所需的資料
  const firstRecord = currentGroup.records[0]
  const evidenceFile = firstRecord?.evidenceFiles?.[0]
  const memoryFile = currentGroup.memoryFiles[0]
  const evidenceFileForDropzone: FileDropzoneEvidenceFile | null = evidenceFile ? {
    id: evidenceFile.id,
    file_path: evidenceFile.file_path,
    file_name: evidenceFile.file_name,
    file_size: evidenceFile.file_size,
    mime_type: evidenceFile.mime_type
  } : null
  const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null

  return (
    <div style={{ marginTop: '39px', marginLeft: '367px' }}>
      <div style={STYLES.container} className="flex gap-[47px]">
        {/* 左側：佐證文件區 */}
        <div style={{ flexShrink: 0 }}>
          {/* 佐證文件標題 */}
          <div style={{
            width: '358px',
            height: '73px',
            flexShrink: 0,
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal',
            marginBottom: '16px'
          }}>
            佐證文件<br />
            * 購買單據需註明 年、月、日
          </div>

          {/* 上傳框 */}
          <FileDropzone
            width="358px"
            height="308px"
            accept={TYPE3_ALLOWED_FILE_TYPES}
            multiple={false}
            file={memoryFile || null}
            evidenceFile={evidenceFileForDropzone}
            evidenceFileUrl={thumbnailUrl}
            onFileSelect={(files) => {
              if (files[0]) {
                onFileChange([createMemoryFile(files[0])])
              }
            }}
            onRemove={onRemoveEvidence}
            onEvidenceFileClick={(url) => onImageClick(url)}
            disabled={isReadOnly}
            readOnly={isReadOnly}
            primaryText="點擊或拖放購買單據"
            secondaryText={TYPE3_FILE_UPLOAD_HINT}
          />
        </div>

        {/* 右側：表格式輸入區 */}
        <div style={{ width: '772px', display: 'flex', flexDirection: 'column', marginTop: '89px' }}>
          {/* 表頭 - 綠色區域 */}
          <div className="flex items-center" style={{ backgroundColor: iconColor, height: '58px', paddingLeft: '43px', paddingRight: '16px', borderTopLeftRadius: '30px', borderTopRightRadius: '30px' }}>
            <div style={{ width: '199px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-white text-[20px] font-medium">購買日期</span>
            </div>
            <div style={{ width: '27px' }}></div>
            <div style={{ width: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-white text-[20px] font-medium">品項</span>
            </div>
            <div style={{ width: '27px' }}></div>
            <div style={{ width: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="text-white text-[20px] font-medium">購買數量 (支)</span>
            </div>
            <div style={{ width: '48px' }}></div>
          </div>

          {/* 輸入行 - 白色區域 */}
          <div className="bg-white" style={{ minHeight: '250px', paddingLeft: '43px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {currentGroup.records.map((record) => (
                <div key={record.id} className="flex items-center" style={{ gap: '27px' }}>
                  {/* 購買日期 */}
                  <div className="relative" style={{ width: '199px' }}>
                    <input
                      id={`fire-extinguisher-date-input-${record.id}`}
                      type="date"
                      value={record.date}
                      onChange={(e) => onUpdate(record.id, 'date', e.target.value)}
                      disabled={isReadOnly}
                      className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
                      style={{
                        ...STYLES.field,
                        width: '199px',
                        paddingRight: '48px',
                        colorScheme: 'light',
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield',
                      }}
                    />
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      onClick={() => {
                        const input = document.getElementById(`fire-extinguisher-date-input-${record.id}`) as HTMLInputElement
                        if (input && !input.disabled) {
                          input.showPicker?.()
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="27" height="23" viewBox="0 0 27 23" fill="none">
                        <path d="M21.8333 3.83333H5.16667C3.78595 3.83333 2.66667 4.95262 2.66667 6.33333V19C2.66667 20.3807 3.78595 21.5 5.16667 21.5H21.8333C23.2141 21.5 24.3333 20.3807 24.3333 19V6.33333C24.3333 4.95262 23.2141 3.83333 21.8333 3.83333Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.1667 1.5V6.16667" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8.83333 1.5V6.16667" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M2.66667 10.8333H24.3333" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* 品項選單 */}
                  <select
                    value={record.specId || ''}
                    onChange={(e) => onUpdateSpecId(record.id, e.target.value)}
                    disabled={isReadOnly || specs.length === 0}
                    className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      ...STYLES.field,
                      width: '190px',
                      cursor: isReadOnly || specs.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">
                      {specs.length === 0 ? '請先建立品項' : '請選擇品項'}
                    </option>
                    {specs.map(spec => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>

                  {/* 購買數量 */}
                  <input
                    type="number"
                    min="0"
                    max="999999999"
                    step="1"
                    value={record.quantity || ''}
                    onChange={(e) => {
                      const inputValue = parseFloat(e.target.value) || 0
                      const clampedValue = Math.min(inputValue, 999999999)
                      onUpdate(record.id, 'quantity', clampedValue)
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                    disabled={isReadOnly}
                    placeholder="0"
                    className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      ...STYLES.field,
                      width: '230px',
                      WebkitAppearance: 'none',
                      MozAppearance: 'textfield',
                    }}
                  />

                  {/* 刪除按鈕 */}
                  {currentGroup.records.length > 1 ? (
                    <button
                      onClick={() => onDelete(record.id)}
                      disabled={isReadOnly}
                      className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="刪除此記錄"
                      style={{ marginLeft: '-12px' }}
                    >
                      <Trash2 style={{ width: '32px', height: '32px' }} />
                    </button>
                  ) : (
                    <div style={{ width: '48px', marginLeft: '-12px' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 新增數據按鈕 */}
          <button
            onClick={onAddRecord}
            disabled={isReadOnly}
            style={{
              width: '100%',
              height: '45.984px',
              borderRadius: '7px',
              background: isReadOnly ? '#9CA3AF' : iconColor,
              color: '#FFF',
              textAlign: 'center',
              fontFamily: 'var(--sds-typography-body-font-family)',
              fontSize: '20px',
              fontWeight: 400,
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
              border: 'none',
              marginTop: '97px'
            }}
          >
            + 新增數據到此群組
          </button>
        </div>
      </div>
    </div>
  )
}
