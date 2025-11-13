import React from 'react';
import { IconDownload } from '../../../components/icons';

interface CommuteDownloadSectionProps {
  iconColor: string;
  onDownload: () => void;
}

export const CommuteDownloadSection: React.FC<CommuteDownloadSectionProps> = ({
  iconColor,
  onDownload
}) => {
  return (
    <>
      {/* 標題區塊 - 對齊柴油頁面「使用數據」 */}
      <div style={{ marginTop: '103px', marginLeft: '367px' }}>
        <div className="flex items-center gap-[29px]">
          {/* Download Icon */}
          <div
            className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: iconColor }}
          >
            <IconDownload size={29} color="white" />
          </div>

          {/* 標題文字 */}
          <div className="flex flex-col justify-center h-[86px]">
            <h3 className="text-[28px] font-bold text-black">
              下載範例檔案
            </h3>
          </div>
        </div>
      </div>

      {/* 內容區塊 - 新設計 */}
      <div className="flex justify-center" style={{ marginTop: '34px' }}>
        <div
          className="relative flex-shrink-0"
          style={{
            width: '1005px',
            height: '515px',
            borderRadius: '37px',
            backgroundColor: iconColor
          }}
        >
          {/* 第一個框框：雲圖標與下載文字（可點擊下載） */}
          <button
            onClick={onDownload}
            className="absolute left-1/2 transform -translate-x-1/2 cursor-pointer hover:opacity-90 transition-opacity"
            style={{
              top: '67px',
              width: '904px',
              height: '160px',
              border: 'none',
              background: 'transparent',
              padding: 0
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="904"
              height="160"
              viewBox="0 0 904 160"
              fill="none"
              className="absolute inset-0"
            >
              <path
                d="M0 28C0 12.536 12.536 0 28 0H876C891.464 0 904 12.536 904 28V132C904 147.464 891.464 160 876 160H28C12.536 160 0 147.464 0 132V28Z"
                fill="white"
              />
              <path
                d="M28 0.5H876C891.188 0.5 903.5 12.8122 903.5 28V132C903.5 147.188 891.188 159.5 876 159.5H28C12.8122 159.5 0.5 147.188 0.5 132V28C0.500001 12.8122 12.8122 0.5 28 0.5Z"
                stroke="black"
                strokeOpacity="0.25"
              />
            </svg>
            <div className="relative z-10 h-full flex flex-col items-center justify-start">
              {/* 雲圖標 - 距離頂部 42.85px */}
              <div style={{ marginTop: '42.85px' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="45.86"
                  height="35.273"
                  viewBox="0 0 50 40"
                  fill="none"
                  style={{ flexShrink: 0 }}
                >
                  <path
                    d="M16.602 29.4395L24.9353 37.2728M24.9353 37.2728L33.2687 29.4395M24.9353 37.2728V19.6478M43.4353 31.5741C45.2466 30.3768 46.6049 28.6682 47.313 26.6962C48.0212 24.7241 48.0424 22.5912 47.3737 20.6071C46.7049 18.6229 45.3809 16.8907 43.5938 15.6618C41.8068 14.4328 39.6496 13.7712 37.4353 13.7728H34.8103C34.1838 11.4774 33.0114 9.34551 31.3814 7.53764C29.7515 5.72977 27.7065 4.29304 25.4004 3.33559C23.0942 2.37815 20.5871 1.92496 18.0677 2.01012C15.5483 2.09529 13.0822 2.7166 10.8552 3.82728C8.62825 4.93796 6.69832 6.50906 5.21074 8.42232C3.72316 10.3356 2.7167 12.5411 2.26714 14.8729C1.81758 17.2047 1.93662 19.602 2.6153 21.8843C3.29399 24.1666 4.51464 26.2744 6.18535 28.0491"
                    stroke="#1E1E1E"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* 下載文字 - 距離雲圖標底部 20px */}
              <p
                style={{
                  marginTop: '20px',
                  color: '#000',
                  textAlign: 'center',
                  fontFamily: 'Inter',
                  fontSize: '16px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: 'normal'
                }}
              >
                點擊下載範例檔案
              </p>
            </div>
          </button>

          {/* 第二個框框：範例說明 */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{
              top: '254px',
              width: '904px',
              height: '193px'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="904"
              height="193"
              viewBox="0 0 904 193"
              fill="none"
              className="absolute inset-0"
            >
              <path
                d="M28 0.5H876C891.188 0.5 903.5 12.8122 903.5 28V165C903.5 180.188 891.188 192.5 876 192.5H28C12.8122 192.5 0.5 180.188 0.5 165V28C0.5 12.8122 12.8122 0.5 28 0.5Z"
                fill="white"
                fillOpacity="0.7"
                stroke="black"
              />
            </svg>
            <div className="relative z-10 px-8 h-full flex flex-col justify-center">
              {/* 範例資料說明 */}
              <div
                style={{
                  color: '#000',
                  fontFamily: 'Inter',
                  fontSize: '20px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: 'normal'
                }}
              >
                <p style={{ marginBottom: '8px' }}>範例資料格式：</p>
                <p style={{ marginBottom: '4px' }}>• Sheet 1 - 員工資料：姓名、居住地、交通工具、通勤距離</p>
                <p>• Sheet 2 - 出勤表：每位員工每月出勤天數</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
