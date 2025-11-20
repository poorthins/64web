/**
 * ActionButtons - 編輯/刪除操作按鈕元件
 *
 * 用途：統一所有能源頁面的編輯和刪除按鈕樣式
 * 消除重複程式碼，確保一致性
 */

import { Pencil, Trash2 } from 'lucide-react'

export interface ActionButtonsProps {
  /** 編輯回調 */
  onEdit: () => void
  /** 刪除回調 */
  onDelete: () => void
  /** 是否禁用 */
  disabled?: boolean
  /** 編輯按鈕標題（hover 提示） */
  editTitle?: string
  /** 刪除按鈕標題（hover 提示） */
  deleteTitle?: string
  /** 右側邊距（預設 '20px'） */
  marginRight?: string
}

/**
 * ActionButtons 元件
 *
 * @example
 * ```tsx
 * <ActionButtons
 *   onEdit={() => handleEdit(id)}
 *   onDelete={() => handleDelete(id)}
 *   disabled={isReadOnly}
 *   editTitle="編輯群組"
 *   deleteTitle="刪除群組"
 * />
 * ```
 */
export function ActionButtons({
  onEdit,
  onDelete,
  disabled = false,
  editTitle = '編輯',
  deleteTitle = '刪除',
  marginRight = '20px'
}: ActionButtonsProps): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginRight }}>
      {/* 編輯按鈕 */}
      <button
        onClick={onEdit}
        disabled={disabled}
        className="p-2 text-black hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={editTitle}
      >
        <Pencil style={{ width: '32px', height: '32px' }} />
      </button>

      {/* 刪除按鈕 */}
      <button
        onClick={onDelete}
        disabled={disabled}
        className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={deleteTitle}
      >
        <Trash2 style={{ width: '32px', height: '32px' }} />
      </button>
    </div>
  )
}

export default ActionButtons
