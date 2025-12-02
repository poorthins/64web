/**
 * OtherEnergySourcesPage - 其他使用能源頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { OTHER_ENERGY_SOURCES_CONFIG } from './common/mobileEnergyConfig'
import { useOtherEnergySourcesSpecManager } from './hooks/useOtherEnergySourcesSpecManager'
import { OtherEnergySourcesSpecInputFields } from './components/OtherEnergySourcesSpecInputFields'
import { OtherEnergySourcesSpecListSection } from './components/OtherEnergySourcesSpecListSection'
import { OtherEnergySourcesUsageInputFields } from './components/OtherEnergySourcesUsageInputFields'

export default function OtherEnergySourcesPage() {
  const page = useMobileType3Page({
    config: OTHER_ENERGY_SOURCES_CONFIG,
    dataFieldName: 'otherEnergySourcesData',
    useSpecManager: useOtherEnergySourcesSpecManager,
    mode: 'quantity'
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={OtherEnergySourcesSpecInputFields}
      SpecListSection={OtherEnergySourcesSpecListSection}
      UsageInputFields={OtherEnergySourcesUsageInputFields}
    />
  )
}
