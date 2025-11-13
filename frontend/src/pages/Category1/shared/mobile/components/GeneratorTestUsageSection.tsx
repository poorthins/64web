/**
 * GeneratorTestUsageSection - 發電機測試資料編輯區
 *
 * 包含：
 * - 使用數據標題
 * - 佐證文件上傳區（左側）
 * - 輸入表單（右側）- 位置、功率、頻率、時間
 * - 新增數據按鈕
 * - 保存群組按鈕
 */

import { Trash2 } from 'lucide-react'
import { FileDropzone } from '../../../../../components/FileDropzone'
import { FileTypeIcon } from '../../../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../../../utils/energy/fileTypeDetector'
import type { MemoryFile } from '../../../../../services/documentHandler'
import { GeneratorTestEditingGroup } from '../mobileEnergyTypes'
import { LAYOUT_CONSTANTS } from '../mobileEnergyConstants'

export interface GeneratorTestUsageSectionProps {
  // 權限
  isReadOnly: boolean
  submitting: boolean
  approvalStatus: { isApproved: boolean }
  editPermissions: { canUploadFiles: boolean }

  // 狀態
  currentEditingGroup: GeneratorTestEditingGroup
  setCurrentEditingGroup: (value: GeneratorTestEditingGroup | ((prev: GeneratorTestEditingGroup) => GeneratorTestEditingGroup)) => void

  // 操作
  updateCurrentGroupRecord: (id: string, field: 'location' | 'generatorPower' | 'testFrequency' | 'testDuration', value: any) => void
  saveCurrentGroup: () => void

  // 檔案相關
  thumbnails: Record<string, string>
  onPreviewImage: (src: string) => void
  onError: (msg: string) => void

  // 樣式
  iconColor: string
}

export function GeneratorTestUsageSection(props: GeneratorTestUsageSectionProps) {
  const {
    isReadOnly,
    submitting,
    approvalStatus,
    editPermissions,
    currentEditingGroup,
    setCurrentEditingGroup,
    updateCurrentGroupRecord,
    saveCurrentGroup,
    thumbnails,
    onPreviewImage,
    onError,
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
              發電機測試資料
            </h3>
          </div>
        </div>
      </div>

      {/* ==================== 使用數據區塊 - 標題底部往下 34px，頁面置中 ==================== */}
      <div style={{ marginTop: `${LAYOUT_CONSTANTS.SECTION_BOTTOM_MARGIN}px`, marginBottom: '32px' }} className="flex justify-center">
        <div
          className="bg-[#ebedf0] rounded-[37px]"
          style={{
            width: '1005px',
            height: '500px',
            flexShrink: 0,
            padding: '38px 49px'
          }}
        >
          {/* 框框容器 - 左右分欄 */}
          <div className="flex" style={{ gap: '91px', alignItems: 'flex-start' }}>
            {/* 左側：輸入欄位垂直排列 */}
            <div style={{ width: '352px' }} className="flex-shrink-0">
              {currentEditingGroup.records.map((record) => (
                <div key={record.id} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* 發電機位置 */}
                  <div>
                    <label className="block text-[18px] font-medium mb-2" style={{ color: '#000' }}>
                      發電機位置
                    </label>
                    <input
                      type="text"
                      value={record.location}
                      onChange={(e) => updateCurrentGroupRecord(record.id, 'location', e.target.value)}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      placeholder="例：一樓機房、地下室"
                      style={{
                        width: '352px',
                        height: '52px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        padding: '0 16px',
                        fontSize: '16px',
                        fontFamily: 'Inter',
                        color: '#000'
                      }}
                    />
                  </div>

                  {/* 發電功率 */}
                  <div>
                    <label className="block text-[18px] font-medium mb-2" style={{ color: '#000' }}>
                      發電功率 (kW)
                    </label>
                    <input
                      type="number"
                      value={record.generatorPower || ''}
                      onChange={(e) => updateCurrentGroupRecord(record.id, 'generatorPower', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      placeholder="輸入功率"
                      min="0"
                      step="0.1"
                      style={{
                        width: '352px',
                        height: '52px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        padding: '0 16px',
                        fontSize: '16px',
                        fontFamily: 'Inter',
                        color: '#000'
                      }}
                    />
                  </div>

                  {/* 發動測試頻率 */}
                  <div>
                    <label className="block text-[18px] font-medium mb-2" style={{ color: '#000' }}>
                      發動測試頻率 (次/年)
                    </label>
                    <input
                      type="number"
                      value={record.testFrequency || ''}
                      onChange={(e) => updateCurrentGroupRecord(record.id, 'testFrequency', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      placeholder="輸入頻率"
                      min="0"
                      step="1"
                      style={{
                        width: '352px',
                        height: '52px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        padding: '0 16px',
                        fontSize: '16px',
                        fontFamily: 'Inter',
                        color: '#000'
                      }}
                    />
                  </div>

                  {/* 測試時間 */}
                  <div>
                    <label className="block text-[18px] font-medium mb-2" style={{ color: '#000' }}>
                      測試時間 (分/次)
                    </label>
                    <input
                      type="number"
                      value={record.testDuration || ''}
                      onChange={(e) => updateCurrentGroupRecord(record.id, 'testDuration', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly || approvalStatus.isApproved}
                      placeholder="輸入時間"
                      min="0"
                      step="1"
                      style={{
                        width: '352px',
                        height: '52px',
                        flexShrink: 0,
                        borderRadius: '10px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        padding: '0 16px',
                        fontSize: '16px',
                        fontFamily: 'Inter',
                        color: '#000'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 右側：佐證上傳區 */}
            <div style={{ flex: 1 }} className="flex-shrink-0">
              <div style={{
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start'
              }}>
                <h4 className="text-[20px] font-bold" style={{ lineHeight: '1.2', marginBottom: '4px', color: '#000' }}>發電機銘牌照片</h4>
                <p className="text-[16px] text-gray-500" style={{ lineHeight: '1.2' }}>(或組關檔規格文件)</p>
              </div>
              {/* 使用 FileDropzone 元件 */}
              <FileDropzone
                width="461px"
                height="262px"
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple={false}
                onFileSelect={(files) => {
                  if (!isReadOnly && !submitting && !approvalStatus.isApproved && editPermissions.canUploadFiles) {
                    // 檢查總檔案數（包含已儲存和暫存）
                    const totalFiles = currentEditingGroup.memoryFiles.length +
                      (currentEditingGroup.records[0]?.evidenceFiles?.length || 0)

                    if (totalFiles >= 1) {
                      onError('已有檔案存在，請先刪除現有檔案再上傳新檔案')
                      return
                    }

                    // 建立 MemoryFile
                    const file = files[0]
                    let preview = ''
                    if (file.type.startsWith('image/')) {
                      preview = URL.createObjectURL(file)
                    }

                    const memoryFile: MemoryFile = {
                      id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
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
                  !editPermissions.canUploadFiles ||
                  // 達到檔案數量上限時也 disable
                  (currentEditingGroup.memoryFiles.length + (currentEditingGroup.records[0]?.evidenceFiles?.length || 0)) >= 1
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
                            // 從當前編輯群組的第一筆記錄移除檔案
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
                          <Trash2 style={{ width: '32px', height: '28px' }} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
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
