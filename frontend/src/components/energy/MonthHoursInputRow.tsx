/**
 * MonthHoursInputRow - 月份工時輸入行元件
 *
 * 用途：化糞池頁面的單行輸入（月份選擇 + 工時 + 刪除按鈕）
 * 類似 RecordInputRow 但用於月份和工時輸入
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2 } from 'lucide-react'

export interface MonthHoursInputRowProps {
  /** 記錄 ID（用於唯一識別） */
  recordId: string
  /** 月份值（1-12） */
  month: number
  /** 工時值 */
  hours: number | string
  /** 更新回調 */
  onUpdate: (recordId: string, field: 'month' | 'hours', value: number) => void
  /** 刪除回調 */
  onDelete: (recordId: string) => void
  /** 是否顯示刪除按鈕 */
  showDelete: boolean
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * MonthHoursInputRow 元件
 *
 * @example
 * ```tsx
 * <MonthHoursInputRow
 *   recordId="septic_1"
 *   month={3}
 *   hours={120}
 *   onUpdate={(id, field, value) => console.log(id, field, value)}
 *   onDelete={(id) => console.log('Delete', id)}
 *   showDelete={true}
 *   disabled={false}
 * />
 * ```
 */
export function MonthHoursInputRow({
  recordId,
  month,
  hours,
  onUpdate,
  onDelete,
  showDelete,
  disabled = false,
}: MonthHoursInputRowProps): JSX.Element {
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 })

  // 計算月份選擇器的位置
  useEffect(() => {
    if (showMonthPicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPickerPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
  }, [showMonthPicker])

  return (
    <>
      <div className="flex items-center" style={{ gap: '27px' }}>
        {/* 月份選擇按鈕 */}
        <div className="relative" style={{ width: '199px' }}>
          <button
            ref={buttonRef}
            onClick={() => !disabled && setShowMonthPicker(!showMonthPicker)}
            disabled={disabled}
            className="rounded-[5px] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {month}月
          </button>

          {/* 日曆圖示（右側） */}
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ pointerEvents: 'none' }}
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

        {/* 工時輸入框 */}
        <input
          type="number"
          min="0"
          step="0.1"
          value={hours || ''}
          onChange={(e) => onUpdate(recordId, 'hours', parseFloat(e.target.value) || 0)}
          onWheel={(e) => e.currentTarget.blur()}
          disabled={disabled}
          placeholder="0"
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
            className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="刪除此記錄"
          >
            <Trash2 style={{ width: '32px', height: '32px' }} />
          </button>
        ) : (
          // 佔位空間（維持對齊）
          <div style={{ width: '48px' }} />
        )}
      </div>

      {/* 月份選擇器 - 使用 Portal 渲染到 body，避免被父容器裁切 */}
      {showMonthPicker && !disabled && createPortal(
        <>
          {/* Backdrop - 點擊外部關閉 */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 9998 }}
            onClick={() => setShowMonthPicker(false)}
          />

          {/* 月份選擇器 */}
          <div
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3"
            style={{
              top: `${pickerPosition.top}px`,
              left: `${pickerPosition.left}px`,
              width: '220px',
              zIndex: 9999
            }}
          >
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <button
                  key={m}
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate(recordId, 'month', m)
                    setShowMonthPicker(false)
                  }}
                  className={`
                    py-2 px-3 rounded text-center font-medium transition-colors
                    ${month === m
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

export default MonthHoursInputRow