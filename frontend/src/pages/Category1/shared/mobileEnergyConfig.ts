/**
 * 移動源能源頁面配置
 *
 * 用於柴油、汽油等移動源能源填報頁面
 * 所有頁面共用相同邏輯，只有這些配置不同
 */

export interface MobileEnergyConfig {
  /** 頁面 key（用於 API） */
  pageKey: 'diesel' | 'gasoline'
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
