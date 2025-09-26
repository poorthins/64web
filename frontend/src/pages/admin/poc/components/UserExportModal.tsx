import React, { useState } from 'react'

export interface ExportOptions {
  basicInfo: boolean
  submittedRecords: boolean
  rejectedRecords: boolean
  includeRejectReasons: boolean
  includeFileList: boolean
}

interface UserExportModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: ExportOptions) => void
  userName: string
  companyName: string
  isExporting?: boolean
}

const UserExportModal: React.FC<UserExportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  companyName,
  isExporting = false
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    basicInfo: true,
    submittedRecords: true,
    rejectedRecords: false,
    includeRejectReasons: false,
    includeFileList: true
  })

  const handleOptionChange = (option: keyof ExportOptions, checked: boolean) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: checked
    }))
  }

  const handleConfirm = () => {
    onConfirm(exportOptions)
  }

  const handleClose = () => {
    if (!isExporting) {
      onClose()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isExporting) {
      handleClose()
    }
  }

  if (!isOpen) return null

  const optionItems = [
    {
      key: 'basicInfo' as keyof ExportOptions,
      label: '基本資料',
      description: '姓名、公司、聯絡資訊、權限類別',
      icon: '👤',
      recommended: true
    },
    {
      key: 'submittedRecords' as keyof ExportOptions,
      label: '已提交的填報記錄',
      description: '已完成提交等待審核的填報資料',
      icon: '📄',
      recommended: true
    },
    {
      key: 'rejectedRecords' as keyof ExportOptions,
      label: '已退回的記錄',
      description: '審核未通過的填報資料',
      icon: '❌',
      recommended: false
    },
    {
      key: 'includeRejectReasons' as keyof ExportOptions,
      label: '包含退回原因',
      description: '審核未通過時的詳細退回原因',
      icon: '📝',
      recommended: false
    },
    {
      key: 'includeFileList' as keyof ExportOptions,
      label: '包含檔案清單',
      description: '所有上傳檔案的名稱和資訊',
      icon: '📎',
      recommended: true
    }
  ]

  const selectedCount = Object.values(exportOptions).filter(Boolean).length

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <span className="mr-2">📊</span>
            匯出用戶資料
          </h2>
          {!isExporting && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          )}
        </div>

        {/* 內容區域 */}
        <div className="p-6">
          {/* 用戶資訊 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">匯出對象</h3>
            <div className="text-sm text-blue-800">
              <div className="font-medium">{userName}</div>
              <div className="text-blue-600">{companyName}</div>
            </div>
          </div>

          {/* 匯出選項 */}
          <div className="space-y-3 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              選擇要匯出的資料類型 ({selectedCount} 項已選擇)
            </h3>

            {optionItems.map((item) => (
              <label
                key={item.key}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  exportOptions[item.key]
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={exportOptions[item.key]}
                  onChange={(e) => handleOptionChange(item.key, e.target.checked)}
                  disabled={isExporting}
                  className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium text-gray-900">{item.label}</span>
                    {item.recommended && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        建議
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* 匯出格式資訊 */}
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">匯出格式</span>
              <span className="font-medium text-gray-900 flex items-center">
                <span className="mr-1">📊</span>
                Excel (.xlsx)
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-gray-600">檔案結構</span>
              <span className="text-gray-900">多工作表</span>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-1 flex items-center">
              <span className="mr-1">💡</span>
              POC 版本說明
            </h4>
            <p className="text-sm text-yellow-700">
              此為概念驗證版本，點擊「確認匯出」將在控制台顯示匯出資訊，
              正式版本將生成實際的 Excel 檔案。
            </p>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isExporting || selectedCount === 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                匯出中...
              </>
            ) : (
              <>
                <span className="mr-2">📊</span>
                確認匯出 ({selectedCount} 項)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserExportModal