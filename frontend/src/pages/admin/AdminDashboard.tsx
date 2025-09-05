import { useState, useEffect } from 'react'
import { Users, FileText, UserPlus, Download, Activity, UserCheck, UserX, AlertCircle, Loader2 } from 'lucide-react'
import UsersTab from './UsersTab'
import UserEntriesTab from './UserEntriesTab'
import AllEntriesTab from './AllEntriesTab'
import CreateUserTab from './CreateUserTab'
import { fetchUserCounters, UserCounters } from '../../api/adminMetrics'

type TabType = 'users' | 'user-entries' | 'all-entries' | 'create-user'

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string>('')
  
  // 使用者數量統計狀態
  const [userCounters, setUserCounters] = useState<UserCounters>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  })
  const [isLoadingCounters, setIsLoadingCounters] = useState(true)
  const [countersError, setCountersError] = useState<string | null>(null)

  // 載入使用者數量統計
  useEffect(() => {
    const loadUserCounters = async () => {
      try {
        setIsLoadingCounters(true)
        setCountersError(null)
        const counters = await fetchUserCounters()
        setUserCounters(counters)
      } catch (error) {
        console.error('Failed to load user counters:', error)
        setCountersError(error instanceof Error ? error.message : '載入使用者統計失敗')
      } finally {
        setIsLoadingCounters(false)
      }
    }

    loadUserCounters()
  }, [])

  // 重新載入統計數據的函式
  const refreshCounters = async () => {
    try {
      setIsLoadingCounters(true)
      setCountersError(null)
      const counters = await fetchUserCounters()
      setUserCounters(counters)
    } catch (error) {
      console.error('Failed to refresh user counters:', error)
      setCountersError(error instanceof Error ? error.message : '重新載入使用者統計失敗')
    } finally {
      setIsLoadingCounters(false)
    }
  }

  const tabs = [
    {
      id: 'users' as TabType,
      label: '使用者管理',
      icon: <Users className="w-4 h-4" />,
      description: '管理系統使用者'
    },
    {
      id: 'all-entries' as TabType,
      label: '全部填報',
      icon: <FileText className="w-4 h-4" />,
      description: '查看所有填報記錄'
    },
    {
      id: 'create-user' as TabType,
      label: '建立使用者',
      icon: <UserPlus className="w-4 h-4" />,
      description: '新增系統使用者'
    }
  ]

  const handleViewUserEntries = (userId: string, userName: string) => {
    setSelectedUserId(userId)
    setSelectedUserName(userName)
    setActiveTab('user-entries')
  }

  const handleBackToUsers = () => {
    setSelectedUserId(null)
    setSelectedUserName('')
    setActiveTab('users')
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab onViewUserEntries={handleViewUserEntries} />
      case 'user-entries':
        return (
          <UserEntriesTab
            userId={selectedUserId!}
            userName={selectedUserName}
            onBack={handleBackToUsers}
          />
        )
      case 'all-entries':
        return <AllEntriesTab />
      case 'create-user':
        return <CreateUserTab />
      default:
        return <UsersTab onViewUserEntries={handleViewUserEntries} />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          管理員總控制台
        </h1>
        <p className="text-gray-600">
          集中管理所有系統功能和用戶資料
        </p>
      </div>

      {/* 使用者數量統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* 總使用者數量 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">總使用者</p>
              {isLoadingCounters ? (
                <div className="flex items-center mt-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-2xl font-bold text-gray-900">載入中...</span>
                </div>
              ) : countersError ? (
                <div className="flex items-center mt-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <span className="ml-2 text-sm text-red-600">載入失敗</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {userCounters.totalUsers.toLocaleString()}
                </p>
              )}
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* 活躍使用者數量 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">活躍使用者</p>
              {isLoadingCounters ? (
                <div className="flex items-center mt-2">
                  <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                  <span className="ml-2 text-2xl font-bold text-gray-900">載入中...</span>
                </div>
              ) : countersError ? (
                <div className="flex items-center mt-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <span className="ml-2 text-sm text-red-600">載入失敗</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {userCounters.activeUsers.toLocaleString()}
                </p>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* 非活躍使用者數量 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">非活躍使用者</p>
              {isLoadingCounters ? (
                <div className="flex items-center mt-2">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-2xl font-bold text-gray-900">載入中...</span>
                </div>
              ) : countersError ? (
                <div className="flex items-center mt-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <span className="ml-2 text-sm text-red-600">載入失敗</span>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {userCounters.inactiveUsers.toLocaleString()}
                </p>
              )}
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <UserX className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 錯誤訊息顯示 */}
      {countersError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">載入使用者統計時發生錯誤</h3>
              <p className="text-sm text-red-700 mt-1">{countersError}</p>
            </div>
            <button
              onClick={refreshCounters}
              disabled={isLoadingCounters}
              className="ml-4 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-sm rounded-md transition-colors disabled:opacity-50"
            >
              {isLoadingCounters ? '重新載入中...' : '重試'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
            
            {/* 動態的用戶填報分頁 */}
            {activeTab === 'user-entries' && selectedUserName && (
              <button
                className="flex items-center space-x-2 py-4 px-1 border-b-2 border-blue-500 text-blue-600 font-medium text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>{selectedUserName} 的填報</span>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
