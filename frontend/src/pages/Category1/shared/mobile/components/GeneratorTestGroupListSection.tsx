/**
 * GeneratorTestGroupListSection - 發電機測試資料列表區
 *
 * 包含：
 * - 資料列表標題
 * - 群組列表項目（顯示位置、功率、頻率、時間）
 * - 空狀態提示
 */

import { Pencil, Trash2 } from 'lucide-react'
import { FileTypeIcon } from '../../../../../components/energy/FileTypeIcon'
import { getFileType } from '../../../../../utils/energy/fileTypeDetector'
import { getFileUrl } from '../../../../../api/files'
import type { GeneratorTestRecord } from '../mobileEnergyTypes'

export interface GeneratorTestGroupListSectionProps {
  savedGroups: GeneratorTestRecord[]
  thumbnails: Record<string, string>
  isReadOnly: boolean
  approvalStatus: { isApproved: boolean }

  onEditGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onPreviewImage: (src: string) => void

  iconColor: string
}

export function GeneratorTestGroupListSection(props: GeneratorTestGroupListSectionProps) {
  const {
    savedGroups,
    thumbnails,
    isReadOnly,
    approvalStatus,
    onEditGroup,
    onDeleteGroup,
    onPreviewImage,
    iconColor
  } = props

  // 按 groupId 分組
  const groupedRecords = Array.from(new Set(savedGroups.map(r => r.groupId))).map((groupId, index) => ({
    groupId,
    index,
    records: savedGroups.filter(r => r.groupId === groupId)
  }))

  return (
    <>
      {/* 資料列表標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* List Icon */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconColor }}>
            <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>

          {/* 標題文字 */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              資料列表
            </h3>
          </div>
        </div>
      </div>

      {/* 群組列表 - 標題底部往下 34px */}
      <div className="space-y-4 flex flex-col items-center" style={{ marginTop: '34px', marginBottom: '32px' }}>
        {groupedRecords.map(({ groupId, index, records }) => {
          const firstRecord = records[0]
          const evidenceFile = firstRecord?.evidenceFiles?.[0]
          const memoryFile = firstRecord?.memoryFiles?.[0]
          const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null

          const file = evidenceFile || memoryFile
          const mimeType = evidenceFile?.mime_type || memoryFile?.mime_type || memoryFile?.file?.type
          const fileName = evidenceFile?.file_name || memoryFile?.file_name
          const fileSize = evidenceFile?.file_size || memoryFile?.file_size
          const fileType = getFileType(mimeType, fileName)
          const isImage = mimeType?.startsWith('image/')

          return (
            <div
              key={groupId}
              style={{
                width: '1186px',
                minHeight: '158px',
                flexShrink: 0,
                borderRadius: '28px',
                border: '1px solid rgba(0, 0, 0, 0.25)',
                background: '#FFF',
                padding: '20px 30px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* 頂部：編號 + 檔案預覽 + 操作按鈕 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 編號 */}
                  <div
                    className="flex items-center justify-center text-[24px] font-bold text-white"
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      backgroundColor: iconColor
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* 檔案預覽 */}
                  {file && (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        background: '#f0f0f0',
                        cursor: isImage ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        if (isImage) {
                          if (evidenceFile) {
                            getFileUrl(evidenceFile.file_path).then(url => onPreviewImage(url))
                          } else if (memoryFile) {
                            onPreviewImage(memoryFile.preview || URL.createObjectURL(memoryFile.file!))
                          }
                        }
                      }}
                    >
                      {isImage && thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={fileName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : isImage && memoryFile?.preview ? (
                        <img
                          src={memoryFile.preview}
                          alt={fileName}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <FileTypeIcon fileType={fileType} size={32} />
                      )}
                    </div>
                  )}

                  {/* 檔案資訊 */}
                  {file && (
                    <div className="flex flex-col">
                      <p className="text-[16px] font-medium text-black truncate" style={{ maxWidth: '200px' }}>
                        {fileName}
                      </p>
                      <p className="text-[14px] text-gray-500">
                        {fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : ''} · {records.length} 筆測試
                      </p>
                    </div>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onEditGroup(groupId!)}
                    disabled={isReadOnly || approvalStatus.isApproved}
                    className="flex items-center gap-2 px-4 py-2 text-[16px] font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                    style={{ backgroundColor: iconColor }}
                  >
                    <Pencil size={18} />
                    編輯
                  </button>
                  <button
                    onClick={() => onDeleteGroup(groupId!)}
                    disabled={isReadOnly || approvalStatus.isApproved}
                    className="flex items-center gap-2 px-4 py-2 text-[16px] font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={18} />
                    刪除
                  </button>
                </div>
              </div>

              {/* 資料表格 */}
              <div style={{ marginTop: '8px' }}>
                {/* 表頭 */}
                <div className="flex items-center" style={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px 8px 0 0',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ width: '220px' }} className="text-[16px] font-semibold text-gray-700">位置</div>
                  <div style={{ width: '160px' }} className="text-[16px] font-semibold text-gray-700">功率 (kW)</div>
                  <div style={{ width: '160px' }} className="text-[16px] font-semibold text-gray-700">頻率 (次/年)</div>
                  <div style={{ width: '160px' }} className="text-[16px] font-semibold text-gray-700">時間 (分/次)</div>
                </div>

                {/* 資料列 */}
                {records.map((record, idx) => (
                  <div
                    key={record.id}
                    className="flex items-center"
                    style={{
                      padding: '12px 16px',
                      borderBottom: idx < records.length - 1 ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
                      backgroundColor: idx % 2 === 0 ? '#fff' : '#fafafa'
                    }}
                  >
                    <div style={{ width: '220px' }} className="text-[16px] text-gray-900 truncate">
                      {record.location || '-'}
                    </div>
                    <div style={{ width: '160px' }} className="text-[16px] text-gray-900">
                      {record.generatorPower || 0}
                    </div>
                    <div style={{ width: '160px' }} className="text-[16px] text-gray-900">
                      {record.testFrequency || 0}
                    </div>
                    <div style={{ width: '160px' }} className="text-[16px] text-gray-900">
                      {record.testDuration || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {savedGroups.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            尚無已新增的群組
          </div>
        )}
      </div>

      {/* 底部佔位空間，避免被工具列擋住 */}
      <div className="h-20"></div>
    </>
  )
}
