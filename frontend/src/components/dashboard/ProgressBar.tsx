import React from 'react'

interface ProgressBarProps {
  completed: number
  total: number
}

/**
 * ProgressBar - 符合 Figma 設計的進度條
 *
 * 設計要點：
 * - 水平佈局：左側標題+進度條，右側數字
 * - 左側從 317px 開始
 * - 進度條：1268px × 24px，綠色 #01e083
 * - 右側數字：分數（34px 綠色）+ 百分比（24px 黑色）
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ completed, total }) => {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div
      className="relative"
      style={{
        width: '1920px',
        height: '182px',
        flexShrink: 0,
        paddingTop: '47px'
      }}
    >
      {/* 左側：標題 "完成度" */}
      <div
        className="absolute"
        style={{
          left: '317px',
          top: '47px',
          color: '#000',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal'
        }}
      >
        完成度
      </div>

      {/* 左側：進度條容器 */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          left: '317px',
          top: '83px',
          width: '1268px',
          height: '24px',
          backgroundColor: '#FFF',
          flexShrink: 0
        }}
      >
        {/* 進度條填充 */}
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: '#01e083'
          }}
        />
      </div>

      {/* 右側：分數 "2/14" */}
      <div
        className="absolute"
        style={{
          left: '1511px',
          top: '31px',
          color: '#01e083',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '34px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: 'normal'
        }}
      >
        {completed}/{total}
      </div>

      {/* 右側：百分比 "14%" */}
      <div
        className="absolute"
        style={{
          left: '1537px',
          top: '120px',
          color: '#000',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '24px',
          fontStyle: 'normal',
          fontWeight: 600,
          lineHeight: 'normal'
        }}
      >
        {percentage}%
      </div>
    </div>
  )
}

export default ProgressBar
