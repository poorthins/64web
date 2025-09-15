import {
  getPendingReviewEntries,
  getReviewedEntries,
  getUsersWithPendingEntries,
  reviewEntry,
  resubmitEntry
} from '../api/reviewEnhancements'

/**
 * 測試增強版審核 API 功能
 */
export async function testReviewAPI() {

  try {
    // 測試 1: 獲取待審核項目
    const pendingEntries = await getPendingReviewEntries()
    if (pendingEntries.length > 0) {
      console.log('待審核項目範例:', {
        id: pendingEntries[0].id,
        owner: pendingEntries[0].owner.display_name,
        category: pendingEntries[0].category,
        status: pendingEntries[0].status
      })
    }

    // 測試 2: 獲取已審核項目
    const reviewedEntries = await getReviewedEntries()
    if (reviewedEntries.length > 0) {
      console.log('已審核項目範例:', {
        id: reviewedEntries[0].id,
        owner: reviewedEntries[0].owner.display_name,
        status: reviewedEntries[0].status,
        reviewer: reviewedEntries[0].reviewer.display_name
      })
    }

    // 測試 3: 獲取有待審項目的用戶列表
    const usersWithPending = await getUsersWithPendingEntries()
    usersWithPending.forEach(user => {
      console.log(`用戶 ${user.display_name}: ${user.pending_count} 個待審項目`)
    })

    // 測試 4: 測試篩選功能
    const approvedEntries = await getReviewedEntries({ status: 'approved' })
    const rejectedEntries = await getReviewedEntries({ status: 'rejected' })


    return {
      pendingCount: pendingEntries.length,
      reviewedCount: reviewedEntries.length,
      usersWithPendingCount: usersWithPending.length,
      approvedCount: approvedEntries.length,
      rejectedCount: rejectedEntries.length
    }

  } catch (error) {
    throw error
  }
}

/**
 * 測試審核操作 (需要有待審核項目)
 */
export async function testReviewOperations() {

  try {
    const pendingEntries = await getPendingReviewEntries()

    if (pendingEntries.length === 0) {
      return
    }

    const testEntry = pendingEntries[0]

    // 注意: 這些操作會實際修改數據庫，在生產環境中要小心使用

  } catch (error) {
    throw error
  }
}
