import React from 'react'

/**
 * Footer - 符合 Figma 設計的頁尾區塊
 *
 * 設計要點：
 * - 背景：灰色 (bg-figma-gray)
 * - 高度：自動
 * - 版權文字：15px, 黑色
 * - 居中對齊
 */
const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-figma-gray py-8 px-6 flex items-center justify-center text-center">
      <p
        className="text-black"
        style={{
          fontSize: 'clamp(12px, 1vw, 15px)',
          fontWeight: 300
        }}
      >
        © Formosanus Engineering Sustainable Solution © All Rights Reserved.
      </p>
    </footer>
  )
}

export default Footer
