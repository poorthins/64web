import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { role, loadingRole } = useRole()

  const handleNavigateToEntries = () => {
    navigate('/app/my/entries')
  }

  const quickActions = [
    {
      title: '碳排放計算',
      description: '計算各範疇碳排放量',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      action: () => navigate('/app/calculator'),
      color: 'bg-blue-500'
    },
    {
      title: '我的填報',
      description: '管理與預查填報紀錄',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      action: handleNavigateToEntries,
      color: 'bg-purple-500'
    },
    {
      title: '協助工具',
      description: '線上客服協助與常見問題排查',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      action: () => navigate('/app/help'),
      color: 'bg-green-500'
    },
    ...(role === 'admin' ? [{
      title: '管理員專區',
      description: '系統管理與使用者管理',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => navigate('/app/admin'),
      color: 'bg-red-500'
    }] : [])
  ]

  const recentActivities = [
    {
      type: '新增計算',
      description: 'WD-40 碳排放計算',
      time: '2 小時前',
      status: 'completed'
    },
    {
      type: '報告產生',
      description: '月度排放報告',
      time: '1 天前',
      status: 'completed'
    },
    {
      type: '數據上傳',
      description: '電力使用數據',
      time: '3 天前',
      status: 'pending'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          歡迎回來！
        </h1>
        <div className="space-y-1">
          <p className="text-gray-600">
            {user?.user_metadata?.display_name || user?.email}，
            今天準備好管理碳排放數據了嗎？
          </p>
          {!loadingRole && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">目前角色：</span>
              <span className={`text-sm px-2 py-1 rounded-full font-medium ${
                role === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {role === 'admin' ? '管理員' : '一般使用者'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <div
            key={index}
            onClick={action.action}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-gray-300
                      flex flex-col items-center text-center"
          >
            <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white mb-4`}>
              {action.icon}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {action.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {action.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            最近活動
          </h2>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            快速統計
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">本月計算次數</span>
              <span className="text-2xl font-bold text-blue-600">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">總排放量 (tCO2e)</span>
              <span className="text-2xl font-bold text-green-600">245.8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">已完成報告</span>
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              準備開始填報？
            </h3>
            <p className="text-gray-600">
              前往個人填報區域，管理您的碳排放數據
            </p>
          </div>
          <button
            onClick={handleNavigateToEntries}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition duration-200 shadow-lg hover:shadow-xl"
          >
            前往我的填報
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage