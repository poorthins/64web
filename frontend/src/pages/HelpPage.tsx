import ComingSoon from '../components/ComingSoon'

const HelpPage = () => {
  const helpIcon = (
    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )

  return (
    <ComingSoon
      title="支援中心"
      description="常見問題解答、操作指南、線上客服等完整協助服務"
      icon={helpIcon}
    />
  )
}

export default HelpPage