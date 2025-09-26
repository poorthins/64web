import { ErrorBoundary } from './components/ErrorBoundary'

import AdminDashboardPOCComponent from './AdminDashboardPOC'
import CreateUserPOCComponent from './CreateUserPOC'
import EditUserPOCComponent from './EditUserPOC'
import StatisticsDetailPOCComponent from './StatisticsDetailPOC'
import ExportTestPageComponent from './ExportTestPage'
import StatusFlowTestComponent from './StatusFlowTest'
import StatusSyncTestComponent from './test/StatusSyncTest'

export const AdminDashboardPOC = () => (
  <ErrorBoundary>
    <AdminDashboardPOCComponent />
  </ErrorBoundary>
)

export const CreateUserPOC = () => (
  <ErrorBoundary>
    <CreateUserPOCComponent />
  </ErrorBoundary>
)

export const EditUserPOC = () => (
  <ErrorBoundary>
    <EditUserPOCComponent />
  </ErrorBoundary>
)

export const StatisticsDetailPOC = () => (
  <ErrorBoundary>
    <StatisticsDetailPOCComponent />
  </ErrorBoundary>
)

export const ExportTestPage = () => (
  <ErrorBoundary>
    <ExportTestPageComponent />
  </ErrorBoundary>
)

export const StatusFlowTest = () => (
  <ErrorBoundary>
    <StatusFlowTestComponent />
  </ErrorBoundary>
)

export const StatusSyncTest = () => (
  <ErrorBoundary>
    <StatusSyncTestComponent />
  </ErrorBoundary>
)
export * from './data/mockData'
export { default as StatsCard } from './components/StatsCard'
export { default as UserCard } from './components/UserCard'
export { default as SearchBar } from './components/SearchBar'
export { default as StatusFilter } from './components/StatusFilter'
export { default as Modal } from './components/Modal'
export { default as RejectModal } from './components/RejectModal'