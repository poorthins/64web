/**
 * DieselUsageSection - 柴油頁面使用數據編輯區
 *
 * 包含：
 * - 使用數據標題
 * - 佐證文件上傳區（左側）
 * - 輸入表單（右側）
 * - 新增數據按鈕
 * - 保存群組按鈕
 */

import { useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { UploadedFileList } from '../../../../components/energy/UploadedFileList'
import { RecordInputRow } from '../../../../components/energy/RecordInputRow'
import { FileTypeIcon } from '../../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../../utils/energy/fileTypeDetector'
import type { MemoryFile } from '../../../../services/documentHandler'
import { CurrentEditingGroup } from '../dieselTypes'
import { LAYOUT_CONSTANTS } from '../dieselConstants'

export interface DieselUsageSectionProps {
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
}

export function DieselUsageSection(props: DieselUsageSectionProps) {
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
    onError
  } = props

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    // 檢查檔案數量
    if (currentEditingGroup.memoryFiles.length >= 1) {
      onError('已達到最大檔案數量限制 (1 個)')
      return
    }

    // 建立 MemoryFile
    const file = selectedFiles[0]
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

    // 清空 input value
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      {/* 使用數據標題 - icon 距離左邊界 367px，在說明文字下方 103px */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Database Icon */}
          <div className="w-[42px] h-[42px] bg-[#3996fe] rounded-[10px] flex items-center justify-center flex-shrink-0">
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
            <p className="text-[18px] text-gray-500" style={{ lineHeight: '1.2' }}>* 加油單據上需註明 年、月、日</p>
          </div>

          {/* 框框容器 */}
          <div className="flex" style={{ gap: `${LAYOUT_CONSTANTS.EDITOR_GAP}px`, alignItems: 'flex-start' }}>
            {/* 左側：佐證上傳區 */}
            <div style={{ width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px` }} className="flex-shrink-0">
              {/* 上傳區 - 整個白色框框可點擊上傳 */}
              <div
                className="bg-white flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-colors"
                style={{
                  width: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_WIDTH}px`,
                  height: `${LAYOUT_CONSTANTS.EDITOR_UPLOAD_HEIGHT}px`,
                  flexShrink: 0,
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  borderRadius: '25px',
                  padding: '20px'
                }}
                onClick={() => {
                  if (!isReadOnly && !approvalStatus.isApproved && !submitting && editPermissions.canUploadFiles && currentEditingGroup.memoryFiles.length === 0) {
                    fileInputRef.current?.click()
                  }
                }}
              >
                {/* 隱藏的文件輸入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isReadOnly || approvalStatus.isApproved || submitting || !editPermissions.canUploadFiles}
                />

                <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="40" viewBox="0 0 48 40" fill="none" className="mb-4">
                    <path d="M31.9999 27.9951L23.9999 19.9951M23.9999 19.9951L15.9999 27.9951M23.9999 19.9951V37.9951M40.7799 32.7751C42.7306 31.7116 44.2716 30.0288 45.1597 27.9923C46.0477 25.9558 46.2323 23.6815 45.6843 21.5285C45.1363 19.3754 43.8869 17.4661 42.1333 16.102C40.3796 14.7378 38.2216 13.9966 35.9999 13.9951H33.4799C32.8746 11.6536 31.7462 9.47975 30.1798 7.63707C28.6134 5.79439 26.6496 4.33079 24.4361 3.3563C22.2226 2.38181 19.817 1.9218 17.4002 2.01085C14.9833 2.0999 12.6181 2.73569 10.4823 3.87042C8.34649 5.00515 6.49574 6.60929 5.06916 8.56225C3.64259 10.5152 2.6773 12.7662 2.24588 15.1459C1.81446 17.5256 1.92813 19.9721 2.57835 22.3016C3.22856 24.6311 4.3984 26.7828 5.99992 28.5951" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[16px] text-black font-medium mb-1">點擊或拖放檔案暫存</p>
                  <p className="text-[14px] text-gray-500">支援所有檔案格式，最大 10MB</p>
                </div>
              </div>

              {/* 已上傳檔案列表（記憶體暫存） */}
              <UploadedFileList
                files={currentEditingGroup.memoryFiles}
                onRemove={(index) => {
                  setCurrentEditingGroup(prev => ({
                    ...prev,
                    memoryFiles: prev.memoryFiles.filter((_, i) => i !== index)
                  }))
                }}
                onFileClick={(file) => {
                  if (file.file.type.startsWith('image/')) {
                    onPreviewImage(file.preview || URL.createObjectURL(file.file))
                  }
                }}
                disabled={isReadOnly || approvalStatus.isApproved}
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
              <div className="bg-[#3996fe] flex items-center" style={{ height: `${LAYOUT_CONSTANTS.EDITOR_FORM_HEADER_HEIGHT}px`, paddingLeft: '43px', paddingRight: '16px' }}>
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
                background: '#3996FE',
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