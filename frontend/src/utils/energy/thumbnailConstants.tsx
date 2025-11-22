/**
 * 縮圖顯示統一標準
 *
 * 用途：統一所有能源頁面的縮圖佔位符樣式
 * 標準：永久容器 + #EBEDF0 背景 + SVG 圖示
 *
 * 使用範圍：
 * - Type 1: RefrigerantPage, SF6Page, GeneratorTestPage
 * - Type 2: DieselPage, GasolinePage, UreaPage 等
 *
 * 建立日期：2025-01-20
 */

/**
 * 縮圖佔位符 SVG 圖示
 * 當沒有縮圖時顯示此圖示（表示「這裡會有圖片」）
 */
export const THUMBNAIL_PLACEHOLDER_SVG = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="31"
    height="31"
    viewBox="0 0 31 31"
    fill="none"
  >
    <path
      d="M6.45833 26.8104H24.5417C25.9684 26.8104 27.125 25.6672 27.125 24.257V6.38344C27.125 4.97326 25.9684 3.83008 24.5417 3.83008H6.45833C5.0316 3.83008 3.875 4.97326 3.875 6.38344V24.257C3.875 25.6672 5.0316 26.8104 6.45833 26.8104ZM6.45833 26.8104L20.6667 12.7669L27.125 19.1503M12.9167 10.8518C12.9167 11.9095 12.0492 12.7669 10.9792 12.7669C9.90911 12.7669 9.04167 11.9095 9.04167 10.8518C9.04167 9.79419 9.90911 8.93681 10.9792 8.93681C12.0492 8.93681 12.9167 9.79419 12.9167 10.8518Z"
      stroke="black"
      strokeOpacity="0.25"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * 縮圖容器背景色
 * 淺灰色 #EBEDF0（不是純白 #FFF）
 */
export const THUMBNAIL_BACKGROUND = '#EBEDF0'

/**
 * 縮圖容器邊框樣式
 */
export const THUMBNAIL_BORDER = '1px solid rgba(0, 0, 0, 0.25)'
