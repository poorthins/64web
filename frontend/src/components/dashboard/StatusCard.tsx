import React from 'react'
import { ArrowRight } from 'lucide-react'

export type StatusType = 'pending' | 'submitted' | 'approved' | 'rejected'

interface StatusCardProps {
  type: StatusType
  count: number
  onClick?: () => void
}

const STATUS_CONFIG = {
  pending: {
    label: '待填寫',
    description: "Let's get started! Please fill in the required information.",
    showArrow: false,
    bgColor: 'bg-[#f5f5f0]',
    textColor: 'text-[#333]',
    borderColor: 'border-gray-200'
  },
  submitted: {
    label: '已提交',
    description: 'Submission is complete! It is now pending review.',
    showArrow: true,
    bgColor: 'bg-[#2d5f5d]',
    textColor: 'text-white',
    borderColor: 'border-[#2d5f5d]'
  },
  approved: {
    label: '已通過',
    description: 'Great job! Your submission has been approved.',
    showArrow: true,
    bgColor: 'bg-[#92c5c3]',
    textColor: 'text-[#1d1d1f]',
    borderColor: 'border-[#92c5c3]'
  },
  rejected: {
    label: '已退回',
    description: 'Please revise and resubmit.',
    showArrow: true,
    bgColor: 'bg-[#d4e157]',
    textColor: 'text-[#1d1d1f]',
    borderColor: 'border-[#d4e157]'
  }
}

const StatusCard: React.FC<StatusCardProps> = ({ type, count, onClick }) => {
  const config = STATUS_CONFIG[type]

  return (
    <button
      onClick={onClick}
      className={`
        ${config.bgColor} ${config.textColor}
        rounded-2xl p-8 transition-all
        hover:shadow-xl hover:-translate-y-1
        flex flex-col gap-5
        w-[480px] h-[306px] flex-shrink-0
      `}
      style={{
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
      }}
    >
      {/* 標題和描述 */}
      <div className="flex flex-col gap-2 text-left">
        <h3 className="text-lg font-semibold">{config.label}</h3>
        <p className="text-sm opacity-85 leading-relaxed">
          {config.description}
        </p>
      </div>

      {/* 箭頭 (只有部分卡片顯示) */}
      {config.showArrow && (
        <div className="opacity-60">
          <ArrowRight size={32} strokeWidth={2} />
        </div>
      )}

      {/* 數字 */}
      <div className="mt-auto text-7xl font-bold leading-none">
        {count}
      </div>
    </button>
  )
}

export default StatusCard
