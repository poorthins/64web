import { Loader2, AlertCircle } from 'lucide-react'
import { useUserProfile } from '../../hooks/useUserProfile'
import { designTokens } from '../../utils/designTokens'
import DieselGeneratorRefuelPage from './DieselGeneratorRefuelPage'
import DieselGeneratorTestPageImpl from './DieselGeneratorTestPageImpl'

/**
 * 柴油發電機智能路由元件
 * 根據用戶的 filling_config.diesel_generator_mode 配置
 * 動態載入對應的頁面元件（加油模式或測試模式）
 */
const DieselGeneratorPage = () => {
  const { profile, loading, error } = useUserProfile()

  console.log('🔧 [DieselGeneratorPage] Render - loading:', loading, 'error:', error, 'profile:', profile)

  // 載入中狀態
  if (loading) {
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
          <p style={{ color: designTokens.colors.textPrimary }}>載入用戶配置中...</p>
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

  // 獲取柴油發電機模式配置
  const dieselGeneratorMode = profile?.filling_config?.diesel_generator_mode || 'refuel'

  console.log('🔧 [DieselGeneratorPage] User diesel_generator_mode:', dieselGeneratorMode)
  console.log('🔧 [DieselGeneratorPage] Full filling_config:', profile?.filling_config)

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