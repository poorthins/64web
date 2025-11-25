/**
 * OtherEnergySourcesSpecListSection - 其他使用能源規格列表組件
 *
 * 功能：
 * - 顯示已建立的規格列表
 * - 顯示規格照片縮圖
 * - 支援編輯/刪除操作
 */

import { List } from 'lucide-react'
import { getFileUrl } from '../../../api/files'
import { OtherEnergySourcesSpec } from '../hooks/useOtherEnergySourcesSpecManager'
import { ActionButtons } from '../../../components/energy/ActionButtons'

// ==================== 介面定義 ====================
interface OtherEnergySourcesSpecListSectionProps {
  specs: OtherEnergySourcesSpec[]
  thumbnails: Record<string, string>
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onImageClick: (src: string) => void
  isReadOnly: boolean
}

// ==================== 主組件 ====================
export function OtherEnergySourcesSpecListSection({
  specs,
  thumbnails,
  onEdit,
  onDelete,
  onImageClick,
  isReadOnly
}: OtherEnergySourcesSpecListSectionProps) {
  if (specs.length === 0) return null

  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#204057" }}>
            <List size={24} color="#FFF" />
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              已建立品項
            </h3>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex flex-col items-center" style={{ marginTop: '34px', marginBottom: '32px', gap: '12px' }}>
        {specs.map((spec) => {
          const evidenceFile = spec.evidenceFiles?.[0]
          const memoryFile = spec.memoryFiles?.[0]
          const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null
          const hasPhoto = evidenceFile || memoryFile
          const photoPreview = memoryFile?.preview || thumbnailUrl

          return (
            <div
              key={spec.id}
              style={{
                width: '924px',
                minHeight: '70px',
                borderRadius: '20px',
                border: '1px solid rgba(0, 0, 0, 0.15)',
                background: hasPhoto ? '#F9FAFB' : '#E5FB76',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '20px',
                paddingRight: '20px',
                paddingTop: '12px',
                paddingBottom: '12px',
                gap: '16px'
              }}
            >
              {/* 縮圖 */}
              {hasPhoto ? (
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    flexShrink: 0,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (evidenceFile) {
                      getFileUrl(evidenceFile.file_path).then(onImageClick)
                    } else if (memoryFile?.file) {
                      onImageClick(memoryFile.preview || URL.createObjectURL(memoryFile.file))
                    }
                  }}
                >
                  {photoPreview && (
                    <img
                      src={photoPreview}
                      alt="品項佐證"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
              ) : (
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    background: '#E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '20px' }}>📷</span>
                </div>
              )}

              {/* 規格資訊 */}
              <div style={{
                flex: 1,
                color: '#000',
                fontFamily: 'Inter',
                fontSize: '24px',
                fontWeight: 400
              }}>
                {spec.name}
              </div>

              {/* 操作按鈕 */}
              <ActionButtons
                onEdit={() => onEdit(spec.id)}
                onDelete={() => onDelete(spec.id)}
                disableEdit={false}
                disableDelete={isReadOnly}
                editTitle="編輯品項"
                deleteTitle="刪除品項"
                marginRight="0"
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
