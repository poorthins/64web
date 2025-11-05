import React from 'react'

export type StatusType = 'pending' | 'submitted' | 'approved' | 'rejected'

interface StatusCardProps {
  type: StatusType
  count: number
  onClick?: () => void
}

/**
 * StatusCard - 符合 Figma 設計的狀態卡片
 *
 * 設計要點：
 * - 背景：rgba 顏色
 * - 標題：28px
 * - 描述：20px, font-weight 300
 * - 數字：68px, text-shadow
 * - 全寬佈局（grid 控制）
 */
const STATUS_CONFIG: Record<StatusType, {
  label: string
  description: React.ReactNode
  bgColor: string
  textColor: string
  numberColor: string
}> = {
  pending: {
    label: '待填寫',
    description: (
      <>
        Let's get started ! Please fill<br />in the required information.
      </>
    ),
    bgColor: 'rgba(255, 255, 255, 0.70)',
    textColor: '#000',
    numberColor: '#000'
  },
  submitted: {
    label: '已提交',
    description: (
      <>
        Submission complete!<br />It's now pending review.
      </>
    ),
    bgColor: 'rgba(7, 85, 108, 0.85)',
    textColor: '#000',
    numberColor: '#FFF'
  },
  approved: {
    label: '已通過',
    description: (
      <>
        Great job! Your submission<br />has been approved .
      </>
    ),
    bgColor: 'rgba(161, 194, 201, 0.85)',
    textColor: '#000',
    numberColor: '#FFF'
  },
  rejected: {
    label: '已退回',
    description: 'Please revise and resubmit.',
    bgColor: 'rgba(217, 248, 58, 0.70)',
    textColor: '#000',
    numberColor: '#FFF'
  }
}

const StatusCard: React.FC<StatusCardProps> = ({ type, count, onClick }) => {
  const config = STATUS_CONFIG[type]

  return (
    <button
      onClick={onClick}
      className="transition-all hover:opacity-90"
      style={{
        width: '480px',
        height: '306px',
        flexShrink: 0,
        backgroundColor: config.bgColor,
        position: 'relative'
      }}
    >
      {/* 標題 - 絕對定位 */}
      <div
        style={{
          position: 'absolute',
          left: '112px',
          top: '53px',
          color: config.textColor,
          fontFamily: 'Inter',
          fontSize: '28px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal'
        }}
      >
        {config.label}
      </div>

      {/* 描述 - 絕對定位 */}
      <div
        style={{
          position: 'absolute',
          left: '111px',
          top: '111px',
          color: config.textColor,
          fontFamily: 'Inter',
          fontSize: '20px',
          fontStyle: 'normal',
          fontWeight: 200,
          lineHeight: 'normal',
          textAlign: 'left'
        }}
      >
        {config.description}
      </div>

      {/* 箭頭 - 絕對定位 */}
      <div
        style={{
          position: 'absolute',
          left: '112px',
          top: '201px',
          width: '33px',
          height: '22px'
        }}
      >
        <svg width="33" height="22" viewBox="0 0 33 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 11L31.5 11M31.5 11L21 0.5M31.5 11L21 21.5" stroke={config.textColor} strokeWidth="1.5"/>
        </svg>
      </div>

      {/* 數字 - 絕對定位在右下角 */}
      <div
        style={{
          position: 'absolute',
          bottom: '46px',
          right: '96px',
          display: 'flex',
          width: '83px',
          height: '79px',
          flexDirection: 'column',
          justifyContent: 'center',
          flexShrink: 0,
          color: config.numberColor,
          textAlign: 'right',
          fontFamily: 'Inter',
          fontSize: '68px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: 'normal',
          textShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)'
        }}
      >
        {count}
      </div>
    </button>
  )
}

export default StatusCard
