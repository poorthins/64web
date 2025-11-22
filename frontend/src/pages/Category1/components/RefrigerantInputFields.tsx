/**
 * RefrigerantInputFields - 冷媒設備輸入欄位組件
 *
 * 包含：
 * - 6 個輸入欄位（設備種類、廠牌型號、位置、冷媒類型、填充量、單位）
 * - 1 個 FileDropzone（銘牌照片/汽車行照）
 */

import { FileDropzone, MemoryFile } from '../../../components/FileDropzone'
import { SettingsIcon } from '../../../components/icons/SettingsIcon'
import { generateRecordId } from '../../../utils/idGenerator'
import type { RefrigerantDevice } from '../RefrigerantPage'

// ==================== 樣式常數 ====================
const STYLES = {
  field: {
    width: '352px',
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

const EQUIPMENT_TYPES = [
  '熱泵系統',
  '冰水機',
  '飲水機',
  '冷氣機',
  '除濕機',
  '家用冷凍、冷藏裝備',
  '商用冷凍、冷藏裝備',
  '運輸用冷凍、冷藏裝備',
  '工業冷凍、冷藏裝備',
  '車輛空調'
] as const

// ==================== 介面定義 ====================
interface RefrigerantInputFieldsProps {
  device: RefrigerantDevice
  onFieldChange: (field: keyof RefrigerantDevice, value: any) => void
  onSave: () => void
  editingDeviceId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

// ==================== 主組件 ====================
export function RefrigerantInputFields({
  device,
  onFieldChange,
  onSave,
  editingDeviceId,
  isReadOnly,
  thumbnails,
  onImageClick
}: RefrigerantInputFieldsProps) {
  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#6197C5" }}>
            <SettingsIcon />
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              冷媒設備資料
            </h3>
          </div>
        </div>
      </div>

      {/* 填寫框 */}
      <div className="flex justify-center" style={{ marginTop: '39px' }}>
        <div
          style={{
            width: '893px',
            minHeight: '600px',
            flexShrink: 0,
            borderRadius: '37px',
            background: '#EBEDF0',
            paddingTop: '27px',
            paddingLeft: '49px',
            paddingRight: '49px',
            paddingBottom: '45px'
          }}
        >
          {/* 左右兩欄佈局 */}
          <div style={{ display: 'flex', gap: '91px' }}>
            {/* 左欄 */}
            <div style={{ width: '352px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {/* 設備種類 */}
              <div>
                <label style={STYLES.label}>設備種類</label>
                <select
                  value={device.equipmentType}
                  onChange={(e) => onFieldChange('equipmentType', e.target.value)}
                  disabled={isReadOnly}
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={STYLES.field}
                >
                  <option value="">請選擇設備種類</option>
                  {EQUIPMENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* 廠牌/型號 */}
              <div>
                <label style={STYLES.label}>廠牌/型號</label>
                <input
                  type="text"
                  value={device.brandModel}
                  onChange={(e) => onFieldChange('brandModel', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="例如：三洋 SR-480BV5"
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={STYLES.field}
                />
              </div>

              {/* 設備位置 */}
              <div>
                <label style={STYLES.label}>
                  設備位置 <span style={{ color: '#666' }}>*車輛空調不用填</span>
                </label>
                <input
                  type="text"
                  value={device.equipmentLocation}
                  onChange={(e) => onFieldChange('equipmentLocation', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="例如：A棟5樓529辦公室"
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={STYLES.field}
                />
              </div>
            </div>

            {/* 右欄 */}
            <div style={{ width: '352px', display: 'flex', flexDirection: 'column', gap: '36px' }}>
              {/* 冷媒類型 */}
              <div>
                <label style={STYLES.label}>冷媒類型</label>
                <input
                  type="text"
                  value={device.refrigerantType}
                  onChange={(e) => onFieldChange('refrigerantType', e.target.value)}
                  disabled={isReadOnly}
                  placeholder="例如：HFC-134a"
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={STYLES.field}
                />
              </div>

              {/* 填充量 */}
              <div>
                <label style={STYLES.label}>填充量</label>
                <input
                  type="number"
                  min="0"
                  max="999999999"
                  step="0.01"
                  value={device.fillAmount || ''}
                  onChange={(e) => {
                    const inputValue = parseFloat(e.target.value) || 0
                    // ⭐ 防止數字溢位
                    const clampedValue = Math.min(inputValue, 999999999)
                    onFieldChange('fillAmount', clampedValue)
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  disabled={isReadOnly}
                  placeholder="例如：120"
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    ...STYLES.field,
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                  }}
                />
              </div>

              {/* 單位 */}
              <div>
                <label style={STYLES.label}>單位</label>
                <select
                  value={device.unit}
                  onChange={(e) => onFieldChange('unit', e.target.value as 'gram' | 'kg')}
                  disabled={isReadOnly}
                  className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={STYLES.field}
                >
                  <option value="kg">公斤</option>
                  <option value="gram">公克</option>
                </select>
              </div>
            </div>
          </div>

          {/* 檔案上傳 */}
          <div style={{ marginTop: '79px' }}>
            <h4 style={STYLES.label}>冷媒設備銘牌照片/汽車行照</h4>
            <FileDropzone
              width="795px"
              height="262px"
              accept="image/*,application/pdf"
              multiple={false}
              file={
                device.memoryFiles[0] ||
                (device.evidenceFiles?.[0] ? {
                  id: device.evidenceFiles[0].id,
                  file: null as any,
                  preview: thumbnails[device.evidenceFiles[0].id] || '',
                  file_name: device.evidenceFiles[0].file_name,
                  file_size: device.evidenceFiles[0].file_size,
                  mime_type: device.evidenceFiles[0].mime_type
                } : null)
              }
              onFileSelect={(files) => {
                const file = files[0]
                if (file) {
                  const memoryFile: MemoryFile = {
                    id: generateRecordId(),
                    file,
                    preview: URL.createObjectURL(file),
                    file_name: file.name,
                    file_size: file.size,
                    mime_type: file.type
                  }
                  onFieldChange('memoryFiles', [memoryFile])
                }
              }}
              onRemove={() => {
                // 清空 memoryFiles
                onFieldChange('memoryFiles', [])

                // ⚠️ 重要：清空 evidenceFiles，否則 reload 後舊檔案會回來
                onFieldChange('evidenceFiles', [])
              }}
              onFileClick={(file) => {
                // 點擊圖片放大
                if (file.preview) {
                  onImageClick(file.preview)
                }
              }}
              disabled={isReadOnly}
              readOnly={isReadOnly}
              primaryText="點擊或拖放設備銘牌照片/汽車行照"
              secondaryText="支援圖片或 PDF 格式，最大 10MB"
            />
          </div>
        </div>
      </div>

      {/* 保存按鈕 */}
      <div className="flex justify-center" style={{ marginTop: '46px' }}>
        <button
          onClick={onSave}
          disabled={isReadOnly}
          style={{
            width: '237px',
            height: '46.25px',
            flexShrink: 0,
            borderRadius: '7px',
            border: '1px solid rgba(0, 0, 0, 0.50)',
            background: isReadOnly ? '#9CA3AF' : '#000',
            boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
            cursor: isReadOnly ? 'not-allowed' : 'pointer',
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'var(--sds-typography-body-font-family)',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 'var(--sds-typography-body-font-weight-regular)',
            lineHeight: '100%'
          }}
        >
          {editingDeviceId ? '儲存變更' : '+ 新增設備'}
        </button>
      </div>
    </>
  )
}
