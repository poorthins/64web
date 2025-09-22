import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface RejectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (reason: string, categories: string[]) => void
  submissionTitle?: string
}

const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submissionTitle = '提交項目'
}) => {
  const [reason, setReason] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const problemCategories = [
    { id: 'data_error', label: '數據填寫錯誤' },
    { id: 'missing_docs', label: '缺少佐證文件' },
    { id: 'unit_error', label: '單位錯誤' },
    { id: 'calculation_error', label: '計算方式錯誤' },
    { id: 'other', label: '其他' }
  ]

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleSubmit = () => {
    if (!reason.trim()) {
      return
    }
    onSubmit(reason, selectedCategories)
    setReason('')
    setSelectedCategories([])
    onClose()
  }

  const handleClose = () => {
    setReason('')
    setSelectedCategories([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        {/* 標題欄 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center"
                 style={{ backgroundColor: 'var(--accent-red)', opacity: 0.1 }}>
              <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                退回原因
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {submissionTitle}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="btn-ghost p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="space-y-6">
          {/* 退回原因文字輸入 */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              請說明退回原因 <span style={{ color: 'var(--accent-red)' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請詳細說明退回的原因，以便使用者修正..."
              className="input-field resize-none"
              rows={4}
              required
            />
          </div>

          {/* 問題類型選擇 */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              問題類型
            </label>
            <div className="space-y-2">
              {problemCategories.map(category => (
                <label
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="w-4 h-4 rounded border-2 transition-colors"
                    style={{
                      borderColor: selectedCategories.includes(category.id)
                        ? 'var(--accent-blue)'
                        : 'var(--border-light)',
                      backgroundColor: selectedCategories.includes(category.id)
                        ? 'var(--accent-blue)'
                        : 'transparent'
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 按鈕區域 */}
        <div className="flex items-center justify-end gap-3 mt-8 pt-6"
             style={{ borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={handleClose}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="btn-danger"
          >
            確認退回
          </button>
        </div>
      </div>
    </div>
  )
}

export default RejectModal