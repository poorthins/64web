import { AlertCircle } from 'lucide-react'

interface RejectionReasonDisplayProps {
  status: string
  reason?: string | null
  className?: string
}

/**
 * 拒絕原因顯示元件
 * 當狀態為 rejected 時，顯示管理員的拒絕原因
 */
export function RejectionReasonDisplay({
  status,
  reason,
  className = ''
}: RejectionReasonDisplayProps) {
  // 只在狀態為 rejected 且有拒絕原因時顯示
  if (status !== 'rejected' || !reason) {
    return null
  }

  return (
    <div className={`bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            審核未通過 - 拒絕原因
          </h3>
          <div className="mt-2 text-sm text-yellow-700 bg-white bg-opacity-50 rounded p-3">
            {reason}
          </div>
          <p className="mt-3 text-xs text-yellow-600">
            💡 請根據以上意見修正資料或檔案後重新提交
          </p>
        </div>
      </div>
    </div>
  )
}

export default RejectionReasonDisplay