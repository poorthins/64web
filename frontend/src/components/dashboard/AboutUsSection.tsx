import React from 'react'

interface AboutUsSectionProps {
  scale?: number
}

/**
 * AboutUsSection - 符合 Figma 設計的關於我們區塊
 *
 * 設計要點：
 * - 1920px 固定寬度容器，響應式縮放
 * - 內容靠左對齊
 * - QR Code 在右側
 * - 版權文字在底部
 */
const AboutUsSection: React.FC<AboutUsSectionProps> = ({ scale = 1 }) => {
  return (
    <section
      className="w-full flex justify-center"
      style={{
        background: '#EBEDF0'
      }}
    >
      <div
        className="relative"
        style={{
          width: '1920px',
          height: '774px',
          flexShrink: 0,
          transformOrigin: 'top center',
          transform: `scale(${scale})`
        }}
      >
      {/* 標題 - left: 480px, top: 95px */}
      <h2
        className="absolute text-left font-medium"
        style={{
          left: '480px',
          top: '95px',
          color: '#000',
          fontFamily: "'PT Sans Narrow', 'Noto Sans JP', sans-serif",
          fontSize: '32px',
          fontStyle: 'normal',
          fontWeight: 700,
          lineHeight: 'normal'
        }}
      >
        About Us &gt;
      </h2>

      {/* 段落文字 - 靠左, top: 163px, width: 430px */}
      <div
        className="absolute"
        style={{
          left: '480px',
          top: '163px',
          width: '430px',
          color: '#000',
          textAlign: 'left',
          fontFamily: 'Inter',
          fontSize: '20px',
          fontStyle: 'normal',
          fontWeight: 400,
          lineHeight: '28px'
        }}
      >
        <p style={{ margin: 0 }}>
          <span className="font-normal">山椒魚</span> —
        </p>
        <p style={{ margin: 0 }}>
          棲息於台灣高山冷冽溪谷間，是全球緯度最低、海拔最高的魚群。牠的存在，象徵著純淨環境與生態平衡。我們以「山椒魚」為名，承載守護土地的使命，也體現對永續的堅持。
        </p>
        <p style={{ margin: '16px 0 0 0' }}>
          山椒魚永續工程股份有限公司由成功大學土木專業師生發起，攜手台灣大學與交通大學的跨域人才，專注於 溫室氣體盤查、減碳技術與碳中和實踐。憑藉土木、建築與資訊工程的專業，我們依循 ISO 14064 與 14067，協助客戶精準識別碳排熱點、縮短盤查流程，讓每一個專案都更貼近永續未來。
        </p>
      </div>

      {/* QR Code - top: 555px, left: 1476px */}
      <div
        className="absolute"
        style={{
          top: '645px',
          left: '1476px',
          width: '100px',
          height: '100px',
          flexShrink: 0,
          aspectRatio: '1/1',
          background: 'url(/qr-code.png) 50% / cover no-repeat'
        }}
      />

      {/* 版權文字 - top: 636px, left: 960px */}
      <p
        className="text-black font-extralight absolute"
        style={{
          left: '960px',
          top: '726px',
          fontSize: '15px',
          lineHeight: 'normal',
          whiteSpace: 'nowrap'
        }}
      >
        © Formosanus Engineering Sustainable Solution © All Rights Reserved.
      </p>
      </div>
    </section>
  )
}

export default AboutUsSection
