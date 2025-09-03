import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)

  useEffect(() => {
    if (!loading) {
      setIsSessionLoaded(true)
    }
  }, [loading])

  const handleGetStarted = () => {
    if (user) {
      navigate('/app')
    } else {
      navigate('/login')
    }
  }

  if (!isSessionLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* 公司 Logo 區域 */}
          <div className="mx-auto flex justify-center mb-8">
            <img 
              src="/logo.png" 
              alt="Company Logo" 
              className="h-28 max-w-sm object-contain"
              onError={(e) => {
                // 如果圖片載入失敗，顯示預設圖示
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const svgWrapper = target.nextElementSibling as HTMLElement;
                if (svgWrapper) svgWrapper.style.display = 'flex';
              }}
            />
            {/* 預設圖示（當 logo.png 不存在時顯示） */}
            <div className="hidden flex h-28 w-28 items-center justify-center text-blue-600">
              <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            山椒魚組織型碳足跡盤查系統
          </h1>
          
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            簡化您的碳足跡計算與管理流程，協助企業達成永續發展目標
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">智能計算</h3>
              <p className="text-gray-600">自動化碳排放計算，支援多種排放源類型</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">合規報告</h3>
              <p className="text-gray-600">符合國際標準的報告格式，簡化審核流程</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">數據分析</h3>
              <p className="text-gray-600">深度分析排放趨勢，提供減排建議</p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition duration-200 shadow-lg hover:shadow-xl"
            >
              {user ? '進入系統' : '開始使用'}
            </button>
            
            {user && (
              <p className="text-sm text-gray-600">
                歡迎回來！點擊按鈕進入您的工作區
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage