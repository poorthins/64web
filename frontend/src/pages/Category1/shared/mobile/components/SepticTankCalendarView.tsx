/**
 * SepticTankCalendarView - 化糞池頁面月曆檢視
 *
 * 顯示 12 個月份的資料，6x2 網格佈局
 * 點擊月份時載入整個群組到編輯區
 */

import { Pencil } from 'lucide-react'
import type { SepticTankRecord } from './SepticTankUsageSection'

export interface SepticTankCalendarViewProps {
  savedGroups: SepticTankRecord[]
  iconColor: string
  onEditMonth: (month: number) => void
  isReadOnly: boolean
  approvalStatus: { isApproved: boolean }
}

const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

// 4 種狀態顏色
const COLOR_COMPLETE = '#B1CAFF'      // 資料完整（有數據 + 有佐證）
const COLOR_NO_FILES = '#FFE5CC'      // 缺少佐證資料（有數據但沒佐證）
const COLOR_NO_DATA = '#FFCCCC'       // 缺少數據（有佐證但沒數據）
const COLOR_EMPTY = '#FFFFFF'         // 未填寫（什麼都沒有）

export function SepticTankCalendarView(props: SepticTankCalendarViewProps) {
  const { savedGroups, onEditMonth, isReadOnly, approvalStatus } = props

  // 建立月份到群組的映射 (每個月只會出現一次)
  const monthDataMap = new Map<number, {
    hours: number
    groupId: string | null | undefined
    hasFiles: boolean
  }>()

  for (const record of savedGroups) {
    if (record.month >= 1 && record.month <= 12) {
      const hasFiles = (record.evidenceFiles && record.evidenceFiles.length > 0) ||
                       (record.memoryFiles && record.memoryFiles.length > 0)

      const existing = monthDataMap.get(record.month)
      if (existing) {
        // 理論上不應該發生，但如果有重複就加總
        existing.hours += record.hours
        existing.hasFiles = existing.hasFiles || hasFiles
      } else {
        monthDataMap.set(record.month, {
          hours: record.hours,
          groupId: record.groupId,
          hasFiles
        })
      }
    }
  }

  const handleEditClick = (month: number) => {
    if (isReadOnly || approvalStatus.isApproved) return
    onEditMonth(month)
  }

  return (
    <div style={{ marginTop: '34px', marginBottom: '32px' }}>
      {/* 整個月曆區域 - 包含顏色說明和網格，一起置中 */}
      <div className="flex justify-center">
        <div>
          {/* 顏色說明區 - 在月份框框往上28px處，靠左對齊月曆 */}
          <div className="flex items-center gap-4" style={{ marginBottom: '30px' }}>
            {/* 資料完整 */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  flexShrink: 0,
                  borderRadius: '3px',
                  border: '1px solid #000',
                  background: COLOR_COMPLETE
                }}
              />
              <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
                資料完整
              </span>
            </div>

            {/* 缺少佐證資料 */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  flexShrink: 0,
                  borderRadius: '3px',
                  border: '1px solid #000',
                  background: COLOR_NO_FILES
                }}
              />
              <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
                缺少佐證資料
              </span>
            </div>

            {/* 缺少數據 */}
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '17px',
                  height: '17px',
                  flexShrink: 0,
                  borderRadius: '3px',
                  border: '1px solid #000',
                  background: COLOR_NO_DATA
                }}
              />
              <span style={{ fontSize: '14px', lineHeight: '17px', display: 'flex', alignItems: 'center' }}>
                缺少數據
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
                  background: COLOR_EMPTY
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
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
            const monthData = monthDataMap.get(month)
            const hasData = monthData && monthData.hours > 0
            const hasFiles = monthData && monthData.hasFiles
            const isDisabled = isReadOnly || approvalStatus.isApproved

            // 判斷 4 種狀態的背景顏色
            let backgroundColor = COLOR_EMPTY  // 未填寫
            if (hasData && hasFiles) {
              backgroundColor = COLOR_COMPLETE  // 資料完整
            } else if (hasData && !hasFiles) {
              backgroundColor = COLOR_NO_FILES  // 缺少佐證資料
            } else if (!hasData && hasFiles) {
              backgroundColor = COLOR_NO_DATA   // 缺少數據（罕見情況）
            }

            // 只要有數據就顯示內容
            const shouldShowContent = hasData

            return (
              <div
                key={month}
                className="relative border flex flex-col overflow-hidden transition-colors"
                style={{
                  width: '175px',
                  height: '161px',
                  borderColor: '#000',
                  opacity: isDisabled && !shouldShowContent ? 0.6 : 1
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
                  {shouldShowContent && (
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
                        {monthData!.hours}
                      </div>
                      <div
                        style={{
                          color: '#000',
                          textAlign: 'center',
                          fontFamily: 'Inter',
                          fontSize: '20px',
                          fontStyle: 'normal',
                          fontWeight: 500,
                          lineHeight: 'normal'
                        }}
                      >
                        hr
                      </div>

                      {/* 編輯按鈕 (右下角，只要有數據就顯示) */}
                      {!isDisabled && (
                        <button
                          onClick={() => handleEditClick(month)}
                          className="absolute bottom-2.5 right-2.5 hover:opacity-80 transition-opacity"
                          title="編輯此群組"
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
      </div>
    </div>
  )
}
