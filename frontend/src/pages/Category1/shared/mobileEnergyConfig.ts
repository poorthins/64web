/**
 * 移動源能源頁面配置
 *
 * 用於柴油、汽油等移動源能源填報頁面
 * 所有頁面共用相同邏輯，只有這些配置不同
 */

export interface MobileEnergyConfig {
  /** 頁面 key（用於 API） */
  pageKey: 'diesel' | 'gasoline' | 'urea' | 'septic_tank' | 'diesel_generator' | 'generator_test'
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
