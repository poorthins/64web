/**
 * 天然氣-低位熱值設定區塊
 *
 * 功能：
 * - 輸入低位熱值（kcal/m³）
 * - 上傳熱值報表佐證
 * - 顯示已上傳檔案清單
 */

import React from 'react'
import { HeatValue } from '../../../types/naturalGasTypes'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import EvidenceUpload from '../../../components/EvidenceUpload'
import { designTokens } from '../../../utils/designTokens'

export interface HeatValueSectionProps {
  /** 低位熱值 */
  heatValue: number
  /** 更新熱值 */
  onHeatValueChange: (value: number) => void
  /** 已上傳檔案 */
  files: EvidenceFile[]
  /** 檔案變更 */
  onFilesChange: (files: EvidenceFile[]) => void
  /** 暫存檔案 */
  memoryFiles: MemoryFile[]
  /** 暫存檔案變更 */
  onMemoryFilesChange: (files: MemoryFile[]) => void
  /** 頁面 key */
  pageKey: string
  /** 是否可編輯 */
  canEdit: boolean
}

const HeatValueSection: React.FC<HeatValueSectionProps> = ({
  heatValue,
  onHeatValueChange,
  files,
  onFilesChange,
  memoryFiles,
  onMemoryFilesChange,
  pageKey,
  canEdit
}) => {
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
        低位熱值設定
      </h2>

      {/* 熱值輸入 */}
      <div className="mb-6">
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: designTokens.colors.textSecondary }}
        >
          低位熱值 (kcal/m³)
        </label>
        <input
          type="number"
          value={heatValue || ''}
          onChange={e => onHeatValueChange(Number(e.target.value))}
          placeholder="請輸入低位熱值（8,000 - 12,000）"
          disabled={!canEdit}
          className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2"
          style={{
            borderColor: designTokens.colors.border,
            color: designTokens.colors.textPrimary,
            backgroundColor: canEdit
              ? designTokens.colors.cardBg
              : designTokens.colors.background
          }}
        />
        <p
          className="text-xs mt-1"
          style={{ color: designTokens.colors.textSecondary }}
        >
          建議範圍：8,000 - 12,000 kcal/m³
        </p>
      </div>

      {/* 佐證上傳 */}
      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: designTokens.colors.textSecondary }}
        >
          熱值報表佐證
        </label>
        <EvidenceUpload
          pageKey={pageKey}
          files={files}
          onFilesChange={onFilesChange}
          memoryFiles={memoryFiles}
          onMemoryFilesChange={onMemoryFilesChange}
          maxFiles={3}
          kind="annual_evidence"
          mode="edit"
          disabled={!canEdit}
        />
      </div>
    </div>
  )
}

export default HeatValueSection
