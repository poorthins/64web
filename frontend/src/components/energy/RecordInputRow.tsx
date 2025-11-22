/**
 * RecordInputRow - 記錄輸入行元件
 *
 * 用途：能源頁面的單行輸入（日期 + 數量 + 刪除按鈕）
 * 適用於：所有需要日期和數量輸入的能源頁面
 */

import { Trash2 } from 'lucide-react'

export interface RecordInputRowProps {
  /** 記錄 ID（用於唯一識別） */
  recordId: string
  /** 日期值（YYYY-MM-DD 格式） */
  date: string
  /** 數量值 */
  quantity: number | string
  /** 更新回調 */
  onUpdate: (recordId: string, field: 'date' | 'quantity', value: string | number) => void
  /** 刪除回調 */
  onDelete: (recordId: string) => void
  /** 是否顯示刪除按鈕 */
  showDelete: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 數量輸入的 placeholder */
  quantityPlaceholder?: string
  /** 數量輸入的單位（顯示在 label 中，例如 "加油量 (L)"） */
  quantityLabel?: string
  /** 數量最大值（預設 999999999，防止資料庫溢位） */
  maxQuantity?: number
}

/**
 * RecordInputRow 元件
 *
 * @example
 * ```tsx
 * <RecordInputRow
 *   recordId="diesel_1"
 *   date="2025-01-15"
 *   quantity={100}
 *   onUpdate={(id, field, value) => console.log(id, field, value)}
 *   onDelete={(id) => console.log('Delete', id)}
 *   showDelete={true}
 *   disabled={false}
 *   quantityPlaceholder="100"
 * />
 * ```
 */
export function RecordInputRow({
  recordId,
  date,
  quantity,
  onUpdate,
  onDelete,
  showDelete,
  disabled = false,
  quantityPlaceholder = '',
  maxQuantity = 999999999, // 預設最大值 9億，符合資料庫 NUMERIC(18,6) 限制
}: RecordInputRowProps): JSX.Element {
  return (
    <div className="flex items-center" style={{ gap: '27px' }}>
      {/* 日期輸入框（帶右側日曆圖示） */}
      <div className="relative" style={{ width: '199px' }}>
        <input
          id={`date-input-${recordId}`}
          type="date"
          value={date}
          onChange={(e) => onUpdate(recordId, 'date', e.target.value)}
          disabled={disabled}
          className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
          style={{
            width: '199px',
            height: '52px',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            background: '#FFF',
            flexShrink: 0,
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            lineHeight: 'normal',
            paddingLeft: '20px',
            paddingRight: '48px',
            paddingTop: '0',
            paddingBottom: '0',
            colorScheme: 'light',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
        />
        {/* 日曆圖示（右側，可點擊） */}
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
          onClick={() => {
            const input = document.getElementById(`date-input-${recordId}`) as HTMLInputElement
            if (input && !input.disabled) {
              input.showPicker?.()
            }
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="27" height="23" viewBox="0 0 27 23" fill="none">
            <path
              d="M18 1.89673V5.69037M9 1.89673V5.69037M3.375 9.48401H23.625M5.625 3.79355H21.375C22.6176 3.79355 23.625 4.64278 23.625 5.69037V18.9681C23.625 20.0157 22.6176 20.8649 21.375 20.8649H5.625C4.38236 20.8649 3.375 20.0157 3.375 18.9681V5.69037C3.375 4.64278 4.38236 3.79355 5.625 3.79355Z"
              stroke="#1E1E1E"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* 數量輸入框 */}
      <input
        type="number"
        min="0"
        max={maxQuantity}
        step="0.01"
        value={quantity || ''}
        onChange={(e) => {
          const inputValue = parseFloat(e.target.value) || 0
          // ⭐ 防止數字溢位：限制在最大值內
          const clampedValue = Math.min(inputValue, maxQuantity)
          onUpdate(recordId, 'quantity', clampedValue)
        }}
        onWheel={(e) => e.currentTarget.blur()}
        disabled={disabled}
        placeholder={quantityPlaceholder}
        className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{
          width: '230px',
          height: '52px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          flexShrink: 0,
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontWeight: 400,
          lineHeight: 'normal',
          paddingLeft: '20px',
          paddingRight: '20px',
          paddingTop: '0',
          paddingBottom: '0',
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
        }}
      />

      {/* 刪除按鈕 */}
      {showDelete ? (
        <button
          onClick={() => onDelete(recordId)}
          disabled={disabled}
          className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="刪除此記錄"
        >
          <Trash2 style={{ width: '32px', height: '32px' }} />
        </button>
      ) : (
        // 佔位空間（維持對齊）
        <div style={{ width: '48px' }} />
      )}
    </div>
  )
}

export default RecordInputRow