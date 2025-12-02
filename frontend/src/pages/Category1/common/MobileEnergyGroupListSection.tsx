/**
 * MobileEnergyGroupListSection - 移動源能源頁面資料列表區
 *
 * 包含：
 * - 資料列表標題
 * - 群組列表項目
 * - 空狀態提示
 */

import { GroupListItem } from '../../../components/energy/GroupListItem'
import { getFileUrl } from '../../../api/files'
import type { MobileEnergyRecord } from './mobileEnergyTypes'
import type { EvidenceFile } from '../../../api/files'
import type { MemoryFile } from '../../../utils/documentHandler'

export interface MobileEnergyGroupListSectionProps {
  savedGroups: MobileEnergyRecord[]
  thumbnails: Record<string, string>
  isReadOnly: boolean
  approvalStatus: { isApproved: boolean }
  isReviewMode?: boolean  // 管理員審核模式

  onEditGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onPreviewImage: (src: string) => void

  iconColor: string
}

export function MobileEnergyGroupListSection(props: MobileEnergyGroupListSectionProps) {
  const {
    savedGroups,
    thumbnails,
    isReadOnly,
    approvalStatus,
    isReviewMode = false,  // 預設 false
    onEditGroup,
    onDeleteGroup,
    onPreviewImage,
    iconColor
  } = props

  return (
    <>
      {/* 資料列表標題 - 完全複製使用數據的樣式 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* List Icon */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconColor }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path d="M11.3333 8.5H29.75M11.3333 17H29.75M11.3333 25.5H29.75M4.25 8.5H4.26417M4.25 17H4.26417M4.25 25.5H4.26417" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
        {Array.from(new Set(savedGroups.map(r => r.groupId))).map((groupId, index) => {
          const groupRecords = savedGroups.filter(r => r.groupId === groupId)
          const firstRecord = groupRecords[0]
          const evidenceFile = firstRecord?.evidenceFiles?.[0]
          const memoryFile = firstRecord?.memoryFiles?.[0]
          const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null
          const deviceType = firstRecord?.deviceType // 取得設備類型（柴油固定源專用）

          return (
            <GroupListItem
              key={groupId}
              index={index}
              groupId={groupId!}
              evidenceFile={evidenceFile}
              memoryFile={memoryFile}
              recordCount={groupRecords.length}
              deviceType={deviceType}
              thumbnailUrl={thumbnailUrl}
              onEdit={(id) => onEditGroup(id)}
              onDelete={(id) => onDeleteGroup(id)}
              onFileClick={(file) => {
                if ('file_path' in file) {
                  // EvidenceFile - 取得 URL 後設定 lightbox
                  getFileUrl(file.file_path).then(url => onPreviewImage(url))
                } else if ('file' in file && file.file) {
                  // MemoryFile - 使用 preview 或 createObjectURL
                  onPreviewImage(file.preview || URL.createObjectURL(file.file))
                }
              }}
              disableEdit={false}  // 編輯按鈕永遠可點擊，唯讀狀態由編輯區欄位的 disabled 屬性控制
              disableDelete={isReadOnly || (approvalStatus.isApproved && !isReviewMode)}  // 審核通過後禁用刪除
            />
          )
        })}

        {savedGroups.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            尚無已新增的群組
          </div>
        )}
      </div>
    </>
  )
}