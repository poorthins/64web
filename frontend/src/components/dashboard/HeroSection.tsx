import React from 'react'

const HeroSection: React.FC = () => {
  return (
    <section
      className="relative w-full flex justify-center"
      style={{
        backgroundImage: 'url(/hero-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        paddingTop: '86px'
      }}
    >
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: '1920px',
          height: '528px',
          flexShrink: 0
        }}
      >
        <h1
          className="text-white font-bold text-center"
          style={{
            fontSize: '90px',
            fontFamily: 'Inter, sans-serif',
            lineHeight: '1.1',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
          }}
        >
          Your Action Today Shapes<br />
          Our Sustainable Future.
        </h1>
      </div>
    </section>
  )
}

export default HeroSection
