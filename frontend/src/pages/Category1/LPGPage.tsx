/**
 * LPGPage - 液化石油氣/瓦斯頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { LPG_CONFIG } from './common/mobileEnergyConfig'
import { useLPGSpecManager } from './hooks/useLPGSpecManager'
import { LPGSpecInputFields } from './components/LPGSpecInputFields'
import { LPGSpecListSection } from './components/LPGSpecListSection'
import { LPGUsageInputFields } from './components/LPGUsageInputFields'

export default function LPGPage() {
  const page = useMobileType3Page({
    config: LPG_CONFIG,
    dataFieldName: 'lpgData',
    useSpecManager: useLPGSpecManager,
    mode: 'quantity'
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={LPGSpecInputFields}
      SpecListSection={LPGSpecListSection}
      UsageInputFields={LPGUsageInputFields}
    />
  )
}
