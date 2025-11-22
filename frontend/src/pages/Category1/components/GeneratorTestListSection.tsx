/**
 * GeneratorTestListSection - 發電機測試列表組件
 *
 * 功能：
 * - 顯示所有已儲存的測試記錄
 * - 顯示測試照片縮圖
 * - 支援編輯/刪除操作
 */

import type { GeneratorTest } from '../GeneratorTestPage'
import { getFileUrl } from '../../../api/files'
import { ActionButtons } from '../../../components/energy/ActionButtons'
import { THUMBNAIL_PLACEHOLDER_SVG, THUMBNAIL_BACKGROUND, THUMBNAIL_BORDER } from '../../../utils/energy/thumbnailConstants'

// ==================== 介面定義 ====================
interface GeneratorTestListSectionProps {
  tests: GeneratorTest[]
  thumbnails: Record<string, string>
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onImageClick: (src: string) => void
  isReadOnly: boolean
}

// ==================== 主組件 ====================
export function GeneratorTestListSection({
  tests,
  thumbnails,
  onEdit,
  onDelete,
  onImageClick,
  isReadOnly
}: GeneratorTestListSectionProps) {
  if (tests.length === 0) return null

  return (
    <>
      {/* 資料列表標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* List Icon */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#01E083" }}>
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

      {/* 測試列表 - 標題底部往下 34px */}
      <div className="space-y-4 flex flex-col items-center" style={{ marginTop: '34px', marginBottom: '32px' }}>
        {tests.map((test, index) => {
          const evidenceFile = test.evidenceFiles?.[0]
          const memoryFile = test.memoryFiles?.[0]

          // 圖片預覽處理
          const handleImageClick = async () => {
            if (evidenceFile) {
              const url = await getFileUrl(evidenceFile.file_path)
              onImageClick(url)
            } else if (memoryFile?.preview) {
              onImageClick(memoryFile.preview)
            } else if (memoryFile?.file) {
              onImageClick(URL.createObjectURL(memoryFile.file))
            }
          }

          // 取得縮圖 URL
          const getThumbnail = () => {
            if (evidenceFile) {
              return thumbnails[evidenceFile.id] || null
            } else if (memoryFile?.preview) {
              return memoryFile.preview
            } else if (memoryFile?.file && memoryFile.file.type.startsWith('image/')) {
              return URL.createObjectURL(memoryFile.file)
            }
            return null
          }

          const thumbnail = getThumbnail()

          return (
            <div
              key={test.id}
              style={{
                width: '924px',
                height: '87px',
                borderRadius: '28px',
                border: '1px solid rgba(0, 0, 0, 0.25)',
                background: '#FFF',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '26px',
                gap: '39px'
              }}
            >
              {/* 編號 */}
              <div style={{
                width: '42px',
                height: '42px',
                backgroundColor: '#000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <span style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>{index + 1}</span>
              </div>

              {/* 測試資訊：位置 / 功率 / 頻率 / 時間 */}
              <div className="flex-1 text-[24px] text-black" style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {test.location || '-'} / {test.generatorPower} kW / {test.testFrequency} 次/年 / {test.testDuration} 分/次
              </div>

              {/* 圖片縮圖 - 永久顯示 */}
              <div
                onClick={thumbnail ? handleImageClick : undefined}
                style={{
                  width: '55.769px',
                  height: '55.769px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: THUMBNAIL_BORDER,
                  background: THUMBNAIL_BACKGROUND,
                  cursor: thumbnail ? 'pointer' : 'default',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {thumbnail ? (
                  <img
                    src={thumbnail}
                    alt="發電機銘牌"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  THUMBNAIL_PLACEHOLDER_SVG
                )}
              </div>

              {/* 操作按鈕 */}
              <ActionButtons
                onEdit={() => onEdit(test.id)}
                onDelete={() => onDelete(test.id)}
                disabled={isReadOnly}
              />
            </div>
          )
        })}

        {tests.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            尚無已新增的測試
          </div>
        )}
      </div>
    </>
  )
}
