/**
 * GeneratorTestInputFields - 發電機測試輸入欄位組件
 *
 * 包含：
 * - 4 個輸入欄位（位置、發電機功率、測試頻率、測試時間）
 * - 1 個 FileDropzone（銘牌照片）
 */

import { Trash2 } from 'lucide-react'
import { FileDropzone, MemoryFile } from '../../../components/FileDropzone'
import { FileTypeIcon } from '../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../utils/energy/fileTypeDetector'
import type { GeneratorTest } from '../GeneratorTestPage'

// ==================== 介面定義 ====================
interface GeneratorTestInputFieldsProps {
  test: GeneratorTest
  onFieldChange: (field: keyof GeneratorTest, value: any) => void
  onSave: () => void
  editingTestId: string | null
  isReadOnly: boolean
  thumbnails: Record<string, string>
  onImageClick: (src: string) => void
}

// ==================== 主組件 ====================
export function GeneratorTestInputFields({
  test,
  onFieldChange,
  onSave,
  editingTestId,
  isReadOnly,
  thumbnails,
  onImageClick
}: GeneratorTestInputFieldsProps) {
  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#01E083" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M25.375 6.04163C25.375 8.04366 20.5061 9.66663 14.5 9.66663C8.4939 9.66663 3.625 8.04366 3.625 6.04163M25.375 6.04163C25.375 4.03959 20.5061 2.41663 14.5 2.41663C8.4939 2.41663 3.625 4.03959 3.625 6.04163M25.375 6.04163V22.9583C25.375 24.9641 20.5417 26.5833 14.5 26.5833C8.45833 26.5833 3.625 24.9641 3.625 22.9583V6.04163M25.375 14.5C25.375 16.5058 20.5417 18.125 14.5 18.125C8.45833 18.125 3.625 16.5058 3.625 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              發電機測試資料
            </h3>
          </div>
        </div>
      </div>

      {/* 填寫框 - 兩欄佈局 */}
      <div className="flex justify-center" style={{ marginTop: '34px', marginBottom: '32px' }}>
        <div
          className="bg-[#ebedf0] rounded-[37px]"
          style={{
            width: '1005px',
            height: '500px',
            flexShrink: 0,
            padding: '38px 49px'
          }}
        >
          {/* 左右分欄 */}
          <div className="flex" style={{ gap: '91px', alignItems: 'flex-start' }}>
            {/* 左側：輸入欄位垂直排列 */}
            <div style={{ width: '352px' }} className="flex-shrink-0">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 發電機位置 */}
                <div>
                  <label className="block text-[18px] font-medium mb-2" style={{ color: '#000' }}>
                    發電機位置
                  </label>
                  <input
                    type="text"
                    value={test.location}
                    onChange={(e) => onFieldChange('location', e.target.value)}
                    disabled={isReadOnly}
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
                    value={test.generatorPower || ''}
                    onChange={(e) => onFieldChange('generatorPower', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
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
                    value={test.testFrequency || ''}
                    onChange={(e) => onFieldChange('testFrequency', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
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
                    value={test.testDuration || ''}
                    onChange={(e) => onFieldChange('testDuration', parseFloat(e.target.value) || 0)}
                    disabled={isReadOnly}
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
              <FileDropzone
                width="461px"
                height="262px"
                accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                multiple={false}
                onFileSelect={(files) => {
                  if (!isReadOnly) {
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

                    // 更新 memoryFiles (只允許一個檔案)
                    onFieldChange('memoryFiles', [memoryFile])
                    // 不清空 evidenceFiles，保留到提交時刪除
                  }
                }}
                disabled={isReadOnly || (test.memoryFiles.length + (test.evidenceFiles?.length || 0)) >= 1}
                readOnly={isReadOnly}
                file={test.memoryFiles[0] || null}
                onRemove={() => {
                  onFieldChange('memoryFiles', [])
                }}
                showFileActions={!isReadOnly}
                onFileClick={(file) => {
                  if (file.preview) {
                    onImageClick(file.preview)
                  }
                }}
              />

              {/* 已儲存的佐證檔案（可刪除） */}
              {test.evidenceFiles && test.evidenceFiles.length > 0 && (
                <div style={{ marginTop: '19px', width: '461px' }}>
                  {test.evidenceFiles.map((file) => {
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
                              onImageClick(thumbnailUrl)
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
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              // 從 evidenceFiles 陣列中移除此檔案
                              const updatedFiles = test.evidenceFiles?.filter(f => f.id !== file.id) || []
                              onFieldChange('evidenceFiles', updatedFiles)
                            }}
                            className="p-2 text-black hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        </div>
      </div>

      {/* 儲存按鈕 - 灰色框框下方 46px */}
      {!isReadOnly && (
        <div className="flex justify-center" style={{ marginTop: '46px' }}>
          <button
            onClick={() => {
              try {
                onSave()
              } catch (error) {
                alert(error instanceof Error ? error.message : '儲存失敗')
              }
            }}
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
            {editingTestId ? '變更儲存' : '+ 新增測試'}
          </button>
        </div>
      )}
    </>
  )
}
