/**
 * MonthlyHeatValueGrid - 月度低位熱值進度表格
 *
 * 顯示 12 個月的低位熱值填寫狀態（6x2 網格）
 */

import { Pencil } from 'lucide-react'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'

interface MonthlyHeatValueGridProps {
  /** 各月熱值 */
  monthlyHeatValues: Record<number, number>
  /** 各月已上傳檔案 */
  monthlyHeatValueFiles: Record<number, EvidenceFile[]>
  /** 各月暫存檔案 */
  monthlyHeatValueMemoryFiles: Record<number, MemoryFile[]>
  /** 是否可編輯 */
  canEdit: boolean
  /** 是否已核准 */
  isApproved: boolean
  /** 編輯月份回調 */
  onEdit?: (month: number) => void
}

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

export function MonthlyHeatValueGrid({
  monthlyHeatValues,
  monthlyHeatValueFiles,
  monthlyHeatValueMemoryFiles,
  canEdit,
  isApproved,
  onEdit
}: MonthlyHeatValueGridProps) {
  return (
    <div className="mb-6">
      {/* 圖例 */}
      <div className="flex items-center gap-4" style={{ marginBottom: '30px' }}>
        {/* 數值、佐證皆有 */}
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '17px',
              height: '17px',
              flexShrink: 0,
              borderRadius: '3px',
              border: '1px solid #000',
              background: '#A0DCF5'
            }}
          />
          <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
            數值、佐證皆有 (100%)
          </span>
        </div>

        {/* 資料不完整 */}
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '17px',
              height: '17px',
              flexShrink: 0,
              borderRadius: '3px',
              border: '1px solid #000',
              background: '#C0FED9'
            }}
          />
          <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
            資料不完整 (50%)
          </span>
        </div>

        {/* 未填寫 */}
        <div className="flex items-center gap-2">
          <div
            style={{
              width: '17px',
              height: '17px',
              flexShrink: 0,
              borderRadius: '3px',
              border: '1px solid #000',
              background: '#FFFFFF'
            }}
          />
          <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
            未填寫
          </span>
        </div>
      </div>

      {/* 12 個月份網格 (6x2) */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(6, 175px)',
          gridTemplateRows: 'repeat(2, 161px)'
        }}
      >
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1
          const hasHeatValue = (monthlyHeatValues[month] || 0) > 0
          const hasFiles = (monthlyHeatValueFiles[month]?.length || 0) > 0 ||
                          (monthlyHeatValueMemoryFiles[month]?.length || 0) > 0

          // 判斷3種狀態的背景顏色
          let backgroundColor = '#FFFFFF'  // 未填寫
          if (hasHeatValue && hasFiles) {
            backgroundColor = '#A0DCF5'    // 數值、佐證皆有
          } else if (hasHeatValue || hasFiles) {
            backgroundColor = '#C0FED9'    // 資料不完整
          }

          return (
            <div
              key={month}
              className="relative border flex flex-col overflow-hidden transition-colors"
              style={{
                width: '175px',
                height: '161px',
                borderColor: '#000'
              }}
            >
              {/* 月份名稱區域 - 永遠白色背景 */}
              <div
                style={{
                  display: 'flex',
                  width: '175px',
                  height: '39.787px',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  flexShrink: 0,
                  backgroundColor: '#FFFFFF',
                  color: '#000',
                  textAlign: 'center',
                  fontFamily: 'Inter',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 500,
                  lineHeight: 'normal'
                }}
              >
                {MONTH_NAMES[month - 1]}
              </div>

              {/* 分隔線 - 完全橫跨格子寬度 */}
              <div
                style={{
                  width: '100%',
                  height: '2px',
                  backgroundColor: '#000'
                }}
              />

              {/* 數據區域 - 根據狀態顯示不同背景顏色 */}
              <div
                className="flex-1 flex flex-col items-center justify-center relative"
                style={{
                  backgroundColor,
                  padding: '16px 12px'
                }}
              >
                {/* 內容顯示：只有有數據時才顯示 */}
                {(hasHeatValue || hasFiles) && (
                  <>
                    <div
                      style={{
                        color: '#000',
                        textAlign: 'center',
                        fontFamily: 'Inter',
                        fontSize: '24px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: 'normal'
                      }}
                    >
                      {hasHeatValue ? monthlyHeatValues[month] : '-'}
                    </div>
                    <div
                      style={{
                        color: '#000',
                        textAlign: 'center',
                        fontFamily: 'Inter',
                        fontSize: '16px',
                        fontStyle: 'normal',
                        fontWeight: 500,
                        lineHeight: 'normal',
                        marginTop: '4px'
                      }}
                    >
                      kcal/m³
                    </div>

                    {/* 查看/編輯按鈕：審核通過後也保留鉛筆，可以查看 */}
                    {(canEdit || isApproved) && (
                      <button
                        onClick={() => onEdit?.(month)}
                        className="absolute bottom-2.5 right-2.5 hover:opacity-80 transition-opacity"
                        title={isApproved ? "查看低位熱值" : "編輯低位熱值"}
                      >
                        <Pencil size={24} strokeWidth={2} color="#1E1E1E" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
