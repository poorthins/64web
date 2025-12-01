/**
 * ElectricityBillSection - 電力帳單編輯區塊
 *
 * 包含：
 * - 使用數據標題
 * - 檔案上傳區域
 * - 帳單表單輸入區
 * - 新增/儲存按鈕
 * - 已保存帳單列表
 */

import { Trash2 } from 'lucide-react'
import { ElectricityBillRecord, ElectricityMeter, BillEditingGroup } from '../../../types/electricityTypes'
import { EvidenceFile } from '../../../api/files'
import { MemoryFile } from '../../../services/documentHandler'
import { FileDropzone } from '../../../components/FileDropzone'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../utils/energy/fileTypeDetector'
import { ElectricityBillInputFields } from './ElectricityBillInputFields'
import { MobileEnergyGroupListSection } from '../../Category1/common/MobileEnergyGroupListSection'

interface ElectricityBillSectionProps {
  // 編輯狀態
  currentEditingGroup: BillEditingGroup
  setCurrentEditingGroup: (group: BillEditingGroup | ((prev: BillEditingGroup) => BillEditingGroup)) => void
  savedGroups: ElectricityBillRecord[]

  // 表號資料
  meters: ElectricityMeter[]

  // 權限
  canEdit: boolean
  isApproved: boolean
  submitting: boolean
  isReadOnly: boolean

  // 事件處理
  onUpdateRecord: (id: string, field: keyof ElectricityBillRecord, value: any) => void
  onDeleteRecord: (id: string) => void
  onAddRecord: () => void
  onEditGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onDeleteEvidence: (fileId: string) => Promise<void>
  onPreviewImage: (src: string) => void

  // 審核狀態
  approvalStatus: any
  isReviewMode: boolean

  // 縮圖
  thumbnails: Record<string, string>
}

export const ElectricityBillSection = ({
  currentEditingGroup,
  setCurrentEditingGroup,
  savedGroups,
  meters,
  canEdit,
  isApproved,
  submitting,
  isReadOnly,
  onUpdateRecord,
  onDeleteRecord,
  onAddRecord,
  onEditGroup,
  onDeleteGroup,
  onDeleteEvidence,
  onPreviewImage,
  approvalStatus,
  isReviewMode,
  thumbnails
}: ElectricityBillSectionProps) => {
  return (
    <div style={{ marginTop: '13.75px' }}>
      {/* 使用數據標題 */}
      <div data-section="bill-editing" style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#60B389' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              使用數據
            </h3>
          </div>
        </div>
      </div>

      {/* 藍色容器框 - 上傳區 + 表單 */}
      <div style={{ marginTop: '34px' }} className="flex justify-center">
        <div
          style={{
            width: '1005px',
            minHeight: '487px',
            borderRadius: '28px',
            border: '1px solid rgba(0, 0, 0, 0.25)',
            background: '#60B389',
            padding: '27px 49px 38px 49px',
            display: 'flex',
            gap: '49px',
            alignItems: 'flex-start'
          }}
        >
          {/* 左側：檔案上傳區 */}
          <div style={{ width: '358px', flexShrink: 0, position: 'relative' }}>
            {/* 繳費單據標籤 */}
            <label style={{
              position: 'absolute',
              top: '0',
              left: '0',
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: 'normal'
            }}>
              繳費單據
            </label>

            {/* 上傳框 */}
            <div style={{ position: 'absolute', top: '41px', left: '0' }}>
              <FileDropzone
                width="358px"
                height="308px"
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple={false}
                onFileSelect={(files) => {
                  if (canEdit && !isApproved) {
                    const file = files[0]
                    const memoryFile = createMemoryFile(file)
                    setCurrentEditingGroup(prev => ({
                      ...prev,
                      memoryFiles: [memoryFile]
                    }))
                  }
                }}
                disabled={
                  !canEdit ||
                  isApproved ||
                  submitting ||
                  currentEditingGroup.memoryFiles.length > 0 ||
                  (currentEditingGroup.records[0]?.evidenceFiles?.length || 0) > 0
                }
                readOnly={!canEdit || isApproved}
                file={currentEditingGroup.memoryFiles[0] || null}
                onRemove={() => {
                  setCurrentEditingGroup(prev => ({
                    ...prev,
                    memoryFiles: []
                  }))
                }}
                showFileActions={canEdit && !isApproved}
                onFileClick={(file) => {
                  if (file.preview) {
                    onPreviewImage(file.preview)
                  }
                }}
                primaryText="點擊或拖放檔案暫存"
                secondaryText="支援所有檔案格式，最大 10MB"
              />

              {/* 已儲存的佐證檔案 */}
              {currentEditingGroup.records[0]?.evidenceFiles && currentEditingGroup.records[0].evidenceFiles.length > 0 && (
                <div style={{ marginTop: '19px', width: '358px' }}>
                  {currentEditingGroup.records[0].evidenceFiles.map((file) => {
                    const isImage = file.mime_type.startsWith('image/')
                    const thumbnailUrl = thumbnails[file.id]

                    return (
                      <div
                        key={file.id}
                        style={{
                          borderRadius: '28px',
                          border: '1px solid rgba(0, 0, 0, 0.25)',
                          background: '#FFF',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '16px 21px',
                          gap: '12px',
                          marginBottom: '12px'
                        }}
                      >
                        {/* 檔案縮圖 */}
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: isImage ? 'pointer' : 'default',
                            background: '#f0f0f0',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onClick={() => {
                            if (isImage && thumbnailUrl) {
                              onPreviewImage(thumbnailUrl)
                            }
                          }}
                        >
                          {isImage && thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={file.file_name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <FileTypeIcon fileType={getFileType(file.mime_type, file.file_name)} size={36} />
                          )}
                        </div>

                        {/* 檔名 */}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[14px] font-medium text-black truncate">
                            {file.file_name}
                          </p>
                          <p className="text-[12px] text-gray-500">
                            {file.file_size ? (file.file_size / 1024).toFixed(1) : '0.0'} KB
                          </p>
                        </div>

                        {/* 刪除按鈕 */}
                        {canEdit && !isApproved && (
                          <button
                            onClick={() => {
                              onDeleteEvidence(file.id)

                              setCurrentEditingGroup(prev => ({
                                ...prev,
                                records: prev.records.map((r, idx) => {
                                  if (idx === 0 && r.evidenceFiles) {
                                    return {
                                      ...r,
                                      evidenceFiles: r.evidenceFiles.filter(f => f.id !== file.id)
                                    }
                                  }
                                  return r
                                })
                              }))
                            }}
                            className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="刪除檔案"
                          >
                            <Trash2 style={{ width: '32px', height: '32px' }} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 右側：表單區域 */}
          <div style={{ flex: 1 }}>
            <ElectricityBillInputFields
              currentGroup={currentEditingGroup}
              onUpdate={onUpdateRecord}
              onDelete={onDeleteRecord}
              meters={meters}
              isReadOnly={isReadOnly || (isApproved && !isReviewMode)}
            />
          </div>
        </div>
      </div>

      {/* 新增下一筆資料 / 儲存變更按鈕 */}
      <div style={{ marginTop: '46px' }} className="flex justify-center">
        <button
          onClick={onAddRecord}
          disabled={!canEdit && !isApproved}
          style={{
            width: '227px',
            height: '52px',
            borderRadius: '8px',
            background: '#000',
            border: 'none',
            color: '#FFF',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            cursor: (canEdit || isApproved) ? 'pointer' : 'not-allowed',
            opacity: (canEdit || isApproved) ? 1 : 0.5,
            transition: 'background 0.2s, opacity 0.2s'
          }}
          className="hover:opacity-80"
        >
          {currentEditingGroup.groupId ? '儲存變更' : '+ 新增下一筆資料'}
        </button>
      </div>

      {/* 已保存帳單列表 */}
      {savedGroups.length > 0 && (
        <div style={{ marginTop: '34px' }}>
          <MobileEnergyGroupListSection
            savedGroups={savedGroups as any}
            thumbnails={thumbnails}
            isReadOnly={isReadOnly}
            approvalStatus={approvalStatus}
            isReviewMode={isReviewMode}
            onEditGroup={onEditGroup}
            onDeleteGroup={onDeleteGroup}
            onPreviewImage={onPreviewImage}
            iconColor="#60B389"
          />
        </div>
      )}
    </div>
  )
}
