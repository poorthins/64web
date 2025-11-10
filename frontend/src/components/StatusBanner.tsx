import React from 'react'
import { Star, Save, CheckCircle, X } from 'lucide-react'
import { ApprovalStatus } from '../hooks/useApprovalStatus'

interface StatusBannerProps {
  /** 審核狀態物件 */
  approvalStatus: ApprovalStatus
  /** 是否為審核模式 */
  isReviewMode?: boolean
  /** 主題顏色（預設 #3996FE 柴油藍） */
  accentColor?: string
}

/**
 * StatusBanner - 統一的審核狀態橫幅組件
 *
 * 雙層卡片設計，白色內容層 + 藍色陰影層，使用 lucide-react 圖標：
 * - 已暫存：Save 圖標
 * - 等待審核中：CheckCircle 圖標
 * - 已審核通過：Star 圖標
 * - 已退回：X 圖標
 *
 * 使用方式：
 * ```tsx
 * const approvalStatus = useApprovalStatus(pageKey, year)
 * <StatusBanner
 *   approvalStatus={approvalStatus}
 *   isReviewMode={isReviewMode}
 * />
 * ```
 *
 * @remarks
 * - 審核模式下不顯示任何橫幅
 * - 接收父組件傳入的 approvalStatus（避免重複調用 hook）
 * - 顯示優先級：已通過 > 已退回 > 待審核 > 已暫存
 * - 日期格式：MM/DD（不含年份）
 */
export const StatusBanner: React.FC<StatusBannerProps> = ({
  approvalStatus,
  isReviewMode = false,
  accentColor = '#3996FE'
}) => {
  // 審核模式下不顯示狀態橫幅
  if (isReviewMode) {
    return null
  }

  // 格式化日期為 MM/DD
  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      return new Date().toLocaleDateString('zh-TW', {
        month: '2-digit',
        day: '2-digit'
      })
    }
    return new Date(dateString).toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit'
    })
  }

  // 雙層卡片容器組件
  const DoubleLayeredCard: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <div className="relative mx-auto" style={{ width: '993px', height: '119px' }}>
      {/* 藍色陰影層（底層，右下偏移）*/}
      <div
        className="absolute"
        style={{
          width: '993px',
          height: '119px',
          background: accentColor,
          left: '12px',
          top: '6px'
        }}
      />

      {/* 白色內容層（上層）*/}
      <div
        className="absolute flex items-center px-8"
        style={{
          width: '993px',
          height: '119px',
          border: '1px solid #000',
          background: 'rgba(245, 245, 245, 0.90)',
          left: 0,
          top: 0
        }}
      >
        {/* Icon */}
        <div className="mr-6" style={{ width: '28px', height: '28px', flexShrink: 0 }}>
          {icon}
        </div>

        {/* 文字內容 */}
        <div style={{
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontWeight: 400,
          lineHeight: 'normal'
        }}>
          {children}
        </div>
      </div>
    </div>
  )

  // 已審核通過狀態（最高優先級）
  if (approvalStatus.isApproved) {
    return (
      <DoubleLayeredCard icon={<Star size={28} />}>
        <div>
          <div className="font-semibold mb-2">
            恭喜您已審核通過！
          </div>
          <div className="mb-1">
            此填報已完成審核，資料已鎖定無法修改。
          </div>
          <div>
            審核完成時間：{formatDate(approvalStatus.reviewedAt)}
          </div>
        </div>
      </DoubleLayeredCard>
    )
  }

  // 已退回狀態（次高優先級）
  if (approvalStatus.isRejected) {
    return (
      <DoubleLayeredCard icon={<X size={28} />}>
        <div>
          <div className="mb-2">
            {formatDate(approvalStatus.reviewedAt)}填報已被退回，請修正後重新提交
          </div>
          <div>
            退回原因：{approvalStatus.reviewNotes || '無'}
          </div>
        </div>
      </DoubleLayeredCard>
    )
  }

  // 已儲存狀態（優先於已提交）
  if (approvalStatus.isSaved) {
    return (
      <DoubleLayeredCard icon={<Save size={28} />}>
        <div>
          <div className="font-semibold mb-2">
            {formatDate()}資料已儲存
          </div>
          <div>
            資料已儲存但尚未提交，您可以繼續修改資料、上傳文件或編輯記錄，完成後請點選「提交審核」
          </div>
        </div>
      </DoubleLayeredCard>
    )
  }

  // 等待審核中狀態
  if (approvalStatus.isPending) {
    return (
      <DoubleLayeredCard icon={<CheckCircle size={28} />}>
        <div>
          <div className="font-semibold mb-2">
            {formatDate()}資料已提交
          </div>
          <div>
            您可以繼續提交並編輯資料，異動後請再次點擊「提交」以更新記錄。
          </div>
        </div>
      </DoubleLayeredCard>
    )
  }

  // 無狀態時不顯示
  return null
}

export default StatusBanner
