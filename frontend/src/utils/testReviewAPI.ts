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
  console.log('🧪 Testing Enhanced Review API...')
  
  try {
    // 測試 1: 獲取待審核項目
    console.log('\n1. Testing getPendingReviewEntries...')
    const pendingEntries = await getPendingReviewEntries()
    console.log(`✅ Found ${pendingEntries.length} pending entries`)
    if (pendingEntries.length > 0) {
      console.log('Sample entry:', {
        id: pendingEntries[0].id,
        owner: pendingEntries[0].owner.display_name,
        category: pendingEntries[0].category,
        status: pendingEntries[0].status
      })
    }

    // 測試 2: 獲取已審核項目
    console.log('\n2. Testing getReviewedEntries...')
    const reviewedEntries = await getReviewedEntries()
    console.log(`✅ Found ${reviewedEntries.length} reviewed entries`)
    if (reviewedEntries.length > 0) {
      console.log('Sample reviewed entry:', {
        id: reviewedEntries[0].id,
        owner: reviewedEntries[0].owner.display_name,
        status: reviewedEntries[0].status,
        reviewer: reviewedEntries[0].reviewer.display_name
      })
    }

    // 測試 3: 獲取有待審項目的用戶列表
    console.log('\n3. Testing getUsersWithPendingEntries...')
    const usersWithPending = await getUsersWithPendingEntries()
    console.log(`✅ Found ${usersWithPending.length} users with pending entries`)
    usersWithPending.forEach(user => {
      console.log(`- ${user.display_name}: ${user.pending_count} pending entries`)
    })

    // 測試 4: 測試篩選功能
    console.log('\n4. Testing filtered getReviewedEntries...')
    const approvedEntries = await getReviewedEntries({ status: 'approved' })
    const rejectedEntries = await getReviewedEntries({ status: 'rejected' })
    console.log(`✅ Found ${approvedEntries.length} approved entries`)
    console.log(`✅ Found ${rejectedEntries.length} rejected entries`)

    console.log('\n🎉 All API tests completed successfully!')
    
    return {
      pendingCount: pendingEntries.length,
      reviewedCount: reviewedEntries.length,
      usersWithPendingCount: usersWithPending.length,
      approvedCount: approvedEntries.length,
      rejectedCount: rejectedEntries.length
    }

  } catch (error) {
    console.error('❌ API test failed:', error)
    throw error
  }
}

/**
 * 測試審核操作 (需要有待審核項目)
 */
export async function testReviewOperations() {
  console.log('🧪 Testing Review Operations...')
  
  try {
    const pendingEntries = await getPendingReviewEntries()
    
    if (pendingEntries.length === 0) {
      console.log('⚠️ No pending entries found for testing review operations')
      return
    }

    const testEntry = pendingEntries[0]
    console.log(`Testing with entry: ${testEntry.id} from ${testEntry.owner.display_name}`)

    // 注意: 這些操作會實際修改數據庫，在生產環境中要小心使用
    console.log('⚠️ Skipping actual review operations to avoid modifying database')
    console.log('To test review operations, uncomment the following lines:')
    console.log('// await reviewEntry(testEntry.id, "approve", "Test approval")')
    console.log('// await reviewEntry(testEntry.id, "reject", "Test rejection")')
    
  } catch (error) {
    console.error('❌ Review operations test failed:', error)
    throw error
  }
}
