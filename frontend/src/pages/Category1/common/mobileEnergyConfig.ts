/**
 * 移動源能源頁面配置
 *
 * 用於柴油、汽油等移動源能源填報頁面
 * 所有頁面共用相同邏輯，只有這些配置不同
 */

export interface MobileEnergyConfig {
  /** 頁面 key（用於 API） */
  pageKey: 'diesel' | 'gasoline' | 'urea' | 'septic_tank' | 'diesel_generator' | 'generator_test' | 'sf6' | 'wd40' | 'lpg' | 'acetylene' | 'welding_rod' | 'fire_extinguisher' | 'gas_cylinder' | 'other_energy_sources'
  /** 類別標籤（顯示在標題左側） */
  category: string
  /** 主標題 */
  title: string
  /** 副標題（英文） */
  subtitle: string
  /** Icon 顏色（十六進位） */
  iconColor: string
  /** 類別字母位置（left, top，單位 px） */
  categoryPosition: { left: number; top: number }
  /** 單位 */
  unit: string
  /** 說明文字 */
  instructionText: string
  /** 資料欄位名稱（在 payload 中） */
  dataFieldName: string
  /** 是否需要 SDS 上傳（選填） */
  requiresSDS?: boolean
  /** 是否需要設備類型選單（柴油發電機專用） */
  requiresDeviceType?: boolean
}

// 柴油配置
export const DIESEL_CONFIG: MobileEnergyConfig = {
  pageKey: 'diesel',
  category: 'D',
  title: '柴油(移動源)',
  subtitle: 'Diesel (Mobile Sources)',
  iconColor: '#3996FE',
  categoryPosition: { left: 646, top: 39 },
  unit: 'L',
  instructionText: '請先選擇設備項目；接著上傳加油單據作為佐證，若同一份佐證文件內含多筆加油紀錄，請使用 「+新增數據到此群組」，<br />讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新增完成後，點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'dieselData'
}

// 汽油配置
export const GASOLINE_CONFIG: MobileEnergyConfig = {
  pageKey: 'gasoline',
  category: 'G',
  title: '汽油',
  subtitle: 'Gasoline',
  iconColor: '#0219A7',
  categoryPosition: { left: 746, top: 39 },
  unit: 'L',
  instructionText: '請先選擇設備項目；接著上傳加油單據作為佐證，若同一份佐證文件內含多筆加油紀錄，請使用 「+新增數據到此群組」，<br />讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新完成後，點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'gasolineData'
}

// 尿素配置
export const UREA_CONFIG: MobileEnergyConfig = {
  pageKey: 'urea',
  category: 'U',
  title: '尿素',
  subtitle: 'Urea',
  iconColor: '#3E6606',
  categoryPosition: { left: 746, top: 39 },
  unit: 'L',
  instructionText: '請先上傳 SDS 安全資料表；再上傳添加紀錄佐證，請使用 「+新增數據到此群組」，讓一份佐證可對應多筆數據；<br />當同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'ureaData',
  requiresSDS: true
}

// 化糞池配置
export const SEPTIC_TANK_CONFIG: MobileEnergyConfig = {
  pageKey: 'septic_tank',
  category: 'S',
  title: '化糞池(人員工時)',
  subtitle: 'Septic Tank (Man-hours)',
  iconColor: '#060761',
  categoryPosition: { left: 599, top: 39 },
  unit: '小時',
  instructionText: '請上傳盤查年度人員出勤月報表；選擇月份，並輸入該月人員工時，點選 「+新增數據到此群組」新增下一月份數據',
  dataFieldName: 'septicTankData'
}

// 柴油發電機配置
export const DIESEL_GENERATOR_CONFIG: MobileEnergyConfig = {
  pageKey: 'diesel_generator',
  category: 'D',
  title: '柴油(固定源)',
  subtitle: 'Diesel (Stationary Sources)',
  iconColor: '#18C7A0',
  categoryPosition: { left: 646, top: 39 },
  unit: 'L',
  instructionText: '請先選擇設備項目；接著上傳加油單據作為佐證，若同一份佐證文件內含多筆加油紀錄，請使用 「+新增數據到此群組」，<br />讓一份佐證可對應多筆加油數據；當同一份佐證的所有數據新增完成後，點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'dieselGeneratorData',
  requiresDeviceType: true
}

// 發電機測試配置
export const GENERATOR_TEST_CONFIG: MobileEnergyConfig = {
  pageKey: 'generator_test',
  category: 'G',
  title: '發電機測試資料',
  subtitle: 'Generator Test Data',
  iconColor: '#01E083',
  categoryPosition: { left: 632, top: 39 },
  unit: '次',
  instructionText: '請填寫發電機測試資料，並上傳發電機銘牌照片。',
  dataFieldName: 'generatorTestData'
}

// 六氟化硫配置
export const SF6_CONFIG: MobileEnergyConfig = {
  pageKey: 'sf6',
  category: 'S',
  title: '六氟化硫',
  subtitle: 'SF6',
  iconColor: '#35E3BD',
  categoryPosition: { left: 701, top: 39 },
  unit: 'g',
  instructionText: '請填寫設備資訊，並上傳GCB 氣體斷路氣銘牌照片、SF6 氣體重量/ 年洩漏率證明文件，點選「+新增設備」，填寫至所有設備資料皆登錄完成。系統會自動將資料彙整至下方列表。',
  dataFieldName: 'sf6Data'
}

// WD-40 配置
export const WD40_CONFIG: MobileEnergyConfig = {
  pageKey: 'wd40',
  category: 'W',
  title: 'WD-40',
  subtitle: 'WD-40 Specialist Degreaser',
  iconColor: '#068A8F',
  categoryPosition: { left: 697, top: 39 },
  unit: '瓶',
  instructionText: '請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項；<br />同一份佐證的所有數據新增完成後，請點選「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'wd40Data'
}

// LPG（液化石油氣）配置
export const LPG_CONFIG: MobileEnergyConfig = {
  pageKey: 'lpg',
  category: 'L',
  title: '液化石油氣/瓦斯',
  subtitle: 'Liquefied Petroleum Gas (LPG)',
  iconColor: '#2DB14C',
  categoryPosition: { left: 609, top: 39 },
  unit: 'KG',
  instructionText: '請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項；同一份佐證的所有數據新增完成後，請點選「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'lpgData'
}

// 乙炔配置
export const ACETYLENE_CONFIG: MobileEnergyConfig = {
  pageKey: 'acetylene',
  category: 'A',
  title: '乙炔',
  subtitle: 'Acetylene',
  iconColor: '#9BB944',
  categoryPosition: { left: 743, top: 39 },
  unit: '瓶',
  instructionText: '請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選 「+新增數據到此群組」，讓一份佐證<br />可對應多張購買單據/多筆品項； 同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'acetyleneData'
}

// 滅火器配置
export const FIRE_EXTINGUISHER_CONFIG: MobileEnergyConfig = {
  pageKey: 'fire_extinguisher',
  category: 'F',
  title: '滅火器',
  subtitle: 'Fire Extinguisher',
  iconColor: '#006738',
  categoryPosition: { left: 714, top: 39 },
  unit: '支',
  instructionText: '請上傳消防安全設備檢修表；並確認當年度是否有新購入或填充滅火器，如有，先依據購買/ 填充規格建立清單；再上傳佐證文件，選擇日期、品項、填寫數量，<br />點選 「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項； 同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'fireExtinguisherData'
}

// 氣體鋼瓶配置
export const GAS_CYLINDER_CONFIG: MobileEnergyConfig = {
  pageKey: 'gas_cylinder',
  category: 'G',
  title: '氣體鋼瓶',
  subtitle: 'Gas Cylinder',
  iconColor: '#98C576',
  categoryPosition: { left: 719, top: 39 },
  unit: 'KG',
  instructionText: '請先依據購買品項建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選 「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項； 同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'gasCylinderData'
}

// 其他使用能源配置
export const OTHER_ENERGY_SOURCES_CONFIG: MobileEnergyConfig = {
  pageKey: 'other_energy_sources',
  category: 'O',
  title: '其他使用能源',
  subtitle: 'Other Energy Sources',
  iconColor: '#204057',
  categoryPosition: { left: 643, top: 39 },
  unit: 'KG',
  instructionText: '請依據購買品項與單位建立清單；再上傳購買單據，選擇日期、品項、填寫數量，點選 「+新增數據到此群組」，讓一份佐證可對應多張購買單據/多筆品項； 同一份佐證的所有數據新增完成後，請點選 「+新增群組」，以填寫下一份佐證的數據。',
  dataFieldName: 'otherEnergySourcesData'
}
