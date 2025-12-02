/**
 * 焊條頁面配置
 */

import { MobileEnergyConfig } from './mobileEnergyConfig'

export const WELDING_ROD_CONFIG: MobileEnergyConfig = {
  pageKey: 'welding_rod',
  unit: 'KG',
  category: 'W',
  title: '焊條',
  subtitle: 'Welding Rod',
  iconColor: '#95D0A7',
  categoryPosition: { left: 719, top: 39 },
  instructionText: `請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項；同一份佐證的所有數據新增完成後，請點選「+新增群組」，以填寫下一份佐證的數據。`,
  dataFieldName: 'weldingRodData'
}
