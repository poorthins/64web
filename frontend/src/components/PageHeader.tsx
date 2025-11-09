import React from 'react'

interface PageHeaderProps {
  /** 類別標籤（如 "Diesel (Mobile Sources)"） */
  category: string
  /** 中文主標題（如 "柴油使用量填報"） */
  title: string
  /** 英文副標題（如 "Diesel Usage Report"） */
  subtitle: string
}

/**
 * PageHeader - 統一的頁面標題組件
 *
 * 三層標題結構，符合 Figma 設計規格：
 * 1. 類別標籤（小英文標題）- TOP 39px, LEFT 646px
 * 2. 中文主標題 - TOP 99px
 * 3. 英文副標題 - TOP 164px
 *
 * 使用方式：
 * ```tsx
 * <PageHeader
 *   category="Diesel (Mobile Sources)"
 *   title="柴油使用量填報"
 *   subtitle="Diesel Usage Report"
 * />
 * ```
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  category,
  title,
  subtitle
}) => {
  return (
    <div
      className="relative"
      style={{
        width: '1920px',
        height: '254px' // 英文副標題底部 220px + 34px 間距 = 254px
      }}
    >
      {/* 1. 類別標籤（大字母標示） */}
      <div
        className="absolute flex flex-col justify-center"
        style={{
          left: '646px',
          top: '39px',
          width: '216px',
          height: '180px'
        }}
      >
        <p
          style={{
            color: '#3996FE',
            textAlign: 'center',
            fontFamily: '"Pixelify Sans"',
            fontSize: '96px',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal'
          }}
        >
          {category}
        </p>
      </div>

      {/* 2. 中文主標題 */}
      <h1
        className="absolute flex items-center justify-center"
        style={{
          left: '0',
          top: '99px',
          width: '1920px',
          height: '63px',
          color: '#000',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '52px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal'
        }}
      >
        {title}
      </h1>

      {/* 3. 英文副標題 */}
      <p
        className="absolute flex items-center justify-center"
        style={{
          left: '0',
          top: '164px',
          width: '1920px',
          height: '56px',
          color: '#000',
          textAlign: 'center',
          fontFamily: 'Inter',
          fontSize: '24px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: 'normal'
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}

export default PageHeader
