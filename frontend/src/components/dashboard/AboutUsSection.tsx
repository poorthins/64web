import React from 'react'

const AboutUsSection: React.FC = () => {
  return (
    <section className="bg-figma-gray py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-figma-primary text-center mb-8">
          關於我們
        </h2>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="prose prose-lg mx-auto text-center">
            <p className="text-gray-700 leading-relaxed mb-4">
              山椒魚碳足跡管理系統致力於協助企業追蹤、管理和減少碳排放。
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              我們相信，透過精準的數據收集與分析，每個企業都能為地球的永續發展貢獻一份力量。
            </p>
            <p className="text-gray-700 leading-relaxed">
              就像山椒魚這種珍貴的生物需要乾淨的環境才能生存，
              我們的地球也需要每一個人的努力來維護。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AboutUsSection
