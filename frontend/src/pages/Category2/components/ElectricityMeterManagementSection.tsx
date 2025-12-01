/**
 * ElectricityMeterManagementSection - 電表表號管理區塊
 *
 * 包含：
 * - 規格設定標題
 * - 表號輸入框 + 新增按鈕
 * - 表號列表（編輯/刪除按鈕）
 */

import { Trash2, Pencil } from 'lucide-react'
import { ElectricityMeter, ElectricityBillRecord } from '../../../types/electricityTypes'

interface ElectricityMeterManagementSectionProps {
  /** 電表清單 */
  meters: ElectricityMeter[]
  /** 已保存的帳單群組（用於檢查表號是否被使用） */
  savedGroups: ElectricityBillRecord[]
  /** 新表號輸入值 */
  newMeterInput: string
  /** 新表號輸入變更事件 */
  onNewMeterInputChange: (value: string) => void
  /** 新增表號事件 */
  onAddMeter: () => void
  /** 刪除表號事件 */
  onDeleteMeter: (id: string) => void
  /** 是否可編輯 */
  canEdit: boolean
  /** 是否已核准 */
  isApproved: boolean
}

export function ElectricityMeterManagementSection({
  meters,
  savedGroups,
  newMeterInput,
  onNewMeterInputChange,
  onAddMeter,
  onDeleteMeter,
  canEdit,
  isApproved
}: ElectricityMeterManagementSectionProps) {
  const isReadOnly = !canEdit || isApproved

  return (
    <>
      {/* 規格設定標題 */}
      <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Settings Icon */}
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#60B389' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="0 0 29 29" fill="none">
              <path d="M14.2917 17.9167C16.2937 17.9167 17.9167 16.2937 17.9167 14.2917C17.9167 12.2896 16.2937 10.6667 14.2917 10.6667C12.2896 10.6667 10.6667 12.2896 10.6667 14.2917C10.6667 16.2937 12.2896 17.9167 14.2917 17.9167Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23.2333 17.9167C23.0725 18.2811 23.0245 18.6854 23.0956 19.0774C23.1667 19.4694 23.3535 19.8311 23.6321 20.1158L23.7046 20.1883C23.9293 20.4128 24.1075 20.6793 24.2291 20.9727C24.3508 21.2661 24.4134 21.5805 24.4134 21.8981C24.4134 22.2157 24.3508 22.5302 24.2291 22.8236C24.1075 23.1169 23.9293 23.3835 23.7046 23.6079C23.4801 23.8326 23.2136 24.0109 22.9202 24.1325C22.6269 24.2541 22.3124 24.3167 21.9948 24.3167C21.6772 24.3167 21.3627 24.2541 21.0694 24.1325C20.776 24.0109 20.5094 23.8326 20.285 23.6079L20.2125 23.5354C19.9277 23.2569 19.566 23.07 19.174 22.9989C18.7821 22.9278 18.3778 22.9758 18.0133 23.1367C17.6559 23.2898 17.3511 23.5442 17.1365 23.8684C16.9218 24.1925 16.8066 24.5724 16.805 24.9613V25.1667C16.805 25.8076 16.5504 26.4223 16.0972 26.8755C15.644 27.3287 15.0293 27.5833 14.3883 27.5833C13.7474 27.5833 13.1327 27.3287 12.6795 26.8755C12.2263 26.4223 11.9717 25.8076 11.9717 25.1667V25.0579C11.9623 24.658 11.8329 24.2701 11.6001 23.9447C11.3674 23.6193 11.0421 23.3714 10.6667 23.2333C10.3022 23.0725 9.89793 23.0245 9.50596 23.0956C9.11398 23.1667 8.75228 23.3535 8.4675 23.6321L8.395 23.7046C8.17056 23.9293 7.90403 24.1075 7.61065 24.2291C7.31727 24.3508 7.0028 24.4134 6.68521 24.4134C6.36762 24.4134 6.05315 24.3508 5.75977 24.2291C5.46639 24.1075 5.19986 23.9293 4.97542 23.7046C4.75072 23.4801 4.57247 23.2136 4.45086 22.9202C4.32924 22.6269 4.26664 22.3124 4.26664 21.9948C4.26664 21.6772 4.32924 21.3627 4.45086 21.0694C4.57247 20.776 4.75072 20.5094 4.97542 20.285L5.04792 20.2125C5.32648 19.9277 5.51335 19.566 5.58442 19.174C5.6555 18.7821 5.60751 18.3778 5.44667 18.0133C5.29349 17.6559 5.03916 17.3511 4.71498 17.1365C4.3908 16.9218 4.01091 16.8066 3.62208 16.805H3.41667C2.77573 16.805 2.16104 16.5504 1.70783 16.0972C1.25461 15.644 1 15.0293 1 14.3883C1 13.7474 1.25461 13.1327 1.70783 12.6795C2.16104 12.2263 2.77573 11.9717 3.41667 11.9717H3.52542C3.92537 11.9623 4.31326 11.8329 4.63865 11.6001C4.96405 11.3674 5.21191 11.0421 5.35 10.6667C5.51085 10.3022 5.55883 9.89793 5.48776 9.50596C5.41668 9.11398 5.22982 8.75228 4.95125 8.4675L4.87875 8.395C4.65406 8.17056 4.47581 7.90403 4.35419 7.61065C4.23257 7.31727 4.16997 7.0028 4.16997 6.68521C4.16997 6.36762 4.23257 6.05315 4.35419 5.75977C4.47581 5.46639 4.65406 5.19986 4.87875 4.97542C5.10319 4.75072 5.36972 4.57247 5.6631 4.45086C5.95648 4.32924 6.27095 4.26664 6.58854 4.26664C6.90613 4.26664 7.2206 4.32924 7.51398 4.45086C7.80736 4.57247 8.07389 4.75072 8.29833 4.97542L8.37083 5.04792C8.65561 5.32648 9.01731 5.51335 9.40929 5.58442C9.80127 5.6555 10.2055 5.60751 10.57 5.44667H10.6667C11.0241 5.29349 11.3289 5.03916 11.5435 4.71498C11.7582 4.3908 11.8734 4.01091 11.875 3.62208V3.41667C11.875 2.77573 12.1296 2.16104 12.5828 1.70783C13.036 1.25461 13.6507 1 14.2917 1C14.9326 1 15.5473 1.25461 16.0005 1.70783C16.4537 2.16104 16.7083 2.77573 16.7083 3.41667V3.52542C16.7099 3.91424 16.8251 4.29413 17.0398 4.61831C17.2545 4.9425 17.5593 5.19683 17.9167 5.35C18.2811 5.51085 18.6854 5.55883 19.0774 5.48776C19.4694 5.41668 19.8311 5.22982 20.1158 4.95125L20.1883 4.87875C20.4128 4.65406 20.6793 4.47581 20.9727 4.35419C21.2661 4.23257 21.5805 4.16997 21.8981 4.16997C22.2157 4.16997 22.5302 4.23257 22.8236 4.35419C23.1169 4.47581 23.3835 4.65406 23.6079 4.87875C23.8326 5.10319 24.0109 5.36972 24.1325 5.6631C24.2541 5.95648 24.3167 6.27095 24.3167 6.58854C24.3167 6.90613 24.2541 7.2206 24.1325 7.51398C24.0109 7.80736 23.8326 8.07389 23.6079 8.29833L23.5354 8.37083C23.2569 8.65561 23.07 9.01731 22.9989 9.40929C22.9278 9.80127 22.9758 10.2055 23.1367 10.57V10.6667C23.2898 11.0241 23.5442 11.3289 23.8684 11.5435C24.1925 11.7582 24.5724 11.8734 24.9613 11.875H25.1667C25.8076 11.875 26.4223 12.1296 26.8755 12.5828C27.3287 13.036 27.5833 13.6507 27.5833 14.2917C27.5833 14.9326 27.3287 15.5473 26.8755 16.0005C26.4223 16.4537 25.8076 16.7083 25.1667 16.7083H25.0579C24.6691 16.7099 24.2892 16.8251 23.965 17.0398C23.6408 17.2545 23.3865 17.5593 23.2333 17.9167Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              規格設定
            </h3>
          </div>
        </div>
      </div>

      {/* 規格輸入區 - Type 3 大圓角卡片 */}
      <div style={{ marginTop: '34px' }} className="flex justify-center">
        <div
          style={{
            width: '1005px',
            height: '176px',
            borderRadius: '37px',
            background: 'linear-gradient(0deg, #60B389 0%, #60B389 100%)',
            position: 'relative'
          }}
        >
          {/* 表號清單 Label */}
          <label style={{
            position: 'absolute',
            left: '47px',
            top: '36px',
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            color: '#000'
          }}>
            表號清單
          </label>

          {/* 輸入框 */}
          <input
            type="text"
            value={newMeterInput}
            onChange={(e) => onNewMeterInputChange(e.target.value)}
            placeholder="請輸入電表表號碼"
            disabled={isReadOnly}
            style={{
              position: 'absolute',
              left: '47px',
              top: '75px',
              width: '564px',
              height: '52px',
              border: '1px solid rgba(0, 0, 0, 0.25)',
              background: '#FFF',
              borderRadius: '8px',
              padding: '0 16px',
              fontSize: '16px',
              fontFamily: 'var(--sds-typography-body-font-family)',
              outline: 'none'
            }}
          />

          {/* 新增按鈕 */}
          <button
            onClick={onAddMeter}
            disabled={isReadOnly}
            style={{
              position: 'absolute',
              left: '807px',
              top: '75px',
              width: '131px',
              height: '51.886px',
              background: '#000',
              border: 'none',
              borderRadius: '8px',
              color: '#FFF',
              fontFamily: 'Inter',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: 'normal',
              textAlign: 'center',
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)'
            }}
            className="hover:opacity-80"
          >
            新增
          </button>
        </div>
      </div>

      {/* 表號列表 */}
      {meters.length > 0 && (
        <>
          {/* 規格列表標題 */}
          <div style={{ marginTop: '116.75px', marginLeft: '367px' }}>
            <div className="flex items-center gap-[29px]">
              <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#60B389' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
                  <path d="M11.3333 8.5H29.75M11.3333 17H29.75M11.3333 25.5H29.75M4.25 8.5H4.26417M4.25 17H4.26417M4.25 25.5H4.26417" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col justify-center h-[86px]">
                <h3 className="text-[28px] font-bold text-black">
                  規格列表
                </h3>
              </div>
            </div>
          </div>

          {/* 表號列表 - Type 3 規格列表樣式 */}
          <div style={{ marginTop: '34px' }} className="flex justify-center">
            <div style={{ width: '1005px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {meters.map((meter, index) => {
                  const usedByBills = savedGroups.filter(b => b.meterId === meter.id)
                  const isUsed = usedByBills.length > 0

                  return (
                    <div
                      key={meter.id}
                      style={{
                        width: '100%',
                        height: '76px',
                        borderRadius: '28px',
                        border: '1px solid rgba(0, 0, 0, 0.25)',
                        background: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 32px',
                        gap: '24px'
                      }}
                    >
                      {/* 項次 - 黑色圓圈白色數字 */}
                      <div className="w-[42px] h-[42px] bg-black rounded-full flex items-center justify-center" style={{ flexShrink: 0 }}>
                        <span className="text-white text-[18px] font-medium">{index + 1}</span>
                      </div>

                      {/* 表號名稱 */}
                      <div style={{
                        flex: 1,
                        color: '#000',
                        fontFamily: 'Inter',
                        fontSize: '20px',
                        fontWeight: 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {meter.meterNumber}
                      </div>

                      {/* 鉛筆編輯按鈕 */}
                      <button
                        onClick={() => {
                          // 編輯功能：聚焦到輸入框並填入當前表號
                          onNewMeterInputChange(meter.meterNumber)
                          const inputElement = document.querySelector('input[placeholder="請輸入電表表號碼"]') as HTMLInputElement
                          if (inputElement) {
                            inputElement.focus()
                            inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        }}
                        disabled={isReadOnly}
                        className="hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                        title="編輯表號"
                      >
                        <Pencil size={32} strokeWidth={2} color="#000" />
                      </button>

                      {/* 垃圾桶刪除按鈕 */}
                      <button
                        onClick={() => onDeleteMeter(meter.id)}
                        disabled={isReadOnly || isUsed}
                        className="hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isUsed ? '此表號正在被使用，無法刪除' : '刪除表號'}
                      >
                        <Trash2 size={32} strokeWidth={2} color={isUsed ? '#999' : '#000'} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
