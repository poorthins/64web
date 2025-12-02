/**
 * WeldingRodPage - 焊條頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 * 特殊：weight mode（數量 × 單位重量）
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { WELDING_ROD_CONFIG } from './common/weldingRodConfig'
import { useWeldingRodSpecManager } from './hooks/useWeldingRodSpecManager'
import { WeldingRodSpecInputFields } from './components/WeldingRodSpecInputFields'
import { WeldingRodSpecListSection } from './components/WeldingRodSpecListSection'
import { WeldingRodUsageInputFields } from './components/WeldingRodUsageInputFields'

export default function WeldingRodPage() {
  const page = useMobileType3Page({
    config: WELDING_ROD_CONFIG,
    dataFieldName: 'weldingRodData',
    useSpecManager: useWeldingRodSpecManager,
    mode: 'weight',
    parseSpecName: (name: string) => {
      // 格式：E7018_0.05（型號_單位重量）
      const parts = name.split('_')
      if (parts.length !== 2) return null

      const itemName = parts[0]
      const unitWeight = parseFloat(parts[1])

      if (!itemName || isNaN(unitWeight)) return null

      return { name: itemName, unitWeight }
    }
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={WeldingRodSpecInputFields}
      SpecListSection={WeldingRodSpecListSection}
      UsageInputFields={WeldingRodUsageInputFields}
    />
  )
}
