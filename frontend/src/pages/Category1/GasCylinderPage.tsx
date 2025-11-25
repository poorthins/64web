/**
 * GasCylinderPage - 氣體鋼瓶頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { GAS_CYLINDER_CONFIG } from './common/mobileEnergyConfig'
import { useGasCylinderSpecManager } from './hooks/useGasCylinderSpecManager'
import { GasCylinderSpecInputFields } from './components/GasCylinderSpecInputFields'
import { GasCylinderSpecListSection } from './components/GasCylinderSpecListSection'
import { GasCylinderUsageInputFields } from './components/GasCylinderUsageInputFields'

export default function GasCylinderPage() {
  const page = useMobileType3Page({
    config: GAS_CYLINDER_CONFIG,
    dataFieldName: 'gasCylinderData',
    useSpecManager: useGasCylinderSpecManager,
    mode: 'quantity'
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={GasCylinderSpecInputFields}
      SpecListSection={GasCylinderSpecListSection}
      UsageInputFields={GasCylinderUsageInputFields}
    />
  )
}
