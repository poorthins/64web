import { Loader2 } from 'lucide-react'
import { EntryStatus } from './StatusSwitcher'

interface BottomActionBarProps {
  // 狀態管理（用於判斷是否鎖定）
  currentStatus: EntryStatus

  // 操作狀態
  submitting: boolean

  // 事件處理
  onSubmit: () => void
  onSave?: () => void
  onClear: () => void

  // 容器模式：true 時由父容器控制定位，false 時使用 fixed 定位（預設）
  containerMode?: boolean
}

/**
 * 統一的底部操作欄組件
 * 
 * TODO: 資料庫整合 API 接口
 * - getEntryStatus(pageKey: string, year: number): Promise<EntryStatusResponse>
 * - updateEntryStatus(entryId: string, status: EntryStatus): Promise<void>
 * - 實現 30 秒輪詢更新機制
 * - 添加錯誤處理和重試邏輯
 */
export default function BottomActionBar({
  currentStatus,
  submitting,
  onSubmit,
  onSave,
  onClear,
  containerMode = false
}: BottomActionBarProps) {

  // 權限判斷
  const isReadOnly = currentStatus === 'approved'
  const canEdit = !isReadOnly
  const canSubmit = !isReadOnly
  
  return (
    <div
      className={containerMode ? "flex justify-center" : "fixed bottom-0 left-0 z-40 flex justify-center"}
      style={{
        width: containerMode ? '1920px' : '100vw'
      }}
    >
      <div
        className="relative"
        style={{
          width: '1920px',
          height: '83px',
          flexShrink: 0,
          background: '#3996FE'
        }}
      >
            {/* 操作按鈕組 - 按照 Figma 精確定位 */}
            <div
              className="absolute flex items-center"
              style={{
                left: '1511px',
                top: '50%',
                transform: 'translateY(-50%)',
                gap: '13.71px'
              }}
            >
              {/* 儲存按鈕 - Figma 設計：白色背景 + 黑色文字 */}
              {canEdit && onSave && (
                <button
                  onClick={onSave}
                  disabled={submitting || !canEdit}
                  className="flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    width: '101.593px',
                    height: '49px',
                    background: submitting || !canEdit ? '#E3E3E3' : '#FFFFFF',
                    color: '#000000',
                    border: '1px solid #000000',
                    borderRadius: '8px'
                  }}
                >
                  <span>儲存</span>
                </button>
              )}

              {/* 清除按鈕 - 白色背景 + 黑色文字，disabled 時變灰 */}
              {canEdit && (
                <button
                  onClick={onClear}
                  disabled={submitting || !canEdit}
                  className="flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    width: '101.593px',
                    height: '49px',
                    background: submitting || !canEdit ? '#E3E3E3' : '#FFFFFF',
                    color: '#000000',
                    border: '1px solid #000000',
                    borderRadius: '8px'
                  }}
                >
                  <span>清除</span>
                </button>
              )}

              {/* 提交按鈕 - Figma 設計：黑色背景 + 白色文字 */}
              <button
                onClick={onSubmit}
                disabled={submitting || !canSubmit}
                className="flex items-center justify-center font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: '101.593px',
                  height: '49px',
                  background: submitting || !canSubmit ? '#666666' : '#000000',
                  color: '#FFFFFF',
                  border: '1px solid #000000',
                  borderRadius: '8px'
                }}
              >
                <span>提交</span>
              </button>
            </div>
      </div>
    </div>
  )
}