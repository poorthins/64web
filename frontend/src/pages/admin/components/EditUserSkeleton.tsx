import React from 'react';
import { LoadingSkeleton } from './LoadingSkeleton';

export const EditUserSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="flex">
      {/* 主要表單區域 */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl">
          <div className="mb-6">
            <LoadingSkeleton height="h-4" width="w-20" className="mb-4" />
            <LoadingSkeleton height="h-8" width="w-32" className="mb-2" />
            <LoadingSkeleton height="h-5" width="w-48" />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            {/* 基本資料 */}
            <div className="border-b border-gray-200 pb-6">
              <LoadingSkeleton height="h-6" width="w-24" className="mb-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index}>
                    <LoadingSkeleton height="h-4" width="w-16" className="mb-2" />
                    <LoadingSkeleton height="h-10" />
                  </div>
                ))}
              </div>
            </div>

            {/* 能源類別選擇 */}
            <div className="border-b border-gray-200 pb-6">
              <LoadingSkeleton height="h-6" width="w-32" className="mb-4" />

              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <LoadingSkeleton height="h-5" width="w-20" className="mb-3" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Array.from({ length: 6 }).map((_, checkboxIndex) => (
                        <div key={checkboxIndex} className="flex items-center space-x-2">
                          <LoadingSkeleton height="h-4" width="w-4" />
                          <LoadingSkeleton height="h-4" width="w-20" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 提交按鈕 */}
            <div className="flex items-center justify-between pt-6">
              <LoadingSkeleton height="h-10" width="w-16" />
              <LoadingSkeleton height="h-10" width="w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* 側邊欄 */}
      <div className="w-80 bg-white border-l border-gray-200 p-6">
        <div className="space-y-6">
          {/* 用戶狀態 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <LoadingSkeleton height="h-5" width="w-20" className="mb-3" />

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <LoadingSkeleton height="h-4" width="w-16" />
                  <LoadingSkeleton height="h-4" width="w-20" />
                </div>
              ))}
            </div>
          </div>

          {/* 快速統計 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <LoadingSkeleton height="h-5" width="w-20" className="mb-3" />

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <LoadingSkeleton height="h-4" width="w-16" />
                  <LoadingSkeleton height="h-4" width="w-8" />
                </div>
              ))}
            </div>
          </div>

          {/* 資料匯出 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <LoadingSkeleton height="h-5" width="w-20" className="mb-3" />

            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <LoadingSkeleton key={index} height="h-8" />
              ))}
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <LoadingSkeleton height="h-5" width="w-20" className="mb-3" />

            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <LoadingSkeleton key={index} height="h-8" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);