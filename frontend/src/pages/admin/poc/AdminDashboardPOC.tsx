import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import StatsCard from './components/StatsCard'
import UserCard from './components/UserCard'
import SearchBar from './components/SearchBar'
import StatusFilter from './components/StatusFilter'
import { mockUsers, calculateStats, UserStatus, statusLabels } from './data/mockData'

const AdminDashboardPOC: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<UserStatus[]>([])

  const stats = useMemo(() => calculateStats(mockUsers), [])

  const filteredUsers = useMemo(() => {
    return mockUsers.filter(user => {
      const matchesSearch = searchQuery === '' ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(user.status)

      return matchesSearch && matchesStatus
    })
  }, [searchQuery, selectedStatuses])

  const handleStatsCardClick = (status: UserStatus) => {
    console.log(`點擊統計卡片: ${statusLabels[status]}`)
    navigate(`/app/admin/poc/statistics?status=${status}`)
  }

  const handleUserClick = (user: any) => {
    console.log('點擊用戶卡片:', user)
    navigate(`/app/admin/poc/edit/${user.id}`)
  }

  const handleCreateUser = () => {
    navigate('/app/admin/poc/create')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            管理員控制台 POC 🚀
          </h1>
          <p className="text-gray-600">
            用戶提交狀態管理與統計概覽
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="已提交"
            count={stats.submitted}
            icon="📝"
            bgColor="bg-blue-100"
            onClick={() => handleStatsCardClick('submitted')}
          />
          <StatsCard
            title="待審核"
            count={stats.pending}
            icon="⏳"
            bgColor="bg-orange-100"
            onClick={() => handleStatsCardClick('pending')}
          />
          <StatsCard
            title="已通過"
            count={stats.approved}
            icon="✅"
            bgColor="bg-green-100"
            onClick={() => handleStatsCardClick('approved')}
          />
          <StatsCard
            title="已退回"
            count={stats.rejected}
            icon="❌"
            bgColor="bg-red-100"
            onClick={() => handleStatsCardClick('rejected')}
          />
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">👥</span>
                用戶列表管理
              </h2>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <span className="mr-2">➕</span>
                新增用戶
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
              </div>

              <div className="lg:col-span-1">
                <StatusFilter
                  selectedStatuses={selectedStatuses}
                  onChange={setSelectedStatuses}
                />
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              顯示 {filteredUsers.length} 位用戶 (共 {mockUsers.length} 位)
            </div>

            {(searchQuery || selectedStatuses.length > 0) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStatuses([])
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                清除所有篩選
              </button>
            )}
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                沒有找到符合條件的用戶
              </h3>
              <p className="text-gray-500">
                請調整搜尋條件或篩選設定
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onClick={handleUserClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="flex items-center justify-center space-x-4">
            <span>🔧 POC 版本</span>
            <span>•</span>
            <span>使用假資料展示</span>
            <span>•</span>
            <span>React 18 + TypeScript + Tailwind CSS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardPOC