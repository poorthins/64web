import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../contexts/AuthContext'
import { NavigationProvider } from '../contexts/NavigationContext'
import LoginSimple from '../pages/LoginSimple'
import ProtectedLayout from '../layouts/ProtectedLayout'
import DashboardPage from '../pages/Dashboard'
import MyEntriesPage from '../pages/MyEntriesPage'
import HelpPage from '../pages/HelpPage'
import HomePage from '../pages/HomePage'
import CarbonCalculatorPage from '../pages/CarbonCalculatorPage'
import ReportsPage from '../pages/ReportsPage'
import WD40Page from '../pages/Category1/WD40Page'
import AcetylenePage from '../pages/Category1/AcetylenePage'
import RefrigerantPage from '../pages/Category1/RefrigerantPage'
import ElectricityBillPage from '../pages/Category2/ElectricityBillPage'
import CommutePage from '../pages/Category3/CommuteePage'
import SepticTankPage from '../pages/Category1/SepticTankPage'
import PingPage from '../pages/PingPage'
import AdminPage from '../pages/AdminPage'
import UserDetailPage from '../pages/admin/UserDetailPage'
import AdminRoute from '../components/AdminRoute'
import UserRoute from '../components/UserRoute'
import TestUserCheck from '../pages/TestUserCheck'
import TestReviewAPI from '../pages/TestReviewAPI'
import FixUserRoles from '../pages/FixUserRoles'
import RoleBasedHomePage from '../components/RoleBasedHomePage'
import '../utils/roleDebug' // 載入診斷工具

function AppRouter() {
  return (
    <Router>
      <AuthProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/" element={<LoginSimple />} />
            <Route path="/login" element={<LoginSimple />} />
            
            <Route path="/app" element={<ProtectedLayout />}>
              {/* 根據用戶角色決定首頁內容 - 修復死循環問題 */}
              <Route index element={<RoleBasedHomePage />} />
              
              {/* 管理員專用頁面 */}
              <Route path="admin" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <AdminPage />
                </AdminRoute>
              } />
              <Route path="admin/users/:userId" element={
                <AdminRoute fallback={<DashboardPage />}>
                  <UserDetailPage />
                </AdminRoute>
              } />
              
              {/* 只有一般用戶可以訪問的頁面 */}
              <Route path="my/entries" element={
                <UserRoute>
                  <MyEntriesPage />
                </UserRoute>
              } />
              <Route path="help" element={
                <UserRoute>
                  <HelpPage />
                </UserRoute>
              } />
              <Route path="home" element={
                <UserRoute>
                  <HomePage />
                </UserRoute>
              } />
              <Route path="calculator" element={
                <UserRoute>
                  <CarbonCalculatorPage />
                </UserRoute>
              } />
              <Route path="reports" element={
                <UserRoute>
                  <ReportsPage />
                </UserRoute>
              } />
              <Route path="wd40" element={
                <UserRoute>
                  <WD40Page />
                </UserRoute>
              } />
              <Route path="acetylene" element={
                <UserRoute>
                  <AcetylenePage />
                </UserRoute>
              } />
              <Route path="electricity_bill" element={
                <UserRoute>
                  <ElectricityBillPage />
                </UserRoute>
              } />
              <Route path="employee_commute" element={
                <UserRoute>
                  <CommutePage />
                </UserRoute>
              } />
              <Route path="refrigerant" element={
                <UserRoute>
                  <RefrigerantPage />
                </UserRoute>
              } />
              <Route path="septictank" element={
                <UserRoute>
                  <SepticTankPage />
                </UserRoute>
              } />
              <Route path="ping" element={<PingPage />} />
              <Route path="test-users" element={<TestUserCheck />} />
              <Route path="test-review-api" element={<TestReviewAPI />} />
              <Route path="fix-user-roles" element={<FixUserRoles />} />
            </Route>
          </Routes>
        </NavigationProvider>
      </AuthProvider>
    </Router>
  )
}

export default AppRouter
