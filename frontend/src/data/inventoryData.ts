export interface InventoryItem {
  id: string
  name: string
  description: string
  requiredDocuments: string[]
  scope: 1 | 2 | 3
  route: string
  exampleImages: string[]  // 佐證範例圖片路徑
}

export const inventoryItems: InventoryItem[] = [
  {
    id: 'lpg',
    name: '液化石油氣/瓦斯 (LPG)',
    description: '工業與民生常用燃料,燃燒過程會排放二氧化碳 (CO₂)。',
    requiredDocuments: [
      '有公司章的重量證明文件',
      '購買單據 *需有年月日'
    ],
    scope: 1,
    route: '/app/lpg',
    exampleImages: ['/佐證/液化石油氣.jpg']
  },
  {
    id: 'natural_gas',
    name: '天然氣',
    description: '清潔能源，燃燒過程會產生二氧化碳，但排放量相對較低。',
    requiredDocuments: [
      '熱值報表等佐證文件',
      '繳費單據'
    ],
    scope: 1,
    route: '/app/natural_gas',
    exampleImages: ['/佐證/天然氣熱值佐證文件.png', '/佐證/天然氣繳費證明.png']
  },
  {
    id: 'generator',
    name: '發電機測試資料',
    description: '為設備運轉或保養時進行的例行測試。',
    requiredDocuments: [
      '設備銘牌照片'
    ],
    scope: 1,
    route: '/app/diesel_generator',
    exampleImages: ['/佐證/柴油(發電機)1.jpg', '/佐證/柴油(發電機)2.jpg', '/佐證/柴油(發電機)3.jpg']
  },
  {
    id: 'diesel_stationary',
    name: '柴油(固定源)',
    description: '發電機、鍋爐、蓄熱式焚化爐常用燃料，燃燒過程會產生二氧化碳與氮氧化物。',
    requiredDocuments: [
      '加油單據 *需有年月日'
    ],
    scope: 1,
    route: '/app/diesel_generator',
    exampleImages: ['/佐證/柴油(發電機)1.jpg']
  },
  {
    id: 'diesel_mobile',
    name: '柴油(移動源)',
    description: '車輛與移動設備常用燃料，燃燒過程產生溫室氣體排放。',
    requiredDocuments: [
      '加油單據 *需有年月日'
    ],
    scope: 1,
    route: '/app/diesel',
    exampleImages: ['/佐證/柴油(移動源)1.png', '/佐證/柴油(移動源)2.jpg']
  },
  {
    id: 'gasoline',
    name: '汽油',
    description: '汽車與小型機具常用燃料，燃燒過程產生二氧化碳排放。',
    requiredDocuments: [
      '加油單據 *需有年月日'
    ],
    scope: 1,
    route: '/app/gasoline',
    exampleImages: ['/佐證/汽油.jpg']
  },
  {
    id: 'other_fuel',
    name: '其他使用能源重油 / 燃料油 / 煤',
    description: '鍋爐、窯爐或發電設備常用燃料，燃燒過程會產生二氧化碳等溫室氣體排放。',
    requiredDocuments: [
      '加油單據 *需有年月日'
    ],
    scope: 1,
    route: '/app/other_fuel',
    exampleImages: ['/佐證/柴油(移動源)1.png']
  },
  {
    id: 'urea',
    name: '尿素',
    description: '柴油車輛排氣處理系統使用，減少氮氧化物排放。*若由中油加注，則免填',
    requiredDocuments: [
      'SDS 安全資料表',
      '添加紀錄佐證 *需有年月日'
    ],
    scope: 1,
    route: '/app/urea',
    exampleImages: ['/佐證/尿素SDS.png', '/佐證/尿素添加紀錄表.png']
  },
  {
    id: 'acetylene',
    name: '乙炔',
    description: '焊接與切割作業常用氣體，使用過程產生燃燒排放。',
    requiredDocuments: [
      '重量證明文件',
      '購買單據'
    ],
    scope: 1,
    route: '/app/acetylene',
    exampleImages: ['/佐證/乙炔重量證明.jpg', '/佐證/乙炔購買單據.png']
  },
  {
    id: 'gas_cylinder',
    name: '氣體鋼瓶',
    description: '儲存各類工業氣體（乙炔、氧氣、氮氣等），使用過程伴隨燃燒或化學反應，產生溫室氣體排放。',
    requiredDocuments: [
      'SDS 安全資料表',
      '重量證明(領用規格紀錄)',
      '購買單據'
    ],
    scope: 1,
    route: '/app/acetylene',
    exampleImages: ['/佐證/氣體鋼瓶SDS.png', '/佐證/氣體鋼瓶重量證明(領用規格紀錄).png', '/佐證/氣體鋼瓶購買單據.png']
  },
  {
    id: 'sf6',
    name: '六氟化硫 SF6',
    description: '高壓電力設備常用絕緣氣體，使用與維修過程可能逸散造成排放。',
    requiredDocuments: [
      'GCB 氣體斷路氣銘牌',
      '重量證明文件',
      '洩漏率證明文件'
    ],
    scope: 1,
    route: '/app/refrigerant',
    exampleImages: ['/佐證/氣體斷路器銘牌.png', '/佐證/SF6填充量、洩漏佐證.png']
  },
  {
    id: 'welding_rod',
    name: '焊條',
    description: '焊接耗材，使用過程伴隨能源消耗並可能產生製程相關排放。',
    requiredDocuments: [
      '含碳率證明文件',
      '重量證明文件',
      '購買單據'
    ],
    scope: 1,
    route: '/app/welding_rod',
    exampleImages: ['/佐證/焊條含碳佐證.jpg', '/佐證/焊條重量證明.jpg', '/佐證/焊條購買單據.jpg']
  },
  {
    id: 'refrigerant',
    name: '冷媒',
    description: '空調與冷凍設備使用，洩漏時會產生高 GWP（全球暖化潛勢）排放。',
    requiredDocuments: [
      '設備銘牌照片',
      '汽車行照'
    ],
    scope: 1,
    route: '/app/refrigerant',
    exampleImages: ['/佐證/冷媒.jpg']
  },
  {
    id: 'wd40',
    name: 'WD-40',
    description: '常用潤滑與清潔劑，含揮發性有機物，使用時會產生逸散排放。',
    requiredDocuments: [
      '容量證明(產品照片)',
      '購買單據'
    ],
    scope: 1,
    route: '/app/wd40',
    exampleImages: ['/佐證/WD40容量證明.jpg', '/佐證/WD40購買單據.png']
  },
  {
    id: 'fire_extinguisher',
    name: '滅火器',
    description: '部分類型含高 GWP 氣體，釋放或洩漏時造成逸散排放。',
    requiredDocuments: [
      '消防安全設備檢修表',
      '購買單據(如有新購入)',
      '銘牌照片(如有新購入)',
      '填充佐證單據(如有新購入)'
    ],
    scope: 1,
    route: '/app/fire_extinguisher',
    exampleImages: ['/佐證/消防安全設備檢修表.jpg', '/佐證/滅火器銘牌照片.jpg', '/佐證/填充佐證單據 (派工單).jpg']
  },
  {
    id: 'septic_tank',
    name: '化糞池(人員工時)',
    description: '化糞池處理過程產生甲烷等溫室氣體排放，需依人員工時計算。',
    requiredDocuments: [
      '出勤月報表'
    ],
    scope: 1,
    route: '/app/septic_tank',
    exampleImages: ['/佐證/出勤月報表.jpg']
  },
  {
    id: 'electricity',
    name: '外購電力',
    description: '日常營運所需電力，使用過程需計入間接排放。',
    requiredDocuments: [
      '電費單'
    ],
    scope: 2,
    route: '/app/electricity',
    exampleImages: ['/佐證/電費單.jpg']
  },
  {
    id: 'employee_commute',
    name: '員工通勤',
    description: '員工日常通勤產生的交通運輸排放。',
    requiredDocuments: [
      '員工通勤_出勤表',
      '員工通勤_員工資料'
    ],
    scope: 3,
    route: '/app/employee_commute',
    exampleImages: ['/佐證/員工通勤_出勤表.jpg', '/佐證/員工通勤_員工資料.jpg']
  }
]

export const inventoryByScope = {
  scope1: inventoryItems.filter(item => item.scope === 1),
  scope2: inventoryItems.filter(item => item.scope === 2),
  scope3: inventoryItems.filter(item => item.scope === 3)
}
