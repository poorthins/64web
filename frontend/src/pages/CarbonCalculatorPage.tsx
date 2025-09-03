import ComingSoon from '../components/ComingSoon'

const CarbonCalculatorPage = () => {
  const calculatorIcon = (
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  )

  return (
    <ComingSoon
      title="碳排放計算器"
      description="全方位碳足跡計算工具，支援範疇一、二、三的詳細計算與分析"
      icon={calculatorIcon}
    />
  )
}

export default CarbonCalculatorPage