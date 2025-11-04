import React from 'react'

interface HeroSectionProps {
  onChecklistClick?: () => void
}

const HeroSection: React.FC<HeroSectionProps> = ({ onChecklistClick }) => {
  return (
    <section className="relative bg-black py-24 px-6">
      {/* 未來可以替換為背景圖片 */}
      <div className="max-w-7xl mx-auto text-center">
        <h1
          className="text-white font-bold mb-8"
          style={{
            fontSize: '90px',
            fontFamily: 'Inter, sans-serif',
            lineHeight: '1.1',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          Your Action Today<br />
          Shapes Our Sustainable Future.
        </h1>

        <button
          onClick={onChecklistClick}
          className="bg-figma-accent hover:bg-opacity-90 text-white font-semibold px-8 py-3 rounded-full transition-all text-lg"
        >
          盤查清單/佐證範例
        </button>
      </div>
    </section>
  )
}

export default HeroSection
