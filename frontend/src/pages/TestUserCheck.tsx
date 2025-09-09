import { useState } from 'react'
import { runCompleteUserCheck } from '../utils/runUserCheck'
import { createB1TestUser } from '../utils/createTestUser'

const TestUserCheck = () => {
  const [checking, setChecking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleRunCheck = async () => {
    setChecking(true)
    setResults(null)
    
    try {
      console.clear()
      const results = await runCompleteUserCheck()
      setResults(results)
    } catch (error) {
      console.error('Error running user check:', error)
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setChecking(false)
    }
  }

  const handleCreateUser = async () => {
    setCreating(true)
    
    try {
      console.clear()
      const result = await createB1TestUser()
      if (result.success) {
        alert('✅ 成功創建 b1@test.com 用戶！')
        // 創建成功後重新檢查
        handleRunCheck()
      } else {
        alert(`❌ 創建用戶失敗: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating user:', error)
      alert(`❌ 創建用戶失敗: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            用戶資料庫檢查工具
          </h1>
          
          <div className="mb-6 flex gap-4">
            <button
              onClick={handleRunCheck}
              disabled={checking || creating}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {checking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  檢查中...
                </>
              ) : (
                '執行資料庫檢查'
              )}
            </button>
            
            <button
              onClick={handleCreateUser}
              disabled={checking || creating}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  創建中...
                </>
              ) : (
                '創建 b1@test.com 用戶'
              )}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              此工具會檢查 Supabase 資料庫中的用戶記錄。請打開瀏覽器開發者工具的 Console 查看詳細結果。
            </p>
          </div>

          {results && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">檢查結果摘要</h3>
              
              {results.error ? (
                <div className="text-red-600">
                  錯誤: {results.error}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Profiles 表:</strong> {' '}
                    {results.profiles?.success ? (
                      <span className="text-green-600">
                        ✅ 成功 ({results.profiles.users?.length || 0} 個用戶)
                      </span>
                    ) : (
                      <span className="text-red-600">❌ 失敗</span>
                    )}
                  </div>
                  
                  <div>
                    <strong>a1@test.com:</strong> {' '}
                    {results.a1User?.success && results.a1User?.user ? (
                      <span className="text-green-600">
                        ✅ 找到 (role: {results.a1User.user.role})
                      </span>
                    ) : (
                      <span className="text-red-600">❌ 未找到</span>
                    )}
                  </div>
                  
                  <div>
                    <strong>b1@test.com:</strong> {' '}
                    {results.b1User?.success && results.b1User?.user ? (
                      <span className="text-green-600">
                        ✅ 找到 (role: {results.b1User.user.role})
                      </span>
                    ) : (
                      <span className="text-red-600">❌ 未找到</span>
                    )}
                  </div>
                  
                  <div>
                    <strong>Auth Users:</strong> {' '}
                    {results.authUsers?.success ? (
                      <span className="text-green-600">
                        ✅ 成功 ({results.authUsers.users?.length || 0} 個認證用戶)
                      </span>
                    ) : (
                      <span className="text-red-600">❌ 失敗</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                <p className="text-sm text-blue-700">
                  💡 詳細資訊請查看瀏覽器 Console (F12 → Console)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TestUserCheck
