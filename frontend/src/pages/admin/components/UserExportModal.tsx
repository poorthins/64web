import React from 'react'
import { Package, FileText, Download } from 'lucide-react'

interface UserExportModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
  companyName: string
  isExporting?: boolean
  exportProgress?: { status: string; current?: number; total?: number } | null
}

const UserExportModal: React.FC<UserExportModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userName,
  companyName,
  isExporting = false,
  exportProgress = null
}) => {
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

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* 標題列 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Package className="h-6 w-6 mr-2 text-green-600" />
            下載用戶完整資料
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
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <span className="mr-2">👤</span>
              下載對象
            </h3>
            <div className="text-sm text-blue-800">
              <div className="font-semibold text-lg">{userName}</div>
              <div className="text-blue-600">{companyName}</div>
            </div>
          </div>

          {/* 下載內容說明 */}
          {!isExporting && !exportProgress && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Download className="h-4 w-4 mr-2 text-green-600" />
                  將下載的內容
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Excel 多工作表報表</div>
                      <p className="text-sm text-gray-600 mt-1">
                        包含所有能源類別的完整填報記錄（柴油、電費、天然氣等）
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Package className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">佐證資料檔案</div>
                      <p className="text-sm text-gray-600 mt-1">
                        所有上傳的佐證資料，檔名已自動重新命名（方便辨識）
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 匯出格式資訊 */}
              <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">檔案格式</span>
                  <span className="font-medium text-gray-900">ZIP 壓縮檔</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">檔名規則</span>
                  <span className="text-gray-900">{userName}_能源填報資料_[時間].zip</span>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-1 flex items-center">
                  <span className="mr-1">💡</span>
                  下載說明
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 下載可能需要幾分鐘，請耐心等候</li>
                  <li>• 如果佐證檔案過多，檔案大小可能較大</li>
                  <li>• 下載完成後，請解壓縮 ZIP 檔案查看內容</li>
                </ul>
              </div>
            </>
          )}

          {/* 進度顯示 */}
          {(isExporting || exportProgress) && (
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">{exportProgress?.status || '正在準備...'}</div>
              {exportProgress?.total !== undefined && exportProgress?.current !== undefined && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>{exportProgress.current} / {exportProgress.total}</span>
                    <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={handleClose}
            disabled={isExporting}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isExporting ? '下載中...' : '取消'}
          </button>
          {!isExporting && !exportProgress && (
            <button
              onClick={onConfirm}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center"
            >
              <Package className="h-4 w-4 mr-2" />
              確認下載 ZIP
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserExportModal