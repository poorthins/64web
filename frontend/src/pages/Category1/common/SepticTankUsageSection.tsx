/**
 * SepticTankUsageSection - 化糞池頁面使用數據編輯區
 *
 * 包含：
 * - 使用數據標題
 * - 佐證文件上傳區（左側）
 * - 輸入表單（右側）- 月份選擇 + 工時
 * - 新增數據按鈕
 * - 保存群組按鈕
 *
 * 類似 MobileEnergyUsageSection 但使用月份和工時輸入
 */

import { Trash2 } from 'lucide-react'
import { FileDropzone } from '../../../components/FileDropzone'
import { MonthHoursInputRow } from '../../../components/energy/MonthHoursInputRow'
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../utils/energy/fileTypeDetector'
import { createMemoryFile } from '../../../utils/fileUploadHelpers'
import type { MemoryFile } from '../../../utils/documentHandler'
import { LAYOUT_CONSTANTS } from './mobileEnergyConstants'

// ⭐ 化糞池專用記錄類型
export interface SepticTankRecord {
  id: string
  month: number          // 1-12 月份
  hours: number          // 工時
  evidenceFiles: any[]
  memoryFiles: MemoryFile[]
  groupId?: string
}

export interface SepticTankCurrentEditingGroup {
  groupId: string | null
  records: SepticTankRecord[]
  memoryFiles: MemoryFile[]
}

export interface SepticTankUsageSectionProps {
  // 權限
  isReadOnly: boolean
  submitting: boolean
  approvalStatus: { isApproved: boolean }
  editPermissions: { canUploadFiles: boolean }

  // 狀態
  currentEditingGroup: SepticTankCurrentEditingGroup
  setCurrentEditingGroup: (value: SepticTankCurrentEditingGroup | ((prev: SepticTankCurrentEditingGroup) => SepticTankCurrentEditingGroup)) => void

  // 操作
  addRecordToCurrentGroup: () => void
  updateCurrentGroupRecord: (id: string, field: 'month' | 'hours', value: any) => void
  removeRecordFromCurrentGroup: (id: string) => void
  saveCurrentGroup: () => void

  // 檔案相關
  thumbnails: Record<string, string>
  onPreviewImage: (src: string) => void
  onError: (msg: string) => void
  onDeleteEvidence?: (fileId: string) => void

  // 樣式
  iconColor: string
}

export function SepticTankUsageSection(props: SepticTankUsageSectionProps) {
  const {
    isReadOnly,
    submitting,
    approvalStatus,
    editPermissions,
    currentEditingGroup,
    setCurrentEditingGroup,
    addRecordToCurrentGroup,
    updateCurrentGroupRecord,
    removeRecordFromCurrentGroup,
    saveCurrentGroup,
    thumbnails,
    onPreviewImage,
    onError,
    onDeleteEvidence,
    iconColor
  } = props

  return (
    <>
      {/* 使用數據標題 - icon 距離左邊界 367px，在說明文字下方 103px */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Database Icon */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconColor }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          {/* 標題文字 */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              使用數據
            </h3>
          </div>
        </div>
      </div>

      {/* ==================== 使用數據區塊 - 標題底部往下 34px，頁面置中 ==================== */}
      <div style={{ marginTop: `${LAYOUT_CONSTANTS.SECTION_BOTTOM_MARGIN}px`, marginBottom: '32px' }} className="flex justify-center">
        <div
          className="bg-[#ebedf0] rounded-[37px]"
          style={{
            width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH}px`,
            minHeight: `${LAYOUT_CONSTANTS.CONTAINER_MIN_HEIGHT}px`,
            flexShrink: 0,
            padding: '38px 0 38px 49px'
          }}
        >
          {/* 標題區 - 358px × 73px，文字靠左上對齊 */}
          <div style={{
            width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px`,
            height: '73px',
            marginBottom: '0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start'
          }}>
            <h4 className="text-[24px] font-bold" style={{ lineHeight: '1.2', marginBottom: '8px', color: '#000' }}>佐證文件</h4>
            <p className="text-[18px] text-gray-500" style={{ lineHeight: '1.2' }}>* 年度人員出勤月報表</p>
          </div>

          {/* 框框容器 */}
          <div className="flex" style={{ gap: `${LAYOUT_CONSTANTS.EDITOR_GAP}px`, alignItems: 'flex-start' }}>
            {/* 左側：佐證上傳區 */}
            <div style={{ width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px` }} className="flex-shrink-0">
              {/* 使用 FileDropzone 元件 */}
              <FileDropzone
                width={`${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px`}
                height={`${LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT}px`}
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple={false}
                onFileSelect={(files) => {
                  if (!isReadOnly && !submitting && !approvalStatus.isApproved && editPermissions.canUploadFiles) {
                    // 檢查數量限制
                    if (currentEditingGroup.memoryFiles.length >= 1) {
                      onError('已達到最大檔案數量限制 (1 個)')
                      return
                    }

                    // 建立 MemoryFile
                    const file = files[0]
                    const memoryFile = createMemoryFile(file)

                    // 更新 memoryFiles
                    setCurrentEditingGroup(prev => ({
                      ...prev,
                      memoryFiles: [memoryFile]
                    }))
                  }
                }}
                disabled={isReadOnly || submitting || approvalStatus.isApproved || !editPermissions.canUploadFiles}
                readOnly={isReadOnly || submitting || approvalStatus.isApproved}
                file={currentEditingGroup.memoryFiles[0] || null}
                onRemove={() => {
                  setCurrentEditingGroup(prev => ({
                    ...prev,
                    memoryFiles: []
                  }))
                }}
                showFileActions={!isReadOnly && !approvalStatus.isApproved && editPermissions.canUploadFiles}
                onFileClick={(file) => {
                  if (file.preview) {
                    onPreviewImage(file.preview)
                  }
                }}
                primaryText="點擊或拖放檔案暫存"
                secondaryText="支援所有檔案格式，最大 10MB"
              />

              {/* 已儲存的佐證檔案（可刪除） */}
              {currentEditingGroup.records[0]?.evidenceFiles && currentEditingGroup.records[0].evidenceFiles.length > 0 && (
                <div style={{ marginTop: '19px', width: '358px' }}>
                  {currentEditingGroup.records[0].evidenceFiles.map((file: any) => {
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
                            {file.file_name || file.fileName || '未命名檔案'}
                          </p>
                          <p className="text-[12px] text-gray-500">
                            {file.file_size ? (file.file_size / 1024).toFixed(1) : '0.0'} KB
                          </p>
                        </div>

                        {/* 刪除按鈕 */}
                        <button
                          onClick={() => {
                            // ⭐ 標記檔案為待刪除（審核模式）
                            if (onDeleteEvidence) {
                              onDeleteEvidence(file.id)
                            }
                            // ⭐ 修正：從當前編輯群組的**所有記錄**移除檔案（Type 2 共用佐證）
                            setCurrentEditingGroup(prev => ({
                              ...prev,
                              records: prev.records.map((record) => ({
                                ...record,
                                evidenceFiles: record.evidenceFiles?.filter((f: any) => f.id !== file.id) || []
                              }))
                            }))
                          }}
                          disabled={isReadOnly || approvalStatus.isApproved}
                          className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="刪除檔案"
                        >
                          <Trash2 style={{ width: '32px', height: '32px' }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 右側：輸入表單區域（含按鈕） */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 輸入表單 - 完整框框 - 動態高度 */}
              <div
                style={{
                  width: `${LAYOUT_CONSTANTS.EDITOR_FORM_WIDTH}px`,
                  minHeight: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT}px`,
                  borderRadius: '30px',
                  overflow: 'hidden'
                }}
              >
              {/* 表頭 - 藍色區域 58px */}
              <div className="flex items-center" style={{ backgroundColor: iconColor, height: `${LAYOUT_CONSTANTS.EDITOR_FORM_HEADER_HEIGHT}px`, paddingLeft: '43px', paddingRight: '16px' }}>
                <div style={{ width: '199px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-white text-[20px] font-medium">月份</span>
                </div>
                <div style={{ width: '27px' }}></div>
                <div style={{ width: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-white text-[20px] font-medium">工時 (小時)</span>
                </div>
                <div style={{ width: '40px' }}></div> {/* 刪除按鈕空間 */}
              </div>

              {/* 輸入行 - 白色區域 - 動態高度 */}
              <div className="bg-white" style={{ minHeight: '250px', paddingLeft: '43px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {currentEditingGroup.records.map((record) => (
                  <MonthHoursInputRow
                    key={record.id}
                    recordId={record.id}
                    month={record.month}
                    hours={record.hours}
                    onUpdate={updateCurrentGroupRecord}
                    onDelete={removeRecordFromCurrentGroup}
                    showDelete={currentEditingGroup.records.length > 1}
                    disabled={isReadOnly || approvalStatus.isApproved}
                  />
                ))}
                </div>
              </div>
            </div>

            {/* 新增數據按鈕 */}
            <button
              onClick={addRecordToCurrentGroup}
              disabled={isReadOnly || approvalStatus.isApproved}
              style={{
                marginTop: '35px',
                width: '599px',
                height: '46px',
                flexShrink: 0,
                background: iconColor,
                border: 'none',
                borderRadius: '5px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#FFF',
                textAlign: 'center',
                fontFamily: 'var(--sds-typography-body-font-family)',
                fontSize: '20px',
                fontStyle: 'normal',
                fontWeight: 400,
                lineHeight: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="hover:opacity-90"
            >
              + 新增數據到此群組
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* 保存群組按鈕 - 灰色框框下方 46px */}
      <div className="flex justify-center" style={{ marginTop: '46px' }}>
        <button
          onClick={saveCurrentGroup}
          style={{
            width: '237px',
            height: '46.25px',
            flexShrink: 0,
            borderRadius: '7px',
            border: '1px solid rgba(0, 0, 0, 0.50)',
            background: '#000',
            boxShadow: '0 4px 4px 0 rgba(0, 0, 0, 0.25)',
            cursor: 'pointer',
            color: '#FFF',
            textAlign: 'center',
            fontFamily: 'var(--sds-typography-body-font-family)',
            fontSize: '20px',
            fontStyle: 'normal',
            fontWeight: 'var(--sds-typography-body-font-weight-regular)',
            lineHeight: '100%'
          }}
        >
          {currentEditingGroup.groupId === null ? '+ 新增群組' : '變更儲存'}
        </button>
      </div>
    </>
  )
}