import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { useUserProfile } from '../../hooks/useUserProfile'
import { getEntryById } from '../../api/entries'
import { designTokens } from '../../utils/designTokens'
import DieselGeneratorRefuelPage from './DieselGeneratorRefuelPage'
import DieselGeneratorTestPageImpl from './DieselGeneratorTestPageImpl'

/**
 * 柴油發電機智能路由元件
 *
 * 行為邏輯：
 * 1. 審核模式（URL 有 mode=review + entryId）：根據 entry.payload.mode 決定顯示哪個頁面
 * 2. 一般模式：根據用戶的 filling_config.diesel_generator_mode 配置決定
 *
 * 這樣確保管理員審核時看到的頁面與用戶提交時的頁面一致
 */
const DieselGeneratorPage = () => {
  const { profile, loading, error } = useUserProfile()
  const [searchParams] = useSearchParams()
  const [reviewMode, setReviewMode] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  console.log('🔧 [DieselGeneratorPage] Render - loading:', loading, 'error:', error, 'profile:', profile)

  // 審核模式偵測：從 entry 載入實際的 mode
  useEffect(() => {
    const isReviewMode = searchParams.get('mode') === 'review'
    const entryId = searchParams.get('entryId')

    if (isReviewMode && entryId) {
      console.log('🔍 [DieselGeneratorPage] 審核模式：載入 entry', entryId)
      setReviewLoading(true)

      getEntryById(entryId)
        .then(entry => {
          if (entry) {
            const mode = entry.payload?.mode || 'refuel'  // 預設加油模式
            console.log('✅ [DieselGeneratorPage] Entry mode:', mode, 'payload:', entry.payload)
            setReviewMode(mode)
          } else {
            console.warn('⚠️ [DieselGeneratorPage] Entry not found, fallback to refuel')
            setReviewMode('refuel')
          }
          setReviewLoading(false)
        })
        .catch(err => {
          console.error('❌ [DieselGeneratorPage] 載入 entry 失敗:', err)
          setReviewMode('refuel')  // Fallback 到加油模式
          setReviewLoading(false)
        })
    }
  }, [searchParams])

  // 載入中狀態（包含審核模式載入）
  if (loading || reviewLoading) {
    const message = reviewLoading ? '載入審核資料中...' : '載入用戶配置中...'
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.background }}
      >
        <div className="text-center">
          <Loader2
            className="w-12 h-12 animate-spin mx-auto mb-4"
            style={{ color: designTokens.colors.accentPrimary }}
          />
          <p style={{ color: designTokens.colors.textPrimary }}>{message}</p>
        </div>
      </div>
    )
  }

  // 錯誤狀態
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: designTokens.colors.background }}
      >
        <div className="text-center max-w-md mx-auto p-6">
          <div
            className="w-16 h-16 mx-auto rounded-full mb-4 flex items-center justify-center"
            style={{ backgroundColor: `${designTokens.colors.error}15` }}
          >
            <AlertCircle
              className="h-8 w-8"
              style={{ color: designTokens.colors.error }}
            />
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: designTokens.colors.textPrimary }}
          >
            載入配置失敗
          </h2>
          <p
            className="text-sm mb-4"
            style={{ color: designTokens.colors.textSecondary }}
          >
            無法載入用戶配置，請聯繫管理員或重新登入。
          </p>
          <p
            className="text-xs"
            style={{ color: designTokens.colors.textSecondary }}
          >
            錯誤訊息: {error}
          </p>
        </div>
      </div>
    )
  }

  // 決定模式：優先使用審核模式（從 entry 讀取），否則使用用戶 profile 配置
  const dieselGeneratorMode = reviewMode || profile?.filling_config?.diesel_generator_mode || 'refuel'

  console.log('🔧 [DieselGeneratorPage] Final mode:', dieselGeneratorMode)
  console.log('🔧 [DieselGeneratorPage] Review mode:', reviewMode)
  console.log('🔧 [DieselGeneratorPage] User profile mode:', profile?.filling_config?.diesel_generator_mode)

  // 根據模式載入對應的頁面元件
  if (dieselGeneratorMode === 'test') {
    console.log('🧪 [DieselGeneratorPage] Loading TEST version')
    return <DieselGeneratorTestPageImpl />
  } else {
    console.log('⛽ [DieselGeneratorPage] Loading REFUEL version')
    return <DieselGeneratorRefuelPage />
  }
}

export default DieselGeneratorPage