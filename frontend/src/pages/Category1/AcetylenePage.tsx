/**
 * AcetylenePage - 乙炔頁面（Type 3）
 *
 * 使用新架構：useMobileType3Page Hook + MobileType3PageShell
 */

import { useMobileType3Page } from './hooks/useMobileType3Page'
import { MobileType3PageShell } from './components/MobileType3PageShell'
import { ACETYLENE_CONFIG } from './common/mobileEnergyConfig'
import { useAcetyleneSpecManager } from './hooks/useAcetyleneSpecManager'
import { AcetyleneSpecInputFields } from './components/AcetyleneSpecInputFields'
import { AcetyleneSpecListSection } from './components/AcetyleneSpecListSection'
import { AcetyleneUsageInputFields } from './components/AcetyleneUsageInputFields'

export default function AcetylenePage() {
  const page = useMobileType3Page({
    config: ACETYLENE_CONFIG,
    dataFieldName: 'acetyleneData',
    useSpecManager: useAcetyleneSpecManager,
    mode: 'quantity'
  })

  return (
    <MobileType3PageShell
      {...page}
      SpecInputFields={AcetyleneSpecInputFields}
      SpecListSection={AcetyleneSpecListSection}
      UsageInputFields={AcetyleneUsageInputFields}
    />
  )
}
