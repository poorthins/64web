/**
 * MobileEnergyUsageSection - 移動源能源頁面使用數據編輯區
 *
 * 包含：
 * - 使用數據標題
 * - 佐證文件上傳區（左側）
 * - 輸入表單（右側）
 * - 新增數據按鈕
 * - 保存群組按鈕
 */

import { Trash2 } from 'lucide-react'
import { FileDropzone } from '../../../../../components/FileDropzone'
import { RecordInputRow } from '../../../../../components/energy/RecordInputRow'
import { FileTypeIcon } from '../../../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../../../utils/energy/fileTypeDetector'
import type { MemoryFile } from '../../../../../services/documentHandler'
import { CurrentEditingGroup } from '../mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from '../mobileEnergyConstants'
import type { MobileEnergyConfig } from '../../mobileEnergyConfig'

export interface MobileEnergyUsageSectionProps {
  // 權限
  isReadOnly: boolean
  submitting: boolean
  approvalStatus: { isApproved: boolean }
  editPermissions: { canUploadFiles: boolean }

  // 狀態
  currentEditingGroup: CurrentEditingGroup
  setCurrentEditingGroup: (value: CurrentEditingGroup | ((prev: CurrentEditingGroup) => CurrentEditingGroup)) => void

  // 操作
  addRecordToCurrentGroup: () => void
  updateCurrentGroupRecord: (id: string, field: 'date' | 'quantity', value: any) => void
  removeRecordFromCurrentGroup: (id: string) => void
  saveCurrentGroup: () => void

  // 檔案相關
  thumbnails: Record<string, string>
  onPreviewImage: (src: string) => void
  onError: (msg: string) => void
  onDeleteEvidence?: (fileId: string) => void  // 刪除已上傳的檔案

  // 樣式
  iconColor: string

  // 柴油發電機專用：設備類型選單
  config?: MobileEnergyConfig
  deviceType?: string
  customDeviceType?: string
  onDeviceTypeChange?: (type: string) => void
  onCustomDeviceTypeChange?: (value: string) => void

  // ⭐ FileDropzone 尺寸配置（可選，預設使用 LAYOUT_CONSTANTS）
  dropzoneWidth?: number   // 預設 358px
  dropzoneHeight?: number  // 預設 308px

  // ⭐ 可配置外觀（可選）
  title?: string           // 標題文字，預設「使用數據」
  icon?: React.ReactNode   // 標題 icon，預設 Database icon
  renderInputFields?: (props: {
    currentGroup: CurrentEditingGroup
    onUpdate: (id: string, field: 'date' | 'quantity', value: any) => void
    onDelete: (id: string) => void
    isReadOnly: boolean
  }) => React.ReactNode     // 自訂輸入欄位，預設 RecordInputRow
  saveButtonText?: string  // 保存按鈕文字，預設「+ 新增群組」/「變更儲存」
  saveButtonNewText?: string  // 新增模式按鈕文字，預設「+ 新增群組」
}

// ==================== 預設值定義 ====================
const DEFAULT_TITLE = '使用數據'

const DEFAULT_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
    <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export function MobileEnergyUsageSection(props: MobileEnergyUsageSectionProps) {
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
    iconColor,
    config,
    deviceType,
    customDeviceType,
    onDeviceTypeChange,
    onCustomDeviceTypeChange,
    dropzoneWidth = LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH,   // ⭐ 預設 358
    dropzoneHeight = LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT,  // ⭐ 預設 308
    title = DEFAULT_TITLE,                                  // ⭐ 預設「使用數據」
    icon = DEFAULT_ICON,                                    // ⭐ 預設 Database icon
    renderInputFields,                                      // ⭐ 預設為 undefined，後面處理
    saveButtonNewText = '+ 新增群組',                        // ⭐ 預設「+ 新增群組」
    saveButtonText = '變更儲存'                              // ⭐ 預設「變更儲存」
  } = props

  return (
    <>
      {/* 使用數據標題 - icon 距離左邊界 367px，在說明文字下方 103px */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Icon（可配置） */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconColor }}>
            {icon}
          </div>

          {/* 標題文字（可配置） */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              {title}
            </h3>
          </div>
        </div>
      </div>

      {/* ==================== 設備項目選單（柴油發電機專用）==================== */}
      {config?.requiresDeviceType && (
        <div style={{ marginTop: '20px' }} className="flex justify-center">
          <div
            style={{
              width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH}px`,
              minHeight: '174px',
              flexShrink: 0,
              borderRadius: '37px',
              background: '#18C7A0',
              paddingTop: '36px',
              paddingLeft: '47px',
              paddingRight: '49px',
              paddingBottom: '45px',
              display: 'flex',
              flexDirection: 'column',
              gap: '21px'
            }}
          >
            {/* 標題 */}
            <h4 style={{
              width: '194px',
              flexShrink: 0,
              color: '#000',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontStyle: 'normal',
              fontWeight: 400,
              lineHeight: 'normal',
              margin: 0
            }}>
              設備項目
            </h4>

            {/* 下拉選單 */}
            <select
              value={deviceType || ''}
              onChange={(e) => onDeviceTypeChange?.(e.target.value)}
              disabled={isReadOnly || submitting || approvalStatus.isApproved}
              style={{
                width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH - 96}px`,
                height: '52px',
                flexShrink: 0,
                border: '1px solid rgba(0, 0, 0, 0.25)',
                background: '#FFF',
                borderRadius: '8px',
                padding: '0 16px',
                fontSize: '18px',
                fontFamily: 'Inter',
                color: '#000'
              }}
            >
              <option value="">請選擇設備類型</option>
              <option value="發電機">發電機</option>
              <option value="鍋爐">鍋爐</option>
              <option value="蓄熱式焚化爐">蓄熱式焚化爐</option>
              <option value="其他">其他項目</option>
            </select>

            {/* 其他項目自訂輸入框 */}
            {deviceType === '其他' && (
              <input
                type="text"
                value={customDeviceType || ''}
                onChange={(e) => onCustomDeviceTypeChange?.(e.target.value)}
                placeholder="請輸入設備類型"
                disabled={isReadOnly || submitting || approvalStatus.isApproved}
                style={{
                  width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH - 96}px`,
                  height: '52px',
                  flexShrink: 0,
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  background: '#FFF',
                  borderRadius: '8px',
                  padding: '0 16px',
                  fontSize: '18px',
                  fontFamily: 'Inter',
                  color: '#000'
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ==================== 使用數據區塊 - 標題底部往下 34px，頁面置中 ==================== */}
      <div style={{ marginTop: `${LAYOUT_CONSTANTS.SECTION_BOTTOM_MARGIN}px`, marginBottom: '32px' }} className="flex justify-center">
        {/* 自訂模式：不需要外層灰色框，直接渲染內容 */}
        {renderInputFields ? (
          <div className="flex" style={{
            gap: `${LAYOUT_CONSTANTS.EDITOR_GAP}px`,
            alignItems: 'flex-start',
            justifyContent: 'center'
          }}>
            {/* 右側：輸入表單區域（含按鈕） */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {renderInputFields({
                currentGroup: currentEditingGroup,
                onUpdate: updateCurrentGroupRecord,
                onDelete: removeRecordFromCurrentGroup,
                isReadOnly: isReadOnly || approvalStatus.isApproved
              })}
            </div>
          </div>
        ) : (
          /* 預設模式：有外層灰色框 */
          <div
            className="bg-[#ebedf0] rounded-[37px]"
            style={{
              width: `${LAYOUT_CONSTANTS.CONTAINER_WIDTH}px`,
              minHeight: `${LAYOUT_CONSTANTS.CONTAINER_MIN_HEIGHT}px`,
              flexShrink: 0,
              padding: '38px 0 38px 49px'
            }}
          >
            {/* 標題區 - 文字靠左上對齊 */}
            <div style={{
              width: `${dropzoneWidth}px`,
              height: '73px',
              marginBottom: '0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start'
            }}>
            </div>

            {/* 框框容器 */}
            <div className="flex" style={{
              gap: `${LAYOUT_CONSTANTS.EDITOR_GAP}px`,
              alignItems: 'flex-start',
              justifyContent: 'flex-start'
            }}>
            {/* 左側：佐證上傳區 */}
            <div style={{ width: `${dropzoneWidth}px` }} className="flex-shrink-0">
                {/* 使用 FileDropzone 元件 */}
                <FileDropzone
                width={`${dropzoneWidth}px`}
                height={`${dropzoneHeight}px`}
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple={false}
                onFileSelect={(files) => {
                  if (!isReadOnly && !submitting && !approvalStatus.isApproved && editPermissions.canUploadFiles) {
                    // 建立 MemoryFile
                    const file = files[0]
                    let preview = ''
                    if (file.type.startsWith('image/')) {
                      preview = URL.createObjectURL(file)
                    }

                    const memoryFile: MemoryFile = {
                      id: `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      file,
                      preview,
                      file_name: file.name,
                      file_size: file.size,
                      mime_type: file.type
                    }

                    // 更新 memoryFiles
                    setCurrentEditingGroup(prev => ({
                      ...prev,
                      memoryFiles: [memoryFile]
                    }))
                  }
                }}
                disabled={
                  isReadOnly ||
                  submitting ||
                  approvalStatus.isApproved ||
                  !editPermissions.canUploadFiles
                }
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
                <div style={{ marginTop: '19px', width: `${dropzoneWidth}px` }}>
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
                            <FileTypeIcon fileType={getFileType(file.mime_type, file.file_name)} size={24} />
                          )}
                        </div>

                        {/* 檔名 */}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[14px] font-medium text-black truncate">{file.file_name}</p>
                          <p className="text-[12px] text-gray-500">{(file.file_size / 1024).toFixed(1)} KB</p>
                        </div>

                        {/* 刪除按鈕 */}
                        <button
                          onClick={() => {
                            // 記錄要刪除的檔案 ID（給父組件處理實際刪除）
                            if (onDeleteEvidence) {
                              onDeleteEvidence(file.id)
                            }

                            // 從當前編輯群組的第一筆記錄移除檔案（UI 更新）
                            setCurrentEditingGroup(prev => ({
                              ...prev,
                              records: prev.records.map((record, idx) => {
                                if (idx === 0) {
                                  return {
                                    ...record,
                                    evidenceFiles: record.evidenceFiles?.filter(f => f.id !== file.id) || []
                                  }
                                }
                                return record
                              })
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
              {/* 表頭 + RecordInputRow（有固定尺寸容器） */}
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
                    <span className="text-white text-[20px] font-medium">加油日期</span>
                  </div>
                  <div style={{ width: '27px' }}></div>
                  <div style={{ width: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="text-white text-[20px] font-medium">加油量 (L)</span>
                  </div>
                  <div style={{ width: '40px' }}></div> {/* 刪除按鈕空間 */}
                </div>

                {/* 輸入行 - 白色區域 - 動態高度 */}
                <div className="bg-white" style={{ minHeight: '250px', paddingLeft: '43px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {currentEditingGroup.records.map((record) => (
                    <RecordInputRow
                      key={record.id}
                      recordId={record.id}
                      date={record.date}
                      quantity={record.quantity}
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
        )}
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
          {currentEditingGroup.groupId === null ? saveButtonNewText : saveButtonText}
        </button>
      </div>
    </>
  )
}