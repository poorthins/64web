/**
 * 天然氣-錶號管理區塊
 *
 * 功能：
 * - 新增錶號
 * - 顯示錶號清單
 * - 刪除錶號（檢查是否被帳單使用）
 */

import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { NaturalGasMeter } from '../../../types/naturalGasTypes'
import { designTokens } from '../../../utils/designTokens'

export interface NaturalGasMeterSectionProps {
  /** 錶號清單 */
  meters: NaturalGasMeter[]
  /** 新增錶號 */
  onAddMeter: (meterNumber: string) => void
  /** 刪除錶號 */
  onDeleteMeter: (meterId: string) => void
  /** 是否可編輯 */
  canEdit: boolean
}

const NaturalGasMeterSection: React.FC<NaturalGasMeterSectionProps> = ({
  meters,
  onAddMeter,
  onDeleteMeter,
  canEdit
}) => {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    onAddMeter(trimmed)
    setInputValue('')
  }

  return (
    <div
      className="p-6 rounded-lg shadow-sm border"
      style={{
        backgroundColor: designTokens.colors.cardBg,
        borderColor: designTokens.colors.border
      }}
    >
      {/* 標題 */}
      <h2
        className="text-xl font-semibold mb-4"
        style={{ color: designTokens.colors.textPrimary }}
      >
        規格設定 - 錶號清單
      </h2>

      {/* 新增錶號輸入框 */}
      {canEdit && (
        <div className="mb-4 flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="請輸入錶號名稱"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2"
            style={{
              borderColor: designTokens.colors.border,
              color: designTokens.colors.textPrimary
            }}
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#C0FED9',
              color: '#000'
            }}
          >
            <Plus className="w-4 h-4" />
            新增錶號
          </button>
        </div>
      )}

      {/* 錶號清單 */}
      {meters.length === 0 ? (
        <div
          className="text-center py-8 border-2 border-dashed rounded-lg"
          style={{
            borderColor: designTokens.colors.border,
            color: designTokens.colors.textSecondary
          }}
        >
          尚未新增任何錶號
        </div>
      ) : (
        <div className="space-y-2">
          {meters.map(meter => (
            <div
              key={meter.id}
              className="flex items-center justify-between p-3 border rounded-md"
              style={{
                borderColor: designTokens.colors.border,
                backgroundColor: designTokens.colors.background
              }}
            >
              <span
                className="font-medium"
                style={{ color: designTokens.colors.textPrimary }}
              >
                {meter.meterNumber}
              </span>

              {canEdit && (
                <button
                  onClick={() => onDeleteMeter(meter.id)}
                  className="p-2 rounded-md hover:bg-red-50 transition-colors"
                  style={{ color: designTokens.colors.error }}
                  title="刪除錶號"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {meters.length > 0 && (
        <p
          className="text-xs mt-3"
          style={{ color: designTokens.colors.textSecondary }}
        >
          共 {meters.length} 個錶號
        </p>
      )}
    </div>
  )
}

export default NaturalGasMeterSection
