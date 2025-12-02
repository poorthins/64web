/**
 * NaturalGasBillInputFields - 天然氣帳單輸入欄位組件
 *
 * 用於 Type 2 架構的「使用數據」編輯卡右側表單（單筆編輯模式）
 */

import { useRef } from 'react'
import { BillEditingGroup, NaturalGasBillRecord, NaturalGasMeter } from '../../../types/naturalGasTypes'
import { rocToISO, isoToROC } from '../../../utils/bill/dateCalculations'

interface NaturalGasBillInputFieldsProps {
  /** 當前編輯群組 */
  currentGroup: BillEditingGroup
  /** 更新帳單欄位 */
  onUpdate: (id: string, field: keyof NaturalGasBillRecord, value: any) => void
  /** 刪除帳單 */
  onDelete: (id: string) => void
  /** 錶號清單 */
  meters: NaturalGasMeter[]
  /** 是否唯讀 */
  isReadOnly: boolean
}

// 月曆 Icon
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="27" height="23" viewBox="0 0 27 23" fill="none">
    <path d="M18 1.89697V5.69061M9 1.89697V5.69061M3.375 9.48425H23.625M5.625 3.79379H21.375C22.6176 3.79379 23.625 4.64303 23.625 5.69061V18.9684C23.625 20.0159 22.6176 20.8652 21.375 20.8652H5.625C4.38236 20.8652 3.375 20.0159 3.375 18.9684V5.69061C3.375 4.64303 4.38236 3.79379 5.625 3.79379Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export function NaturalGasBillInputFields({
  currentGroup,
  onUpdate,
  meters,
  isReadOnly
}: NaturalGasBillInputFieldsProps) {
  // 單筆模式：只顯示第一筆記錄
  const bill = currentGroup.records[0]
  if (!bill) return null

  // 日期輸入框的 ref
  const billingStartRef = useRef<HTMLInputElement>(null)
  const billingEndRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* 隱藏原生日期選擇器 icon 和數字輸入框箭頭 */}
      <style>
        {`
          .custom-date-input::-webkit-calendar-picker-indicator {
            display: none;
          }
          .custom-date-input::-webkit-inner-spin-button,
          .custom-date-input::-webkit-clear-button {
            display: none;
          }
          .custom-number-input::-webkit-inner-spin-button,
          .custom-number-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .custom-number-input[type=number] {
            -moz-appearance: textfield;
          }
        `}
      </style>
      <div style={{ position: 'relative', width: '464px', minHeight: '450px' }}>
      {/* 表號標籤 - 距離框框頂部 27px */}
      <label style={{
        position: 'absolute',
        top: '0',
        left: '0',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        表號 *
      </label>

      {/* 表號下拉選單 - 對齊上傳框頂部 */}
      <select
        value={bill.meterId || ''}
        onChange={(e) => onUpdate(bill.id, 'meterId', e.target.value)}
        disabled={isReadOnly}
        style={{
          position: 'absolute',
          top: '41px',
          left: '0',
          width: '464px',
          height: '52px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          borderRadius: '8px',
          padding: '0 16px',
          fontFamily: 'Inter',
          fontSize: '16px',
          color: '#000',
          cursor: isReadOnly ? 'not-allowed' : 'pointer',
          outline: 'none'
        }}
      >
        <option value="">請選擇表號</option>
        {meters.map(meter => (
          <option key={meter.id} value={meter.id}>
            {meter.meterNumber}
          </option>
        ))}
      </select>

      {/* 計費期間標題 */}
      <label style={{
        position: 'absolute',
        top: '141px',
        left: '0',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        計費期間
      </label>

      {/* 日期輸入框 */}
      <div style={{ position: 'absolute', top: '182px', left: '0', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* 計費起日 */}
        <div>
          <div style={{ position: 'relative' }}>
            <input
              ref={billingStartRef}
              type="date"
              value={rocToISO(bill.billingStart || '')}
              onChange={(e) => onUpdate(bill.id, 'billingStart', isoToROC(e.target.value))}
              disabled={isReadOnly}
              className="custom-date-input"
              style={{
                width: '213px',
                height: '52px',
                border: '1px solid rgba(0, 0, 0, 0.25)',
                background: '#FFF',
                borderRadius: '8px',
                padding: '0 45px 0 16px',
                fontFamily: 'Inter',
                fontSize: '16px',
                color: '#000',
                outline: 'none'
              }}
            />
            {/* 月曆 icon */}
            <div
              onClick={() => !isReadOnly && billingStartRef.current?.showPicker?.()}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CalendarIcon />
            </div>
          </div>
          {/* 說明文字 */}
          <div style={{
            marginTop: '4px',
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 'normal'
          }}>
            *起: 抄表日期後一天
          </div>
        </div>

        {/* 波浪號 ~ */}
        <div style={{
          color: '#000',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontWeight: 400,
          lineHeight: 'normal',
          paddingTop: '12px'
        }}>
          ~
        </div>

        {/* 計費訖日 */}
        <div>
          <div style={{ position: 'relative' }}>
            <input
              ref={billingEndRef}
              type="date"
              value={rocToISO(bill.billingEnd || '')}
              onChange={(e) => onUpdate(bill.id, 'billingEnd', isoToROC(e.target.value))}
              disabled={isReadOnly}
              className="custom-date-input"
              style={{
                width: '213px',
                height: '52px',
                border: '1px solid rgba(0, 0, 0, 0.25)',
                background: '#FFF',
                borderRadius: '8px',
                padding: '0 45px 0 16px',
                fontFamily: 'Inter',
                fontSize: '16px',
                color: '#000',
                outline: 'none'
              }}
            />
            {/* 月曆 icon */}
            <div
              onClick={() => !isReadOnly && billingEndRef.current?.showPicker?.()}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                cursor: isReadOnly ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CalendarIcon />
            </div>
          </div>
          {/* 說明文字 */}
          <div style={{
            marginTop: '4px',
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '16px',
            fontWeight: 400,
            lineHeight: 'normal'
          }}>
            *訖: 抄表日期
          </div>
        </div>
      </div>

      {/* 計費度數標題 */}
      <label style={{
        position: 'absolute',
        top: '314px',
        left: '0',
        color: '#000',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontWeight: 400,
        lineHeight: 'normal'
      }}>
        計費度數
      </label>

      {/* 計費度數輸入框 */}
      <input
        type="number"
        value={bill.billingUnits || ''}
        onChange={(e) => onUpdate(bill.id, 'billingUnits', Number(e.target.value))}
        disabled={isReadOnly}
        placeholder="請輸入度數"
        className="custom-number-input"
        style={{
          position: 'absolute',
          top: '355px',
          left: '0',
          width: '464px',
          height: '52px',
          border: '1px solid rgba(0, 0, 0, 0.25)',
          background: '#FFF',
          borderRadius: '8px',
          padding: '0 16px',
          fontFamily: 'Inter',
          fontSize: '16px',
          color: '#000',
          outline: 'none'
        }}
      />
      </div>
    </>
  )
}
