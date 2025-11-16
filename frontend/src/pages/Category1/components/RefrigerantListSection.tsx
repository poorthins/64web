/**
 * RefrigerantListSection - 冷媒設備列表組件
 *
 * 功能：
 * - 按設備類型分組顯示
 * - 支援展開/收合
 * - 顯示設備照片縮圖
 * - 支援編輯/刪除操作
 */

import { useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getFileUrl } from '../../../api/files'
import { RefrigerantDevice } from '../hooks/useRefrigerantDeviceManager'
import { ActionButtons } from '../../../components/energy/ActionButtons'

// ==================== 介面定義 ====================
interface RefrigerantListSectionProps {
  devices: RefrigerantDevice[]
  expandedGroups: Set<string>
  thumbnails: Record<string, string>
  onToggleGroup: (type: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onImageClick: (src: string) => void
  isReadOnly: boolean
}

// ==================== 主組件 ====================
export function RefrigerantListSection({
  devices,
  expandedGroups,
  thumbnails,
  onToggleGroup,
  onEdit,
  onDelete,
  onImageClick,
  isReadOnly
}: RefrigerantListSectionProps) {
  // 內部計算分組（避免 props drilling）
  const groupedDevices = useMemo(() => {
    const groups: Record<string, RefrigerantDevice[]> = {}
    devices.forEach(device => {
      const type = device.equipmentType || '未分類'
      if (!groups[type]) groups[type] = []
      groups[type].push(device)
    })
    return groups
  }, [devices])

  if (devices.length === 0) return null

  return (
    <>
      {/* 標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#6197C5" }}>
            <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              資料列表
            </h3>
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="flex flex-col items-center" style={{ marginTop: '34px', marginBottom: '32px', gap: '24px' }}>
        {Object.entries(groupedDevices).map(([equipmentType, deviceGroup]) => {
          const photoCount = deviceGroup.reduce((sum, device) => {
            const hasEvidence = (device.evidenceFiles?.length || 0) > 0
            const hasMemory = (device.memoryFiles?.length || 0) > 0
            return sum + (hasEvidence ? 1 : 0) + (hasMemory ? 1 : 0)
          }, 0)

          return (
            <div key={equipmentType} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 分組頭部 */}
              <div
                onClick={() => onToggleGroup(equipmentType)}
                style={{
                  width: '785px',
                  height: '87px',
                  flexShrink: 0,
                  borderRadius: '28px',
                  border: '1px solid rgba(0, 0, 0, 0.25)',
                  background: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '30px',
                  paddingRight: '30px',
                  cursor: 'pointer',
                  gap: '20px'
                }}
              >
                {expandedGroups.has(equipmentType) ? (
                  <ChevronDown style={{ width: '24px', height: '24px', flexShrink: 0 }} />
                ) : (
                  <ChevronRight style={{ width: '24px', height: '24px', flexShrink: 0 }} />
                )}

                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '20px', fontWeight: 600, color: '#000' }}>
                    {equipmentType}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', color: '#666' }}>{deviceGroup.length} 筆</span>
                </div>

                <div style={{ width: '1px', height: '40px', background: 'rgba(0, 0, 0, 0.15)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', color: '#666' }}>銘牌照片</span>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: '#000' }}>{photoCount} 張</span>
                </div>
              </div>

              {/* 展開的設備列表 */}
              {expandedGroups.has(equipmentType) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '40px' }}>
                  {deviceGroup.map((device) => {
                    const evidenceFile = device.evidenceFiles?.[0]
                    const memoryFile = device.memoryFiles?.[0]
                    const thumbnailUrl = evidenceFile ? thumbnails[evidenceFile.id] : null
                    const hasPhoto = evidenceFile || memoryFile
                    const photoPreview = memoryFile?.preview || thumbnailUrl

                    return (
                      <div
                        key={device.id}
                        style={{
                          width: '745px',
                          minHeight: '70px',
                          borderRadius: '20px',
                          border: '1px solid rgba(0, 0, 0, 0.15)',
                          background: '#F9FAFB',
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
                                alt="設備照片"
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

                        {/* 設備資訊 */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '15px' }}>
                            <span style={{ fontWeight: 600, color: '#000' }}>
                              {device.brandModel || '未填廠牌/型號'}
                            </span>
                            <span style={{ color: '#666' }}>·</span>
                            <span style={{ color: '#666' }}>
                              {device.equipmentType || '未分類'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666' }}>
                            <span>
                              {device.refrigerantType || '未填冷媒類型'}
                            </span>
                            <span>·</span>
                            <span>
                              {device.fillAmount > 0
                                ? `${device.fillAmount} ${device.unit === 'kg' ? '公斤' : '公克'}`
                                : '未填充量'}
                            </span>
                            {device.equipmentLocation && (
                              <>
                                <span>·</span>
                                <span>{device.equipmentLocation}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <ActionButtons
                          onEdit={() => onEdit(device.id)}
                          onDelete={() => onDelete(device.id)}
                          disabled={isReadOnly}
                          editTitle="編輯設備"
                          deleteTitle="刪除設備"
                          marginRight="0"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
