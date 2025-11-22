/**
 * WD40UsageInputFields - WD-40 使用數據輸入欄位組件
 *
 * 包含：
 * - 品項選單（每筆記錄上方）
 * - 購買日期 + 購買數量（使用 RecordInputRow 的樣式）
 * - 刪除按鈕
 * - 新增數據按鈕
 */

import { Trash2 } from 'lucide-react'
import { WD40Spec } from '../hooks/useWD40SpecManager'
import { CurrentEditingGroup } from '../common/mobileEnergyTypes'

interface WD40UsageInputFieldsProps {
  currentGroup: CurrentEditingGroup
  onUpdate: (id: string, field: 'date' | 'quantity', value: any) => void
  onUpdateSpecId: (id: string, specId: string) => void
  onDelete: (id: string) => void
  specs: WD40Spec[]
  isReadOnly: boolean
  iconColor: string
}

const STYLES = {
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

export function WD40UsageInputFields({
  currentGroup,
  onUpdate,
  onUpdateSpecId,
  onDelete,
  specs,
  isReadOnly,
  iconColor
}: WD40UsageInputFieldsProps) {
  return (
    <>
      {/* 表頭 - 藍色區域 */}
      <div className="flex items-center" style={{ backgroundColor: iconColor, height: '58px', paddingLeft: '43px', paddingRight: '16px' }}>
        <div style={{ width: '199px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-white text-[20px] font-medium">購買日期</span>
        </div>
        <div style={{ width: '27px' }}></div>
        <div style={{ width: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-white text-[20px] font-medium">品項</span>
        </div>
        <div style={{ width: '27px' }}></div>
        <div style={{ width: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="text-white text-[20px] font-medium">購買數量 (瓶)</span>
        </div>
        <div style={{ width: '48px' }}></div>
      </div>

      {/* 輸入行 - 白色區域 */}
      <div className="bg-white" style={{ minHeight: '250px', paddingLeft: '43px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {currentGroup.records.map((record) => (
            <div key={record.id} className="flex items-center" style={{ gap: '27px' }}>
              {/* 購買日期 */}
              <div className="relative" style={{ width: '199px' }}>
                <input
                  id={`date-input-${record.id}`}
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
                    const input = document.getElementById(`date-input-${record.id}`) as HTMLInputElement
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
                disabled={isReadOnly}
                className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  ...STYLES.field,
                  width: '190px',
                  cursor: isReadOnly ? 'not-allowed' : 'pointer'
                }}
              >
                <option value="">請選擇品項</option>
                {specs.map(spec => (
                  <option key={spec.id} value={spec.id}>{spec.name}</option>
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
                  // ⭐ 防止數字溢位
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
    </>
  )
}
