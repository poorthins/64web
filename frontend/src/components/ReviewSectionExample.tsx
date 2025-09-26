import React from 'react'
import ReviewSection from './ReviewSection'

/**
 * ReviewSection 使用範例
 *
 * 此元件展示如何在不同的填報頁面中整合 ReviewSection
 */

// 範例 1: 基本使用方式
const BasicUsageExample: React.FC = () => {
  const handleApprove = () => {
    console.log('審核通過回調')
    // 可以在這裡執行額外的邏輯，如重新載入資料、顯示通知等
  }

  const handleReject = (reason: string) => {
    console.log('審核退回回調:', reason)
    // 可以在這裡執行額外的邏輯
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">基本使用範例</h2>

      {/* 原本的填報表單內容 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">WD-40 使用量填報</h3>
        <p>數量: 10 瓶</p>
        <p>期間: 2024-03-01 ~ 2024-03-31</p>
      </div>

      {/* 插入審核區塊 */}
      <ReviewSection
        entryId="entry_12345"
        userId="user_67890"
        category="WD-40"
        userName="張三"
        amount={10}
        unit="瓶"
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}

// 範例 2: 在現有填報頁面中整合
const IntegrationExample: React.FC = () => {
  // 假設這些資料來自現有的填報頁面狀態
  const entryData = {
    id: 'diesel_entry_001',
    userId: 'user_001',
    category: '柴油',
    userName: '李四',
    amount: 1500,
    unit: '公升'
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">柴油使用量填報</h1>

      {/* 原有的填報表單 */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">填報資料</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              使用量
            </label>
            <input
              type="number"
              value={entryData.amount}
              className="w-full p-2 border rounded-md"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              單位
            </label>
            <input
              type="text"
              value={entryData.unit}
              className="w-full p-2 border rounded-md"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* 審核區塊 - 只在 mode=review 時顯示 */}
      <ReviewSection
        entryId={entryData.id}
        userId={entryData.userId}
        category={entryData.category}
        userName={entryData.userName}
        amount={entryData.amount}
        unit={entryData.unit}
        onApprove={() => {
          console.log('柴油填報審核通過')
          // 可以重新載入頁面或顯示成功訊息
        }}
        onReject={(reason) => {
          console.log('柴油填報被退回:', reason)
          // 可以顯示退回訊息給用戶
        }}
      />
    </div>
  )
}

// 範例 3: 自定義樣式
const CustomStyleExample: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">自定義樣式範例</h2>

      <ReviewSection
        entryId="custom_entry_001"
        userId="user_001"
        category="天然氣"
        userName="王五"
        amount={2500}
        unit="立方公尺"
        className="border-l-4 border-l-blue-500" // 自定義樣式
        onApprove={() => console.log('自定義樣式 - 審核通過')}
        onReject={(reason) => console.log('自定義樣式 - 審核退回:', reason)}
      />
    </div>
  )
}

// 主要範例元件
const ReviewSectionExamples: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto py-8 space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ReviewSection 元件使用範例
          </h1>
          <p className="text-gray-600">
            在 URL 後加上 <code className="bg-gray-200 px-2 py-1 rounded">?mode=review</code> 來查看審核功能
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <BasicUsageExample />
        </div>

        <div className="bg-white rounded-lg shadow">
          <IntegrationExample />
        </div>

        <div className="bg-white rounded-lg shadow">
          <CustomStyleExample />
        </div>
      </div>
    </div>
  )
}

export default ReviewSectionExamples