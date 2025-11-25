/**
 * WD40Page - WD-40 頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { WD40_CONFIG } from './common/mobileEnergyConfig'
import { useWD40SpecManager } from './hooks/useWD40SpecManager'
import { WD40SpecInputFields } from './components/WD40SpecInputFields'
import { WD40SpecListSection } from './components/WD40SpecListSection'
import { WD40UsageInputFields } from './components/WD40UsageInputFields'

export default function WD40Page() {
  const page = useMobileType3Page({
    config: WD40_CONFIG,
    dataFieldName: 'wd40Data',
    useSpecManager: useWD40SpecManager,
    mode: 'quantity'
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={WD40SpecInputFields}
      SpecListSection={WD40SpecListSection}
      UsageInputFields={WD40UsageInputFields}
    />
  )
}
