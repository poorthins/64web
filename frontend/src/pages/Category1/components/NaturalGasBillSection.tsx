/**
 * 天然氣-帳單管理區塊
 *
 * 功能：
 * - 顯示帳單卡片清單
 * - 選擇錶號
 * - 輸入計費期間（ROC 格式）
 * - 輸入計費度數
 * - 上傳帳單佐證
 * - 新增/刪除帳單
 */

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { NaturalGasBill, NaturalGasMeter } from '../../../types/naturalGasTypes'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import EvidenceUpload from '../../../components/EvidenceUpload'
import { designTokens } from '../../../utils/designTokens'

export interface NaturalGasBillSectionProps {
  /** 帳單清單 */
  bills: NaturalGasBill[]
  /** 錶號清單（用於下拉選單） */
  meters: NaturalGasMeter[]
  /** 新增帳單 */
  onAddBill: () => void
  /** 刪除帳單 */
  onDeleteBill: (billId: string) => void
  /** 更新帳單欄位 */
  onUpdateBill: (billId: string, field: keyof NaturalGasBill, value: any) => void
  /** 帳單暫存檔案（Record<billId, MemoryFile[]>） */
  billMemoryFiles: Record<string, MemoryFile[]>
  /** 更新帳單暫存檔案 */
  onBillMemoryFilesChange: (billId: string, files: MemoryFile[]) => void
  /** 頁面 key */
  pageKey: string
  /** 是否可編輯 */
  canEdit: boolean
}

const NaturalGasBillSection: React.FC<NaturalGasBillSectionProps> = ({
  bills,
  meters,
  onAddBill,
  onDeleteBill,
  onUpdateBill,
  billMemoryFiles,
  onBillMemoryFilesChange,
  pageKey,
  canEdit
}) => {
  /** 處理日期變更 */
  const handleDateChange = (billId: string, field: 'billingStart' | 'billingEnd', value: string) => {
    onUpdateBill(billId, field, value)
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
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xl font-semibold"
          style={{ color: designTokens.colors.textPrimary }}
        >
          使用紀錄 - 帳單資料
        </h2>

        {canEdit && (
          <button
            onClick={onAddBill}
            className="flex items-center gap-2 px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: '#C0FED9',
              color: '#000'
            }}
          >
            <Plus className="w-4 h-4" />
            新增下一筆資料
          </button>
        )}
      </div>

      {/* 帳單清單 */}
      {bills.length === 0 ? (
        <div
          className="text-center py-12 border-2 border-dashed rounded-lg"
          style={{
            borderColor: designTokens.colors.border,
            color: designTokens.colors.textSecondary
          }}
        >
          尚未新增任何帳單，請點選「新增下一筆資料」開始填寫
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill, index) => (
            <div
              key={bill.id}
              className="p-5 border rounded-lg"
              style={{
                borderColor: designTokens.colors.border,
                backgroundColor: designTokens.colors.background
              }}
            >
              {/* 帳單標題 + 刪除按鈕 */}
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-semibold"
                  style={{ color: designTokens.colors.textPrimary }}
                >
                  帳單 #{index + 1}
                </h3>
                {canEdit && (
                  <button
                    onClick={() => onDeleteBill(bill.id)}
                    className="p-2 rounded-md hover:bg-red-50 transition-colors"
                    style={{ color: designTokens.colors.error }}
                    title="刪除帳單"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 表單欄位 - 2 欄式排版 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* 選擇錶號 */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    選擇錶號
                  </label>
                  <select
                    value={bill.meterId || ''}
                    onChange={e => onUpdateBill(bill.id, 'meterId', e.target.value)}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      borderColor: designTokens.colors.border,
                      color: designTokens.colors.textPrimary,
                      backgroundColor: canEdit
                        ? designTokens.colors.cardBg
                        : designTokens.colors.background
                    }}
                  >
                    <option value="">請選擇錶號</option>
                    {meters.map(meter => (
                      <option key={meter.id} value={meter.id}>
                        {meter.meterNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 計費起日 */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    計費起日 (民國年)
                  </label>
                  <input
                    type="text"
                    value={bill.billingStart}
                    onChange={e => handleDateChange(bill.id, 'billingStart', e.target.value)}
                    placeholder="例: 113/01/01"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      borderColor: designTokens.colors.border,
                      color: designTokens.colors.textPrimary,
                      backgroundColor: canEdit
                        ? designTokens.colors.cardBg
                        : designTokens.colors.background
                    }}
                  />
                </div>

                {/* 計費訖日 */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    計費訖日 (民國年)
                  </label>
                  <input
                    type="text"
                    value={bill.billingEnd}
                    onChange={e => handleDateChange(bill.id, 'billingEnd', e.target.value)}
                    placeholder="例: 113/02/28"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      borderColor: designTokens.colors.border,
                      color: designTokens.colors.textPrimary,
                      backgroundColor: canEdit
                        ? designTokens.colors.cardBg
                        : designTokens.colors.background
                    }}
                  />
                </div>

                {/* 計費度數 */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: designTokens.colors.textSecondary }}
                  >
                    計費度數 (m³)
                  </label>
                  <input
                    type="number"
                    value={bill.billingUnits || ''}
                    onChange={e => onUpdateBill(bill.id, 'billingUnits', Number(e.target.value))}
                    placeholder="請輸入度數"
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      borderColor: designTokens.colors.border,
                      color: designTokens.colors.textPrimary,
                      backgroundColor: canEdit
                        ? designTokens.colors.cardBg
                        : designTokens.colors.background
                    }}
                  />
                </div>
              </div>

              {/* 帳單佐證上傳 */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: designTokens.colors.textSecondary }}
                >
                  帳單佐證
                </label>
                <EvidenceUpload
                  pageKey={pageKey}
                  files={bill.files}
                  onFilesChange={(files) => onUpdateBill(bill.id, 'files', files)}
                  memoryFiles={billMemoryFiles[bill.id] || []}
                  onMemoryFilesChange={(files) => onBillMemoryFilesChange(bill.id, files)}
                  maxFiles={3}
                  kind="usage_evidence"
                  mode="edit"
                  disabled={!canEdit}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NaturalGasBillSection
