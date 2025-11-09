import React from 'react'

interface InstructionTextProps {
  /** 說明文字內容，支援 HTML */
  content: string
}

/**
 * InstructionText - 統一的說明文字組件
 *
 * 顯示在 StatusBanner 下方 35px 處
 * 每頁可傳入不同的說明文字
 */
export const InstructionText: React.FC<InstructionTextProps> = ({ content }) => {
  return (
    <div
      className="mx-auto"
      style={{
        display: 'flex',
        width: '1700px',
        height: '73px',
        flexDirection: 'column',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#000',
        textAlign: 'center',
        fontFamily: 'Inter',
        fontSize: '20px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '30px',
        marginTop: '41px' // 藍色框底部超出容器 6px + 間距 35px = 41px
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}

export default InstructionText
