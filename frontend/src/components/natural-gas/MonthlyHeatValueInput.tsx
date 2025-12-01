/**
 * MonthlyHeatValueInput - 月度低位熱值輸入區塊
 *
 * 包含月份選擇器（左）和低位熱值輸入框（右）
 */

interface MonthlyHeatValueInputProps {
  /** 當前選中月份 (1-12) */
  selectedMonth: number
  /** 月份改變事件 */
  onMonthChange: (month: number) => void
  /** 月份選擇器顯示狀態 */
  showMonthPicker: boolean
  /** 切換月份選擇器顯示 */
  onToggleMonthPicker: (show: boolean) => void
  /** 當月熱值 */
  heatValue: number
  /** 熱值改變事件 */
  onHeatValueChange: (value: number) => void
  /** 是否可編輯 */
  canEdit: boolean
  /** 是否已核准 */
  isApproved: boolean
}

export function MonthlyHeatValueInput({
  selectedMonth,
  onMonthChange,
  showMonthPicker,
  onToggleMonthPicker,
  heatValue,
  onHeatValueChange,
  canEdit,
  isApproved
}: MonthlyHeatValueInputProps) {
  const isDisabled = !canEdit || isApproved

  return (
    <div style={{ position: 'relative', height: '119px' }}>
      {/* 左邊：月份選擇器 */}
      <div style={{ position: 'absolute', left: '0', top: '0' }}>
        {/* 月份標題 */}
        <div
          style={{
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal'
          }}
        >
          月份
        </div>

        {/* 說明文字 */}
        <div
          style={{
            marginTop: '4px',
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '16px',
            fontStyle: 'normal',
            fontWeight: 300,
            lineHeight: 'normal'
          }}
        >
          *選擇熱值報表的月份
        </div>

        {/* 月份輸入框 + 月曆 icon */}
        <div style={{ marginTop: '9px', position: 'relative' }}>
          {/* 月份顯示輸入框（只讀） */}
          <input
            type="text"
            value={`${selectedMonth}月`}
            readOnly
            onClick={() => {
              if (canEdit && !isApproved) {
                onToggleMonthPicker(!showMonthPicker)
              }
            }}
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
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              outline: 'none'
            }}
          />

          {/* 月曆 icon - 在輸入框內右側 */}
          <div
            onClick={() => {
              if (canEdit && !isApproved) {
                onToggleMonthPicker(!showMonthPicker)
              }
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '27px',
              height: '22.762px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="27" height="23" viewBox="0 0 27 23" fill="none">
              <path d="M18 1.89673V5.69037M9 1.89673V5.69037M3.375 9.48401H23.625M5.625 3.79355H21.375C22.6176 3.79355 23.625 4.64278 23.625 5.69037V18.9681C23.625 20.0157 22.6176 20.8649 21.375 20.8649H5.625C4.38236 20.8649 3.375 20.0157 3.375 18.9681V5.69037C3.375 4.64278 4.38236 3.79355 5.625 3.79355Z" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* 月份選擇器彈窗 - 3x4 網格 */}
          {showMonthPicker && (
            <>
              {/* 點擊外部關閉 */}
              <div
                onClick={() => onToggleMonthPicker(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999
                }}
              />

              {/* 月份選擇器 */}
              <div
                style={{
                  position: 'absolute',
                  top: '62px',
                  left: '0',
                  width: '252px',
                  background: '#FFF',
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  borderRadius: '8px',
                  padding: '16px',
                  zIndex: 1000,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gridTemplateRows: 'repeat(4, 1fr)',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                  const isSelected = month === selectedMonth
                  return (
                    <button
                      key={month}
                      onClick={() => {
                        onMonthChange(month)
                        onToggleMonthPicker(false)
                      }}
                      style={{
                        padding: '12px 8px',
                        border: isSelected ? '2px solid #49A1C7' : '1px solid rgba(0, 0, 0, 0.25)',
                        background: isSelected ? '#E8F5FA' : '#FFF',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontFamily: 'Inter',
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#49A1C7' : '#000',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#F5F5F5'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = '#FFF'
                        }
                      }}
                    >
                      {month}月
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 右邊：低位熱值輸入 */}
      <div style={{ position: 'absolute', left: '266px', top: '0' }}>
        {/* 標題行：低位熱值 + 說明 */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span
            style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal'
            }}
          >
            低位熱值
          </span>
          <span
            style={{
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '16px',
              fontStyle: 'normal',
              fontWeight: 350,
              lineHeight: 'normal'
            }}
          >
            *低位熱值= 高位熱值 × 比例值
          </span>
        </div>

        {/* 說明文字 */}
        <div
          style={{
            marginTop: '4px',
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '16px',
            fontStyle: 'normal',
            fontWeight: 350,
            lineHeight: 'normal'
          }}
        >
          *比例值：煤類（固態）及油類（液態）95 %；氣態燃料 90 %
        </div>

        {/* 低位熱值輸入框 */}
        <input
          type="number"
          value={heatValue || ''}
          onChange={(e) => onHeatValueChange(Number(e.target.value))}
          onWheel={(e) => e.currentTarget.blur()}
          disabled={isDisabled}
          placeholder="請輸入低位熱值"
          className="rounded-[5px] custom-number-input"
          style={{
            marginTop: '9px',
            width: '638px',
            height: '52px',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            background: '#FFF',
            color: '#000',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            paddingLeft: '20px',
            paddingRight: '20px',
            outline: 'none'
          }}
        />
      </div>
    </div>
  )
}
