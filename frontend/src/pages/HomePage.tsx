const HomePage = () => {
  return (
    <div className="space-y-8">
      <div className="text-center bg-gradient-to-r from-brand-50 to-brand-100 rounded-xl p-8 border border-brand-200">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-brand-500 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          歡迎光臨山椒魚組織型碳盤查系統
        </h1>
        <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
          透過專業的碳排放盤查工具，協助您的組織達成淨零排放目標，建立永續發展的未來
        </p>
        <div className="flex justify-center space-x-2">
          <span className="inline-block w-2 h-2 bg-brand-400 rounded-full"></span>
          <span className="inline-block w-2 h-2 bg-brand-500 rounded-full"></span>
          <span className="inline-block w-2 h-2 bg-brand-600 rounded-full"></span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-mint-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-mint-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">範疇一（直接排放）</h3>
          <p className="text-gray-600 text-sm leading-relaxed">組織直接控制的排放源，如自有車輛、鍋爐、製程設備等燃料燃燒產生的溫室氣體排放。</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-mint-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-mint-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">範疇二（間接排放）</h3>
          <p className="text-gray-600 text-sm leading-relaxed">組織購買的電力、蒸汽、熱能或冷能等外購能源消耗所產生的間接溫室氣體排放。</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="w-12 h-12 bg-mint-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-mint-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">範疇三（其他間接排放）</h3>
          <p className="text-gray-600 text-sm leading-relaxed">組織價值鏈中的其他間接排放，包括供應商、員工通勤、產品運輸、廢棄物處理等活動產生的排放。</p>
        </div>
      </div>
    </div>
  )
}

export default HomePage