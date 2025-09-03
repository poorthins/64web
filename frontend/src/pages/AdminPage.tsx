import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../hooks/useRole'

const AdminPage = () => {
  const { user } = useAuth()
  const { role } = useRole()

  const adminStats = [
    {
      title: '總使用者數量',
      value: '156',
      change: '+12',
      changeType: 'increase',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      )
    },
    {
      title: '今日登入數',
      value: '42',
      change: '+8',
      changeType: 'increase',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      )
    },
    {
      title: '系統健康度',
      value: '98.5%',
      change: '+0.2%',
      changeType: 'increase',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: '資料庫大小',
      value: '2.4GB',
      change: '+156MB',
      changeType: 'increase',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    }
  ]

  const adminActions = [
    {
      title: '使用者管理',
      description: '查看、編輯與管理系統使用者',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      color: 'bg-blue-500',
      action: () => alert('使用者管理功能開發中...')
    },
    {
      title: '系統設定',
      description: '調整系統參數與全域配置',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-green-500',
      action: () => alert('系統設定功能開發中...')
    },
    {
      title: '數據分析',
      description: '查看系統使用統計與趨勢分析',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-purple-500',
      action: () => alert('數據分析功能開發中...')
    },
    {
      title: '系統日誌',
      description: '檢視系統運行日誌與錯誤記錄',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'bg-orange-500',
      action: () => alert('系統日誌功能開發中...')
    }
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          管理員控制台
        </h1>
        <div className="space-y-1">
          <p className="text-gray-600">
            歡迎，{user?.email}
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">管理員權限已啟用</span>
            <span className="text-sm px-2 py-1 rounded-full font-medium bg-red-100 text-red-800">
              {role === 'admin' ? '系統管理員' : '使用者'}
            </span>
          </div>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {adminStats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
                <p className={`text-sm ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 管理功能 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminActions.map((action, index) => (
          <div
            key={index}
            onClick={action.action}
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-gray-300"
          >
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                {action.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {action.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-lg border border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              系統維護
            </h3>
            <p className="text-gray-600">
              執行系統清理、備份或其他維護操作
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => alert('備份功能開發中...')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
            >
              執行備份
            </button>
            <button
              onClick={() => alert('清理功能開發中...')}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition duration-200"
            >
              清理快取
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage